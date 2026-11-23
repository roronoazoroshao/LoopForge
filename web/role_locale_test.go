package web

import (
    "os/exec"
    "testing"
)

func TestRoleEditorVietnameseLabels(t *testing.T) {
    node, err := exec.LookPath("node")
    if err != nil { t.Skip("node not installed") }
    cmd := exec.Command(node, "role_locale_test.js", "i18n-en.js", "i18n-vi.js", "app/flows.js")
    if out, err := cmd.CombinedOutput(); err != nil {
        t.Fatalf("role editor localization: %v\n%s",err,out)
    }
}
