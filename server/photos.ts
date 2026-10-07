import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware.js";
import { storage } from "./lib/storage.js";
import { getDb } from "./queries/connection.js";
import { photos } from "../db/schema.js";

const MAX_BASE64 = 140_000_000; // ~100MB 上限（base64 膨胀 4/3）

export const photosRouter = createRouter({
  // 我的照片列表（附带短期访问 URL）
  list: authedQuery.query(async ({ ctx }) => {
    const rows = await getDb()
      .select()
      .from(photos)
      .where(eq(photos.ownerId, ctx.user.id))
      .orderBy(desc(photos.createdAt));
    if (rows.length === 0) return [];
    const { urls, failures } = await storage.getPresignedUrls({
      keys: rows.map((r) => r.key),
    });
    const failedKeys = new Set(failures.map((f) => f.key));
    const urlByKey = new Map(urls.map((u) => [u.key, u.url]));
    return rows
      .filter((r) => !failedKeys.has(r.key))
      .map((r) => ({ ...r, url: urlByKey.get(r.key) ?? "" }));
  }),

  // 上传照片：浏览器 base64 → 服务端写对象存储 → 记录元数据
  upload: authedQuery
    .input(
      z.object({
        name: z.string().min(1).max(255),
        contentBase64: z.string().max(MAX_BASE64),
        contentType: z.string().max(128).optional(),
        title: z.string().max(255).optional(),
        album: z.string().max(128).optional(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
        takenAt: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const bytes = Uint8Array.from(Buffer.from(input.contentBase64, "base64"));
      const safeName = input.name.replace(/[/\\?%*:|"<>]/g, "_");
      const saved = await storage.uploadFile({
        fileContent: bytes,
        fileName: `photos/${ctx.user.id}/${Date.now()}-${safeName}`,
        contentType: input.contentType,
      });
      await getDb().insert(photos).values({
        ownerId: ctx.user.id,
        key: saved.key,
        name: input.name,
        title: input.title || null,
        album: input.album || null,
        size: saved.size,
        contentType: saved.contentType || input.contentType || "image/jpeg",
        width: input.width || null,
        height: input.height || null,
        takenAt: input.takenAt || null,
      });
      return { key: saved.key, size: saved.size };
    }),

  // 编辑标题 / 相册归属
  update: authedQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        title: z.string().max(255).nullable().optional(),
        album: z.string().max(128).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const row = await getDb().query.photos.findFirst({
        where: eq(photos.id, input.id),
      });
      if (!row || row.ownerId !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN" });
      await getDb()
        .update(photos)
        .set({ title: input.title ?? row.title, album: input.album ?? row.album })
        .where(eq(photos.id, input.id));
      return { ok: true };
    }),

  // 删除：校验归属后同时删除存储对象与数据库记录
  remove: authedQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const row = await getDb().query.photos.findFirst({
        where: eq(photos.id, input.id),
      });
      if (!row || row.ownerId !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN" });
      await getDb().delete(photos).where(eq(photos.id, input.id));
      await storage.deleteFile({ fileKey: row.key });
      return { ok: true };
    }),
});
