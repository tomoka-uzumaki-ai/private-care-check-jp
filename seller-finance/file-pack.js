/* Small stored-ZIP writer. Callers choose from the fixed input/output names below. */
(function(root){'use strict';
const allowed=new Set(['content.json','art/station.png','art/rain.png','art/harbor.png','finance-summary.csv','finance-summary.json','README.txt','prepared/input-01.csv','prepared/input-02.csv','prepared/input-03.csv','prepared/input-04.csv','prepared/input-05.csv','manifest.json']);
const MAX_FILE=15*1024*1024,MAX_TOTAL=48*1024*1024;
const table=Uint32Array.from({length:256},(_,i)=>{for(let j=0;j<8;j++)i=(i&1)?0xedb88320^(i>>>1):i>>>1;return i>>>0});
function crc32(data){let c=0xffffffff;for(const b of data)c=table[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0}
function zip(files){
 if(!Array.isArray(files)||!files.length||files.length>allowed.size)throw Error('Invalid ZIP file list');
 const seen=new Set;let total=0,offset=0;const enc=new TextEncoder();const entries=files.map(f=>{
  if(!f||!allowed.has(f.name)||seen.has(f.name)||!(f.data instanceof Uint8Array))throw Error('Unsupported or duplicate ZIP entry');
  seen.add(f.name);if(f.data.length>MAX_FILE)throw Error('ZIP entry exceeds 15 MiB');total+=f.data.length;if(total>MAX_TOTAL)throw Error('ZIP exceeds 48 MiB');
  return {name:enc.encode(f.name),data:f.data,crc:crc32(f.data)};
 });
 const chunks=[],central=[];const put16=(v,p,n)=>v.setUint16(p,n,true),put32=(v,p,n)=>v.setUint32(p,n,true);
 for(const e of entries){const local=new Uint8Array(30+e.name.length),v=new DataView(local.buffer);put32(v,0,0x04034b50);put16(v,4,20);put16(v,6,0x800);put16(v,12,0x21);put32(v,14,e.crc);put32(v,18,e.data.length);put32(v,22,e.data.length);put16(v,26,e.name.length);local.set(e.name,30);
  const dir=new Uint8Array(46+e.name.length),d=new DataView(dir.buffer);put32(d,0,0x02014b50);put16(d,4,20);put16(d,6,20);put16(d,8,0x800);put16(d,14,0x21);put32(d,16,e.crc);put32(d,20,e.data.length);put32(d,24,e.data.length);put16(d,28,e.name.length);put32(d,42,offset);dir.set(e.name,46);central.push(dir);chunks.push(local,e.data);offset+=local.length+e.data.length;
 }
 const centralSize=central.reduce((n,c)=>n+c.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);put32(v,0,0x06054b50);put16(v,8,entries.length);put16(v,10,entries.length);put32(v,12,centralSize);put32(v,16,offset);chunks.push(...central,end);
 const out=new Uint8Array(offset+centralSize+22);let p=0;for(const c of chunks){out.set(c,p);p+=c.length}return out;
}
const api={zip};if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.FilePack=api;
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null);
