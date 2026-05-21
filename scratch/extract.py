import re

p_in = '/Users/alpha7en/Documents/development/quantum_app/scratch/qpe_search_results.txt'
content = open(p_in, 'r', encoding='utf-8').read()

def find_task(task_id):
    matches = []
    # Find all matches for id: 'task_id' or id: "task_id" or similar
    # We use a pattern that matches the id field with single or double quotes, and allows escaped quotes since content is in log JSON.
    pattern = r'id:\\\s*[\\\'\\"]' + re.escape(task_id) + r'[\\\'\\"]'
    for m in re.finditer(pattern, content):
        start_idx = m.start()
        # Look back up to 600 characters to find the matching opening brace
        look_back = content[max(0, start_idx - 600):start_idx]
        brace_pos = look_back.rfind('{')
        if brace_pos != -1:
            task_start = max(0, start_idx - 600) + brace_pos
        else:
            task_start = start_idx
        
        # Take a candidate chunk of 5000 characters
        sub = content[task_start:task_start + 5000]
        
        # Balance braces to find the end of this task dictionary
        brace_count = 0
        end_pos = -1
        in_backtick = False
        i = 0
        while i < len(sub):
            char = sub[i]
            if char == '`':
                in_backtick = not in_backtick
            # If we see escaped backticks
            elif char == '\\' and i + 1 < len(sub) and sub[i+1] == '`':
                in_backtick = not in_backtick
                i += 1
            elif not in_backtick:
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end_pos = i
                        break
            i += 1
            
        if end_pos != -1:
            task_code = sub[:end_pos + 1]
        else:
            task_code = sub[:2000] + '\n...[TRUNCATED BALANCE]...'
        matches.append((task_start, task_code))
    return matches

out_path = '/Users/alpha7en/Documents/development/quantum_app/scratch/extracted_tasks.txt'
with open(out_path, 'w', encoding='utf-8') as out_f:
    for tid in ['qpe-2', 'entanglement-swapping', 'grover-diffuser-2', 'qft-3']:
        out_f.write(f'==================== {tid} ====================\n')
        m = find_task(tid)
        for idx, (pos, code) in enumerate(m):
            out_f.write(f'MATCH {idx} AT POS {pos}:\n{code}\n\n')

print(f'Done! Saved to {out_path}')
