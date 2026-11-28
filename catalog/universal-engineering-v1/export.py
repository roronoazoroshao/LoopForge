"""Export core capability ZIP and Role Pack only; no network or installation."""
import argparse
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parent

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("output", type=Path)
    args=p.parse_args()
    args.output.mkdir(parents=True, exist_ok=False)
    cap=ROOT/"capability"
    with ZipFile(args.output/"capability-pack.zip", "x", compression=ZIP_DEFLATED) as z:
        z.write(cap/"manifest.json","manifest.json")
        for f in sorted((cap/"skills").glob("*/SKILL.md")):
            if f.is_symlink() or f.parent.is_symlink():
                raise ValueError("symlink refused")
            z.write(f, f.relative_to(cap).as_posix())
    (args.output/"role-pack.json").write_bytes((ROOT/"role-pack.json").read_bytes())
    print("Draft packs exported; staging review required.")

if __name__=="__main__":
    main()
