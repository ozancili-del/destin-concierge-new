from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
TEXT_ROOTS = [ROOT / "pages", ROOT / "components", ROOT / "data", ROOT / "public", ROOT / "styles"]
TEXT_EXTENSIONS = {".js", ".jsx", ".json", ".html", ".css"}

text_files = []
combined = ""
for base in TEXT_ROOTS:
    for file in base.rglob("*"):
        if not file.is_file() or file.suffix.lower() not in TEXT_EXTENSIONS:
            continue
        relative = file.relative_to(ROOT).as_posix()
        if relative == "data/site-image-migration.json" or (relative.startswith("public/tv") and file.suffix.lower() == ".html"):
            continue
        source = file.read_text(encoding="utf-8")
        text_files.append((file, source))
        combined += source

converted = {}
for source in sorted(PUBLIC.iterdir()):
    if not source.is_file() or source.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
        continue
    if source.stat().st_size < 500_000 or source.name not in combined:
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

for file, original in text_files:
    updated = original
    for old, new in converted.items():
        updated = updated.replace(old, new)
    if updated != original:
        file.write_text(updated, encoding="utf-8")

before_suffixes = ", ".join(sorted(converted))
print(f"Optimized {len(converted)} referenced public images as WebP.")
if converted:
    print(before_suffixes)
