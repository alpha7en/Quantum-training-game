import json
import os
import glob

scratch_dir = "/Users/alpha7en/Documents/development/quantum_app/scratch"
json_files = glob.glob(os.path.join(scratch_dir, "step_*.json"))

for jf in json_files:
    basename = os.path.basename(jf)
    name_no_ext = os.path.splitext(basename)[0]
    print(f"Inspecting {basename}...")
    with open(jf, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
            calls = data.get("tool_calls", [])
            for idx, c in enumerate(calls):
                args = c.get("args", {})
                for field in ["ReplacementContent", "CodeContent", "Content"]:
                    if field in args:
                        val = args[field]
                        out_name = f"{name_no_ext}_call_{idx}_{field}.txt"
                        out_path = os.path.join(scratch_dir, out_name)
                        with open(out_path, 'w', encoding='utf-8') as out_f:
                            out_f.write(val)
                        print(f"  Saved {field} ({len(val)} chars) to {out_name}")
        except Exception as e:
            print("Error loading:", jf, e)
