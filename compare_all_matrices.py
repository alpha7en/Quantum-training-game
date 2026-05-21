import itertools
import json

val_map = {1: '1', -1: '-1', 1j: 'i', -1j: '-i'}

def dot_product(v1, v2):
    return sum(x * y.conjugate() for x, y in zip(v1, v2))

def is_orthogonal(v1, v2):
    return abs(dot_product(v1, v2)) < 1e-5

def generate_unitary_hadamards():
    vals = [1, -1, 1j, -1j]
    all_rows = list(itertools.product(vals, repeat=4))
    
    # Adjacency list for orthogonality
    adj = {r: [] for r in all_rows}
    for i in range(len(all_rows)):
        for j in range(i + 1, len(all_rows)):
            if is_orthogonal(all_rows[i], all_rows[j]):
                adj[all_rows[i]].append(all_rows[j])
                adj[all_rows[j]].append(all_rows[i])
                
    # Generate all orthogonal matrices
    matrices = []
    for r1 in all_rows:
        for r2 in adj[r1]:
            common2 = set(adj[r1]).intersection(adj[r2])
            for r3 in common2:
                common3 = common2.intersection(adj[r3])
                for r4 in common3:
                    matrices.append((r1, r2, r3, r4))
    return matrices

# Let's write down the character patterns for each page based on the OCR output of cluster_matrix_elements.py
# If row data is missing (like Page 1, 2), we will check the raw text from parsed_tickets.json
# Let's inspect the raw text and match it.
ocr_patterns = {
    # Format: page_num: [row1_chars, row2_chars, row3_chars, row4_chars]
    # Each row_chars is a list of expected characters
    1: [['1', '1', '1', '1'], ['1', '1', '-1', '-1'], ['1', '-1', 'i', '-i'], ['1', '-1', '-i', 'i']],
    2: [['1', '1', '1', '1'], ['1', '1', '-1', '-1'], ['1', '-1', 'i', '-i'], ['1', '-1', '-i', 'i']], # Ticket 2 is similar
    3: [['1', '1', 'i', '-i'], ['1', '1', '1', '1'], ['-1', '1', 'i', '-i'], ['1', '1', '-1', '-1']], # derived from ocr
    4: [['-1', '1', '1', '1'], ['1', '1', 'i', '-i'], ['1', '1', '1', '1'], ['1', '1', 'i', '-i'], ['-1', '1', '1', '1']], # wait
}

# Actually, let's write a script that loads the parsed_tickets.json, cleans the OCR math,
# and outputs the candidate matrices.
# Wait! Let's print out some candidate unitary matrices for each page by matching the counts of 1, -1, i, -i
# in the parsed_tickets.json raw_text!
# Let's look at raw_text for Page 3:
# "1 1 1 1\n1 11\n1 1 1 12\n1 1\ni iA\ni i\n "
# Wait! The raw text of Page 3 has:
# Row 1: 1 1 1 1
# Row 2: 1 1 -1 -1
# Row 3: 1 -1 i -i
# Row 4: 1 -1 -i i
# Wait, this is exactly the same as Page 1 and Page 2!
# Let's check Page 4 raw text:
# "1 1 1 1\n1 11\n1 1 1 12\n1 1\ni iA\ni i\n "
# Wait! It's the same!
# Let's check Page 5:
# "1 1 1 1\n1 11\n1 1 1 12\n1 1\ni iA\ni i\n "
# Wait, let's check if the matrix A is EXACTLY the same for ALL 20 pages!
# Let's write a python script to check if the matrix A in parsed_tickets.json is the same for all pages!
# Wait! Let's look at the parsed_tickets.json:
# Page 1 matrix:
# `1 1 1 1\n1 11\n1 1 1 12\n1 1\ni iA\ni i\n `
# Page 2:
# `1 1 1 1\n1 1 11\n1 1 1 12\n1 1 1\niA\ni\n `
# Page 3:
# `1 1 1 1\n1 11\n1 1 1 12\n1 1\ni iA\ni i\n `
# Page 4:
# `1 1 1 1\n1 11\n1 1 1 12\n1 1\ni iA\ni i\n `
# Wait, they are almost identical!
# Let's write a python script `compare_all_matrices.py` to compare the OCR text of the matrices.
# But wait, let's look at the visual circuit images of all 20 pages.
# The circuit images are the same, but what about the matrix A?
# The matrix A is in Question 2, which is printed as text/vector math in the PDF.
# Let's write a python script to count how many characters of each type (1, -, i) are in the matrix A region for each page.
# That will tell us if they are the same or different!

def count_page_matrix_chars():
    with open("aligned_tickets_layout.txt", "r", encoding="utf-8") as f:
        text = f.read()
        
    pages = text.split("================ PAGE ")
    for p in pages:
        if not p.strip():
            continue
        lines = p.strip().split("\n")
        page_num = lines[0].split(" ")[0]
        
        # Collect characters in the matrix region (usually between "2. Проверить" and "3. Вектор")
        # Let's find lines between line containing "2. Проверить" and "3. Вектор"
        in_matrix = False
        matrix_lines = []
        for line in lines:
            if "2. Проверить" in line or "A " in line:
                in_matrix = True
            if "3. Вектор" in line:
                in_matrix = False
            if in_matrix:
                matrix_lines.append(line)
                
        print(f"Page {page_num} matrix lines:")
        for ml in matrix_lines:
            print(f"  {ml}")
        print("-" * 40)

if __name__ == "__main__":
    count_page_matrix_chars()
