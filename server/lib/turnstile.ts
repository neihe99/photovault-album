import { env } from "./env.js";

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type SiteverifyResponse = {
  success: boolean;
  "error-codes"?: string[];
};

/**
 * 校验 Turnstile token。未配置 TURNSTILE_SECRET_KEY 时直接放行（向后兼容）。
 */
export async function verifyTurnstileToken(
  token: string | undefined,
  remoteIp?: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (!env.turnstileSecretKey) {
    return { ok: true };
  }
  if (!token) {
    return { ok: false, reason: "missing-turnstile-token" };
  }
  try {
    const body = new URLSearchParams({
      secret: env.turnstileSecretKey,
      response: token,
    });
    if (remoteIp) body.set("remoteip", remoteIp);
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const data = (await res.json()) as SiteverifyResponse;
    if (data.success) return { ok: true };
    return {
      ok: false,
      reason: `turnstile-rejected: ${(data["error-codes"] ?? []).join(",")}`,
    };
  } catch (e) {
    return {
      ok: false,
      reason: `turnstile-verify-error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

export function clientIpFromHeaders(headers: Headers): string | undefined {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip") ?? undefined;
}
