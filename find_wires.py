import os
import subprocess
from PIL import Image

def analyze_file(filepath):
    img = Image.open(filepath).convert("L")
    w, h = img.size
    binary = img.point(lambda p: 0 if p < 200 else 255)
    
    # 1. Find horizontal wire positions
    row_counts = []
    for y in range(h):
        black_count = sum(1 for x in range(150, w - 50) if binary.getpixel((x, y)) == 0)
        row_counts.append(black_count)
        
    # We expect wires to have a very large number of black pixels (nearly w-200)
    # Let's find local maxima in row_counts
    wire_y = []
    threshold = (w - 200) * 0.7 # at least 70% of width is black
    
    # Find continuous ranges where row count is high
    is_wire = False
    start_y = 0
    for y in range(h):
        if row_counts[y] > threshold:
            if not is_wire:
                start_y = y
                is_wire = True
        else:
            if is_wire:
                wire_y.append((start_y, y))
                is_wire = False
    if is_wire:
        wire_y.append((start_y, h))
        
    # Find the average y for each wire range
    wire_centers = [int((y1 + y2) / 2) for y1, y2 in wire_y]
    print(f"File: {os.path.basename(filepath)}")
    print(f"  Detected wires at y centers: {wire_centers}")
    
    if len(wire_centers) < 2:
        print("  Error: Could not find at least 2 wires.")
        return
        
    # Let's define the two wire vertical bands:
    # Qubit 0 (top): y from wire_centers[0] - 30 to wire_centers[0] + 30
    # Qubit 1 (bottom): y from wire_centers[1] - 30 to wire_centers[1] + 30
    # Let's scan columns x from 150 to w-50.
    # To find gates, we find columns where there is drawing activity outside the wires.
    # Actually, we can check for bounding boxes of components.
    # Let's find connected components in the image by grouping black pixels.
    # An easier way: scan columns, and in each column, find black pixels.
    # We ignore pixels that are exactly on the horizontal wires (e.g. within 2 pixels of wire_centers).
    
    ignored_ys = set()
    for cy in wire_centers:
        for dy in range(-3, 4):
            ignored_ys.add(cy + dy)
            
    active_cols = []
    for x in range(150, w - 50):
        has_activity = False
        for y in range(min(wire_centers) - 40, max(wire_centers) + 40):
            if y not in ignored_ys:
                if binary.getpixel((x, y)) == 0:
                    has_activity = True
                    break
        active_cols.append(has_activity)
        
    # Group columns
    regions = []
    in_region = False
    start_x = 0
    for idx, active in enumerate(active_cols):
        x = 150 + idx
        if active and not in_region:
            start_x = x
            in_region = True
        elif not active and in_region:
            regions.append((start_x, x))
            in_region = False
    if in_region:
        regions.append((start_x, w - 50))
        
    print(f"  Found {len(regions)} active regions:")
    for idx, (x1, x2) in enumerate(regions):
        # Find vertical span in this column range
        y1, y2 = h, 0
        for x in range(x1, x2):
            for y in range(5, h - 5):
                if binary.getpixel((x, y)) == 0:
                    if y < y1: y1 = y
                    if y > y2: y2 = y
        # Padding
        x1_p = max(0, x1 - 4)
        x2_p = min(w, x2 + 4)
        y1_p = max(0, y1 - 4)
        y2_p = min(h, y2 + 4)
        
        # Save crop
        cropped = img.crop((x1_p, y1_p, x2_p, y2_p))
        cropped_bin = binary.crop((x1_p, y1_p, x2_p, y2_p))
        
        # Save temp file
        temp_name = f"temp_gate_{idx}.png"
        cropped.save(temp_name)
        
        # OCR
        res = subprocess.run(["tesseract", temp_name, "stdout", "--psm", "10"], capture_output=True, text=True)
        txt = res.stdout.strip().replace("\n", " ")
        
        # Let's check if it is a control point (usually a small solid dot on one wire and a vertical line)
        # We can analyze the crop to see if it's a solid circle or a cross
        # For control dot, it is a small black circle. For target, it is a circle with a cross.
        # Let's print OCR text and dimensions
        w_crop = x2_p - x1_p
        h_crop = y2_p - y1_p
        print(f"    Gate {idx}: x={x1}..{x2}, y={y1}..{y2} (w={w_crop}, h={h_crop}) | OCR: '{txt}'")
        
        if os.path.exists(temp_name):
            os.remove(temp_name)

if __name__ == "__main__":
    for i in range(1, 21):
        analyze_file(f"extracted_images/page_{i}_img_1.png")
        print("-" * 50)
