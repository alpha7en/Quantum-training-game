import json
import os

log_path = "/Users/alpha7en/.gemini/antigravity-cli/brain/88110c6a-259b-4bd3-8107-5a993318958e/.system_generated/logs/transcript.jsonl"

if os.path.exists(log_path):
    print("Found transcript log.")
    with open(log_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if "search_log.py" in line or "find_taskmanager_steps.py" in line:
                continue
            if "TaskManager.tsx" in line:
                try:
                    obj = json.loads(line)
                    step = obj.get("step_index")
                    source = obj.get("source")
                    step_type = obj.get("type")
                    tool_calls = obj.get("tool_calls", [])
                    call_names = [tc.get("name") for tc in tool_calls]
                    print(f"Line {idx} | Step {step} | Source: {source} | Type: {step_type} | Calls: {call_names}")
                except Exception as e:
                    pass
else:
    print("Log not found.")
