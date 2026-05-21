import os
import subprocess
from PIL import Image

# The 6 pages representing the unique circuit diagrams
pages = [1, 2, 3, 4, 11, 20]

def main():
    os.makedirs("unique_crops", exist_ok=True)
    for p in pages:
        img_path = f"extracted_images/page_{p}_img_1.png"
        img = Image.open(img_path)
        w, h = img.size
        print(f"\n================ PAGE {p} ================")
        
        # Let's crop the whole circuit region (e.g. x=200 to w-100) and save it for inspection
        # This will contain the entire circuit diagram.
        circuit_crop = img.crop((200, 0, w - 100, h))
        circuit_crop.save(f"unique_crops/page_{p}_circuit.png")
        
        # Let's find active regions for this specific page
        binary = img.convert("L").point(lambda p: 0 if p < 220 else 255)
        
        # Let's crop specific coordinate ranges and do OCR:
        # Gate 4: x=540..685, y=70..440 (this is the big gate in the middle)
        gate4 = img.crop((540, 70, 685, 440))
        gate4.save(f"unique_crops/page_{p}_gate4.png")
        
        # Run OCR on gate4 with PSM 6 and PSM 3
        res6 = subprocess.run(["tesseract", f"unique_crops/page_{p}_gate4.png", "stdout", "--psm", "6"], capture_output=True, text=True)
        res3 = subprocess.run(["tesseract", f"unique_crops/page_{p}_gate4.png", "stdout", "--psm", "3"], capture_output=True, text=True)
        
        print(f"Gate 4 (Middle Gate) OCR PSM 6: '{res6.stdout.strip()}'")
        print(f"Gate 4 (Middle Gate) OCR PSM 3: '{res3.stdout.strip()}'")
        
        # Let's crop other regions:
        # Gate 0, 1, 2, 3 (left side gates): x=240..395, y=10..370
        left_gates = img.crop((240, 10, 395, 370))
        left_gates.save(f"unique_crops/page_{p}_left.png")
        res_left = subprocess.run(["tesseract", f"unique_crops/page_{p}_left.png", "stdout", "--psm", "6"], capture_output=True, text=True)
        print(f"Left Gates OCR: '{res_left.stdout.strip()}'")
        
        # Gate 6, 7, 8 (right side gates): x=900..1050, y=10..180
        right_gates = img.crop((900, 10, 1050, 180))
        right_gates.save(f"unique_crops/page_{p}_right.png")
        res_right = subprocess.run(["tesseract", f"unique_crops/page_{p}_right.png", "stdout", "--psm", "6"], capture_output=True, text=True)
        print(f"Right Gates OCR: '{res_right.stdout.strip()}'")

if __name__ == "__main__":
    main()
