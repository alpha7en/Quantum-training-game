import json
import os

log_path = "/Users/alpha7en/.gemini/antigravity-cli/brain/88110c6a-259b-4bd3-8107-5a993318958e/.system_generated/logs/transcript.jsonl"
output_dir = "/Users/alpha7en/Documents/development/quantum_app/scratch"

if os.path.exists(log_path):
    with open(log_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if "search_log.py" in line:
                continue
            try:
                obj = json.loads(line)
                step = obj.get("step_index")
                # Look for steps related to task restoration: 2673, 2674, 2321, 2633
                if step in [2633, 2673, 2674, 2321, 2826, 2846, 2850]:
                    print(f"Step {step} found at line {idx}")
                    out_path = os.path.join(output_dir, f"step_{step}.json")
                    with open(out_path, 'w', encoding='utf-8') as out_f:
                        json.dump(obj, out_f, indent=2, ensure_ascii=False)
                    print(f"Saved step {step} to {out_path}")
            except Exception as e:
                pass
else:
    print("Log not found.")
