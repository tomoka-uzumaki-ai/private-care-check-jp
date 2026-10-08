'use strict';
(function(root){
const columns=['row','period','name','type','currency','basis','amount','refunds','platformFees','received','payoutFees','costPaid','costComplete'];
const constants={row:['income','cost'],period:null,currency:['JPY','USD'],type:['sale','membership','referral','reading','other'],basis:['gross','net'],costComplete:['true','false']};
function headers(h){if(!Array.isArray(h)||h.length>200||h.some(x=>typeof x!=='string'||!x.trim()||x.length>120)||new Set(h.map(x=>x.trim().toLowerCase())).size!==h.length)throw Error('headers');return h;}
function parseCSV(text){text=text.replace(/^\uFEFF/,'');const rows=[];let row=[],cell='',quoted=false,after=false;for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;after=true;}}else cell+=c;continue;}if(after&&![',','\n','\r'].includes(c))throw Error('quotes');if(c==='"'){if(cell||after)throw Error('quotes');quoted=true;}else if(c===','){row.push(cell);cell='';after=false;}else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';after=false;}else cell+=c;}if(quoted)throw Error('quotes');if(row.length||cell||after){row.push(cell);rows.push(row);}if(rows.length<2||rows.length>5001)throw Error('rows');headers(rows[0]);if(rows.some(r=>r.length!==rows[0].length))throw Error('width');return rows;}
function encodeCSV(rows){return rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n')+'\r\n';}
function validateMappings(mapping,h){headers(h);if(!mapping||typeof mapping!=='object'||Array.isArray(mapping)||Object.keys(mapping).length!==columns.length||Object.keys(mapping).some(k=>!columns.includes(k)))throw Error('recipe');const used=[];for(const col of columns){const v=mapping[col];if(v!==null&&(typeof v!=='string'||!h.includes(v)))throw Error('missing');if(v!==null)used.push(v);}if(new Set(used).size!==used.length)throw Error('duplicate');return mapping;}
function recipe(mapping,h){validateMappings(mapping,h);return {format:'income-column-recipe',version:1,mappings:{...mapping}};}
function readRecipe(text,h){if(typeof text!=='string'||new TextEncoder().encode(text).length>32768)throw Error('recipeSize');let r;try{r=JSON.parse(text);}catch{throw Error('recipe');}if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).length!==3||Object.keys(r).some(k=>!['format','version','mappings'].includes(k))||r.format!=='income-column-recipe'||r.version!==1)throw Error('recipe');return validateMappings(r.mappings,h);}
function convert(rows,mapping,values,confirmed,validator){
 validateMappings(mapping,rows[0]);
 if(!values||Object.keys(values).some(k=>!Object.hasOwn(constants,k)))throw Error('constants');
 for(const [col,v]of Object.entries(values)){if(v==='')continue;if(mapping[col]!==null)throw Error('conflict');if(!confirmed[col]||typeof v!=='string'||(col==='period'?!/^\d{4}-(0[1-9]|1[0-2])$/.test(v):!constants[col].includes(v)))throw Error('constantConfirm');}
 if(!confirmed.meanings)throw Error('meanings');
 const output=rows.slice(1).map(r=>columns.map(col=>{const h=mapping[col];let v=h===null?(values[col]||''):r[rows[0].indexOf(h)];if(col==='name'&&/^\s*[=+\-@]/.test(v))v="'"+v;return v;}));
 for(const r of output){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(r[1]))throw Error('period');if(r[0].trim()==='income'&&r[5].trim()==='net'&&(r[7].trim()||r[8].trim()))throw Error('netFees');}
 const csv=encodeCSV([columns,...output]);const check=validator([{name:'mapped-income.csv',text:csv}]);const errors=check.errors.filter(e=>!(['収入行が必要です','At least one income row required'].includes(e)&&output.every(r=>r[0].trim()==='cost')));if(errors.length)throw Object.assign(Error('validation'),{details:errors});return {csv,count:output.length,income:output.some(r=>r[0].trim()==='income')};
}
const api={columns,constants,headers,parseCSV,encodeCSV,recipe,readRecipe,convert};if(typeof module!=='undefined')module.exports=api;else root.IncomeMapping=api;
})(typeof window==='undefined'?globalThis:window);
