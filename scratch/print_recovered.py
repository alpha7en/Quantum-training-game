import json
import os

steps = [2321, 2633, 2673, 2674, 2826, 2850]
scratch_dir = "/Users/alpha7en/Documents/development/quantum_app/scratch"

for s in steps:
    p = os.path.join(scratch_dir, f"step_{s}.json")
    if os.path.exists(p):
        print(f"================ STEP {s} ================")
        with open(p, 'r', encoding='utf-8') as f:
            data = json.load(f)
            # Find tool calls
            calls = data.get("tool_calls", [])
            for c in calls:
                args = c.get("args", {})
                print("Tool Name:", c.get("name"))
                if "ReplacementContent" in args:
                    print("Contains ReplacementContent. Length:", len(args["ReplacementContent"]))
                    # Let's search if any of the target keywords are in it
                    for kw in ["qpe-2", "entanglement-swapping", "phase-flip-code", "qft-3"]:
                        if kw in args["ReplacementContent"]:
                            print(f"--> Found '{kw}' in ReplacementContent")
                            # We can write the entire ReplacementContent to a txt file to inspect
                            rc_path = os.path.join(scratch_dir, f"step_{s}_rc.txt")
                            with open(rc_path, 'w', encoding='utf-8') as out_f:
                                out_f.write(args["ReplacementContent"])
                            print(f"Saved ReplacementContent to {rc_path}")
                if "CodeContent" in args:
                    print("Contains CodeContent. Length:", len(args["CodeContent"]))
                    for kw in ["qpe-2", "entanglement-swapping", "phase-flip-code", "qft-3"]:
                        if kw in args["CodeContent"]:
                            print(f"--> Found '{kw}' in CodeContent")
