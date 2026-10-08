'use strict';
(function(root){
const HEADER=['row','period','name','type','currency','basis','amount','refunds','platformFees','received','payoutFees','costPaid','costComplete'];
function keys(value,allowed,label){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!allowed.includes(k)))throw Error(label+'の形式・キーが不正です。');}
function validateInput(data,finance){
 keys(data,['version','period','kind','entries','costs'],'入力');
 if(data.version!==1||typeof data.period!=='string'||!['entered','example'].includes(data.kind))throw Error('形式1の入力JSONが必要です。');
 if(!Array.isArray(data.entries)||data.entries.length<1||data.entries.length>100)throw Error('収入経路は1〜100件です。');
 for(const e of data.entries){keys(e,['name','type','currency','basis','amount','refunds','platformFees','received','payoutFees'],'経路');for(const k of ['name','type','currency','basis'])if(typeof e[k]!=='string')throw Error('経路の文字列欄が不正です。');for(const k of ['amount','refunds','platformFees','received','payoutFees'])if(e[k]!==undefined&&e[k]!==null&&typeof e[k]!=='string')throw Error('金額は文字列または空欄で指定してください。');}
 keys(data.costs,['JPY','USD'],'費用');for(const c of ['JPY','USD']){keys(data.costs[c],['paid','complete'],c+'費用');if(typeof data.costs[c].complete!=='boolean'||(data.costs[c].paid!==undefined&&data.costs[c].paid!==null&&typeof data.costs[c].paid!=='string'))throw Error('費用の形式が不正です。');}
 return finance.calculate(data);
}
function inputCSV(data,period,confirmed,finance){
 validateInput(data,finance);
 if(!confirmed||typeof period!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))throw Error('CSVの対象月をYYYY-MMで入力し、同じ集計対象であることを確認してください。');
 const names=new Set();for(const e of data.entries){const key=e.currency+'|'+e.name.trim();if(names.has(key))throw Error('同一通貨・経路名が重複しています。CSV用に経路名を分けてください。');names.add(key);}
 const rows=data.entries.map(e=>['income',period,e.name.trim(),e.type,e.currency,e.basis,e.amount??'',e.basis==='gross'?(e.refunds??''):'',e.basis==='gross'?(e.platformFees??''):'',e.received??'',e.payoutFees??'','','']);
 for(const c of ['JPY','USD'])rows.push(['cost',period,'','',c,'','','','','','',data.costs[c].paid??'',String(data.costs[c].complete)]);
 return {csv:finance.csv([HEADER,...rows]),kind:data.kind,period,sourcePeriod:data.period};
}
const api={HEADER,validateInput,inputCSV};if(typeof module!=='undefined')module.exports=api;else root.FinanceInputCSV=api;
})(typeof window==='undefined'?globalThis:window);
