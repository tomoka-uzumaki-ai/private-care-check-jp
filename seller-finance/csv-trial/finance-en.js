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
    if (!pattern.test(s)) throw new Error(label + ': enter a nonnegative ' + (currency === 'JPY' ? 'whole number' : 'number with up to 2 decimal places') + '.');
    const [whole, fraction = ''] = s.split('.');
    const result = Number(whole) * factors[currency] + (currency === 'USD' ? Number(fraction.padEnd(2, '0')) : 0);
    if (!Number.isSafeInteger(result)) throw new Error(label + ': amount exceeds safe precision.');
    return result;
  }
  function nullableSum(values) {
    if (values.some(x => x === null)) return null;
    let n=0;
    for(const v of values){n+=v;if (!Number.isSafeInteger(n)) throw new Error('Total exceeds safe precision; split the reporting scope.');}
    return n;
  }
  function label(value, field, maximum) {
    if (typeof value !== 'string' || value.length > maximum || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new Error(field + ' is invalid.');
    return value.trim();
  }
  function calculate(input) {
    if (!input || input.version !== 1 || !['example','entered'].includes(input.kind)) throw new Error('Use version 1 of this tool format.');
    if (!Array.isArray(input.entries) || input.entries.length < 1 || input.entries.length > 100) throw new Error('Use 1 to 100 income paths.');
    const period = label(input.period || '', 'reporting period', 120);
    if (!period) throw new Error('reporting period.');
    // Validate all currencies before restoring/importing any UI state.
    for (const c of currencies) {
      const cost = input.costs && input.costs[c];
      if (!cost || typeof cost.complete !== 'boolean') throw new Error(c + ' needs cost confirmation.');
      const paid = money(cost.paid, c, c + ' paid costs');
      if (cost.complete && paid === null) throw new Error(c + ' confirmed costs need an amount; use 0 only for confirmed no cost.');
    }
    const warnings = [];
    const rows = input.entries.map((entry, i) => {
      const title = 'Path ' + (i + 1);
      if (!entry || !currencies.includes(entry.currency) || !types.includes(entry.type) || !['gross','net'].includes(entry.basis)) throw new Error(title + ' has an invalid currency/type/basis.');
      const name = label(entry.name || '', title + ' name', 100);
      if (!name) throw new Error(title + ' needs a name.');
      const c = entry.currency;
      const amount = money(entry.amount, c, title + ' reported amount');
      const refunds = entry.basis === 'gross' ? money(entry.refunds, c, title + ' refunds') : null;
      const fees = entry.basis === 'gross' ? money(entry.platformFees, c, title + ' platform fees') : null;
      const entitlement = entry.basis === 'net' ? amount : amount === null || refunds === null || fees === null ? null : amount - refunds - fees;
      const received = money(entry.received, c, title + ' cash received');
      const payoutFees = money(entry.payoutFees, c, title + ' payout fees');
      const remaining = entitlement === null || received === null || payoutFees === null ? null : entitlement - payoutFees - received;
      if (remaining !== null && remaining < 0) warnings.push(name + ': cash received plus payout fees exceeds earned income; check previous periods or double-deducted fees.');
      if (entitlement !== null && entitlement < 0) warnings.push(name + ': earned income is negative; align refund scope to this reporting period.');
      return {name, type:entry.type, currency:c, basis:entry.basis, entitlement, received, payoutFees, remaining};
    });
    const totals = currencies.filter(c => rows.some(x => x.currency === c) || money(input.costs[c].paid,c,c+'の費用') !== null).map(c => {
      const list = rows.filter(x => x.currency === c);
      const cost = input.costs && input.costs[c];
      if (!cost || typeof cost.complete !== 'boolean') throw new Error(c + ' needs cost confirmation.');
      const paidCosts = money(cost.paid, c, c + ' paid costs');
      if (cost.complete && paidCosts === null) throw new Error(c + ' confirmed costs need an amount; use 0 only for confirmed no cost.');
      const earned = nullableSum(list.map(x => x.entitlement));
      const received = nullableSum(list.map(x => x.received));
      const payoutFees = nullableSum(list.map(x => x.payoutFees));
      const netAfterPayout = earned === null || payoutFees === null ? null : earned - payoutFees;
      // Actual bank receipts already exclude payout fees: never deduct them twice.
      const cashResult = received === null || paidCosts === null || !cost.complete ? null : received - paidCosts;
      const remaining = nullableSum(list.map(x => x.remaining));
      for(const v of [netAfterPayout,cashResult])if(v!==null&&!Number.isSafeInteger(v))throw new Error('Result exceeds safe precision; split the reporting scope.');
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
    if (value === null) return 'Unknown';
    const v = Math.abs(value), whole = Math.floor(v/factors[currency]);
    return (value<0?'-':'') + whole.toLocaleString('ja-JP') + (currency==='USD'?'.'+String(v%100).padStart(2,'0'):'') + ' ' + currency;
  }
  const api = {calculate, money, csv, format, factors};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FinanceDesk = api;
})(typeof window === 'undefined' ? {} : window);
