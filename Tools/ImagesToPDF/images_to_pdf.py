"""
ImagesToPDF — конвертирует папку с изображениями в PDF.
Каждое изображение = одна страница A4.

Использование:
  python images_to_pdf.py [путь/до/папки]

Если путь не передан — спросит интерактивно.
"""

import os
import re
import sys
from pathlib import Path

from PIL import Image

EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


def natural_sort_key(path: Path):
    """Сортировка: 1.png, 2.png, ..., 10.png (а не 1, 10, 2)."""
    name = path.stem
    return [int(c) if c.isdigit() else c.lower() for c in re.split(r"(\d+)", name)]


def find_images(directory: Path) -> list[Path]:
    files = [f for f in directory.iterdir() if f.suffix.lower() in EXTENSIONS and f.is_file()]
    files.sort(key=natural_sort_key)
    return files


def build_pdf(images: list[Path], output: Path):
    """Собрать PDF: каждое изображение на свою страницу A4 (210x297 мм)."""
    pages = []
    for img_path in images:
        img = Image.open(img_path)
        if img.mode == "RGBA":
            img = img.convert("RGB")

        # A4 в пикселях при 150 dpi
        a4_w_px = int(210 / 25.4 * 150)
        a4_h_px = int(297 / 25.4 * 150)

        iw, ih = img.size
        ratio = min(a4_w_px / iw, a4_h_px / ih)
        new_w = int(iw * ratio)
        new_h = int(ih * ratio)

        img = img.resize((new_w, new_h), Image.LANCZOS)

        # Вписываем в центр A4-холста
        canvas = Image.new("RGB", (a4_w_px, a4_h_px), (255, 255, 255))
        offset_x = (a4_w_px - new_w) // 2
        offset_y = (a4_h_px - new_h) // 2
        canvas.paste(img, (offset_x, offset_y))

        pages.append(canvas)

    if not pages:
        print("Нет изображений для конвертации.")
        return

    pages[0].save(
        output,
        format="PDF",
        save_all=True,
        append_images=pages[1:],
        resolution=150.0,
    )
    print(f"\nГотово: {output}  ({len(pages)} стр., {output.stat().st_size // 1024} KB)")


def main():
    if len(sys.argv) > 1:
        folder = Path(sys.argv[1])
    else:
        raw = input("Путь к папке с изображениями: ").strip().strip('"')
        folder = Path(raw)

    if not folder.is_dir():
        print(f"Ошибка: {folder} не найдена или это не папка.")
        sys.exit(1)

    images = find_images(folder)
    if not images:
        print(f"В {folder} нет изображений ({', '.join(EXTENSIONS)}).")
        sys.exit(1)

    print(f"\nНайдено {len(images)} файл(ов):\n")
    for i, f in enumerate(images, 1):
        size_kb = f.stat().st_size // 1024
        print(f"  {i:>3}. {f.name:<30} {size_kb:>6} KB")

    answer = input(f"\nПорядок верный? (Y/n/строка для нового имени PDF): ").strip()

    if answer.lower() == "n":
        print("Отмена.")
        sys.exit(0)

    pdf_name = "output.pdf"
    if answer and answer.lower() != "y" and answer.lower() != "yes":
        pdf_name = answer.strip() if answer.endswith(".pdf") else answer.strip() + ".pdf"

    output = folder / pdf_name
    build_pdf(images, output)


if __name__ == "__main__":
    main()
