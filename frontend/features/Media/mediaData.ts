/* Статический массив для раннего прототипа.
   Не используется текущими компонентами (Media, SortView) — они работают через API. */
type MediaItem = { src: string; size: string; type: string }

export const items: MediaItem[] = [
  { src: "/1.png", size: "1.2 MB", type: "Фото" },
  { src: "/2.png", size: "0.9 MB", type: "Фото" },
  { src: "/3.png", size: "1.5 MB", type: "Фото" },
  { src: "/4.jpg", size: "2.1 MB", type: "Фото" },
  { src: "/5.jpg", size: "1.8 MB", type: "Фото" },
  { src: "/6.jpg", size: "2.3 MB", type: "Фото" },
  { src: "/7.jpg", size: "1.6 MB", type: "Фото" },
  { src: "/8.jpeg", size: "0.8 MB", type: "Фото" },
  { src: "/9.png", size: "1.1 MB", type: "Фото" },
  { src: "/10.webm", size: "1.22 MB", type: "Видео" },
  { src: "/11.mp4", size: "1.33 MB", type: "Видео" },
  { src: "/12.gif", size: "1.44 MB", type: "GIF" },
  { src: "/13.gif", size: "1.55 MB", type: "GIF" },
  { src: "/14.gif", size: "1.66 MB", type: "GIF" },
  { src: "/15.gif", size: "1.77 MB", type: "GIF" },
];

export function mediaType(src: string): "video" | "gif" | "image" {
  if (src.endsWith(".mp4") || src.endsWith(".webm")) return "video";
  if (src.endsWith(".gif")) return "gif";
  return "image";
}
