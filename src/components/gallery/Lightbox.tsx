import { useCallback, useEffect, useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Download,
  Pencil,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/providers/trpc";
import { formatBytes, formatDate, type PhotoItem } from "@/types/photo";

type Props = {
  photos: PhotoItem[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onStartSlideshow: (index: number) => void;
};

export default function Lightbox({
  photos,
  index,
  onClose,
  onNavigate,
  onStartSlideshow,
}: Props) {
  const photo = photos[index];
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(photo.title ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const utils = trpc.useUtils();
  const updateMutation = trpc.photos.update.useMutation({
    onSuccess: () => utils.photos.list.invalidate(),
  });
  const removeMutation = trpc.photos.remove.useMutation({
    onSuccess: () => {
      utils.photos.list.invalidate();
      setConfirmDelete(false);
      if (photos.length <= 1) onClose();
      else onNavigate(Math.min(index, photos.length - 2));
    },
  });

  const prev = useCallback(
    () => onNavigate((index - 1 + photos.length) % photos.length),
    [index, photos.length, onNavigate],
  );
  const next = useCallback(
    () => onNavigate((index + 1) % photos.length),
    [index, photos.length, onNavigate],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, onClose]);

  useEffect(() => {
    setTitle(photo.title ?? "");
    setEditing(false);
  }, [photo.id, photo.title]);

  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {photo.title || photo.name}
          </p>
          <p className="text-xs text-white/60">
            {index + 1} / {photos.length} · {formatBytes(photo.size)}
            {photo.width && photo.height
              ? ` · ${photo.width}×${photo.height}`
              : ""}
            {" · "}
            {formatDate(photo.createdAt)}
            {photo.album ? ` · 相册：${photo.album}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 hover:text-white"
            title="从此张开始幻灯片放映"
            onClick={() => onStartSlideshow(index)}
          >
            <Play className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 hover:text-white"
            title="重命名"
            onClick={() => setEditing((v) => !v)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <a
            href={photo.url}
            download={photo.name}
            target="_blank"
            rel="noreferrer"
          >
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 hover:text-white"
              title="下载原图"
            >
              <Download className="h-4 w-4" />
            </Button>
          </a>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 hover:text-white"
            title="删除"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 hover:text-white"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {editing && (
        <div className="flex items-center gap-2 px-4 pb-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="照片标题"
            className="max-w-sm border-white/20 bg-white/10 text-white placeholder:text-white/40"
          />
          <Button
            size="sm"
            onClick={() => {
              updateMutation.mutate({ id: photo.id, title });
              setEditing(false);
            }}
          >
            保存
          </Button>
        </div>
      )}

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-14">
        <button
          className="absolute left-2 rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
          onClick={prev}
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
        <img
          key={photo.id}
          src={photo.url}
          alt={photo.title || photo.name}
          className="max-h-full max-w-full object-contain shadow-2xl"
        />
        <button
          className="absolute right-2 rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
          onClick={next}
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      </div>

      <div className="flex justify-center gap-1 overflow-x-auto px-4 py-2">
        {photos.map((p, i) => (
          <button
            key={p.id}
            onClick={() => onNavigate(i)}
            className={`h-12 w-12 shrink-0 overflow-hidden rounded border-2 ${
              i === index ? "border-primary" : "border-transparent opacity-50"
            }`}
          >
            <img src={p.url} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除这张照片？</AlertDialogTitle>
            <AlertDialogDescription>
              将从相册和存储中永久删除，无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeMutation.mutate({ id: photo.id })}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
