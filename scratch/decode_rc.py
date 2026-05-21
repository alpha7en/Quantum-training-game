import re

def main():
    p_in = '/Users/alpha7en/Documents/development/quantum_app/scratch/step_2673_rc.txt'
    with open(p_in, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    if content.startswith('"') and content.endswith('"'):
        content = content[1:-1]
    elif content.startswith("'") and content.endswith("'"):
        content = content[1:-1]
    
    # Manual unescaping to avoid mojibake
    decoded = content.replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\')
    
    p_out = '/Users/alpha7en/Documents/development/quantum_app/scratch/step_2673_rc_decoded.ts'
    with open(p_out, 'w', encoding='utf-8') as f:
        f.write(decoded)
    
    print('Decoded file written! Size:', len(decoded))
    print('First 1000 characters:')
    print(decoded[:1000])

if __name__ == '__main__':
    main()
