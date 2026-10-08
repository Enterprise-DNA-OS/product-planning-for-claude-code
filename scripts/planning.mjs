import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv,pick} from './lib/csv.mjs';

export const commands=['help','backlog','feature','prioritise','release-review','dependencies','feedback','owner-workload','attention','compliance','activity','weekly-review','add-feature','update-feature','add-release','update-release','add-dependency','add-feedback','review-feedback','decide','log','draft-release','import','export'];
const readQueries={
 backlog:'SELECT reference,name,owner,status FROM features ORDER BY reference',
 prioritise:'SELECT * FROM priority_queue ORDER BY priority_score DESC,reference',
 'release-review':'SELECT name,due_date,status,capacity_days,remaining_days,open_features,unapproved_features FROM release_readiness ORDER BY due_date,name',
 dependencies:`SELECT f.reference AS feature,f.name,b.reference AS blocked_by,b.status AS blocker_status FROM dependencies d JOIN features f ON f.id=d.feature_id JOIN features b ON b.id=d.blocker_id ORDER BY f.reference,b.reference`,
 feedback:`SELECT b.id,f.reference,b.organisation,b.summary,b.personal,b.review_on,b.legal_hold FROM feedback b JOIN features f ON f.id=b.feature_id ORDER BY f.reference,b.id`,
 'owner-workload':`SELECT coalesce(nullif(owner,''),'Unassigned') AS owner,count(*) AS open_features,sum(effort_days) AS effort_days,count(*) FILTER(WHERE last_reviewed IS NULL OR last_reviewed<current_date-14) AS stale FROM features WHERE status NOT IN ('shipped','cancelled') GROUP BY owner ORDER BY effort_days DESC,owner`,
 attention:`SELECT f.reference,f.name,CASE WHEN f.owner='' THEN 'Missing owner' WHEN r.due_date<current_date THEN 'Release overdue' ELSE 'Review stale or missing' END AS issue FROM features f LEFT JOIN releases r ON r.id=f.release_id WHERE f.status NOT IN ('shipped','cancelled') AND (f.owner='' OR r.due_date<current_date OR f.last_reviewed IS NULL OR f.last_reviewed<current_date-14) ORDER BY f.reference`,
 activity:`SELECT f.reference,a.action,a.actor,a.detail,a.created_at FROM activity a LEFT JOIN features f ON f.id=a.feature_id ORDER BY a.created_at,a.id`
};
const required=(o,k)=>{if(o[k]===undefined||String(o[k]).trim()==='')throw Error(`Required --${k}=...`);return String(o[k]).trim();};
const number=(v,min,max=Infinity)=>{if(String(v).trim()===''||!Number.isFinite(Number(v))||Number(v)<min||Number(v)>max)throw Error(`Expected number between ${min} and ${max}`);return Number(v);};
const date=v=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||Number.isNaN(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error(`Invalid date: ${v}; use YYYY-MM-DD`);return v;};
const bool=v=>{if(!['true','false'].includes(String(v)))throw Error('Boolean must be true or false');return String(v)==='true';};
const terminal=s=>['shipped','cancelled'].includes(s);
async function resolve(db,kind,ref){
 if(!ref)throw Error(`A ${kind} reference is required`);
 const col=kind==='features'?'reference':'name';
 let rows=await db.query(`SELECT * FROM ${kind} WHERE id::text=$1 OR lower(${col})=lower($1)`,[ref]);
 if(!rows.length)rows=await db.query(`SELECT * FROM ${kind} WHERE starts_with(id::text,$1) OR strpos(lower(name),lower($1))>0 ORDER BY name,id`,[ref]);
 if(rows.length!==1)throw Error(rows.length?`Ambiguous ${kind}: ${rows.map(r=>`${r.reference||r.name} (${r.id})`).join(', ')}`:`No ${kind} match: ${ref}`);
 return rows[0];
}
async function record(db,id,action,actor,detail){await db.query('INSERT INTO activity(feature_id,action,actor,detail) VALUES($1,$2,$3,$4::jsonb)',[id,action,actor,JSON.stringify(detail)]);}
async function transaction(db,fn,dry=false){await db.exec('BEGIN');try{const result=await fn();await db.exec(dry?'ROLLBACK':'COMMIT');return result;}catch(e){await db.exec('ROLLBACK');throw e;}}
async function compliance(db){return [
 ...(await db.query('SELECT reference,issue FROM retention_queue ORDER BY reference')).map(r=>({...r,rule:'NZ IPP9 / AU APP11.2: review retention; respect holds',source:'docs/compliance.md'})),
 ...(await db.query(`SELECT reference,'Missing accountable owner' AS issue FROM features WHERE owner='' AND status NOT IN ('shipped','cancelled') ORDER BY reference`)).map(r=>({...r,rule:'Internal ownership policy',source:'docs/compliance.md'}))
];}
async function importAha(db,o,actor){
 const rows=parseCsv(fs.readFileSync(required(o,'file'),'utf8'));if(!rows.length)throw Error('CSV has no data rows');
 let statuses={ 'under consideration':'backlog','new':'backlog','backlog':'backlog','ready to develop':'planned','planned':'planned','in progress':'in_progress','in development':'in_progress','shipped':'shipped','will not implement':'cancelled','cancelled':'cancelled'};
 if(o['status-map']){const custom=JSON.parse(fs.readFileSync(o['status-map'],'utf8'));for(const [k,v] of Object.entries(custom)){if(!['backlog','planned','in_progress','shipped','cancelled'].includes(v))throw Error('Invalid status mapping');statuses[k.toLowerCase()]=v;}}
 const result={inserted:0,skipped:0,dry_run:!!o['dry-run']};const seen=new Set();
 for(const row of rows){
  const reference=pick(row,'Feature reference num','Feature reference','Reference').trim();const name=pick(row,'Feature name','Name').trim();
  if(!reference||!name)throw Error('Every row needs Feature reference num and Feature name');
  if(seen.has(reference))throw Error(`Duplicate reference in CSV: ${reference}`);seen.add(reference);
  const existing=(await db.query('SELECT * FROM features WHERE reference=$1',[reference]))[0];
  if(existing){const sorted=x=>JSON.stringify(Object.entries(x||{}).sort(([a],[b])=>a.localeCompare(b)));if(sorted(existing.source_row)!==sorted(row))throw Error(`Changed import ${reference}: reconcile instead of overwriting`);result.skipped++;continue;}
  const statusText=pick(row,'Feature status','Status').toLowerCase().trim();const status=statuses[statusText];
  if(!status)throw Error(`Unmapped status: ${statusText}; use --status-map=path.json`);
  const releaseName=pick(row,'Release name','Release').trim();const due=pick(row,'Release release date','Release date').trim();let releaseId=null;
  if(releaseName){if(!due)throw Error(`Release ${releaseName} requires Release release date`);date(due);
   const r=await db.query('SELECT * FROM releases WHERE name=$1',[releaseName]);
   if(r.length&&r[0].due_date!==due)throw Error(`Release date conflict: ${releaseName}`);
   releaseId=r[0]?.id||(await db.query('INSERT INTO releases(name,due_date,capacity_days) VALUES($1,$2,0) RETURNING id',[releaseName,due]))[0].id;
  }
  // Imported shipped status is source history, not a new local sign-off.
  const f=(await db.query('INSERT INTO features(reference,name,description,owner,status,release_id,source_row) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb) RETURNING *',[reference,name,pick(row,'Feature description','Description'),pick(row,'Feature assigned to','Assigned to'),status,releaseId,JSON.stringify(row)]))[0];
  await record(db,f.id,'import',actor,{source:'aha',reference,status,verification:'unreviewed'});result.inserted++;
 }
 return result;
}
export async function execute(db,cmd,args=[],o={}){
 if(cmd==='help')return commands.map(command=>({command}));
 if(readQueries[cmd])return db.query(readQueries[cmd]);
 if(cmd==='feature'){const f=await resolve(db,'features',args[0]);return {feature:f,feedback:await db.query('SELECT * FROM feedback WHERE feature_id=$1 ORDER BY id',[f.id]),decisions:await db.query('SELECT * FROM decisions WHERE feature_id=$1 ORDER BY created_at,id',[f.id])};}
 if(cmd==='compliance')return compliance(db);
 if(cmd==='weekly-review')return {priorities:await db.query(readQueries.prioritise),releases:await db.query(readQueries['release-review']),attention:await db.query(readQueries.attention),compliance:await compliance(db)};
 if(cmd==='export'){
  const data={format:'product-planning-v1',exported_at:new Date().toISOString()};
  await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ');try{for(const t of ['releases','features','dependencies','feedback','decisions','activity'])data[t]=await db.query(`SELECT * FROM ${t} ORDER BY id`);await db.exec('COMMIT');}catch(e){await db.exec('ROLLBACK');throw e;}
  const file=path.resolve(required(o,'file'));fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(data,null,2),{flag:'wx',mode:0o600});return {file,counts:Object.fromEntries(Object.entries(data).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[k,v.length]))};
 }
 if(cmd==='draft-release'){
  const r=await resolve(db,'releases',args[0]);const features=await db.query('SELECT reference,name,status,owner FROM features WHERE release_id=$1 ORDER BY reference',[r.id]);
  const filename=`release-${r.id}-${Date.now()}-${crypto.randomUUID()}.md`;const dir=path.resolve(process.env.OUTPUT_DIR||REPO_ROOT,'drafts');fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,filename),`# Internal release brief: ${r.name}\n\nDRAFT. Due ${r.due_date}. Confirm the records before sharing.\n\n${features.map(f=>`- ${f.reference}: ${f.name}. Status: ${f.status}. Owner: ${f.owner||'Unassigned'}.`).join('\n')}\n`,{flag:'wx',mode:0o600});return {file:path.join(dir,filename),features:features.length};
 }
 if(!commands.includes(cmd))throw Error(`Unknown command: ${cmd}`);
 const actor=required(o,'actor');
 return transaction(db,async()=>{
  if(cmd==='import'){if(args[0]!=='aha')throw Error('Import format must be aha');return importAha(db,o,actor);}
  if(cmd==='add-release'){
   const r=(await db.query('INSERT INTO releases(name,due_date,capacity_days) VALUES($1,$2,$3) RETURNING *',[required(o,'name'),date(required(o,'due')),number(required(o,'capacity'),0)]))[0];await record(db,null,cmd,actor,{release:r});return r;
  }
  if(cmd==='update-release'){
   const r=await resolve(db,'releases',args[0]);
   await db.query('SELECT id FROM releases WHERE id=$1 FOR UPDATE',[r.id]);
   if(r.status!=='planned')throw Error('Terminal release is immutable');
   const status=o.status||r.status;if(!['planned','shipped','cancelled'].includes(status))throw Error('Invalid release status');
   const open=await db.query("SELECT id FROM features WHERE release_id=$1 AND status NOT IN ('shipped','cancelled')",[r.id]);
   if(status!=='planned'&&open.length)throw Error('Resolve all open features before closing release');
   const changed=(await db.query('UPDATE releases SET due_date=$2,capacity_days=$3,status=$4 WHERE id=$1 RETURNING *',[r.id,o.due?date(o.due):r.due_date,o.capacity===undefined?r.capacity_days:number(o.capacity,0),status]))[0];
   if(o.due&&o.due!==r.due_date)await db.query("UPDATE features SET revision=revision+1 WHERE release_id=$1 AND status NOT IN ('shipped','cancelled')",[r.id]);
   await record(db,null,cmd,actor,{before:r,after:changed});return changed;
  }
  if(cmd==='add-feature'){
   const release=o.release?await resolve(db,'releases',o.release):null;
   const f=(await db.query('INSERT INTO features(reference,name,owner,description,release_id) VALUES($1,$2,$3,$4,$5) RETURNING *',[required(o,'reference'),required(o,'name'),required(o,'owner'),o.description||'',release?.id||null]))[0];await record(db,f.id,cmd,actor,{feature:f});return f;
  }
  if(cmd==='review-feedback'){
   const id=args[0];if(!id)throw Error('Feedback id required');
   const rows=await db.query('SELECT * FROM feedback WHERE id::text=$1 FOR UPDATE',[id]);if(!rows.length)throw Error('No feedback matches full id');
   const b=(await db.query('UPDATE feedback SET purpose=$2,review_on=$3,legal_hold=$4 WHERE id=$1 RETURNING *',[id,required(o,'purpose'),date(required(o,'review-on')),o.hold===undefined?rows[0].legal_hold:bool(o.hold)]))[0];
   await record(db,b.feature_id,cmd,actor,{before:rows[0],after:b});return b;
  }
  const resolved=await resolve(db,'features',args[0]);
  const f=(await db.query('SELECT * FROM features WHERE id=$1 FOR UPDATE',[resolved.id]))[0];
  if(cmd==='update-feature'){
   const cols={name:'name',owner:'owner',description:'description',status:'status',reach:'reach',impact:'impact',confidence:'confidence',effort:'effort_days',release:'release_id'};const changes={};
   for(const [flag,col] of Object.entries(cols))if(o[flag]!==undefined){let v=o[flag];if(flag==='release'){const r=await resolve(db,'releases',v);if(r.status!=='planned')throw Error('Release is not planned');v=r.id;}
    if(['reach','impact','confidence','effort'].includes(flag))v=number(v,flag==='effort'?0.01:0,flag==='confidence'?1:flag==='impact'?5:Infinity);
    if(['name','owner'].includes(flag))v=required(o,flag);changes[col]=v;
   }
   if(!Object.keys(changes).length)throw Error('No feature changes supplied');
   if(terminal(f.status))throw Error('Terminal feature is immutable; create a follow-up feature');
   if(changes.status==='shipped'){
    if(Object.keys(changes).length!==1)throw Error('Ship separately after reviewing other changes');
    const d=(await db.query('SELECT * FROM decisions WHERE feature_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1',[f.id]))[0];
    if(!d||d.revision!==f.revision||d.outcome!=='approve'||!f.owner)throw Error('Current approval and owner required before shipping');
    const blockers=await db.query(`SELECT d.id FROM dependencies d JOIN features b ON b.id=d.blocker_id WHERE d.feature_id=$1 AND b.status<>'shipped'`,[f.id]);if(blockers.length)throw Error('Unshipped dependencies block shipping');
   }
   const entries=Object.entries(changes);const values=entries.map(([,v])=>v);const changed=(await db.query(`UPDATE features SET ${entries.map(([k],i)=>`${k}=$${i+1}`).join(',')},revision=revision+1 WHERE id=$${values.length+1} RETURNING *`,[...values,f.id]))[0];await record(db,f.id,cmd,actor,{before:f,after:changed});return changed;
  }
  if(cmd==='add-dependency'){
   // Serialise graph edits so concurrent requests cannot create a cycle.
   await db.exec('LOCK TABLE dependencies IN EXCLUSIVE MODE');
   const b=await resolve(db,'features',required(o,'blocker'));if(terminal(f.status))throw Error('Cannot add dependencies to terminal feature');
   const cycle=await db.query(`WITH RECURSIVE chain(id) AS (SELECT blocker_id FROM dependencies WHERE feature_id=$1 UNION SELECT d.blocker_id FROM dependencies d JOIN chain c ON d.feature_id=c.id) SELECT id FROM chain WHERE id=$2`,[b.id,f.id]);
   if(b.id===f.id||cycle.length)throw Error('Dependency cycle rejected');
   await db.query('INSERT INTO dependencies(feature_id,blocker_id) VALUES($1,$2)',[f.id,b.id]);await db.query('UPDATE features SET revision=revision+1 WHERE id=$1',[f.id]);await record(db,f.id,cmd,actor,{blocker:b.reference});return {feature:f.reference,blocker:b.reference};
  }
  if(cmd==='add-feedback'){
   const personal=o.personal===undefined?false:bool(o.personal);const review=o['review-on']?date(o['review-on']):null;
   const b=(await db.query('INSERT INTO feedback(feature_id,organisation,summary,personal,purpose,review_on,legal_hold) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[f.id,required(o,'organisation'),required(o,'summary'),personal,o.purpose||'',review,o.hold===undefined?false:bool(o.hold)]))[0];await record(db,f.id,cmd,actor,{feedback_id:b.id});return b;
  }
  if(cmd==='decide'){
   if(terminal(f.status))throw Error('Cannot decide terminal feature');
   const outcome=required(o,'outcome');const reason=required(o,'reason');
   if(outcome==='approve'&&!f.owner)throw Error('Assign an owner before approval');
   const d=(await db.query('INSERT INTO decisions(feature_id,revision,outcome,reason,actor) VALUES($1,$2,$3,$4,$5) RETURNING *',[f.id,f.revision,outcome,reason,actor]))[0];await db.query('UPDATE features SET last_reviewed=current_date WHERE id=$1',[f.id]);await record(db,f.id,cmd,actor,{decision:d});return d;
  }
  if(cmd==='log'){await record(db,f.id,cmd,actor,{note:required(o,'note')});return {reference:f.reference,logged:true};}
  throw Error(`Command not implemented: ${cmd}`);
 },!!o['dry-run']);
}
export function parseArgs(argv){const args=[],o={};for(const arg of argv){if(arg.startsWith('--')){const at=arg.indexOf('=');const k=arg.slice(2,at<0?undefined:at);o[k]=at<0?true:arg.slice(at+1);}else args.push(arg);}return {cmd:args.shift()||'help',args,o};}
export function human(value){
 if(!Array.isArray(value)){if(value&&typeof value==='object'&&Object.values(value).some(Array.isArray))return Object.entries(value).map(([k,v])=>`${k}\n${human(v)}`).join('\n\n');return JSON.stringify(value,null,2);}
 if(!value.length)return 'Nothing here.';const keys=Object.keys(value[0]);const clean=v=>typeof v==='object'&&v!==null?JSON.stringify(v):String(v??'');
 const widths=keys.map(k=>Math.min(70,Math.max(k.length,...value.map(r=>clean(r[k]).length))));
 const row=r=>keys.map((k,i)=>clean(r[k]).replace(/[\r\n]/g,' ').slice(0,70).padEnd(widths[i])).join(' | ').trimEnd();
 return [row(Object.fromEntries(keys.map(k=>[k,k]))),widths.map(w=>'-'.repeat(w)).join('-+-'),...value.map(row)].join('\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{const {cmd,args,o}=parseArgs(process.argv.slice(2));db=await getDb();const result=await execute(db,cmd,args,o);console.log(o.json?JSON.stringify(result,null,2):human(result));}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}}
