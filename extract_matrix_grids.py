import pypdf
import os
import re

def reconstruct_matrix(page_num, page):
    parts = []
    def visitor(text, cm, tm, fontDict, fontSize):
        if text.strip():
            parts.append((tm[4], tm[5], text))
    page.extract_text(visitor_text=visitor)
    
    # We are interested in the matrix region for Question 2.
    # Typically, the matrix is near "A =" or "2. Проверить унитарность".
    # Let's find parts that are near the middle/bottom of the page, where the matrix usually sits.
    # We can filter parts by y coordinates. The y-coordinates of the matrix A are usually
    # between the line of "2. Проверить унитарность" and "3. Вектор u".
    
    # Let's find the y coordinate of "2. Проверить" and "3. Вектор"
    y_q2 = None
    y_q3 = None
    for x, y, text in parts:
        if "Проверить" in text or "унитарность" in text:
            y_q2 = y
        if "Вектор" in text or "собственный" in text:
            y_q3 = y
            
    if y_q2 is None:
        # Fallback to absolute coordinates if keywords not found
        # Usually matrix is in y range [150, 250] in PDF points
        y_min = 150
        y_max = 280
    else:
        # If Q3 is above Q2 in Y (sometimes PDF coordinates go bottom-up):
        # PDF y-coordinates usually go from bottom (0) to top (792 for letter/A4).
        # Let's check which is larger.
        # "2. Проверить" is higher on page than "3. Вектор", so y_q2 > y_q3 in standard bottom-up coordinates.
        if y_q3 is not None:
            y_min = min(y_q2, y_q3)
            y_max = max(y_q2, y_q3)
        else:
            y_min = y_q2 - 100
            y_max = y_q2 + 100
            
    # Let's filter parts in this Y range, and to the right of "A =" (which is around x=50..150)
    matrix_parts = []
    for x, y, text in parts:
        if y_min - 15 <= y <= y_max + 15:
            # exclude page number, ticket title, or "2. Проверить"
            if any(w in text for w in ["Проверить", "унитарность", "Вектор", "Билет", "июнь", "МФТИ", "схему"]):
                continue
            # Also exclude brackets like , , , , , ,  (if it's a bracket piece)
            if text.strip() in ["", "", "", "", "", "", "A", "="]:
                continue
            matrix_parts.append((x, y, text))
            
    # Let's print out the raw parts sorted by y, then x
    matrix_parts.sort(key=lambda p: (-p[1], p[0]))
    return matrix_parts

def main():
    reader = pypdf.PdfReader("Билеты_2026.pdf")
    for idx, page in enumerate(reader.pages):
        print(f"\n================ PAGE {idx+1} ================")
        parts = reconstruct_matrix(idx+1, page)
        # Print y, x and text
        for x, y, text in parts:
            print(f"  y={y:.1f}, x={x:.1f}: '{text}'")

if __name__ == "__main__":
    main()
