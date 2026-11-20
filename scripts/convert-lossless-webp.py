#!/usr/bin/env python3
"""
Lossless WebP for the website's raster images.

    python scripts/convert-lossless-webp.py            # create what is missing, then verify everything
    python scripts/convert-lossless-webp.py --check    # verify only; changes nothing

Everything here is encoded with libwebp *lossless* (a VP8L bitstream; the encoding itself loses nothing).
Two kinds of output:

  CONVERSIONS  the same pixels at the same dimensions as the PNG original (alpha kept where the original has it).
  RENDITIONS   a smaller copy of the original for places that show it small (a 58 px orbit icon should not
               download a 1254 px image; a 64 px testimonial avatar should not download a 1024x1536 photo).
               The resize (Lanczos) is the only lossy step; the encoding is lossless.

The PNG originals are only ever opened for reading. Existing outputs are never overwritten: a stale or different
file is reported as a failure, so re-running is safe. Every output is re-opened and checked:
  * the RIFF bitstream chunk is VP8L (lossless), not VP8 (lossy),
  * dimensions match, and alpha is present exactly where the original has it,
  * every pixel (all four channels for RGBA) equals the original (conversions) or a fresh resize of it (renditions).
The exit code is non-zero if any check fails.

Not converted on purpose: the hero frames (the shipped frames are already WebP, and a lossless version of the PNG
masters would be roughly ten times heavier, see docs/ASSET_CONVERSION_REPORT.md); and every asset that is already
WebP (re-encoding lossy WebP as lossless cannot restore detail, it only makes the file larger).
"""
import struct
import sys
from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent.parent
IMAGES = ROOT / 'src' / 'assets' / 'images'
GALLERY, GALLERY_WEBP = IMAGES / 'real-grooms' / 'gallery', IMAGES / 'real-grooms' / 'webp'
ORBIT, ACCESSORY_WEBP = IMAGES / 'accessories' / 'orbit', IMAGES / 'accessories' / 'webp'

# Real Grooms gallery, in display order (the two-digit number keeps it under the loader's natural sort).
GALLERY_FILES = [
    ('image.png',  'real-groom-01-maroon-hand-beaded-indo-western.webp'),
    ('image1.png', 'real-groom-02-ivory-muhurtham-silk-ensemble.webp'),
    ('image2.png', 'real-groom-03-midnight-crystal-bandhgala.webp'),
    ('imagee.png', 'real-groom-04-navy-double-breasted-tailoring.webp'),
    ('imagei.png', 'real-groom-05-espresso-embellished-three-piece.webp'),
]

# (original, output): same dimensions.
CONVERSIONS = [(GALLERY / src, GALLERY_WEBP / dst) for src, dst in GALLERY_FILES] + [
    (ORBIT / 'image.png', ACCESSORY_WEBP / 'orbit-groom.webp'),          # centre of the "Complete the Look" orbit
]

# (original, output, width): height follows the aspect ratio.
RENDITIONS = [(GALLERY / src, GALLERY_WEBP / 'sm' / dst, 640) for src, dst in GALLERY_FILES] + [
    (ORBIT / 'image.png', ACCESSORY_WEBP / 'orbit-groom-sm.webp', 561),  # half size, for 1x/2x screens (shown 227 px wide)
    (ORBIT / 'belt.png', ACCESSORY_WEBP / 'orbit-belt.webp', 256),       # shown at 58 px, like the other cut-outs
    (ORBIT / 'pant.png', ACCESSORY_WEBP / 'orbit-pant.webp', 256),
]


def has_alpha(im: Image.Image) -> bool:
    return im.mode in ('RGBA', 'LA', 'PA') or 'transparency' in im.info


def pixels(im: Image.Image, alpha: bool) -> Image.Image:
    im.load()
    return im.convert('RGBA' if alpha else 'RGB')


def bitstream_chunk(path: Path) -> str:
    """'VP8L' (lossless) or 'VP8 ' (lossy): the image bitstream chunk of a WebP file."""
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


def expected(src: Path, width: int | None):
    """The pixels an output must contain: the original, or the original resized to `width`."""
    with Image.open(src) as im:
        alpha = has_alpha(im)
        px = pixels(im, alpha)
    if width is not None:
        height = round(px.height * width / px.width)
        px = px.resize((width, height), Image.LANCZOS)  # Pillow premultiplies alpha for RGBA resizes
    return px, alpha


def write(src: Path, dst: Path, width: int | None):
    px, _ = expected(src, width)
    dst.parent.mkdir(parents=True, exist_ok=True)
    # lossless=True -> VP8L. quality only sets encoder effort (100 = smallest, slowest); it never loses detail.
    # exact=True keeps the colour of fully transparent pixels, so the alpha cut-outs round-trip bit for bit.
    px.save(dst, 'WEBP', lossless=True, quality=100, method=6, exact=True)


def verify(src: Path, dst: Path, width: int | None) -> list[str]:
    problems = []
    want, alpha = expected(src, width)
    if bitstream_chunk(dst) != 'VP8L':
        problems.append('bitstream is not lossless VP8L')
    with Image.open(dst) as out:
        if out.format != 'WEBP':
            problems.append(f'format is {out.format}')
        got = pixels(out, alpha)
        if got.size != want.size:
            problems.append(f'size {got.size} != {want.size}')
        elif ImageChops.difference(got, want).getbbox() is not None:
            problems.append('pixels differ from ' + ('the original' if width is None else 'a fresh resize of the original'))
        if alpha and not has_alpha(out):
            problems.append('lost the alpha channel')
        if not alpha and has_alpha(out):
            problems.append('gained an alpha channel')
    return problems


def main() -> int:
    check_only = '--check' in sys.argv[1:]
    failed = 0
    jobs = [(s, d, None) for s, d in CONVERSIONS] + list(RENDITIONS)
    for src, dst, width in jobs:
        kind = 'conversion' if width is None else f'rendition {width}px'
        label = f'{src.relative_to(IMAGES)} -> {dst.relative_to(IMAGES)}'
        if not src.is_file():
            print(f'MISSING {label}')
            failed += 1
            continue
        if not dst.exists():
            if check_only:
                print(f'ABSENT  {label}')
                failed += 1
                continue
            write(src, dst, width)
        problems = verify(src, dst, width)
        failed += bool(problems)
        print(f"{'OK  ' if not problems else 'FAIL'} {kind:16s} {src.stat().st_size / 1024:8.1f} kB -> {dst.stat().st_size / 1024:8.1f} kB  {label}"
              + ('' if not problems else '   ' + '; '.join(problems)))
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
