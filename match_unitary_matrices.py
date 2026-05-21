import itertools

# Values mapping
val_map = {1: '1', -1: '-1', 1j: 'i', -1j: '-i'}

def dot_product(v1, v2):
    return sum(x * y.conjugate() for x, y in zip(v1, v2))

def is_orthogonal(v1, v2):
    return abs(dot_product(v1, v2)) < 1e-5

def generate_unitary_hadamards():
    # We will generate all 4x4 unitary matrices where entries are in {1, -1, i, -i} (scaled by 1/2).
    # To be general, let's generate row-by-row.
    # A row has entries in {1, -1, i, -i}
    vals = [1, -1, 1j, -1j]
    all_rows = list(itertools.product(vals, repeat=4))
    
    # We want to find sets of 4 mutually orthogonal rows
    # To speed up, we can build a graph of orthogonality and find 4-cliques.
    adj = {r: [] for r in all_rows}
    for i in range(len(all_rows)):
        for j in range(i + 1, len(all_rows)):
            if is_orthogonal(all_rows[i], all_rows[j]):
                adj[all_rows[i]].append(all_rows[j])
                adj[all_rows[j]].append(all_rows[i])
                
    # Now find cliques of size 4
    # Since we want to find ordered matrices (where row 1, 2, 3, 4 are in a specific order),
    # we can do this.
    matrices = []
    # Let's restrict row 1 to have all positive real/imaginary values or similar?
    # No, let's keep it general: any 4 mutually orthogonal rows form a unitary matrix.
    # To find them efficiently:
    for r1 in all_rows:
        for r2 in adj[r1]:
            # r3 must be in adj[r1] and adj[r2]
            common2 = set(adj[r1]).intersection(adj[r2])
            for r3 in common2:
                # r4 must be in adj[r1], adj[r2], and adj[r3]
                common3 = common2.intersection(adj[r3])
                for r4 in common3:
                    matrices.append((r1, r2, r3, r4))
                    
    print(f"Generated {len(matrices)} ordered unitary matrices")
    return matrices

# Let's define the OCR patterns we saw for each page.
# Each row contains elements. We want to find the matrix that matches the signs and positions.
# Let's write down a matcher.
def get_match_score(matrix, page_data):
    # page_data is a list of rows, each row is a list of elements
    # We want to see if the matrix matches the row structure.
    # matrix is a tuple of 4 rows: (r1, r2, r3, r4)
    # We check row by row.
    score = 0
    for r_idx in range(4):
        mat_row = matrix[r_idx]
        ocr_row = page_data[r_idx]
        
        # We check if the values in mat_row match the ocr_row.
        # ocr_row is a list of strings, e.g. ["1", "1", "i", "i"] or similar.
        # Let's count characters.
        mat_row_str = "".join(val_map[x] for x in mat_row)
        
        # Let's do a simple count check:
        # how many 1, -1, i, -i are there?
        mat_counts = {
            "1": sum(1 for x in mat_row if x == 1),
            "-1": sum(1 for x in mat_row if x == -1),
            "i": sum(1 for x in mat_row if x == 1j),
            "-i": sum(1 for x in mat_row if x == -1j)
        }
        
        # Let's parse the ocr_row strings to count characters.
        ocr_text = " ".join(ocr_row)
        ocr_counts = {
            "1": len(re.findall(r'(?<!\-)\b1\b', ocr_text)),
            "-1": len(re.findall(r'\-1', ocr_text)) + len(re.findall(r'\s*1', ocr_text)),
            "i": len(re.findall(r'(?<!\-)\bi\b', ocr_text)),
            "-i": len(re.findall(r'\-i', ocr_text)) + len(re.findall(r'\s*i', ocr_text))
        }
        
        # Add to score
        for k in mat_counts:
            score += min(mat_counts[k], ocr_counts[k])
            
    return score

def main():
    matrices = generate_unitary_hadamards()
    
    # We will write a file with candidate matches for each page.
    # Let's define the page structures:
    # Page 3:
    # Row 1: 1 1 i i (could have some minuses)
    # Row 2: 1 1 1 1
    # Row 3: -1 1 i i (minus at start)
    # Row 4: 1 1 1 1 - (minus at end)
    
    # Let's check for each page which matrix is the BEST match.
    # If there are multiple, we can check if they are related or print them.
    # Actually, let's write a script that helps us print candidate matrices.
    # Let's search for a matrix for Page 3:
    # Row 1: 1, 1, i, i (with some signs)
    # Row 2: 1, 1, 1, 1 (with some signs)
    # Row 3: -1, 1, i, i (with some signs)
    # Row 4: 1, 1, 1, -1 (with some signs)
    
    print("\nPage 3 Candidates:")
    count = 0
    for m in matrices:
        # Check Row 2: is it [1, 1, 1, 1] (or with some signs)?
        # Let's say Row 2 is exactly [1, 1, 1, 1] or a permutation.
        # Let's look at the OCR:
        # Row 1: has two 1s, two i's.
        # Row 2: has four 1s (all positive).
        # Row 3: has -1, 1, i, -i or similar (x=231 has , which is minus, x=243 has 1 1, x=280 has i i).
        # Row 4: has 1 1 1 1, and x=273 has . So one element is -1.
        
        r1, r2, r3, r4 = m
        # Check if r2 == (1, 1, 1, 1) or similar
        if r2 == (1, 1, 1, 1):
            # Check if r1 has two 1s and two i's (with signs)
            # Check if r4 has three 1s and one -1
            if sum(1 for x in r4 if x == -1) == 1:
                # Let's print this candidate!
                print(f"Matrix:")
                for r in m:
                    print(f"  {list(r)}")
                count += 1
                if count >= 5:
                    break

if __name__ == "__main__":
    main()
