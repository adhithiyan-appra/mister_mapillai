#!/usr/bin/env python3
"""
Convert the Real Grooms gallery photographs to LOSSLESS WebP.

    python scripts/convert-real-grooms-webp.py

Reads   src/assets/images/real-grooms/gallery/   (original PNGs; opened read-only, never modified)
Writes  src/assets/images/real-grooms/webp/      (what the website imports)

Nothing is resized, cropped or re-compressed lossily. Every output is re-opened and checked:
  * the RIFF bitstream chunk is `VP8L` (lossless), not `VP8 ` (lossy),
  * dimensions, mode and every pixel equal the source (zero difference).
The script exits non-zero if any check fails, and refuses to overwrite a different file that
already exists, so re-running it is safe.

The file order in GALLERY is the display order: names carry a two-digit number so the
gallery loader's natural sort keeps it.
"""
import struct
import sys
from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'src' / 'assets' / 'images' / 'real-grooms' / 'gallery'
TARGET = ROOT / 'src' / 'assets' / 'images' / 'real-grooms' / 'webp'

# (original file, WebP file) in gallery order.
GALLERY = [
    ('image.png',  'real-groom-01-maroon-hand-beaded-indo-western.webp'),
    ('image1.png', 'real-groom-02-ivory-muhurtham-silk-ensemble.webp'),
    ('image2.png', 'real-groom-03-midnight-crystal-bandhgala.webp'),
    ('imagee.png', 'real-groom-04-navy-double-breasted-tailoring.webp'),
    ('imagei.png', 'real-groom-05-espresso-embellished-three-piece.webp'),
]


def bitstream_chunk(path: Path) -> str:
    """Return 'VP8L' (lossless), 'VP8 ' (lossy) or 'VP8X'-wrapped inner type of a WebP file."""
    data = path.read_bytes()
    if data[:4] != b'RIFF' or data[8:12] != b'WEBP':
        raise ValueError('not a RIFF/WEBP file')
    pos = 12
    while pos + 8 <= len(data):
        fourcc = data[pos:pos + 4].decode('latin1')
        size, = struct.unpack('<I', data[pos + 4:pos + 8])
        if fourcc in ('VP8L', 'VP8 '):
            return fourcc
        pos += 8 + size + (size & 1)
    raise ValueError('no VP8/VP8L bitstream chunk')


def verify(src: Path, dst: Path) -> list[str]:
    problems = []
    if bitstream_chunk(dst) != 'VP8L':
        problems.append('bitstream is not lossless VP8L')
    with Image.open(src) as a, Image.open(dst) as b:
        if b.format != 'WEBP':
            problems.append(f'format is {b.format}')
        if a.size != b.size:
            problems.append(f'size {a.size} != {b.size}')
        a.load()
        b.load()
        if a.mode != b.mode:
            problems.append(f'mode {a.mode} != {b.mode}')
        elif ImageChops.difference(a, b).getbbox() is not None:
            problems.append('pixels differ from the source')
    return problems


def main() -> int:
    TARGET.mkdir(parents=True, exist_ok=True)
    failed = 0
    for src_name, dst_name in GALLERY:
        src, dst = SOURCE / src_name, TARGET / dst_name
        if not src.is_file():
            print(f'MISSING   {src_name}')
            failed += 1
            continue
        if not dst.exists():
            with Image.open(src) as im:
                im.load()
                # lossless=True -> libwebp VP8L. quality only sets encoder effort (100 = smallest
                # file, slowest); it never reduces fidelity in lossless mode. exact=True keeps the
                # colour values of fully transparent pixels (none of these sources has alpha).
                im.save(dst, 'WEBP', lossless=True, quality=100, method=6, exact=True)
        problems = verify(src, dst)
        status = 'OK  ' if not problems else 'FAIL'
        print(f'{status} {src_name:11s} {src.stat().st_size / 1024:8.1f} kB -> {dst_name:55s} {dst.stat().st_size / 1024:8.1f} kB'
              + ('' if not problems else '   ' + '; '.join(problems)))
        failed += bool(problems)
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
