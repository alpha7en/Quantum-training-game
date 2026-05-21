from PIL import Image

def print_letter_grid(filepath, box, label):
    img = Image.open(filepath).convert("L")
    crop = img.crop(box)
    crop_bin = crop.point(lambda p: 0 if p < 200 else 255)
    
    # Let's resize to exactly 30x30
    crop_small = crop_bin.resize((30, 30))
    pixels = list(crop_small.getdata())
    
    print(f"=== {label} in {filepath} ===")
    for y in range(30):
        row = "".join("X" if pixels[y * 30 + x] == 0 else " " for x in range(30))
        print(row)
    print("=" * 40)

if __name__ == "__main__":
    # Let's print the top-left gate for Page 1, 2, 3
    # Top-left box is x=290..350, y=60..120
    # Let's refine the box to target just the letter inside.
    # The box outline is around y=60 and y=120, x=290 and x=350.
    # The letter should be in the center, e.g. x=305..335, y=75..105.
    letter_box = (305, 70, 340, 110)
    print_letter_grid("extracted_images/page_1_img_1.png", letter_box, "Page 1 Top-Left Letter")
    print_letter_grid("extracted_images/page_2_img_1.png", letter_box, "Page 2 Top-Left Letter")
    print_letter_grid("extracted_images/page_3_img_1.png", letter_box, "Page 3 Top-Left Letter")
    print_letter_grid("extracted_images/page_4_img_1.png", letter_box, "Page 4 Top-Left Letter")
    print_letter_grid("extracted_images/page_11_img_1.png", letter_box, "Page 11 Top-Left Letter")
