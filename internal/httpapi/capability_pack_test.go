package httpapi

import (
 "archive/zip"
 "bytes"
 "encoding/json"
 "io"
 "net/http"
 "net/http/httptest"
 "os"
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
 return `{"format":"loopforge-capability-pack","schemaVersion":1,"rules":[{"id":"rule-alpha","name":"Quy tắc thử nghiệm","description":"QA","content":"# Quy tắc\\nPhải kiểm thử.","priority":900}],"skills":[{"id":"skill-alpha","name":"Kỹ năng thử nghiệm","description":"QA","author":"Original author","version":"1.0.0","license":"MIT","sourceUrl":"https://example.org/skill-alpha"}]}`
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
 // A write without consent cannot mutate the catalogue.
 notConfirmed:=request("POST","/api/capability-packs/import?projectId=pack-project",z)
 if notConfirmed.Code!=http.StatusBadRequest {t.Fatalf("import without consent status %d",notConfirmed.Code)}
 pre:=request("POST","/api/capability-packs/preflight?projectId=pack-project",z)
 if pre.Code!=http.StatusOK {t.Fatalf("preflight %d %s",pre.Code,pre.Body.String())}
 if _,ok:=s.Rule("rule-alpha");ok {t.Fatal("preflight mutated rules")}
 if _,ok:=s.Skill("skill-alpha");ok {t.Fatal("preflight mutated skills")}
 imp:=request("POST","/api/capability-packs/import?projectId=pack-project&confirm=1",z)
 if imp.Code!=http.StatusOK {t.Fatalf("import %d %s",imp.Code,imp.Body.String())}
 rule,ok:=s.Rule("rule-alpha");if !ok||rule.Shared||rule.Global||rule.ProjectID!="pack-project" {t.Fatalf("bad rule: %+v",rule)}
 skill,ok:=s.Skill("skill-alpha");if !ok||skill.Shared||skill.ProjectID!="pack-project" {t.Fatalf("bad skill: %+v",skill)}
 if skill.Attribution==nil||skill.Attribution.Author!="Original author"||skill.Attribution.License!="MIT"||skill.Attribution.Version!="1.0.0" {t.Fatalf("attribution lost: %+v",skill.Attribution)}
 content,ok:=s.SkillFileContent("skill-alpha","references/readme.md");if !ok||string(content)!="Tài liệu" {t.Fatalf("file lost: %s",content)}
 duplicate:=request("POST","/api/capability-packs/import?projectId=pack-project&confirm=1",z)
 if duplicate.Code!=http.StatusOK||!strings.Contains(duplicate.Body.String(),"skipped") {t.Fatalf("duplicate handling %d %s",duplicate.Code,duplicate.Body.String())}
 exp:=request("GET","/api/capability-packs/export?projectId=pack-project&kind=all",nil)
 if exp.Code!=http.StatusOK {t.Fatalf("export %d %s",exp.Code,exp.Body.String())}
 exported, exportedFiles, _, err:=parseCapabilityZIP(exp.Body.Bytes())
 if err!=nil {t.Fatal(err)}
 if len(exported.Rules)!=1||len(exported.Skills)!=1||len(exportedFiles["skill-alpha"])!=2 {t.Fatalf("round trip lost resources: %+v %+v",exported,exportedFiles)}
 if exported.Skills[0].Author!="Original author"||exported.Skills[0].License!="MIT"||exported.Skills[0].SourceURL!="https://example.org/skill-alpha" {t.Fatalf("export lost attribution: %+v",exported.Skills[0])}
 var outcome map[string]any
 if err:=json.Unmarshal(imp.Body.Bytes(),&outcome);err!=nil {t.Fatal(err)}
 if outcome["created"]==nil {t.Fatalf("missing creation report %+v",outcome)}
}

func TestCapabilityPackSymlinkUnknownAndDuplicateNames(t *testing.T) {
 symlink := func() []byte {
  var buf bytes.Buffer
  w:=zip.NewWriter(&buf)
  h:=&zip.FileHeader{Name:"skills/skill-alpha/link",Method:zip.Deflate}
  h.SetMode(os.ModeSymlink|0o777)
  f,err:=w.CreateHeader(h);if err!=nil {t.Fatal(err)}
  if _,err=io.WriteString(f,"/etc/shadow");err!=nil {t.Fatal(err)}
  if err:=w.Close();err!=nil {t.Fatal(err)}
  return buf.Bytes()
 }
 z:=symlink()
 if _,_,_,err:=parseCapabilityZIP(z);err==nil {t.Fatal("accepted symlink")}
 for _,test:=range []struct{name string;files map[string]string}{
  {"unknown",map[string]string{"manifest.json":testCapabilityManifest(),"skills/skill-alpha/SKILL.md":"# Skill","unknown.sh":"echo bad"}},
  {"duplicate case",map[string]string{"manifest.json":testCapabilityManifest(),"skills/skill-alpha/SKILL.md":"# Skill","skills/skill-alpha/skill.md":"DUP","skills/skill-alpha/SKILL.MD":"# duplicate"}},
  {"bad schema",map[string]string{"manifest.json":`{"format":"loopforge-capability-pack","schemaVersion":2,"rules":[{"id":"x","name":"x","content":"x"}]}`}},
  {"undeclared skill",map[string]string{"manifest.json":testCapabilityManifest(),"skills/skill-alpha/SKILL.md":"# Skill","skills/other/SKILL.md":"# Other"}},
 }{
  t.Run(test.name,func(t *testing.T){
   if _,_,_,err:=parseCapabilityZIP(testCapabilityZip(t,test.files));err==nil {t.Fatalf("accepted invalid ZIP: %s",test.name)}
  })
 }
}

func TestCapabilityManifestBlocksDuplicateIDsAndUnsupportedFields(t *testing.T) {
 for _,raw:=range []string{
  `{"format":"loopforge-capability-pack","schemaVersion":1,"rules":[{"id":"x","name":"A","content":"A"},{"id":"X","name":"B","content":"B"}]}`,
  `{"format":"loopforge-capability-pack","schemaVersion":1,"rules":[{"id":"x","name":"A","content":"A","shared":true}]}`,
  `{"format":"loopforge-capability-pack","schemaVersion":1,"skills":[{"id":"x","name":"Skill"},{"id":"X","name":"Skill 2"}]}`,
 }{
  if _,err:=strictCapabilityManifest([]byte(raw));err==nil {t.Fatalf("accepted invalid manifest: %s",raw)}
 }
}
