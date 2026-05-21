import itertools
import re
import json

val_map = {1: '1', -1: '-1', 1j: 'i', -1j: '-i'}

def dot_product(v1, v2):
    return sum(x * y.conjugate() for x, y in zip(v1, v2))

def is_orthogonal(v1, v2):
    return abs(dot_product(v1, v2)) < 1e-5

def generate_unitary_hadamards():
    vals = [1, -1, 1j, -1j]
    all_rows = list(itertools.product(vals, repeat=4))
    
    # Pre-calculate orthogonality
    adj = {r: [] for r in all_rows}
    for i in range(len(all_rows)):
        for j in range(i + 1, len(all_rows)):
            if is_orthogonal(all_rows[i], all_rows[j]):
                adj[all_rows[i]].append(all_rows[j])
                adj[all_rows[j]].append(all_rows[i])
                
    # Find all 4x4 matrices
    matrices = []
    # To optimize, we can fix the first row or restrict. But actually there are only 393,216.
    # Let's write a quick generator
    for r1 in all_rows:
        for r2 in adj[r1]:
            common2 = set(adj[r1]).intersection(adj[r2])
            for r3 in common2:
                common3 = common2.intersection(adj[r3])
                for r4 in common3:
                    matrices.append((r1, r2, r3, r4))
    return matrices

def get_page_matrix_ocr_text(page_num):
    # Let's extract the text block between "2. Проверить" and "3. Вектор" on each page
    # from tickets_text.txt
    with open("tickets_text.txt", "r", encoding="utf-8") as f:
        text = f.read()
    
    pages = re.split(r"--- Page \d+ ---", text)
    pages = [p.strip() for p in pages if p.strip()]
    
    if page_num - 1 < len(pages):
        page_text = pages[page_num - 1]
        # Find matrix region
        # It's between "Проверить" and "3."
        match = re.search(r"Проверить.*?2\.(.*?)(?=3\.)", page_text, re.DOTALL)
        if match:
            return match.group(1).strip()
        # Fallback: search between "унитарность" and "3."
        match = re.search(r"унитарность(.*?)(?=3\.)", page_text, re.DOTALL)
        if match:
            return match.group(1).strip()
    return ""

def matrix_to_json_serializable(m):
    # Convert complex matrix to list of list of strings/dicts
    res = []
    for r in m:
        row = []
        for val in r:
            if val == 1: row.append("1")
            elif val == -1: row.append("-1")
            elif val == 1j: row.append("i")
            elif val == -1j: row.append("-i")
        res.append(row)
    return res

def count_ocr_signals(ocr_text):
    # Count:
    # - total 1s
    # - total i's
    # - total minus signs (both '-' and '')
    ones = len(re.findall(r'1', ocr_text))
    is_ = len(re.findall(r'i', ocr_text))
    # '' is a special minus sign, so we count both '-' and ''
    minuses = len(re.findall(r'[\-]', ocr_text))
    return {"ones": ones, "is": is_, "minuses": minuses}

def get_matrix_signals(m):
    # Count:
    # - total 1s and -1s in matrix
    # - total i's and -i's in matrix
    # - total -1s and -i's in matrix (negative elements)
    ones = sum(1 for r in m for val in r if abs(val.real) == 1)
    is_ = sum(1 for r in m for val in r if abs(val.imag) == 1)
    minuses = sum(1 for r in m for val in r if val == -1 or val == -1j)
    return {"ones": ones, "is": is_, "minuses": minuses}

def main():
    print("Generating unitary matrices...")
    matrices = generate_unitary_hadamards()
    print(f"Generated {len(matrices)} matrices.")
    
    results = {}
    
    # We will find the best match for each page
    for p in range(1, 21):
        ocr_text = get_page_matrix_ocr_text(p)
        ocr_signals = count_ocr_signals(ocr_text)
        ocr_text_clean = ocr_text.replace('\n', ' ')
        print(f"Page {p} OCR: {ocr_text_clean}")
        print(f"  Signals: {ocr_signals}")
        
        # Search for matrices that match the signals closest
        best_m = None
        best_score = -999999
        best_candidates = []
        
        for m in matrices:
            m_signals = get_matrix_signals(m)
            # Score matches:
            # We want m_signals["ones"] to match ocr_signals["ones"] (approx)
            # m_signals["is"] to match ocr_signals["is"] (approx)
            # m_signals["minuses"] to match ocr_signals["minuses"] (approx)
            
            # Let's count matching row-level patterns if possible, or just signal match
            score = - abs(m_signals["ones"] - ocr_signals["ones"]) \
                    - abs(m_signals["is"] - ocr_signals["is"]) \
                    - abs(m_signals["minuses"] - ocr_signals["minuses"])
                    
            # Let's add structural checks
            # Row 1 is usually [1, 1, 1, 1] or similar
            # Row 2 is [1, 1, -1, -1] or similar
            # Let's see: if Row 1 has no i's, and Row 2 has no i's:
            # Let's check how many rows are real-only.
            real_rows = sum(1 for r in m if all(x.imag == 0 for x in r))
            
            # For pages 1-12, the matrix has 2 real rows and 2 complex rows
            # For pages 13-20, the matrix might also have 2 real/2 complex rows.
            # Let's check the OCR:
            # e.g. Page 13 has 'i' in both row 1 and row 2 of OCR.
            # Let's find the candidate that maximizes score, and if there are ties,
            # we pick the one that is closest in row-wise elements.
            if score > best_score:
                best_score = score
                best_candidates = [m]
            elif score == best_score:
                best_candidates.append(m)
                
        # Now from best_candidates, let's filter further if needed, or just pick the first one
        # Let's print how many candidates have the same best score
        print(f"  Best score: {best_score}, candidates: {len(best_candidates)}")
        
        # Let's select one candidate
        # We can look at the OCR lines and do a detailed text alignment
        selected_m = best_candidates[0]
        results[p] = matrix_to_json_serializable(selected_m)
        
    # Save to JSON
    with open("reconstructed_matrices.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print("Done! Reconstructed matrices saved to reconstructed_matrices.json")

if __name__ == "__main__":
    main()
