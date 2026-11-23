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
	for _, script := range []string{"role_pack_test.js", "role_pack_dom_test.js"} {
		if out, err := exec.Command(node, script, "app/role-pack.js").CombinedOutput(); err != nil {
			t.Fatalf("%s: %v\n%s", script, err, out)
		}
	}
}
