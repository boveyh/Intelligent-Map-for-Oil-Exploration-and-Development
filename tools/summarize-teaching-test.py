"""Summarize observer-scored, anonymous human sessions; never invent missing rows."""
import csv
import json
import statistics
import sys
from pathlib import Path

source = Path(sys.argv[1] if len(sys.argv) > 1 else "docs/teaching-test/participants.csv")
with source.open(encoding="utf-8-sig", newline="") as stream:
    rows = list(csv.DictReader(stream))
seen = set()
for row in rows:
    pid = row["participant_id"].strip()
    assert pid and pid not in seen, "Anonymous participant IDs must be unique"
    seen.add(pid)
    assert row["source"] == "human" and row["petroleum_background"] == "no", "Only actual non-petroleum human participants qualify"
    assert row["date"] and row["commit"] and row["selected_point"] and row["evidence_path"], "Missing session or point evidence"
    for question in (1, 2, 3):
        assert row[f"q{question}_answer"].strip(), "Missing verbatim answer"
        assert row[f"q{question}_score"] in ("0", "1"), "Observer must assign 0/1 based on the rubric"
    for field in ("home_seconds", "w4_seconds", "guide_seconds"):
        assert float(row[field]) > 0, "Use actual measured time"
summary = {"source": str(source), "participants": len(rows), "status": "待采集" if not rows else "不足五人" if len(rows) < 5 else "已采集；还需审阅原话、计分与真实迭代"}
if rows:
    summary.update({
        "per_question_pass_rate": {f"q{q}": sum(int(r[f"q{q}_score"]) for r in rows)/len(rows) for q in (1, 2, 3)},
        "all_three_pass_rate": sum(all(r[f"q{q}_score"] == "1" for q in (1, 2, 3)) for r in rows)/len(rows),
        "median_seconds": {field: statistics.median(float(r[field]) for r in rows) for field in ("home_seconds", "w4_seconds", "guide_seconds")},
        "reported_misunderstandings": [r["misunderstanding"] for r in rows if r["misunderstanding"]],
        "reported_blockers": [r["blocker"] for r in rows if r["blocker"]],
        "sessions_linking_an_iteration": sum(bool(r["change_id"].strip()) for r in rows),
        "limit": "Small convenience sample; observer-scored immediate understanding, not causal or long-term learning evidence. Human provenance still requires external verification.",
    })
print(json.dumps(summary, ensure_ascii=False, indent=2))
