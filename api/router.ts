import { createRouter, publicQuery } from "./middleware";
import { authRouter } from "./auth-router";
import { photosRouter } from "./photos";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  photos: photosRouter,
});

export type AppRouter = typeof appRouter;
