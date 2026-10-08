'use strict';
// Integer minor units keep currency calculations and comparisons exact.
(function (root) {
  const currencies = ['JPY', 'USD'];
  const types = ['sale', 'membership', 'referral', 'reading', 'other'];
  const factors = {JPY: 1, USD: 100};
  function money(value, currency, label) {
    if (value === '' || value === null || value === undefined) return null;
    const s = String(value).trim();
    const pattern = currency === 'JPY' ? /^\d{1,12}$/ : /^\d{1,12}(?:\.\d{1,2})?$/;
    if (!pattern.test(s)) throw new Error(label + '：0以上の' + (currency === 'JPY' ? '整数' : '小数2桁までの数字') + 'を入力してください。');
    const [whole, fraction = ''] = s.split('.');
    const result = Number(whole) * factors[currency] + (currency === 'USD' ? Number(fraction.padEnd(2, '0')) : 0);
    if (!Number.isSafeInteger(result)) throw new Error(label + '：扱える金額を超えています。');
    return result;
  }
  function nullableSum(values) {
    if (values.some(x => x === null)) return null;
    let n=0;
    for(const v of values){n+=v;if (!Number.isSafeInteger(n)) throw new Error('合計金額が正確に扱える範囲を超えています。集計単位を分けてください。');}
    return n;
  }
  function label(value, field, maximum) {
    if (typeof value !== 'string' || value.length > maximum || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new Error(field + 'が正しくありません。');
    return value.trim();
  }
  function calculate(input) {
    if (!input || input.version !== 1 || !['example','entered'].includes(input.kind)) throw new Error('このツールの形式1のデータを指定してください。');
    if (!Array.isArray(input.entries) || input.entries.length < 1 || input.entries.length > 100) throw new Error('収入経路は1〜100件で整理してください。');
    const period = label(input.period || '', '集計単位', 120);
    if (!period) throw new Error('集計単位を入力してください。');
    // Validate all currencies before restoring/importing any UI state.
    for (const c of currencies) {
      const cost = input.costs && input.costs[c];
      if (!cost || typeof cost.complete !== 'boolean') throw new Error(c + 'の費用確認欄が必要です。');
      const paid = money(cost.paid, c, c + 'の支払済み費用');
      if (cost.complete && paid === null) throw new Error(c + 'の費用を確認済みにする場合は、金額を入力してください。無ければ0です。');
    }
    const warnings = [];
    const rows = input.entries.map((entry, i) => {
      const title = '経路' + (i + 1);
      if (!entry || !currencies.includes(entry.currency) || !types.includes(entry.type) || !['gross','net'].includes(entry.basis)) throw new Error(title + 'の通貨・収入区分・報告額の種類が不正です。');
      const name = label(entry.name || '', title + 'の名前', 100);
      if (!name) throw new Error(title + 'の名前を入力してください。');
      const c = entry.currency;
      const amount = money(entry.amount, c, title + 'の報告額');
      const refunds = entry.basis === 'gross' ? money(entry.refunds, c, title + 'の返金・取消') : null;
      const fees = entry.basis === 'gross' ? money(entry.platformFees, c, title + 'の販売手数料') : null;
      const entitlement = entry.basis === 'net' ? amount : amount === null || refunds === null || fees === null ? null : amount - refunds - fees;
      const received = money(entry.received, c, title + 'の実入金');
      const payoutFees = money(entry.payoutFees, c, title + 'の入金手数料');
      const remaining = entitlement === null || received === null || payoutFees === null ? null : entitlement - payoutFees - received;
      if (remaining !== null && remaining < 0) warnings.push(name + '：実入金と手数料の合計が確定収入を超えています。前の集計分や、二重に引いた手数料が混じっていないか確認してください。');
      if (entitlement !== null && entitlement < 0) warnings.push(name + '：確定収入がマイナスです。返金・取消の対象を同じ集計単位にそろえてください。');
      return {name, type:entry.type, currency:c, basis:entry.basis, entitlement, received, payoutFees, remaining};
    });
    const totals = currencies.filter(c => rows.some(x => x.currency === c) || money(input.costs[c].paid,c,c+'の費用') !== null).map(c => {
      const list = rows.filter(x => x.currency === c);
      const cost = input.costs && input.costs[c];
      if (!cost || typeof cost.complete !== 'boolean') throw new Error(c + 'の費用確認欄が必要です。');
      const paidCosts = money(cost.paid, c, c + 'の支払済み費用');
      if (cost.complete && paidCosts === null) throw new Error(c + 'の費用を確認済みにする場合は、金額を入力してください。無ければ0です。');
      const earned = nullableSum(list.map(x => x.entitlement));
      const received = nullableSum(list.map(x => x.received));
      const payoutFees = nullableSum(list.map(x => x.payoutFees));
      const netAfterPayout = earned === null || payoutFees === null ? null : earned - payoutFees;
      // Actual bank receipts already exclude payout fees: never deduct them twice.
      const cashResult = received === null || paidCosts === null || !cost.complete ? null : received - paidCosts;
      const remaining = nullableSum(list.map(x => x.remaining));
      for(const v of [netAfterPayout,cashResult])if(v!==null&&!Number.isSafeInteger(v))throw new Error('計算結果が正確に扱える範囲を超えています。集計単位を分けてください。');
      return {currency:c, earned, netAfterPayout, received, payoutFees, paidCosts, costsComplete:cost.complete, cashResult, remaining,
        positiveUnpaid:nullableSum(list.filter(x => x.remaining !== null && x.remaining > 0).map(x=>x.remaining)),
        unknownReceipts:list.filter(x => x.received === null).length,
        unknownEntitlements:list.filter(x => x.entitlement === null).length};
    });
    return {version:1, period, kind:input.kind, rows, totals, warnings};
  }
  function csv(rows) {
    const cell = x => {
      let s = x === null || x === undefined ? '' : String(x);
      // Keep untrusted labels inert when a CSV is opened in a spreadsheet.
      if (/^[\s]*[=+\-@]/.test(s) && typeof x !== 'number') s = "'" + s;
      return '"' + s.replace(/"/g,'""') + '"';
    };
    return '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n');
  }
  function format(value, currency) {
    if (value === null) return '未確認';
    const v = Math.abs(value), whole = Math.floor(v/factors[currency]);
    return (value<0?'-':'') + whole.toLocaleString('ja-JP') + (currency==='USD'?'.'+String(v%100).padStart(2,'0'):'') + ' ' + currency;
  }
  const api = {calculate, money, csv, format, factors};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FinanceDesk = api;
})(typeof window === 'undefined' ? {} : window);
