package httpapi

import (
 "archive/zip"
 "bytes"
 "encoding/json"
 "errors"
 "fmt"
 "io"
 "net/http"
 "path"
 "regexp"
 "sort"
 "strings"

 "agentflow/internal/domain"
 "agentflow/internal/repo"

 "github.com/gin-gonic/gin"
)

const (
 capabilityFormat = "loopforge-capability-pack"
 capabilityVersion = 1
 capabilityMaxZIP = 65 << 20
 capabilityMaxUnpacked = 128 << 20
 capabilityMaxEntries = 10000
 capabilityMaxManifest = 2 << 20
 capabilityMaxRules = 200
 capabilityMaxSkills = 100
)
var capabilityID = regexp.MustCompile("^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")

// Capability packs are portable snapshots, not executable installers.
// Project ownership, sharing and workflow-global bindings are NEVER imported.
type capabilityRule struct {
 ID string `json:"id"`
 Name string `json:"name"`
 Description string `json:"description,omitempty"`
 Content string `json:"content"`
 Priority int `json:"priority"`
}
type capabilitySkill struct {
 ID string `json:"id"`
 Name string `json:"name"`
 Description string `json:"description,omitempty"`
 Author string `json:"author,omitempty"`
 Version string `json:"version,omitempty"`
 License string `json:"license,omitempty"`
 SourceURL string `json:"sourceUrl,omitempty"`
}
type capabilityManifest struct {
 Format string `json:"format"`
 SchemaVersion int `json:"schemaVersion"`
 Rules []capabilityRule `json:"rules"`
 Skills []capabilitySkill `json:"skills"`
}
type capabilityPreviewItem struct {
 Kind string `json:"kind"`
 ID string `json:"id"`
 Name string `json:"name"`
 Ready bool `json:"ready"`
 Reason string `json:"reason,omitempty"`
}
type capabilityResult struct {
 Created []string `json:"created"`
 Skipped []string `json:"skipped"`
 Failed []string `json:"failed"`
 Warnings []string `json:"warnings"`
}

func validCapabilityPath(name string) error {
 if name == "" || len(name)>300 || strings.Contains(name,"\\") ||
  strings.IndexFunc(name,func(r rune) bool{return r<32 || r==127})>=0 ||
  path.Clean(name)!=name {
  return fmt.Errorf("invalid ZIP entry path %q",name)
 }
 return domain.ValidateRelativeFilePath(name)
}

func strictCapabilityManifest(raw []byte) (capabilityManifest,error) {
 var out capabilityManifest
 d:=json.NewDecoder(bytes.NewReader(raw))
 d.DisallowUnknownFields()
 if err:=d.Decode(&out);err!=nil {return out,fmt.Errorf("invalid manifest: %w",err)}
 var other any
 if err:=d.Decode(&other);!errors.Is(err,io.EOF){return out,errors.New("manifest contains trailing JSON")}
 if out.Format!=capabilityFormat || out.SchemaVersion!=capabilityVersion {
  return out,fmt.Errorf("unsupported capability pack format or schemaVersion %d",out.SchemaVersion)
 }
 if len(out.Rules)>capabilityMaxRules || len(out.Skills)>capabilityMaxSkills {
  return out,errors.New("too many rules or skills in capability pack")
 }
 if len(out.Rules)==0&&len(out.Skills)==0{return out,errors.New("capability pack is empty")}
 seenRule,seenSkill:=map[string]bool{},map[string]bool{}
 for _,r:=range out.Rules {
  if !capabilityID.MatchString(r.ID)||strings.TrimSpace(r.Name)==""||len(r.Name)>200||
   strings.TrimSpace(r.Content)==""||len(r.Content)>256<<10||len(r.Description)>2000 {
   return out,fmt.Errorf("invalid rule %q",r.ID)
  }
  key:=strings.ToLower(r.ID)
  if seenRule[key] {return out,fmt.Errorf("duplicate rule ID %s",r.ID)}
  seenRule[key]=true
 }
 for _,s:=range out.Skills {
  if !capabilityID.MatchString(s.ID)||strings.TrimSpace(s.Name)==""||len(s.Name)>200||
   len(s.Description)>2000||len(s.Author)>200||len(s.Version)>100||len(s.License)>160||len(s.SourceURL)>2000 {
   return out,fmt.Errorf("invalid skill %q",s.ID)
  }
  key:=strings.ToLower(s.ID)
  if seenSkill[key] {return out,fmt.Errorf("duplicate skill ID %s",s.ID)}
  seenSkill[key]=true
 }
 return out,nil
}

// parseCapabilityZIP bounds both compressed and decompressed data, rejects
// symlinks, duplicate/case-colliding paths, undeclared resources, and traversal.
func parseCapabilityZIP(raw []byte) (capabilityManifest,map[string][]repo.SkillFileInput,[]string,error) {
 empty:=capabilityManifest{}
 if len(raw)==0||len(raw)>capabilityMaxZIP {return empty,nil,nil,errors.New("ZIP exceeds 65 MiB upload limit")}
 zr,err:=zip.NewReader(bytes.NewReader(raw),int64(len(raw)))
 if err!=nil{return empty,nil,nil,fmt.Errorf("invalid ZIP: %w",err)}
 if len(zr.File)>capabilityMaxEntries{return empty,nil,nil,errors.New("too many ZIP entries")}
 entries:=map[string][]byte{}
 modes:=map[string]uint32{}
 seen:=map[string]bool{}
 var total int64
 for _,f:=range zr.File {
  name:=f.Name
  // Directory names are checked too, before any skip.
  normalized:=strings.TrimSuffix(name,"/")
  if err:=validCapabilityPath(normalized);err!=nil{return empty,nil,nil,err}
  if f.FileInfo().IsDir(){continue}
  if !f.Mode().IsRegular(){return empty,nil,nil,fmt.Errorf("non-regular ZIP entry %q",name)}
  low:=strings.ToLower(name)
  if seen[low]{return empty,nil,nil,fmt.Errorf("duplicate ZIP path %q",name)}
  seen[low]=true
  limit:=int64(domain.SkillFileMaxBytes)
  if name=="manifest.json"{limit=capabilityMaxManifest}
  if f.UncompressedSize64>uint64(limit) {return empty,nil,nil,fmt.Errorf("ZIP entry exceeds size limit: %s",name)}
  rc,err:=f.Open();if err!=nil{return empty,nil,nil,err}
  b,readErr:=io.ReadAll(io.LimitReader(rc,limit+1))
  closeErr:=rc.Close()
  if readErr!=nil||closeErr!=nil{return empty,nil,nil,fmt.Errorf("unable to decompress %q",name)}
  if int64(len(b))>limit{return empty,nil,nil,fmt.Errorf("ZIP entry too large: %s",name)}
  total+=int64(len(b))
  if total>capabilityMaxUnpacked {return empty,nil,nil,errors.New("decompressed pack exceeds 128 MiB")}
  entries[name]=b
  modes[name]=uint32(f.Mode().Perm())
 }
 rawManifest,ok:=entries["manifest.json"]
 if !ok {return empty,nil,nil,errors.New("manifest.json missing at ZIP root")}
 pack,err:=strictCapabilityManifest(rawManifest)
 if err!=nil{return empty,nil,nil,err}
 delete(entries,"manifest.json")
 files:=make(map[string][]repo.SkillFileInput,len(pack.Skills))
 warnings:=[]string{}
 declared:=map[string]string{}
 for _,skill:=range pack.Skills{
  declared[skill.ID]=skill.ID
 }
 for name,body:=range entries {
  if name=="README.md"||name=="LICENSE" {continue}
  parts:=strings.SplitN(name,"/",3)
  if len(parts)!=3||parts[0]!="skills" {
   return empty,nil,nil,fmt.Errorf("undeclared ZIP path %q",name)
  }
  skillID,ok:=declared[parts[1]]
  if !ok{return empty,nil,nil,fmt.Errorf("file references undeclared skill %s",parts[1])}
  relative:=parts[2]
  if err:=validCapabilityPath(relative);err!=nil{return empty,nil,nil,err}
  files[skillID]=append(files[skillID],repo.SkillFileInput{Path:relative,Content:body,Mode:modes[name]})
  lower:=strings.ToLower(relative)
  if modes[name]&0o111!=0 || strings.HasPrefix(lower,"scripts/") ||
   strings.HasSuffix(lower,".sh")||strings.HasSuffix(lower,".ps1") {
   warnings=append(warnings,fmt.Sprintf("%s: executable or script file %s; review before attaching to a Role",skillID,relative))
  }
 }
 for _,skill:=range pack.Skills {
  count:=len(files[skill.ID])
  if count==0||count>domain.SkillMaxFileCount{return empty,nil,nil,fmt.Errorf("invalid file count for skill %s",skill.ID)}
  var sum int64
  found:=false
  for _,f:=range files[skill.ID]{
   sum+=int64(len(f.Content))
   if f.Path=="SKILL.md"&&len(bytes.TrimSpace(f.Content))!=0 {found=true}
  }
  if !found{return empty,nil,nil,fmt.Errorf("skill %s missing nonempty SKILL.md",skill.ID)}
  if sum>domain.SkillTotalMaxBytes{return empty,nil,nil,fmt.Errorf("skill %s exceeds 64 MiB",skill.ID)}
  sort.Slice(files[skill.ID],func(i,j int)bool{return files[skill.ID][i].Path<files[skill.ID][j].Path})
 }
 return pack,files,warnings,nil
}

func (h *catalogHandlers) capabilityProject(c *gin.Context) (string,bool) {
 projectID:=strings.TrimSpace(c.Query("projectId"))
 if projectID=="" {c.JSON(400,gin.H{"error":"projectId is required"});return "",false}
 if _,ok:=h.repo.Project(projectID);!ok {c.JSON(404,gin.H{"error":"project not found"});return "",false}
 // Reuse the stricter existing owner/admin policy for portable exports and imports.
 if !h.canManageProjectRepositories(c,projectID){return "",false}
 return projectID,true
}

func (h *catalogHandlers) capabilityUpload(c *gin.Context) (capabilityManifest,map[string][]repo.SkillFileInput,[]string,bool) {
 var empty capabilityManifest
 c.Request.Body=http.MaxBytesReader(c.Writer,c.Request.Body,capabilityMaxZIP+1)
 raw,err:=io.ReadAll(c.Request.Body)
 if err!=nil {c.JSON(413,gin.H{"error":"ZIP upload too large"});return empty,nil,nil,false}
 p,files,warnings,err:=parseCapabilityZIP(raw)
 if err!=nil {c.JSON(422,gin.H{"error":err.Error()});return empty,nil,nil,false}
 return p,files,warnings,true
}

func (h *catalogHandlers) capabilityPreflight(c *gin.Context) {
 projectID,ok:=h.capabilityProject(c);if !ok{return}
 pack,_,warnings,ok:=h.capabilityUpload(c);if !ok{return}
 items:=make([]capabilityPreviewItem,0,len(pack.Rules)+len(pack.Skills))
 for _,r:=range pack.Rules {
  _,exists:=h.repo.Rule(r.ID)
  item:=capabilityPreviewItem{Kind:"rules",ID:r.ID,Name:r.Name,Ready:!exists}
  if exists {item.Reason="ID already exists; will not overwrite"}
  items=append(items,item)
 }
 for _,s:=range pack.Skills {
  _,exists:=h.repo.Skill(s.ID)
  item:=capabilityPreviewItem{Kind:"skills",ID:s.ID,Name:s.Name,Ready:!exists}
  if exists {item.Reason="ID already exists; will not overwrite"}
  items=append(items,item)
 }
 c.JSON(200,gin.H{"format":pack.Format,"schemaVersion":pack.SchemaVersion,"projectId":projectID,"items":items,"warnings":warnings})
}

func selectedCapabilities(c *gin.Context,pack capabilityManifest) (map[string]bool,error) {
 allowed:=map[string]bool{}
 for _,r:=range pack.Rules{allowed["rules/"+r.ID]=true}
 for _,s:=range pack.Skills{allowed["skills/"+s.ID]=true}
 selected:=map[string]bool{}
 selection:=c.Query("selected")
 if selection=="" {return allowed,nil}
 for _,name:=range strings.Split(selection,","){
  if !allowed[name] {return nil,fmt.Errorf("unknown selected capability %q",name)}
  selected[name]=true
 }
 return selected,nil
}

func (h *catalogHandlers) capabilityImport(c *gin.Context) {
 projectID,ok:=h.capabilityProject(c);if !ok{return}
 if c.Query("confirm")!="1" {c.JSON(400,gin.H{"error":"explicit confirmation required"});return}
 pack,files,warnings,ok:=h.capabilityUpload(c);if !ok{return}
 selected,err:=selectedCapabilities(c,pack)
 if err!=nil {c.JSON(400,gin.H{"error":err.Error()});return}
 result:=capabilityResult{Created:[]string{},Skipped:[]string{},Failed:[]string{},Warnings:warnings}
 for _,r:=range pack.Rules{
  key:="rules/"+r.ID
  if !selected[key] {continue}
  if _,exists:=h.repo.Rule(r.ID);exists{result.Skipped=append(result.Skipped,key+": ID exists");continue}
  v:=domain.RuleDefinition{ID:r.ID,Name:r.Name,Description:r.Description,Content:r.Content,Priority:r.Priority,ProjectID:projectID}
  if err:=h.repo.CreateCapabilityRule(v);err!=nil {
   result.Failed=append(result.Failed,key+": "+err.Error())
  }else{result.Created=append(result.Created,key)}
 }
 for _,s:=range pack.Skills{
  key:="skills/"+s.ID
  if !selected[key] {continue}
  if _,exists:=h.repo.Skill(s.ID);exists{result.Skipped=append(result.Skipped,key+": ID exists");continue}
  v:=domain.SkillDefinition{ID:s.ID,Name:s.Name,Description:s.Description,ProjectID:projectID,
    Attribution:&domain.SkillAttribution{Author:s.Author,Version:s.Version,License:s.License,SourceURL:s.SourceURL}}
  if err:=h.repo.PutSkillSnapshot(v,files[s.ID],true);err!=nil {
   if errors.Is(err,repo.ErrSkillExists){result.Skipped=append(result.Skipped,key+": ID exists")}else{result.Failed=append(result.Failed,key+": "+err.Error())}
  }else{result.Created=append(result.Created,key)}
 }
 c.JSON(200,result)
}

func (h *catalogHandlers) capabilityExport(c *gin.Context) {
 projectID,ok:=h.capabilityProject(c);if !ok{return}
 kind:=c.DefaultQuery("kind","all")
 if kind!="all"&&kind!="rules"&&kind!="skills" {c.JSON(400,gin.H{"error":"invalid kind"});return}
 pack:=capabilityManifest{Format:capabilityFormat,SchemaVersion:capabilityVersion,Rules:[]capabilityRule{},Skills:[]capabilitySkill{}}
 var payload bytes.Buffer
 writer:=zip.NewWriter(&payload)
 add:=func(name string,data []byte,mode uint32)error {
  if err:=validCapabilityPath(name);err!=nil{return err}
  h:=&zip.FileHeader{Name:name,Method:zip.Deflate}
  h.SetMode(0o644)
  if mode!=0 {h.SetMode(mode & 0o777)}
  f,err:=writer.CreateHeader(h);if err!=nil{return err}
  _,err=f.Write(data);return err
 }
 var exportErr error
 if kind=="all"||kind=="rules"{
  for _,r:=range h.repo.Rules(){
   if r.ProjectID!=projectID {continue}
   pack.Rules=append(pack.Rules,capabilityRule{ID:r.ID,Name:r.Name,Description:r.Description,Content:r.Content,Priority:r.Priority})
  }
 }
 if kind=="all"||kind=="skills"{
  for _,s:=range h.repo.Skills(){
   if s.ProjectID!=projectID {continue}
   record:=capabilitySkill{ID:s.ID,Name:s.Name,Description:s.Description}
   if s.Attribution!=nil {
    record.Author=s.Attribution.Author
    record.Version=s.Attribution.Version
    record.License=s.Attribution.License
    record.SourceURL=s.Attribution.SourceURL
   } else if s.Source!=nil {
    record.Author=s.Source.Namespace
    record.Version=s.Source.Version
    record.SourceURL=s.Source.Homepage
   }
   pack.Skills=append(pack.Skills,record)
   copied:=map[string]bool{}
   var skillTotal int64
   save:=func(rel string,blob []byte,mode uint32) {
    if exportErr!=nil{return}
    if err:=validCapabilityPath(rel);err!=nil {exportErr=err;return}
    if copied[strings.ToLower(rel)]{exportErr=fmt.Errorf("duplicate file %s in skill %s",rel,s.ID);return}
    copied[strings.ToLower(rel)]=true
    skillTotal+=int64(len(blob))
    if int64(len(blob))>domain.SkillFileMaxBytes||skillTotal>domain.SkillTotalMaxBytes {
     exportErr=fmt.Errorf("skill %s exceeds export file limits",s.ID);return
    }
    exportErr=add("skills/"+s.ID+"/"+rel,blob,mode)
   }
   binary:=h.repo.SkillFileContents(s.ID)
   body,hasStoredMD:=binary["SKILL.md"]
   if !hasStoredMD {body=[]byte(s.Content)}
   if len(bytes.TrimSpace(body))==0 {exportErr=fmt.Errorf("skill %s has no SKILL.md content",s.ID);break}
   save("SKILL.md",body,0o644)
   // Preserve original supplementary files and their recorded Unix permission bits.
   textPaths:=make([]string,0,len(s.Files))
   for p:=range s.Files{textPaths=append(textPaths,p)}
   sort.Strings(textPaths)
   for _,p:=range textPaths{if p!="SKILL.md"{save(p,[]byte(s.Files[p]),0o644)}}
   modes:=map[string]uint32{}
   for _,ref:=range s.FileRefs{modes[ref.Path]=ref.Mode}
   binaryPaths:=make([]string,0,len(binary))
   for p:=range binary{binaryPaths=append(binaryPaths,p)}
   sort.Strings(binaryPaths)
   for _,p:=range binaryPaths{if p!="SKILL.md"{save(p,binary[p],modes[p])}}
   if exportErr!=nil{break}
  }
 }
 if exportErr==nil && len(pack.Rules)==0 && len(pack.Skills)==0 {exportErr=errors.New("no matching capabilities to export")}
 if len(pack.Rules)>capabilityMaxRules||len(pack.Skills)>capabilityMaxSkills {exportErr=errors.New("too many capabilities to export")}
 if exportErr==nil {
  var b []byte
  b,exportErr=json.MarshalIndent(pack,"","  ")
  if exportErr==nil {exportErr=add("manifest.json",b,0o644)}
 }
 if err:=writer.Close();exportErr==nil{exportErr=err}
 if exportErr!=nil {c.JSON(422,gin.H{"error":exportErr.Error()});return}
 if payload.Len()>capabilityMaxZIP{c.JSON(422,gin.H{"error":"export ZIP exceeds 65 MiB"});return}
 c.Header("Content-Disposition",fmt.Sprintf("attachment; filename=\"loopforge-capabilities-%s.zip\"",kind))
 c.Data(http.StatusOK,"application/zip",payload.Bytes())
}
