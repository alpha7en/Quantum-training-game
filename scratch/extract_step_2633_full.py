import json
import os

log_path = "/Users/alpha7en/.gemini/antigravity-cli/brain/88110c6a-259b-4bd3-8107-5a993318958e/.system_generated/logs/transcript.jsonl"
output_path = "/Users/alpha7en/Documents/development/quantum_app/scratch/step_2633_full_rc.txt"

if os.path.exists(log_path):
    print("Log exists.")
    with open(log_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if "search_log.py" in line or "extract_step_2633_full.py" in line:
                continue
            if '"step_index":2633' in line:
                try:
                    obj = json.loads(line)
                    calls = obj.get("tool_calls", [])
                    for tc in calls:
                        args = tc.get("args", {})
                        if "ReplacementContent" in args:
                            rc = args["ReplacementContent"]
                            with open(output_path, 'w', encoding='utf-8') as out_f:
                                out_f.write(rc)
                            print(f"Extracted full ReplacementContent ({len(rc)} chars) to {output_path}")
                            break
                except Exception as e:
                    print("Error parsing:", e)
else:
    print("Log not found.")
