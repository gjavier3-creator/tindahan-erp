/* =========================================================
   TINDAHAN ERP — single-file store management app
   Data model (Firestore collection "tindahan-store", one doc per key):
     'store-config'   -> { name }
     'inventory'       -> [ {id,name,category,unit,cost,price,qty,reorder} ]
     'sales'           -> [ {id,itemId,name,qty,price,cost,total,ts} ]
     'receipts-index'  -> [ {id,date,supplier,total,itemCount} ]
     'receipt:<id>'    -> { id,date,supplier,image,rawText,items,total }
   ========================================================= */

const ICONS = {
  dashboard:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  inventory:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></svg>',
  sell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 7H6"/></svg>',
  receipts:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h12v18l-3-2-3 2-3-2-3 2V2z"/><path d="M9 8h6M9 12h6"/></svg>',
  reports:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V10M12 20V4M20 20v-7"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 5v14M5 12h14"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>',
  camera:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="14" r="4"/></svg>',
  close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  wifi:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 8.5a16 16 0 0 1 20 0"/><path d="M5.5 12.5a11 11 0 0 1 13 0"/><path d="M9 16.5a6 6 0 0 1 6 0"/><circle cx="12" cy="20" r="1.2" fill="currentColor" stroke="none"/></svg>',
  log:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
};

const TABS = [
  {id:'dashboard', label:'Home', icon:'dashboard'},
  {id:'inventory', label:'Stocks', icon:'inventory'},
  {id:'sell', label:'Bentahan', icon:'sell'},
  {id:'vouchers', label:'Vouchers', icon:'wifi'},
  {id:'log', label:'Log', icon:'log'},
  {id:'receipts', label:'Resibo', icon:'receipts'},
  {id:'reports', label:'Reports', icon:'reports'},
];

// Best-effort draft transcribed from the user's handwritten stock sheets (Aug 13 counts).
// Cost left blank (0) since the sheets only show retail price — user should fill in actual supplier cost per item.
// Format per line: Name, Retail Price, Qty on hand
const DRAFT_IMPORT_TEXT = `Summit, 25, 104
Mountain Dew, 30, 48
Coke Promo, 25, 117
C2, 35, 8
Gatorade, 55, 42
Century Tuna, 40, 1
Ball Pen, 10, 269
Paper Cups, 5, 16
Envelope, 5, 40
Plastic Bag, 3, 1070
Moby, 50, 7
Royal / Pepsi Can, 50, 1
Sundae, 30, 24
Double Choco, 30, 37
Chocolate Crispy, 30, 34
Corn Crispy, 25, 28
Coffee Crispy, 25, 58
Strawberry Crispy, 25, 32
Mango Corn, 25, 18
Chocomelt, 25, 22
Chocolate Stick, 15, 95
Banana Stick, 15, 47
Watermelon Stick, 15, 55
Fruit Pop, 15, 30
Cugo, 20, 240
Boy Bawang, 30, 4
Chichirya Mix, 30, 4
Hansel, 10, 25
Presto Cream Choco, 10, 41
Presto Butter, 10, 22
Crossini, 15, 28
Fudgee Bar, 15, 55
Choco Mucho, 15, 0
Cloud 9, 15, 0
SunFlakes, 15, 63
San Mig, 15, 56
Nescafe 3in1, 15, 230
Kopiko Black, 15, 246
Kopiko Blanca, 15, 135
Kopiko Supremo, 15, 135
Milo, 15, 37
Nescafe Stick, 10, 138
Maxx Blue, 2, 0
Maxx Red, 2, 50
Alcohol, 30, 2
Toothbrush, 30, 91
Green Cross, 20, 10
Shampoo, 10, 48
Toothpaste, 10, 70
Gatsby, 10, 4
Nivea, 10, 70
Champion Detergent, 15, 16
Chicharon Seafood, 35, 8
Chicharon Spicy Beef, 35, 39
Chicharon Bulalo, 35, 48
Chicharon Beef, 35, 4
Soupermeal, 55, 0
Slippers, 80, 93`;

const DEFAULT_CATEGORIES = ['Coffee','Drinks','Ice Cream','Snacks','Toiletries','Others'];

// A code is 'used' once sold. Otherwise it's 'expired' if it has an expiry date
// that has passed, computed live (nothing is silently rewritten in storage).
function voucherCodeStatus(c){
  if(c.status==='used') return 'used';
  if(c.expiryDate && c.expiryDate < todayStr()) return 'expired';
  return 'unused';
}
function voucherStockCount(typeId){
  return state.voucherCodes.filter(c=>c.typeId===typeId && voucherCodeStatus(c)==='unused').length;
}
function gcashSuggestedFee(amount){
  amount = Number(amount)||0;
  if(amount<=0) return 0;
  return Math.ceil(amount/500)*10;
}
// The fee's effect on float depends on WHICH side of the transaction it's taken from,
// not just cash-in vs cash-out:
//   feeMode 'add'    — customer pays the fee separately (on top), as an extra cash
//                       payment or extra GCash sent. The amount that actually moves as
//                       e-money stays at face value.
// GCash Wallet: the e-money balance in the owner's GCash account.
// Cash-In always sends wallet DOWN (owner sends GCash out); Cash-Out always sends it UP
// (customer sends GCash in). How much depends on feeMode — see notes below.
function computeGcashWallet(){
  let wallet = state.config.gcashFloatStart || 0;
  for(const g of state.gcash){
    const fee = g.fee || 0;
    const mode = g.feeMode || 'add'; // legacy records predate this field
    if(g.type === 'cash-out'){
      wallet += (mode==='add') ? (g.amount + fee) : g.amount;
    } else {
      wallet -= (mode==='add') ? g.amount : (g.amount - fee);
    }
  }
  return wallet;
}
// Cash on Hand: the physical cash the employee is holding from GCash transactions.
//   feeMode 'add'    — customer pays fee as separate cash. Cash-In: employee receives
//                       amount+fee in cash (all of it, fee included, stays as cash
//                       profit). Cash-Out: employee hands out exactly "amount" cash.
//   feeMode 'deduct' — Cash-In: employee receives exactly "amount" cash (face value).
//                       Cash-Out: employee hands out "amount − fee" (keeps the fee).
function computeCashOnHand(){
  let cash = state.config.cashOnHandStart || 0;
  for(const g of state.gcash){
    const fee = g.fee || 0;
    const mode = g.feeMode || 'add';
    if(g.type === 'cash-out'){
      cash -= (mode==='add') ? g.amount : (g.amount - fee);
    } else {
      cash += (mode==='add') ? (g.amount + fee) : g.amount;
    }
  }
  return cash;
}
// E-Load balance: prepaid load credit bought in bulk from the network/supplier, sold
// off in pieces to customers. Balance only moves by the load amount sent — the fee is
// separate cash the customer pays on top, pure profit, doesn't touch the balance.
function computeEloadBalance(){
  let balance = state.config.eloadBalanceStart || 0;
  for(const l of state.eload) balance -= l.amount;
  return balance;
}

function parseBulkLines(raw){
  return raw.split('\n').map(l=>l.trim()).filter(Boolean).map(line=>{
    const parts = line.split(',').map(p=>p.trim());
    if(parts.length<3) return null;
    const name = parts[0];
    const price = parseFloat(parts[1]);
    const qty = parseInt(parts[2]);
    const costRaw = parts[3]!==undefined ? parseFloat(parts[3]) : 0;
    if(!name || isNaN(price) || isNaN(qty)) return null;
    return {name, price, qty, cost: isNaN(costRaw)?0:costRaw};
  }).filter(Boolean);
}
function parseBulkImportText(raw){
  // fresh item objects, for seeding an empty store
  return parseBulkLines(raw).map(r=>({id:uid(), name:r.name, category:'', unit:'pc', cost:r.cost, price:r.price, qty:r.qty, reorder:5, remarks:''}));
}
function mergeBulkIntoInventory(raw, inventory){
  const rows = parseBulkLines(raw);
  let added=0, updated=0;
  for(const r of rows){
    const existing = inventory.find(i=>i.name.toLowerCase()===r.name.toLowerCase());
    if(existing){
      existing.price = r.price; existing.qty = r.qty;
      if(r.cost>0) existing.cost = r.cost;
      updated++;
    } else {
      inventory.push({id:uid(), name:r.name, category:'', unit:'pc', cost:r.cost, price:r.price, qty:r.qty, reorder:5, remarks:''});
      added++;
    }
  }
  const totalLines = raw.split('\n').map(l=>l.trim()).filter(Boolean).length;
  return {added, updated, skipped: totalLines - rows.length};
}

let state = {
  config: {name:'Tindahan', ownerPin:'', gcashFloatStart:0, cashOnHandStart:0, eloadBalanceStart:0},
  inventory: [],
  sales: [],
  receiptsIndex: [],
  categories: [],
  expenses: [],
  utang: [],       // [{id,name,contact,balance,history:[{id,type,amount,remarks,date,addedBy}]}]
  gcash: [],        // [{id,date,type:'cash-in'|'cash-out',amount,fee,remarks,addedBy}]
  vouchers: [],     // [{id,name,cost,price}]  -- voucher TYPES only; stock comes from voucherCodes
  voucherCodes: [], // [{id,typeId,code,status:'unused'|'used',expiryDate,soldTs}]
  stockAdjustments: [], // [{id,itemId,itemName,oldQty,newQty,reason,changedBy,date}] -- audit trail for manual qty corrections
  eload: [], // [{id,date,provider,loadType:'Regular'|'Promo',amount,fee,remarks,addedBy}]
  remittances: [], // [{id,periodStart,periodEnd,expectedCash,actualRemitted,remarks,recordedBy,date}]
  cart: [],
  tab: 'dashboard',
  _invSelected: new Set(),
  loaded: false,
  showInstallHint: false,
  role: null,        // 'owner' | 'employee' | null (not logged in)
  gateStep: 'pick',  // 'pick' | 'ownerPin' | 'setupPin'
  gateError: '',
  lastSync: null,
  testMode: false, // in-memory only, never persisted — always starts off on a fresh load, owner-only toggle
};

function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
function peso(n){
  n = Number(n)||0;
  return '₱' + n.toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
}
function todayStr(){ return new Date().toISOString().slice(0,10); }

// Shared date-range picker used by Dashboard, Reports, and Log > Transactions.
// rangeKey: 'today' | '7' | '30' | 'all' | 'custom'
function getDateCutoff(rangeKey, customFrom, customTo){
  const now = new Date();
  if(rangeKey === 'custom'){
    const start = customFrom ? new Date(customFrom+'T00:00:00') : null;
    const end = customTo ? new Date(customTo+'T23:59:59') : null;
    return {start, end};
  }
  if(rangeKey === 'all') return {start:null, end:null};
  if(rangeKey === 'today'){
    const start = new Date(); start.setHours(0,0,0,0);
    return {start, end:null};
  }
  const days = Number(rangeKey)||7;
  return {start: new Date(now.getTime() - days*86400000), end:null};
}
function inDateRange(ts, cutoff){
  const t = new Date(ts);
  if(cutoff.start && t < cutoff.start) return false;
  if(cutoff.end && t > cutoff.end) return false;
  return true;
}
function dateRangeLabel(rangeKey, customFrom, customTo){
  if(rangeKey==='today') return 'Today';
  if(rangeKey==='7') return 'Last 7 days';
  if(rangeKey==='30') return 'Last 30 days';
  if(rangeKey==='all') return 'All time';
  if(rangeKey==='custom'){
    if(customFrom && customTo) return `${customFrom} to ${customTo}`;
    if(customFrom) return `From ${customFrom}`;
    if(customTo) return `Until ${customTo}`;
    return 'Custom range';
  }
  return '';
}
function dateRangeControlHtml(prefix, rangeVal, customFrom, customTo, includeToday){
  return `
  <div class="segmented" id="${prefix}RangeSeg">
    ${includeToday? `<button data-r="today" class="${rangeVal==='today'?'active':''}">Today</button>` : ''}
    <button data-r="7" class="${rangeVal==='7'?'active':''}">7 days</button>
    <button data-r="30" class="${rangeVal==='30'?'active':''}">30 days</button>
    <button data-r="all" class="${rangeVal==='all'?'active':''}">All</button>
    <button data-r="custom" class="${rangeVal==='custom'?'active':''}">Custom</button>
  </div>
  ${rangeVal==='custom' ? `
  <div class="grid2" style="margin-top:10px;">
    <div class="field"><label>From</label><input type="date" id="${prefix}CustomFrom" value="${customFrom||''}" max="${todayStr()}"></div>
    <div class="field"><label>To</label><input type="date" id="${prefix}CustomTo" value="${customTo||''}" max="${todayStr()}"></div>
  </div>
  <button id="${prefix}CustomApply" class="btn-secondary btn-block" style="margin-top:8px;">Apply Custom Range</button>
  ` : ''}`;
}
function bindDateRangeControl(prefix, rangeStateKey, fromStateKey, toStateKey){
  document.getElementById(prefix+'RangeSeg')?.addEventListener('click', e=>{
    const b = e.target.closest('button[data-r]');
    if(!b) return;
    state[rangeStateKey] = b.dataset.r;
    render();
  });
  document.getElementById(prefix+'CustomApply')?.addEventListener('click', ()=>{
    const fromEl = document.getElementById(prefix+'CustomFrom');
    const toEl = document.getElementById(prefix+'CustomTo');
    state[fromStateKey] = fromEl ? fromEl.value : '';
    state[toStateKey] = toEl ? toEl.value : '';
    if(!state[fromStateKey] && !state[toStateKey]){ showToast('⚠️ Pick at least one date'); return; }
    render();
  });
}

function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._h);
  showToast._h = setTimeout(()=>t.classList.remove('show'), 2200);
}

/* ---------------- Storage layer ----------------
   Backed by Firestore (window.fsGet/fsSet, set up by the Firebase bootstrap
   <script type="module"> above this one). All data is effectively shared —
   there's no Firebase Auth wired in, so per-device scoping doesn't really
   exist; the install-hint dismiss flag just lives in the same store under
   a "device-" prefix as a low-stakes tradeoff. Access is separated in-app
   by role (PIN-gated), not by storage scope — see the note on the role screen.

   Test Mode: when active, every key is transparently prefixed with "test-",
   pointing reads/writes at a completely separate set of Firestore documents.
   Nothing done in Test Mode can touch real data, and switching back reveals
   the real data untouched. */
function storageKey(key){ return state.testMode ? 'test-'+key : key; }
async function storageGet(key, fallback){
  try{
    const json = await window.fsGet(storageKey(key));
    if(json === undefined || json === null) return fallback;
    return JSON.parse(json);
  }catch(e){
    console.error('storageGet failed', key, e);
    return fallback;
  }
}
async function storageSet(key, value){
  try{
    await window.fsSet(storageKey(key), JSON.stringify(value));
    state._saveError = '';
    return true;
  }catch(e){
    console.error('storage set failed', key, e);
    state._saveError = `Your last change to "${key}" did NOT save (${e.message || 'unknown error'}). It only exists on this device right now — don't count on it until this warning clears.`;
    showToast('⚠️ Could not save — see warning banner');
    return false;
  }
}
async function deviceGet(key, fallback){ return storageGet('device-'+key, fallback); }
async function deviceSet(key, value){ return storageSet('device-'+key, value); }

async function loadAll(){
  const [config, inventory, sales, receiptsIndex, categories, expenses, utang, gcash, vouchers, voucherCodes, stockAdjustments, eload, remittances] = await Promise.all([
    storageGet('store-config', {name:'Tindahan', ownerPin:'', gcashFloatStart:0, cashOnHandStart:0, eloadBalanceStart:0}),
    storageGet('inventory', []),
    storageGet('sales', []),
    storageGet('receipts-index', []),
    storageGet('categories', null),
    storageGet('expenses', []),
    storageGet('utang', []),
    storageGet('gcash', []),
    storageGet('vouchers', []),
    storageGet('voucher-codes', []),
    storageGet('stock-adjustments', []),
    storageGet('eload', []),
    storageGet('remittances', []),
  ]);
  state.config = config || {name:'Tindahan', ownerPin:'', gcashFloatStart:0, cashOnHandStart:0, eloadBalanceStart:0};
  state.inventory = inventory;
  state.sales = sales;
  state.receiptsIndex = receiptsIndex;
  state.expenses = expenses;
  state.utang = utang;
  state.gcash = gcash;
  state.vouchers = vouchers;
  state.voucherCodes = voucherCodes;
  state.stockAdjustments = stockAdjustments;
  state.eload = eload;
  state.remittances = remittances;
  if(categories && categories.length){
    state.categories = categories;
  } else {
    state.categories = DEFAULT_CATEGORIES.slice();
    await storageSet('categories', state.categories);
  }
  state.loaded = true;
  state.lastSync = new Date();

  let isStandalone = false;
  try{
    isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }catch(e){ isStandalone = false; }
  const dismissed = await deviceGet('install-hint-dismissed', false);
  state.showInstallHint = !isStandalone && !dismissed;
}

// Logs every manual stock quantity correction (not sales, not checkout — those are
// already tracked via the sales list). Silent for quick +/- taps, but always recorded,
// so "why does Hansel say 7" is always answerable later.
async function logStockAdjustment(item, oldQty, newQty, reason, customDate){
  if(oldQty === newQty) return;
  state.stockAdjustments.push({
    id: uid(), itemId: item.id, itemName: item.name,
    oldQty, newQty, reason: (reason||'').trim(),
    changedBy: state.role, date: customDate || new Date().toISOString(),
  });
  await storageSet('stock-adjustments', state.stockAdjustments);
}

// Tap-to-type total stock, used from both the Stocks list and Bentahan's sell tiles —
// same underlying correction + audit-log path as every other manual qty change.
async function quickEditItemTotal(item, source){
  const input = prompt(`New total stock for "${item.name}"?`, item.qty);
  if(input === null) return; // cancelled
  const newQty = parseInt(input);
  if(isNaN(newQty) || newQty < 0){ showToast('⚠️ Enter a valid number'); return; }
  if(newQty === item.qty) return;
  const oldQty = item.qty;
  item.qty = newQty;
  await storageSet('inventory', state.inventory);
  await logStockAdjustment(item, oldQty, newQty, `Quick total edit from ${source}`);
  showToast('✅ Stock updated');
  render();
}

// Pulls fresh shared data in the background so a remote owner (or a second device)
// sees near-live updates without a manual reload. Skips quietly while a modal is
// open or the person is mid-typing, so it never yanks away unsaved input.
async function backgroundSync(){
  if(!state.role) return;
  const modalOpen = document.getElementById('modalRoot').innerHTML.trim().length>0;
  const typing = document.activeElement && ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName);
  if(modalOpen || typing) return;
  try{
    const [inventory, sales, receiptsIndex, categories, expenses, utang, gcash, vouchers, voucherCodes, stockAdjustments, eload, remittances, config] = await Promise.all([
      storageGet('inventory', state.inventory),
      storageGet('sales', state.sales),
      storageGet('receipts-index', state.receiptsIndex),
      storageGet('categories', state.categories),
      storageGet('expenses', state.expenses),
      storageGet('utang', state.utang),
      storageGet('gcash', state.gcash),
      storageGet('vouchers', state.vouchers),
      storageGet('voucher-codes', state.voucherCodes),
      storageGet('stock-adjustments', state.stockAdjustments),
      storageGet('eload', state.eload),
      storageGet('remittances', state.remittances),
      storageGet('store-config', state.config),
    ]);
    state.inventory=inventory; state.sales=sales; state.receiptsIndex=receiptsIndex;
    state.categories=categories; state.expenses=expenses; state.utang=utang;
    state.gcash=gcash; state.vouchers=vouchers; state.voucherCodes=voucherCodes;
    state.stockAdjustments=stockAdjustments; state.eload=eload; state.remittances=remittances;
    state.config=config;
    state.lastSync = new Date();
    render();
  }catch(e){ /* stay silent — next tick will retry */ }
}

/* ---------------- Rendering shell ---------------- */
function visibleTabs(){
  if(state.role==='owner') return TABS;
  return TABS.filter(t=> ['dashboard','inventory','sell','vouchers','log'].includes(t.id));
}
function renderNav(){
  const nav = document.getElementById('tabbar');
  nav.innerHTML = visibleTabs().map(t=>`
    <button data-tab="${t.id}" class="${state.tab===t.id?'active':''}">
      ${ICONS[t.icon]}<span>${t.label}</span>
    </button>`).join('');
  nav.querySelectorAll('button').forEach(b=>{
    b.addEventListener('click', ()=>{ state.tab = b.dataset.tab; render(); });
  });
}

function updateHeader(){
  document.getElementById('dateLabel').textContent = state.role
    ? (state.role==='owner' ? 'Owner' : 'Employee') + ' · ' + new Date().toLocaleDateString('en-PH',{weekday:'short', month:'short', day:'numeric'})
    : new Date().toLocaleDateString('en-PH',{weekday:'long', month:'short', day:'numeric', year:'numeric'});
  const badge = document.getElementById('headerBadge');
  if(state.role==='owner'){
    const today = todayStr();
    const todaySales = state.sales.filter(s=>s.ts.slice(0,10)===today);
    const total = todaySales.reduce((a,s)=>a+s.total,0);
    badge.style.display='inline-block';
    badge.textContent = 'Today: ' + peso(total);
  } else {
    badge.style.display='none';
  }
  const nameInput = document.getElementById('storeNameInput');
  if(document.activeElement !== nameInput) nameInput.value = state.config.name || 'Tindahan';
  nameInput.disabled = state.role!=='owner';
  document.getElementById('switchUserBtn').style.display = state.role ? 'inline-flex' : 'none';
  const testBtn = document.getElementById('testModeBtn');
  testBtn.style.display = state.role==='owner' ? 'inline-flex' : 'none';
  testBtn.style.background = state.testMode ? 'var(--yellow)' : 'transparent';
  testBtn.style.color = state.testMode ? 'var(--ink)' : 'var(--paper)';
  testBtn.style.borderRadius = '8px';
}

function render(){
  if(!state.role){
    document.getElementById('tabbar').innerHTML = '';
    updateHeader();
    document.getElementById('main').innerHTML = viewRoleGate();
    bindGateEvents();
    return;
  }
  // keep employees off owner-only tabs even if state.tab was left there
  const allowed = visibleTabs().map(t=>t.id);
  if(!allowed.includes(state.tab)) state.tab = state.role==='owner' ? 'dashboard' : 'sell';
  renderNav();
  updateHeader();
  const main = document.getElementById('main');
  let html = '';
  if(state.testMode){
    html += `<div class="card" style="border-color:var(--yellow);background:#FFF9E6;">
      <div style="font-weight:800;color:var(--ink);">🧪 Test Mode is ON</div>
      <div style="font-size:12.5px;color:var(--ink-soft);margin-top:2px;">Everything you do right now — sales, stock, GCash, all of it — is saved to a separate sandbox. Your real store data is untouched. Tap the 🧪 icon in the header again to go back to real mode.</div>
    </div>`;
  }
  if(state._saveError){
    html += `<div class="card" style="border-color:var(--red);background:#FDECEC;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
        <div>
          <div style="font-weight:800;color:var(--red);margin-bottom:4px;">⚠️ Save failed</div>
          <div style="font-size:12.5px;">${esc(state._saveError)}</div>
        </div>
        <button id="dismissSaveError" class="icon-btn" style="color:var(--red);flex-shrink:0;">${ICONS.close}</button>
      </div>
    </div>`;
  }
  if(state.tab==='dashboard') html += viewDashboard();
  if(state.tab==='inventory') html += viewInventory();
  if(state.tab==='sell') html += viewSell();
  if(state.tab==='vouchers') html += viewVouchers();
  if(state.tab==='log') html += viewLog();
  if(state.tab==='receipts') html += viewReceipts();
  if(state.tab==='reports') html += viewReports();
  main.innerHTML = html;
  bindTabEvents();
}

/* ---------------- Role gate (login) ---------------- */
function viewRoleGate(){
  const hasPin = !!(state.config.ownerPin);
  if(state.gateStep==='setupPin'){
    return `
    <div class="card" style="max-width:380px;margin:30px auto;">
      <h2>Set an Owner PIN</h2>
      <p style="font-size:12.5px;color:var(--ink-soft);">This keeps full sales, cost, and profit numbers visible only to you. Choose a 4-digit PIN — you'll enter it each time you open Owner mode.</p>
      <form id="setupPinForm">
        <div class="field"><input name="pin" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="4-digit PIN" required></div>
        <div class="field"><input name="pin2" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="Confirm PIN" required></div>
        ${state.gateError? `<div style="color:var(--red);font-size:12.5px;margin-bottom:8px;">${esc(state.gateError)}</div>`:''}
        <button type="submit" class="btn-primary btn-block">Save PIN & Continue</button>
      </form>
      <button id="gateBack" class="btn-secondary btn-block" style="margin-top:8px;">Back</button>
    </div>`;
  }
  if(state.gateStep==='ownerPin'){
    return `
    <div class="card" style="max-width:380px;margin:30px auto;">
      <h2>Owner PIN</h2>
      <form id="ownerPinForm">
        <div class="field"><input name="pin" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="Enter PIN" autofocus required></div>
        ${state.gateError? `<div style="color:var(--red);font-size:12.5px;margin-bottom:8px;">${esc(state.gateError)}</div>`:''}
        <button type="submit" class="btn-primary btn-block">Enter</button>
      </form>
      <button id="gateBack" class="btn-secondary btn-block" style="margin-top:8px;">Back</button>
    </div>`;
  }
  return `
  <div class="card" style="max-width:420px;margin:30px auto;text-align:center;">
    <div style="font-size:40px;">🏪</div>
    <h2 style="margin-top:6px;">Who's logging in?</h2>
    <p style="font-size:12.5px;color:var(--ink-soft);margin-bottom:18px;">Owner sees sales, cost, and profit. Employee can log sales and manage stock, without seeing money totals.</p>
    <button id="pickOwner" class="btn-primary btn-block" style="margin-bottom:10px;padding:14px;">🧑‍💼 Owner${hasPin?'':' (set up PIN)'}</button>
    <button id="pickEmployee" class="btn-yellow btn-block" style="padding:14px;">🧑‍🔧 Employee</button>
    <p style="font-size:11px;color:var(--ink-soft);margin-top:14px;">Note: this PIN keeps things tidy day-to-day, but isn't strong security — anyone determined with browser access could still reach the raw data. Don't use it to hide anything sensitive from someone who has physical access to the device.</p>
  </div>
  <div class="card" style="max-width:420px;margin:0 auto;">
    <h2 style="margin-bottom:8px;">🔧 Cloud Connection Test</h2>
    <p style="font-size:12px;color:var(--ink-soft);margin:0 0 10px;">If stock changes aren't sticking, run this — it tries a real write and read against your database and shows the exact result, pass or fail.</p>
    <button id="connTestBtn" class="btn-secondary btn-block">Run Connection Test</button>
    <div id="connTestResult" style="margin-top:10px;font-size:12.5px;"></div>
  </div>`;
}

function bindGateEvents(){
  document.getElementById('connTestBtn')?.addEventListener('click', async ()=>{
    const out = document.getElementById('connTestResult');
    out.innerHTML = '⏳ Testing…';
    const testKey = 'connection-test';
    const testValue = { pingedAt: new Date().toISOString(), from: navigator.userAgent.slice(0,60) };
    try{
      if(typeof window.fsSet !== 'function' || typeof window.fsGet !== 'function'){
        throw new Error('Firebase bootstrap script never loaded (window.fsGet/fsSet missing) — check that the module scripts at the top of the file weren\'t stripped or blocked.');
      }
      const t0 = Date.now();
      await window.fsSet(testKey, JSON.stringify(testValue));
      const readBack = await window.fsGet(testKey);
      const ms = Date.now() - t0;
      if(readBack === undefined){
        out.innerHTML = `<div style="color:var(--red);font-weight:700;">❌ Wrote OK, but read-back returned nothing.</div><div style="margin-top:4px;">This usually means the write landed in a different database/collection than the read is checking, or rules allow write but not read.</div>`;
      } else {
        const parsed = JSON.parse(readBack);
        out.innerHTML = `<div style="color:var(--green);font-weight:700;">✅ Connected — write and read both succeeded (${ms}ms).</div>
          <div style="margin-top:4px;color:var(--ink-soft);">Wrote and read back: <code>${esc(JSON.stringify(parsed))}</code></div>
          <div style="margin-top:4px;color:var(--ink-soft);">Check Firestore console for a document called "${testKey}" inside tindahan-store — if you see it there with this same data, your database and rules are correct, and the earlier problem was something else (like an old cached page). If Firestore still looks empty after this shows ✅, you're very likely looking at the wrong database/project in the console.</div>`;
      }
    }catch(e){
      out.innerHTML = `<div style="color:var(--red);font-weight:700;">❌ Failed: ${esc(e.message || String(e))}</div>
        <div style="margin-top:4px;color:var(--ink-soft);">This is the exact error from Firebase — screenshot this whole box.</div>`;
      console.error('Connection test failed', e);
    }
  });

  document.getElementById('pickEmployee')?.addEventListener('click', ()=>{
    state.role = 'employee';
    state.tab = 'sell';
    render();
  });
  document.getElementById('pickOwner')?.addEventListener('click', ()=>{
    state.gateStep = state.config.ownerPin ? 'ownerPin' : 'setupPin';
    state.gateError = '';
    render();
  });
  document.getElementById('gateBack')?.addEventListener('click', ()=>{
    state.gateStep = 'pick';
    state.gateError = '';
    render();
  });
  document.getElementById('ownerPinForm')?.addEventListener('submit', e=>{
    e.preventDefault();
    const pin = new FormData(e.target).get('pin').trim();
    if(pin === state.config.ownerPin){
      state.role = 'owner';
      state.tab = 'dashboard';
      state.gateStep = 'pick';
      state.gateError = '';
      render();
    } else {
      state.gateError = 'Wrong PIN — try again.';
      render();
    }
  });
  document.getElementById('setupPinForm')?.addEventListener('submit', async e=>{
    e.preventDefault();
    const f = new FormData(e.target);
    const pin = f.get('pin').trim(), pin2 = f.get('pin2').trim();
    if(!/^\d{4}$/.test(pin)){ state.gateError='PIN must be exactly 4 digits.'; render(); return; }
    if(pin !== pin2){ state.gateError='PINs do not match.'; render(); return; }
    state.config.ownerPin = pin;
    await storageSet('store-config', state.config);
    state.role = 'owner';
    state.tab = 'dashboard';
    state.gateStep = 'pick';
    state.gateError = '';
    render();
  });
}

/* ---------------- Dashboard ---------------- */
function viewDashboard(){
  if(state.role!=='owner') return viewEmployeeDashboard();

  const dashRange = state._dashRange || 'today';
  const cutoff = getDateCutoff(dashRange, state._dashCustomFrom, state._dashCustomTo);
  const periodSales = state.sales.filter(s=> inDateRange(s.ts, cutoff));
  const revenue = periodSales.reduce((a,s)=>a+s.total,0);
  const cogsPeriod = periodSales.reduce((a,s)=>a+s.cost*s.qty,0);
  const profit = revenue - cogsPeriod;
  const lowStock = state.inventory.filter(i=>i.reorder>0 && i.qty<=i.reorder);
  const invValue = state.inventory.reduce((a,i)=>a+i.cost*i.qty,0);
  const recent = [...state.sales].sort((a,b)=>b.ts.localeCompare(a.ts)).slice(0,6);

  const gcashWallet = computeGcashWallet();
  const cashOnHand = computeCashOnHand();
  const gcashFeesPeriod = state.gcash.filter(g=> inDateRange(g.date, cutoff)).reduce((a,g)=>a+(g.fee||0),0);
  const gcashFeesAll = state.gcash.reduce((a,g)=>a+(g.fee||0),0);

  const eloadBalance = computeEloadBalance();
  const eloadFeesPeriod = state.eload.filter(l=> inDateRange(l.date, cutoff)).reduce((a,l)=>a+(l.fee||0),0);
  const eloadFeesAll = state.eload.reduce((a,l)=>a+(l.fee||0),0);

  const utangTotal = state.utang.reduce((a,c)=>a+c.balance,0);
  const utangOverLimit = state.utang.filter(c=>c.balance>0).length;

  const vUnused = state.voucherCodes.filter(c=>voucherCodeStatus(c)==='unused').length;
  const vUsed = state.voucherCodes.filter(c=>voucherCodeStatus(c)==='used').length;
  const vExpired = state.voucherCodes.filter(c=>voucherCodeStatus(c)==='expired').length;
  const vSoldPeriod = periodSales.filter(s=>s.isVoucher).reduce((a,s)=>a+s.qty,0);
  const vProfitPeriod = periodSales.filter(s=>s.isVoucher).reduce((a,s)=>a+(s.price-s.cost)*s.qty,0);
  const vProfitAll = state.sales.filter(s=>s.isVoucher).reduce((a,s)=>a+(s.price-s.cost)*s.qty,0);

  const expensesPeriod = state.expenses.filter(e=> inDateRange(e.date, cutoff)).reduce((a,e)=>a+e.amount,0);
  const netPeriod = profit + gcashFeesPeriod + eloadFeesPeriod - expensesPeriod;
  const periodLabel = dateRangeLabel(dashRange, state._dashCustomFrom, state._dashCustomTo);

  return `
  ${state.showInstallHint ? `
  <div class="card" id="installHintCard" style="border-color:var(--yellow);background:#FFFBF0;">
    <h2 style="color:var(--ink)">📲 Install as an app</h2>
    <p style="font-size:12.5px;color:var(--ink-soft);margin:0 0 8px;">Put this on your home screen so it opens like a real app — full screen, no browser bar.</p>
    <p style="font-size:12.5px;margin:2px 0;"><strong>iPhone:</strong> tap Share → Add to Home Screen.</p>
    <p style="font-size:12.5px;margin:2px 0;"><strong>Android:</strong> tap ⋮ menu → Install app / Add to Home screen.</p>
    <p style="font-size:12.5px;margin:2px 0 10px;"><strong>Laptop:</strong> click the install icon (⊕) in the address bar.</p>
    <button id="dismissInstallHint" class="btn-secondary btn-block">Got it</button>
  </div>` : ''}

  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <h2 style="margin:0;">${esc(periodLabel)} — Overall</h2>
      <button id="syncNowBtn" class="icon-btn" title="Refresh now" style="color:var(--green);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 4v5h-5"/></svg>
      </button>
    </div>
    ${dateRangeControlHtml('dash', dashRange, state._dashCustomFrom, state._dashCustomTo, true)}
    <div class="stat-row" style="margin-top:14px;">
      <div class="stat" style="--accent:var(--green)"><div class="label">Sales</div><div class="value mono">${peso(revenue)}</div></div>
      <div class="stat" style="--accent:var(--yellow)"><div class="label">Item Profit</div><div class="value mono">${peso(profit)}</div></div>
      <div class="stat" style="--accent:var(--red)"><div class="label">Transactions</div><div class="value mono">${periodSales.length}</div></div>
    </div>
    <div class="stat-row" style="margin-top:10px;">
      <div class="stat" style="--accent:var(--green)"><div class="label">GCash + Load fees</div><div class="value mono">${peso(gcashFeesPeriod+eloadFeesPeriod)}</div></div>
      <div class="stat" style="--accent:var(--red)"><div class="label">Expenses</div><div class="value mono">${peso(expensesPeriod)}</div></div>
      <div class="stat" style="--accent:var(--yellow)"><div class="label">Net</div><div class="value mono" style="color:${netPeriod<0?'var(--red)':'inherit'}">${peso(netPeriod)}</div></div>
    </div>
    <div style="font-size:11px;color:var(--ink-soft);margin-top:10px;">Synced ${state.lastSync ? state.lastSync.toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'}) : '—'} · updates automatically every 30s</div>
  </div>

  <div class="card">
    <h2>Store Snapshot</h2>
    <div class="stat-row">
      <div class="stat"><div class="label">Items tracked</div><div class="value mono">${state.inventory.length}</div></div>
      <div class="stat"><div class="label">Inventory value</div><div class="value mono">${peso(invValue)}</div></div>
      <div class="stat"><div class="label">Low stock</div><div class="value mono" style="color:${lowStock.length?'var(--red)':'inherit'}">${lowStock.length}</div></div>
    </div>
  </div>

  <div class="card">
    <h2>💳 GCash</h2>
    <div class="stat-row">
      <div class="stat" style="--accent:${gcashWallet<0?'var(--red)':'var(--green)'}"><div class="label">GCash Wallet</div><div class="value mono">${peso(gcashWallet)}</div></div>
      <div class="stat" style="--accent:${cashOnHand<0?'var(--red)':'var(--yellow)'}"><div class="label">Cash on Hand</div><div class="value mono">${peso(cashOnHand)}</div></div>
    </div>
    <div class="stat-row" style="margin-top:10px;">
      <div class="stat"><div class="label">Fees (${esc(periodLabel)})</div><div class="value mono">${peso(gcashFeesPeriod)}</div></div>
      <div class="stat" style="--accent:var(--yellow)"><div class="label">Fees all-time (profit)</div><div class="value mono">${peso(gcashFeesAll)}</div></div>
    </div>
    <p style="font-size:11.5px;color:var(--ink-soft);margin:8px 0 0;">Manage cash-in / cash-out in the <strong>Log</strong> tab.</p>
  </div>

  <div class="card">
    <h2>📱 Load</h2>
    <div class="stat-row">
      <div class="stat" style="--accent:${eloadBalance<0?'var(--red)':'var(--green)'}"><div class="label">E-Load balance</div><div class="value mono">${peso(eloadBalance)}</div></div>
      <div class="stat"><div class="label">Fees (${esc(periodLabel)})</div><div class="value mono">${peso(eloadFeesPeriod)}</div></div>
      <div class="stat" style="--accent:var(--yellow)"><div class="label">Fees all-time</div><div class="value mono">${peso(eloadFeesAll)}</div></div>
    </div>
  </div>

  <div class="card">
    <h2>🤝 Utang (Customer Credit)</h2>
    <div class="stat-row">
      <div class="stat" style="--accent:var(--red)"><div class="label">Total outstanding</div><div class="value mono">${peso(utangTotal)}</div></div>
      <div class="stat"><div class="label">Customers owing</div><div class="value mono">${utangOverLimit}</div></div>
    </div>
  </div>

  <div class="card">
    <h2>📶 WiFi Vouchers & Profit</h2>
    <div class="stat-row">
      <div class="stat" style="--accent:var(--green)"><div class="label">Sold (${esc(periodLabel)})</div><div class="value mono">${vSoldPeriod}</div></div>
      <div class="stat" style="--accent:var(--yellow)"><div class="label">Profit (${esc(periodLabel)})</div><div class="value mono">${peso(vProfitPeriod)}</div></div>
      <div class="stat"><div class="label">Profit all-time</div><div class="value mono">${peso(vProfitAll)}</div></div>
    </div>
    <div class="stat-row" style="margin-top:10px;">
      <div class="stat" style="--accent:var(--green)"><div class="label">Unused codes</div><div class="value mono">${vUnused}</div></div>
      <div class="stat" style="--accent:var(--ink-soft)"><div class="label">Used codes</div><div class="value mono">${vUsed}</div></div>
      <div class="stat" style="--accent:var(--red)"><div class="label">Expired codes</div><div class="value mono">${vExpired}</div></div>
    </div>
  </div>

  ${lowStock.length? `
  <div class="card">
    <h2>⚠️ Paubos na (Low Stock)</h2>
    ${lowStock.map(i=>`
      <div class="ledger-row">
        <div><strong>${esc(i.name)}</strong><div class="meta" style="font-size:12px;color:var(--ink-soft)">${i.qty} ${esc(i.unit)} left · reorder at ${i.reorder}</div></div>
        <span class="pill low">Restock</span>
      </div>`).join('')}
  </div>` : ''}

  <div class="card">
    <h2>Huling Benta (Recent Sales)</h2>
    ${recent.length? recent.map(s=>`
      <div class="ledger-row">
        <div><strong>${esc(s.name)}</strong> <span class="meta" style="color:var(--ink-soft);font-size:12px">×${s.qty}</span>
          <div class="meta" style="font-size:11.5px;color:var(--ink-soft)">${new Date(s.ts).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})} · ${esc(s.payment||'Cash')}</div>
        </div>
        <div class="mono" style="font-weight:800">${peso(s.total)}</div>
      </div>`).join('') : `<div class="empty"><span class="big">🧾</span>Wala pang benta today.<br>Go to <strong>Bentahan</strong> to log a sale.</div>`}
  </div>
  `;
}

// Employee's Home tab — deliberately scoped to what she asked to be able to see at a
// glance: today's sales, low stock, GCash float & profit, total utang owed, and a
// per-denomination voucher breakdown (unused/used, count and ₱ value each).
function viewEmployeeDashboard(){
  const today = todayStr();
  const todaySales = state.sales.filter(s=>s.ts.slice(0,10)===today);
  const revenue = todaySales.reduce((a,s)=>a+s.total,0);
  const lowStock = state.inventory.filter(i=>i.reorder>0 && i.qty<=i.reorder);

  const cashOnHand = computeCashOnHand();
  const gcashFeesToday = state.gcash.filter(g=>g.date.slice(0,10)===today).reduce((a,g)=>a+(g.fee||0),0);

  const eloadBalance = computeEloadBalance();
  const eloadFeesToday = state.eload.filter(l=>l.date.slice(0,10)===today).reduce((a,l)=>a+(l.fee||0),0);
  const eloadFeesAll = state.eload.reduce((a,l)=>a+(l.fee||0),0);

  const utangTotal = state.utang.reduce((a,c)=>a+c.balance,0);

  const voucherRows = [...state.vouchers].sort((a,b)=>a.price-b.price).map(v=>{
    const codes = state.voucherCodes.filter(c=>c.typeId===v.id);
    const unused = codes.filter(c=>voucherCodeStatus(c)==='unused').length;
    const used = codes.filter(c=>voucherCodeStatus(c)==='used').length;
    return {name: v.name, price: v.price, unused, used, unusedValue: unused*v.price, usedValue: used*v.price};
  });
  const totalUnusedValue = voucherRows.reduce((a,r)=>a+r.unusedValue,0);
  const totalUsedValue = voucherRows.reduce((a,r)=>a+r.usedValue,0);
  const totalUnusedCount = voucherRows.reduce((a,r)=>a+r.unused,0);
  const totalUsedCount = voucherRows.reduce((a,r)=>a+r.used,0);

  return `
  ${state.showInstallHint ? `
  <div class="card" id="installHintCard" style="border-color:var(--yellow);background:#FFFBF0;">
    <h2 style="color:var(--ink)">📲 Install as an app</h2>
    <p style="font-size:12.5px;color:var(--ink-soft);margin:0 0 8px;">Put this on your home screen so it opens like a real app — full screen, no browser bar.</p>
    <p style="font-size:12.5px;margin:2px 0;"><strong>iPhone:</strong> tap Share → Add to Home Screen.</p>
    <p style="font-size:12.5px;margin:2px 0;"><strong>Android:</strong> tap ⋮ menu → Install app / Add to Home screen.</p>
    <p style="font-size:12.5px;margin:2px 0 10px;"><strong>Laptop:</strong> click the install icon (⊕) in the address bar.</p>
    <button id="dismissInstallHint" class="btn-secondary btn-block">Got it</button>
  </div>` : ''}

  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <h2 style="margin:0;">Ngayong Araw</h2>
      <button id="syncNowBtn" class="icon-btn" title="Refresh now" style="color:var(--green);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 4v5h-5"/></svg>
      </button>
    </div>
    <div class="stat-row" style="margin-top:14px;">
      <div class="stat" style="--accent:var(--green)"><div class="label">Total Sales Today</div><div class="value mono">${peso(revenue)}</div></div>
      <div class="stat" style="--accent:var(--red)"><div class="label">Transactions</div><div class="value mono">${todaySales.length}</div></div>
    </div>
    <div style="font-size:11px;color:var(--ink-soft);margin-top:10px;">Synced ${state.lastSync ? state.lastSync.toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'}) : '—'} · updates automatically every 30s</div>
  </div>

  <div class="card">
    <h2>💳 GCash</h2>
    <div class="stat-row">
      <div class="stat" style="--accent:${cashOnHand<0?'var(--red)':'var(--yellow)'}"><div class="label">Cash on Hand</div><div class="value mono">${peso(cashOnHand)}</div></div>
      <div class="stat"><div class="label">Fees today</div><div class="value mono">${peso(gcashFeesToday)}</div></div>
    </div>
  </div>

  <div class="card">
    <h2>📱 Load</h2>
    <div class="stat-row">
      <div class="stat" style="--accent:${eloadBalance<0?'var(--red)':'var(--green)'}"><div class="label">E-Load balance</div><div class="value mono">${peso(eloadBalance)}</div></div>
      <div class="stat"><div class="label">Fees today</div><div class="value mono">${peso(eloadFeesToday)}</div></div>
      <div class="stat" style="--accent:var(--yellow)"><div class="label">Fees all-time</div><div class="value mono">${peso(eloadFeesAll)}</div></div>
    </div>
  </div>

  <div class="card">
    <h2>🤝 Utang (Customer Credit)</h2>
    <div class="stat-row">
      <div class="stat" style="--accent:var(--red)"><div class="label">Total outstanding</div><div class="value mono">${peso(utangTotal)}</div></div>
    </div>
  </div>

  <div class="card">
    <h2>📶 WiFi Vouchers</h2>
    ${voucherRows.length? voucherRows.map(r=>`
      <div class="ledger-row">
        <div><strong>${esc(r.name)}</strong> <span class="meta" style="color:var(--ink-soft);font-size:12px">₱${r.price}</span></div>
        <div style="text-align:right;">
          <div class="mono" style="font-size:12.5px;"><span style="color:var(--green);font-weight:700;">${r.unused}</span> unused · ${peso(r.unusedValue)}</div>
          <div class="mono" style="font-size:11.5px;color:var(--ink-soft);">${r.used} used · ${peso(r.usedValue)}</div>
        </div>
      </div>`).join('') : `<div class="empty"><span class="big">📶</span>No voucher types yet.</div>`}
    ${voucherRows.length? `
    <div class="ledger-row" style="border-top:1px solid var(--line);margin-top:6px;padding-top:8px;">
      <strong>Total</strong>
      <div style="text-align:right;">
        <div class="mono" style="font-size:12.5px;font-weight:800;color:var(--green);">${totalUnusedCount} unused · ${peso(totalUnusedValue)}</div>
        <div class="mono" style="font-size:11.5px;color:var(--ink-soft);">${totalUsedCount} used · ${peso(totalUsedValue)}</div>
      </div>
    </div>` : ''}
  </div>

  ${lowStock.length? `
  <div class="card">
    <h2>⚠️ Paubos na (Low Stock)</h2>
    ${lowStock.map(i=>`
      <div class="ledger-row">
        <div><strong>${esc(i.name)}</strong><div class="meta" style="font-size:12px;color:var(--ink-soft)">${i.qty} ${esc(i.unit)} left · reorder at ${i.reorder}</div></div>
        <span class="pill low">Restock</span>
      </div>`).join('')}
  </div>` : `<div class="card"><div class="empty">✅ No low stock items right now.</div></div>`}
  `;
}

/* ---------------- Inventory ---------------- */
function categoryOptionsHtml(selected){
  return state.categories.map(c=>`<option value="${esc(c)}" ${c===selected?'selected':''}>${esc(c)}</option>`).join('');
}
function categoryChipsHtml(activeCat, groupAttr){
  const cats = ['All', ...state.categories];
  return `<div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:10px;">
    ${cats.map(c=>`<button data-${groupAttr}="${esc(c)}" class="btn-secondary" style="white-space:nowrap;padding:7px 12px;font-size:12.5px;${(activeCat||'All')===c?'background:var(--ink);color:var(--paper);border-color:var(--ink);':''}">${esc(c)}</button>`).join('')}
  </div>`;
}

function viewInventory(){
  const q = (state._invSearch||'').toLowerCase();
  const activeCat = state._invCategory || 'All';
  const items = state.inventory
    .filter(i=> activeCat==='All' || (i.category||'Others')===activeCat)
    .filter(i=> !q || i.name.toLowerCase().includes(q) || (i.category||'').toLowerCase().includes(q))
    .sort((a,b)=>a.name.localeCompare(b.name));
  const isOwner = state.role==='owner';

  return `
  <div class="card">
    <h2>Add / Idagdag na Item</h2>
    <form id="addItemForm">
      <div class="field"><label>Item name</label><input required name="name" placeholder="e.g. Lucky Me Pancit Canton"></div>
      <div class="grid2">
        <div class="field"><label>Category</label>
          <select name="category">${categoryOptionsHtml(state.categories[0])}</select>
        </div>
        <div class="field"><label>Unit</label><input name="unit" placeholder="pc / sachet / bottle" value="pc"></div>
      </div>
      <div class="grid3">
        ${isOwner? `<div class="field"><label>Cost (₱)</label><input required name="cost" type="number" step="0.01" inputmode="decimal" placeholder="0.00"></div>` : ''}
        <div class="field"><label>Sell price (₱)</label><input required name="price" type="number" step="0.01" inputmode="decimal" placeholder="0.00"></div>
        <div class="field"><label>Starting qty</label><input required name="qty" type="number" inputmode="numeric" value="0"></div>
      </div>
      <div class="field"><label>Remarks</label><input name="remarks" placeholder="e.g. from Aling Nena, near expiry"></div>
      <div class="field"><label>Reorder alert level (0 = off)</label><input name="reorder" type="number" inputmode="numeric" value="5"></div>
      <button type="submit" class="btn-primary btn-block">${ICONS.plus} Add Item</button>
    </form>
  </div>

  <div class="card">
    <h2>📦 Incoming Stock (Manila → Tanza)</h2>
    <p style="font-size:12.5px;color:var(--ink-soft);margin-top:0;">When a delivery arrives from Manila, log what came in here — it adds straight to what's already on the shelf (not a replace) and shows up in the Stock Corrections log so there's a record of every shipment.</p>
    <form id="incomingStockForm">
      <div class="field"><label>Items received (one per line): <code>Item name, Qty</code></label>
        <textarea id="incomingStockText" rows="6" style="width:100%;font-family:ui-monospace,monospace;font-size:12.5px;border:1px solid var(--line);border-radius:10px;padding:10px;" placeholder="Coke, 24
Lucky Me Pancit Canton, 50"></textarea>
      </div>
      <div class="field"><label>Batch note (optional)</label><input name="batchNote" placeholder="e.g. Aug 25 delivery, invoice #123"></div>
      ${isOwner? `<div class="field"><label>Date received (optional, owner only)</label><input type="date" id="incomingStockDate" max="${todayStr()}"></div>` : ''}
      <button type="submit" class="btn-primary btn-block">${ICONS.plus} Log Incoming Stock</button>
    </form>
    <p style="font-size:11px;color:var(--ink-soft);margin-top:8px;">Only matches items already in your Stock List below — if something's brand new, add it with the form above first, then log the delivery here.</p>
  </div>

  ${isOwner? `
  <div class="card">
    <h2>Categories</h2>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
      ${state.categories.map(c=>`<span class="pill ok" style="display:flex;align-items:center;gap:6px;padding:5px 10px;">${esc(c)} <button data-delcat="${esc(c)}" style="background:none;border:none;color:var(--red);font-weight:800;cursor:pointer;padding:0;font-size:13px;">×</button></span>`).join('')}
    </div>
    <form id="addCategoryForm" style="display:flex;gap:8px;">
      <input name="newCat" placeholder="New category, e.g. Beverages" style="flex:1;">
      <button type="submit" class="btn-secondary">Add</button>
    </form>
  </div>

  <div class="card">
    <h2>Bulk Import (paste from your ledger)</h2>
    <p style="font-size:12.5px;color:var(--ink-soft);margin-top:0;">One item per line: <code>Name, Price, Qty</code> (optionally add <code>, Cost</code> at the end). Matching names update existing stock instead of duplicating. ${state._draftLoaded ? '' : 'This box is pre-filled with a draft read from your ledger photos — check it over, fix any misread numbers, then import.'}</p>
    <textarea id="bulkImportText" rows="8" style="width:100%;font-family:ui-monospace,monospace;font-size:12.5px;border:1px solid var(--line);border-radius:10px;padding:10px;" placeholder="Coke, 25, 12">${esc(state._bulkText ?? DRAFT_IMPORT_TEXT)}</textarea>
    <div style="display:flex;gap:8px;margin-top:8px;">
      <button id="bulkImportBtn" class="btn-primary" style="flex:1;">Import List</button>
      <button id="bulkClearBtn" class="btn-secondary">Clear box</button>
    </div>
  </div>` : ''}

  <div class="card">
    <h2>Stock List (${state.inventory.length})</h2>
    <div class="field"><input id="invSearch" placeholder="🔍 Search item or category" value="${esc(state._invSearch||'')}"></div>
    ${categoryChipsHtml(activeCat,'invcat')}
    ${isOwner && items.length ? `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
      <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;margin:0;">
        <input type="checkbox" id="invSelectAll" style="width:auto;"> Select all shown (${items.length})
      </label>
    </div>
    ${state._invSelected && state._invSelected.size>0 ? `
    <div class="card" style="background:#FFFBF0;border-color:var(--yellow);margin-bottom:12px;padding:12px;">
      <div style="font-weight:700;font-size:13px;margin-bottom:8px;">${state._invSelected.size} item(s) selected</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <select id="bulkCatAssign" style="flex:1;min-width:140px;">${categoryOptionsHtml()}</select>
        <button id="bulkCatApplyBtn" class="btn-secondary" style="padding:8px 12px;">Set category</button>
        <button id="bulkDeleteBtn" class="btn-danger" style="padding:8px 12px;">${ICONS.trash} Delete selected</button>
      </div>
    </div>` : ''}` : ''}
    ${items.length? items.map(i=>`
      <div class="item-row" data-id="${i.id}" style="flex-wrap:wrap;">
        ${isOwner? `<input type="checkbox" class="invSelectItem" data-id="${i.id}" ${state._invSelected && state._invSelected.has(i.id)?'checked':''} style="width:auto;margin-right:2px;">` : ''}
        <div class="item-main">
          <div class="name">${esc(i.name)} <span style="font-size:10.5px;font-weight:600;color:var(--ink-soft);">· ${esc(i.category||'Others')}</span></div>
          ${isOwner ? `
          <div class="meta" style="display:flex;gap:10px;align-items:center;margin-top:4px;">
            <span style="display:flex;align-items:center;gap:4px;">cost ₱<input type="number" step="0.01" class="quickCost" data-id="${i.id}" value="${i.cost}" style="width:64px;padding:4px 6px;font-size:12px;"></span>
            <span style="display:flex;align-items:center;gap:4px;">sell ₱<input type="number" step="0.01" class="quickPrice" data-id="${i.id}" value="${i.price}" style="width:64px;padding:4px 6px;font-size:12px;"></span>
            ${i.reorder>0 && i.qty<=i.reorder ? '<span class="pill low">low</span>' : ''}
          </div>` : `
          <div class="meta">sell ${peso(i.price)} ${i.reorder>0 && i.qty<=i.reorder ? '<span class="pill low">low</span>' : ''}</div>`}
          ${i.remarks? `<div class="meta" style="font-style:italic;">📝 ${esc(i.remarks)}</div>` : ''}
        </div>
        <div class="qty-adjust">
          <button data-act="dec">−</button>
          <span class="qty-num mono" data-act="qtyedit" style="cursor:pointer;text-decoration:underline dotted;" title="Tap to type the exact total">${i.qty}</span>
          <button data-act="inc">+</button>
        </div>
        <button class="icon-btn" data-act="edit">${ICONS.edit}</button>
        <button class="icon-btn" data-act="del" style="color:var(--red)">${ICONS.trash}</button>
      </div>
    `).join('') : `<div class="empty"><span class="big">📦</span>No items yet. Add your first stock above${isOwner? ', or use <strong>Resibo</strong> to scan a supplier receipt.' : '.'}</div>`}
  </div>
  `;
}

/* ---------------- Sell / POS ---------------- */
function viewSell(){
  const q = (state._sellSearch||'').toLowerCase();
  const activeCat = state._sellCategory || 'All';
  const items = state.inventory
    .filter(i=> activeCat==='All' || (i.category||'Others')===activeCat)
    .filter(i=> !q || i.name.toLowerCase().includes(q))
    .sort((a,b)=>a.name.localeCompare(b.name));
  const cartTotal = state.cart.reduce((a,c)=>a+c.price*c.qty,0);
  const pay = state.cartPayment || (state.cartPayment = {method:'cash', tendered:'', utangCustomerId:''});
  const tendered = parseFloat(pay.tendered)||0;
  const change = tendered - cartTotal;

  return `
  <div class="card">
    <h2>Bentahan (Sell)</h2>
    <div class="field"><input id="sellSearch" placeholder="🔍 Find item to sell" value="${esc(state._sellSearch||'')}"></div>
    ${categoryChipsHtml(activeCat,'sellcat')}
    ${items.length? `<div class="pos-grid">
      ${items.map(i=>{
        const inCart = state.cart.find(c=>c.itemId===i.id)?.qty || 0;
        const remaining = i.qty - inCart;
        return `
        <div style="position:relative;">
          <button class="pos-item" data-id="${i.id}" style="width:100%;${remaining<=0?'opacity:.4;':''}" ${remaining<=0?'disabled':''}>
            <span class="n">${esc(i.name)}</span>
            <span class="p mono">${peso(i.price)}</span>
            <span class="s">${remaining} ${esc(i.unit)} left${inCart? ` <span style="color:var(--yellow);font-weight:700;">(${inCart} in cart)</span>` : ''}</span>
          </button>
          ${state.role==='owner'? `<button data-qtyeditsell="${i.id}" title="Tap to edit total stock" style="position:absolute;top:4px;right:4px;background:rgba(255,255,255,0.9);border:1px solid var(--line);border-radius:6px;padding:3px 5px;font-size:11px;line-height:1;">✏️</button>` : ''}
        </div>`;
      }).join('')}
    </div>` : `<div class="empty"><span class="big">🛒</span>No stock to sell yet. Add items in <strong>Stocks</strong> first.</div>`}
  </div>

  ${state.cart.length? `
  <div class="card">
    <h2>Cart</h2>
    ${state.cart.map(c=>`
      <div class="cart-line" data-id="${c.itemId}">
        <div>
          <strong>${esc(c.name)}</strong>
          <div class="meta" style="font-size:12px;color:var(--ink-soft)">${peso(c.price)} × ${c.qty}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="qty-adjust">
            <button data-act="cdec">−</button>
            <span class="qty-num mono">${c.qty}</span>
            <button data-act="cinc">+</button>
          </div>
          <button class="icon-btn" data-act="cdel" style="color:var(--red)">${ICONS.trash}</button>
        </div>
      </div>`).join('')}
    <div class="cart-strip">
      <span style="font-weight:800">Total</span>
      <span class="mono" style="font-weight:800;font-size:18px">${peso(cartTotal)}</span>
    </div>

    <div style="margin-top:12px;">
      <label>Bayad (Payment)</label>
      <div class="segmented" id="paySeg">
        <button data-pay="cash" class="${pay.method==='cash'?'active':''}">💵 Cash</button>
        <button data-pay="gcash" class="${pay.method==='gcash'?'active':''}">💳 GCash</button>
        <button data-pay="utang" class="${pay.method==='utang'?'active':''}">🤝 Utang</button>
      </div>
    </div>

    ${pay.method==='cash'? `
    <div class="grid2" style="margin-top:10px;">
      <div class="field"><label>Cash tendered</label><input id="cashTendered" type="number" inputmode="decimal" placeholder="0.00" value="${esc(pay.tendered)}"></div>
      <div class="field"><label>Change</label><input disabled value="${peso(Math.max(0,change))}" style="font-weight:800;color:${change<0?'var(--red)':'var(--green)'};"></div>
    </div>` : ''}

    ${pay.method==='utang'? `
    <div class="field" style="margin-top:10px;">
      <label>Customer</label>
      <select id="utangCustomerSelect">
        <option value="">— Select customer —</option>
        ${state.utang.map(c=>`<option value="${c.id}" ${pay.utangCustomerId===c.id?'selected':''}>${esc(c.name)} (owes ${peso(c.balance)})</option>`).join('')}
        <option value="__new__">+ New customer…</option>
      </select>
    </div>` : ''}

    ${state.role==='owner'? `
    <div class="field" style="margin-top:10px;">
      <label>Backdate this sale? (optional, owner only)</label>
      <input type="datetime-local" id="saleBackdate" value="${esc(pay.backdate||'')}" max="${new Date().toISOString().slice(0,16)}">
    </div>` : ''}

    <button id="checkoutBtn" class="btn-primary btn-block" style="margin-top:12px">✅ Checkout — Record Sale</button>
  </div>` : ''}
  `;
}

/* ---------------- Vouchers ---------------- */
// Codes uploaded by the user for their ₱100 load voucher batch — pre-filled into the
// import box so they just review and hit Import, no manual retyping needed.
const DRAFT_VOUCHER_CODES = `36586409
62214866
90368098
67130252
91615640
02071701
55567416
70810141
15842712
31520236
69138714
85628634
24808983
57462419
81666102
84165049
10509859
44948318
37291051
79385844`;

function viewVouchers(){
  const isOwner = state.role==='owner';
  const today = todayStr();
  const soldToday = state.sales.filter(s=>s.isVoucher && s.ts.slice(0,10)===today).reduce((a,s)=>a+s.qty,0);
  const revenueToday = state.sales.filter(s=>s.isVoucher && s.ts.slice(0,10)===today).reduce((a,s)=>a+s.total,0);
  const totalUnused = state.voucherCodes.filter(c=>voucherCodeStatus(c)==='unused').length;
  const totalUsed = state.voucherCodes.filter(c=>voucherCodeStatus(c)==='used').length;
  const totalExpired = state.voucherCodes.filter(c=>voucherCodeStatus(c)==='expired').length;
  const noImportYet = state.voucherCodes.length===0 && !state._voucherDraftLoaded;
  const expandedType = state._expandedVoucherType || '';

  return `
  <div class="card">
    <h2>📶 WiFi Vouchers</h2>
    <div class="stat-row">
      <div class="stat" style="--accent:var(--green)"><div class="label">Sold today</div><div class="value mono">${soldToday}</div></div>
      ${isOwner? `<div class="stat" style="--accent:var(--yellow)"><div class="label">Revenue today</div><div class="value mono">${peso(revenueToday)}</div></div>` : ''}
    </div>
    <div class="stat-row" style="margin-top:10px;">
      <div class="stat" style="--accent:var(--green)"><div class="label">Not used</div><div class="value mono">${totalUnused}</div></div>
      <div class="stat" style="--accent:var(--ink-soft)"><div class="label">Used</div><div class="value mono">${totalUsed}</div></div>
      <div class="stat" style="--accent:var(--red)"><div class="label">Expired</div><div class="value mono">${totalExpired}</div></div>
    </div>
  </div>

  <div class="card">
    <h2>Tap to Sell</h2>
    ${state.vouchers.length? `<div class="pos-grid">
      ${state.vouchers.map(v=>{
        const stock = voucherStockCount(v.id);
        return `
        <button class="pos-item" data-sellvoucher="${v.id}" ${stock<=0?'disabled style="opacity:.4"':''}>
          <span class="n">${esc(v.name)}</span>
          <span class="p mono">${peso(v.price)}</span>
          <span class="s">${stock} left</span>
        </button>`;
      }).join('')}
    </div>` : `<div class="empty"><span class="big">📶</span>No voucher types yet — import some codes below.</div>`}
  </div>

  ${isOwner? `
  <div class="card">
    <h2>Import Voucher Codes</h2>
    <p style="font-size:12.5px;color:var(--ink-soft);margin-top:0;">${noImportYet? 'Pre-filled with the codes from your uploaded file — check them over, set the cost per code, then import. Nothing is saved until you tap Import.' : 'Paste one code per line. Matching an existing type adds to its stock; picking "New voucher type" creates one.'}</p>
    <form id="voucherImportForm">
      <div class="field"><label>Voucher type</label>
        <select name="typeId" id="voucherImportTypeSelect">
          <option value="__new__" ${noImportYet?'selected':''}>+ New voucher type…</option>
          ${state.vouchers.map(v=>`<option value="${v.id}">${esc(v.name)}</option>`).join('')}
        </select>
      </div>
      <div id="newVoucherTypeFields" style="${noImportYet? '' : 'display:none;'}">
        <div class="grid3">
          <div class="field"><label>Name</label><input name="newName" placeholder="e.g. ₱100 Load" value="${noImportYet?'₱100 Load Voucher':''}"></div>
          <div class="field"><label>Cost per code (₱)</label><input name="newCost" type="number" step="0.01" placeholder="0.00"></div>
          <div class="field"><label>Sell price (₱)</label><input name="newPrice" type="number" step="0.01" value="${noImportYet?'100':''}"></div>
        </div>
      </div>
      <div class="field"><label>Codes (one per line)</label>
        <textarea id="voucherCodesText" rows="7" style="width:100%;font-family:ui-monospace,monospace;font-size:12.5px;border:1px solid var(--line);border-radius:10px;padding:10px;">${esc(state._voucherCodesText ?? (noImportYet ? DRAFT_VOUCHER_CODES : ''))}</textarea>
      </div>
      <div class="field"><label>Expiry date (optional — applies to this batch)</label><input name="expiryDate" type="date"></div>
      <button type="submit" class="btn-primary btn-block">${ICONS.plus} Import Codes</button>
    </form>
  </div>

  <div class="card">
    <h2>Manage Voucher Types</h2>
    ${state.vouchers.length? state.vouchers.map(v=>{
      const codes = state.voucherCodes.filter(c=>c.typeId===v.id);
      const unused = codes.filter(c=>voucherCodeStatus(c)==='unused').length;
      const used = codes.filter(c=>voucherCodeStatus(c)==='used').length;
      const expired = codes.filter(c=>voucherCodeStatus(c)==='expired').length;
      return `
      <div class="item-row" data-vid="${v.id}" style="flex-wrap:wrap;">
        <div class="item-main">
          <div class="name">${esc(v.name)}</div>
          <div class="meta" style="display:flex;gap:10px;align-items:center;margin-top:4px;">
            <span>cost ₱<input type="number" step="0.01" class="voucherCost" data-id="${v.id}" value="${v.cost}" style="width:60px;padding:4px 6px;font-size:12px;"></span>
            <span>sell ₱<input type="number" step="0.01" class="voucherPrice" data-id="${v.id}" value="${v.price}" style="width:60px;padding:4px 6px;font-size:12px;"></span>
          </div>
          <div class="meta" style="font-size:11.5px;color:var(--ink-soft);">Not used: ${unused} · Used: ${used} · Expired: ${expired}</div>
        </div>
        <button class="btn-secondary" data-viewcodes="${v.id}" style="padding:6px 10px;font-size:12px;">${expandedType===v.id?'Hide':'View'} codes</button>
        <button class="icon-btn" data-delvoucher="${v.id}" style="color:var(--red)">${ICONS.trash}</button>
      </div>
      ${expandedType===v.id ? `
      <div style="max-height:220px;overflow-y:auto;border:1px solid var(--line);border-radius:10px;padding:8px 10px;margin:0 0 10px;background:var(--paper);">
        ${codes.length? codes.map(c=>{
          const st = voucherCodeStatus(c);
          const pillClass = st==='unused' ? 'ok' : 'low';
          return `<div class="ledger-row" style="padding:6px 0;">
            <span class="mono" style="font-size:12.5px;">${esc(c.code)}</span>
            <span style="display:flex;align-items:center;gap:8px;">
              <span class="pill ${pillClass}">${st}</span>
              ${st==='unused'? `<button data-expirecode="${c.id}" class="icon-btn" title="Mark expired" style="color:var(--red);">${ICONS.close}</button>` : ''}
            </span>
          </div>`;
        }).join('') : `<div class="empty" style="padding:10px;">No codes imported for this type yet.</div>`}
      </div>` : ''}
      `;
    }).join('') : `<div class="empty"><span class="big">📶</span>No voucher types yet.</div>`}
  </div>` : ''}
  `;
}

function bindVoucherEvents(){
  document.querySelectorAll('[data-sellvoucher]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const type = state.vouchers.find(x=>x.id===btn.dataset.sellvoucher);
      if(!type) return;
      const code = state.voucherCodes.find(c=>c.typeId===type.id && voucherCodeStatus(c)==='unused');
      if(!code){ showToast('No stock left for '+type.name); return; }
      code.status = 'used';
      code.soldTs = new Date().toISOString();
      state.sales.push({
        id:uid(), itemId:null, name:type.name+' (WiFi Voucher)', qty:1,
        price:type.price, cost:type.cost, total:type.price,
        ts:new Date().toISOString(), payment:'Cash', isVoucher:true, voucherCode:code.code,
      });
      await Promise.all([storageSet('voucher-codes', state.voucherCodes), storageSet('sales', state.sales)]);
      showToast('✅ Sold '+type.name);
      render();
    });
  });

  document.getElementById('voucherImportTypeSelect')?.addEventListener('change', e=>{
    const fields = document.getElementById('newVoucherTypeFields');
    if(fields) fields.style.display = e.target.value==='__new__' ? '' : 'none';
  });
  document.getElementById('voucherCodesText')?.addEventListener('input', e=>{
    state._voucherCodesText = e.target.value;
  });

  document.getElementById('voucherImportForm')?.addEventListener('submit', async e=>{
    e.preventDefault();
    const f = new FormData(e.target);
    let typeId = f.get('typeId');
    let type;
    if(typeId==='__new__'){
      const name = (f.get('newName')||'').trim();
      const cost = parseFloat(f.get('newCost'))||0;
      const price = parseFloat(f.get('newPrice'))||0;
      if(!name || !price){ showToast('⚠️ Give the new voucher type a name and price'); return; }
      type = {id:uid(), name, cost, price};
      state.vouchers.push(type);
      typeId = type.id;
    } else {
      type = state.vouchers.find(v=>v.id===typeId);
      if(!type){ showToast('⚠️ Pick a voucher type'); return; }
    }
    const raw = document.getElementById('voucherCodesText').value;
    const expiry = f.get('expiryDate') || '';
    const lines = raw.split('\n').map(l=>l.trim()).filter(Boolean);
    const existingCodes = new Set(state.voucherCodes.map(c=>c.code));
    let added=0, dupes=0;
    for(const code of lines){
      if(existingCodes.has(code)){ dupes++; continue; }
      state.voucherCodes.push({id:uid(), typeId, code, status:'unused', expiryDate:expiry, soldTs:''});
      existingCodes.add(code);
      added++;
    }
    await Promise.all([storageSet('vouchers', state.vouchers), storageSet('voucher-codes', state.voucherCodes)]);
    state._voucherDraftLoaded = true;
    state._voucherCodesText = '';
    showToast(`✅ Imported ${added} code(s)${dupes?`, skipped ${dupes} duplicate(s)`:''}`);
    render();
  });

  document.querySelectorAll('.voucherCost').forEach(inp=>{
    inp.addEventListener('change', async ()=>{
      const v = state.vouchers.find(x=>x.id===inp.dataset.id);
      if(v){ v.cost = parseFloat(inp.value)||0; await storageSet('vouchers', state.vouchers); showToast('✅ Cost updated'); }
    });
  });
  document.querySelectorAll('.voucherPrice').forEach(inp=>{
    inp.addEventListener('change', async ()=>{
      const v = state.vouchers.find(x=>x.id===inp.dataset.id);
      if(v){ v.price = parseFloat(inp.value)||0; await storageSet('vouchers', state.vouchers); showToast('✅ Price updated'); }
    });
  });
  document.querySelectorAll('[data-viewcodes]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      state._expandedVoucherType = state._expandedVoucherType===btn.dataset.viewcodes ? '' : btn.dataset.viewcodes;
      render();
    });
  });
  document.querySelectorAll('[data-expirecode]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const code = state.voucherCodes.find(c=>c.id===btn.dataset.expirecode);
      if(!code) return;
      if(!confirm(`Mark code ${code.code} as expired? This removes it from sellable stock.`)) return;
      code.expiryDate = todayStr();
      await storageSet('voucher-codes', state.voucherCodes);
      render();
    });
  });
  document.querySelectorAll('[data-delvoucher]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const hasCodes = state.voucherCodes.some(c=>c.typeId===btn.dataset.delvoucher);
      if(hasCodes){ showToast('⚠️ Can\'t delete — this type still has imported codes on record'); return; }
      if(!confirm('Remove this voucher type?')) return;
      state.vouchers = state.vouchers.filter(v=>v.id!==btn.dataset.delvoucher);
      await storageSet('vouchers', state.vouchers);
      render();
    });
  });
}

/* ---------------- Log: Transactions / Utang / Gastos / GCash ---------------- */
function viewLog(){
  const seg = state._logSeg || 'transactions';
  const isOwner = state.role==='owner';
  return `
  <div class="card">
    <h2>📒 Log</h2>
    <div class="segmented" id="logSeg">
      <button data-seg="transactions" class="${seg==='transactions'?'active':''}">🧾 Transactions</button>
      <button data-seg="utang" class="${seg==='utang'?'active':''}">🤝 Utang</button>
      <button data-seg="gastos" class="${seg==='gastos'?'active':''}">💸 Gastos</button>
      <button data-seg="gcash" class="${seg==='gcash'?'active':''}">💳 GCash</button>
      <button data-seg="load" class="${seg==='load'?'active':''}">📱 Load</button>
      ${isOwner? `<button data-seg="remittance" class="${seg==='remittance'?'active':''}">📥 Remittance</button>` : ''}
      ${isOwner? `<button data-seg="stockadj" class="${seg==='stockadj'?'active':''}">📐 Stock Corrections</button>` : ''}
    </div>
  </div>
  ${seg==='transactions'? viewTransactionsSection()
    : seg==='utang'? viewUtangSection(isOwner)
    : seg==='gastos'? viewGastosSection(isOwner)
    : seg==='load'? viewLoadSection(isOwner)
    : seg==='remittance' && isOwner? viewRemittanceSection()
    : seg==='stockadj' && isOwner? viewStockAdjustmentsSection()
    : viewGcashSection(isOwner)}
  `;
}

function viewStockAdjustmentsSection(){
  const recent = [...state.stockAdjustments].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,100);
  return `
  <div class="card">
    <h2>📐 Stock Correction History</h2>
    <p style="font-size:12.5px;color:var(--ink-soft);margin-top:0;">Every manual quantity change — quick +/- taps and Edit Item corrections — is recorded here automatically, so you can always trace back why a number changed.</p>
  </div>
  <div class="card">
    ${recent.length? recent.map(a=>`
      <div class="ledger-row">
        <div>
          <strong>${esc(a.itemName)}</strong>
          <div class="meta" style="font-size:11.5px;color:var(--ink-soft);">${new Date(a.date).toLocaleString('en-PH',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})} · by ${a.changedBy||'—'}</div>
          ${a.reason? `<div class="meta" style="font-style:italic;">"${esc(a.reason)}"</div>` : ''}
        </div>
        <div class="mono" style="font-weight:800;text-align:right;">
          <span style="color:var(--ink-soft);">${a.oldQty}</span> → <span style="color:${a.newQty<a.oldQty?'var(--red)':'var(--green)'};">${a.newQty}</span>
        </div>
      </div>`).join('') : `<div class="empty"><span class="big">📐</span>No manual corrections yet — this fills in automatically whenever a quantity is changed by hand.</div>`}
  </div>
  `;
}

function viewTransactionsSection(){
  const range = state._txRange || '7';
  const q = (state._txSearch||'').toLowerCase();
  const cutoff = getDateCutoff(range, state._txCustomFrom, state._txCustomTo);
  const isOwner = state.role==='owner';
  const filtered = state.sales
    .filter(s=> inDateRange(s.ts, cutoff))
    .filter(s=> !q || s.name.toLowerCase().includes(q))
    .sort((a,b)=>b.ts.localeCompare(a.ts));
  const total = filtered.reduce((a,s)=>a+s.total,0);

  return `
  <div class="card">
    <h2>Previous Transactions</h2>
    ${dateRangeControlHtml('tx', range, state._txCustomFrom, state._txCustomTo, false)}
    <div class="field" style="margin-top:10px;"><input id="txSearch" placeholder="🔍 Search by item name" value="${esc(state._txSearch||'')}"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
      <div style="font-size:12.5px;color:var(--ink-soft);">${dateRangeLabel(range, state._txCustomFrom, state._txCustomTo)} · ${filtered.length} transaction(s) · total ${peso(total)}</div>
      <button id="exportTxExcelBtn" class="btn-secondary" style="padding:7px 12px;font-size:12.5px;">⬇ Export Excel</button>
    </div>
    ${isOwner? `<p style="font-size:11px;color:var(--ink-soft);margin:8px 0 0;">Wrong quantity on a sale? Tap ✏️ on that row to fix it — stock adjusts automatically to match.</p>` : ''}
  </div>
  <div class="card">
    ${filtered.length? filtered.map(s=>`
      <div class="ledger-row" data-saleid="${s.id}">
        <div>
          <strong>${esc(s.name)}</strong> <span class="meta" style="color:var(--ink-soft);font-size:12px">×${s.qty}</span>
          <div class="meta" style="font-size:11.5px;color:var(--ink-soft);">${new Date(s.ts).toLocaleString('en-PH',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})} · ${esc(s.payment||'Cash')}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span class="mono" style="font-weight:800;">${peso(s.total)}</span>
          ${isOwner? `<button class="icon-btn" data-saleedit="${s.id}" style="color:var(--ink-soft);">${ICONS.edit}</button>` : ''}
          ${isOwner? `<button class="icon-btn" data-saledel="${s.id}" style="color:var(--red);">${ICONS.trash}</button>` : ''}
        </div>
      </div>`).join('') : `<div class="empty"><span class="big">🧾</span>No transactions in this range yet.</div>`}
  </div>
  `;
}

function viewUtangSection(isOwner){
  const total = state.utang.reduce((a,c)=>a+c.balance,0);
  return `
  <div class="card">
    <h2>Add Customer</h2>
    <form id="addUtangCustForm">
      <div class="field"><label>Customer name</label><input name="name" required placeholder="e.g. Aling Nena"></div>
      <div class="field"><label>Contact (optional)</label><input name="contact" placeholder="phone number"></div>
      <button type="submit" class="btn-secondary btn-block">+ Add Customer</button>
    </form>
  </div>
  <div class="card">
    <h2>Customers (Total owed: ${peso(total)})</h2>
    ${state.utang.length? state.utang.map(c=>{
      const expanded = state._expandedUtangCust === c.id;
      return `
      <div class="ledger-row" style="align-items:flex-start;flex-wrap:wrap;">
        <div style="flex:1;">
          <strong>${esc(c.name)}</strong> ${c.contact? `<span class="meta" style="font-size:11.5px;color:var(--ink-soft);">· ${esc(c.contact)}</span>`:''}
          <div class="mono" style="font-weight:800;color:${c.balance>0?'var(--red)':'var(--green)'};margin-top:2px;">${peso(c.balance)} owed</div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;">
          <button class="btn-secondary" data-utangborrow="${c.id}" style="padding:6px 10px;font-size:12px;">+ Borrow</button>
          <button class="btn-primary" data-utangpay="${c.id}" style="padding:6px 10px;font-size:12px;">Payment</button>
          ${isOwner? `<button class="icon-btn" data-utangedit="${c.id}" style="color:var(--ink-soft);">${ICONS.edit}</button>` : ''}
          ${isOwner? `<button class="icon-btn" data-utangdel="${c.id}" style="color:var(--red);">${ICONS.trash}</button>` : ''}
        </div>
        ${isOwner && c.history.length? `<button data-utanghistory="${c.id}" class="btn-secondary" style="margin-top:6px;padding:5px 10px;font-size:11.5px;">${expanded?'Hide':'View'} history (${c.history.length})</button>` : ''}
        ${expanded ? `
        <div style="width:100%;margin-top:8px;border:1px solid var(--line);border-radius:10px;padding:8px 10px;background:var(--paper);max-height:220px;overflow-y:auto;">
          ${[...c.history].sort((a,b)=>b.date.localeCompare(a.date)).map(h=>`
            <div class="ledger-row" style="padding:6px 0;">
              <div>
                <span style="font-weight:700;color:${h.type==='charge'?'var(--red)':'var(--green)'};">${h.type==='charge'?'+ Borrowed':'− Paid'} ${peso(h.amount)}</span>
                <div class="meta" style="font-size:11px;color:var(--ink-soft);">${new Date(h.date).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})} ${h.remarks?'· '+esc(h.remarks):''}</div>
              </div>
              <button data-utanghistdel="${c.id}|${h.id}" class="icon-btn" style="color:var(--red);" title="Remove this entry">${ICONS.close}</button>
            </div>
          `).join('')}
        </div>` : ''}
      </div>
    `;}).join('') : `<div class="empty"><span class="big">🤝</span>No utang customers yet.</div>`}
  </div>`;
}

function viewGastosSection(isOwner){
  const today = todayStr();
  const todayTotal = state.expenses.filter(e=>e.date.slice(0,10)===today).reduce((a,e)=>a+e.amount,0);
  const recent = [...state.expenses].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,20);
  return `
  <div class="card">
    <h2>Log an Expense</h2>
    <form id="addExpenseForm">
      <div class="grid2">
        <div class="field"><label>Category</label>
          <select name="category">
            <option>Delivery / Supplier Payment</option>
            <option>Utilities</option>
            <option>Rent</option>
            <option>Other</option>
          </select>
        </div>
        <div class="field"><label>Amount (₱)</label><input name="amount" type="number" step="0.01" required></div>
      </div>
      <div class="field"><label>Remarks</label><input name="remarks" placeholder="e.g. softdrinks delivery, Aug 15"></div>
      <div class="field">
        <label>Receipt photo (optional)</label>
        <button type="button" id="expenseReceiptBtn" class="btn-secondary btn-block" style="text-align:left;">${ICONS.camera} <span id="expenseReceiptLabel">Attach a photo</span></button>
        <input type="file" id="expenseReceiptFile" accept="image/*" capture="environment" style="display:none;">
        <img id="expenseReceiptPreview" style="display:none;max-width:100%;max-height:140px;border-radius:8px;margin-top:8px;border:1px solid var(--line);">
      </div>
      <button type="submit" class="btn-primary btn-block">${ICONS.plus} Log Expense</button>
    </form>
  </div>
  <div class="card">
    <h2>Expenses ${isOwner? `— Today: ${peso(todayTotal)}`:''}</h2>
    ${recent.length? recent.map(e=>`
      <div class="ledger-row">
        <div><strong>${esc(e.category)}</strong>
          <div class="meta" style="font-size:11.5px;color:var(--ink-soft);">${new Date(e.date).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})} ${e.remarks? '· '+esc(e.remarks):''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          ${e.hasReceipt? `<button class="icon-btn" data-viewexpensereceipt="${e.id}" style="color:var(--green);" title="View receipt photo">${ICONS.camera}</button>` : ''}
          <span class="mono" style="font-weight:800;">${peso(e.amount)}</span>
        </div>
      </div>`).join('') : `<div class="empty"><span class="big">🧾</span>No expenses logged yet.</div>`}
  </div>`;
}

function viewGcashSection(isOwner){
  const wallet = computeGcashWallet();
  const cashOnHand = computeCashOnHand();
  const recent = [...state.gcash].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,20);
  return `
  <div class="card">
    <h2>💳 GCash</h2>
    <div class="stat-row">
      <div class="stat" style="--accent:${wallet<0?'var(--red)':'var(--green)'}"><div class="label">GCash Wallet</div><div class="value mono">${peso(wallet)}</div></div>
      <div class="stat" style="--accent:${cashOnHand<0?'var(--red)':'var(--yellow)'}"><div class="label">Cash on Hand</div><div class="value mono">${peso(cashOnHand)}</div></div>
    </div>
    ${isOwner? `
    <div class="grid2" style="margin-top:10px;">
      <div class="field"><label>Set starting Wallet balance</label>
        <input id="gcashFloatStart" type="number" step="0.01" value="${state.config.gcashFloatStart||0}">
      </div>
      <div class="field"><label>Set starting Cash on Hand</label>
        <input id="cashOnHandStart" type="number" step="0.01" value="${state.config.cashOnHandStart||0}">
      </div>
    </div>
    <p style="font-size:11px;color:var(--ink-soft);margin-top:4px;">Adjust these if either number drifts from what's actually in the GCash app or in the drawer.</p>` : ''}
    <p style="font-size:12px;color:var(--ink-soft);margin-top:8px;"><strong>GCash Wallet</strong> is your e-money balance — Cash In sends it down, Cash Out brings it up. <strong>Cash on Hand</strong> is the physical peso the employee is holding from these transactions — it moves the opposite way. How much of each depends on who pays the fee, picked per transaction below.</p>
  </div>
  <div class="card">
    <h2>Record Cash-In / Cash-Out</h2>
    <form id="gcashForm">
      <div class="segmented" id="gcashTypeSeg">
        <button type="button" data-gtype="cash-in" class="active">Cash In</button>
        <button type="button" data-gtype="cash-out">Cash Out</button>
      </div>
      <input type="hidden" name="type" id="gcashTypeInput" value="cash-in">
      <div class="grid2" style="margin-top:10px;">
        <div class="field"><label>Amount (₱)</label><input id="gcashAmount" name="amount" type="number" step="0.01" required></div>
        <div class="field"><label>Fee (₱) <span style="font-weight:400;color:var(--ink-soft);">auto, editable</span></label><input id="gcashFee" name="fee" type="number" step="0.01" value="0"></div>
      </div>
      <div class="field" style="margin-top:10px;">
        <label id="gcashFeeModeLabel">Who pays the fee?</label>
        <div class="segmented" id="gcashFeeModeSeg">
          <button type="button" data-fmode="add" class="active">Customer pays it separately</button>
          <button type="button" data-fmode="deduct">Deducted from the transfer</button>
        </div>
        <p id="gcashFeeModeHelp" style="font-size:11.5px;color:var(--ink-soft);margin:6px 0 0;"></p>
      </div>
      <input type="hidden" name="feeMode" id="gcashFeeModeInput" value="add">
      <div class="field" style="margin-top:10px;"><label>Remarks</label><input name="remarks" placeholder="optional"></div>
      <button type="submit" class="btn-primary btn-block">Save Transaction</button>
    </form>
    <p style="font-size:11px;color:var(--ink-soft);margin-top:8px;">Fee auto-fills from a ₱10-per-₱500-bracket schedule (₱1–500 → ₱10, up to ₱9,501–10,000 → ₱200) — edit it any time before saving if a transaction needs a different fee.</p>
  </div>
  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <h2 style="margin:0;">Recent GCash Transactions</h2>
      <button id="exportGcashExcelBtn" class="btn-secondary" style="padding:7px 12px;font-size:12.5px;">⬇ Export Excel</button>
    </div>
    <div style="margin-top:10px;">
    ${recent.length? recent.map(g=>`
      <div class="ledger-row">
        <div><strong>${g.type==='cash-in'?'Cash In':'Cash Out'}</strong>
          <div class="meta" style="font-size:11.5px;color:var(--ink-soft);">${new Date(g.date).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})} ${g.remarks?'· '+esc(g.remarks):''}${g.fee?` · fee ${peso(g.fee)} (${g.feeMode==='deduct'?'deducted':'paid separately'})`:''}</div>
        </div>
        <span class="mono" style="font-weight:800;">${peso(g.amount)}</span>
      </div>`).join('') : `<div class="empty"><span class="big">💳</span>No GCash transactions yet.</div>`}
    </div>
  </div>`;
}

const LOAD_PROVIDERS = ['Globe','TM','Smart','TNT','DITO','Sun','Others'];

function viewLoadSection(isOwner){
  const balance = computeEloadBalance();
  const recent = [...state.eload].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,20);
  return `
  <div class="card">
    <h2>📱 E-Load Balance</h2>
    <div class="stat-row">
      <div class="stat" style="--accent:${balance<0?'var(--red)':'var(--green)'}"><div class="label">Balance</div><div class="value mono">${peso(balance)}</div></div>
    </div>
    ${isOwner? `
    <div class="field" style="margin-top:10px;"><label>Set starting balance (adjust if it drifts from your actual load balance)</label>
      <input id="eloadBalanceStart" type="number" step="0.01" value="${state.config.eloadBalanceStart||0}">
    </div>` : ''}
    <p style="font-size:12px;color:var(--ink-soft);margin-top:8px;">Sending load lowers your balance by the load amount. The fee is separate cash the customer pays on top — pure profit, doesn't touch the balance.</p>
  </div>
  <div class="card">
    <h2>Send Load</h2>
    <form id="eloadForm">
      <div class="grid2">
        <div class="field"><label>Network</label>
          <select name="provider">${LOAD_PROVIDERS.map(p=>`<option>${p}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Load Type</label>
          <div class="segmented" id="eloadTypeSeg">
            <button type="button" data-ltype="Regular" class="active">Regular</button>
            <button type="button" data-ltype="Promo">Promo</button>
          </div>
        </div>
      </div>
      <input type="hidden" name="loadType" id="eloadTypeInput" value="Regular">
      <div class="grid2" style="margin-top:10px;">
        <div class="field"><label>Load amount (₱)</label><input name="amount" type="number" step="0.01" required></div>
        <div class="field"><label>Fee (₱)</label><input name="fee" type="number" step="0.01" value="0"></div>
      </div>
      <div class="field"><label>Remarks</label><input name="remarks" placeholder="e.g. customer number, promo name"></div>
      <button type="submit" class="btn-primary btn-block">Save Load Transaction</button>
    </form>
  </div>
  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <h2 style="margin:0;">Recent Load Transactions</h2>
      <button id="exportLoadExcelBtn" class="btn-secondary" style="padding:7px 12px;font-size:12.5px;">⬇ Export Excel</button>
    </div>
    <div style="margin-top:10px;">
    ${recent.length? recent.map(l=>`
      <div class="ledger-row">
        <div><strong>${esc(l.provider)} ${esc(l.loadType)}</strong>
          <div class="meta" style="font-size:11.5px;color:var(--ink-soft);">${new Date(l.date).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})} ${l.remarks?'· '+esc(l.remarks):''}${l.fee?` · fee ${peso(l.fee)}`:''}</div>
        </div>
        <span class="mono" style="font-weight:800;">${peso(l.amount)}</span>
      </div>`).join('') : `<div class="empty"><span class="big">📱</span>No load transactions yet.</div>`}
    </div>
  </div>`;
}

function mondayOfWeek(d){
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun..6=Sat
  const diff = day===0 ? -6 : 1-day; // shift to Monday
  date.setDate(date.getDate()+diff);
  date.setHours(0,0,0,0);
  return date;
}

function computeExpectedCash(periodStart, periodEnd){
  const start = new Date(periodStart+'T00:00:00');
  const end = new Date(periodEnd+'T23:59:59');
  const inRange = (ts)=>{ const t=new Date(ts); return t>=start && t<=end; };

  const cashSales = state.sales.filter(s=> inRange(s.ts) && (s.payment||'Cash')==='Cash').reduce((a,s)=>a+s.total,0);
  const gcashCashDelta = state.gcash.filter(g=> inRange(g.date)).reduce((a,g)=>{
    const fee = g.fee||0, mode = g.feeMode||'add';
    if(g.type==='cash-out') return a - ((mode==='add') ? g.amount : (g.amount-fee));
    return a + ((mode==='add') ? (g.amount+fee) : g.amount);
  }, 0);
  const loadCash = state.eload.filter(l=> inRange(l.date)).reduce((a,l)=>a+l.amount+l.fee, 0);
  const utangPayments = state.utang.reduce((a,c)=>a + c.history.filter(h=>h.type==='payment' && inRange(h.date)).reduce((s,h)=>s+h.amount,0), 0);
  const expensesOut = state.expenses.filter(e=> inRange(e.date)).reduce((a,e)=>a+e.amount,0);

  return {
    cashSales, gcashCashDelta, loadCash, utangPayments, expensesOut,
    total: cashSales + gcashCashDelta + loadCash + utangPayments - expensesOut,
  };
}

function viewRemittanceSection(){
  const monday = mondayOfWeek(new Date());
  const saturday = new Date(monday); saturday.setDate(saturday.getDate()+5);
  const defaultStart = state._remitStart || monday.toISOString().slice(0,10);
  const defaultEnd = state._remitEnd || saturday.toISOString().slice(0,10);
  const breakdown = computeExpectedCash(defaultStart, defaultEnd);
  const recent = [...state.remittances].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,15);

  return `
  <div class="card">
    <h2>📥 Weekly Cash Remittance</h2>
    <p style="font-size:12.5px;color:var(--ink-soft);margin-top:0;">Pick the week, and this adds up everything that should be cash in hand — sales, GCash, Load, utang payments, minus expenses paid from the till. Compare it to what actually gets remitted.</p>
    <div class="grid2">
      <div class="field"><label>Period start</label><input type="date" id="remitStart" value="${defaultStart}" max="${todayStr()}"></div>
      <div class="field"><label>Period end</label><input type="date" id="remitEnd" value="${defaultEnd}" max="${todayStr()}"></div>
    </div>
    <button id="remitRecalcBtn" class="btn-secondary btn-block">Recalculate</button>
  </div>
  <div class="card">
    <h2>Expected Cash for This Period</h2>
    <div class="ledger-row"><span>Cash sales (Bentahan)</span><span class="mono">${peso(breakdown.cashSales)}</span></div>
    <div class="ledger-row"><span>GCash cash flow</span><span class="mono">${peso(breakdown.gcashCashDelta)}</span></div>
    <div class="ledger-row"><span>Load (amount + fee, cash collected)</span><span class="mono">${peso(breakdown.loadCash)}</span></div>
    <div class="ledger-row"><span>Utang payments received</span><span class="mono">${peso(breakdown.utangPayments)}</span></div>
    <div class="ledger-row"><span>Expenses paid from till</span><span class="mono" style="color:var(--red);">−${peso(breakdown.expensesOut)}</span></div>
    <div class="ledger-row" style="border-top:2px solid var(--line);margin-top:6px;padding-top:8px;"><strong>Expected Total</strong><span class="mono" style="font-weight:800;font-size:16px;">${peso(breakdown.total)}</span></div>
  </div>
  <div class="card">
    <h2>Record Actual Remittance</h2>
    <form id="remittanceForm">
      <input type="hidden" id="remitExpectedInput" value="${breakdown.total}">
      <div class="field"><label>Amount actually remitted (₱)</label><input name="actualRemitted" type="number" step="0.01" required placeholder="${breakdown.total.toFixed(2)}"></div>
      <div class="field"><label>Remarks</label><input name="remarks" placeholder="optional — note any known discrepancy"></div>
      <button type="submit" class="btn-primary btn-block">Save Remittance Record</button>
    </form>
  </div>
  <div class="card">
    <h2>Past Remittances</h2>
    ${recent.length? recent.map(r=>{
      const diff = r.actualRemitted - r.expectedCash;
      return `
      <div class="ledger-row" style="align-items:flex-start;">
        <div>
          <strong>${r.periodStart} → ${r.periodEnd}</strong>
          <div class="meta" style="font-size:11.5px;color:var(--ink-soft);">Expected ${peso(r.expectedCash)} · Remitted ${peso(r.actualRemitted)}${r.remarks?' · '+esc(r.remarks):''}</div>
        </div>
        <span class="pill ${Math.abs(diff)<1?'ok':'low'}" style="white-space:nowrap;">${diff===0?'Exact match':(diff>0?'+':'')+peso(diff)}</span>
      </div>`;
    }).join('') : `<div class="empty"><span class="big">📥</span>No remittances recorded yet.</div>`}
  </div>
  `;
}


function bindLogEvents(){
  document.getElementById('logSeg')?.addEventListener('click', e=>{
    const b = e.target.closest('button[data-seg]');
    if(!b) return;
    state._logSeg = b.dataset.seg;
    render();
  });

  bindDateRangeControl('tx', '_txRange', '_txCustomFrom', '_txCustomTo');
  document.getElementById('txSearch')?.addEventListener('input', e=>{
    state._txSearch = e.target.value;
    render();
    const el = document.getElementById('txSearch');
    el.focus(); el.setSelectionRange(el.value.length, el.value.length);
  });
  document.getElementById('exportTxExcelBtn')?.addEventListener('click', ()=>{
    const range = state._txRange || '7';
    const cutoff = getDateCutoff(range, state._txCustomFrom, state._txCustomTo);
    const q = (state._txSearch||'').toLowerCase();
    const rows = state.sales
      .filter(s=> inDateRange(s.ts, cutoff))
      .filter(s=> !q || s.name.toLowerCase().includes(q))
      .sort((a,b)=>b.ts.localeCompare(a.ts))
      .map(s=>({
        Date: new Date(s.ts).toLocaleString('en-PH'),
        Item: s.name,
        Qty: s.qty,
        'Unit Price': s.price,
        Total: s.total,
        Payment: s.payment || 'Cash',
      }));
    exportRowsToExcel(rows, `transactions-${todayStr()}`, 'Transactions');
  });

  document.querySelectorAll('[data-saleedit]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const sale = state.sales.find(s=>s.id===btn.dataset.saleedit);
      if(!sale) return;
      openSaleEditModal(sale);
    });
  });
  document.querySelectorAll('[data-saledel]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const sale = state.sales.find(s=>s.id===btn.dataset.saledel);
      if(!sale) return;
      let warnExtra = sale.payment==='Utang' ? ' Note: this was paid via Utang — the customer\'s balance will NOT auto-adjust; fix that separately in Log → Utang if needed.' : '';
      if(!confirm(`Delete this transaction — ${sale.name} ×${sale.qty}, ${peso(sale.total)}? Stock will be restored automatically.${warnExtra}`)) return;

      if(sale.isVoucher && sale.voucherCode){
        const code = state.voucherCodes.find(c=>c.code===sale.voucherCode);
        if(code){
          code.status = 'unused';
          code.soldTs = '';
          await storageSet('voucher-codes', state.voucherCodes);
        }
      } else {
        const item = state.inventory.find(i=>i.id===sale.itemId);
        if(item){
          const oldQty = item.qty;
          item.qty += sale.qty;
          await storageSet('inventory', state.inventory);
          await logStockAdjustment(item, oldQty, item.qty, `Sale deleted: ${sale.name} ×${sale.qty} — stock restored`);
        }
      }
      state.sales = state.sales.filter(s=>s.id!==sale.id);
      await storageSet('sales', state.sales);
      showToast('🗑️ Transaction deleted, stock restored');
      render();
    });
  });

  document.getElementById('addUtangCustForm')?.addEventListener('submit', async e=>{
    e.preventDefault();
    const f = new FormData(e.target);
    const name = f.get('name').trim();
    if(!name) return;
    state.utang.push({id:uid(), name, contact:(f.get('contact')||'').trim(), balance:0, history:[]});
    await storageSet('utang', state.utang);
    showToast('✅ Customer added');
    render();
  });
  document.querySelectorAll('[data-utangedit]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const cust = state.utang.find(c=>c.id===btn.dataset.utangedit);
      if(!cust) return;
      openUtangEditModal(cust);
    });
  });
  document.querySelectorAll('[data-utanghistory]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.utanghistory;
      state._expandedUtangCust = state._expandedUtangCust===id ? '' : id;
      render();
    });
  });
  document.querySelectorAll('[data-utanghistdel]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const [custId, histId] = btn.dataset.utanghistdel.split('|');
      const cust = state.utang.find(c=>c.id===custId);
      if(!cust) return;
      const entry = cust.history.find(h=>h.id===histId);
      if(!entry) return;
      if(!confirm(`Remove this ${entry.type==='charge'?'borrow':'payment'} entry of ${peso(entry.amount)}? This will also adjust their balance back.`)) return;
      cust.balance += entry.type==='charge' ? -entry.amount : entry.amount;
      cust.balance = Math.max(0, cust.balance);
      cust.history = cust.history.filter(h=>h.id!==histId);
      await storageSet('utang', state.utang);
      showToast('🗑️ Entry removed, balance adjusted');
      render();
    });
  });
  document.querySelectorAll('[data-utangdel]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const cust = state.utang.find(c=>c.id===btn.dataset.utangdel);
      if(!cust) return;
      const msg = cust.balance>0
        ? `${cust.name} still owes ${peso(cust.balance)}. Remove them anyway? This deletes their record entirely.`
        : `Remove "${cust.name}" from your customer list?`;
      if(!confirm(msg)) return;
      state.utang = state.utang.filter(c=>c.id!==cust.id);
      await storageSet('utang', state.utang);
      showToast('🗑️ Customer removed');
      render();
    });
  });
  document.querySelectorAll('[data-utangborrow]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const cust = state.utang.find(c=>c.id===btn.dataset.utangborrow);
      if(!cust) return;
      const amt = parseFloat(prompt(`How much did ${cust.name} borrow?`, '0'));
      if(!amt || amt<=0) return;
      cust.balance += amt;
      cust.history.push({id:uid(), type:'charge', amount:amt, remarks:'Cash borrowed', date:new Date().toISOString(), addedBy:state.role});
      await storageSet('utang', state.utang);
      showToast('✅ Recorded');
      render();
    });
  });
  document.querySelectorAll('[data-utangpay]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const cust = state.utang.find(c=>c.id===btn.dataset.utangpay);
      if(!cust) return;
      const amt = parseFloat(prompt(`Payment amount from ${cust.name}?`, cust.balance));
      if(!amt || amt<=0) return;
      cust.balance = Math.max(0, cust.balance - amt);
      cust.history.push({id:uid(), type:'payment', amount:amt, remarks:'Payment received', date:new Date().toISOString(), addedBy:state.role});
      await storageSet('utang', state.utang);
      showToast('✅ Payment recorded');
      render();
    });
  });

  document.getElementById('expenseReceiptBtn')?.addEventListener('click', ()=>{
    document.getElementById('expenseReceiptFile').click();
  });
  document.getElementById('expenseReceiptFile')?.addEventListener('change', e=>{
    const file = e.target.files[0];
    if(!file) return;
    document.getElementById('expenseReceiptLabel').textContent = file.name;
    const preview = document.getElementById('expenseReceiptPreview');
    const reader = new FileReader();
    reader.onload = ()=>{ preview.src = reader.result; preview.style.display=''; };
    reader.readAsDataURL(file);
  });
  document.getElementById('addExpenseForm')?.addEventListener('submit', async e=>{
    e.preventDefault();
    const f = new FormData(e.target);
    const amount = parseFloat(f.get('amount'))||0;
    if(amount<=0) return;
    const expenseId = uid();
    const fileInput = document.getElementById('expenseReceiptFile');
    const receiptFile = fileInput && fileInput.files[0];
    const expense = {
      id: expenseId, date:new Date().toISOString(), category:f.get('category'),
      amount, remarks:(f.get('remarks')||'').trim(), addedBy:state.role,
      hasReceipt: !!receiptFile,
    };
    state.expenses.push(expense);
    const saves = [storageSet('expenses', state.expenses)];
    if(receiptFile){
      const dataUrl = await fileToCompressedDataUrl(receiptFile, 900, 0.65);
      saves.push(storageSet('expense-receipt:'+expenseId, {image: dataUrl}));
    }
    await Promise.all(saves);
    showToast('✅ Expense logged' + (receiptFile? ' with receipt photo' : ''));
    render();
  });
  document.querySelectorAll('[data-viewexpensereceipt]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const rec = await storageGet('expense-receipt:'+btn.dataset.viewexpensereceipt, null);
      if(!rec){ showToast('Receipt photo not found'); return; }
      const root = document.getElementById('modalRoot');
      root.innerHTML = `
      <div class="modal-bg" id="expReceiptBg">
        <div class="modal">
          <div class="modal-head"><h3>Receipt Photo</h3><button class="icon-btn" id="expReceiptClose">${ICONS.close}</button></div>
          <img src="${rec.image}" style="max-width:100%;border-radius:10px;border:1px solid var(--line);">
        </div>
      </div>`;
      document.getElementById('expReceiptClose').onclick=()=>{root.innerHTML='';};
      document.getElementById('expReceiptBg').addEventListener('click', e=>{ if(e.target.id==='expReceiptBg') root.innerHTML=''; });
    });
  });

  document.getElementById('gcashAmount')?.addEventListener('input', e=>{
    const feeField = document.getElementById('gcashFee');
    if(feeField && !feeField.dataset.touched) feeField.value = gcashSuggestedFee(e.target.value);
  });
  document.getElementById('gcashFee')?.addEventListener('input', e=>{ e.target.dataset.touched = '1'; });

  function updateGcashFeeModeHelp(){
    const type = document.getElementById('gcashTypeInput')?.value;
    const mode = document.getElementById('gcashFeeModeInput')?.value;
    const help = document.getElementById('gcashFeeModeHelp');
    if(!help) return;
    if(type==='cash-in'){
      help.textContent = mode==='add'
        ? 'Customer hands you cash = amount + fee. You send exactly "amount" to their GCash.'
        : 'Customer hands you exactly "amount" in cash. You send "amount − fee" to their GCash.';
    } else {
      help.textContent = mode==='add'
        ? 'Customer sends you "amount + fee" in GCash. You hand them exactly "amount" in cash.'
        : 'Customer sends you exactly "amount" in GCash. You hand them "amount − fee" in cash.';
    }
  }
  updateGcashFeeModeHelp();

  document.getElementById('gcashTypeSeg')?.addEventListener('click', e=>{
    const b = e.target.closest('button[data-gtype]');
    if(!b) return;
    document.querySelectorAll('#gcashTypeSeg button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    document.getElementById('gcashTypeInput').value = b.dataset.gtype;
    updateGcashFeeModeHelp();
  });
  document.getElementById('gcashFeeModeSeg')?.addEventListener('click', e=>{
    const b = e.target.closest('button[data-fmode]');
    if(!b) return;
    document.querySelectorAll('#gcashFeeModeSeg button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    document.getElementById('gcashFeeModeInput').value = b.dataset.fmode;
    updateGcashFeeModeHelp();
  });
  document.getElementById('gcashForm')?.addEventListener('submit', async e=>{
    e.preventDefault();
    const f = new FormData(e.target);
    const amount = parseFloat(f.get('amount'))||0;
    if(amount<=0) return;
    state.gcash.push({
      id:uid(), date:new Date().toISOString(), type:f.get('type'), amount,
      fee:parseFloat(f.get('fee'))||0, feeMode: f.get('feeMode')||'add',
      remarks:(f.get('remarks')||'').trim(), addedBy:state.role,
    });
    await storageSet('gcash', state.gcash);
    showToast('✅ Transaction saved');
    render();
  });
  document.getElementById('gcashFloatStart')?.addEventListener('change', async e=>{
    state.config.gcashFloatStart = parseFloat(e.target.value)||0;
    await storageSet('store-config', state.config);
    showToast('✅ Wallet starting balance updated');
    render();
  });
  document.getElementById('cashOnHandStart')?.addEventListener('change', async e=>{
    state.config.cashOnHandStart = parseFloat(e.target.value)||0;
    await storageSet('store-config', state.config);
    showToast('✅ Cash on Hand starting balance updated');
    render();
  });
  document.getElementById('exportGcashExcelBtn')?.addEventListener('click', ()=>{
    const rows = [...state.gcash].sort((a,b)=>b.date.localeCompare(a.date)).map(g=>({
      Date: new Date(g.date).toLocaleString('en-PH'),
      Type: g.type==='cash-in' ? 'Cash In' : 'Cash Out',
      Amount: g.amount,
      Fee: g.fee||0,
      'Fee Handling': g.feeMode==='deduct' ? 'Deducted from transfer' : 'Customer paid separately',
      Remarks: g.remarks||'',
      'Recorded By': g.addedBy||'',
    }));
    exportRowsToExcel(rows, `gcash-transactions-${todayStr()}`, 'GCash');
  });

  // ---- Load ----
  document.getElementById('eloadTypeSeg')?.addEventListener('click', e=>{
    const b = e.target.closest('button[data-ltype]');
    if(!b) return;
    document.querySelectorAll('#eloadTypeSeg button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    document.getElementById('eloadTypeInput').value = b.dataset.ltype;
  });
  document.getElementById('eloadForm')?.addEventListener('submit', async e=>{
    e.preventDefault();
    const f = new FormData(e.target);
    const amount = parseFloat(f.get('amount'))||0;
    if(amount<=0) return;
    state.eload.push({
      id:uid(), date:new Date().toISOString(), provider:f.get('provider'),
      loadType:f.get('loadType')||'Regular', amount, fee:parseFloat(f.get('fee'))||0,
      remarks:(f.get('remarks')||'').trim(), addedBy:state.role,
    });
    await storageSet('eload', state.eload);
    showToast('✅ Load transaction saved');
    render();
  });
  document.getElementById('eloadBalanceStart')?.addEventListener('change', async e=>{
    state.config.eloadBalanceStart = parseFloat(e.target.value)||0;
    await storageSet('store-config', state.config);
    showToast('✅ Load balance updated');
    render();
  });
  document.getElementById('exportLoadExcelBtn')?.addEventListener('click', ()=>{
    const rows = [...state.eload].sort((a,b)=>b.date.localeCompare(a.date)).map(l=>({
      Date: new Date(l.date).toLocaleString('en-PH'),
      Network: l.provider, 'Load Type': l.loadType, Amount: l.amount, Fee: l.fee||0,
      Remarks: l.remarks||'', 'Recorded By': l.addedBy||'',
    }));
    exportRowsToExcel(rows, `load-transactions-${todayStr()}`, 'Load');
  });

  // ---- Remittance (owner only, but bindings are harmless no-ops if elements aren't rendered) ----
  document.getElementById('remitRecalcBtn')?.addEventListener('click', ()=>{
    state._remitStart = document.getElementById('remitStart').value || state._remitStart;
    state._remitEnd = document.getElementById('remitEnd').value || state._remitEnd;
    render();
  });
  document.getElementById('remittanceForm')?.addEventListener('submit', async e=>{
    e.preventDefault();
    const f = new FormData(e.target);
    const actualRemitted = parseFloat(f.get('actualRemitted'));
    if(isNaN(actualRemitted)) return;
    const expectedCash = parseFloat(document.getElementById('remitExpectedInput').value)||0;
    const periodStart = document.getElementById('remitStart').value;
    const periodEnd = document.getElementById('remitEnd').value;
    state.remittances.push({
      id:uid(), periodStart, periodEnd, expectedCash, actualRemitted,
      remarks:(f.get('remarks')||'').trim(), recordedBy:state.role, date:new Date().toISOString(),
    });
    await storageSet('remittances', state.remittances);
    showToast('✅ Remittance recorded');
    render();
  });
}

/* ---------------- Receipts / OCR ---------------- */
let ocrWorking = false;
function viewReceipts(){
  const recent = [...state.receiptsIndex].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,15);
  return `
  <div class="card" style="padding:0;overflow:hidden;">
    <div style="padding:16px 16px 6px;">
      <h2 style="margin-bottom:4px;">Scan Supplier Resibo</h2>
      <p style="font-size:12.5px;color:var(--ink-soft);margin:0 0 12px;">Take a photo of a supplier receipt — we'll try to read item names and prices automatically so you can add them to stock in one go.</p>
    </div>
    <div style="padding:0 16px 16px;">
      <div class="receipt-drop" id="dropZone">
        ${ICONS.camera}
        <div style="margin-top:6px;font-weight:700;color:var(--ink)">Tap to take a photo or upload</div>
        <div style="font-size:12px;margin-top:2px;">JPG / PNG</div>
        <input type="file" id="receiptFile" accept="image/*" capture="environment" style="display:none">
      </div>
    </div>
  </div>
  <div class="torn"></div>
  <div class="card">
    <h2>Past Receipts</h2>
    ${recent.length? recent.map(r=>`
      <div class="ledger-row" data-receipt="${r.id}" style="cursor:pointer">
        <div><strong>${esc(r.supplier||'Receipt')}</strong>
          <div class="meta" style="font-size:12px;color:var(--ink-soft)">${new Date(r.date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})} · ${r.itemCount} item(s)</div>
        </div>
        <div class="mono" style="font-weight:800">${peso(r.total)}</div>
      </div>`).join('') : `<div class="empty"><span class="big">🧾</span>No receipts scanned yet.</div>`}
  </div>
  `;
}

function openReceiptModal(){
  const root = document.getElementById('modalRoot');
  root.innerHTML = `
  <div class="modal-bg" id="receiptModalBg">
    <div class="modal">
      <div class="modal-head">
        <h3>Add Stock from Receipt</h3>
        <button class="icon-btn" id="closeReceiptModal">${ICONS.close}</button>
      </div>
      <div id="receiptModalBody">
        <div style="text-align:center;padding:20px 0;">
          <img id="receiptPreview" style="max-width:100%;max-height:220px;border-radius:10px;border:1px solid var(--line);">
        </div>
        <div class="progress-wrap"><div class="progress-bar" id="ocrProgress"></div></div>
        <div id="ocrStatus" style="font-size:12.5px;color:var(--ink-soft);text-align:center;">Reading receipt…</div>
      </div>
    </div>
  </div>`;
  document.getElementById('closeReceiptModal').onclick = ()=>{ root.innerHTML=''; };
  document.getElementById('receiptModalBg').addEventListener('click', e=>{ if(e.target.id==='receiptModalBg') root.innerHTML=''; });
}

function parseReceiptText(text){
  const lines = text.split('\n').map(l=>l.trim()).filter(Boolean);
  const skip = /(total|subtotal|vat|cash|change|thank|invoice|receipt|date|qty|amount due|tender|tin|address)/i;
  const priceRe = /([₱P]?\s?\d{1,5}[.,]\d{2}|\d{2,5})\s*$/;
  const rows = [];
  for(const line of lines){
    if(skip.test(line)) continue;
    const m = line.match(priceRe);
    if(!m) continue;
    let priceStr = m[1].replace(/[₱P\s]/g,'').replace(',','.');
    let price = parseFloat(priceStr);
    if(isNaN(price) || price<=0 || price>100000) continue;
    let name = line.slice(0, m.index).trim().replace(/[-–—.:\s]+$/,'');
    if(name.length<2) continue;
    // strip a leading qty like "2x" or "2 "
    let qty = 1;
    const qm = name.match(/^(\d{1,3})\s*[xX]?\s+/);
    if(qm){ qty = parseInt(qm[1]); name = name.slice(qm[0].length).trim(); }
    if(name.length<2) continue;
    rows.push({name: titleCase(name), qty, price});
  }
  return rows.slice(0,40);
}
function titleCase(s){
  return s.toLowerCase().replace(/\b\w/g, c=>c.toUpperCase());
}

function renderParsedRows(rows){
  return `
  <div style="max-height:340px;overflow-y:auto;margin:10px 0;">
    <div class="parse-row" style="font-weight:700;font-size:11.5px;color:var(--ink-soft);">
      <span></span><span>ITEM</span><span>QTY</span><span>COST ₱</span>
    </div>
    ${rows.map((r,idx)=>`
      <div class="parse-row" data-idx="${idx}">
        <input type="checkbox" checked class="rowInclude">
        <input type="text" class="rowName" value="${esc(r.name)}">
        <input type="number" class="rowQty" value="${r.qty}" min="1">
        <input type="number" class="rowPrice" value="${r.price}" step="0.01">
      </div>`).join('')}
  </div>
  <div class="field"><label>Supplier / Note</label><input id="receiptSupplier" placeholder="e.g. Almar Trading"></div>
  <button id="saveReceiptBtn" class="btn-primary btn-block">➕ Add these to Stock</button>
  <button id="addManualRow" class="btn-secondary btn-block" style="margin-top:8px">+ Add row manually</button>
  `;
}

async function handleReceiptFile(file){
  if(!file) return;
  openReceiptModal();
  const dataUrl = await fileToCompressedDataUrl(file, 900, 0.65);
  document.getElementById('receiptPreview').src = dataUrl;

  let rows = [];
  let rawText = '';
  try{
    if(typeof Tesseract === 'undefined') throw new Error('OCR engine unavailable');
    const result = await Tesseract.recognize(dataUrl, 'eng', {
      logger: m=>{
        if(m.status && m.progress!=null){
          const bar = document.getElementById('ocrProgress');
          const st = document.getElementById('ocrStatus');
          if(bar) bar.style.width = Math.round(m.progress*100)+'%';
          if(st) st.textContent = m.status + '…';
        }
      }
    });
    rawText = result.data.text || '';
    rows = parseReceiptText(rawText);
  }catch(e){
    console.warn('OCR failed', e);
  }

  const body = document.getElementById('receiptModalBody');
  if(!body) return; // modal closed already
  if(rows.length===0){
    body.innerHTML += `
      <div style="text-align:center;font-size:12.5px;color:var(--ink-soft);margin:10px 0;">
        ${rawText? "Couldn't confidently detect item lines — add them manually below." : "Text recognition wasn't able to run in this browser — add items manually below."}
      </div>
      ${renderParsedRows([{name:'', qty:1, price:0}])}
    `;
  } else {
    body.querySelector('.progress-wrap')?.remove();
    body.querySelector('#ocrStatus')?.remove();
    body.insertAdjacentHTML('beforeend', renderParsedRows(rows));
  }
  bindReceiptModalEvents(dataUrl, rawText);
}

function fileToCompressedDataUrl(file, maxW, quality){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = ()=>{
      const img = new Image();
      img.onload = ()=>{
        const scale = Math.min(1, maxW/img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width*scale;
        canvas.height = img.height*scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function bindReceiptModalEvents(imageDataUrl, rawText){
  const body = document.getElementById('receiptModalBody');
  body.querySelector('#addManualRow')?.addEventListener('click', ()=>{
    const container = body.querySelector('div[style*="overflow-y"]');
    const idx = container.querySelectorAll('.parse-row[data-idx]').length;
    container.insertAdjacentHTML('beforeend', `
      <div class="parse-row" data-idx="${idx}">
        <input type="checkbox" checked class="rowInclude">
        <input type="text" class="rowName" placeholder="Item name">
        <input type="number" class="rowQty" value="1" min="1">
        <input type="number" class="rowPrice" value="0" step="0.01">
      </div>`);
  });

  body.querySelector('#saveReceiptBtn')?.addEventListener('click', async ()=>{
    const rowsEls = [...body.querySelectorAll('.parse-row[data-idx]')];
    const toAdd = rowsEls.map(el=>({
      include: el.querySelector('.rowInclude').checked,
      name: el.querySelector('.rowName').value.trim(),
      qty: parseInt(el.querySelector('.rowQty').value)||0,
      price: parseFloat(el.querySelector('.rowPrice').value)||0,
    })).filter(r=>r.include && r.name && r.qty>0);

    if(toAdd.length===0){ showToast('No rows selected'); return; }

    let addedCount=0, totalCost=0;
    for(const row of toAdd){
      totalCost += row.qty*row.price;
      const existing = state.inventory.find(i=>i.name.toLowerCase()===row.name.toLowerCase());
      if(existing){
        existing.qty += row.qty;
        existing.cost = row.price; // update to latest supplier cost
      } else {
        state.inventory.push({
          id: uid(), name: row.name, category:'', unit:'pc',
          cost: row.price, price: Math.round(row.price*1.25*100)/100,
          qty: row.qty, reorder: 5,
        });
      }
      addedCount++;
    }
    await storageSet('inventory', state.inventory);

    const receiptId = uid();
    const supplier = body.querySelector('#receiptSupplier')?.value.trim() || '';
    const receiptRecord = {
      id: receiptId, date: new Date().toISOString(), supplier,
      image: imageDataUrl, rawText, items: toAdd, total: totalCost,
    };
    await storageSet('receipt:'+receiptId, receiptRecord);
    state.receiptsIndex.push({id:receiptId, date:receiptRecord.date, supplier, total:totalCost, itemCount:toAdd.length});
    await storageSet('receipts-index', state.receiptsIndex);

    document.getElementById('modalRoot').innerHTML='';
    showToast(`✅ ${addedCount} item(s) added to stock`);
    render();
  });
}

async function openPastReceipt(id){
  const rec = await storageGet('receipt:'+id, null);
  if(!rec){ showToast('Receipt not found'); return; }
  const root = document.getElementById('modalRoot');
  root.innerHTML = `
  <div class="modal-bg" id="pastReceiptBg">
    <div class="modal">
      <div class="modal-head">
        <h3>${esc(rec.supplier||'Receipt')}</h3>
        <button class="icon-btn" id="closePastReceipt">${ICONS.close}</button>
      </div>
      <img src="${rec.image}" style="max-width:100%;border-radius:10px;border:1px solid var(--line);margin-bottom:10px;">
      <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:8px;">${new Date(rec.date).toLocaleString('en-PH')}</div>
      ${rec.items.map(i=>`<div class="ledger-row"><span>${esc(i.name)} ×${i.qty}</span><span class="mono">${peso(i.price*i.qty)}</span></div>`).join('')}
      <div class="ledger-row" style="font-weight:800;border-top:1px solid var(--line);margin-top:6px;"><span>Total</span><span class="mono">${peso(rec.total)}</span></div>
    </div>
  </div>`;
  document.getElementById('closePastReceipt').onclick=()=>{root.innerHTML='';};
  document.getElementById('pastReceiptBg').addEventListener('click', e=>{ if(e.target.id==='pastReceiptBg') root.innerHTML=''; });
}

/* ---------------- Reports ---------------- */
function viewReports(){
  const range = state._reportRange || '7';
  const cutoff = getDateCutoff(range, state._reportCustomFrom, state._reportCustomTo);
  const filtered = state.sales.filter(s=> inDateRange(s.ts, cutoff));
  const revenue = filtered.reduce((a,s)=>a+s.total,0);
  const cost = filtered.reduce((a,s)=>a+s.cost*s.qty,0);
  const itemProfit = revenue-cost;

  const gcashFiltered = state.gcash.filter(g=> inDateRange(g.date, cutoff));
  const gcashFees = gcashFiltered.reduce((a,g)=>a+(g.fee||0),0);

  const expFiltered = state.expenses.filter(e=> inDateRange(e.date, cutoff));
  const expTotal = expFiltered.reduce((a,e)=>a+e.amount,0);

  const netProfit = itemProfit + gcashFees - expTotal;

  const voucherSales = filtered.filter(s=>s.isVoucher);
  const voucherRevenue = voucherSales.reduce((a,s)=>a+s.total,0);

  const byItem = {};
  filtered.forEach(s=>{
    byItem[s.name] = byItem[s.name] || {qty:0, revenue:0};
    byItem[s.name].qty += s.qty;
    byItem[s.name].revenue += s.total;
  });
  const top = Object.entries(byItem).sort((a,b)=>b[1].revenue-a[1].revenue).slice(0,6);
  const maxRev = top.length? top[0][1].revenue : 1;

  const utangTotal = state.utang.reduce((a,c)=>a+c.balance,0);

  return `
  <div class="card">
    <h2>Reports — ${esc(dateRangeLabel(range, state._reportCustomFrom, state._reportCustomTo))}</h2>
    ${dateRangeControlHtml('report', range, state._reportCustomFrom, state._reportCustomTo, false)}
    <div class="stat-row" style="margin-top:14px;">
      <div class="stat" style="--accent:var(--green)"><div class="label">Revenue</div><div class="value mono">${peso(revenue)}</div></div>
      <div class="stat" style="--accent:var(--yellow)"><div class="label">Cost of Goods</div><div class="value mono">${peso(cost)}</div></div>
      <div class="stat" style="--accent:var(--red)"><div class="label">Item Profit</div><div class="value mono">${peso(itemProfit)}</div></div>
    </div>
    <div class="stat-row" style="margin-top:10px;">
      <div class="stat" style="--accent:var(--green)"><div class="label">GCash fees</div><div class="value mono">${peso(gcashFees)}</div></div>
      <div class="stat" style="--accent:var(--red)"><div class="label">Expenses</div><div class="value mono">${peso(expTotal)}</div></div>
      <div class="stat" style="--accent:var(--yellow)"><div class="label">Net Profit</div><div class="value mono" style="color:${netProfit<0?'var(--red)':'inherit'}">${peso(netProfit)}</div></div>
    </div>
    <div class="stat-row" style="margin-top:10px;">
      <div class="stat"><div class="label">WiFi voucher revenue</div><div class="value mono">${peso(voucherRevenue)}</div></div>
      <div class="stat"><div class="label">Utang outstanding (all-time)</div><div class="value mono">${peso(utangTotal)}</div></div>
    </div>
  </div>

  <div class="card">
    <h2>Top Sellers</h2>
    ${top.length? top.map(([name,d])=>`
      <div class="bar-row">
        <div class="bar-label"><span>${esc(name)} <span style="color:var(--ink-soft)">×${d.qty}</span></span><span class="mono">${peso(d.revenue)}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.max(4,d.revenue/maxRev*100)}%"></div></div>
      </div>`).join('') : `<div class="empty">No sales in this range yet.</div>`}
  </div>

  ${viewMoversSection(filtered)}

  <div class="card">
    <h2>Backup & Export</h2>
    <p style="font-size:12.5px;color:var(--ink-soft);margin-top:0;">Download your store data as an Excel workbook (one sheet per record type) or a raw JSON backup.</p>
    <button id="exportExcelBtn" class="btn-primary btn-block" style="margin-bottom:8px;">📊 Export Full Report (Excel)</button>
    <button id="exportBtn" class="btn-secondary btn-block">⬇ Export Backup (JSON)</button>
  </div>
  `;
}

function viewMoversSection(periodSales){
  const moversCat = state._moversCategory || 'All';
  const soldByItemId = {};
  periodSales.forEach(s=>{
    if(!s.isVoucher && s.itemId) soldByItemId[s.itemId] = (soldByItemId[s.itemId]||0) + s.qty;
  });
  const scoped = state.inventory
    .filter(i=> moversCat==='All' || (i.category||'Others')===moversCat)
    .map(i=> ({...i, soldQty: soldByItemId[i.id]||0}));
  const ranked = [...scoped].sort((a,b)=>b.soldQty-a.soldQty);
  const fastMovers = ranked.filter(i=>i.soldQty>0).slice(0,5);
  const noSale = ranked.filter(i=>i.soldQty===0).sort((a,b)=>a.name.localeCompare(b.name));
  const maxSold = fastMovers.length? fastMovers[0].soldQty : 1;

  return `
  <div class="card">
    <h2>📊 Fast & Slow Movers</h2>
    <p style="font-size:12.5px;color:var(--ink-soft);margin-top:0;">Which items are actually selling in this date range, by your own categories — no separate setup needed.</p>
    ${categoryChipsHtml(moversCat, 'moverscat')}
  </div>
  <div class="card">
    <h2>🔥 Fast Movers</h2>
    ${fastMovers.length? fastMovers.map(i=>`
      <div class="bar-row">
        <div class="bar-label"><span>${esc(i.name)} <span style="color:var(--ink-soft)">${esc(i.category||'Others')}</span></span><span class="mono">×${i.soldQty}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.max(4,i.soldQty/maxSold*100)}%"></div></div>
      </div>`).join('') : `<div class="empty">No sales for this category in this range yet.</div>`}
  </div>
  <div class="card">
    <h2>🐌 Slow Movers — no sales in this range</h2>
    <p style="font-size:12.5px;color:var(--ink-soft);margin-top:0;">${noSale.length} item(s) in ${moversCat==='All'?'your inventory':'this category'} didn't sell at all in this date range — worth a look before reordering more.</p>
    ${noSale.length? `<div style="display:flex;flex-wrap:wrap;gap:6px;">
      ${noSale.slice(0,30).map(i=>`<span class="pill low" style="padding:5px 10px;">${esc(i.name)}</span>`).join('')}
      ${noSale.length>30? `<span class="meta" style="color:var(--ink-soft);align-self:center;">+${noSale.length-30} more</span>` : ''}
    </div>` : `<div class="empty">Everything in ${moversCat==='All'?'your inventory':'this category'} sold at least once — nice.</div>`}
  </div>
  `;
}

/* ---------------- Event binding per tab ---------------- */
function bindTabEvents(){
  document.getElementById('dismissSaveError')?.addEventListener('click', ()=>{
    state._saveError = '';
    render();
  });

  document.getElementById('dismissInstallHint')?.addEventListener('click', async ()=>{
    state.showInstallHint = false;
    await deviceSet('install-hint-dismissed', true);
    render();
  });

  document.getElementById('syncNowBtn')?.addEventListener('click', async ()=>{
    showToast('🔄 Syncing…');
    await backgroundSync();
  });
  if(state.tab==='dashboard'){
    bindDateRangeControl('dash', '_dashRange', '_dashCustomFrom', '_dashCustomTo');
  }

  if(state.tab==='inventory'){
    document.getElementById('incomingStockForm')?.addEventListener('submit', async e=>{
      e.preventDefault();
      const f = new FormData(e.target);
      const batchNote = (f.get('batchNote')||'').trim();
      const dateEl = document.getElementById('incomingStockDate');
      const customDate = (state.role==='owner' && dateEl && dateEl.value) ? new Date(dateEl.value).toISOString() : null;
      const raw = document.getElementById('incomingStockText').value;
      const lines = raw.split('\n').map(l=>l.trim()).filter(Boolean);
      let matched = 0, skipped = [];
      const reason = `Received from Manila${batchNote ? ' — '+batchNote : ''}`;
      for(const line of lines){
        const parts = line.split(',').map(p=>p.trim());
        if(parts.length<2){ skipped.push(line); continue; }
        const name = parts[0];
        const qty = parseInt(parts[1]);
        if(!name || isNaN(qty) || qty<=0){ skipped.push(line); continue; }
        const item = state.inventory.find(i=>i.name.toLowerCase()===name.toLowerCase());
        if(!item){ skipped.push(line); continue; }
        const oldQty = item.qty;
        item.qty += qty;
        await logStockAdjustment(item, oldQty, item.qty, reason, customDate);
        matched++;
      }
      if(matched>0) await storageSet('inventory', state.inventory);
      if(matched>0 && skipped.length===0) showToast(`✅ ${matched} item(s) restocked from Manila`);
      else if(matched>0) showToast(`✅ ${matched} restocked, ⚠️ ${skipped.length} skipped (not found in Stock List)`);
      else showToast(`⚠️ No items matched — check spelling against your Stock List`);
      e.target.reset();
      render();
    });

    document.getElementById('addItemForm').addEventListener('submit', async e=>{
      e.preventDefault();
      const f = new FormData(e.target);
      const item = {
        id: uid(),
        name: f.get('name').trim(),
        category: f.get('category') || state.categories[0] || 'Others',
        unit: f.get('unit').trim() || 'pc',
        cost: state.role==='owner' ? (parseFloat(f.get('cost'))||0) : 0,
        price: parseFloat(f.get('price'))||0,
        qty: parseInt(f.get('qty'))||0,
        reorder: parseInt(f.get('reorder'))||0,
        remarks: (f.get('remarks')||'').trim(),
      };
      if(!item.name) return;
      state.inventory.push(item);
      await storageSet('inventory', state.inventory);
      showToast('✅ Item added: '+item.name);
      e.target.reset();
      render();
    });

    document.getElementById('addCategoryForm')?.addEventListener('submit', async e=>{
      e.preventDefault();
      const f = new FormData(e.target);
      const name = (f.get('newCat')||'').trim();
      if(!name) return;
      if(state.categories.some(c=>c.toLowerCase()===name.toLowerCase())){ showToast('Category already exists'); return; }
      state.categories.push(name);
      await storageSet('categories', state.categories);
      e.target.reset();
      render();
    });
    document.querySelectorAll('[data-delcat]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const cat = btn.dataset.delcat;
        if(!confirm(`Remove category "${cat}"? Items keep their label but it won't be selectable anymore.`)) return;
        state.categories = state.categories.filter(c=>c!==cat);
        await storageSet('categories', state.categories);
        render();
      });
    });

    document.querySelectorAll('[data-invcat]').forEach(btn=>{
      btn.addEventListener('click', ()=>{ state._invCategory = btn.dataset.invcat; render(); });
    });

    document.getElementById('bulkImportText')?.addEventListener('input', e=>{
      state._bulkText = e.target.value;
      state._draftLoaded = true;
    });
    document.getElementById('bulkClearBtn')?.addEventListener('click', ()=>{
      state._bulkText = '';
      state._draftLoaded = true;
      render();
    });
    document.getElementById('bulkImportBtn')?.addEventListener('click', async ()=>{
      const raw = document.getElementById('bulkImportText').value;
      const {added, updated, skipped} = mergeBulkIntoInventory(raw, state.inventory);
      await storageSet('inventory', state.inventory);
      state._bulkText = '';
      state._draftLoaded = true;
      showToast(`✅ Imported: ${added} new, ${updated} updated${skipped?`, ${skipped} skipped`:''}`);
      render();
    });

    document.getElementById('invSearch').addEventListener('input', e=>{
      state._invSearch = e.target.value;
      render();
      document.getElementById('invSearch').focus();
      const v = document.getElementById('invSearch').value;
      document.getElementById('invSearch').setSelectionRange(v.length,v.length);
    });

    document.querySelectorAll('.quickCost').forEach(inp=>{
      inp.addEventListener('change', async ()=>{
        const item = state.inventory.find(i=>i.id===inp.dataset.id);
        if(!item) return;
        item.cost = parseFloat(inp.value)||0;
        await storageSet('inventory', state.inventory);
        showToast('✅ Cost updated');
      });
    });
    document.querySelectorAll('.quickPrice').forEach(inp=>{
      inp.addEventListener('change', async ()=>{
        const item = state.inventory.find(i=>i.id===inp.dataset.id);
        if(!item) return;
        item.price = parseFloat(inp.value)||0;
        await storageSet('inventory', state.inventory);
        showToast('✅ Price updated');
      });
    });

    document.querySelectorAll('.item-row').forEach(row=>{
      const id = row.dataset.id;
      const item = state.inventory.find(i=>i.id===id);
      row.querySelector('[data-act="inc"]').addEventListener('click', async ()=>{
        const oldQty = item.qty;
        item.qty++;
        await storageSet('inventory', state.inventory);
        await logStockAdjustment(item, oldQty, item.qty, 'Quick +1');
        render();
      });
      row.querySelector('[data-act="dec"]').addEventListener('click', async ()=>{
        const oldQty = item.qty;
        item.qty = Math.max(0,item.qty-1);
        await storageSet('inventory', state.inventory);
        await logStockAdjustment(item, oldQty, item.qty, 'Quick -1');
        render();
      });
      row.querySelector('[data-act="qtyedit"]').addEventListener('click', ()=> quickEditItemTotal(item, 'Stocks'));
      row.querySelector('[data-act="del"]').addEventListener('click', async ()=>{
        if(!confirm(`Remove "${item.name}" from inventory?`)) return;
        state.inventory = state.inventory.filter(i=>i.id!==id);
        await storageSet('inventory', state.inventory);
        showToast('🗑️ Item removed');
        render();
      });
      row.querySelector('[data-act="edit"]').addEventListener('click', ()=> openEditModal(item));
    });

    document.getElementById('invSelectAll')?.addEventListener('change', e=>{
      const visibleIds = [...document.querySelectorAll('.invSelectItem')].map(cb=>cb.dataset.id);
      if(e.target.checked) visibleIds.forEach(id=>state._invSelected.add(id));
      else visibleIds.forEach(id=>state._invSelected.delete(id));
      render();
    });
    document.querySelectorAll('.invSelectItem').forEach(cb=>{
      cb.addEventListener('change', e=>{
        if(e.target.checked) state._invSelected.add(cb.dataset.id);
        else state._invSelected.delete(cb.dataset.id);
        render();
      });
    });
    document.getElementById('bulkCatApplyBtn')?.addEventListener('click', async ()=>{
      const cat = document.getElementById('bulkCatAssign').value;
      const ids = state._invSelected;
      state.inventory.forEach(i=>{ if(ids.has(i.id)) i.category = cat; });
      await storageSet('inventory', state.inventory);
      showToast(`✅ Set category for ${ids.size} item(s)`);
      state._invSelected = new Set();
      render();
    });
    document.getElementById('bulkDeleteBtn')?.addEventListener('click', async ()=>{
      const ids = state._invSelected;
      if(!confirm(`Delete ${ids.size} selected item(s)? This can't be undone.`)) return;
      state.inventory = state.inventory.filter(i=>!ids.has(i.id));
      await storageSet('inventory', state.inventory);
      showToast(`🗑️ Deleted ${ids.size} item(s)`);
      state._invSelected = new Set();
      render();
    });
  }

  if(state.tab==='sell'){
    document.getElementById('sellSearch').addEventListener('input', e=>{
      state._sellSearch = e.target.value;
      render();
      const el=document.getElementById('sellSearch');
      el.focus(); el.setSelectionRange(el.value.length,el.value.length);
    });
    document.querySelectorAll('[data-sellcat]').forEach(btn=>{
      btn.addEventListener('click', ()=>{ state._sellCategory = btn.dataset.sellcat; render(); });
    });
    document.querySelectorAll('.pos-item').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.dataset.id;
        const item = state.inventory.find(i=>i.id===id);
        if(!item || item.qty<=0) return;
        const line = state.cart.find(c=>c.itemId===id);
        const inCart = line? line.qty : 0;
        if(inCart>=item.qty){ showToast('No more stock for '+item.name); return; }
        if(line) line.qty++;
        else state.cart.push({itemId:id, name:item.name, price:item.price, cost:item.cost, qty:1});
        render();
      });
    });
    document.querySelectorAll('[data-qtyeditsell]').forEach(btn=>{
      btn.addEventListener('click', e=>{
        e.stopPropagation();
        const item = state.inventory.find(i=>i.id===btn.dataset.qtyeditsell);
        if(item) quickEditItemTotal(item, 'Bentahan');
      });
    });
    document.querySelectorAll('.cart-line').forEach(row=>{
      const id = row.dataset.id;
      const line = state.cart.find(c=>c.itemId===id);
      row.querySelector('[data-act="cinc"]')?.addEventListener('click', ()=>{
        const item = state.inventory.find(i=>i.id===id);
        if(line.qty < item.qty) line.qty++;
        else showToast('No more stock');
        render();
      });
      row.querySelector('[data-act="cdec"]')?.addEventListener('click', ()=>{
        line.qty--;
        if(line.qty<=0) state.cart = state.cart.filter(c=>c.itemId!==id);
        render();
      });
      row.querySelector('[data-act="cdel"]')?.addEventListener('click', ()=>{
        state.cart = state.cart.filter(c=>c.itemId!==id);
        render();
      });
    });

    document.getElementById('paySeg')?.addEventListener('click', e=>{
      const b = e.target.closest('button[data-pay]');
      if(!b) return;
      state.cartPayment.method = b.dataset.pay;
      render();
    });
    document.getElementById('cashTendered')?.addEventListener('input', e=>{
      state.cartPayment.tendered = e.target.value;
      const cartTotal = state.cart.reduce((a,c)=>a+c.price*c.qty,0);
      const change = (parseFloat(e.target.value)||0) - cartTotal;
      const changeField = e.target.closest('.grid2').querySelector('input[disabled]');
      if(changeField){
        changeField.value = peso(Math.max(0,change));
        changeField.style.color = change<0 ? 'var(--red)' : 'var(--green)';
      }
    });
    document.getElementById('utangCustomerSelect')?.addEventListener('change', e=>{
      if(e.target.value==='__new__'){
        const name = prompt('New customer name for Utang:');
        if(name && name.trim()){
          const cust = {id:uid(), name:name.trim(), contact:'', balance:0, history:[]};
          state.utang.push(cust);
          storageSet('utang', state.utang);
          state.cartPayment.utangCustomerId = cust.id;
        } else {
          state.cartPayment.utangCustomerId = '';
        }
      } else {
        state.cartPayment.utangCustomerId = e.target.value;
      }
      render();
    });

    document.getElementById('checkoutBtn')?.addEventListener('click', async ()=>{
      const pay = state.cartPayment || {method:'cash'};
      if(pay.method==='utang' && !pay.utangCustomerId){
        showToast('⚠️ Pick a customer for Utang first');
        return;
      }
      const backdateEl = document.getElementById('saleBackdate');
      const backdateVal = state.role==='owner' && backdateEl ? backdateEl.value : '';
      const ts = backdateVal ? new Date(backdateVal).toISOString() : new Date().toISOString();
      const cartTotal = state.cart.reduce((a,c)=>a+c.price*c.qty,0);
      const paymentLabel = pay.method==='cash' ? 'Cash' : pay.method==='gcash' ? 'GCash' : 'Utang';
      for(const line of state.cart){
        const item = state.inventory.find(i=>i.id===line.itemId);
        if(item) item.qty = Math.max(0, item.qty - line.qty);
        state.sales.push({
          id: uid(), itemId: line.itemId, name: line.name,
          qty: line.qty, price: line.price, cost: line.cost,
          total: line.price*line.qty, ts, payment: paymentLabel,
        });
      }
      const proms = [storageSet('inventory', state.inventory), storageSet('sales', state.sales)];
      if(pay.method==='utang'){
        const cust = state.utang.find(c=>c.id===pay.utangCustomerId);
        if(cust){
          cust.balance += cartTotal;
          cust.history.push({id:uid(), type:'charge', amount:cartTotal, remarks:'Sale on credit', date:ts, addedBy:state.role});
          proms.push(storageSet('utang', state.utang));
        }
      }
      await Promise.all(proms);
      state.cart = [];
      state.cartPayment = {method:'cash', tendered:'', utangCustomerId:''};
      showToast('✅ Sale recorded!');
      render();
    });
  }

  if(state.tab==='vouchers') bindVoucherEvents();
  if(state.tab==='log') bindLogEvents();

  if(state.tab==='receipts'){
    const dz = document.getElementById('dropZone');
    const fileInput = document.getElementById('receiptFile');
    dz.addEventListener('click', ()=>fileInput.click());
    fileInput.addEventListener('change', e=>{
      if(e.target.files[0]) handleReceiptFile(e.target.files[0]);
    });
    document.querySelectorAll('[data-receipt]').forEach(row=>{
      row.addEventListener('click', ()=>openPastReceipt(row.dataset.receipt));
    });
  }

  if(state.tab==='reports'){
    bindDateRangeControl('report', '_reportRange', '_reportCustomFrom', '_reportCustomTo');
    document.querySelectorAll('[data-moverscat]').forEach(btn=>{
      btn.addEventListener('click', ()=>{ state._moversCategory = btn.dataset.moverscat; render(); });
    });
    document.getElementById('exportBtn').addEventListener('click', exportBackup);
    document.getElementById('exportExcelBtn').addEventListener('click', exportFullReportExcel);
  }
}

/* ---------------- Edit item modal ---------------- */
/* ---------------- Edit utang customer modal ---------------- */
/* ---------------- Edit / delete sale (transaction) ---------------- */
function openSaleEditModal(sale){
  const root = document.getElementById('modalRoot');
  const isVoucher = !!sale.isVoucher;
  root.innerHTML = `
  <div class="modal-bg" id="saleEditBg">
    <div class="modal">
      <div class="modal-head"><h3>Edit Transaction</h3><button class="icon-btn" id="saleEditClose">${ICONS.close}</button></div>
      <p style="font-size:12.5px;color:var(--ink-soft);margin-top:0;">${esc(sale.name)} · ${new Date(sale.ts).toLocaleString('en-PH')}</p>
      <form id="saleEditForm">
        <div class="grid2">
          <div class="field"><label>Qty${isVoucher?' (locked — 1 code per voucher sale)':''}</label><input required name="qty" type="number" min="1" value="${sale.qty}" ${isVoucher?'disabled':''}></div>
          <div class="field"><label>Unit Price (₱)</label><input required name="price" type="number" step="0.01" value="${sale.price}"></div>
        </div>
        <div class="field"><label>Reason for correction</label><input name="reason" placeholder="e.g. Wrong quantity encoded, should be 2 not 5" required></div>
        ${sale.payment==='Utang'? `<p style="font-size:11.5px;color:var(--red);">⚠️ This sale was paid via Utang. Editing it here does NOT adjust the customer's balance — go to Log → Utang to correct that separately.</p>` : ''}
        <button type="submit" class="btn-primary btn-block">Save Correction</button>
      </form>
    </div>
  </div>`;
  document.getElementById('saleEditClose').onclick=()=>{root.innerHTML='';};
  document.getElementById('saleEditBg').addEventListener('click', e=>{ if(e.target.id==='saleEditBg') root.innerHTML=''; });
  document.getElementById('saleEditForm').addEventListener('submit', async e=>{
    e.preventDefault();
    const f = new FormData(e.target);
    const newQty = isVoucher ? sale.qty : (parseInt(f.get('qty'))||sale.qty);
    const newPrice = parseFloat(f.get('price'))||sale.price;
    const reason = f.get('reason').trim();
    const oldQty = sale.qty;

    // Reconcile stock for the quantity difference (regular items only — voucher qty is locked)
    if(!isVoucher && newQty !== oldQty){
      const item = state.inventory.find(i=>i.id===sale.itemId);
      if(item){
        const delta = newQty - oldQty; // more sold => less stock; less sold => more stock back
        const itemOldQty = item.qty;
        item.qty = Math.max(0, item.qty - delta);
        await storageSet('inventory', state.inventory);
        await logStockAdjustment(item, itemOldQty, item.qty, `Sale correction: ${sale.name} qty ${oldQty}→${newQty} (${reason})`);
      }
    }

    sale.qty = newQty;
    sale.price = newPrice;
    sale.total = newQty * newPrice;
    await storageSet('sales', state.sales);
    root.innerHTML='';
    showToast('✅ Transaction corrected');
    render();
  });
}

function openUtangEditModal(cust){
  const root = document.getElementById('modalRoot');
  root.innerHTML = `
  <div class="modal-bg" id="utangEditBg">
    <div class="modal">
      <div class="modal-head"><h3>Edit Customer</h3><button class="icon-btn" id="utangEditClose">${ICONS.close}</button></div>
      <form id="utangEditForm">
        <div class="field"><label>Customer name</label><input required name="name" value="${esc(cust.name)}"></div>
        <div class="field"><label>Contact (optional)</label><input name="contact" value="${esc(cust.contact||'')}" placeholder="phone number"></div>
        <div class="field"><label>Balance owed (₱)</label><input name="balance" type="number" step="0.01" value="${cust.balance}"></div>
        <p style="font-size:11.5px;color:var(--ink-soft);margin:0 0 10px;">Only adjust the balance directly for corrections — normal borrowing/payment should go through the + Borrow / Payment buttons so there's a record of it.</p>
        <button type="submit" class="btn-primary btn-block">Save Changes</button>
      </form>
    </div>
  </div>`;
  document.getElementById('utangEditClose').onclick=()=>{root.innerHTML='';};
  document.getElementById('utangEditBg').addEventListener('click', e=>{ if(e.target.id==='utangEditBg') root.innerHTML=''; });
  document.getElementById('utangEditForm').addEventListener('submit', async e=>{
    e.preventDefault();
    const f = new FormData(e.target);
    const newName = f.get('name').trim();
    if(!newName) return;
    const newBalance = parseFloat(f.get('balance'));
    if(newBalance !== cust.balance && !isNaN(newBalance)){
      cust.history.push({id:uid(), type: newBalance>cust.balance?'charge':'payment', amount: Math.abs(newBalance-cust.balance), remarks:'Manual correction', date:new Date().toISOString(), addedBy:state.role});
    }
    cust.name = newName;
    cust.contact = (f.get('contact')||'').trim();
    cust.balance = isNaN(newBalance) ? cust.balance : newBalance;
    await storageSet('utang', state.utang);
    root.innerHTML='';
    showToast('✅ Customer updated');
    render();
  });
}

function openEditModal(item){
  const isOwner = state.role==='owner';
  const root = document.getElementById('modalRoot');
  root.innerHTML = `
  <div class="modal-bg" id="editBg">
    <div class="modal">
      <div class="modal-head"><h3>Edit Item</h3><button class="icon-btn" id="editClose">${ICONS.close}</button></div>
      <form id="editForm">
        <div class="field"><label>Item name</label><input required name="name" value="${esc(item.name)}"></div>
        <div class="grid2">
          <div class="field"><label>Category</label><select name="category">${categoryOptionsHtml(item.category)}</select></div>
          <div class="field"><label>Unit</label><input name="unit" value="${esc(item.unit||'pc')}"></div>
        </div>
        <div class="grid3">
          ${isOwner? `<div class="field"><label>Cost (₱)</label><input required name="cost" type="number" step="0.01" value="${item.cost}"></div>` : ''}
          <div class="field"><label>Sell price (₱)</label><input required name="price" type="number" step="0.01" value="${item.price}"></div>
          <div class="field"><label>Qty</label><input required name="qty" type="number" id="editQtyInput" value="${item.qty}"></div>
        </div>
        <div class="field" id="qtyReasonField" style="display:none;">
          <label>Reason for the quantity change</label>
          <input name="qtyReason" placeholder="e.g. Wrong count from ledger import, actual physical count is 1">
        </div>
        ${isOwner? `
        <div class="field" id="qtyBackdateField" style="display:none;">
          <label>When did this actually happen? (optional, owner only)</label>
          <input type="datetime-local" name="qtyBackdate" max="${new Date().toISOString().slice(0,16)}">
        </div>` : ''}
        <div class="field"><label>Remarks</label><input name="remarks" value="${esc(item.remarks||'')}" placeholder="e.g. near expiry, damaged pack"></div>
        <div class="field"><label>Reorder level</label><input name="reorder" type="number" value="${item.reorder}"></div>
        <button type="submit" class="btn-primary btn-block">Save Changes</button>
      </form>
    </div>
  </div>`;
  document.getElementById('editClose').onclick=()=>{root.innerHTML='';};
  document.getElementById('editBg').addEventListener('click', e=>{ if(e.target.id==='editBg') root.innerHTML=''; });
  document.getElementById('editQtyInput').addEventListener('input', e=>{
    const changed = parseInt(e.target.value) !== item.qty;
    document.getElementById('qtyReasonField').style.display = changed ? '' : 'none';
    const bd = document.getElementById('qtyBackdateField');
    if(bd) bd.style.display = changed ? '' : 'none';
  });
  document.getElementById('editForm').addEventListener('submit', async e=>{
    e.preventDefault();
    const f = new FormData(e.target);
    const oldQty = item.qty;
    const newQty = parseInt(f.get('qty'))||0;
    item.name = f.get('name').trim();
    item.category = f.get('category').trim();
    item.unit = f.get('unit').trim()||'pc';
    if(isOwner) item.cost = parseFloat(f.get('cost'))||0;
    item.price = parseFloat(f.get('price'))||0;
    item.qty = newQty;
    item.reorder = parseInt(f.get('reorder'))||0;
    item.remarks = (f.get('remarks')||'').trim();
    await storageSet('inventory', state.inventory);
    if(newQty !== oldQty){
      const backdateVal = isOwner ? f.get('qtyBackdate') : '';
      const customDate = backdateVal ? new Date(backdateVal).toISOString() : null;
      await logStockAdjustment(item, oldQty, newQty, f.get('qtyReason') || 'Manual correction (no reason given)', customDate);
    }
    root.innerHTML='';
    showToast('✅ Item updated');
    render();
  });
}

/* ---------------- Backup export ---------------- */
function exportRowsToExcel(rows, filename, sheetName){
  if(typeof XLSX === 'undefined'){ showToast('⚠️ Excel export library failed to load'); return; }
  if(!rows.length){ showToast('Nothing to export in this range'); return; }
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0,31));
  XLSX.writeFile(wb, `${filename}.xlsx`);
  showToast('⬇ Excel file downloaded');
}

function exportFullReportExcel(){
  if(typeof XLSX === 'undefined'){ showToast('⚠️ Excel export library failed to load'); return; }
  const wb = XLSX.utils.book_new();

  const salesRows = [...state.sales].sort((a,b)=>b.ts.localeCompare(a.ts)).map(s=>({
    Date: new Date(s.ts).toLocaleString('en-PH'), Item: s.name, Qty: s.qty,
    'Unit Price': s.price, 'Unit Cost': s.cost, Total: s.total,
    Profit: (s.price-s.cost)*s.qty, Payment: s.payment||'Cash',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesRows.length?salesRows:[{Note:'No sales yet'}]), 'Sales');

  const invRows = state.inventory.map(i=>({
    Name: i.name, Category: i.category||'Others', Unit: i.unit,
    Cost: i.cost, Price: i.price, Qty: i.qty, Reorder: i.reorder, Remarks: i.remarks||'',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invRows.length?invRows:[{Note:'No inventory yet'}]), 'Inventory');

  const expRows = [...state.expenses].sort((a,b)=>b.date.localeCompare(a.date)).map(e=>({
    Date: new Date(e.date).toLocaleString('en-PH'), Category: e.category, Amount: e.amount, Remarks: e.remarks||'',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expRows.length?expRows:[{Note:'No expenses yet'}]), 'Expenses');

  const gcashRows = [...state.gcash].sort((a,b)=>b.date.localeCompare(a.date)).map(g=>({
    Date: new Date(g.date).toLocaleString('en-PH'), Type: g.type, Amount: g.amount, Fee: g.fee||0,
    'Fee Handling': g.feeMode==='deduct'?'Deducted':'Paid separately', Remarks: g.remarks||'',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(gcashRows.length?gcashRows:[{Note:'No GCash transactions yet'}]), 'GCash');

  const loadRows = [...state.eload].sort((a,b)=>b.date.localeCompare(a.date)).map(l=>({
    Date: new Date(l.date).toLocaleString('en-PH'), Network: l.provider, 'Load Type': l.loadType,
    Amount: l.amount, Fee: l.fee||0, Remarks: l.remarks||'',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(loadRows.length?loadRows:[{Note:'No load transactions yet'}]), 'Load');

  const remitRows = [...state.remittances].sort((a,b)=>b.date.localeCompare(a.date)).map(r=>({
    'Period Start': r.periodStart, 'Period End': r.periodEnd, Expected: r.expectedCash,
    Remitted: r.actualRemitted, Difference: r.actualRemitted-r.expectedCash, Remarks: r.remarks||'',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(remitRows.length?remitRows:[{Note:'No remittances yet'}]), 'Remittances');

  const utangRows = state.utang.map(c=>({ Name: c.name, Contact: c.contact||'', Balance: c.balance }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(utangRows.length?utangRows:[{Note:'No utang customers yet'}]), 'Utang');

  const voucherRows = state.voucherCodes.map(c=>{
    const type = state.vouchers.find(v=>v.id===c.typeId);
    return { Type: type?type.name:'', Code: c.code, Status: voucherCodeStatus(c), Price: type?type.price:'', Cost: type?type.cost:'' };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(voucherRows.length?voucherRows:[{Note:'No vouchers yet'}]), 'Vouchers');

  XLSX.writeFile(wb, `tindahan-full-report-${todayStr()}.xlsx`);
  showToast('⬇ Full Excel report downloaded');
}

function exportBackup(){
  const payload = {
    exportedAt: new Date().toISOString(),
    config: state.config,
    inventory: state.inventory,
    sales: state.sales,
    receiptsIndex: state.receiptsIndex,
    categories: state.categories,
    expenses: state.expenses,
    utang: state.utang,
    gcash: state.gcash,
    eload: state.eload,
    remittances: state.remittances,
    vouchers: state.vouchers,
    voucherCodes: state.voucherCodes,
  };
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tindahan-backup-${todayStr()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  showToast('⬇ Backup downloaded');
}

function esc(s){
  return String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ---------------- Init ---------------- */
async function init(){
  document.getElementById('main').innerHTML = `<div class="empty" style="padding:60px 10px;"><span class="big">⏳</span>Loading your store…</div>`;
  try{
    await loadAll();

    // First-ever run: inventory is empty, so seed it straight from the ledger draft
    // (cost stays ₱0 per item since the paper sheets only showed retail price — fill it
    // in later per item for accurate profit numbers).
    if(state.inventory.length === 0){
      const seeded = parseBulkImportText(DRAFT_IMPORT_TEXT);
      if(seeded.length){
        state.inventory = seeded;
        await storageSet('inventory', state.inventory);
        state._draftLoaded = true;
      }
    }

    render();
    setInterval(()=>{ backgroundSync().catch(()=>{}); }, 30000);
  }catch(err){
    console.error('App failed to load', err);
    document.getElementById('main').innerHTML = `
      <div class="card" style="max-width:420px;margin:30px auto;text-align:center;">
        <div style="font-size:34px;">⚠️</div>
        <h2>Something didn't load right</h2>
        <p style="font-size:12.5px;color:var(--ink-soft);">${esc(err && err.message || 'Unknown error')}</p>
        <button class="btn-primary btn-block" onclick="location.reload()">Reload</button>
      </div>`;
  }
  document.getElementById('switchUserBtn').addEventListener('click', ()=>{
    state.role = null;
    state.gateStep = 'pick';
    state.gateError = '';
    state.cart = [];
    state.testMode = false;
    render();
  });
  document.getElementById('testModeBtn').addEventListener('click', async ()=>{
    if(state.role!=='owner') return;
    const turningOn = !state.testMode;
    if(turningOn && !confirm('Switch to Test Mode? You\'ll be working in a separate sandbox — nothing here affects your real sales or stock. Tap the flask icon again anytime to switch back.')) return;
    state.testMode = turningOn;
    state.cart = [];
    document.getElementById('main').innerHTML = `<div class="empty" style="padding:60px 10px;"><span class="big">⏳</span>Switching to ${turningOn?'Test':'Real'} Mode…</div>`;
    await loadAll();
    showToast(turningOn ? '🧪 Test Mode ON' : '✅ Back to real data');
    render();
  });
  document.getElementById('storeNameInput').addEventListener('change', async e=>{
    if(state.role!=='owner'){ e.target.value = state.config.name||'Tindahan'; return; }
    state.config.name = e.target.value || 'Tindahan';
    await storageSet('store-config', state.config);
  });
}
init();
