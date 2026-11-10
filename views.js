const money = n => `₱${Number(n).toLocaleString('en-PH',{minimumFractionDigits:0,maximumFractionDigits:2})}`;
const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function logo() {
  return `<span class="wordmark"><img class="brand-logo logo-placeholder" src="/assets/TRISCENTS_LOGO.png" alt="TriScents logo" onerror="this.style.display=\'none\'"><span class="wordmark-name">TriScents</span></span>`;
}

function customerHeader(user, cartCount, csrf) {
  const account = user
    ? `<a class="header-link" href="/account">${esc(user.name.split(' ')[0])}</a>
       <form method="post" action="/logout" class="inline"><input type="hidden" name="csrf" value="${csrf}"><button class="header-button">Sign out</button></form>`
    : `<a class="header-link" href="/customer/login">Sign in</a>`;
  return `<header class="site-header">
    <a class="site-brand" href="/">${logo()}</a>
    <nav class="site-nav">
      <a href="/">Home</a>
      <a href="/shop">Shop</a>
      <a href="/scent-finder">Scent Finder</a>
      <a href="/price-list">Price List</a>
      <a href="/shop-rules">Shop Rules</a>
      <a href="/faq">FAQ</a>
      <a href="/how-to-order">How to Order</a>
      <a href="/about">About</a>
    </nav>
    <div class="header-actions">
      <a class="cart-pill" href="/cart"><span>Cart</span><b>${cartCount}</b></a>
      ${account}
    </div>
  </header>`;
}

function managementShell(user, csrf, body) {
  const nav = [
    ['Overview', '/management/dashboard'],
    ['Products & Inventory', '/management/products'],
    ['Orders', '/management/orders'],
    ['Customers', '/management/customers'],
    ['Reviews & Concerns', '/management/feedback'],
    ['Reports', '/management/reports'],
    ['Database', '/management/database'],
    ['Staff Accounts', '/management/users']
  ];
  return `<div class="admin-layout management-shell">
    <aside class="admin-sidebar">
      <a class="admin-brand" href="/management/dashboard">${logo()}</a>
      <div class="admin-user"><strong>${esc(user?.name || 'TriScents')}</strong><span>Owner / Staff</span></div>
      <nav class="admin-nav">${nav.map(([label,href])=>`<a href="${href}">${label}</a>`).join('')}</nav>
      <div class="admin-sidebar-bottom">
        <form method="post" action="/logout"><input type="hidden" name="csrf" value="${csrf}"><button>Sign out</button></form>
      </div>
    </aside>
    <div class="admin-workspace">
      <header class="admin-topbar"><div><span>TriScents Management Portal</span></div><div>${esc(user?.name || '')}</div></header>
      ${body}
    </div>
  </div>`;
}

function portalLoginLayout({portal='management', body='', flash=''}) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Owner / Staff Sign In | TriScents</title><meta name="description" content="TriScents management sign in"><link rel="stylesheet" href="/styles.css?v=16"></head><body class="store-body">
    <main class="auth-page"><div class="auth-card"><span class="eyebrow">OWNER / STAFF PORTAL</span><h1>Sign In</h1><p>Use your assigned TriScents owner or staff account. Both account types use the same management portal.</p>${flash?`<div class="flash portal-inline-flash">${esc(flash)}</div>`:''}${body}</div></main>
    <script src="/app.js?v=16"></script>
  </body></html>`;
}

function layout({title='TriScents', body='', user=null, cartCount=0, csrf='', admin=false, flash=''}) {
  const content = admin
    ? managementShell(user, csrf, `${flash?`<div class="admin-flash">${esc(flash)}</div>`:''}${body}`)
    : `${customerHeader(user, cartCount, csrf)}${flash?`<div class="flash">${esc(flash)}</div>`:''}<main>${body}</main><footer class="site-footer"><div>${logo()}<p>Scented candles for everyday spaces, gifts, souvenirs, and special events.</p><div class="footer-socials"><span>Instagram</span><span>TikTok</span><span>Facebook</span><span>Location</span></div></div><div><strong>Shop</strong><a href="/shop">All products</a><a href="/scent-finder">Scent Finder</a><a href="/price-list">Price List</a></div><div><strong>Help</strong><a href="/how-to-order">How to Order</a><a href="/shop-rules">Shop Rules</a><a href="/faq">FAQ</a></div><div><strong>TriScents</strong><a href="/about">About</a></div></footer>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | TriScents</title><meta name="description" content="TriScents scented candle ordering system"><link rel="stylesheet" href="/styles.css?v=16"></head><body class="${admin?'admin-body':'store-body'}">${content}<script src="/app.js?v=16"></script></body></html>`;
}

function productCard(p, csrf='', user=null) {
  return `<article class="product-card">
    <a href="/product?id=${p.id}" class="product-image-wrap"><img src="${p.image}" onerror="this.onerror=null;this.src='/assets/products/default.svg'" alt="${esc(p.name)}"></a>
    <div class="product-card-body">
      <div class="product-card-head">
        <div><h3><a href="/product?id=${p.id}">${esc(p.name)}</a></h3><p>${esc(p.category_name)} | ${esc(p.size)}</p></div>
      </div>
      <div class="product-meta"><strong>${money(p.price)}</strong><span class="stock ${p.stock<=0?'out':p.stock<=p.low_stock_threshold?'low':''}">${p.stock<=0?'Out of stock':p.stock<=p.low_stock_threshold?`${p.stock} left`:'In stock'}</span></div>
      <form method="post" action="/cart/add"><input type="hidden" name="csrf" value="${csrf}"><input type="hidden" name="product_id" value="${p.id}"><input type="hidden" name="qty" value="1"><button class="btn primary full" ${p.stock<=0?'disabled':''}>Add to Cart</button></form>
    </div>
  </article>`;
}

module.exports = { layout, portalLoginLayout, productCard, money, esc };
