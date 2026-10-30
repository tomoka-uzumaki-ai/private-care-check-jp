'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const here=__dirname,read=f=>fs.readFileSync(path.join(here,f),'utf8');
const {validateCSV,CSV_HEADER}=require('./logic.js');
const header=CSV_HEADER.join(',')+'\n';
const row=(name='Work A',period='2026-10')=>['income',period,name,'sale','JPY','net','500','','','0','0','',''].join(',')+'\n';
const fixture=header+row();
const cases=[['valid',fixture],['header',fixture.replace('row,period','period,row')],['unknown versus zero',fixture.replace('500,,,0,0','500,,,,0')],['mixed period',fixture+row('Work B','2026-11')],['duplicate',fixture+row()],['bad amount',fixture.replace(',500,',',5.50,')],['bad quotes',header+'"unclosed'],['valid row boundary',header+Array.from({length:5000},(_,i)=>row('Work '+i)).join('')],['row limit',header+Array.from({length:5001},(_,i)=>row('Work '+i)).join('')]];
for(const [name,text] of cases){
 const ja=validateCSV([{name:'input.csv',text}]),en=validateCSV([{name:'input.csv',text}],'en');
 assert.equal(ja.rows,en.rows,name);assert.equal(ja.period,en.period,name);assert.equal(ja.errors.length,en.errors.length,name);
 assert.ok(en.errors.every(e=>!/[\u3040-\u9fff]/.test(e)),name+' English diagnostics');
 if(['valid','unknown versus zero','valid row boundary'].includes(name))assert.equal(en.errors.length,0,name);else assert.ok(en.errors.length,name);
}
assert.match(validateCSV([{name:'input.csv',text:header+'income'}]).errors[0],/13列が必要/,'default Japanese diagnostics stay Japanese');
function workspace(lang,logic=read('logic.js'),app=read('app.js')){
 const ids={},downloads=[],packs=[];let pendingBlob;
 for(const id of ['files','form','result','report','heading','pack','download','buy'])ids[id]={hidden:['result','pack','buy'].includes(id),textContent:'',files:[]};
 const document={documentElement:{lang},getElementById:id=>ids[id],createElement:()=>({click(){downloads.push({name:this.download,blob:pendingBlob});}})};
 const context=vm.createContext({document,TextEncoder,TextDecoder,Uint8Array,Uint32Array,DataView,Blob,setTimeout:()=>{},URL:{createObjectURL(blob){pendingBlob=blob;return 'blob:local';},revokeObjectURL(){}}});context.window=context;
 for(const code of [logic,read('../file-pack.js')])vm.runInContext(code,context);
 return {ids,downloads,packs,context,load(){context.capture=files=>packs.push(files.map(f=>({name:f.name,data:Buffer.from(f.data)})));vm.runInContext('const originalZip=FilePack.zip;FilePack.zip=files=>{capture(files);return originalZip(files)};',context);vm.runInContext(app,context);},async submit(files){ids.files.files=files;await ids.form.onsubmit({preventDefault(){}});}};
}
function input(name,text=fixture,size){const bytes=new TextEncoder().encode(text);return {name,size:size??bytes.length,arrayBuffer:async()=>bytes.buffer};}
function zipEntries(bytes){let p=0;const result={};while(bytes.readUInt32LE(p)===0x04034b50){const size=bytes.readUInt32LE(p+18),n=bytes.readUInt16LE(p+26),extra=bytes.readUInt16LE(p+28),name=bytes.subarray(p+30,p+30+n).toString();const start=p+30+n+extra;result[name]=bytes.subarray(start,start+size);p=start+size;}return result;}
async function formChecks(lang){
 const w=workspace(lang);w.load();await w.submit([input('private-original-name.csv')]);assert.equal(w.ids.buy.hidden,false);assert.equal(w.ids.pack.hidden,false);
 if(lang==='en')assert.match(w.ids.report.textContent,/Input format accepted/);else assert.match(w.ids.report.textContent,/入力形式に適合/);
 w.ids.pack.onclick();const zip=Buffer.from(await w.downloads.at(-1).blob.arrayBuffer()),entries=zipEntries(zip);
 assert.deepEqual(Object.keys(entries),['prepared/input-01.csv','manifest.json','README.txt']);assert.equal(entries['prepared/input-01.csv'].toString(),fixture,'input data unchanged');
 const manifest=JSON.parse(entries['manifest.json']);assert.equal(manifest.origin,'unconfirmed');assert.equal(manifest.period,'2026-10');assert.deepEqual(manifest.files,['prepared/input-01.csv']);assert.doesNotMatch(entries['manifest.json'].toString()+entries['README.txt'].toString(),/private-original-name/,'private original filenames do not enter metadata');assert.doesNotMatch(Object.keys(entries).join(' '),/summarize|\.py/,'paid code is not included');
 if(lang==='en'){assert.doesNotMatch(entries['README.txt'].toString(),/[\u3040-\u9fff]/);assert.match(entries['README.txt'].toString(),/--data-kind entered/);assert.match(entries['README.txt'].toString(),/Use example only for fictional inputs/);}
 await w.submit(Array.from({length:5},(_,i)=>input('input'+i+'.csv',fixture.replace('Work A','Work '+i),i===0?1048576:undefined)));assert.equal(w.ids.buy.hidden,false,'five files and the exact per-file size boundary are accepted');
 w.ids.files.onchange();assert.equal(w.ids.result.hidden,true);assert.equal(w.ids.pack.hidden,true);assert.equal(w.ids.buy.hidden,true);
 for(const files of [[],Array.from({length:6},(_,i)=>input('x'+i)),[input('large.csv',fixture,1048577)],[input('duplicate.csv',fixture+row())],[input('period.csv',fixture+row('B','2026-11'))]]){await w.submit(files);assert.equal(w.ids.buy.hidden,true);assert.equal(w.ids.pack.hidden,true);if(lang==='en')assert.doesNotMatch(w.ids.report.textContent,/[\u3040-\u9fff]/);}
 let finish;const delayed={name:'late.csv',size:100,arrayBuffer:()=>new Promise(resolve=>finish=resolve)};w.ids.files.files=[delayed];const pending=w.ids.form.onsubmit({preventDefault(){}});w.ids.files.onchange();finish(new TextEncoder().encode(fixture).buffer);await pending;assert.equal(w.ids.result.hidden,true,'late file read cannot revive old eligibility');
 return zip;
}
const outlet=read('../outlet.js');
function route(html,href){const anchors=[...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/g)].map(m=>({href:m[1],getAttribute(){return this.href;}}));vm.runInNewContext(outlet,{document:{querySelectorAll:()=>anchors},location:new URL(href),URL,URLSearchParams});return anchors.map(a=>a.href);}
for(const file of ['index.html','en.html']){
 const html=read(file),base='https://tomoka-uzumaki-ai.github.io/private-care-check-jp/seller-finance/csv-ready/'+file;
 assert.match(html,/logic\.js\?v=20261030c/);assert.match(html,/app\.js\?v=20261030c/);assert.match(html,/outlet\.js\?v=20261030c/);
 const before=route(html,base);for(const suffix of ['?from=itch','?from=other','?from=gumroad.example'])assert.deepEqual(route(html,base+suffix),before);
 const changed=route(html,base+'?from=gumroad');assert.ok(changed.includes('https://jikkenlog.gumroad.com/l/csv-income-reconciliation-kit'));assert.ok(!changed.includes('https://tiny-deduction-lab.itch.io/csv-income-reconciliation-kit'));
 for(const u of changed.filter(u=>u.startsWith('/')))assert.equal(new URL(u,base).searchParams.get('from'),'gumroad','language/back/trial/map links keep source');
}
const example=read('../english/index.html');assert.match(example,/Shop links open another service\./);assert.doesNotMatch(example,/The shop link opens itch\.io\./);assert.match(example,/outlet\.js\?v=20261030c/);assert.ok(route(example,'https://tomoka-uzumaki-ai.github.io/private-care-check-jp/seller-finance/english/?from=gumroad').includes('/private-care-check-jp/seller-finance/csv-ready/en.html?from=gumroad'),'actual English example reaches English checker with source');
(async()=>{await formChecks('ja');await formChecks('en');console.log('PASS: JA/EN validation boundaries, real form eligibility/stale-state guards, input ZIP contents and privacy, EN instructions and exact-source storefront/language routing.');})().catch(e=>{console.error(e);process.exitCode=1;});
