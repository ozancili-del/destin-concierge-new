from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
IMAGE_DIR = ROOT / "public" / "images" / "site"
TEXT_ROOTS = [ROOT / "pages", ROOT / "components", ROOT / "data", ROOT / "public"]

converted = {}
for file in IMAGE_DIR.glob("*.webp"):
    for extension in (".jpg", ".jpeg", ".png"):
        converted[f"{file.stem}{extension}"] = file.name
for source in sorted(IMAGE_DIR.iterdir()):
    if not source.is_file() or source.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
        continue
    target = source.with_suffix(".webp")
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image)
        if image.mode not in {"RGB", "RGBA"}:
            image = image.convert("RGB")
        image.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
        image.save(target, "WEBP", quality=82, method=4)
    converted[source.name] = target.name
    source.unlink()

extensions = {".js", ".jsx", ".json", ".html", ".css"}
for base in TEXT_ROOTS:
    for file in base.rglob("*"):
        if not file.is_file() or file.suffix.lower() not in extensions:
            continue
        if file.name.lower().startswith("tv-") and file.suffix.lower() == ".html":
            continue
        original = file.read_text(encoding="utf-8")
        updated = original
        for old, new in converted.items():
            updated = updated.replace(f"/images/site/{old}", f"/images/site/{new}")
        if updated != original:
            file.write_text(updated, encoding="utf-8")

print(f"Optimized {len(set(converted.values()))} image files as WebP.")
