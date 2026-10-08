'use strict';
const $ = id => document.getElementById(id);
let nextId = 0, current = null, inputEpoch = 0;
const typeNames = {sale:'単品販売',membership:'会員・継続収入',referral:'紹介報酬',reading:'読まれた量による収入',other:'その他'};
const fields = [['amount','報告額'],['refunds','返金・取消額'],['platformFees','販売・決済手数料'],['received','実際に着金した額'],['payoutFees','着金時に引かれた入金手数料']];
function el(tag, text, cls) { const n = document.createElement(tag); if(text !== undefined) n.textContent=text; if(cls)n.className=cls; return n; }
function select(options, value) { const s=el('select'); for(const [v,t] of options){const o=el('option',t);o.value=v;s.append(o);}s.value=value;return s; }
function control(parent, name, caption, input, id) {
  const box=el('div'); const label=el('label',caption); input.id=id; label.htmlFor=id;input.dataset.field=name;box.append(label,input);parent.append(box);return box;
}
function invalidate(message='入力が変わりました。結果を作り直してください。') { inputEpoch++;current=null;$('results').hidden=true;$('summary').replaceChildren();$('breakdown').replaceChildren();$('warnings').replaceChildren();$('message').textContent=message; }
function addEntry(values={}) {
  if(document.querySelectorAll('.entry').length>=100) { $('message').textContent='一度の集計は100経路までです。集計対象を分けて保存してください。';return; }
  const id=++nextId; const f=el('fieldset',undefined,'entry');f.dataset.row=id;f.append(el('legend','収入経路'));
  const header=el('div',undefined,'entry-title');header.append(el('p','名前だけで分かる単位に分けます。','quiet'));const remove=el('button','この経路を除く','secondary');remove.type='button';remove.addEventListener('click',()=>{if(document.querySelectorAll('.entry').length===1){$('message').textContent='最後の経路は残します。全体を消す場合は「画面の入力をクリア」を使ってください。';return;}f.remove();invalidate();});header.append(remove);f.append(header);
  const grid=el('div',undefined,'entry-grid');f.append(grid);
  const name=el('input');name.maxLength=100;name.placeholder='例：通販・9月分';name.value=values.name||'';control(grid,'name','経路名・集計単位',name,'name-'+id);
  control(grid,'type','収入の種類',select(Object.entries(typeNames),values.type||'sale'),'type-'+id);
  const currency=select([['JPY','JPY · 円'],['USD','USD · 米ドル']],values.currency||'JPY');control(grid,'currency','この経路の通貨',currency,'currency-'+id);
  const basis=select([['gross','返金・販売手数料を引く前'],['net','返金・販売手数料を引いた後']],values.basis||'net');control(grid,'basis','報告額はどちらですか',basis,'basis-'+id);
  const boxes={};for(const [key,caption] of fields){const input=el('input');input.inputMode='decimal';input.placeholder='不明なら空欄';input.value=values[key]??'';boxes[key]=control(grid,key,caption,input,key+'-'+id);}
  function refreshBasis(){const gross=basis.value==='gross';boxes.refunds.hidden=!gross;boxes.platformFees.hidden=!gross;f.querySelector('label[for="amount-'+id+'"]').textContent=gross?'控除前の売上・報酬額':'控除後の確定収入額';}
  basis.addEventListener('change',()=>{for(const key of ['amount','refunds','platformFees'])f.querySelector('[data-field="'+key+'"]').value='';refreshBasis();invalidate('控除前後の意味が変わるため報告額をクリアしました。原典の額を入力し直してください。');});
  currency.addEventListener('change',()=>{for(const [key]of fields)f.querySelector('[data-field="'+key+'"]').value='';invalidate('通貨変更は換算ではありません。この経路の金額をクリアしました。指定通貨の原典の額を入力してください。');});
  refreshBasis();f.append(el('p','控除後の確定額には、返金・販売手数料を再入力しません。実入金はこの集計分に対応した銀行等への着金額です。入金手数料が不明なら空欄のままにします。','quiet'));
  $('entries').append(f);
}
function inputData(){return {version:1,period:$('period').value.trim(),kind:$('kind').value,entries:Array.from(document.querySelectorAll('.entry')).map(row=>{const x={};for(const n of row.querySelectorAll('[data-field]'))x[n.dataset.field]=n.value.trim();if(x.basis==='net'){x.refunds='';x.platformFees='';}return x;}),costs:Object.fromEntries(['JPY','USD'].map(c=>[c,{paid:$('cost-'+c).value.trim(),complete:$('complete-'+c).checked}]))};}
function render(result){
  $('summary').replaceChildren();$('breakdown').replaceChildren();$('warnings').replaceChildren();
  $('result-title').textContent=(result.kind==='example'?'架空例の集計':'入力した数字の集計')+' · '+result.period;
  for(const t of result.totals){const section=el('section',undefined,'summary-currency');section.append(el('h3',t.currency+'の集計'));const grid=el('dl',undefined,'metric-grid');
    for(const [title,value,highlight]of [['確定収入（入金手数料前）',t.earned,false],['実際の入金',t.received,false],['支払済み費用',t.costsComplete?t.paidCosts:null,false],['回収済みの差額',t.cashResult,true]]){const block=el('div',undefined,'metric'+(highlight?' highlight':''));block.append(el('dt',title),el('dd',FinanceDesk.format(value,t.currency)));grid.append(block);}section.append(grid);
    section.append(el('p','未回収の計算値：'+FinanceDesk.format(t.remaining,t.currency)+' ／ 入金手数料：'+FinanceDesk.format(t.payoutFees,t.currency),'quiet'));
    if(t.unknownEntitlements||t.unknownReceipts||!t.costsComplete)section.append(el('p','未確認：確定額 '+t.unknownEntitlements+'経路、実入金 '+t.unknownReceipts+'経路'+(!t.costsComplete?'、この対象の費用全体':'')+'。不明を0に置き換えていません。','warning'));
    if(result.kind==='example')section.append(el('p','これは架空の例です。実売・実入金・利益の実績ではありません。','quiet'));
    $('summary').append(section);
  }
  $('breakdown').append(el('h3','経路別の内訳'));
  for(const r of result.rows){const box=el('article',undefined,'line-item');box.append(el('h3',r.name+' · '+typeNames[r.type]),el('p','確定収入：'+FinanceDesk.format(r.entitlement,r.currency)+' ／ 実入金：'+FinanceDesk.format(r.received,r.currency)),el('p','未回収の計算値：'+FinanceDesk.format(r.remaining,r.currency)));$('breakdown').append(box);}
  for(const warning of result.warnings)$('warnings').append(el('p',warning,'warning'));
  $('results').hidden=false;$('message').textContent='集計しました。確定額、実入金、費用の対象が同じか確認してください。';
}
function download(name, body, mime){const blob=new Blob([body],{type:mime});const url=URL.createObjectURL(blob);const a=el('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function escape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function reportHTML(){return '<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>収支の確認票</title><style>body{font:17px/1.7 system-ui;max-width:900px;margin:auto;padding:24px}h1{font-size:28px}dt{font-weight:bold}dd{margin:4px 0 20px}section,article{border-top:1px solid #ccd7d1;padding-top:15px}p,h1,h2,h3,dd{overflow-wrap:anywhere}</style><h1>'+escape($('result-title').textContent)+'</h1><p>入力値の整理。入金や税務上の利益を認定する資料ではありません。</p>'+$('summary').innerHTML+$('breakdown').innerHTML+$('warnings').innerHTML+'<p>回収済みの差額＝この対象の実入金−支払済み費用。実入金へ入金手数料を再控除しません。未払費用・労働時間・税金を含む総合的な純利益とは異なります。</p><p>JPYとUSDは換算・合算していません。</p></html>';}
function restore(data){FinanceInputCSV.validateInput(data,FinanceDesk);$('csv-period-confirm').checked=false;$('entries').replaceChildren();$('period').value=data.period;$('kind').value=data.kind;for(const entry of data.entries)addEntry(entry);for(const c of ['JPY','USD']){$('cost-'+c).value=data.costs[c].paid??'';$('complete-'+c).checked=data.costs[c].complete;}invalidate('入力を読み込みました。内容を確認して、結果を作成してください。');}
const sample={version:1,period:'架空例 · 9月分の2経路',kind:'example',entries:[{name:'単品・A売場',type:'sale',currency:'JPY',basis:'gross',amount:'10000',refunds:'1000',platformFees:'1800',received:'7000',payoutFees:'200'},{name:'紹介・B経路',type:'referral',currency:'JPY',basis:'net',amount:'3000',refunds:'',platformFees:'',received:'0',payoutFees:'0'}],costs:{JPY:{paid:'2000',complete:true},USD:{paid:'',complete:false}}};
$('example').addEventListener('click',()=>restore(sample));$('add').addEventListener('click',()=>{addEntry();invalidate();});
$('desk').addEventListener('input',()=>invalidate());$('desk').addEventListener('submit',e=>{e.preventDefault();try{const data=inputData();current={input:data,result:FinanceDesk.calculate(data)};render(current.result);}catch(error){invalidate(error.message);}});
$('save').addEventListener('click',()=>{try{const data=inputData();FinanceDesk.calculate(data);download('seller-finance-input.json',JSON.stringify(data,null,2)+'\n','application/json');$('message').textContent='入力JSONを保存しました。端末内で管理してください。';}catch(error){$('message').textContent=error.message;}});
$('load').addEventListener('change',async()=>{const file=$('load').files[0],token=inputEpoch;if(!file)return;try{if(file.size>512000)throw new Error('入力JSONは512KB以下にしてください。');const data=JSON.parse(await file.text());if(token!==inputEpoch)throw new Error('読み込み中に入力が変わりました。もう一度ファイルを選んでください。');restore(data);}catch(error){$('message').textContent='読み込めませんでした。現在の入力は保持しています。 '+error.message;}finally{$('load').value='';}});
$('csv').addEventListener('click',()=>{if(!current)return;const rows=[['区分',current.result.kind==='example'?'架空例':'入力集計'],['対象',current.result.period],['通貨','確定収入（入金手数料前）','実入金','入金手数料','費用全体確認済み','支払済み費用','回収済みの差額','未回収の計算値']];for(const t of current.result.totals)rows.push([t.currency,...[t.earned,t.received,t.payoutFees].map(v=>FinanceDesk.format(v,t.currency)),t.costsComplete?'確認済み':'未確認',...[(t.costsComplete?t.paidCosts:null),t.cashResult,t.remaining].map(v=>FinanceDesk.format(v,t.currency))]);rows.push([],['経路','収入区分','通貨','確定収入','実入金','未回収の計算値']);for(const r of current.result.rows)rows.push([r.name,typeNames[r.type],r.currency,...[r.entitlement,r.received,r.remaining].map(v=>FinanceDesk.format(v,r.currency))]);download('seller-finance-summary.csv',FinanceDesk.csv(rows),'text/csv;charset=utf-8');});
$('report').addEventListener('click',()=>{if(current)download('seller-finance-report.html',reportHTML(),'text/html;charset=utf-8');});
$('csv-period').addEventListener('input',()=>{$('csv-period-confirm').checked=false;});
$('desk').addEventListener('input',()=>{$('csv-period-confirm').checked=false;});
$('input-csv-meta').addEventListener('click',()=>{try{const saved=FinanceInputCSV.inputCSV(inputData(),$('csv-period').value,$('csv-period-confirm').checked,FinanceDesk);download('seller-finance-'+saved.kind+'-'+saved.period+'-metadata.json',JSON.stringify({format:'income-csv-metadata',version:1,kind:saved.kind,period:saved.period,sourcePeriod:saved.sourcePeriod},null,2)+'\n','application/json');$('message').textContent='CSVの区分・対象メモを保存しました。行データや金額は含みません。';}catch(error){$('message').textContent=error.message;}});
$('input-csv').addEventListener('click',()=>{try{const saved=FinanceInputCSV.inputCSV(inputData(),$('csv-period').value,$('csv-period-confirm').checked,FinanceDesk);download('seller-finance-'+(saved.kind==='example'?'fictional':'entered')+'-'+saved.period+'-input.csv',saved.csv,'text/csv;charset=utf-8');$('message').textContent='13列の入力CSVを保存しました。次の集計でも'+(saved.kind==='example'?'架空例':'自分の集計データ')+'の区分を選んでください。元ラベル・区分は入力JSONで保存できます。';}catch(error){$('message').textContent=error.message;}});
$('clear').addEventListener('click',()=>{$('period').value='';$('kind').value='entered';$('csv-period').value='';$('csv-period-confirm').checked=false;$('entries').replaceChildren();for(const c of ['JPY','USD']){$('cost-'+c).value='';$('complete-'+c).checked=false;}addEntry();invalidate('画面の入力と結果を消しました。保存済みのファイルは削除されません。');});
addEntry();
