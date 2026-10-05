/* Public merchant conditions only; no account, product or personal details. */
const cards = Object.freeze({
  outer: ['荷物の外側', 'TENGA公式ストアは、外装と送り状で内容が分かりにくい扱いを案内しています。外側の配慮だけで、明細・メール・箱の中まで非表示になるわけではありません。', '配送当日の受取場所・通知・同居人が開封する可能性を、自分の状況で確かめる。', 'https://store.tenga.co.jp/shop/pages/guide'],
  statement: ['決済の利用明細', '同ストアのクレジットカード案内には、TENGAを含む店舗・会社名の明細表示があります。無地の荷物と、決済明細の表示は別です。', '明細を確認する人や通知の送り先が自分の希望に合うか、注文前に確認する。別の決済が匿名になるとは判定しない。', 'https://store.tenga.co.jp/shop/pages/guide'],
  invoice: ['箱に入る書類', '同ストアでは注文者・届け先・商品・価格を記した納品書が入ります。同梱しない選択はできないと案内されています。', '価格や注文者情報を伏せたい贈り方とは条件が合いません。外装やラッピングから書類の内容を推測しない。', 'https://store.tenga.co.jp/shop/pages/guide'],
  paper: ['後から届く請求書', 'GMO後払いでは、商品とは別に請求書が送られます。商品一箱だけで受取が終わると考えないようにします。', '請求書の送り先・表示と決済条件を確認する。他の決済にも明細・メール等があるため、痕跡が消える保証にはしない。', 'https://store.tenga.co.jp/shop/faq'],
  pickup: ['自宅以外の受取', '同ストアの注文時にはコンビニ受取を指定できません。配送会社側で変更できる場合があるという案内は、すべての荷物で可能という意味ではありません。', '対象の荷物・配送会社・申込条件を注文前に確認する。指定できると推測して注文しない。', 'https://store.tenga.co.jp/shop/faq'],
  gift: ['相手へ直接贈る', '同ストアは贈答でも納品書を同梱します。プレゼント用の外装と、受取人の希望・同梱書類を分けて考えます。', '相手がこの種の贈り物を望むこと、受取方法と価格等の表示を了解していることを先に確認する。未確認なら直接発送を決めない。', 'https://store.tenga.co.jp/shop/faq']
});
function evaluate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Choose the listed conditions.');
  for (const [k,v] of Object.entries(input)) if (!Object.hasOwn(cards,k) || typeof v !== 'boolean') throw new TypeError('Unexpected condition.');
  return Object.keys(cards).filter(k=>input[k]===true).map(k=>({id:k,title:cards[k][0],fact:cards[k][1],next:cards[k][2],source:cards[k][3]}));
}
if (typeof module !== 'undefined') module.exports = { evaluate, cards };
if (typeof document !== 'undefined') {
  const status=document.getElementById('result');
  const draw=()=>{
    const input={};for(const k of Object.keys(cards)) input[k]=document.getElementById(k).checked;
    const rows=evaluate(input);status.replaceChildren();
    if (!rows.length) {const p=document.createElement('p');p.textContent='確認したい項目を選ぶと、公式条件と次の確認が表示されます。未選択は条件への同意や購入適合の判定ではありません。';status.append(p);return;}
    for(const r of rows){const section=document.createElement('section');section.className='card';const h=document.createElement('h3');h.textContent=r.title;const fact=document.createElement('p');fact.textContent=r.fact;const next=document.createElement('p');next.textContent=r.next;const a=document.createElement('a');a.href=r.source;a.textContent='この条件の公式案内を確認';a.rel='noreferrer';a.referrerPolicy='no-referrer';section.append(h,fact,next,a);status.append(section);}
  };
  for(const k of Object.keys(cards))document.getElementById(k).addEventListener('change',draw);
  document.getElementById('reset').addEventListener('click',()=>{for(const k of Object.keys(cards))document.getElementById(k).checked=false;draw();});
  draw();
}
