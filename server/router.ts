import { createRouter, publicQuery } from "./middleware.js";
import { authRouter } from "./auth-router.js";
import { photosRouter } from "./photos.js";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  photos: photosRouter,
});

export type AppRouter = typeof appRouter;
