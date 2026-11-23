package httpapi

import (
 "archive/zip"
 "bytes"
 "encoding/json"
 "io"
 "net/http"
 "net/http/httptest"
 "path/filepath"
 "strings"
 "testing"

 "agentflow/internal/domain"
 "agentflow/internal/engine"
 "agentflow/internal/repo"
 "agentflow/internal/runtime"
 "agentflow/internal/tracker"
)

func testCapabilityZip(t *testing.T, entries map[string]string) []byte {
 t.Helper()
 var buf bytes.Buffer
 w := zip.NewWriter(&buf)
 for name, body := range entries {
  h := &zip.FileHeader{Name:name, Method:zip.Deflate}
  h.SetMode(0o644)
  if strings.HasSuffix(name, ".sh") { h.SetMode(0o755) }
  f, err := w.CreateHeader(h); if err != nil { t.Fatal(err) }
  if _, err = io.WriteString(f, body); err != nil { t.Fatal(err) }
 }
 if err := w.Close(); err != nil { t.Fatal(err) }
 return buf.Bytes()
}

func testCapabilityManifest() string {
 return `{"format":"loopforge-capability-pack","schemaVersion":1,"rules":[{"id":"rule-alpha","name":"Quy tắc thử nghiệm","description":"QA","content":"# Quy tắc\\nPhải kiểm thử.","priority":900}],"skills":[{"id":"skill-alpha","name":"Kỹ năng thử nghiệm","description":"QA"}]}`
}

func TestCapabilityPackRejectsMaliciousZIP(t *testing.T) {
 cases := []struct{name,path string}{
  {"traversal","skills/skill-alpha/../../escape.sh"},
  {"absolute","/etc/passwd"},
  {"backslash","skills\\skill-alpha\\SKILL.md"},
  {"drive","C:/secret"},
 }
 for _, tc := range cases {
  t.Run(tc.name,func(t *testing.T){
   z := testCapabilityZip(t,map[string]string{"manifest.json":testCapabilityManifest(),"skills/skill-alpha/SKILL.md":"---\nname: skill-alpha\n---\n# Hi\n",tc.path:"danger"})
   if _, _, _, err := parseCapabilityZIP(z); err == nil {t.Fatalf("accepted unsafe path %s",tc.path)}
  })
 }
}

func TestCapabilityPackParsingAndFiles(t *testing.T) {
 z := testCapabilityZip(t,map[string]string{"manifest.json":testCapabilityManifest(),"skills/skill-alpha/SKILL.md":"---\nname: skill-alpha\n---\n# Test\n","skills/skill-alpha/references/readme.md":"Tài liệu", "skills/skill-alpha/scripts/do.sh":"#!/bin/sh\necho safe\n"})
 pack, files, warnings, err := parseCapabilityZIP(z)
 if err != nil {t.Fatal(err)}
 if len(pack.Rules)!=1 || len(pack.Skills)!=1 || len(files["skill-alpha"])!=3 {t.Fatalf("unexpected pack: %+v %+v",pack,files)}
 if len(warnings)==0 {t.Fatal("executable script must be flagged")}
 found := false
 for _, f := range files["skill-alpha"] {if f.Path=="scripts/do.sh" {found=true; if f.Mode&0o111==0 {t.Fatal("executable mode lost")}}}
 if !found {t.Fatal("missing script")}
}

func TestCapabilityPackImportPreflightAndRoundTrip(t *testing.T) {
 t.Setenv("AGENTFLOW_AUTH_REQUIRED","false")
 s,err:=repo.OpenTest();if err!=nil {t.Fatal(err)}
 t.Cleanup(func(){s.Close()})
 if err:=s.PutProject(domain.Project{ID:"pack-project",Key:"PACK",Name:"Pack"});err!=nil {t.Fatal(err)}
 router:=New(s,engine.New(s,runtime.NewManager(filepath.Join(t.TempDir(),"workspaces"))),tracker.NewService(),"","")
 z:=testCapabilityZip(t,map[string]string{"manifest.json":testCapabilityManifest(),"skills/skill-alpha/SKILL.md":"---\nname: skill-alpha\n---\n# Test\n","skills/skill-alpha/references/readme.md":"Tài liệu"})
 request:=func(method,url string,body []byte)*httptest.ResponseRecorder {
  req:=httptest.NewRequest(method,url,bytes.NewReader(body));if body!=nil {req.Header.Set("Content-Type","application/zip")}
  rec:=httptest.NewRecorder();router.ServeHTTP(rec,req);return rec
 }
 pre:=request("POST","/api/capability-packs/preflight?projectId=pack-project",z)
 if pre.Code!=http.StatusOK {t.Fatalf("preflight %d %s",pre.Code,pre.Body.String())}
 if _,ok:=s.Rule("rule-alpha");ok {t.Fatal("preflight mutated rules")}
 if _,ok:=s.Skill("skill-alpha");ok {t.Fatal("preflight mutated skills")}
 imp:=request("POST","/api/capability-packs/import?projectId=pack-project&confirm=1",z)
 if imp.Code!=http.StatusOK {t.Fatalf("import %d %s",imp.Code,imp.Body.String())}
 rule,ok:=s.Rule("rule-alpha");if !ok||rule.Shared||rule.Global||rule.ProjectID!="pack-project" {t.Fatalf("bad rule: %+v",rule)}
 skill,ok:=s.Skill("skill-alpha");if !ok||skill.Shared||skill.ProjectID!="pack-project" {t.Fatalf("bad skill: %+v",skill)}
 content,ok:=s.SkillFileContent("skill-alpha","references/readme.md");if !ok||string(content)!="Tài liệu" {t.Fatalf("file lost: %s",content)}
 duplicate:=request("POST","/api/capability-packs/import?projectId=pack-project&confirm=1",z)
 if duplicate.Code!=http.StatusOK||!strings.Contains(duplicate.Body.String(),"skipped") {t.Fatalf("duplicate handling %d %s",duplicate.Code,duplicate.Body.String())}
 exp:=request("GET","/api/capability-packs/export?projectId=pack-project&kind=all",nil)
 if exp.Code!=http.StatusOK {t.Fatalf("export %d %s",exp.Code,exp.Body.String())}
 exported, exportedFiles, _, err:=parseCapabilityZIP(exp.Body.Bytes())
 if err!=nil {t.Fatal(err)}
 if len(exported.Rules)!=1||len(exported.Skills)!=1||len(exportedFiles["skill-alpha"])!=2 {t.Fatalf("round trip lost resources: %+v %+v",exported,exportedFiles)}
 var outcome map[string]any
 if err:=json.Unmarshal(imp.Body.Bytes(),&outcome);err!=nil {t.Fatal(err)}
 if outcome["created"]==nil {t.Fatalf("missing creation report %+v",outcome)}
}
