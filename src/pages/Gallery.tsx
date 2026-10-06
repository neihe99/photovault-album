import { useMemo, useState } from "react";
import {
  LayoutGrid,
  Columns3,
  Clock,
  Upload,
  Play,
  Search,
  LogOut,
  Images,
  FolderOpen,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import UploadZone from "@/components/gallery/UploadZone";
import Lightbox from "@/components/gallery/Lightbox";
import Slideshow from "@/components/gallery/Slideshow";
import { formatBytes, type PhotoItem, type ViewMode } from "@/types/photo";

type SortMode = "newest" | "oldest" | "name" | "size";

function groupByDay(photos: PhotoItem[]) {
  const groups = new Map<string, PhotoItem[]>();
  for (const p of photos) {
    const d = new Date(p.createdAt);
    const key = d.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  return Array.from(groups.entries());
}

export default function Gallery() {
  const { user, isLoading, logout } = useAuth({ redirectOnUnauthenticated: true });
  const [view, setView] = useState<ViewMode>("grid");
  const [query, setQuery] = useState("");
  const [albumFilter, setAlbumFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortMode>("newest");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [slideshowIndex, setSlideshowIndex] = useState<number | null>(null);

  const { data, isLoading: photosLoading } = trpc.photos.list.useQuery(undefined, {
    enabled: !!user,
  });

  const albums = useMemo(
    () => Array.from(new Set((data ?? []).map((p) => p.album).filter(Boolean))) as string[],
    [data],
  );

  const filtered = useMemo(() => {
    let list = [...(data ?? [])];
    if (albumFilter !== "all") {
      list = list.filter((p) => (p.album ?? "") === albumFilter);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((p) =>
        `${p.name} ${p.title ?? ""}`.toLowerCase().includes(q),
      );
    }
    switch (sort) {
      case "newest":
        list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
        break;
      case "oldest":
        list.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
        break;
      case "name":
        list.sort((a, b) => (a.title || a.name).localeCompare(b.title || b.name, "zh-CN"));
        break;
      case "size":
        list.sort((a, b) => b.size - a.size);
        break;
    }
    return list;
  }, [data, query, albumFilter, sort]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return null;

  const totalSize = (data ?? []).reduce((s, p) => s + p.size, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <Images className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold">PhotoVault</h1>
          </div>

          <div className="relative mx-2 hidden flex-1 sm:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="搜索照片名称或标题…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Select value={albumFilter} onValueChange={setAlbumFilter}>
              <SelectTrigger className="w-32">
                <FolderOpen className="mr-1 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="相册" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部相册</SelectItem>
                {albums.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">最新优先</SelectItem>
                <SelectItem value="oldest">最早优先</SelectItem>
                <SelectItem value="name">按名称</SelectItem>
                <SelectItem value="size">按大小</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              上传照片
            </Button>

            <Avatar>
              <AvatarImage src={user.avatar ?? undefined} />
              <AvatarFallback>{(user.name ?? "U").slice(0, 1)}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" title="退出登录" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 pb-2 sm:hidden">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="搜索照片…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            共 {filtered.length} 张照片
            {data ? `，总计 ${formatBytes(totalSize)}` : ""}
          </p>
          <div className="flex items-center gap-1 rounded-lg border p-1">
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("grid")}
            >
              <LayoutGrid className="mr-1 h-4 w-4" />
              网格
            </Button>
            <Button
              variant={view === "masonry" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("masonry")}
            >
              <Columns3 className="mr-1 h-4 w-4" />
              瀑布流
            </Button>
            <Button
              variant={view === "timeline" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("timeline")}
            >
              <Clock className="mr-1 h-4 w-4" />
              时间线
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={filtered.length === 0}
              onClick={() => setSlideshowIndex(0)}
            >
              <Play className="mr-1 h-4 w-4" />
              放映
            </Button>
          </div>
        </div>

        {photosLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-24 text-center">
            <Images className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {data && data.length > 0 ? "没有匹配的照片" : "相册还是空的，上传第一张照片吧"}
            </p>
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              上传照片
            </Button>
          </div>
        ) : view === "timeline" ? (
          <div className="space-y-8">
            {groupByDay(filtered).map(([day, items]) => (
              <section key={day}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {day}
                  <Badge variant="secondary">{items.length}</Badge>
                </h2>
                <PhotoGrid
                  photos={items}
                  view="grid"
                  onOpen={(localIdx) =>
                    setLightboxIndex(filtered.indexOf(items[localIdx]))
                  }
                />
              </section>
            ))}
          </div>
        ) : (
          <PhotoGrid
            photos={filtered}
            view={view}
            onOpen={(idx) => setLightboxIndex(idx)}
          />
        )}
      </main>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>上传照片</DialogTitle>
          </DialogHeader>
          <UploadZone onClose={() => setUploadOpen(false)} />
        </DialogContent>
      </Dialog>

      {lightboxIndex !== null && filtered[lightboxIndex] && (
        <Lightbox
          photos={filtered}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          onStartSlideshow={(i) => {
            setLightboxIndex(null);
            setSlideshowIndex(i);
          }}
        />
      )}

      {slideshowIndex !== null && filtered[slideshowIndex] && (
        <Slideshow
          photos={filtered}
          startIndex={slideshowIndex}
          onClose={() => setSlideshowIndex(null)}
        />
      )}
    </div>
  );
}

function PhotoGrid({
  photos,
  view,
  onOpen,
}: {
  photos: PhotoItem[];
  view: "grid" | "masonry";
  onOpen: (index: number) => void;
}) {
  if (view === "masonry") {
    return (
      <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
        {photos.map((p, i) => (
          <button
            key={p.id}
            className="block w-full overflow-hidden rounded-lg border bg-muted transition hover:opacity-90"
            onClick={() => onOpen(i)}
          >
            <img
              src={p.url}
              alt={p.title || p.name}
              loading="lazy"
              className="w-full object-cover"
            />
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {photos.map((p, i) => (
        <button
          key={p.id}
          className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
          onClick={() => onOpen(i)}
        >
          <img
            src={p.url}
            alt={p.title || p.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6 text-left opacity-0 transition group-hover:opacity-100">
            <p className="truncate text-xs text-white">{p.title || p.name}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
