import { handle } from "@hono/vercel";
import app from "../server/app";

// Vercel Serverless Function 入口：所有 /api/* 请求都路由到这里。
// 注意：不要 import server/boot —— 它会启动长驻 HTTP 监听，Serverless 环境不允许。
export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
export const OPTIONS = handle(app);
export const HEAD = handle(app);
