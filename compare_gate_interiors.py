import hashlib
import os
from PIL import Image

def get_crop_hash(filepath, box):
    img = Image.open(filepath).convert("L")
    crop = img.crop(box)
    # Threshold it to binary so minor shading/anti-aliasing differences don't affect MD5
    crop_bin = crop.point(lambda p: 0 if p < 200 else 255)
    data = crop_bin.tobytes()
    h = hashlib.md5(data).hexdigest()
    return h, crop_bin

def ascii_print(crop_bin, label):
    w_ascii, h_ascii = 40, 12
    img_small = crop_bin.resize((w_ascii, h_ascii))
    pixels = img_small.getdata()
    chars = "@ "
    output = []
    for y in range(h_ascii):
        row = ''.join(chars[0 if pixels[y * w_ascii + x] == 0 else 1] for x in range(w_ascii))
        output.append(row)
    print(f"--- ASCII ART FOR {label} ---")
    print('\n'.join(output))
    print("=" * 50)

def main():
    # Four positions:
    # 1. Top-left: x=290..350, y=60..120
    # 2. Bottom-left: x=290..350, y=325..385
    # 3. Top-right: x=920..1030, y=60..120
    # 4. Bottom-right: x=920..1030, y=325..385
    boxes = {
        "top-left": (290, 60, 350, 120),
        "bottom-left": (290, 325, 350, 385),
        "top-right": (920, 60, 1030, 120),
        "bottom-right": (920, 325, 1030, 385)
    }
    
    unique_crops = {}
    
    for i in range(1, 21):
        filepath = f"extracted_images/page_{i}_img_1.png"
        if not os.path.exists(filepath):
            continue
        print(f"\nPage {i}:")
        for name, box in boxes.items():
            h, crop_bin = get_crop_hash(filepath, box)
            
            # Check if this crop is mostly white (i.e. no gate)
            pixels = list(crop_bin.getdata())
            black_count = sum(1 for p in pixels if p == 0)
            is_empty = black_count < 15 # very few black pixels
            
            if is_empty:
                print(f"  {name}: EMPTY")
            else:
                if h not in unique_crops:
                    unique_crops[h] = (crop_bin, f"Page {i} {name}")
                print(f"  {name}: HASH {h[:8]} (seen as {unique_crops[h][1]})")

    print("\n\n=== UNIQUE GATES FOUND ===")
    for h, (crop_bin, label) in unique_crops.items():
        ascii_print(crop_bin, f"{label} (Hash: {h[:8]})")

if __name__ == "__main__":
    main()
