package web

import (
	"os/exec"
	"testing"
)

func TestRolePackImportExport(t *testing.T) {
	node, err := exec.LookPath("node")
	if err != nil {
		t.Skip("node not installed")
	}
	if out, err := exec.Command(node, "role_pack_test.js", "app/role-pack.js").CombinedOutput(); err != nil {
		t.Fatalf("role pack import/export: %v\n%s", err, out)
	}
}
