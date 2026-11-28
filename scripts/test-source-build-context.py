"""Regression coverage: source builds must not traverse private runtime directories."""
import io
from pathlib import Path
import os
import subprocess
import tarfile
import tempfile
import unittest
import shutil

ROOT = Path(__file__).resolve().parents[1]

class SourceBuildContextTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "scripts").mkdir()
        for filename in ("build-source-context.sh", "filter-build-context.py"):
            path = ROOT / "scripts" / filename
            if path.exists():  # The RED phase deliberately has no implementation yet.
                shutil.copy2(path, self.root / "scripts" / filename)
        subprocess.run(["git", "init", "-q"], cwd=self.root, check=True)
        (self.root / ".gitignore").write_text(".data/\n.env\n")
        (self.root / "Dockerfile").write_text("FROM scratch\n")
        (self.root / "tracked.txt").write_text("before\n")
        runtime = self.root / ".data" / "conversations"
        runtime.mkdir(parents=True)
        (runtime / "private.txt").write_text("runtime-secret-do-not-package")
        (self.root / ".env").write_text("SAMPLE_PRIVATE_VALUE=do-not-package\n")
        subprocess.run(
            ["git", "add", "-f", "Dockerfile", "tracked.txt", ".data/conversations/private.txt", ".env"],
            cwd=self.root, check=True,
        )

    def build_context(self):
        return subprocess.run(
            ["bash", "scripts/build-source-context.sh"], cwd=self.root,
            capture_output=True, timeout=15,
        )

    def test_uses_working_tree_without_private_data_even_if_git_tracked_it(self):
        (self.root / "tracked.txt").write_text("after-local-edit\n")
        (self.root / "new-module.go").write_text("package main\n")
        runtime = self.root / ".data" / "conversations"
        runtime.chmod(0)
        try:
            result = self.build_context()
        finally:
            runtime.chmod(0o700)
        self.assertEqual(result.returncode, 0, result.stderr.decode(errors="replace"))
        with tarfile.open(fileobj=io.BytesIO(result.stdout), mode="r:") as tar:
            files = {item.name: tar.extractfile(item).read() for item in tar if item.isfile()}
        self.assertIn("tracked.txt", files)
        self.assertEqual(files["tracked.txt"], b"after-local-edit\n")
        self.assertIn("new-module.go", files)
        self.assertNotIn(".env", files)
        self.assertFalse(any(name.startswith(".data/") for name in files), files)
        self.assertFalse(any(name.startswith(".git/") for name in files), files)

    def test_without_git_checkout_fails_before_building(self):
        shutil.rmtree(self.root / ".git")
        result = self.build_context()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Git checkout", result.stderr.decode(errors="replace"))

if __name__ == "__main__":
    unittest.main()
