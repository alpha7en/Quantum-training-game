import itertools

def dot_product(v1, v2):
    return sum(x * y.conjugate() for x, y in zip(v1, v2))

def is_orthogonal(v1, v2):
    return abs(dot_product(v1, v2)) < 1e-5

def generate_unitary_hadamards():
    r1 = (1, 1, 1, 1)
    
    # Generate all vectors in {1, -1, i, -i}^4 orthogonal to r1
    orthogonal_vectors = []
    vals = [1, -1, 1j, -1j]
    for p in itertools.product(vals, repeat=4):
        if is_orthogonal(r1, p):
            orthogonal_vectors.append(p)
            
    print(f"Found {len(orthogonal_vectors)} vectors orthogonal to [1, 1, 1, 1]")
    
    # Find all mutually orthogonal triples
    triples = []
    n = len(orthogonal_vectors)
    for i in range(n):
        v2 = orthogonal_vectors[i]
        for j in range(i + 1, n):
            v3 = orthogonal_vectors[j]
            if is_orthogonal(v2, v3):
                for k in range(j + 1, n):
                    v4 = orthogonal_vectors[k]
                    if is_orthogonal(v2, v4) and is_orthogonal(v3, v4):
                        triples.append((v2, v3, v4))
                        
    print(f"Found {len(triples)} mutually orthogonal triples")
    return triples

def main():
    triples = generate_unitary_hadamards()
    
    # Let's search for a matrix matching a specific description
    # Page 1:
    # Row 1: 1, 1, 1, 1
    # Row 2: 1, 1, -1, -1 (or similar)
    # Row 3: 1, -1, i, -i (or similar)
    # Row 4: 1, -1, -i, i (or similar)
    # Let's find if there is a triple that contains these rows
    
    print("\nMatching triples containing rows with i's:")
    count = 0
    for t in triples:
        matrix = [(1, 1, 1, 1), t[0], t[1], t[2]]
        
        # Let's count how many rows are real-only vs have i's
        real_rows = 0
        complex_rows = 0
        for r in matrix:
            if any(isinstance(x, complex) and x.imag != 0 for x in r):
                complex_rows += 1
            else:
                real_rows += 1
                
        # We are looking for matrices with 2 real rows and 2 complex rows
        if real_rows == 2 and complex_rows == 2:
            # Let's check if it contains a row like (1, 1, -1, -1) or similar
            has_real_alt = False
            for r in matrix[1:]:
                # check if row is a permutation of (1, 1, -1, -1)
                if sum(1 for x in r if x == 1) == 2 and sum(1 for x in r if x == -1) == 2:
                    has_real_alt = True
            
            if has_real_alt:
                print(f"\nCandidate {count+1}:")
                for r in matrix:
                    row_str = ", ".join(f"{x.real:g}" if x.imag == 0 else (f"{x.imag:g}i" if x.real == 0 else f"{x.real:g}+{x.imag:g}i") for x in r)
                    print(f"  [{row_str}]")
                count += 1
                if count >= 10:
                    break

if __name__ == "__main__":
    main()
