function buildRequests(config,activeCategories){
 if(!Array.isArray(config.targets)||config.targets.length!==50||new Set(config.targets.map(t=>t.targetId)).size!==50)throw Error("expected 50 unique targets");
 if(!Array.isArray(activeCategories)||new Set(activeCategories).size!==activeCategories.length)throw Error("invalid active categories");
 if(!Number.isInteger(config.limit)||config.limit<1||config.limit>50)throw Error("invalid limit");
 const req=[{id:"overall-score-top50",kind:"overall",path:"/api/skills/top",params:{},metric:"score"}];
 for(const c of config.categoryCandidates.filter(c=>activeCategories.includes(c))){for(const metric of config.metrics){req.push({id:"category:"+c+":"+metric,kind:"category",path:"/api/skills",params:{category:c,sortBy:metric,order:"desc",page:"1",pageSize:String(config.limit)},metric})}}
 for(const t of config.targets){if(typeof t.keyword!=="string"||!t.keyword.trim()||t.keyword.length>100)throw Error("invalid keyword");for(const metric of config.metrics){if(!["score","downloads"].includes(metric))throw Error("unsupported metric");req.push({id:"keyword:"+t.targetId+":"+metric,kind:"keyword",targetId:t.targetId,path:"/api/skills",params:{keyword:t.keyword,...(activeCategories.includes(t.category)?{category:t.category}:{}),sortBy:metric,order:"desc",page:"1",pageSize:String(config.limit)},metric})}}
 if(new Set(req.map(x=>x.id)).size!==req.length)throw Error("duplicate request ID");
 return req;
}

function parseRank(request,payload,observedAt){
 if(payload?.code!==0||!Array.isArray(payload.data?.skills)||!Number.isInteger(payload.data?.total)||payload.data.total<0||payload.data.skills.length>50||payload.data.total<payload.data.skills.length)throw Error("invalid SkillHub ranking response");
 const results=[],warnings=[],seen=new Set();
 const ident=x=>typeof x==="string"&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(x);
 const nonneg=x=>typeof x==="number"&&Number.isFinite(x)&&x>=0?x:null;
 for(let i=0;i<payload.data.skills.length;i++){
  const x=payload.data.skills[i],namespace=x?.namespace?.handle||x?.ownerName||x?.owner?.handle,slug=x?.slug;
  if(!ident(namespace)||!ident(slug)){warnings.push({position:i+1,reason:"identity missing or ambiguous"});continue}
  const key=namespace+"/"+slug;
  if(seen.has(key)){warnings.push({position:i+1,reason:"duplicate identity"});continue}seen.add(key);
  results.push({namespace,slug,position:i+1,rankScope:request.kind,metric:request.metric,queryId:request.id,observedAt,category:typeof x.category==="string"?x.category:null,name:typeof x.name==="string"?x.name.slice(0,200):null,observedVersion:typeof x.version==="string"?x.version:null,downloads:nonneg(x.downloads),installs:nonneg(x.installs),stars:nonneg(x.stars),score:nonneg(x.score),labels: x.labels&&typeof x.labels==="object"&&!Array.isArray(x.labels)?{pricing_type:x.labels.pricing_type??null,requires_api_key:x.labels.requires_api_key??null}:null,status:"quarantined",verifiedVersion:null,license:null,packageSha256:null,installed:false,certified:false});
 }
 return {query:request,observedAt,total:payload.data.total,rawCount:payload.data.skills.length,results,warnings};
}

function candidateLedger(config,snapshots){
 const byId=new Map(snapshots.map(x=>[x.query.id,x]));
 return config.targets.map(t=>{
  const records=new Map();
  for(const metric of config.metrics){
   const snap=byId.get("keyword:"+t.targetId+":"+metric);if(!snap)continue;
   for(const row of snap.results){const key=row.namespace+"/"+row.slug;if(!records.has(key))records.set(key,{namespace:row.namespace,slug:row.slug,keywordEvidence:[],categoryEvidence:[],overallEvidence:[],state:"quarantined",selected:false});records.get(key).keywordEvidence.push({queryId:row.queryId,metric:row.metric,position:row.position})}
  }
  for(const row of records.values()){for(const metric of config.metrics){const cat=byId.get("category:"+t.category+":"+metric);const hit=cat?.results.find(x=>x.namespace===row.namespace&&x.slug===row.slug);if(hit)row.categoryEvidence.push({queryId:hit.queryId,metric,position:hit.position})}const overall=byId.get("overall-score-top50")?.results.find(x=>x.namespace===row.namespace&&x.slug===row.slug);if(overall)row.overallEvidence.push({queryId:overall.queryId,metric:"score",position:overall.position})}
  return {targetId:t.targetId,capability:t.capability,category:t.category,queriesExpected:config.metrics.length,queriesCompleted:config.metrics.filter(m=>byId.has("keyword:"+t.targetId+":"+m)).length,candidates:[...records.values()],selected:null,status:"pending-relevance-review"};
 });
}

export {buildRequests, parseRank, candidateLedger};
