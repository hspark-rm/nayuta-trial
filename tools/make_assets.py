#!/usr/bin/env python3
"""법정 배경 · 증거품 아이콘 생성 (고려대 LLM 이미지 모델 경유).

  tools/make_assets.py            # 없는 것만 생성
  tools/make_assets.py --force    # 전부 다시
모델 원본은 assets/raw/ 에, 게임용은 assets/bg/court.png · assets/evidence/<id>.png 에 저장한다.
"""
import argparse, pathlib, subprocess, sys

from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from make_portraits import KU_DRAW, ROOT, RAW, remove_background  # noqa: E402

STYLE = ("16-bit retro game pixel art, clearly visible chunky square pixels, limited palette, "
         "clean dark outline, no text, no letters, no UI.")

# 참고: 지금 게임 배경(assets/bg/court.png)은 assets/raw/bg_mass_2.png(밝은 캐주얼 + 양산형 니케·눈 가린 NPC 관중)를 골라 넣은 것이다.
# 아래 BG는 처음 만든 어두운 배경의 지시문이다. 다시 돌리면 어두운 배경으로 덮어쓰니 주의.
BG = ("Wide pixel art background of a futuristic underground-city courtroom interior, seen from the front. "
      "A high judge's bench in the back center under a large round emblem. "
      "On the left, a jury box with six ordinary civilians of a sci-fi underground city (casual jackets, hoodies, work uniforms). "
      "On the right, audience gallery benches crowded with ordinary civilians watching. "
      "The middle foreground is an empty open floor. Dim blue and warm wood tones, cinematic lighting. " + STYLE)

ICONS = {
    "e1": "a rolled paper contract with a red wax seal and a small handshake emblem",
    "e2": "a cracked dark battle-report tablet showing a red warning light and a broken crown symbol",
    "e3": "a small folded paper note with a wooden prayer-bead bracelet lying on top of it",
    "e4": "a glowing purple data chip with a comet-shaped flame streak symbol",
    "e5": "one large glowing green bullet cartridge standing inside a small glass case",
    "e6": "an opened ancient stone coffin seen at an angle, empty inside",
}


def draw(prompt, dest, ratio):
    cmd = [sys.executable, str(KU_DRAW), prompt, "-o", str(dest), "-r", ratio]
    print(f"  생성 중: {dest.name}", flush=True)
    r = subprocess.run(cmd, capture_output=True, text=True)
    print("   ", (r.stdout.strip().splitlines() or [""])[-1], r.stderr.strip()[-300:], flush=True)
    return r.returncode == 0 and dest.exists()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    RAW.mkdir(parents=True, exist_ok=True)

    raw_bg, out_bg = RAW / "bg_court.png", ROOT / "assets/bg/court.png"
    if a.force or not raw_bg.exists():
        draw(BG, raw_bg, "16:9")
    if raw_bg.exists():
        im = Image.open(raw_bg).convert("RGB")
        im.thumbnail((1920, 1080), Image.LANCZOS)
        im.quantize(colors=128, method=Image.FASTOCTREE).save(out_bg, optimize=True)
        print(f"  저장: {out_bg.relative_to(ROOT)} {im.size}")

    for eid, what in ICONS.items():
        raw = RAW / f"icon_{eid}.png"
        if a.force or not raw.exists():
            draw(f"Pixel art game item icon, centered, filling most of the frame: {what}. Plain pure white background. " + STYLE, raw, "1:1")
        if raw.exists():
            dest = ROOT / f"assets/evidence/{eid}.png"
            remove_background(raw, dest)
            im = Image.open(dest).convert("RGBA")
            im.thumbnail((256, 256), Image.LANCZOS)
            im.save(dest, optimize=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
