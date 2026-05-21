import json
import re

def parse_raw_parts():
    with open("raw_matrix_parts.txt", "r", encoding="utf-8") as f:
        content = f.read()
        
    pages_data = content.split("================ PAGE ")
    
    tickets_matrices = {}
    
    for page_str in pages_data:
        if not page_str.strip():
            continue
        
        lines = page_str.strip().split("\n")
        page_num_match = re.match(r"^(\d+)", lines[0])
        if not page_num_match:
            continue
            
        page_num = int(page_num_match.group(1))
        
        # We collect the text elements and their coordinates
        elements = []
        for line in lines[1:]:
            line = line.strip()
            # format is: y=177.4, x=137.4: '2.'
            match = re.match(r"^y=([\d\.\-]+),\s*x=([\d\.\-]+):\s*'(.*)'$", line)
            if match:
                y = float(match.group(1))
                x = float(match.group(2))
                text = match.group(3)
                elements.append({"x": x, "y": y, "text": text})
                
        tickets_matrices[page_num] = elements
        
    return tickets_matrices

def reconstruct_matrix_for_page(page_num, elements):
    # The matrix A is located in the region with y in [200, 380] in PDF points,
    # and x in [200, 360] approximately.
    # Let's filter elements that belong to matrix A:
    # A starts with the numerator scale "2" (actually 1/2, so the denominator 2 is at x=204.2 approximately)
    # The matrix columns are centered around x=235 to x=350.
    
    matrix_el = []
    for el in elements:
        y = el["y"]
        x = el["x"]
        t = el["text"]
        # Matrix A elements are typically in y-range [220, 380] and x-range [220, 380]
        if 210 <= y <= 380 and 220 <= x <= 380:
            matrix_el.append(el)
            
    # Group elements by y-coordinate (with some tolerance, e.g. 5 points)
    rows_grouped = []
    for el in matrix_el:
        placed = False
        for row in rows_grouped:
            # check if y is close
            if abs(row[0]["y"] - el["y"]) < 5:
                row.append(el)
                placed = True
                break
        if not placed:
            rows_grouped.append([el])
            
    # Sort rows by y-coordinate descending (top rows have higher y)
    rows_grouped.sort(key=lambda r: -r[0]["y"])
    
    # Sort elements within each row by x-coordinate ascending
    for r in rows_grouped:
        r.sort(key=lambda el: el["x"])
        
    print(f"Page {page_num} Row count in region: {len(rows_grouped)}")
    for idx, r in enumerate(rows_grouped):
        row_str = " | ".join(f"x={el['x']:.1f}: '{el['text']}'" for el in r)
        print(f"  Row {idx+1} (y={r[0]['y']:.1f}): {row_str}")

def main():
    tickets_matrices = parse_raw_parts()
    for p in range(1, 21):
        reconstruct_matrix_for_page(p, tickets_matrices.get(p, []))

if __name__ == "__main__":
    main()
