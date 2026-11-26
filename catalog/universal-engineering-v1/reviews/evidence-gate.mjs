function evidenceGate(cases,records,revision){
 const errors=[]; const ids=new Set(cases.map(c=>c.id));const seen=new Map(),runs=new Set(),hashes=new Set();
 const hash=v=>typeof v==="string"&&/^[a-f0-9]{64}$/.test(v);
 const nonblank=v=>typeof v==="string"&&v.trim().length>0;
 for(const r of records){
  if(!ids.has(r.caseId)||!["baseline","guided"].includes(r.arm)){errors.push("unknown case/arm");continue}
  const key=r.caseId+":"+r.arm;if(seen.has(key))errors.push("duplicate arm "+key);seen.set(key,r);
  if(r.sourceRevision!==revision)errors.push("wrong revision "+key);
  if(![r.subjectRun,r.reviewerRun,r.subjectId,r.reviewerId].every(nonblank)||r.subjectRun===r.reviewerRun||r.subjectId===r.reviewerId)errors.push("reviewer not separate "+key);
  for(const run of [r.subjectRun,r.reviewerRun]){if(runs.has(run))errors.push("reused run "+key);runs.add(run)}
  for(const h of [r.traceSha256,r.reviewSha256]){if(!hash(h)||hashes.has(h))errors.push("missing or reused evidence hash "+key);hashes.add(h)}
  if(!["pass","fail"].includes(r.verdict))errors.push("unverified verdict "+key);
  if(r.arm==="guided"&&r.verdict!=="pass")errors.push("guided failed "+key);
 }
 for(const c of cases){for(const arm of ["baseline","guided"])if(!seen.has(c.id+":"+arm))errors.push("missing "+c.id+":"+arm)}
 return {eligibleForHumanReview:errors.length===0,errors,expectedRecords:cases.length*2,receivedRecords:records.length,certified:false};
}
export {evidenceGate};
