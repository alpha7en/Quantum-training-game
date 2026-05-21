from PIL import Image
import os

def main():
    img_path = "extracted_images/page_1_img_1.png"
    img = Image.open(img_path)
    print("Original Mode:", img.mode)
    print("Original Bands:", img.getbands())
    
    # Check if there is an alpha channel
    if "A" in img.getbands():
        print("Alpha channel exists!")
        # Let's inspect some alpha values
        alphas = [img.getpixel((x, y))[3] for x in range(0, img.size[0], 100) for y in range(0, img.size[1], 100)]
        print("Sample alpha values:", alphas[:20])
    else:
        print("No alpha channel.")
        # Let's check RGB values of some pixels
        pixels = [img.getpixel((x, y)) for x in range(0, img.size[0], 100) for y in range(0, img.size[1], 100)]
        print("Sample RGB values:", pixels[:20])

if __name__ == "__main__":
    main()
