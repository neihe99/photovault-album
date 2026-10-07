import * as crypto from "node:crypto";
import * as cookie from "cookie";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Session } from "../contracts/constants.js";
import { getSessionCookieOptions } from "./lib/cookies.js";
import { createRouter, publicQuery, authedQuery } from "./middleware.js";
import { env } from "./lib/env.js";
import { signSessionToken } from "./kimi/session.js";
import { upsertUser } from "./queries/users.js";
import {
  verifyTurnstileToken,
  clientIpFromHeaders,
} from "./lib/turnstile.js";

export const authRouter = createRouter({
  me: authedQuery.query((opts) => opts.ctx.user),

  // 登录配置：让前端按服务端实际配置渲染（密码登录是否可用、是否强制人机验证），
  // 避免「服务端要求验证令牌、前端却没有渲染组件」的配置错配导致无法登录。
  loginConfig: publicQuery.query(() => ({
    passwordLoginEnabled: !!env.loginPassword,
    turnstileRequired: !!env.turnstileSecretKey,
  })),

  // 单用户密码登录：用于无法使用 Kimi OAuth 的部署环境（如 Vercel）。
  // 仅在设置了 LOGIN_PASSWORD 环境变量时启用；登录身份为站点主人。
  passwordLogin: publicQuery
    .input(
      z.object({
        password: z.string().min(1).max(128),
        turnstileToken: z.string().max(4096).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const turnstile = await verifyTurnstileToken(
        input.turnstileToken,
        clientIpFromHeaders(ctx.req.headers),
      );
      if (!turnstile.ok) {
        console.warn("[auth] Turnstile verification failed:", turnstile.reason);
        const isMissingToken = turnstile.reason === "missing-turnstile-token";
        throw new TRPCError({
          code: "FORBIDDEN",
          message: isMissingToken
            ? "人机验证未通过：未收到验证令牌。请确认已在构建环境配置 VITE_TURNSTILE_SITE_KEY 并重新部署"
            : "人机验证未通过，请刷新页面重试",
        });
      }
      if (!env.loginPassword) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "密码登录未启用（缺少 LOGIN_PASSWORD 环境变量）",
        });
      }
      const expected = Buffer.from(env.loginPassword);
      const actual = Buffer.from(input.password);
      const matched =
        expected.length === actual.length &&
        crypto.timingSafeEqual(expected, actual);
      if (!matched) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "密码错误",
        });
      }

      const unionId = env.ownerUnionId || "local-password-owner";
      await upsertUser({
        unionId,
        name: "相册主人",
        lastSignInAt: new Date(),
      });
      const token = await signSessionToken({
        unionId,
        clientId: env.appId,
      });
      const opts = getSessionCookieOptions(ctx.req.headers);
      ctx.resHeaders.append(
        "set-cookie",
        cookie.serialize(Session.cookieName, token, {
          httpOnly: opts.httpOnly,
          path: opts.path,
          sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
          secure: opts.secure,
          maxAge: Session.maxAgeMs / 1000,
        }),
      );
      return { success: true };
    }),

  logout: authedQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    return { success: true };
  }),
});
