import { handle } from "@hono/vercel";
import app from "./app.js";

// Vercel Serverless 处理器：构建时由 esbuild 打包成单个文件（vercel-bundle/index.mjs）
const handler = handle(app);
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;
export const HEAD = handler;
