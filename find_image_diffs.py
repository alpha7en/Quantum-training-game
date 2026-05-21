from PIL import Image

unique_pages = [1, 2, 3, 4, 11, 20]

def find_diff(p1, p2):
    img1 = Image.open(f"extracted_images/page_{p1}_img_1.png").convert("L")
    img2 = Image.open(f"extracted_images/page_{p2}_img_1.png").convert("L")
    
    w, h = img1.size
    diff_pixels = []
    for y in range(h):
        for x in range(w):
            if abs(img1.getpixel((x, y)) - img2.getpixel((x, y))) > 20:
                diff_pixels.append((x, y))
                
    if not diff_pixels:
        print(f"Pages {p1} and {p2} are identical.")
        return None
        
    xs = [x for x, y in diff_pixels]
    ys = [y for x, y in diff_pixels]
    bbox = (min(xs), min(ys), max(xs), max(ys))
    print(f"Diff between Page {p1} and {p2}: bbox = {bbox}, total diff pixels = {len(diff_pixels)}")
    return bbox

def ascii_crop(p, bbox, w_ascii=50, h_ascii=15):
    img = Image.open(f"extracted_images/page_{p}_img_1.png").convert("L")
    x1, y1, x2, y2 = bbox
    # Add padding
    pad = 5
    x1 = max(0, x1 - pad)
    x2 = min(img.size[0], x2 + pad)
    y1 = max(0, y1 - pad)
    y2 = min(img.size[1], y2 + pad)
    
    crop = img.crop((x1, y1, x2, y2))
    crop_bin = crop.point(lambda p: 0 if p < 200 else 255)
    img_small = crop_bin.resize((w_ascii, h_ascii))
    pixels = img_small.getdata()
    chars = "@ "
    output = []
    for y in range(h_ascii):
        row = ''.join(chars[0 if pixels[y * w_ascii + x] == 0 else 1] for x in range(w_ascii))
        output.append(row)
    print(f"Page {p} at {x1}..{x2}, {y1}..{y2}:")
    print('\n'.join(output))
    print("-" * 60)

if __name__ == "__main__":
    for p in [2, 3, 4, 11, 20]:
        bbox = find_diff(1, p)
        if bbox:
            ascii_crop(1, bbox, 60, 15)
            ascii_crop(p, bbox, 60, 15)
