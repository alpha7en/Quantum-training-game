import pypdf

def extract_spatial(page):
    parts = []
    def visitor(text, cm, tm, fontDict, fontSize):
        if text.strip():
            parts.append((tm[4], tm[5], text))
    page.extract_text(visitor_text=visitor)
    parts.sort(key=lambda p: (-round(p[1], 1), p[0]))
    
    lines = []
    current_y = None
    line = []
    for x, y, text in parts:
        if current_y is None or abs(y - current_y) > 5:
            if line:
                lines.append(" ".join(line))
            line = [text]
            current_y = y
        else:
            line.append(text)
    if line:
        lines.append(" ".join(line))
    return "\n".join(lines)

def main():
    reader = pypdf.PdfReader("Билеты_2026.pdf")
    with open("aligned_tickets_layout.txt", "w", encoding="utf-8") as f:
        for idx, page in enumerate(reader.pages):
            f.write(f"\n================ PAGE {idx+1} ================\n")
            f.write(extract_spatial(page))
            f.write("\n")
    print("Done! Saved to aligned_tickets_layout.txt")

if __name__ == "__main__":
    main()
