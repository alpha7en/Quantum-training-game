import pypdf

def main():
    reader = pypdf.PdfReader("Билеты_2026.pdf")
    # Let's inspect page 1 text details
    page = reader.pages[0]
    
    # We can use extract_text(visitor_text=...) to get the coordinates of each character
    parts = []
    def visitor(text, cm, tm, fontDict, fontSize):
        if text.strip():
            parts.append((tm[4], tm[5], text))
            
    page.extract_text(visitor_text=visitor)
    
    # Sort parts by y (descending), then by x (ascending)
    # We will round coordinates to group characters on the same line
    parts.sort(key=lambda p: (-round(p[1], 1), p[0]))
    
    current_y = None
    line = []
    for x, y, text in parts:
        if current_y is None or abs(y - current_y) > 5:
            if line:
                print(" ".join(line))
            line = [text]
            current_y = y
        else:
            line.append(text)
    if line:
        print(" ".join(line))

if __name__ == "__main__":
    main()
