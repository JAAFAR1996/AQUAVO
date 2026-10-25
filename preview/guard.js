/* Disposable review harness. No network writes or authenticated data access. */
(() => {
  'use strict';
  const originalFetch = window.fetch.bind(window);
  const snapshot = originalFetch('/preview-data/catalogue.json').then(r => { if (!r.ok) throw Error('Snapshot unavailable'); return r.json(); });
  const response = (data, status = 200) => new Response(JSON.stringify(data), {status, headers: {'Content-Type':'application/json'}});
  const blockedPath = p => /^\/(checkout|login|register|auth|account|admin|orders?|payment|cart)(\/|$)/i.test(p);
  const blocked = () => response({error:'Visual preview only. Purchases, login and submissions are disabled.'}, 403);
  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.origin);
    const method = (init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (!['GET','HEAD'].includes(method) || url.origin !== location.origin) return blocked();
    if (!url.pathname.startsWith('/api/')) return originalFetch(input, init);
    const data = await snapshot;
    const products = data.products;
    const p = decodeURIComponent(url.pathname);
    if (p === '/api/products/attributes') return response({categories:[...new Set(products.map(p=>p.category))],brands:[...new Set(products.map(p=>p.brand))],minPrice:Math.min(...products.map(p=>p.price)),maxPrice:Math.max(...products.map(p=>p.price))});
    if (p === '/api/products') {
      let result = products;
      const q = url.searchParams;
      if (q.get('category')) result = result.filter(p=>p.category === q.get('category'));
      if (q.get('brand')) result = result.filter(p=>p.brand === q.get('brand'));
      if (q.get('search')) result = result.filter(p=>(p.name+' '+p.brand+' '+p.description).toLowerCase().includes(q.get('search').toLowerCase()));
      return response({products:result});
    }
    if (p === '/api/growth/bundles') return response(data.bundles);
    if (/^\/api\/products\/[^/]+\/variants$/.test(p)) return response({variants:[]});
    if (/^\/api\/products\/[^/]+$/.test(p)) {
      const product = products.find(x=>x.id === p.split('/').pop() || x.slug === p.split('/').pop());
      if(product) return response(product);
    }
    return response({error:'Not part of the public catalogue snapshot'},404);
  };
  navigator.sendBeacon = () => false;
  const xhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    const target = new URL(url,location.origin);
    if (!['GET','HEAD'].includes(String(method).toUpperCase()) || target.origin !== location.origin || target.pathname.startsWith('/api/')) throw Error('Preview network action disabled');
    return xhrOpen.call(this,method,url,...rest);
  };
  document.addEventListener('submit', e => { e.preventDefault(); e.stopImmediatePropagation(); }, true);
  document.addEventListener('click', e => {
    const link = e.target instanceof Element ? e.target.closest('a') : null;
    if(link && (new URL(link.href,location.origin).origin !== location.origin || blockedPath(new URL(link.href,location.origin).pathname))) {e.preventDefault();e.stopImmediatePropagation();}
  },true);
  for (const method of ['pushState','replaceState']) {
    const original = history[method].bind(history);
    history[method] = (state, unused, url) => {
      if (url && blockedPath(new URL(url,location.origin).pathname)) return;
      return original(state,unused,url);
    };
  }
  if(blockedPath(location.pathname)) location.replace('/');
  const start = () => {
    const notice = document.createElement('aside');
    notice.id='aquavo-preview-notice'; notice.dir='rtl'; notice.setAttribute('role','note');
    notice.textContent='معاينة تصميم فقط • لقطة كتالوج 24 أكتوبر 2026، 20:34 UTC • الأسعار والمخزون غير مباشرَين • الشراء وتسجيل الدخول والإرسال معطّلة';
    notice.style.cssText='position:relative;z-index:9999;padding:10px 16px;background:#fff;color:#111;border-bottom:2px solid currentColor;font:14px/1.6 system-ui;text-align:center';
    document.body.prepend(notice);
    const disableCommerce = () => {
      // Netlify's optional review drawer is blocked by our strict frame CSP.
      // Remove only that provider toolbar, not application content or security rules.
      for (const frame of document.querySelectorAll('iframe[title="Netlify Drawer"]')) {
        try {
          const source = new URL(frame.src);
          if (source.origin === 'https://app.netlify.com' && source.pathname === '/cdp/') frame.remove();
        } catch { /* Keep unknown frames untouched. */ }
      }
      for (const button of document.querySelectorAll('button')) {
        if (/إضافة.*(سلة|السلة)|أضف.*(سلة|السلة)|add.*to cart|زیادکردن.*(سەبەت|سەبەتە)|زیاد.*سەبەت|buy now|اشتري الآن|إتمام الطلب|checkout/i.test(button.textContent || '')) {
          button.disabled = true; button.title = 'معاينة فقط: الشراء معطّل';
        }
      }
    };
    disableCommerce();
    new MutationObserver(disableCommerce).observe(document.body,{childList:true,subtree:true});
  };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
