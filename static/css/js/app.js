// POS System — Frontend JavaScript
// Auto-generated from PHP → Flask migration

// ── API (Flask REST) ──
const cur_page = document.body.dataset.page || 'dashboard';

// Action → method + URL mapping (matches original JS action names)
const API_MAP = {
  // Products
  get_products:              () => ({ m:'GET',    u:'/api/products' }),
  add_product:               () => ({ m:'POST',   u:'/api/products' }),
  update_product:            () => ({ m:'POST',   u:'/api/products' }),
  delete_product:            (p) => ({ m:'DELETE', u:'/api/products/' + (p.id||p) }),
  get_product_by_barcode:    (p) => ({ m:'GET',   u:'/api/products/barcode/' + encodeURIComponent(p.barcode||p) }),
  // Categories
  get_categories:            () => ({ m:'GET',    u:'/api/categories' }),
  add_category:              () => ({ m:'POST',   u:'/api/categories' }),
  delete_category:           (p) => ({ m:'DELETE', u:'/api/categories/' + (p.id||p) }),
  // Sales
  add_transaction:           () => ({ m:'POST',   u:'/api/checkout' }),
  get_transactions:          () => ({ m:'GET',    u:'/api/transactions' }),
  delete_transaction:        (p) => ({ m:'DELETE', u:'/api/transactions/' + (p.id||p) }),
  delete_all_transactions:   () => ({ m:'DELETE', u:'/api/transactions' }),
  // Analytics
  get_stats:                 () => ({ m:'GET',    u:'/api/analytics' }),
  get_daily_sales:           () => ({ m:'GET',    u:'/api/analytics' }),
  get_top_products:          () => ({ m:'GET',    u:'/api/analytics' }),
  get_category_stats:        () => ({ m:'GET',    u:'/api/analytics' }),
  get_analytics:             () => ({ m:'GET',    u:'/api/analytics' }),
  // Warehouse
  get_warehouse_products:    () => ({ m:'GET',    u:'/api/warehouse' }),
  get_warehouse_log:         () => ({ m:'GET',    u:'/api/warehouse/logs' }),
  add_warehouse_movement:    () => ({ m:'POST',   u:'/api/warehouse/move' }),
  get_expiring_products:     () => ({ m:'GET',    u:'/api/warehouse' }),
  // Settings & users
  get_settings:              () => ({ m:'GET',    u:'/api/settings' }),
  save_settings:             () => ({ m:'POST',   u:'/api/settings' }),
  get_users:                 () => ({ m:'GET',    u:'/api/users' }),
  add_user:                  () => ({ m:'POST',   u:'/api/users' }),
  delete_user:               (p) => ({ m:'DELETE', u:'/api/users/' + (p.id||p) }),
  change_password:           () => ({ m:'POST',   u:'/api/change_password' }),
};

async function apiGet(action, params={}) {
  const entry = API_MAP[action];
  if (!entry) { console.error('Unknown action:', action); return null; }
  const { m, u } = entry(params);
  const qs = m === 'GET' ? new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([k]) => !['id','barcode'].includes(k)))
  ).toString() : '';
  const url = u + (qs ? '?' + qs : '');
  try {
    const r = await fetch(url, { method: m });
    if (r.status === 401) { location.href = '/login'; return null; }
    return r.json();
  } catch(e) { toast('Network error', 'error'); return null; }
}

async function apiPost(action, body={}) {
  const entry = API_MAP[action];
  if (!entry) { console.error('Unknown action:', action); return null; }
  const { m, u } = entry(body);
  try {
    const opts = { method: m };
    if (m !== 'GET' && m !== 'DELETE') {
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = JSON.stringify(body);
    }
    const r = await fetch(u, opts);
    if (r.status === 401) { location.href = '/login'; return null; }
    return r.json();
  } catch(e) { toast('Network error', 'error'); return null; }
}

// ── MODALS ──
function openModal(id) {
  const e = document.getElementById(id);
  if (e) { e.classList.add('open'); e.querySelector('.modal')?.scrollTo(0, 0); }
}
function closeModal(id) {
  const e = document.getElementById(id);
  if (e) e.classList.remove('open');
}
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
});

// ── TOAST ──
function toast(msg, type = 'default') {
  const wrap = document.getElementById('toast-wrap');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  const icons = { success: '✓', error: '✗', warning: '⚠', default: 'ℹ' };
  el.innerHTML = '<span>' + (icons[type] || 'ℹ') + '</span> ' + msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ── FORMATTING ──
let CUR = '₱';
function fmt(n) { return CUR + parseFloat(n || 0).toFixed(2); }
function fmtDate(iso) {
  return new Date(iso).toLocaleString('en', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── IMAGE HELPERS ──
const fileToB64 = f => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = e => res(e.target.result);
  r.onerror = () => rej('Read error');
  r.readAsDataURL(f);
});
function compressImg(b64, maxW = 480, q = 0.82) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      res(c.toDataURL('image/jpeg', q));
    };
    img.src = b64;
  });
}

// ── LOADING BUTTON ──
function setLoading(btn, on) {
  if (!btn) return;
  if (on) { btn.dataset.orig = btn.innerHTML; btn.innerHTML = '<span class="spinner"></span>'; btn.disabled = true; }
  else { btn.innerHTML = btn.dataset.orig || btn.innerHTML; btn.disabled = false; }
}

// ════════════════════════════════
// IMAGE UPLOAD (used on products page)
// ════════════════════════════════
let imgB64 = null;

function previewImg(e) {
  const file = e.target.files[0];
  if (!file) return;
  fileToB64(file).then(b64 => compressImg(b64)).then(b64 => {
    imgB64 = b64;
    const preview = document.getElementById('img-preview');
    const placeholder = document.getElementById('img-placeholder');
    const removeBtn = document.getElementById('img-remove-btn');
    if (preview) { preview.src = b64; preview.style.display = 'block'; }
    if (placeholder) placeholder.style.display = 'none';
    if (removeBtn) removeBtn.style.display = '';
  }).catch(() => toast('Failed to load image', 'error'));
}

function removeImg() {
  imgB64 = null;
  const preview = document.getElementById('img-preview');
  const placeholder = document.getElementById('img-placeholder');
  const removeBtn = document.getElementById('img-remove-btn');
  const gallery = document.getElementById('img-input-gallery');
  const camera = document.getElementById('img-input-camera');
  if (preview) { preview.src = ''; preview.style.display = 'none'; }
  if (placeholder) placeholder.style.display = 'block';
  if (removeBtn) removeBtn.style.display = 'none';
  if (gallery) gallery.value = '';
  if (camera) camera.value = '';
}

// ════════════════════════════════
// DASHBOARD
// ════════════════════════════════
let cart = [], allProds = [], allCats = [], activeCat = 'All';

function dashInit() {
  if (cur_page !== 'dashboard') return;
  const h = new Date().getHours();
  document.getElementById('greet').textContent = h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
  apiGet('get_settings').then(s => {
    CUR = s?.data?.currency || '₱';
    document.getElementById('shop-name').textContent = s?.data?.shop_name || 'Welcome to POS System';
  });
  loadStats();
  loadAllProds();
  loadTopSellers();
}

function loadStats() {
  apiGet('get_stats').then(r => {
    if (!r?.success) return;
    const d = r.data;
    document.getElementById('s-today-rev').textContent = fmt(d.today_revenue);
    document.getElementById('s-today-cnt').textContent = d.today_sales + ' transactions';
    document.getElementById('s-week').textContent = fmt(d.week_revenue);
    document.getElementById('s-prods').textContent = d.product_count;
    document.getElementById('s-lowstock').textContent = d.low_stock + ' low stock';
    document.getElementById('s-total').textContent = fmt(d.total_revenue);
    document.getElementById('s-total-tx').textContent = d.total_tx + ' total orders';
  });
}

function loadAllProds() {
  Promise.all([apiGet('get_products'), apiGet('get_categories')]).then(([pr, cr]) => {
    if (pr?.success) allProds = pr.data;
    if (cr?.success) allCats = cr.data;
    renderCatPills();
    renderGrid();
  });
}

function filterProds() { renderGrid(); }

function renderCatPills() {
  const el = document.getElementById('cat-pills');
  if (!el) return;
  const cats = ['All', ...allCats.map(c => c.name)];
  el.innerHTML = cats.map(c =>
    '<button class="cat-pill ' + (c === activeCat ? 'active' : '') + '" onclick="setActiveCat(\'' + c + '\')">' + c + '</button>'
  ).join('');
}

function setActiveCat(c) { activeCat = c; renderCatPills(); renderGrid(); }

function renderGrid() {
  const q = (document.getElementById('search-inp')?.value || '').toLowerCase();
  const prods = allProds.filter(p => {
    const mc = activeCat === 'All' || p.category_name === activeCat;
    const mq = !q || p.name.toLowerCase().includes(q) || (p.category_name || '').toLowerCase().includes(q);
    return mc && mq;
  });
  const grid = document.getElementById('prods-grid');
  if (!grid) return;
  if (!prods.length) {
    grid.innerHTML = '<div style="grid-column:1/-1"><div class="empty-state"><div class="empty-icon">🍽️</div><div class="empty-text">No products found</div></div></div>';
    return;
  }
  grid.innerHTML = prods.map(p => {
    const inCart = cart.find(c => c.product_id === p.id);
    const isOut = p.quantity == 0;
    const isLow = p.quantity > 0 && p.quantity <= 5;
    const img = p.image_data
      ? '<img src="' + p.image_data + '" class="product-card-img" loading="lazy"/>'
      : '<div class="product-card-ph">🍽️</div>';
    const clickHandler = isOut ? '' : 'onclick="addToCart(' + p.id + ')"';
    return '<div class="product-card" ' + clickHandler + (isOut ? ' style="opacity:.55;cursor:not-allowed;"' : '') + '>' +
      img +
      (isLow && !isOut ? '<span class="low-badge">Low</span>' : '') +
      (isOut ? '<span class="low-badge">Out</span>' : '') +
      (inCart ? '<span class="qty-badge">' + inCart.qty + '</span>' : '') +
      '<div class="product-card-body">' +
        '<div class="product-card-name">' + p.name + '</div>' +
        '<div class="product-card-price">' + fmt(p.price) + '</div>' +
        '<div class="product-card-meta">' + (p.category_name || 'Uncategorized') + ' · Stock: ' + p.quantity + '</div>' +
      '</div></div>';
  }).join('');
}

function loadTopSellers() {
  apiGet('get_top_products', { limit: 8 }).then(r => {
    if (!r?.success) return;
    const tops = r.data;
    const el = document.getElementById('top-sellers');
    if (!el) return;
    if (!tops.length) {
      el.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text3);font-size:.83rem;">No sales yet</div>';
      return;
    }
    el.innerHTML = tops.map((p, i) => {
      const rc = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
      const imgEl = p.image_data ? '<img src="' + p.image_data + '" style="width:100%;height:100%;object-fit:cover;"/>' : '🍽️';
      return '<div class="top-row">' +
        '<div class="top-rank ' + rc + '">' + (i + 1) + '</div>' +
        '<div class="top-img">' + imgEl + '</div>' +
        '<div class="top-info"><div class="top-name">' + p.name + '</div><div class="top-sales">' + p.total_sold + ' sold</div></div>' +
        '<div class="top-rev">' + fmt(p.total_revenue) + '</div>' +
        '</div>';
    }).join('');
  });
}

// ── CART FUNCTIONS ──
function addToCart(pid) {
  const p = allProds.find(x => x.id == pid);
  if (!p || p.quantity <= 0) { toast('Out of stock!', 'error'); return; }
  const ex = cart.find(c => c.product_id === pid);
  if (ex) {
    if (ex.qty >= p.quantity) { toast('Not enough stock!', 'warning'); return; }
    ex.qty++;
  } else {
    cart.push({ product_id: pid, name: p.name, price: parseFloat(p.price), qty: 1, image_data: p.image_data || null, category_name: p.category_name || '' });
  }
  toast(p.name + ' added', 'success');
  updateCartUI();
  renderGrid();
}

function removeFromCart(pid) { cart = cart.filter(c => c.product_id !== pid); updateCartUI(); renderGrid(); }

function changeQty(pid, d) {
  const item = cart.find(c => c.product_id === pid);
  const prod = allProds.find(p => p.id == pid);
  if (!item) return;
  item.qty = Math.max(1, Math.min(item.qty + d, prod?.quantity || 999));
  updateCartUI();
  renderGrid();
}

function clearCart() { cart = []; updateCartUI(); renderGrid(); }

function setCash(v) { document.getElementById('cash-input').value = v; calcChange(); }

function updateCartUI() {
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const count = cart.reduce((s, c) => s + c.qty, 0);

  const badge = document.getElementById('cart-badge');
  const fabCnt = document.getElementById('cart-fab-cnt');
  const emptyEl = document.getElementById('cart-empty');
  const summaryEl = document.getElementById('cart-summary');
  const itemsEl = document.getElementById('cart-items');

  if (badge) badge.textContent = count;
  if (fabCnt) fabCnt.textContent = count;
  if (emptyEl) emptyEl.style.display = cart.length ? 'none' : 'block';
  if (summaryEl) summaryEl.style.display = cart.length ? 'block' : 'none';

  if (itemsEl) {
    itemsEl.innerHTML = cart.map(item => {
      const imgEl = item.image_data
        ? '<img src="' + item.image_data + '" style="width:38px;height:38px;border-radius:7px;object-fit:cover;"/>'
        : '<div style="width:38px;height:38px;border-radius:7px;background:var(--surface2);display:flex;align-items:center;justify-content:center;">🍽️</div>';
      return '<div class="cart-item-row">' + imgEl +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:.86rem;font-weight:600;">' + item.name + '</div>' +
          '<div style="font-size:.74rem;color:var(--text3);">' + fmt(item.price) + ' each</div>' +
        '</div>' +
        '<div class="qty-ctrl">' +
          '<button type="button" class="qty-btn" onclick="changeQty(' + item.product_id + ',-1)">−</button>' +
          '<span class="qty-num">' + item.qty + '</span>' +
          '<button type="button" class="qty-btn" onclick="changeQty(' + item.product_id + ',1)">+</button>' +
        '</div>' +
        '<div style="font-weight:700;font-size:.86rem;min-width:55px;text-align:right;">' + fmt(item.price * item.qty) + '</div>' +
        '<button type="button" onclick="removeFromCart(' + item.product_id + ')" style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:1rem;padding:0 3px;">✕</button>' +
        '</div>';
    }).join('');
  }

  const subEl = document.getElementById('cart-sub');
  const totalEl = document.getElementById('cart-total');
  const presetsEl = document.getElementById('presets');
  if (subEl) subEl.textContent = fmt(total);
  if (totalEl) totalEl.textContent = fmt(total);

  if (presetsEl) {
    const presets = [...new Set([
      Math.ceil(total / 50) * 50,
      Math.ceil(total / 100) * 100,
      Math.ceil(total / 500) * 500,
      1000
    ].filter(v => v >= total))].slice(0, 4);
    presetsEl.innerHTML = presets.map(p =>
      '<button type="button" class="preset-btn" onclick="setCash(' + p + ')">' + fmt(p) + '</button>'
    ).join('');
  }
  calcChange();
}

function calcChange() {
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const cashInp = document.getElementById('cash-input');
  const box = document.getElementById('change-display');
  const btn = document.getElementById('pay-btn');
  if (!cashInp || !box || !btn) return;
  const cash = parseFloat(cashInp.value) || 0;
  const chg = cash - total;
  if (cash <= 0) { box.innerHTML = ''; btn.disabled = true; return; }
  if (chg < 0) {
    box.innerHTML = '<div class="change-box neg"><div class="change-label">Amount Short</div><div class="change-amount" style="color:var(--danger);">' + fmt(Math.abs(chg)) + '</div></div>';
    btn.disabled = true;
  } else {
    box.innerHTML = '<div class="change-box"><div class="change-label">Change to Give</div><div class="change-amount">' + fmt(chg) + '</div></div>';
    btn.disabled = false;
  }
}

function processPayment() {
  if (!cart.length) return;
  const btn = document.getElementById('pay-btn');
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const cash = parseFloat(document.getElementById('cash-input').value) || 0;
  const chg = cash - total;
  if (chg < 0) { toast('Insufficient cash!', 'error'); return; }
  setLoading(btn, true);
  apiPost('add_transaction', {
    items: cart.map(c => ({ product_id: c.product_id, name: c.name, price: c.price, qty: c.qty, category_name: c.category_name })),
    total, cash, change: chg
  }).then(r => {
    setLoading(btn, false);
    if (!r?.success) { toast(r?.error || 'Payment failed', 'error'); return; }
    const ref = r.data.order_ref;
    const now = new Date();
    let receipt = 'POS System\n' + '─'.repeat(26) + '\n' + now.toLocaleString() + '\nOrder #' + ref + '\n' + '─'.repeat(26) + '\n';
    cart.forEach(it => { receipt += it.name + '\n  ' + it.qty + 'x' + CUR + it.price.toFixed(2) + ' = ' + CUR + (it.price * it.qty).toFixed(2) + '\n'; });
    receipt += '─'.repeat(26) + '\n' + 'TOTAL'.padEnd(18) + (CUR + total.toFixed(2)).padStart(8) + '\n' + 'CASH'.padEnd(18) + (CUR + cash.toFixed(2)).padStart(8) + '\n' + 'CHANGE'.padEnd(18) + (CUR + chg.toFixed(2)).padStart(8) + '\n' + '─'.repeat(26) + '\n  Thank you! Come again!\n';
    document.getElementById('receipt-display').textContent = receipt;
    document.getElementById('final-change').textContent = fmt(chg);
    closeModal('cart-modal');
    cart = [];
    document.getElementById('cash-input').value = '';
    document.getElementById('change-display').innerHTML = '';
    openModal('success-modal');
    loadStats();
    loadAllProds();
    loadTopSellers();
    updateCartUI();
  });
}

// ════════════════════════════════
// PRODUCTS PAGE
// ════════════════════════════════
let invProds = [], invCats = [], activeProdCat = '';

function prodsInit() {
  if (cur_page !== 'products') return;
  apiGet('get_settings').then(s => { CUR = s?.data?.currency || '₱'; });
  loadInvProds();
  loadInvCats();
}

function loadInvProds() {
  apiGet('get_products').then(r => { if (r?.success) { invProds = r.data; renderProds(); } });
}

function loadInvCats() {
  apiGet('get_categories').then(r => {
    if (!r?.success) return;
    invCats = r.data;
    const sel = document.getElementById('cat-filter');
    if (sel) sel.innerHTML = '<option value="">All Categories</option>' + invCats.map(c => '<option value="' + c.id + '">' + c.name + '</option>').join('');
    renderProdCatPills();
  });
}

function renderProdCatPills() {
  const el = document.getElementById('prod-cat-pills');
  if (!el) return;
  el.innerHTML = ['All', ...invCats.map(c => c.name)].map(c =>
    '<button class="cat-pill ' + ((activeProdCat === '' && c === 'All') || c === activeProdCat ? 'active' : '') + '" onclick="setProdCat(\'' + c + '\')">' + c + '</button>'
  ).join('');
}

function setProdCat(c) { activeProdCat = c === 'All' ? '' : c; renderProdCatPills(); renderProds(); }

function renderProds() {
  const q = (document.getElementById('prod-search')?.value || '').toLowerCase();
  const catF = document.getElementById('cat-filter')?.value || '';
  const sort = document.getElementById('sort-sel')?.value || 'name';
  let list = invProds.filter(p => {
    const mq = !q || p.name.toLowerCase().includes(q);
    const mc = activeProdCat ? p.category_name === activeProdCat : (!catF || p.category_id == catF);
    return mq && mc;
  });
  list.sort((a, b) =>
    sort === 'price' ? a.price - b.price :
    sort === 'qty' ? b.quantity - a.quantity :
    sort === 'sold' ? b.total_sold - a.total_sold :
    a.name.localeCompare(b.name)
  );
  const countEl = document.getElementById('prod-count');
  if (countEl) countEl.textContent = list.length + ' products';
  const grid = document.getElementById('prod-grid');
  if (!grid) return;
  if (!list.length) {
    grid.innerHTML = '<div style="grid-column:1/-1"><div class="empty-state"><div class="empty-icon">📦</div><div class="empty-text">No products</div></div></div>';
    return;
  }
  grid.innerHTML = list.map(p => {
    const stockColor = p.quantity <= 0 ? 'var(--danger)' : p.quantity <= 5 ? 'var(--accent2)' : 'var(--green)';
    const img = p.image_data ? '<img src="' + p.image_data + '" class="product-card-img" loading="lazy"/>' : '<div class="product-card-ph">🍽️</div>';
    return '<div class="product-card" onclick="openEditModal(' + p.id + ')">' +
      img +
      '<div class="product-card-body">' +
        '<div class="product-card-name">' + p.name + '</div>' +
        '<div class="product-card-price">' + CUR + parseFloat(p.price).toFixed(2) + '</div>' +
        '<div class="product-card-meta">' + (p.category_name || 'Uncategorized') + '</div>' +
        '<div class="product-card-meta" style="color:' + stockColor + ';font-weight:600;">Stock: ' + p.quantity + ' | Sold: ' + p.total_sold + '</div>' +
      '</div></div>';
  }).join('');
}

function openAddModal() {
  document.getElementById('edit-id').value = '';
  document.getElementById('prod-modal-title').textContent = 'Add Product';
  document.getElementById('p-name').value = '';
  document.getElementById('p-price').value = '';
  document.getElementById('p-qty').value = '';
  document.getElementById('p-desc').value = '';
  document.getElementById('delete-prod-btn').style.display = 'none';
  document.getElementById('p-cat').innerHTML = '<option value="">-- Select Category --</option>' + invCats.map(c => '<option value="' + c.id + '">' + c.name + '</option>').join('');
  removeImg();
  openModal('prod-modal');
}

function openEditModal(id) {
  const p = invProds.find(x => x.id == id);
  if (!p) return;
  document.getElementById('edit-id').value = p.id;
  document.getElementById('prod-modal-title').textContent = 'Edit Product';
  document.getElementById('p-name').value = p.name;
  document.getElementById('p-price').value = p.price;
  document.getElementById('p-qty').value = p.quantity;
  document.getElementById('p-desc').value = p.description || '';
  document.getElementById('delete-prod-btn').style.display = '';
  document.getElementById('p-cat').innerHTML = '<option value="">-- Select Category --</option>' + invCats.map(c => '<option value="' + c.id + '"' + (c.id == p.category_id ? ' selected' : '') + '>' + c.name + '</option>').join('');
  imgB64 = null;
  const preview = document.getElementById('img-preview');
  const placeholder = document.getElementById('img-placeholder');
  const removeBtn = document.getElementById('img-remove-btn');
  if (p.image_data) {
    if (preview) { preview.src = p.image_data; preview.style.display = 'block'; }
    if (placeholder) placeholder.style.display = 'none';
    if (removeBtn) removeBtn.style.display = '';
  } else {
    if (preview) { preview.src = ''; preview.style.display = 'none'; }
    if (placeholder) placeholder.style.display = 'block';
    if (removeBtn) removeBtn.style.display = 'none';
  }
  openModal('prod-modal');
}

function saveProduct() {
  const id = document.getElementById('edit-id').value;
  const name = document.getElementById('p-name').value.trim();
  const price = parseFloat(document.getElementById('p-price').value);
  const qty = parseInt(document.getElementById('p-qty').value);
  const catId = document.getElementById('p-cat').value;
  const desc = document.getElementById('p-desc').value.trim();
  if (!name) { toast('Product name is required', 'error'); return; }
  if (isNaN(price) || price < 0) { toast('Enter a valid price', 'error'); return; }
  if (isNaN(qty) || qty < 0) { toast('Enter a valid quantity', 'error'); return; }
  const btn = document.getElementById('save-prod-btn');
  setLoading(btn, true);
  const payload = { name, price, quantity: qty, category_id: catId || null, description: desc, image: imgB64 || null };
  let req;
  if (id) { payload.id = parseInt(id); req = apiPost('update_product', payload); }
  else { req = apiPost('add_product', payload); }
  req.then(r => {
    setLoading(btn, false);
    if (!r?.success) { toast(r?.error || 'Error saving product', 'error'); return; }
    toast(id ? 'Product updated!' : 'Product added!', 'success');
    closeModal('prod-modal');
    loadInvProds();
  });
}

function deleteProduct() {
  const id = document.getElementById('edit-id').value;
  if (!id) return;
  if (!confirm('Delete this product? This cannot be undone.')) return;
  apiGet('delete_product', { id: parseInt(id) }).then(r => {
    if (!r?.success) { toast('Error deleting', 'error'); return; }
    toast('Product deleted', 'success');
    closeModal('prod-modal');
    loadInvProds();
  });
}

function openCatModal() { renderCatList(); openModal('cat-modal'); }

function renderCatList() {
  const el = document.getElementById('cat-list');
  if (!el) return;
  el.innerHTML = invCats.map(c =>
    '<div class="cat-manage-row"><span>' + c.name + '</span><button type="button" class="btn btn-danger btn-sm" onclick="deleteCat(' + c.id + ')">Delete</button></div>'
  ).join('');
}

function addCat() {
  const name = document.getElementById('new-cat-input').value.trim();
  if (!name) { toast('Enter a category name', 'error'); return; }
  apiPost('add_category', { name }).then(r => {
    if (!r?.success) { toast(r?.error || 'Error adding category', 'error'); return; }
    toast('Category added', 'success');
    document.getElementById('new-cat-input').value = '';
    loadInvCats();
    renderCatList();
  });
}

function deleteCat(id) {
  if (!confirm('Delete this category? Products will become uncategorized.')) return;
  apiGet('delete_category', { id }).then(r => {
    if (!r?.success) { toast('Error deleting category', 'error'); return; }
    toast('Category deleted', 'success');
    loadInvCats();
    renderCatList();
  });
}

// ════════════════════════════════
// SALES PAGE
// ════════════════════════════════
let txData = [];

function clearDateFilter() {
  const df = document.getElementById('date-filter');
  if (df) df.value = '';
  loadTx();
}

function salesInit() {
  if (cur_page !== 'sales') return;
  // Load settings first so CUR is set, then load ALL transactions (no date filter by default)
  apiGet('get_settings').then(s => {
    CUR = s?.data?.currency || '\u20B1';
    loadTx();
  });
}

function loadTx() {
  const date = document.getElementById('date-filter')?.value || '';
  // If no date selected, fetch ALL transactions (pass no date param)
  const params = date ? { date } : {};
  apiGet('get_transactions', params).then(r => {
    if (!r?.success) return;
    txData = r.data;
    const labelEl = document.getElementById('tx-label');
    if (labelEl) labelEl.textContent = txData.length + ' transaction(s)' + (date ? ' on ' + date : ' (all time)');
    const body = document.getElementById('tx-body');
    const emptyEl = document.getElementById('tx-empty');
    if (!txData.length) {
      if (body) body.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    if (body) {
      body.innerHTML = txData.map((tx, i) =>
        '<tr>' +
        '<td>' + (txData.length - i) + '</td>' +
        '<td style="font-weight:700;">' + tx.order_ref + '</td>' +
        '<td>' + (tx.items || []).length + ' item(s)</td>' +
        '<td style="color:var(--accent);font-weight:700;">' + CUR + parseFloat(tx.total).toFixed(2) + '</td>' +
        '<td>' + CUR + parseFloat(tx.cash).toFixed(2) + '</td>' +
        '<td style="color:var(--green);font-weight:600;">' + CUR + parseFloat(tx.change).toFixed(2) + '</td>' +
        '<td>' + (tx.cashier || '—') + '</td>' +
        '<td style="color:var(--text3);font-size:.78rem;">' + fmtDate(tx.created_at) + '</td>' +
        '<td style="display:flex;gap:5px;">' + '<button type="button" class="btn btn-secondary btn-sm" onclick="viewTx(' + tx.id + ')">View</button>' + '<button type="button" class="btn btn-danger btn-sm" onclick="deleteTx(' + tx.id + ',' + JSON.stringify(tx.order_ref) + ')">🗑️</button>' + '</td>' +
        '</tr>'
      ).join('');
    }
  });
}

function viewTx(id) {
  const tx = txData.find(t => t.id === id);
  if (!tx) return;
  document.getElementById('tx-modal-title').textContent = 'Order #' + tx.order_ref;
  document.getElementById('tx-modal-body').innerHTML =
    '<div style="font-size:.8rem;color:var(--text3);margin-bottom:14px;">' + fmtDate(tx.created_at) + ' · Cashier: ' + (tx.cashier || '—') + '</div>' +
    '<table style="width:100%;border-collapse:collapse;font-size:.85rem;margin-bottom:14px;">' +
      '<thead><tr style="border-bottom:2px solid var(--border);"><th style="padding:6px;text-align:left;">Item</th><th style="padding:6px;text-align:center;">Qty</th><th style="padding:6px;text-align:right;">Subtotal</th></tr></thead>' +
      '<tbody>' + (tx.items || []).map(it =>
        '<tr style="border-bottom:1px solid var(--border);">' +
        '<td style="padding:6px;">' + it.product_name + '</td>' +
        '<td style="padding:6px;text-align:center;">' + it.quantity + '</td>' +
        '<td style="padding:6px;text-align:right;">' + CUR + parseFloat(it.subtotal).toFixed(2) + '</td>' +
        '</tr>'
      ).join('') + '</tbody>' +
    '</table>' +
    '<div style="display:flex;justify-content:space-between;padding:6px 0;font-weight:700;border-top:2px solid var(--border);"><span>Total</span><span>' + CUR + parseFloat(tx.total).toFixed(2) + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:.86rem;"><span>Cash</span><span>' + CUR + parseFloat(tx.cash).toFixed(2) + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:.86rem;color:var(--green);font-weight:600;"><span>Change</span><span>' + CUR + parseFloat(tx.change).toFixed(2) + '</span></div>';
  openModal('tx-modal');
}

function deleteTx(id, orderRef) {
  if (!confirm('Delete order #' + orderRef + '?\nThis cannot be undone.')) return;
  apiPost('delete_transaction', { id }).then(r => {
    if (!r?.success) { toast(r?.error || 'Error deleting transaction', 'error'); return; }
    toast('Order #' + orderRef + ' deleted', 'success');
    loadTx();
  });
}

function deleteAllTx() {
  // Only owner can do this — show confirm modal
  openModal('del-all-modal');
}

function confirmDeleteAll() {
  const btn = document.getElementById('confirm-del-all-btn');
  setLoading(btn, true);
  apiPost('delete_all_transactions', {}).then(r => {
    setLoading(btn, false);
    if (!r?.success) { toast(r?.error || 'Error deleting transactions', 'error'); return; }
    toast('All transaction history cleared', 'success');
    closeModal('del-all-modal');
    loadTx();
  });
}

function exportCSV() {
  if (!txData.length) {
    // Try fetching all transactions for export if current view is empty
    toast('Fetching all data for export…', 'default');
    apiGet('get_transactions', {}).then(r => {
      if (!r?.success || !r.data.length) { toast('No transactions found in database', 'error'); return; }
      doExportCSV(r.data);
    });
    return;
  }
  doExportCSV(txData);
}
function doExportCSV(data) {
  const rows = [['Order Ref','Date','Product','Category','Qty','Price','Subtotal','Order Total','Cash','Change','Day','Hour']];
  data.forEach(tx => {
    (tx.items || []).forEach(it => {
      const d = new Date(tx.created_at);
      rows.push([tx.order_ref, tx.created_at, it.product_name, it.category_name, it.quantity, it.price, it.subtotal, tx.total, tx.cash, tx.change, d.toLocaleDateString('en', { weekday: 'long' }), d.getHours()]);
    });
  });
  const csv = rows.map(r => r.map(v => '"' + v + '"').join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'canteen_data_' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  toast('CSV exported! ' + data.length + ' transactions', 'success');
}

function exportJSON() {
  if (!txData.length) {
    toast('Fetching all data for export…', 'default');
    apiGet('get_transactions', {}).then(r => {
      if (!r?.success || !r.data.length) { toast('No transactions found in database', 'error'); return; }
      doExportJSON(r.data);
    });
    return;
  }
  doExportJSON(txData);
}
function doExportJSON(data) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = 'canteen_data_' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  toast('JSON exported! ' + data.length + ' transactions', 'success');
}

// ════════════════════════════════
// ANALYTICS PAGE
// ════════════════════════════════
function analyticsInit() {
  if (cur_page !== 'analytics') return;
  apiGet('get_settings').then(s => { CUR = s?.data?.currency || '₱'; });
  Promise.all([
    apiGet('get_stats'),
    apiGet('get_daily_sales', { days: 7 }),
    apiGet('get_category_stats'),
    apiGet('get_top_products', { limit: 10 })
  ]).then(([stats, daily, catStats, top]) => {
    if (stats?.success) {
      const d = stats.data;
      document.getElementById('a-rev').textContent = CUR + parseFloat(d.total_revenue).toFixed(2);
      document.getElementById('a-orders').textContent = d.total_tx;
      document.getElementById('a-avg').textContent = d.total_tx ? CUR + (d.total_revenue / d.total_tx).toFixed(2) : CUR + '0.00';
    }
    if (top?.success && top.data.length) document.getElementById('a-best').textContent = top.data[0].name;

    // Daily chart
    if (daily?.success) {
      const rows = daily.data;
      const max = Math.max(...rows.map(r => r.revenue), 1);
      const el = document.getElementById('daily-chart');
      if (el) el.innerHTML = rows.map(r =>
        '<div class="bar-row">' +
        '<div class="bar-label">' + r.short + '</div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + (r.revenue / max * 100).toFixed(1) + '%"></div></div>' +
        '<div class="bar-val">' + CUR + parseFloat(r.revenue).toFixed(0) + '</div>' +
        '</div>'
      ).join('');
    }

    // Category chart
    if (catStats?.success) {
      const rows = catStats.data;
      const max = Math.max(...rows.map(r => r.total_revenue), 1);
      const el = document.getElementById('cat-chart');
      if (el) el.innerHTML = rows.length ? rows.map(r =>
        '<div class="bar-row">' +
        '<div class="bar-label" style="font-size:.7rem;">' + r.category + '</div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + (r.total_revenue / max * 100).toFixed(1) + '%"></div></div>' +
        '<div class="bar-val">' + CUR + parseFloat(r.total_revenue).toFixed(0) + '</div>' +
        '</div>'
      ).join('') : '<div style="text-align:center;padding:20px;color:var(--text3);font-size:.83rem;">No data yet</div>';
    }

    // Top list
    if (top?.success) {
      const tops = top.data;
      const el = document.getElementById('top-list');
      if (el) el.innerHTML = tops.length ? tops.map((p, i) => {
        const rc = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
        const imgEl = p.image_data ? '<img src="' + p.image_data + '" style="width:100%;height:100%;object-fit:cover;"/>' : '🍽️';
        return '<div class="top-row">' +
          '<div class="top-rank ' + rc + '">' + (i + 1) + '</div>' +
          '<div class="top-img">' + imgEl + '</div>' +
          '<div class="top-info"><div class="top-name">' + p.name + '</div><div class="top-sales">' + (p.category_name || '') + ' · ' + p.total_sold + ' sold</div></div>' +
          '<div class="top-rev">' + CUR + parseFloat(p.total_revenue).toFixed(2) + '</div>' +
          '</div>';
      }).join('') : '<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-text">No sales yet</div></div>';
    }

    // AI Insight
    if (top?.success && stats?.success) {
      const d = stats.data;
      const t = top.data;
      let msg = '';
      if (d.total_tx < 3) {
        msg = 'Make at least 3 sales to get AI-powered insights and restock recommendations.';
      } else {
        const topNames = t.slice(0, 3).map(p => p.name).join(', ');
        if (catStats?.success && catStats.data.length) {
          msg += '"' + catStats.data[0].category + '" is your top category — consider expanding it. ';
        }
        msg += 'Top sellers: ' + topNames + '. ';
        if (d.low_stock > 0) msg += '⚠️ ' + d.low_stock + ' product(s) are low on stock — reorder soon. ';
        if (d.out_of_stock > 0) msg += '🚨 ' + d.out_of_stock + ' product(s) are out of stock. ';
        msg += 'Avg order value is ' + CUR + (d.total_tx ? (d.total_revenue / d.total_tx).toFixed(2) : '0.00') + '. Maintain 2× stock for top sellers to avoid stockouts.';
      }
      const insightEl = document.getElementById('ai-insight');
      if (insightEl) insightEl.textContent = msg;
    }
  });
}

// ════════════════════════════════
// SETTINGS PAGE
// ════════════════════════════════
function settingsInit() {
  if (cur_page !== 'settings') return;
  apiGet('get_settings').then(r => {
    const s = r?.data || {};
    const sni = document.getElementById('shop-name-inp');
    const ci = document.getElementById('currency-inp');
    const ti = document.getElementById('tax-inp');
    if (sni) sni.value = s.shop_name || '';
    if (ci) ci.value = s.currency || '₱';
    if (ti) ti.value = s.tax_rate || '0';
  });
  loadUsers();
}

function saveSettings() {
  const shop_name = document.getElementById('shop-name-inp')?.value || '';
  const currency = document.getElementById('currency-inp')?.value || '₱';
  const tax_rate = document.getElementById('tax-inp')?.value || '0';
  apiPost('save_settings', { shop_name, currency, tax_rate }).then(r => {
    toast(r?.success ? 'Settings saved!' : 'Error saving settings', r?.success ? 'success' : 'error');
  });
}

function changePW() {
  const o = document.getElementById('old-pw')?.value || '';
  const n = document.getElementById('new-pw')?.value || '';
  if (!o || !n) { toast('Please fill both password fields', 'error'); return; }
  if (n.length < 6) { toast('New password must be at least 6 characters', 'error'); return; }
  apiPost('change_password', { old_password: o, new_password: n }).then(r => {
    if (!r?.success) { toast(r?.error || 'Error changing password', 'error'); return; }
    toast('Password updated successfully!', 'success');
    document.getElementById('old-pw').value = '';
    document.getElementById('new-pw').value = '';
  });
}

function loadUsers() {
  const el = document.getElementById('users-list');
  if (!el) return;
  apiGet('get_users').then(r => {
    if (!r?.success) return;
    el.innerHTML = r.data.map(u =>
      '<div style="display:flex;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid var(--border);">' +
        '<div style="flex:1;">' +
          '<div style="font-size:.88rem;font-weight:600;">' + (u.full_name || u.username) + '</div>' +
          '<div style="font-size:.74rem;color:var(--text3);">@' + u.username + ' · ' + u.role + '</div>' +
        '</div>' +
        '<button type="button" class="btn btn-danger btn-sm" onclick="deleteUser(' + u.id + ')">Delete</button>' +
      '</div>'
    ).join('');
  });
}

function addUser() {
  const u = document.getElementById('new-uname')?.value.trim() || '';
  const p = document.getElementById('new-upass')?.value || '';
  const fn = document.getElementById('new-uname-full')?.value.trim() || '';
  const role = document.getElementById('new-urole')?.value || 'staff';
  if (!u || !p) { toast('Username and password are required', 'error'); return; }
  apiPost('add_user', { username: u, password: p, full_name: fn, role }).then(r => {
    if (!r?.success) { toast(r?.error || 'Error adding user', 'error'); return; }
    toast('User added!', 'success');
    ['new-uname', 'new-upass', 'new-uname-full'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    loadUsers();
  });
}

function deleteUser(id) {
  if (!confirm('Delete this user account?')) return;
  apiGet('delete_user', { id }).then(r => {
    if (!r?.success) { toast(r?.error || 'Error deleting user', 'error'); return; }
    toast('User deleted', 'success');
    loadUsers();
  });
}

// ── INIT ON PAGE LOAD ──

// ════════════════════════════════════════════════
// BARCODE GENERATION (JsBarcode — CODE128)
// ════════════════════════════════════════════════

function generateBarcode(value, svgId) {
  const svg = document.getElementById(svgId || 'barcode-svg');
  const wrap = document.getElementById('qr-preview-wrap');
  if (!svg) return;
  if (wrap) wrap.style.display = 'block';
  if (typeof JsBarcode === 'undefined') {
    svg.innerHTML = '<text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="11" fill="#888">Loading barcode lib…</text>';
    return;
  }
  try {
    JsBarcode(svg, value, {
      format: 'CODE128',
      width: 2, height: 55,
      displayValue: true,
      fontSize: 11,
      margin: 6,
      background: '#ffffff',
      lineColor: '#1a1a1a'
    });
  } catch(e) {
    svg.innerHTML = '<text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="10" fill="#c00">Invalid barcode value</text>';
  }
}

// Kept as alias — called in several places
function generateQRCode(text) {
  let bc = text;
  try { const d = JSON.parse(text); bc = d.barcode || text; } catch(e) {}
  generateBarcode(bc, 'barcode-svg');
}

function showQRPreview() {
  const barcode = document.getElementById('p-barcode')?.value;
  if (!barcode) { toast('Enter a barcode value first', 'warning'); return; }
  generateBarcode(barcode, 'barcode-svg');
}

function genBarcode() {
  const bc = 'BC-' + Math.random().toString(36).substr(2, 8).toUpperCase();
  const inp = document.getElementById('p-barcode');
  if (inp) { inp.value = bc; }
}

function downloadBarcode() {
  const svg = document.getElementById('barcode-svg');
  if (!svg) return;
  const name = document.getElementById('p-name')?.value || 'product';
  const barcode = document.getElementById('p-barcode')?.value || 'bc';
  const svgData = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([svgData], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 300; canvas.height = img.naturalHeight || 100;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img, 0, 0);
    const a = document.createElement('a');
    a.download = 'barcode_' + barcode + '.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
    URL.revokeObjectURL(url);
    toast('Barcode downloaded!', 'success');
  };
  img.src = url;
}
// Alias
function downloadQR() { downloadBarcode(); }

function printBarcode() {
  const svg = document.getElementById('barcode-svg');
  const name = document.getElementById('p-name')?.value || 'Product';
  const barcode = document.getElementById('p-barcode')?.value || '';
  if (!svg) return;
  const svgData = new XMLSerializer().serializeToString(svg);
  const win = window.open('', '_blank');
  win.document.write('<html><head><style>body{font-family:sans-serif;text-align:center;padding:30px;margin:0;}h3{margin:0 0 4px;}p{color:#888;font-size:11px;margin:0 0 10px;}</style></head><body>' +
    '<h3>' + name + '</h3><p>' + barcode + '</p>' + svgData +
    '<script>window.onload=function(){window.print();window.close();}<\/script></body></html>');
  win.document.close();
}
// Alias
function printQR() { printBarcode(); }

// ════════════════════════════════════════════════
// PRINT ALL BARCODES (5 per row, custom qty each)
// ════════════════════════════════════════════════
// whProds populated by warehouseInit; fallback to empty
function openPrintAllModal() {
  const prods = (typeof whProds !== 'undefined' ? whProds : []).filter(p => p.barcode);
  if (!prods.length) {
    // Try fetching fresh
    apiGet('get_warehouse_products').then(r => {
      whProds = r?.data || [];
      buildPrintAllList(whProds.filter(p => p.barcode));
      openModal('print-all-modal');
    });
    return;
  }
  buildPrintAllList(prods);
  openModal('print-all-modal');
}

function buildPrintAllList(prods) {
  const el = document.getElementById('print-all-list');
  if (!el) return;
  if (!prods.length) { el.innerHTML = '<p style="color:var(--text3);font-size:.83rem;text-align:center;padding:12px;">No products with barcodes found.</p>'; return; }
  el.innerHTML = prods.map(p =>
    '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border);">' +
      '<div style="flex:1;font-size:.84rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + p.name + '</div>' +
      '<div style="font-size:.72rem;color:var(--text3);min-width:90px;text-align:right;">' + p.barcode + '</div>' +
      '<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">' +
        '<label style="font-size:.72rem;color:var(--text2);">Qty:</label>' +
        '<input type="number" min="1" max="200" value="1" class="bc-qty-inp" ' +
          'data-barcode="' + p.barcode + '" data-name="' + (p.name||'').replace(/"/g,'&quot;') + '" ' +
          'style="width:52px;padding:3px 6px;border:1.5px solid var(--border);border-radius:6px;font-size:.8rem;"/>' +
      '</div>' +
    '</div>'
  ).join('');
}

function doPrintAll() {
  const inputs = document.querySelectorAll('.bc-qty-inp');
  const items = [];
  inputs.forEach(inp => {
    const qty = Math.max(1, Math.min(200, parseInt(inp.value)||1));
    for (let i = 0; i < qty; i++) {
      items.push({ barcode: inp.dataset.barcode, name: inp.dataset.name });
    }
  });
  if (!items.length) { toast('No items to print', 'error'); return; }

  // Build rows of 5
  let rows = '';
  for (let i = 0; i < items.length; i += 5) {
    const chunk = items.slice(i, i+5);
    // Pad to 5 with empty cells
    while (chunk.length < 5) chunk.push(null);
    const cells = chunk.map(it => {
      if (!it) return '<td style="width:20%;padding:3px;"></td>';
      return '<td style="width:20%;padding:3px;text-align:center;vertical-align:top;">' +
        '<svg class="bc-svg" data-bc="' + it.barcode + '" style="width:100%;height:52px;display:block;"></svg>' +
        '<div style="font-size:7px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px;">' + it.name + '</div>' +
        '<div style="font-size:6px;color:#888;">' + it.barcode + '</div>' +
      '</td>';
    }).join('');
    rows += '<tr>' + cells + '</tr>';
  }

  const jsUrl = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js';
  const win = window.open('', '_blank');
  win.document.write('<!DOCTYPE html><html><head><title>Barcode Print</title>' +
    '<script src="' + jsUrl + '"><\/script>' +
    '<style>*{margin:0;padding:0;box-sizing:border-box;}' +
    'body{font-family:Arial,sans-serif;}' +
    'table{width:100%;border-collapse:collapse;}' +
    'td{border:1px dashed #ddd;vertical-align:top;}' +
    '@media print{@page{margin:8mm;}}</style></head><body>' +
    '<table>' + rows + '</table>' +
    '<script>window.onload=function(){' +
      'document.querySelectorAll(".bc-svg").forEach(function(svg){' +
        'var bc=svg.getAttribute("data-bc");' +
        'try{JsBarcode(svg,bc,{format:"CODE128",width:1.4,height:36,displayValue:true,fontSize:7,margin:2});}catch(e){}' +
      '});' +
      'setTimeout(function(){window.print();window.close();},900);' +
    '}<\/script></body></html>');
  win.document.close();
  closeModal('print-all-modal');
}

// ════════════════════════════════════════════════
// BARCODE SCANNER (jsQR) — one item per scan
// ════════════════════════════════════════════════
let scanStream = null, scanInterval = null, scanCooldown = false;

async function startScanner(videoId, canvasId, onResult) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    scanStream = stream;
    const video = document.getElementById(videoId);
    if (!video) { stream.getTracks().forEach(t=>t.stop()); return; }
    video.srcObject = stream;
    await video.play();
    const offscreen = document.getElementById(canvasId) || document.createElement('canvas');
    scanCooldown = false;
    scanInterval = setInterval(() => {
      if (scanCooldown || video.readyState < video.HAVE_ENOUGH_DATA) return;
      offscreen.width = video.videoWidth;
      offscreen.height = video.videoHeight;
      const ctx = offscreen.getContext('2d');
      ctx.drawImage(video, 0, 0);
      const img = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
      if (typeof jsQR !== 'undefined') {
        const code = jsQR(img.data, img.width, img.height);
        if (code) { scanCooldown = true; onResult(code.data); }
      }
    }, 200);
  } catch(e) {
    toast('Camera access denied — use manual entry below', 'warning');
  }
}

function stopScanner() {
  if (scanInterval) { clearInterval(scanInterval); scanInterval = null; }
  if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; }
  scanCooldown = false;
}

// Re-enable scanning after cooldown (for dashboard continuous use)
function resumeScanning(ms) {
  setTimeout(() => { if (scanStream) scanCooldown = false; }, ms || 1800);
}

// ── WAREHOUSE SCANNER ──
function openScanModal() {
  document.getElementById('scan-result').style.display = 'none';
  document.getElementById('scan-status').textContent = 'Point camera at barcode';
  openModal('scan-modal');
  startScanner('scan-video', 'scan-canvas', code => {
    stopScanner();
    handleWarehouseScan(code);
  });
}
function closeScanModal() { stopScanner(); closeModal('scan-modal'); }

function handleWarehouseScan(code) {
  let barcode = code;
  try { const d = JSON.parse(code); barcode = d.barcode || code; } catch(e) {}
  const statusEl = document.getElementById('scan-status');
  const resultEl = document.getElementById('scan-result');
  if (statusEl) statusEl.textContent = 'Looking up: ' + barcode;
  apiGet('get_product_by_barcode', { barcode }).then(r => {
    if (!r?.success) {
      if (resultEl) { resultEl.style.display='block'; resultEl.innerHTML='<div style="color:var(--danger);">❌ Not found: '+barcode+'</div>'; }
      if (statusEl) statusEl.textContent = 'Product not found — try again';
      return;
    }
    const p = r.data;
    if (resultEl) {
      resultEl.style.display = 'block';
      resultEl.innerHTML =
        '<div style="font-weight:700;margin-bottom:5px;">✅ ' + p.name + '</div>' +
        '<div style="font-size:.78rem;color:var(--text3);">Barcode: '+p.barcode+' · Stock: '+p.quantity+' · '+CUR+parseFloat(p.price).toFixed(2)+'</div>' +
        '<div style="display:flex;gap:7px;margin-top:10px;">' +
          '<button type="button" class="btn btn-primary btn-sm" onclick="prefillMovement('+p.id+','in')">📦 Restock</button>' +
          '<button type="button" class="btn btn-secondary btn-sm" onclick="prefillMovement('+p.id+','out')">📤 Remove</button>' +
        '</div>';
    }
    if (statusEl) statusEl.textContent = '✅ Found!';
  });
}

function lookupManualBarcode() {
  const bc = document.getElementById('manual-barcode-inp')?.value.trim();
  if (bc) handleWarehouseScan(bc);
}
function prefillMovement(id, type) { closeScanModal(); openMoveModal(id, type); }

// ── DASHBOARD SCANNER — one item per scan, cooldown between scans ──
function openDashScan() {
  openModal('dash-scan-modal');
  updateScanCartCount();
  const statusEl = document.getElementById('dash-scan-status');
  if (statusEl) statusEl.textContent = 'Point at barcode — adds one item per scan';
  startScanner('dash-scan-video', null, code => {
    // scanCooldown already set to true — won't scan again until resumeScanning fires
    let barcode = code;
    try { const d = JSON.parse(code); barcode = d.barcode || code; } catch(e) {}
    if (statusEl) statusEl.textContent = '⏳ Processing…';
    apiGet('get_product_by_barcode', { barcode }).then(r => {
      if (!r?.success) {
        toast('Not found: ' + barcode, 'error');
        if (statusEl) statusEl.textContent = '❌ Not found — scan next item';
        resumeScanning(1500);
        return;
      }
      const p = r.data;
      if (!allProds.find(x => x.id == p.id)) allProds.push(p);
      addToCart(p.id);
      updateScanCartCount();
      if (statusEl) statusEl.textContent = '✅ Added: ' + p.name + ' — ready for next scan';
      toast('Added: ' + p.name, 'success');
      resumeScanning(1800); // 1.8s cooldown before next scan allowed
    });
  });
}

function updateScanCartCount() {
  const cnt = (typeof cart !== 'undefined') ? cart.reduce((s,c)=>s+c.qty,0) : 0;
  const el = document.getElementById('scan-cart-count');
  if (el) el.textContent = cnt;
}

function closeDashScan() { stopScanner(); closeModal('dash-scan-modal'); }

function dashManualLookup() {
  const bc = document.getElementById('dash-manual-bc')?.value.trim();
  if (!bc) return;
  let barcode = bc;
  try { const d = JSON.parse(bc); barcode = d.barcode || bc; } catch(e) {}
  apiGet('get_product_by_barcode', { barcode }).then(r => {
    if (!r?.success) { toast('Not found: ' + barcode, 'error'); return; }
    const p = r.data;
    if (!allProds.find(x => x.id == p.id)) allProds.push(p);
    addToCart(p.id);
    updateScanCartCount();
    document.getElementById('dash-manual-bc').value = '';
    toast('Added: ' + p.name, 'success');
  });
}

// ════════════════════════════════════════════════
// DRAGGABLE SCANNER BUTTON
// ════════════════════════════════════════════════
function initDraggableScanner() {
  const el = document.getElementById('scanner-float');
  if (!el) return;
  let dragging = false, startX, startY, origL, origT, moved = false;

  function pointerStart(cx, cy) {
    dragging = true; moved = false;
    startX = cx; startY = cy;
    const r = el.getBoundingClientRect();
    origL = r.left; origT = r.top;
    el.style.right = 'auto'; el.style.bottom = 'auto';
    el.style.left = origL + 'px'; el.style.top = origT + 'px';
  }
  function pointerMove(cx, cy) {
    if (!dragging) return;
    const dx = cx - startX, dy = cy - startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
    const maxL = window.innerWidth - el.offsetWidth;
    const maxT = window.innerHeight - el.offsetHeight;
    el.style.left = Math.max(0, Math.min(maxL, origL + dx)) + 'px';
    el.style.top  = Math.max(0, Math.min(maxT, origT + dy)) + 'px';
  }
  function pointerEnd() { dragging = false; }

  el.addEventListener('mousedown', e => { e.preventDefault(); pointerStart(e.clientX, e.clientY); });
  document.addEventListener('mousemove', e => pointerMove(e.clientX, e.clientY));
  document.addEventListener('mouseup', pointerEnd);

  el.addEventListener('touchstart', e => {
    pointerStart(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (dragging) { e.preventDefault(); pointerMove(e.touches[0].clientX, e.touches[0].clientY); }
  }, { passive: false });
  document.addEventListener('touchend', pointerEnd);
}

// ════════════════════════════════════════════════
// WAREHOUSE PAGE
// ════════════════════════════════════════════════
let whProds = [], whFilter = 'all';

function warehouseInit() {
  if (cur_page !== 'warehouse') return;
  apiGet('get_settings').then(s => { CUR = s?.data?.currency || '₱'; });
  loadWhProducts();
  loadWhLog();
  loadExpiryAlerts();
}

function loadWhProducts() {
  apiGet('get_products').then(r => {
    if (!r?.success) return;
    whProds = r.data;
    updateWhStats();
    renderWhProducts();
  });
}

function updateWhStats() {
  const total = whProds.length;
  const low = whProds.filter(p => p.quantity > 0 && p.quantity <= 5).length;
  const value = whProds.reduce((s, p) => s + (parseFloat(p.price) * parseInt(p.quantity)), 0);
  const today = new Date();
  const in7 = new Date(today); in7.setDate(today.getDate() + 7);
  const expiring = whProds.filter(p => {
    if (!p.expiry_date) return false;
    const exp = new Date(p.expiry_date);
    return exp >= today && exp <= in7;
  }).length;
  document.getElementById('wh-total').textContent = total;
  document.getElementById('wh-low').textContent = low;
  document.getElementById('wh-value').textContent = CUR + value.toFixed(2);
  document.getElementById('wh-expiring').textContent = expiring;
}

function setWhFilter(f, btn) {
  whFilter = f;
  document.querySelectorAll('#wh-filter-pills .cat-pill').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderWhProducts();
}

function getExpiryStatus(expiry_date) {
  if (!expiry_date) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const exp = new Date(expiry_date); exp.setHours(0,0,0,0);
  const diff = Math.ceil((exp - today) / (1000*60*60*24));
  if (diff < 0) return { label: 'EXPIRED', cls: 'expired', days: diff };
  if (diff <= 3) return { label: diff === 0 ? 'Expires TODAY' : 'Expires in ' + diff + 'd', cls: 'critical', days: diff };
  if (diff <= 7) return { label: 'Expires in ' + diff + 'd', cls: 'soon', days: diff };
  return { label: exp.toLocaleDateString('en', {month:'short',day:'numeric',year:'numeric'}), cls: 'ok', days: diff };
}

function renderWhProducts() {
  const q = (document.getElementById('wh-search')?.value || '').toLowerCase();
  const today = new Date(); today.setHours(0,0,0,0);
  const in7 = new Date(today); in7.setDate(today.getDate() + 7);

  let list = whProds.filter(p => {
    if (q && !p.name.toLowerCase().includes(q) && !(p.barcode||'').toLowerCase().includes(q)) return false;
    if (whFilter === 'low') return p.quantity > 0 && p.quantity <= 5;
    if (whFilter === 'out') return p.quantity == 0;
    if (whFilter === 'expiring') {
      if (!p.expiry_date) return false;
      const exp = new Date(p.expiry_date);
      return exp >= today && exp <= in7;
    }
    if (whFilter === 'expired') {
      if (!p.expiry_date) return false;
      return new Date(p.expiry_date) < today;
    }
    return true;
  });

  const body = document.getElementById('wh-body');
  const empty = document.getElementById('wh-empty');
  if (!list.length) {
    body.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  body.innerHTML = list.map(p => {
    const expSt = getExpiryStatus(p.expiry_date);
    const expiryHTML = expSt
      ? '<span class="expiry-' + expSt.cls + '">' + expSt.label + '</span>'
      : '<span style="color:var(--text3);font-size:.78rem;">—</span>';

    let statusHTML;
    if (p.quantity == 0) statusHTML = '<span class="status-pill status-out">Out of Stock</span>';
    else if (p.quantity <= 5) statusHTML = '<span class="status-pill status-low">Low Stock</span>';
    else if (expSt && expSt.cls === 'expired') statusHTML = '<span class="status-pill status-expired">Expired</span>';
    else if (expSt && (expSt.cls === 'critical' || expSt.cls === 'soon')) statusHTML = '<span class="status-pill status-expiring">Expiring</span>';
    else statusHTML = '<span class="status-pill status-ok">Good</span>';

    return '<tr>' +
      '<td><div style="font-weight:600;font-size:.88rem;">' + p.name + '</div><div style="font-size:.72rem;color:var(--text3);">' + (p.category_name||'') + '</div></td>' +
      '<td><code style="font-size:.75rem;background:var(--surface2);padding:2px 6px;border-radius:5px;">' + (p.barcode||'—') + '</code></td>' +
      '<td style="font-weight:700;font-size:.95rem;">' + p.quantity + '</td>' +
      '<td class="move-in">+' + (p.warehouse_in||0) + '</td>' +
      '<td class="move-out">-' + (p.warehouse_out||0) + '</td>' +
      '<td>' + expiryHTML + '</td>' +
      '<td>' + statusHTML + '</td>' +
      '<td style="display:flex;gap:5px;">' +
        '<button type="button" class="btn btn-secondary btn-sm" onclick="openMoveModal(' + p.id + ',\'in\')" title="Restock">📦</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" onclick="showProductBarcode(' + p.id + ',' + JSON.stringify(p.barcode||'') + ',' + JSON.stringify(p.name) + ')" title="Show Barcode">🏷️</button>' +
      '</td>' +
      '</tr>';
  }).join('');
}

function loadWhLog() {
  apiGet('get_warehouse_log', { limit: 30 }).then(r => {
    if (!r?.success) return;
    const body = document.getElementById('wh-log-body');
    const empty = document.getElementById('wh-log-empty');
    if (!r.data.length) { body.innerHTML=''; empty.style.display='block'; return; }
    empty.style.display = 'none';
    body.innerHTML = r.data.map(row => {
      const isIn = row.qty_in > 0;
      return '<tr>' +
        '<td style="font-weight:600;">' + (row.product_name||'—') + '</td>' +
        '<td>' + (isIn ? '<span class="move-in">📦 Stock In</span>' : '<span class="move-out">📤 Stock Out</span>') + '</td>' +
        '<td style="font-weight:700;">' + (isIn ? '+'+row.qty_in : '-'+row.qty_out) + '</td>' +
        '<td style="color:var(--text3);font-size:.82rem;">' + (row.note||'—') + '</td>' +
        '<td style="font-size:.78rem;">' + (row.added_by||'—') + '</td>' +
        '<td style="font-size:.75rem;color:var(--text3);">' + fmtDate(row.created_at) + '</td>' +
        '</tr>';
    }).join('');
  });
}

function loadExpiryAlerts() {
  apiGet('get_expiring_products', { days: 7 }).then(r => {
    const el = document.getElementById('expiry-alerts');
    if (!el || !r?.success || !r.data.length) return;
    el.innerHTML = r.data.slice(0, 5).map(p => {
      const expSt = getExpiryStatus(p.expiry_date);
      const isCritical = expSt && (expSt.cls === 'critical' || expSt.cls === 'expired');
      return '<div class="expiry-alert-banner' + (isCritical ? '' : ' warn') + '">' +
        '<span style="font-size:1.2rem;">' + (isCritical ? '🚨' : '⚠️') + '</span>' +
        '<div><strong>' + p.name + '</strong> — ' + (expSt?.label||'') + '</div>' +
        '</div>';
    }).join('');
  });
}

function openMoveModal(productId, type) {
  const sel = document.getElementById('move-product');
  if (sel) {
    sel.innerHTML = whProds.map(p => '<option value="' + p.id + '"' + (p.id == productId ? ' selected' : '') + '>' + p.name + ' (Stock: ' + p.quantity + ')</option>').join('');
  }
  const typeSel = document.getElementById('move-type');
  if (typeSel && type) typeSel.value = type;
  document.getElementById('move-qty').value = '';
  document.getElementById('move-note').value = '';
  openModal('move-modal');
}

function saveMovement() {
  const pid = parseInt(document.getElementById('move-product')?.value);
  const type = document.getElementById('move-type')?.value || 'in';
  const qty = parseInt(document.getElementById('move-qty')?.value);
  const note = document.getElementById('move-note')?.value.trim() || '';
  if (!pid || !qty || qty < 1) { toast('Select product and enter quantity', 'error'); return; }
  const btn = document.getElementById('save-move-btn');
  setLoading(btn, true);
  apiPost('add_warehouse_movement', { product_id: pid, type, qty, note }).then(r => {
    setLoading(btn, false);
    if (!r?.success) { toast(r?.error || 'Error saving movement', 'error'); return; }
    toast('Stock movement saved!', 'success');
    closeModal('move-modal');
    loadWhProducts();
    loadWhLog();
  });
}

// Show QR for existing product from warehouse page
let whQrDiv = null;
function showProductBarcode(productId, barcode, name) {
  if (!barcode) { toast('No barcode for this product', 'warning'); return; }
  // Build a small modal inline
  const existing = document.getElementById('prod-bc-modal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'prod-bc-modal';
  modal.className = 'modal-overlay active';
  modal.innerHTML =
    '<div class="modal" style="max-width:340px;text-align:center;">' +
      '<div class="modal-header"><span class="modal-title">🏷️ ' + name + '</span>' +
        '<button class="modal-close" onclick="document.getElementById('prod-bc-modal').remove()">✕</button></div>' +
      '<svg id="wh-barcode-svg" style="max-width:280px;height:80px;display:block;margin:10px auto;background:#fff;border-radius:6px;padding:6px;"></svg>' +
      '<p style="font-size:.75rem;color:var(--text3);margin-bottom:12px;">' + barcode + '</p>' +
      '<div style="display:flex;gap:8px;justify-content:center;">' +
        '<button type="button" class="btn btn-primary btn-sm" onclick="printWhBarcode(''+barcode+'',''+name.replace(/'/g,"\'")+'')" >🖨️ Print</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('prod-bc-modal').remove()">Close</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
  setTimeout(() => {
    if (typeof JsBarcode !== 'undefined') {
      try {
        JsBarcode('#wh-barcode-svg', barcode, {
          format: 'CODE128', width: 2, height: 55,
          displayValue: true, fontSize: 11, margin: 6,
          background: '#ffffff', lineColor: '#1a1a1a'
        });
      } catch(e) {}
    }
  }, 50);
}
// Keep old name as alias
function showProductQR(id, bc, name) { showProductBarcode(id, bc, name); }


function downloadWhQR(barcode, name) {
  const canvas = document.getElementById('wh-qr-canvas');
  if (!canvas) return;
  const a = document.createElement('a');
  a.download = 'qr_' + barcode + '.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
  toast('QR Downloaded!', 'success');
}

function printWhBarcode(barcode, name) {
  const win = window.open('', '_blank');
  win.document.write('<!DOCTYPE html><html><head>' +
    '<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>' +
    '<style>body{font-family:sans-serif;text-align:center;padding:30px;}h3{margin:0 0 4px;}p{color:#888;font-size:11px;margin:0 0 10px;}</style>' +
    '</head><body><h3>' + name + '</h3><p>' + barcode + '</p>' +
    '<svg id="psvg" style="max-width:300px;height:80px;display:block;margin:0 auto;"></svg>' +
    '<script>window.onload=function(){try{JsBarcode("#psvg","' + barcode + '",{format:"CODE128",width:2,height:60,displayValue:true,fontSize:12,margin:8});}catch(e){}setTimeout(function(){window.print();window.close();},600);}<\/script>' +
    '</body></html>');
  win.document.close();
}
function printWhQR(bc, name) { printWhBarcode(bc, name); }

document.addEventListener('DOMContentLoaded', function() {
  dashInit();
  prodsInit();
  salesInit();
  analyticsInit();
  settingsInit();
  warehouseInit();
  // Show & init draggable scanner on dashboard
  const sf = document.getElementById('scanner-float');
  if (sf && typeof cur_page !== 'undefined' && cur_page === 'dashboard') {
    sf.style.display = 'block';
    initDraggableScanner();
  } else if (sf && document.getElementById('dash-scan-modal')) {
    sf.style.display = 'block';
    initDraggableScanner();
  }
  // Sync cart count in scanner pay button whenever cart changes
  const origRenderCart = typeof renderCart === 'function' ? renderCart : null;
});



// ════════════════════════════════════════════════
// CSV EXPORT HELPERS
// ════════════════════════════════════════════════

function downloadCSV(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'export.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  toast('Downloading ' + (filename || 'CSV') + '…', 'success');
}

function exportSales() {
  const date = document.getElementById('date-filter')?.value || '';
  const suffix = date ? '_' + date : '_all';
  downloadCSV('/api/export/sales' + (date ? '?date=' + date : ''), 'sales' + suffix + '.csv');
}

function exportSalesItems() {
  const date = document.getElementById('date-filter')?.value || '';
  const suffix = date ? '_' + date : '_all';
  downloadCSV('/api/export/sales_items' + (date ? '?date=' + date : ''), 'sales_items' + suffix + '.csv');
}

function exportProducts() {
  downloadCSV('/api/export/products', 'products.csv');
}

function exportInventory() {
  downloadCSV('/api/export/inventory', 'inventory.csv');
}

function exportWarehouseLog() {
  downloadCSV('/api/export/warehouse_log', 'warehouse_log.csv');
}
