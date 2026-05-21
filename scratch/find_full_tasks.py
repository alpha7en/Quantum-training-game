import json
import os

log_path = "/Users/alpha7en/.gemini/antigravity-cli/brain/88110c6a-259b-4bd3-8107-5a993318958e/.system_generated/logs/transcript.jsonl"
keywords = ["grover-diffuser-2", "qft-3", "phase-flip-code", "qpe-2", "entanglement-swapping"]

if os.path.exists(log_path):
    with open(log_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if "search_log.py" in line or "find_full_tasks.py" in line:
                continue
            # We want to find steps where the text is large and contains multiple of these keywords
            match_count = sum(1 for kw in keywords if kw in line)
            if match_count >= 3:
                try:
                    obj = json.loads(line)
                    step = obj.get("step_index")
                    print(f"Match count {match_count} at line {idx}, step {step}")
                    
                    # Inspect content or tool calls
                    content = str(obj.get("content", ""))
                    tool_calls = obj.get("tool_calls", [])
                    
                    for tc_idx, tc in enumerate(tool_calls):
                        args = tc.get("args", {})
                        for arg_name, arg_val in args.items():
                            arg_str = str(arg_val)
                            missing_kws = [kw for kw in keywords if kw in arg_str]
                            if len(missing_kws) >= 3:
                                print(f"  Found {len(missing_kws)} keywords in tool call {tc.get('name')}, arg {arg_name}")
                                # Save it
                                out_p = f"/Users/alpha7en/Documents/development/quantum_app/scratch/recovered_tasks_step_{step}_{arg_name}.txt"
                                with open(out_p, 'w', encoding='utf-8') as out_f:
                                    out_f.write(arg_str)
                                print(f"  Saved to {out_p}")
                except Exception as e:
                    print("Error parsing:", e)
else:
    print("Log not found.")
