import os
from PIL import Image

assets_dir = r"d:\Projects\TOOLS\WealthSnap\assets"
files = ["icon.png", "adaptive-icon.png", "splash-icon.png", "favicon.png"]

print("Starting image conversion...")

for filename in files:
    path = os.path.join(assets_dir, filename)
    if os.path.exists(path):
        try:
            # Open the image (PIL detects format automatically)
            with Image.open(path) as img:
                print(f"Processing {filename}: Detected format {img.format}")
                
                # Convert to RGBA (ensures transparency is preserved if present, or adds alpha channel)
                img = img.convert("RGBA")
                
                # Save as PNG
                img.save(path, "PNG")
                print(f"Successfully saved {filename} as proper PNG.")
        except Exception as e:
            print(f"Failed to convert {filename}: {e}")
    else:
        print(f"File not found: {path}")

print("Conversion complete.")
