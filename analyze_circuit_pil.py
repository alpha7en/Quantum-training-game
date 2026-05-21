import os
import subprocess
from PIL import Image

def analyze_image(img_path):
    img = Image.open(img_path).convert("L")
    w, h = img.size
    
    # Threshold to binary (0 for black, 255 for white)
    binary = img.point(lambda p: 0 if p < 220 else 255)
    
    # We want to find columns that contain drawings.
    # A column is active if it has a low (black) pixel.
    active_cols = []
    for x in range(w):
        has_black = False
        for y in range(h):
            if binary.getpixel((x, y)) == 0:
                has_black = True
                break
        active_cols.append(has_black)
        
    # Group active columns into regions
    regions = []
    in_region = False
    start = 0
    for x in range(w):
        if active_cols[x] and not in_region:
            start = x
            in_region = True
        elif not active_cols[x] and in_region:
            regions.append((start, x))
            in_region = False
    if in_region:
        regions.append((start, w))
        
    print(f"File: {os.path.basename(img_path)}")
    print(f"Found {len(regions)} regions:")
    
    # Crop each region and run OCR
    for idx, (x1, x2) in enumerate(regions):
        # We can also crop vertically to find the exact bounding box of black pixels in this region
        y1, y2 = h, 0
        for x in range(x1, x2):
            for y in range(h):
                if binary.getpixel((x, y)) == 0:
                    if y < y1: y1 = y
                    if y > y2: y2 = y
        
        # Add a bit of padding
        pad = 5
        x1_pad = max(0, x1 - pad)
        x2_pad = min(w, x2 + pad)
        y1_pad = max(0, y1 - pad)
        y2_pad = min(h, y2 + pad)
        
        cropped = img.crop((x1_pad, y1_pad, x2_pad, y2_pad))
        temp_name = f"temp_crop_{idx}.png"
        cropped.save(temp_name)
        
        # Run OCR
        res = subprocess.run(["tesseract", temp_name, "stdout", "--psm", "6"], capture_output=True, text=True)
        txt = res.stdout.strip().replace("\n", " ")
        print(f"  Region {idx}: x={x1}..{x2}, y={y1}..{y2} | OCR: '{txt}'")
        
        # Clean up
        if os.path.exists(temp_name):
            os.remove(temp_name)

if __name__ == "__main__":
    analyze_image("extracted_images/page_1_img_1.png")
