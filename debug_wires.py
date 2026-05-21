from PIL import Image

def main():
    img = Image.open("extracted_images/page_1_img_1.png").convert("L")
    w, h = img.size
    # Print the coordinates of first few black pixels to see their values
    black_pixels = []
    for y in range(h):
        for x in range(w):
            val = img.getpixel((x, y))
            if val < 200:
                black_pixels.append((x, y, val))
                if len(black_pixels) >= 10:
                    break
        if len(black_pixels) >= 10:
            break
    print("Sample dark pixels:", black_pixels)
    
    # Calculate row-wise dark pixel count
    row_counts = []
    for y in range(h):
        count = sum(1 for x in range(w) if img.getpixel((x, y)) < 200)
        row_counts.append((y, count))
    
    # Print top 15 rows with maximum dark pixels
    row_counts.sort(key=lambda x: x[1], reverse=True)
    print("Top 15 rows with dark pixels:")
    for y, c in row_counts[:15]:
        print(f"  Row {y}: {c} dark pixels")

if __name__ == "__main__":
    main()
