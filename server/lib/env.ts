import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    // 不在启动时抛异常：否则整个函数在 Vercel 上直接崩溃（Troubleshoot 页面），
    // 且无法从外部判断原因。改为启动时告警 + 运行期暴露 /api/health 便于诊断。
    console.error(
      `[env] Missing required environment variable: ${name} — ` +
        `站点将以降级模式启动，请访问 /api/health 查看缺失项`,
    );
  }
  return value ?? "";
}

export const env = {
  appId: required("APP_ID"),
  appSecret: required("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  kimiAuthUrl: required("KIMI_AUTH_URL"),
  kimiOpenUrl: required("KIMI_OPEN_URL"),
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",
  loginPassword: process.env.LOGIN_PASSWORD ?? "",
  turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY ?? "",
};
