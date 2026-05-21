import os
import pypdf

def main():
    os.makedirs("extracted_images", exist_ok=True)
    reader = pypdf.PdfReader("Билеты_2026.pdf")
    print(f"Total pages: {len(reader.pages)}")
    for i, page in enumerate(reader.pages):
        print(f"Page {i+1} images count: {len(page.images)}")
        for j, img_file in enumerate(page.images):
            filename = f"extracted_images/page_{i+1}_img_{j+1}.png"
            with open(filename, "wb") as f:
                f.write(img_file.data)
            print(f"Saved {filename}")

if __name__ == "__main__":
    main()
