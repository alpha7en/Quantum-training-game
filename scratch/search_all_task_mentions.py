import json
import os

log_path = "/Users/alpha7en/.gemini/antigravity-cli/brain/88110c6a-259b-4bd3-8107-5a993318958e/.system_generated/logs/transcript.jsonl"
queries = ["qpe-2", "entanglement-swapping"]

if os.path.exists(log_path):
    with open(log_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if "search_log.py" in line or "search_all_task_mentions.py" in line:
                continue
            if any(q in line for q in queries):
                try:
                    obj = json.loads(line)
                    step = obj.get("step_index")
                    source = obj.get("source")
                    tool_calls = obj.get("tool_calls", [])
                    for tc_idx, tc in enumerate(tool_calls):
                        tc_str = json.dumps(tc)
                        if any(q in tc_str for q in queries):
                            print(f"=== Found in step {step}, call index {tc_idx}, name {tc.get('name')} ===")
                            args = tc.get("args", {})
                            for k, v in args.items():
                                if any(q in str(v) for q in queries):
                                    print(f"  Arg '{k}' length: {len(str(v))}")
                                    # Let's save it to a text file in scratch
                                    out_path = f"/Users/alpha7en/Documents/development/quantum_app/scratch/found_step_{step}_{k}.txt"
                                    with open(out_path, 'w', encoding='utf-8') as out_f:
                                        out_f.write(str(v))
                                    print(f"  Saved to {out_path}")
                except Exception as e:
                    pass
else:
    print("Log not found.")
