"""Encode the hero frame sequence for the web as genuine lossless WebP.

Reads the master PNG frames in src/assets/animations/hero-frames/v3 (never modified) and writes
lossless WebP copies, in the same order, to src/assets/animations/hero-frames/webp_v3/ as
frame-0001.webp ... frame-NNNN.webp, plus manifest.json (the exact frame order and sizes).
Run from the project root after replacing or adding frames:

    python scripts/build-hero-frames.py                 # v3 -> webp_v3
    python scripts/build-hero-frames.py SOURCE TARGET   # any other folder pair

Requires Python 3 with Pillow (libwebp). Every output frame is checked before the script succeeds:

  * it is a RIFF/WEBP file whose image bitstream is VP8L (lossless) and has no VP8 (lossy) chunk;
  * it has the source's exact dimensions and channels (no crop, resize or orientation change;
    an alpha channel, where a source has one, is kept);
  * decoding it gives exactly the source's pixels (zero difference, not "close").

Lossless is the largest honest encoding of this footage (about 55% of the PNG, several times a
lossy one), so the site fetches only the frames around the playing stage (see
src/sections/Home/frameRenderer.ts) rather than the whole sequence at once.
"""
import hashlib
import io
import json
import os
import re
import struct
import sys
import time
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

from PIL import Image, ImageChops, features

ROOT = Path(__file__).resolve().parent.parent
FRAMES = ROOT / 'src' / 'assets' / 'animations' / 'hero-frames'
SOURCE = FRAMES / 'v3'
TARGET = FRAMES / 'webp_v3'
# method 4 and 6 give the same size on this footage; 6 is ~5x slower.
METHOD = 4


def frame_number(path: Path) -> int:
    digits = re.findall(r'\d+', path.stem)
    if not digits:
        raise ValueError(f'No frame number in {path.name}')
    return int(digits[-1])


def riff_chunks(data: bytes) -> list[str]:
    """The chunk ids of a RIFF/WEBP file, in order (raises if the container is malformed)."""
    if data[:4] != b'RIFF' or data[8:12] != b'WEBP':
        raise ValueError('not a RIFF/WEBP file')
    if struct.unpack('<I', data[4:8])[0] + 8 != len(data):
        raise ValueError('RIFF size does not match the file size')
    chunks, at = [], 12
    while at < len(data):
        if at + 8 > len(data):
            raise ValueError('truncated chunk header')
        tag, size = data[at:at + 4].decode('ascii'), struct.unpack('<I', data[at + 4:at + 8])[0]
        chunks.append(tag)
        at += 8 + size + (size & 1)
    if at != len(data):
        raise ValueError('chunks overrun the file')
    return chunks


def has_alpha(image: Image.Image) -> bool:
    return image.mode in ('RGBA', 'LA', 'PA', 'RGBa', 'La') or 'transparency' in image.info


def encode(job: tuple[int, Path, Path]) -> dict:
    index, path, target = job
    with Image.open(path) as source:
        if source.format != 'PNG':
            raise ValueError(f'{path.name}: expected PNG, got {source.format}')
        if source.getexif().get(274, 1) != 1:
            raise ValueError(f'{path.name}: carries an orientation tag; transpose it before encoding')
        # Keep transparency where a frame has it; an opaque frame is encoded as plain RGB.
        mode = 'RGBA' if has_alpha(source) else 'RGB'
        image = source.convert(mode)
    buffer = io.BytesIO()
    # exact=True keeps the colour of fully transparent pixels (libwebp would otherwise rewrite them).
    image.save(buffer, 'WEBP', lossless=True, quality=100, method=METHOD, exact=True)
    data = buffer.getvalue()

    # Genuine lossless: the image bitstream is VP8L and there is no lossy VP8 chunk anywhere.
    chunks = riff_chunks(data)
    if 'VP8L' not in chunks or 'VP8 ' in chunks:
        raise ValueError(f'{path.name}: output is not a lossless (VP8L) WebP: chunks {chunks}')
    with Image.open(io.BytesIO(data)) as encoded:
        encoded.load()
        if encoded.format != 'WEBP':
            raise ValueError(f'{path.name}: output does not decode as WebP')
        decoded = encoded.convert(mode)
    if decoded.size != image.size:
        raise ValueError(f'{path.name}: size changed {image.size} -> {decoded.size}')
    if ImageChops.difference(image, decoded).getbbox() is not None:
        raise ValueError(f'{path.name}: decoded pixels differ from the source')

    name = f'frame-{index:04d}.webp'
    (target / name).write_bytes(data)
    return {
        'index': index,
        'source': path.name,
        'file': name,
        'width': image.width,
        'height': image.height,
        'mode': mode,
        'sourceBytes': path.stat().st_size,
        'bytes': len(data),
        'chunks': chunks,
        'pixelSha256': hashlib.sha256(image.tobytes()).hexdigest(),
    }


def main() -> None:
    source_dir = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else SOURCE
    target_dir = Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else TARGET
    if source_dir == target_dir:
        sys.exit('Source and target must be different folders.')
    frames = sorted((p for p in source_dir.iterdir() if p.suffix.lower() == '.png'), key=frame_number)
    if not frames:
        sys.exit(f'No frames found in {source_dir}')
    stray = sorted(p.name for p in source_dir.iterdir() if p.is_file() and p.suffix.lower() != '.png')
    if stray:
        print(f'Ignoring non-PNG files: {stray[:10]}')
    numbers = [frame_number(p) for p in frames]
    if len(set(numbers)) != len(numbers):
        sys.exit('Duplicate frame numbers found.')
    gaps = sorted(set(range(numbers[0], numbers[-1] + 1)) - set(numbers))
    if gaps:
        sys.exit(f'Missing frame numbers {gaps[:20]}: the sequence must be contiguous.')
    with Image.open(frames[0]) as first:
        size = first.size

    target_dir.mkdir(parents=True, exist_ok=True)
    for old in target_dir.glob('*.webp'):
        old.unlink()
    workers = max(1, (os.cpu_count() or 2) - 2)
    started = time.perf_counter()
    jobs = [(i, p, target_dir) for i, p in enumerate(frames, start=1)]
    with ProcessPoolExecutor(max_workers=workers) as pool:
        results = list(pool.map(encode, jobs, chunksize=2))
    seconds = time.perf_counter() - started

    odd = sorted({(r['width'], r['height']) for r in results} - {size})
    if odd:
        sys.exit(f'Frames differ in size from {size}: {odd}')
    written = sorted(p.name for p in target_dir.glob('*.webp'))
    if written != [r['file'] for r in results]:
        sys.exit('The target folder does not hold exactly one WebP per source frame.')
    # Identical neighbouring frames (a held shot) stay in the sequence; the site fetches each distinct file once.
    unique = len({r['pixelSha256'] for r in results})
    source_total = sum(r['sourceBytes'] for r in results)
    total = sum(r['bytes'] for r in results)
    manifest = {
        'source': source_dir.name,
        'format': 'WebP lossless (VP8L)',
        'encoder': f'Pillow {Image.__version__} / libwebp {features.version("webp")}, lossless=True, exact=True, method={METHOD}',
        'count': len(results),
        'width': size[0],
        'height': size[1],
        'modes': sorted({r['mode'] for r in results}),
        'distinctFrames': unique,
        'sourceBytes': source_total,
        'bytes': total,
        'frames': [{k: r[k] for k in ('index', 'file', 'source', 'sourceBytes', 'bytes', 'pixelSha256')} for r in results],
    }
    (target_dir / 'manifest.json').write_text(json.dumps(manifest, indent=1) + '\n', encoding='utf-8')

    bigger = [r['file'] for r in results if r['bytes'] >= r['sourceBytes']]
    print(f'Encoded {len(results)} frames ({frames[0].name} to {frames[-1].name}) at {size[0]}x{size[1]} '
          f'{"/".join(manifest["modes"])}, lossless, in {seconds:.0f} s; {unique} distinct.')
    print(f'PNG {source_total / 1048576:.1f} MiB -> WebP {total / 1048576:.1f} MiB ({100 * total / source_total:.1f}%). '
          'Every frame verified pixel-exact and VP8L.')
    if bigger:
        print(f'Warning: {len(bigger)} frames are not smaller than their PNG: {bigger[:10]}')


if __name__ == '__main__':
    main()
