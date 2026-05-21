from PIL import Image

def zoom_print(filepath, x1, y1, x2, y2, w_ascii=70, h_ascii=20):
    img = Image.open(filepath).convert("L")
    crop = img.crop((x1, y1, x2, y2))
    # Threshold for crisp contrast
    crop_bin = crop.point(lambda p: 0 if p < 200 else 255)
    
    # Render as ASCII
    img_small = crop_bin.resize((w_ascii, h_ascii))
    pixels = img_small.getdata()
    chars = "@ " # black and white
    output = []
    for y in range(h_ascii):
        row = ''.join(chars[0 if pixels[y * w_ascii + x] == 0 else 1] for x in range(w_ascii))
        output.append(row)
    print(f"Zoom crop of {filepath} at ({x1},{y1})-({x2},{y2}):")
    print('\n'.join(output))
    print("=" * 80)

if __name__ == "__main__":
    # In page_1_img_1.png:
    # Left gates are around x=240..395, y=10..370
    # Let's crop individual gates:
    # Wire 0 (top) is at y=90. So top-left gate is around x=280..360, y=50..130.
    # Let's zoom into it.
    zoom_print("extracted_images/page_1_img_1.png", 285, 55, 360, 130, 60, 15)
    # Wire 1 (bottom) is at y=356. So bottom-left gate is around x=280..360, y=315..395.
    zoom_print("extracted_images/page_1_img_1.png", 285, 315, 360, 395, 60, 15)
    
    # Let's zoom into the middle gate on page 1 (which spans both wires, or is a CNOT)
    # y=50..400, x=540..680
    # Let's zoom into the bottom wire part of the middle gate (target circle?):
    zoom_print("extracted_images/page_1_img_1.png", 580, 320, 650, 390, 60, 15)
    
    # Right-side gates on wire 0 (top): y=90.
    # They should be around x=920..1040, y=50..130. Let's inspect them:
    # Gate 6: x=938..950? Wait, let's see. Let's zoom into x=910..1040, y=50..130.
    zoom_print("extracted_images/page_1_img_1.png", 910, 50, 1040, 130, 80, 15)
