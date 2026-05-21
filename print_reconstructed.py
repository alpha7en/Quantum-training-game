import json

def clean_val(x):
    if x == "1": return 1
    if x == "-1": return -1
    if x == "i": return 1j
    if x == "-i": return -1j
    return 0

def is_unitary(m):
    # Convert matrix elements to complex
    arr = [[clean_val(x) for x in row] for row in m]
    
    # Check if rows are normalized: inner product of row with itself should be 4
    # (since we scale by 1/2, 1/4 * 4 = 1)
    for i in range(4):
        norm_sq = sum(abs(x)**2 for x in arr[i])
        if abs(norm_sq - 4) > 1e-5:
            return False
            
    # Check if rows are mutually orthogonal
    for i in range(4):
        for j in range(i + 1, 4):
            dot = sum(arr[i][k] * arr[j][k].conjugate() for k in range(4))
            if abs(dot) > 1e-5:
                return False
                
    return True

def main():
    try:
        with open("reconstructed_matrices.json", "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        print("reconstructed_matrices.json not found!")
        return

    all_unitary = True
    for p in sorted(list(map(int, data.keys()))):
        m = data[str(p)]
        unitary = is_unitary(m)
        print(f"Page {p}: Unitary = {unitary}")
        if not unitary:
            all_unitary = False
            
    print(f"\nAll matrices unitary? {all_unitary}")
    
    # Print the matrix for Page 3
    print("\nPage 3 matrix A (scaled by 1/2):")
    for r in data["3"]:
        print(f"  {r}")

if __name__ == "__main__":
    main()
