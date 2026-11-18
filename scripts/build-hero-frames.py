"""Encode the hero frame sequence for the web.

Reads the original PNG frames in src/assets/hero_frames (never modified) and
writes WebP copies, in the same order, to src/assets/hero_frames_web/.
Run from the project root after replacing or adding frames:

    python scripts/build-hero-frames.py

Requires Python 3 with Pillow (libwebp). Every frame keeps the source
resolution (1920x1088). Quality 90 is visually
transparent for this footage: the script reports PSNR against the original PNG
for every frame (the minimum is above 41 dB), at ~1/6 the size of the PNGs.
"""
import io
import math
import re
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'src' / 'assets' / 'hero_frames'
TARGET = ROOT / 'src' / 'assets' / 'hero_frames_web'
QUALITY = 90


def frame_number(path: Path) -> int:
    digits = re.findall(r'\d+', path.stem)
    if not digits:
        raise ValueError(f'No frame number in {path.name}')
    return int(digits[-1])


def psnr(a: Image.Image, b: Image.Image) -> float:
    rms = ImageStat.Stat(ImageChops.difference(a, b)).rms
    mse = sum(v * v for v in rms) / len(rms)
    return 99.0 if mse == 0 else 10 * math.log10(255 * 255 / mse)


def encode(job: tuple[int, Path]) -> tuple[str, float, int]:
    index, path = job
    with Image.open(path) as source:
        image = source.convert('RGB')
    buffer = io.BytesIO()
    image.save(buffer, 'WEBP', quality=QUALITY, method=6)
    data = buffer.getvalue()
    (TARGET / f'frame-{index:03d}.webp').write_bytes(data)
    with Image.open(io.BytesIO(data)) as encoded:
        return path.name, psnr(image, encoded.convert('RGB')), len(data)


def main() -> None:
    frames = sorted((p for p in SOURCE.iterdir() if p.suffix.lower() in {'.png', '.jpg', '.jpeg', '.webp'}), key=frame_number)
    if not frames:
        sys.exit(f'No frames found in {SOURCE}')
    numbers = [frame_number(p) for p in frames]
    if len(set(numbers)) != len(numbers):
        sys.exit('Duplicate frame numbers found.')
    gaps = sorted(set(range(numbers[0], numbers[-1] + 1)) - set(numbers))
    if gaps:
        print(f'Warning: missing frame numbers {gaps[:20]}')
    TARGET.mkdir(parents=True, exist_ok=True)
    for old in TARGET.rglob('*.webp'):
        old.unlink()
    for folder in sorted(TARGET.iterdir(), reverse=True):
        if folder.is_dir() and not any(folder.iterdir()):
            folder.rmdir()
    with ProcessPoolExecutor() as pool:
        results = list(pool.map(encode, enumerate(frames, start=1)))
    scores = [score for _, score, _ in results]
    total = sum(size for _, _, size in results)
    worst = min(results, key=lambda r: r[1])
    print(f'Encoded {len(frames)} frames ({frames[0].name} to {frames[-1].name}) at source resolution, quality {QUALITY}.')
    print(f'PSNR vs original: min {worst[1]:.1f} dB ({worst[0]}), mean {sum(scores) / len(scores):.1f} dB. Total {total / 1048576:.1f} MB.')


if __name__ == '__main__':
    main()
