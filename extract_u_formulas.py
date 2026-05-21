import pypdf

def main():
    reader = pypdf.PdfReader("Билеты_2026.pdf")
    for idx, page in enumerate(reader.pages):
        text = page.extract_text()
        print(f"\n================ PAGE {idx+1} ================")
        # Find Q3 text
        q3_match = text.split("3.")
        if len(q3_match) > 1:
            q3_text = q3_match[1].split("июнь 2026 года")[0].strip()
            print(q3_text)
        else:
            print("Question 3 not found or split failed")

if __name__ == "__main__":
    main()
