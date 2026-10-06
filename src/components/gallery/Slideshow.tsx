import { useCallback, useEffect, useRef, useState } from "react";
import { X, Pause, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { PhotoItem } from "@/types/photo";

type Props = {
  photos: PhotoItem[];
  startIndex: number;
  onClose: () => void;
};

export default function Slideshow({ photos, startIndex, onClose }: Props) {
  const [index, setIndex] = useState(startIndex);
  const [playing, setPlaying] = useState(true);
  const [intervalSec, setIntervalSec] = useState(4);
  const [showControls, setShowControls] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = useCallback(
    (step: number) => setIndex((i) => (i + step + photos.length) % photos.length),
    [photos.length],
  );

  useEffect(() => {
    if (!playing) return;
    timerRef.current = setTimeout(() => go(1), intervalSec * 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playing, index, intervalSec, go]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  const photo = photos[index];
  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black"
      onMouseMove={() => {
        setShowControls(true);
      }}
    >
      <div
        className={`flex items-center justify-between px-4 py-3 text-white transition-opacity ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <p className="truncate text-sm text-white/70">
          {index + 1} / {photos.length}
          {photo.title ? ` · ${photo.title}` : ""}
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 hover:text-white"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        onClick={() => go(1)}
      >
        <img
          key={photo.id}
          src={photo.url}
          alt={photo.title || photo.name}
          className="max-h-full max-w-full object-contain transition-opacity duration-500"
        />
        <button
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white/80 hover:text-white"
          onClick={(e) => {
            e.stopPropagation();
            go(-1);
          }}
        >
          <ChevronLeft className="h-7 w-7" />
        </button>
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white/80 hover:text-white"
          onClick={(e) => {
            e.stopPropagation();
            go(1);
          }}
        >
          <ChevronRight className="h-7 w-7" />
        </button>
      </div>

      <div
        className={`flex items-center justify-center gap-4 px-4 py-4 text-white transition-opacity ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 hover:text-white"
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        <div className="flex w-48 items-center gap-2 text-xs text-white/60">
          <Slider
            value={[intervalSec]}
            min={2}
            max={10}
            step={1}
            onValueChange={([v]) => setIntervalSec(v)}
          />
          <span className="w-14 shrink-0">{intervalSec} 秒/张</span>
        </div>
      </div>
    </div>
  );
}
