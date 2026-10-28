"use client";

/* Покадровый просмотр GIF: слайдер, шаг вперёд/назад и play/pause.
   Кадры композитятся по порядку: кадр рисуется поверх текущего холста,
   а disposal применяется после него — кадр N выглядит как при воспроизведении. */
import { useEffect, useRef, useState } from "react";
import { parseGIF, decompressFrames, type ParsedFrame } from "gifuct-js";

/* Снимок холста до кадра — нужен для disposal type 3 («вернуть как было») */
type Snapshot = ImageData | null;

const GifScrubber = ({ src }: { src: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<ParsedFrame[]>([]);
  const drawnRef = useRef(-1);
  const snapshotRef = useRef<Snapshot>(null);
  const [count, setCount] = useState(0);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Наложить один кадр поверх текущего состояния холста */
  const paintFrame = (ctx: CanvasRenderingContext2D, frame: ParsedFrame) => {
    const { width, height, left, top } = frame.dims;
    const patchCanvas = document.createElement("canvas");
    patchCanvas.width = width;
    patchCanvas.height = height;
    const pctx = patchCanvas.getContext("2d");
    if (!pctx) return;
    pctx.putImageData(new ImageData(new Uint8ClampedArray(frame.patch), width, height), 0, 0);

    /* disposal предыдущего кадра уже применён; для type 3 холст восстановлен */
    if (frame.disposalType === 3) {
      snapshotRef.current = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    } else {
      snapshotRef.current = null;
    }
    ctx.drawImage(patchCanvas, left, top);
  };

  /* Применить disposal только что нарисованного кадра перед следующим */
  const applyDisposal = (ctx: CanvasRenderingContext2D, frame: ParsedFrame) => {
    if (frame.disposalType === 2) {
      ctx.clearRect(frame.dims.left, frame.dims.top, frame.dims.width, frame.dims.height);
    } else if (frame.disposalType === 3 && snapshotRef.current) {
      ctx.putImageData(snapshotRef.current, 0, 0);
    }
  };

  const show = (target: number) => {
    const canvas = canvasRef.current;
    const frames = framesRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || frames.length === 0) return;
    let from = drawnRef.current;
    if (target <= from) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      from = -1;
    }
    for (let i = from + 1; i <= target; i++) {
      paintFrame(ctx, frames[i]);
      if (i < target) applyDisposal(ctx, frames[i]);
    }
    drawnRef.current = target;
  };

  useEffect(() => {
    let cancelled = false;
    drawnRef.current = -1;
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.arrayBuffer();
      })
      .then((buf) => {
        if (cancelled) return;
        setError(null);
        setIndex(0);
        setPlaying(false);
        const gif = parseGIF(buf);
        const frames = decompressFrames(gif, true);
        if (frames.length === 0) throw new Error("нет кадров");
        framesRef.current = frames;
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = gif.lsd.width;
          canvas.height = gif.lsd.height;
        }
        setCount(frames.length);
        show(0);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "не удалось разобрать GIF");
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  useEffect(() => {
    if (count > 0) show(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    if (!playing || count < 2) return;
    const delay = Math.max(20, (framesRef.current[index]?.delay ?? 10) * 10);
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), delay);
    return () => clearTimeout(t);
  }, [playing, index, count]);

  const step = (dir: -1 | 1) => {
    setPlaying(false);
    setIndex((i) => (i + dir + count) % count);
  };

  if (error) return <p className="text-sm text-red-400">GIF: {error}</p>;

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <canvas ref={canvasRef} className="max-h-[50vh] sm:max-h-[75vh] max-w-full rounded-lg" />
      {count > 1 && (
        <div className="flex items-center gap-2 w-full max-w-md px-2">
          <button onClick={() => step(-1)} className="px-2 py-1 rounded bg-gray-800 text-xs hover:bg-gray-700 transition" title="Предыдущий кадр">◀</button>
          <input
            type="range"
            min={0}
            max={count - 1}
            value={index}
            onChange={(e) => { setPlaying(false); setIndex(Number(e.target.value)); }}
            className="flex-1 accent-blue-500"
          />
          <button onClick={() => step(1)} className="px-2 py-1 rounded bg-gray-800 text-xs hover:bg-gray-700 transition" title="Следующий кадр">▶</button>
          <button onClick={() => setPlaying((p) => !p)} className="px-2 py-1 rounded bg-gray-800 text-xs hover:bg-gray-700 transition w-8" title={playing ? "Пауза" : "Воспроизвести"}>
            {playing ? "⏸" : "⏵"}
          </button>
          <span className="text-[11px] text-gray-400 font-mono w-14 text-right">{index + 1}/{count}</span>
        </div>
      )}
      {count === 0 && <p className="text-xs text-gray-500">Разбор GIF…</p>}
    </div>
  );
};

export default GifScrubber;
