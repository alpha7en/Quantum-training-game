import json
import os

log_path = "/Users/alpha7en/.gemini/antigravity-cli/brain/88110c6a-259b-4bd3-8107-5a993318958e/.system_generated/logs/transcript.jsonl"
output_path = "/Users/alpha7en/Documents/development/quantum_app/scratch/step_2737.json"

if os.path.exists(log_path):
    with open(log_path, 'r', encoding='utf-8') as f:
        for line in f:
            if "search_log.py" in line or "extract_step_2737.py" in line:
                continue
            try:
                obj = json.loads(line)
                if obj.get("step_index") == 2737:
                    with open(output_path, 'w', encoding='utf-8') as out_f:
                        json.dump(obj, out_f, indent=2, ensure_ascii=False)
                    print("Saved step 2737 successfully!")
                    # Dump replacement content if present
                    calls = obj.get("tool_calls", [])
                    for idx, c in enumerate(calls):
                        args = c.get("args", {})
                        if "ReplacementContent" in args:
                            rc_path = "/Users/alpha7en/Documents/development/quantum_app/scratch/step_2737_rc.txt"
                            with open(rc_path, 'w', encoding='utf-8') as rc_f:
                                rc_f.write(args["ReplacementContent"])
                            print("Saved step 2737 ReplacementContent to", rc_path)
            except Exception as e:
                pass
else:
    print("Log not found.")
