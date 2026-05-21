import re
import json

def parse_tickets():
    with open("tickets_text.txt", "r", encoding="utf-8") as f:
        text = f.read()
    
    # Split text by Page headers
    pages = re.split(r"--- Page \d+ ---", text)
    pages = [p.strip() for p in pages if p.strip()]
    
    tickets = []
    
    for idx, page in enumerate(pages):
        ticket_num = idx + 1
        lines = page.split("\n")
        
        # Extracted data structure
        ticket_data = {
            "id": ticket_num,
            "title": f"Билет №{ticket_num}",
            "raw_text": page,
            "theory_question": "",
            "u_state_description": "",
            "matrix_a_description": ""
        }
        
        # Try to find the theory question (Question 1)
        # Typically starts with "1." and ends before "2."
        theory_match = re.search(r"1\.\s*(.*?)(?=2\.)", page, re.DOTALL)
        if theory_match:
            ticket_data["theory_question"] = theory_match.group(1).strip()
            
        # Try to find Question 2 (Matrix A unitarity)
        matrix_match = re.search(r"2\.\s*(.*?)(?=3\.)", page, re.DOTALL)
        if matrix_match:
            ticket_data["matrix_a_description"] = matrix_match.group(1).strip()
            
        # Try to find Question 3 (Quantum circuit with vector u)
        u_match = re.search(r"3\.\s*(.*)", page, re.DOTALL)
        if u_match:
            ticket_data["u_state_description"] = u_match.group(1).strip()
            
        tickets.append(ticket_data)
        
    # Let's write the parsed tickets to a JSON file
    with open("parsed_tickets.json", "w", encoding="utf-8") as f:
        json.dump(tickets, f, indent=2, ensure_ascii=False)
        
    print(f"Parsed {len(tickets)} tickets and saved to parsed_tickets.json")

if __name__ == "__main__":
    parse_tickets()
