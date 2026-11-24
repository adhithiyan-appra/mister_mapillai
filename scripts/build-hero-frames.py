"""Encode the hero frame sequence for the web as genuine lossless WebP.

Reads the master PNG frames in src/assets/animations/hero-frames/new_v1 (never modified) and
writes lossless WebP copies, in the same order, to src/assets/animations/hero-frames/new_v1_webp/
as frame-0001.webp ... frame-NNNN.webp, plus manifest.json (the exact frame order).
Run from the project root after replacing or adding frames:

    python scripts/build-hero-frames.py

Requires Python 3 with Pillow (libwebp). Every output frame is checked before the script succeeds:

  * it is a WebP file whose bitstream is VP8L (lossless), not VP8 (lossy);
  * it has the source's exact dimensions and mode (no crop, resize or orientation change);
  * decoding it gives exactly the source's pixels (zero difference, not "close").

Lossless is the largest honest encoding of this footage (about 55% of the PNG, several times a
lossy one), so the site fetches only the frames near the scroll position (see
src/sections/Home/frameRenderer.ts) rather than the whole sequence.
"""
import hashlib
import io
import json
import os
import re
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'src' / 'assets' / 'animations' / 'hero-frames' / 'new_v1'
TARGET = ROOT / 'src' / 'assets' / 'animations' / 'hero-frames' / 'new_v1_webp'
# method 4 and 6 give the same size on this footage; 6 is ~5x slower.
METHOD = 4


def frame_number(path: Path) -> int:
    digits = re.findall(r'\d+', path.stem)
    if not digits:
        raise ValueError(f'No frame number in {path.name}')
    return int(digits[-1])


def encode(job: tuple[int, Path, int]) -> dict:
    index, path, width = job
    with Image.open(path) as source:
        if source.format != 'PNG':
            raise ValueError(f'{path.name}: expected PNG, got {source.format}')
        if source.getexif().get(274, 1) != 1:
            raise ValueError(f'{path.name}: carries an orientation tag; transpose it before encoding')
        image = source.convert('RGB')
    buffer = io.BytesIO()
    image.save(buffer, 'WEBP', lossless=True, quality=100, method=METHOD, exact=True)
    data = buffer.getvalue()

    # Genuine lossless: RIFF....WEBP then a VP8L chunk (VP8 = lossy, VP8X = extended container).
    if data[:4] != b'RIFF' or data[8:12] != b'WEBP' or data[12:16] != b'VP8L':
        raise ValueError(f'{path.name}: output is not a lossless (VP8L) WebP: {data[12:16]!r}')
    with Image.open(io.BytesIO(data)) as encoded:
        encoded.load()
        decoded = encoded.convert('RGB')
    if decoded.size != image.size:
        raise ValueError(f'{path.name}: size changed {image.size} -> {decoded.size}')
    if ImageChops.difference(image, decoded).getbbox() is not None:
        raise ValueError(f'{path.name}: decoded pixels differ from the source')

    name = f'frame-{index:04d}.webp'
    (TARGET / name).write_bytes(data)
    return {
        'index': index,
        'source': path.name,
        'file': name,
        'width': image.width,
        'height': image.height,
        'sourceBytes': path.stat().st_size,
        'bytes': len(data),
        'pixelSha256': hashlib.sha256(image.tobytes()).hexdigest(),
    }


def main() -> None:
    frames = sorted((p for p in SOURCE.iterdir() if p.suffix.lower() == '.png'), key=frame_number)
    if not frames:
        sys.exit(f'No frames found in {SOURCE}')
    numbers = [frame_number(p) for p in frames]
    if len(set(numbers)) != len(numbers):
        sys.exit('Duplicate frame numbers found.')
    gaps = sorted(set(range(numbers[0], numbers[-1] + 1)) - set(numbers))
    if gaps:
        sys.exit(f'Missing frame numbers {gaps[:20]}: the sequence must be contiguous.')
    with Image.open(frames[0]) as first:
        size = first.size

    TARGET.mkdir(parents=True, exist_ok=True)
    for old in TARGET.glob('*.webp'):
        old.unlink()
    workers = max(1, (os.cpu_count() or 2) - 2)
    with ProcessPoolExecutor(max_workers=workers) as pool:
        results = list(pool.map(encode, [(i, p, size[0]) for i, p in enumerate(frames, start=1)], chunksize=2))

    odd = sorted({(r['width'], r['height']) for r in results} - {size})
    if odd:
        sys.exit(f'Frames differ in size from {size}: {odd}')
    # Identical neighbouring frames (a held shot) stay in the sequence; the site fetches each distinct file once.
    unique = len({r['pixelSha256'] for r in results})
    source_total = sum(r['sourceBytes'] for r in results)
    total = sum(r['bytes'] for r in results)
    manifest = {
        'source': 'new_v1',
        'format': 'WebP lossless (VP8L)',
        'count': len(results),
        'width': size[0],
        'height': size[1],
        'distinctFrames': unique,
        'sourceBytes': source_total,
        'bytes': total,
        'frames': [{k: r[k] for k in ('index', 'file', 'source', 'bytes', 'pixelSha256')} for r in results],
    }
    (TARGET / 'manifest.json').write_text(json.dumps(manifest, indent=1) + '\n', encoding='utf-8')

    bigger = [r['file'] for r in results if r['bytes'] >= r['sourceBytes']]
    print(f'Encoded {len(results)} frames ({frames[0].name} to {frames[-1].name}) at {size[0]}x{size[1]}, lossless; {unique} distinct.')
    print(f'PNG {source_total / 1048576:.1f} MB -> WebP {total / 1048576:.1f} MB ({100 * total / source_total:.0f}%). Every frame verified pixel-exact.')
    if bigger:
        print(f'Warning: {len(bigger)} frames are not smaller than their PNG: {bigger[:10]}')


if __name__ == '__main__':
    main()
