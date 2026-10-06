import type { AppRouter } from "../../api/router";
import type { inferRouterOutputs } from "@trpc/server";

export type PhotoItem = inferRouterOutputs<AppRouter>["photos"]["list"][number];

export type ViewMode = "grid" | "masonry" | "timeline";

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDate(d: Date | string | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
