import json
import os

log_path = '/Users/alpha7en/.gemini/antigravity-cli/brain/88110c6a-259b-4bd3-8107-5a993318958e/.system_generated/logs/transcript.jsonl'
if os.path.exists(log_path):
    with open(log_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if 'phase-flip-code' in line and 'ReplacementContent' in line:
                try:
                    obj = json.loads(line)
                    step = obj.get('step_index')
                    for tc in obj.get('tool_calls', []):
                        args = tc.get('args', {})
                        rc = args.get('ReplacementContent')
                        if rc and 'phase-flip-code' in rc:
                            out_p = f'/Users/alpha7en/Documents/development/quantum_app/scratch/step_{step}_full.ts'
                            with open(out_p, 'w', encoding='utf-8') as out_f:
                                out_f.write(rc)
                            print(f'Saved step {step} ReplacementContent (length {len(rc)}) to {out_p}')
                except Exception as e:
                    print('Error parsing line:', idx, e)
else:
    print('Log file not found.')
