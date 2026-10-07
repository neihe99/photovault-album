// Vercel 函数入口。真正的服务端代码在构建时已由 esbuild 打包为
// vercel-bundle/index.mjs（见 package.json 的 build:vercel 脚本），
// 这里只做纯转发，避免依赖 Vercel 对 server/ 目录的模块追踪。
export {
  GET,
  POST,
  PUT,
  DELETE,
  PATCH,
  OPTIONS,
  HEAD,
} from "../vercel-bundle/index.mjs";
