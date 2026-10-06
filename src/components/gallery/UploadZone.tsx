import { useCallback, useRef, useState } from "react";
import { UploadCloud, Image as ImageIcon, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/providers/trpc";
import { formatBytes } from "@/types/photo";

type Task = {
  id: number;
  name: string;
  size: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.readAsDataURL(file);
  });
}

function readImageSize(file: File): Promise<{ width?: number; height?: number; takenAt?: Date }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({});
    };
    img.src = url;
  });
}

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif";

export default function UploadZone({ onClose }: { onClose: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dragging, setDragging] = useState(false);
  const [album, setAlbum] = useState("");
  const idRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileCache = useRef(new Map<number, File>());

  const utils = trpc.useUtils();
  const uploadMutation = trpc.photos.upload.useMutation();

  const cacheFiles = useCallback((files: File[]) => {
    const list = files.filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    const start = idRef.current + 1;
    idRef.current += list.length;
    list.forEach((f, i) => fileCache.current.set(start + i, f));
    setTasks((prev) => [
      ...prev,
      ...list.map((f, i) => ({
        id: start + i,
        name: f.name,
        size: f.size,
        status: "pending" as const,
      })),
    ]);
  }, []);

  const startUpload = useCallback(async () => {
    const pending = tasks.filter((t) => t.status === "pending");
    for (const task of pending) {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: "uploading" } : t)),
      );
      try {
        const file = fileCache.current.get(task.id);
        if (!file) throw new Error("文件已失效，请重新选择");
        const [base64, meta] = await Promise.all([toBase64(file), readImageSize(file)]);
        await uploadMutation.mutateAsync({
          name: file.name,
          contentBase64: base64,
          contentType: file.type,
          album: album.trim() || undefined,
          ...meta,
        });
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: "done" } : t)),
        );
      } catch (e) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? { ...t, status: "error", error: e instanceof Error ? e.message : "上传失败" }
              : t,
          ),
        );
      }
    }
    fileCache.current.clear();
    await utils.photos.list.invalidate();
  }, [tasks, album, uploadMutation, utils]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      cacheFiles(Array.from(e.dataTransfer.files));
    },
    [cacheFiles],
  );

  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      cacheFiles(Array.from(e.target.files ?? []));
      e.target.value = "";
    },
    [cacheFiles],
  );

  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const allDone = tasks.length > 0 && pendingCount === 0;

  return (
    <div className="space-y-4">
      <div
        className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/30 hover:border-primary/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          把照片拖拽到此处，或
        </p>
        <Button
          variant="outline"
          className="mt-3"
          onClick={() => inputRef.current?.click()}
        >
          <ImageIcon className="mr-2 h-4 w-4" />
          选择照片
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={onPick}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          支持 JPG / PNG / WebP / GIF，单张不超过 100MB
        </p>
      </div>

      <input
        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        placeholder="相册名称（可选，例如：旅行、家人）"
        value={album}
        onChange={(e) => setAlbum(e.target.value)}
      />

      {tasks.length > 0 && (
        <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
          {tasks.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
            >
              {t.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
              {t.status === "done" && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />}
              {t.status === "error" && <XCircle className="h-4 w-4 shrink-0 text-destructive" />}
              {t.status === "pending" && <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />}
              <div className="min-w-0 flex-1">
                <p className="truncate">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(t.size)}
                  {t.error ? ` · ${t.error}` : ""}
                </p>
              </div>
              {t.status === "uploading" && (
                <Progress value={45} className="w-20" />
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          关闭
        </Button>
        <Button onClick={startUpload} disabled={pendingCount === 0}>
          开始上传（{pendingCount}）
        </Button>
      </div>
      {allDone && (
        <p className="text-center text-xs text-green-600">全部上传完成</p>
      )}
    </div>
  );
}
