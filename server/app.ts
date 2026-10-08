import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router.js";
import { createContext } from "./context.js";
import { createOAuthCallbackHandler } from "./kimi/auth.js";
import { env } from "./lib/env.js";
import { Paths } from "../contracts/constants.js";

const app = new Hono();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// 健康检查/配置诊断：只返回各环境变量「是否已配置」（布尔值），不泄露任何值。
// 用于自部署环境（如 Vercel）快速定位因环境变量缺失导致的启动问题。
app.get("/api/health", (c) =>
  c.json({
    ok: true,
    node: process.version,
    envConfigured: {
      APP_ID: !!env.appId,
      APP_SECRET: !!env.appSecret,
      DATABASE_URL: !!env.databaseUrl,
      KIMI_AUTH_URL: !!env.kimiAuthUrl,
      KIMI_OPEN_URL: !!env.kimiOpenUrl,
      LOGIN_PASSWORD: !!env.loginPassword,
      TURNSTILE_SECRET_KEY: !!env.turnstileSecretKey,
    },
  })
);

app.get(Paths.oauthCallback, createOAuthCallbackHandler());
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;
