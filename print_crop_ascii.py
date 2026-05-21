from PIL import Image

def ascii_crop(filepath, w_ascii=50, h_ascii=20):
    img = Image.open(filepath).convert("L")
    img_small = img.resize((w_ascii, h_ascii))
    pixels = img_small.getdata()
    chars = "@%#*+=-:. " # dark to light
    scale = 256 / len(chars)
    output = []
    for y in range(h_ascii):
        row = ''.join(chars[int(pixels[y * w_ascii + x] / scale)] for x in range(w_ascii))
        output.append(row)
    print(f"File: {filepath} ({img.size[0]}x{img.size[1]})")
    print('\n'.join(output))
    print("-" * 60)

if __name__ == "__main__":
    ascii_crop("unique_crops/page_1_gate4.png", 40, 20)
    ascii_crop("unique_crops/page_1_left.png", 40, 15)
    ascii_crop("unique_crops/page_1_right.png", 40, 15)
