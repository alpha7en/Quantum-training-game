import os
import subprocess
from PIL import Image

def analyze_file(filepath):
    img = Image.open(filepath).convert("L")
    w, h = img.size
    binary = img.point(lambda p: 0 if p < 200 else 255)
    
    # Calculate row-wise dark pixel count
    row_counts = [sum(1 for x in range(w) if binary.getpixel((x, y)) == 0) for y in range(h)]
    
    # Find peaks representing wires
    # Wires should have at least 300 dark pixels and be separated by at least 100 pixels vertically
    peaks = []
    min_dist = 100
    for y in range(5, h - 5):
        val = row_counts[y]
        if val > 300:
            # Check if it is a local maximum
            is_max = True
            for dy in range(-50, 51):
                ny = y + dy
                if 0 <= ny < h and row_counts[ny] > val:
                    is_max = False
                    break
            if is_max:
                peaks.append(y)
                
    print(f"File: {os.path.basename(filepath)}")
    print(f"  Detected wires at y centers: {peaks}")
    
    if len(peaks) < 2:
        print("  Error: Could not find at least 2 wires.")
        return
        
    wire_centers = sorted(peaks)
    
    # Ignore pixels on the horizontal wires when checking for gate columns
    ignored_ys = set()
    for cy in wire_centers:
        for dy in range(-10, 11): # ignore 20 pixels around each wire
            ignored_ys.add(cy + dy)
            
    # Find active columns
    active_cols = []
    # Scan from x=150 to w-150 to avoid input labels like |0> and |u>
    start_scan_x = 150
    end_scan_x = w - 150
    
    for x in range(start_scan_x, end_scan_x):
        has_activity = False
        for y in range(min(wire_centers) - 40, max(wire_centers) + 40):
            if y not in ignored_ys:
                if binary.getpixel((x, y)) == 0:
                    has_activity = True
                    break
        active_cols.append(has_activity)
        
    # Group active columns into regions
    regions = []
    in_region = False
    start_x = 0
    for idx, active in enumerate(active_cols):
        x = start_scan_x + idx
        if active and not in_region:
            start_x = x
            in_region = True
        elif not active and in_region:
            regions.append((start_x, x))
            in_region = False
    if in_region:
        regions.append((start_x, end_scan_x))
        
    print(f"  Found {len(regions)} active regions:")
    for idx, (x1, x2) in enumerate(regions):
        # Ignore extremely thin regions (e.g. less than 3 pixels wide) unless they are CNOT vertical lines
        if (x2 - x1) < 3:
            continue
            
        # Find vertical span in this column range
        y1, y2 = h, 0
        for x in range(x1, x2):
            for y in range(5, h - 5):
                if binary.getpixel((x, y)) == 0:
                    if y < y1: y1 = y
                    if y > y2: y2 = y
        # Padding
        x1_p = max(0, x1 - 5)
        x2_p = min(w, x2 + 5)
        y1_p = max(0, y1 - 5)
        y2_p = min(h, y2 + 5)
        
        cropped = img.crop((x1_p, y1_p, x2_p, y2_p))
        temp_name = f"temp_gate_{idx}.png"
        cropped.save(temp_name)
        
        # OCR
        res = subprocess.run(["tesseract", temp_name, "stdout", "--psm", "10"], capture_output=True, text=True)
        txt = res.stdout.strip().replace("\n", " ")
        
        w_crop = x2_p - x1_p
        h_crop = y2_p - y1_p
        print(f"    Gate {idx}: x={x1}..{x2}, y={y1}..{y2} (w={w_crop}, h={h_crop}) | OCR: '{txt}'")
        
        if os.path.exists(temp_name):
            os.remove(temp_name)

if __name__ == "__main__":
    for i in range(1, 21):
        analyze_file(f"extracted_images/page_{i}_img_1.png")
        print("-" * 50)
