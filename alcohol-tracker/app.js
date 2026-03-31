// ============================
// Storage
// ============================
const STORAGE_KEY = 'drydays_data';

function getData() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
}

function setEntry(dateStr, glasses) {
    const data = getData();
    data[dateStr] = glasses;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getEntry(dateStr) {
    const data = getData();
    return dateStr in data ? data[dateStr] : null; // null = not logged
}

// ============================
// Date helpers
// ============================
function toDateStr(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function todayStr() {
    return toDateStr(new Date());
}

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin',
                   'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS_FR   = ['L','M','M','J','V','S','D'];

// ============================
// State
// ============================
const state = {
    viewMonth: new Date().getMonth(),
    viewYear:  new Date().getFullYear(),
    yearView:  new Date().getFullYear(),
    drinksCount: 1,
    currentView: 'month',
};

// ============================
// Day class helper
// ============================
function dayClass(dateStr) {
    const v = getEntry(dateStr);
    if (v === null) return 'day-none';
    if (v === 0)   return 'day-dry';
    if (v <= 2)    return 'day-light';
    if (v <= 4)    return 'day-medium';
    return 'day-heavy';
}

// Monday-first offset
function weekOffset(year, month) {
    let d = new Date(year, month, 1).getDay(); // 0=Sun
    return d === 0 ? 6 : d - 1;
}

// ============================
// Monthly calendar
// ============================
function renderMonthCalendar() {
    const { viewMonth, viewYear } = state;
    document.getElementById('month-title').textContent =
        `${MONTHS_FR[viewMonth]} ${viewYear}`;

    const grid = document.getElementById('calendar-month');
    grid.innerHTML = '';

    // Headers
    DAYS_FR.forEach(d => {
        const el = document.createElement('div');
        el.className = 'cal-header';
        el.textContent = d;
        grid.appendChild(el);
    });

    // Empty cells
    const offset = weekOffset(viewYear, viewMonth);
    for (let i = 0; i < offset; i++) {
        const el = document.createElement('div');
        el.className = 'cal-day cal-empty';
        grid.appendChild(el);
    }

    // Days
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const today = todayStr();

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const el = document.createElement('div');
        el.className = `cal-day ${dayClass(dateStr)}`;
        if (dateStr === today) el.classList.add('cal-today');

        const numEl = document.createElement('span');
        numEl.className = 'day-num';
        numEl.textContent = d;
        el.appendChild(numEl);

        const entry = getEntry(dateStr);
        if (entry !== null && entry > 0) {
            const countEl = document.createElement('span');
            countEl.className = 'day-count';
            countEl.textContent = entry;
            el.appendChild(countEl);
        }

        if (dateStr <= today) {
            el.style.cursor = 'pointer';
            el.addEventListener('click', () => openEditModal(dateStr));
        }

        grid.appendChild(el);
    }
}

// ============================
// Yearly calendar
// ============================
function renderMiniMonth(year, month) {
    const wrap = document.createElement('div');
    wrap.className = 'mini-month';

    const title = document.createElement('div');
    title.className = 'mini-month-title';
    title.textContent = MONTHS_FR[month].substring(0, 3);
    wrap.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'mini-grid';

    const offset = weekOffset(year, month);
    for (let i = 0; i < offset; i++) {
        const el = document.createElement('div');
        el.className = 'mini-day mini-empty';
        grid.appendChild(el);
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = todayStr();

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const el = document.createElement('div');
        el.className = `mini-day ${dayClass(dateStr)}`;
        if (dateStr === today) el.classList.add('mini-today');

        const entry = getEntry(dateStr);
        if (entry !== null && entry > 0) el.title = `${entry} verre(s)`;

        grid.appendChild(el);
    }

    wrap.appendChild(grid);
    return wrap;
}

function renderYearCalendar() {
    document.getElementById('year-title').textContent = state.yearView;
    const grid = document.getElementById('calendar-year');
    grid.innerHTML = '';
    for (let m = 0; m < 12; m++) {
        grid.appendChild(renderMiniMonth(state.yearView, m));
    }
}

// ============================
// Stats
// ============================
function updateStats() {
    const now = new Date();
    const today = todayStr();
    const year  = now.getFullYear();
    const month = now.getMonth();

    let dryMonth = 0, glassesMonth = 0;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        if (dateStr > today) break;
        const v = getEntry(dateStr);
        if (v === null) continue;
        if (v === 0) dryMonth++;
        else glassesMonth += v;
    }

    // Streak: consecutive dry days going backward from today (or yesterday if today not logged)
    let streak = 0;
    const cursor = new Date();
    if (getEntry(today) === null) cursor.setDate(cursor.getDate() - 1);
    while (true) {
        const dateStr = toDateStr(cursor);
        if (getEntry(dateStr) !== 0) break;
        streak++;
        cursor.setDate(cursor.getDate() - 1);
    }

    document.getElementById('stat-dry-month').textContent     = dryMonth;
    document.getElementById('stat-glasses-month').textContent = glassesMonth;
    document.getElementById('stat-streak').textContent        = streak;
}

// ============================
// Today display
// ============================
function updateTodayDisplay() {
    const today = todayStr();
    const d = new Date();
    document.getElementById('today-date').textContent =
        `${d.getDate()} ${MONTHS_FR[d.getMonth()].toLowerCase()}`;

    const v = getEntry(today);
    const statusEl = document.getElementById('today-status');
    if (v === null) {
        statusEl.textContent = 'Non saisi';
        statusEl.className = 'today-status status-none';
    } else if (v === 0) {
        statusEl.textContent = 'Jour sec ✓';
        statusEl.className = 'today-status status-dry';
    } else {
        statusEl.textContent = `${v} verre${v > 1 ? 's' : ''}`;
        statusEl.className = 'today-status status-drinks';
    }
}

// ============================
// Edit modal (past days)
// ============================
function openEditModal(dateStr) {
    document.getElementById('edit-modal')?.remove();

    const d = new Date(dateStr + 'T12:00:00');
    const label = `${d.getDate()} ${MONTHS_FR[d.getMonth()].toLowerCase()} ${d.getFullYear()}`;
    const existing = getEntry(dateStr);
    let count = (existing !== null && existing > 0) ? existing : 1;

    const overlay = document.createElement('div');
    overlay.id = 'edit-modal';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal">
            <div class="modal-title">${label}</div>
            <button class="btn btn-dry modal-btn" id="modal-dry">Jour sans alcool</button>
            <div class="modal-drinks">
                <button class="count-btn" id="modal-minus">−</button>
                <span class="count-display">
                    <span class="count-value" id="modal-count">${count}</span>
                    <span class="count-unit">verre(s)</span>
                </span>
                <button class="count-btn" id="modal-plus">+</button>
                <button class="btn btn-confirm" id="modal-confirm">OK</button>
            </div>
            <button class="btn-close" id="modal-close">Annuler</button>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#modal-dry').addEventListener('click', () => {
        setEntry(dateStr, 0);
        overlay.remove();
        refresh();
    });
    overlay.querySelector('#modal-minus').addEventListener('click', () => {
        if (count > 1) { count--; overlay.querySelector('#modal-count').textContent = count; }
    });
    overlay.querySelector('#modal-plus').addEventListener('click', () => {
        count++; overlay.querySelector('#modal-count').textContent = count;
    });
    overlay.querySelector('#modal-confirm').addEventListener('click', () => {
        setEntry(dateStr, count);
        overlay.remove();
        refresh();
    });
    overlay.querySelector('#modal-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

// ============================
// Full refresh
// ============================
function refresh() {
    updateTodayDisplay();
    updateStats();
    renderMonthCalendar();
    if (state.currentView === 'year') renderYearCalendar();
}

// ============================
// Push notifications
// ============================
let VAPID_PUBLIC_KEY = null;

async function loadVapidKey() {
    try {
        const res = await fetch('/alcohol-tracker/api/vapid-key');
        if (res.ok) {
            const data = await res.json();
            VAPID_PUBLIC_KEY = data.publicKey;
        }
    } catch { /* server not running, notifications unavailable */ }
}

function urlBase64ToUint8Array(base64) {
    const pad = '='.repeat((4 - base64.length % 4) % 4);
    const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function setupNotifications() {
    if (!('Notification' in window)) {
        alert('Les notifications ne sont pas supportées.');
        return;
    }

    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
        alert('Notifications refusées.');
        return;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        alert('Push non supporté. Sur iPhone, ajoutez l\'app à l\'écran d\'accueil depuis Safari d\'abord.');
        return;
    }

    if (!VAPID_PUBLIC_KEY) {
        alert('Serveur de notifications non disponible. Lancez server.py d\'abord.');
        return;
    }

    try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        await fetch('/alcohol-tracker/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sub),
        });

        const btn = document.getElementById('btn-notif');
        btn.textContent = 'Rappel 21h activé ✓';
        btn.disabled = true;
    } catch (e) {
        alert('Erreur : ' + e.message);
    }
}

// ============================
// Init
// ============================
function init() {
    // Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/alcohol-tracker/service-worker.js')
            .catch(e => console.warn('SW:', e));
    }

    loadVapidKey();

    // --- Today buttons ---
    document.getElementById('btn-dry').addEventListener('click', () => {
        setEntry(todayStr(), 0);
        document.getElementById('drinks-input').classList.remove('visible');
        refresh();
    });

    document.getElementById('btn-drinks').addEventListener('click', () => {
        document.getElementById('drinks-input').classList.toggle('visible');
    });

    document.getElementById('count-minus').addEventListener('click', () => {
        if (state.drinksCount > 1) {
            state.drinksCount--;
            document.getElementById('count-value').textContent = state.drinksCount;
        }
    });

    document.getElementById('count-plus').addEventListener('click', () => {
        state.drinksCount++;
        document.getElementById('count-value').textContent = state.drinksCount;
    });

    document.getElementById('btn-confirm').addEventListener('click', () => {
        setEntry(todayStr(), state.drinksCount);
        document.getElementById('drinks-input').classList.remove('visible');
        state.drinksCount = 1;
        document.getElementById('count-value').textContent = 1;
        refresh();
    });

    // --- Month navigation ---
    document.getElementById('prev-month').addEventListener('click', () => {
        state.viewMonth--;
        if (state.viewMonth < 0) { state.viewMonth = 11; state.viewYear--; }
        renderMonthCalendar();
    });

    document.getElementById('next-month').addEventListener('click', () => {
        state.viewMonth++;
        if (state.viewMonth > 11) { state.viewMonth = 0; state.viewYear++; }
        renderMonthCalendar();
    });

    // --- Year navigation ---
    document.getElementById('prev-year').addEventListener('click', () => {
        state.yearView--; renderYearCalendar();
    });

    document.getElementById('next-year').addEventListener('click', () => {
        state.yearView++; renderYearCalendar();
    });

    // --- View toggle ---
    document.getElementById('toggle-month').addEventListener('click', () => {
        state.currentView = 'month';
        document.getElementById('view-month').classList.remove('hidden');
        document.getElementById('view-year').classList.add('hidden');
        document.getElementById('toggle-month').classList.add('active');
        document.getElementById('toggle-year').classList.remove('active');
    });

    document.getElementById('toggle-year').addEventListener('click', () => {
        state.currentView = 'year';
        document.getElementById('view-year').classList.remove('hidden');
        document.getElementById('view-month').classList.add('hidden');
        document.getElementById('toggle-year').classList.add('active');
        document.getElementById('toggle-month').classList.remove('active');
        renderYearCalendar();
    });

    // --- Notifications ---
    document.getElementById('btn-notif').addEventListener('click', setupNotifications);

    refresh();
}

document.addEventListener('DOMContentLoaded', init);
