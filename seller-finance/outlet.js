/* Preserve an explicitly selected storefront across the free CSV workflow. */
'use strict';
(() => {
  if (new URLSearchParams(location.search).get('from') !== 'gumroad') return;
  const paid = 'https://tiny-deduction-lab.itch.io/csv-income-reconciliation-kit';
  const gumroad = 'https://jikkenlog.gumroad.com/l/csv-income-reconciliation-kit';
  const routes = /\/seller-finance\/(?:(?:index\.html)?|english\/(?:index\.html)?|column-map\/(?:index\.html|en\.html)?|csv-trial\/(?:index\.html|ja\.html)?)$/;
  for (const a of document.querySelectorAll('a[href]')) {
    const raw = a.getAttribute('href');
    if (!raw || raw.startsWith('#')) continue;
    const u = new URL(raw, location.href);
    if (u.href === paid) { a.href = gumroad; continue; }
    if (u.origin !== location.origin || !routes.test(u.pathname)) continue;
    u.searchParams.set('from', 'gumroad');
    a.href = u.pathname + u.search + u.hash;
  }
})();
