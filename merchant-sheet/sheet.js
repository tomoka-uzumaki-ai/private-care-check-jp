(function (root) {
  'use strict';
  const rules = {
    region: { title: '配送対象', english: 'Delivery region', values: {
      jp: ['日本国内のみ', 'Japan only'], us: ['米国内のみ', 'United States only'], uk: ['英国のみ', 'United Kingdom only'] } },
    cancellation: { title: '注文取消', english: 'Order cancellation', values: {
      no: ['注文後の取消不可と記載', 'The source states that orders cannot be cancelled'],
      conditional: ['条件付きの取消案内あり。成立は保証されない', 'Conditional cancellation is described; availability is not guaranteed'] } },
    change: { title: '自己都合返品', english: 'Change-of-mind returns', values: {
      no: ['自己都合返品は対象外と記載', 'The source excludes change-of-mind returns'],
      unopened: ['未開封等の条件付き。期限・例外は原典を確認', 'Subject to conditions such as unopened packaging; verify deadlines and exclusions in the source'] } },
    defect: { title: '不良・誤配送の期限', english: 'Defective or incorrect goods deadline', values: {
      contact: ['受領後の日数内に連絡', 'Contact the seller within the stated number of days after receipt'],
      arrive: ['受領後の日数内に販売店へ到着', 'Returned goods must reach the seller within the stated number of days after receipt'] } },
    invoice: { title: '納品書', english: 'Delivery invoice', values: {
      included: ['納品書同封と記載。省略指定の可否は別確認', 'The source says a delivery invoice is enclosed; verify omission options separately'],
      none: ['納品書を同封しないと記載', 'The source says no delivery invoice is enclosed'] } },
    warranty: { title: '保証条件', english: 'Warranty conditions', values: {
      model: ['型番別の条件と証明が必要', 'Model-specific conditions and purchase evidence are required'] } }
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function publicURL(value) {
    try {
      if (typeof value !== 'string' || value.length > 2000) return null;
      const u = new URL(value);
      if (u.protocol !== 'https:' || !u.hostname || u.username || u.password) return null;
      if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname) || /\.(local|internal)$/.test(u.hostname) || u.hostname.includes(':')) return null;
      if ([...u.searchParams.keys()].some(k => /^(token|access_token|api_key|key|password|code|signature|sig|secret|authorization)$/i.test(k))) return null;
      return u.href;
    } catch { return null; }
  }
  function field(k, row, fallback) {
    if (!row || !row.value || row.value === 'unknown') return {known:false, jp:'未確認', en:'Not verified', value:'unknown', source:null};
    const rule = rules[k];
    if (!rule.values[row.value]) throw new Error(`${rule.title}の条件が不正です`);
    const source = publicURL(row.source || fallback);
    if (!source) throw new Error(`${rule.title}：公開のhttps原典URLが必要です。秘密を含むURLは使えません`);
    let [jp,en] = rule.values[row.value];
    const result = {known:true,value:row.value,source,jp,en};
    if (k === 'defect') {
      if (!Number.isInteger(row.days) || row.days < 1 || row.days > 365) throw new Error('不良対応の日数は1〜365の整数で入力してください');
      result.days = row.days;
      result.jp = row.value === 'contact' ? `受領後${row.days}日以内に販売店へ連絡する条件` : `受領後${row.days}日以内に販売店へ到着する条件`;
      result.en = row.value === 'contact' ? `Contact the seller within ${row.days} days after receipt` : `Returned goods must reach the seller within ${row.days} days after receipt`;
    }
    return result;
  }
  function build(input) {
    if (!input || !['synthetic','user_asserted'].includes(input.kind)) throw new Error('入力の区分が必要です');
    if (typeof input.item !== 'string' || !input.item.trim() || input.item.length > 200) throw new Error('対象商品・型番・版を記入してください（200文字以内）');
    if (!Array.isArray(input.channels) || input.channels.length !== 2) throw new Error('比較は2経路が必要です');
    const channels = input.channels.map((c,i) => {
      if (typeof c.name !== 'string' || !c.name.trim() || c.name.length > 100) throw new Error(`経路${i+1}の名称が必要です（100文字以内）`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(c.checked || '') || Number.isNaN(Date.parse(c.checked)) || new Date(c.checked+'T00:00:00Z').toISOString().slice(0,10) !== c.checked) throw new Error(`経路${i+1}の原典確認日を記入してください`);
      const today = new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Tokyo'});
      if (c.checked > today) throw new Error('原典確認日に未来の日付は指定できません');
      const facts = Object.fromEntries(Object.keys(rules).map(k => [k,field(k,(c.facts||{})[k],c.source)]));
      if (input.kind==='user_asserted' && Object.values(facts).some(v => v.source && /(^|\.)(example\.(com|org|net))$/.test(new URL(v.source).hostname))) throw new Error('example.com等は架空例です。実情報の原典としては使えません');
      if (Object.values(facts).some(v => v.known) && c.confirmed !== true) throw new Error(`経路${i+1}：入力した条件と原典を照合したことを確認してください`);
      return {name:c.name.trim(),checked:c.checked,facts};
    });
    if (channels[0].name===channels[1].name) throw new Error('2つの経路を区別できる名称にしてください');
    const unknown = [], different = [];
    for (const k of Object.keys(rules)) {
      const a=channels[0].facts[k],b=channels[1].facts[k];
      if (!a.known || !b.known) unknown.push(rules[k].title);
      else if (a.value!==b.value || a.days!==b.days) different.push(rules[k].title);
    }
    return {kind:input.kind,item:input.item.trim(),channels,unknown,different,
      notice:'入力した条件の整理です。原典の真偽・現注文への適用・商品同一性・法的妥当性を自動検証した結果ではありません。差があることと矛盾は別です。'};
  }
  function html(result) {
    let s = `<article lang="ja"><h1>購入条件の対訳草案</h1><p>対象：${esc(result.item)}</p><p>${result.kind==='synthetic'?'架空の入力例 / Synthetic example':'入力者が原典を照合した情報 / User-asserted source check'}</p><p>販売者承認前 / Not approved by the seller</p><p>${esc(result.notice)}</p><p>未確認：${esc(result.unknown.join('、')||'この限定6項目ではなし')}</p><p>経路間の差：${esc(result.different.join('、')||'取得範囲内では検出なし。完全一致の証明ではない')}</p>`;
    for (const c of result.channels) {
      s += `<section><h2>${esc(c.name)}</h2><p>原典確認日 / Source checked: ${esc(c.checked)}</p><dl>`;
      for (const [k,v] of Object.entries(c.facts)) s += `<dt>${esc(rules[k].title)} / ${esc(rules[k].english)}</dt><dd>${esc(v.jp)}<br><span lang="en">${esc(v.en)}</span>${v.source?`<br><a href="${esc(v.source)}" target="_blank" rel="noreferrer" referrerpolicy="no-referrer">原典 / Source</a>`:''}</dd>`;
      s += '</dl></section>';
    }
    return s+'<p lang="en">Verify the exact product, seller and current checkout conditions before using this draft. It does not approve a return or guarantee cancellation, warranty or medical suitability.</p></article>';
  }
  const api={rules,publicURL,build,html};
  if (typeof module==='object' && module.exports) module.exports=api;
  else root.ConditionSheet=api;
  if (typeof document==='undefined') return;
  const form=document.getElementById('editor');
  if (!form) return;
  const output=document.getElementById('output'),message=document.getElementById('message');
  const download=document.getElementById('download'),jsonButton=document.getElementById('json-download');
  let current=null;
  function invalidate(){current=null;output.replaceChildren();download.disabled=true;jsonButton.disabled=true;message.textContent='入力を変更しました。最新の条件で草案を作成してください。';}
  for (const key of Object.keys(rules)) {
    for(let i=0;i<2;i++) {
      const select=document.getElementById(`c${i}-${key}`);
      for(const [v,copy] of Object.entries(rules[key].values)) {const o=document.createElement('option');o.value=v;o.textContent=copy[0];select.append(o);}
    }
  }
  function read() {
    return {kind:document.getElementById('kind').value,item:document.getElementById('item').value,channels:[0,1].map(i=>({name:document.getElementById(`c${i}-name`).value,checked:document.getElementById(`c${i}-date`).value,source:document.getElementById(`c${i}-source`).value,confirmed:document.getElementById(`c${i}-confirm`).checked,facts:Object.fromEntries(Object.keys(rules).map(k=>[k,{value:document.getElementById(`c${i}-${k}`).value,source:document.getElementById(`c${i}-${k}-source`).value,...(k==='defect'?{days:Number(document.getElementById(`c${i}-days`).value)}:{})}]))}))};
  }
  form.addEventListener('input',invalidate);form.addEventListener('change',invalidate);
  form.addEventListener('submit',e=>{e.preventDefault();invalidate();try{current=build(read());output.innerHTML=html(current);download.disabled=false;jsonButton.disabled=false;message.textContent=`草案を作成しました。未確認${current.unknown.length}項目、経路間の差${current.different.length}項目。販売者の承認済み説明ではありません。`;}catch(err){message.textContent=err.message;}});
  document.getElementById('clear').addEventListener('click',()=>{form.reset();invalidate();message.textContent='入力と草案をクリアしました。保存済みのファイルは削除していません。';});
  document.getElementById('demo').addEventListener('click',()=>{
    form.reset();document.getElementById('kind').value='synthetic';document.getElementById('item').value='架空のケア用品 SAMPLE-01 / 版A';
    [0,1].forEach(i=>{document.getElementById(`c${i}-name`).value=i?'架空店の通販B':'架空店の通販A';document.getElementById(`c${i}-date`).value='2026-10-06';document.getElementById(`c${i}-source`).value='https://example.com/policy';document.getElementById(`c${i}-region`).value='jp';document.getElementById(`c${i}-defect`).value=i?'contact':'arrive';document.getElementById(`c${i}-days`).value='10';document.getElementById(`c${i}-confirm`).checked=true;});
    invalidate();message.textContent='すべて架空の入力例です。同じ10日でも、連絡期限と販売店到着期限の差を確認できます。';
  });
  function save(payload,type,name) {const url=URL.createObjectURL(new Blob([payload],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  download.addEventListener('click',()=>{if(current) save('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>購入条件の対訳草案</title><style>body{max-width:800px;margin:20px auto;padding:12px;font:16px/1.7 system-ui}dt{font-weight:bold;margin-top:20px}dd{margin:4px 0;overflow-wrap:anywhere}</style></head><body>'+html(current)+'</body></html>','text/html','purchase-condition-draft.html');});
  jsonButton.addEventListener('click',()=>{if(current)save(JSON.stringify(current,null,2),'application/json','purchase-condition-draft.json');});
})(typeof globalThis==='object'?globalThis:this);
