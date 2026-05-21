from PIL import Image

def print_gate_grid(page_num, box, label):
    img = Image.open(f"extracted_images/page_{page_num}_img_1.png").convert("L")
    crop = img.crop(box)
    crop_bin = crop.point(lambda p: 0 if p < 200 else 255)
    
    # We want to see if it has letters. Let's print a 35x25 grid.
    w_ascii, h_ascii = 35, 25
    crop_small = crop_bin.resize((w_ascii, h_ascii))
    pixels = list(crop_small.getdata())
    
    print(f"=== Page {page_num} {label} ===")
    for y in range(h_ascii):
        row = "".join("X" if pixels[y * w_ascii + x] == 0 else "." for x in range(w_ascii))
        print(row)
    print("=" * 45)

if __name__ == "__main__":
    # Top-left gate: x=290..350, y=60..120
    # Top-right gate: x=920..1030, y=60..120
    pages = [1, 2, 3, 4, 11, 20]
    for p in pages:
        print_gate_grid(p, (290, 60, 350, 120), "Top-Left Gate")
        print_gate_grid(p, (920, 60, 1030, 120), "Top-Right Gate")
        print("\n" + "#" * 60 + "\n")
