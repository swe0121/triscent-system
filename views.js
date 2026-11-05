const money = n => `₱${Number(n).toLocaleString('en-PH',{minimumFractionDigits:0,maximumFractionDigits:2})}`;
const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function logo() {
  return `<span class="wordmark"><span class="wordmark-mark">ts</span><span class="wordmark-name">Triscent</span></span>`;
}

function customerHeader(user, cartCount, csrf) {
  const account = user
    ? `<a class="header-link account-link" href="/account">${esc(user.name.split(' ')[0])}</a>
       <form method="post" action="/logout" class="inline"><input type="hidden" name="csrf" value="${csrf}"><button class="header-button">Sign out</button></form>`
    : `<a class="header-link account-link" href="/login">Sign in</a>`;
  return `<header class="site-header">
    <div class="site-header-inner">
      <a class="site-brand" href="/">${logo()}</a>
      <nav class="site-nav">
        <a href="/">Home</a>
        <a href="/shop">Shop</a>
        <a href="/scent-finder">Scent Finder</a>
        <a href="/about">About</a>
      </nav>
      <div class="header-actions">
        ${user ? `<a class="header-link" href="/wishlist">Saved</a>` : ''}
        ${account}
        <a class="cart-pill" href="/cart"><span>Cart</span><b>${cartCount}</b></a>
      </div>
    </div>
  </header>`;
}

function managementShell(user, csrf, body) {
  const owner = user?.role === 'owner';
  const base = owner ? '/owner' : '/staff';
  const nav = owner
    ? [
        ['Overview', '/owner'],
        ['Products & Stock', '/owner/products'],
        ['Orders', '/owner/orders'],
        ['Customers', '/owner/customers'],
        ['Feedback', '/owner/feedback'],
        ['Reports', '/owner/reports'],
        ['Staff Access', '/owner/users']
      ]
    : [
        ['Queue', '/staff'],
        ['Orders', '/staff/orders'],
        ['Customers', '/staff/customers'],
        ['Feedback', '/staff/feedback']
      ];

  return `<div class="management-shell ${owner?'owner-shell':'staff-shell'}">
    <header class="management-masthead">
      <div class="management-topline">
        <a class="management-logo" href="${base}">${logo()}</a>
        <div class="management-identity">
          <span class="management-role">${owner ? 'Owner Console' : 'Staff Desk'}</span>
          <strong>${esc(user?.name || 'Triscent')}</strong>
        </div>
        <form method="post" action="/logout" class="management-logout"><input type="hidden" name="csrf" value="${csrf}"><button class="management-signout">Sign out</button></form>
      </div>
      <div class="management-navrow">
        <nav class="management-nav">${nav.map(([label,href])=>`<a href="${href}">${label}</a>`).join('')}</nav>
      </div>
    </header>
    <main class="management-workspace">${body}</main>
  </div>`;
}

function portalLoginLayout({portal='owner', body='', flash=''}) {
  const owner = portal === 'owner';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${owner?'Owner':'Staff'} Sign In | Triscent</title><meta name="description" content="Triscent management sign in"><link rel="stylesheet" href="/styles.css?v=5"></head><body class="portal-login-body ${owner?'owner-login':'staff-login'}">
    <main class="portal-login-page">
      <section class="portal-login-brandpane">
        <div class="portal-login-brand">${logo()}</div>
        <div class="portal-login-message">
          <span class="portal-kicker">${owner?'OWNER PORTAL':'STAFF PORTAL'}</span>
          <h1>${owner?'Store management':'Order desk'}</h1>
          <p>${owner?'Products, stock, orders, customers, reports and staff access.':'Orders, payment checks, pickup claims and customer concerns.'}</p>
        </div>
        <div class="portal-login-foot">Internal access only</div>
      </section>
      <section class="portal-login-formpane">
        <div class="portal-login-card">
          <div class="portal-card-head">
            <span>${owner?'Owner access':'Staff access'}</span>
            <h2>Sign in</h2>
          </div>
          ${flash?`<div class="portal-flash">${esc(flash)}</div>`:''}
          ${body}
        </div>
      </section>
    </main>
    <script src="/app.js?v=5"></script>
  </body></html>`;
}

function layout({title='Triscent', body='', user=null, cartCount=0, csrf='', admin=false, flash=''}) {
  const content = admin
    ? managementShell(user, csrf, `${flash?`<div class="admin-flash">${esc(flash)}</div>`:''}${body}`)
    : `${customerHeader(user, cartCount, csrf)}${flash?`<div class="flash">${esc(flash)}</div>`:''}<main>${body}</main><footer class="site-footer"><div>${logo()}<p>Scented candles for everyday spaces, gifts, and slow days.</p></div><div><strong>Shop</strong><a href="/shop">All products</a><a href="/scent-finder">Scent Finder</a></div><div><strong>Account</strong><a href="/login">Sign in</a><a href="/account">My orders</a></div><div><strong>Triscent</strong><a href="/about">About</a></div></footer>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | Triscent</title><meta name="description" content="Triscent scented candle ordering system"><link rel="stylesheet" href="/styles.css?v=5"></head><body class="${admin?'admin-body':'store-body'}">${content}<script src="/app.js?v=5"></script></body></html>`;
}

function productCard(p, csrf='', user=null) {
  return `<article class="product-card">
    <a href="/product?id=${p.id}" class="product-image-wrap"><img src="${p.image}" alt="${esc(p.name)}"></a>
    <div class="product-card-body">
      <div class="product-card-head">
        <div><p class="product-kicker">${esc(p.category_name)} · ${esc(p.size)}</p><h3><a href="/product?id=${p.id}">${esc(p.name)}</a></h3></div>
        ${user?`<form method="post" action="/wishlist/toggle" class="save-form"><input type="hidden" name="csrf" value="${csrf}"><input type="hidden" name="product_id" value="${p.id}"><button class="save-button" title="Save product">Save</button></form>`:''}
      </div>
      <div class="product-meta"><strong>${money(p.price)}</strong><span class="stock ${p.stock<=0?'out':p.stock<=p.low_stock_threshold?'low':''}">${p.stock<=0?'Out of stock':p.stock<=p.low_stock_threshold?`${p.stock} left`:'In stock'}</span></div>
      <form method="post" action="/cart/add"><input type="hidden" name="csrf" value="${csrf}"><input type="hidden" name="product_id" value="${p.id}"><input type="hidden" name="qty" value="1"><button class="btn primary full" ${p.stock<=0?'disabled':''}>Add to cart</button></form>
    </div>
  </article>`;
}

module.exports = { layout, portalLoginLayout, productCard, money, esc };
