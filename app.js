(() => {
  "use strict";

  const API_BASE = (window.SHADOW_ADMIN_CONFIG?.API_BASE || "").replace(/\/$/, "");
  const TOKEN_KEY = "shadow_admin_token";

  const CATEGORY_LABELS = {
    beginner: "Соло · Начинающие",
    amateur: "Соло · Любители",
    "semi-professional": "Соло · Полупрофессионалы",
    professional: "Соло · Профессионалы",
    star: "Соло · Звёзды",
    duet: "Дуэты",
    team: "Команды",
    battle: "Батлы",
    shadow: "Тень",
  };

  const STATUS_LABELS = {
    awaiting_payment: "Не оплачено",
    paid: "Оплачено",
    new: "Новая",
    reviewing: "На рассмотрении",
    accepted: "Прошёл отбор",
    rejected: "Отклонена",
  };
  const STATUS_ORDER = ["awaiting_payment", "paid", "new", "reviewing", "accepted", "rejected"];

  const el = {
    loginScreen: document.getElementById("login-screen"),
    loginForm: document.getElementById("login-form"),
    tokenInput: document.getElementById("token-input"),
    loginError: document.getElementById("login-error"),
    app: document.getElementById("app"),
    statusLine: document.getElementById("status-line"),
    refreshBtn: document.getElementById("refresh-btn"),
    settingsBtn: document.getElementById("settings-btn"),
    tabbarSettings: document.getElementById("tabbar-settings"),
    tabs: Array.from(document.querySelectorAll(".tab")),
    tabbarBtns: Array.from(document.querySelectorAll(".tabbar-btn[data-tab]")),
    tabbarRefresh: document.getElementById("tabbar-refresh"),
    tabAppsCount: document.getElementById("tab-apps-count"),
    tabChatsCount: document.getElementById("tab-chats-count"),
    tabTrashCount: document.getElementById("tab-trash-count"),
    viewApps: document.getElementById("view-apps"),
    viewChats: document.getElementById("view-chats"),
    viewTrash: document.getElementById("view-trash"),
    appsGrid: document.getElementById("apps-grid"),
    appsEmpty: document.getElementById("apps-empty"),
    trashGrid: document.getElementById("trash-grid"),
    trashEmpty: document.getElementById("trash-empty"),
    appsSearch: document.getElementById("apps-search"),
    categoryFilter: document.getElementById("category-filter"),
    statusFilter: document.getElementById("status-filter"),
    chatsList: document.getElementById("chats-list"),
    chatsEmpty: document.getElementById("chats-empty"),
    chatsSearch: document.getElementById("chats-search"),
    drawer: document.getElementById("drawer"),
    drawerBackdrop: document.getElementById("drawer-backdrop"),
    drawerBody: document.getElementById("drawer-body"),
    drawerClose: document.getElementById("drawer-close"),
    toast: document.getElementById("toast"),
  };

  const state = {
    apps: [],
    chats: [],
    emailEnabled: false,
    tab: "apps",
  };

  // ── Утилиты ──
  const getToken = () => localStorage.getItem(TOKEN_KEY) || "";
  const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
  const clearToken = () => localStorage.removeItem(TOKEN_KEY);

  function esc(text = "") {
    const d = document.createElement("div");
    d.textContent = String(text);
    return d.innerHTML;
  }

  // Всплывающее уведомление (тост). Живёт отдельно от панели, поэтому
  // перерисовка деталей его не стирает.
  let toastTimer = null;
  function toast(message, type = "ok") {
    el.toast.textContent = message;
    el.toast.className = `toast toast--${type}`;
    el.toast.hidden = false;
    requestAnimationFrame(() => el.toast.classList.add("is-open"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.toast.classList.remove("is-open");
      setTimeout(() => { el.toast.hidden = true; }, 300);
    }, 3600);
  }

  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleString("ru-RU", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso || "—"; }
  }

  function catLabel(c) { return CATEGORY_LABELS[c] || c || "—"; }
  function statusLabel(s) { return STATUS_LABELS[s] || s || "new"; }

  async function api(path, options = {}) {
    const token = getToken();
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", "x-admin-token": token, ...(options.headers || {}) },
    });
    if (res.status === 401 || res.status === 503) {
      if (res.status === 401) { clearToken(); showLogin("Токен недействителен. Войдите заново."); }
      throw new Error(res.status === 401 ? "unauthorized" : "Сервер: доступ недоступен (503)");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  // ── Категории в фильтр ──
  function fillCategoryFilter() {
    for (const [value, label] of Object.entries(CATEGORY_LABELS)) {
      const opt = document.createElement("option");
      opt.value = value; opt.textContent = label;
      el.categoryFilter.appendChild(opt);
    }
  }

  const TRASH_KEY = "teni_admin_trash";

  function getTrashIds() {
    try {
      const raw = localStorage.getItem(TRASH_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.map(String) : [];
    } catch { return []; }
  }
  function setTrashIds(ids) {
    localStorage.setItem(TRASH_KEY, JSON.stringify([...new Set(ids.map(String))]));
  }
  function addToTrash(id) { setTrashIds([...getTrashIds(), String(id)]); }
  function removeFromTrash(id) { setTrashIds(getTrashIds().filter((x) => x !== String(id))); }
  function isTrashed(id) { return getTrashIds().includes(String(id)); }
  function updateTrashCount() {
    if (el.tabTrashCount) el.tabTrashCount.textContent = getTrashIds().length;
  }

  // ── Загрузка данных ──
  async function loadAll() {
    if (!getToken()) return showLogin();
    el.statusLine.textContent = "Загрузка…";
    try {
      const [apps, chats] = await Promise.all([
        api("/api/applications?limit=1000"),
        api("/api/ai/chats?limit=500").catch(() => ({ items: [] })),
      ]);
      state.apps = apps.items || [];
      state.emailEnabled = Boolean(apps.emailEnabled);
      state.chats = chats.items || [];
      el.tabAppsCount.textContent = state.apps.filter((a) => !isTrashed(a.id)).length;
      el.tabChatsCount.textContent = state.chats.length;
      updateTrashCount();
      renderApps();
      renderChats();
      if (state.tab === "trash") renderTrash();
      el.statusLine.textContent = `Обновлено: ${new Date().toLocaleTimeString("ru-RU")}${state.emailEnabled ? "" : " · почта (SMTP) не настроена — ответы отключены"}`;

      // В фоне проверяем новые ответы участников по почте; если пришли — обновим.
      if (apps.inboxEnabled) {
        api("/api/applications/inbox/fetch", { method: "POST" })
          .then((r) => { if (r && r.added > 0) { toast(`Новых ответов участников: ${r.added}`, "ok"); loadAll(); } })
          .catch(() => {});
      }
    } catch (err) {
      if (err.message === "unauthorized") return;
      el.statusLine.textContent = `Ошибка загрузки: ${err.message}. Проверьте API_BASE в config.js и что сервер запущен.`;
    }
  }

  // Оплачено ли — независимо от рабочего статуса. Старые заявки (до новой
  // модели) имеют статус «Новая», но с суммой в paidAmount — тоже оплачены.
  function isPaid(a) {
    return a.status === "paid" || Number(a.paidAmount) > 0;
  }

  // ── Рендер заявок ──
  function filteredApps() {
    const q = el.appsSearch.value.trim().toLowerCase();
    const cat = el.categoryFilter.value;
    const st = el.statusFilter.value;
    return state.apps.filter((a) => {
      if (isTrashed(a.id)) return false;
      if (cat && a.category !== cat) return false;
      if (st === "paid") {
        if (!isPaid(a)) return false;
      } else if (st === "awaiting_payment") {
        if (!(a.status === "awaiting_payment" && !isPaid(a))) return false;
      } else if (st && (a.status || "new") !== st) {
        return false;
      }
      if (q) {
        const hay = `${a.fullName} ${a.email} ${a.phone} ${a.telegram} ${a.instagram} ${a.city}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function statusChip(status) {
    const s = status || "new";
    return `<span class="chip st-${esc(s)}"><span class="status-dot"></span>${esc(statusLabel(s))}</span>`;
  }

  function buildAppCardHtml(a) {
    const msgs = Array.isArray(a.messages) ? a.messages : [];
    const incoming = msgs.filter((m) => m.direction === "in").length;
    const cardCats = Array.isArray(a.categories) && a.categories.length ? a.categories : (a.category ? [a.category] : []);
    const cardCatsHtml = cardCats.map((c) => `<span class="chip chip-cat">${esc(catLabel(c))}</span>`).join("");
    return `
      <div class="app-card-top">
        <div>
          <div class="app-card-name">${esc(a.fullName || "Без имени")}</div>
          <div class="app-card-date">${esc(fmtDate(a.createdAt))}</div>
        </div>
      </div>
      <div class="app-card-cats">${cardCatsHtml || "—"}</div>
      <div class="app-card-row"><b>${esc(a.email || "—")}</b></div>
      <div class="app-card-row">${esc(a.phone || "—")}${a.city ? " · " + esc(a.city) : ""}</div>
      <div class="app-card-foot">
        ${isPaid(a)
          ? `<span class="chip st-paid"><span class="status-dot"></span>Оплачено${a.paidAmount ? " · " + esc(a.paidAmount) + " ₽" : ""}</span>`
          : `<span class="chip st-awaiting_payment"><span class="status-dot"></span>Не оплачено</span>`}
        ${a.status && a.status !== "new" && a.status !== "awaiting_payment" && a.status !== "paid" ? statusChip(a.status) : ""}
        ${incoming ? `<span class="chip chip-reply">✉ ${incoming}</span>` : (msgs.length ? `<span class="chip">✉ ${msgs.length}</span>` : "")}
      </div>`;
  }

  function confirmTrash(a) {
    if (!window.confirm(`Перенести заявку «${a.fullName || a.email || "без имени"}» в корзину?`)) return;
    addToTrash(a.id);
    toast("Заявка перенесена в корзину", "ok");
    el.tabAppsCount.textContent = state.apps.filter((x) => !isTrashed(x.id)).length;
    updateTrashCount();
    renderApps();
    if (state.tab === "trash") renderTrash();
  }

  function bindSwipeRow(row, onDelete) {
    const content = row.querySelector(".swipe-content");
    const deleteBtn = row.querySelector(".swipe-delete");
    let startX = 0;
    let currentX = 0;
    let dragging = false;
    let open = false;
    let moved = false;
    const THRESH = 48;
    const MAX = 72;

    function setOffset(x) {
      const clamped = Math.max(-MAX, Math.min(0, x));
      content.style.transform = `translateX(${clamped}px)`;
      row.classList.toggle("is-open", clamped <= -THRESH);
    }

    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      onDelete();
      setOffset(0);
      open = false;
    });

    content.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      currentX = open ? -MAX : 0;
      dragging = true;
      moved = false;
    }, { passive: true });

    content.addEventListener("touchmove", (e) => {
      if (!dragging) return;
      const dx = e.touches[0].clientX - startX;
      if (Math.abs(dx) > 8) moved = true;
      setOffset(currentX + dx);
    }, { passive: true });

    const end = () => {
      if (!dragging) return;
      dragging = false;
      const match = content.style.transform.match(/translateX\((-?\d+)/);
      const x = match ? parseInt(match[1], 10) : 0;
      if (x < -THRESH / 2) {
        setOffset(-MAX);
        open = true;
      } else {
        setOffset(0);
        open = false;
      }
    };
    content.addEventListener("touchend", end);
    content.addEventListener("touchcancel", end);

    document.addEventListener("click", (e) => {
      if (open && !row.contains(e.target)) {
        setOffset(0);
        open = false;
      }
    });

    const card = content.querySelector(".app-card");
    card.addEventListener("click", (e) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    });
  }

  function renderApps() {
    const items = filteredApps();
    el.appsGrid.innerHTML = "";
    el.appsEmpty.hidden = items.length > 0;
    const frag = document.createDocumentFragment();
    for (const a of items) {
      const row = document.createElement("div");
      row.className = "swipe-row";
      row.innerHTML = `
        <div class="swipe-action">
          <button type="button" class="swipe-delete" aria-label="В корзину">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          </button>
        </div>
        <div class="swipe-content">
          <div class="app-card-shell">
            <button type="button" class="app-card-del" aria-label="В корзину" title="В корзину">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>
            </button>
            <button type="button" class="app-card">${buildAppCardHtml(a)}</button>
          </div>
        </div>`;
      const card = row.querySelector(".app-card");
      card.addEventListener("click", () => openAppDrawer(a.id));
      const delBtn = row.querySelector(".app-card-del");
      if (delBtn) {
        delBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          confirmTrash(a);
        });
      }
      bindSwipeRow(row, () => confirmTrash(a));
      frag.appendChild(row);
    }
    el.appsGrid.appendChild(frag);
  }

  function trashedApps() {
    const trash = new Set(getTrashIds());
    return state.apps.filter((a) => trash.has(String(a.id)));
  }

  function renderTrash() {
    const items = trashedApps();
    el.trashGrid.innerHTML = "";
    el.trashEmpty.hidden = items.length > 0;
    const frag = document.createDocumentFragment();
    for (const a of items) {
      const wrap = document.createElement("div");
      wrap.className = "trash-item";
      wrap.innerHTML = `
        <button type="button" class="app-card">${buildAppCardHtml(a)}</button>
        <div class="trash-item-actions">
          <button type="button" class="btn btn-ghost trash-restore">Вернуть из корзины</button>
        </div>`;
      wrap.querySelector(".app-card").addEventListener("click", () => openAppDrawer(a.id));
      wrap.querySelector(".trash-restore").addEventListener("click", (e) => {
        e.stopPropagation();
        removeFromTrash(a.id);
        toast("Заявка возвращена", "ok");
        el.tabAppsCount.textContent = state.apps.filter((x) => !isTrashed(x.id)).length;
        updateTrashCount();
        renderApps();
        renderTrash();
      });
      frag.appendChild(wrap);
    }
    el.trashGrid.appendChild(frag);
  }

  // ── Рендер чатов ──
  function filteredChats() {
    const q = el.chatsSearch.value.trim().toLowerCase();
    if (!q) return state.chats;
    return state.chats.filter((c) => {
      if ((c.deviceId || "").toLowerCase().includes(q)) return true;
      return (c.messages || []).some((m) => (m.content || "").toLowerCase().includes(q));
    });
  }

  function renderChats() {
    const items = filteredChats();
    el.chatsList.innerHTML = "";
    el.chatsEmpty.hidden = items.length > 0;
    const frag = document.createDocumentFragment();
    for (const c of items) {
      const msgs = c.messages || [];
      const lastUser = [...msgs].reverse().find((m) => m.role === "user");
      const preview = lastUser ? lastUser.content : (msgs[0]?.content || "—");
      const card = document.createElement("button");
      card.type = "button";
      card.className = "chat-card";
      card.addEventListener("click", () => openChatDrawer(c.sessionId));
      card.innerHTML = `
        <div class="chat-card-top">
          <span class="chip">${msgs.length} сообщ.</span>
          <span class="chat-card-id">device: ${esc((c.deviceId || "—").slice(0, 8))}…</span>
        </div>
        <div class="chat-card-preview">${esc(preview)}</div>
        <div class="chat-card-meta">
          <span>Обновлён: ${esc(fmtDate(c.updatedAt))}</span>
        </div>`;
      frag.appendChild(card);
    }
    el.chatsList.appendChild(frag);
  }

  // ── Drawer ──
  // Надёжная блокировка прокрутки фона (в т.ч. iOS): фиксируем body по месту,
  // чтобы за открытой карточкой ничего не «ездило».
  let scrollLockY = 0;
  let scrollLocked = false;
  function lockScroll() {
    if (scrollLocked) return;
    scrollLockY = window.scrollY || window.pageYOffset || 0;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollLockY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    scrollLocked = true;
  }
  function unlockScroll() {
    if (!scrollLocked) return;
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    document.body.style.overflow = "";
    scrollLocked = false;
    window.scrollTo(0, scrollLockY);
  }

  function openDrawer(html) {
    el.drawerBody.innerHTML = html;
    el.drawer.hidden = false;
    el.drawerBackdrop.hidden = false;
    el.drawer.setAttribute("aria-hidden", "false");
    el.drawer.scrollTop = 0;
    lockScroll();
    requestAnimationFrame(() => {
      el.drawer.classList.add("is-open");
      el.drawerBackdrop.classList.add("is-open");
    });
  }
  function closeDrawer() {
    el.drawer.classList.remove("is-open");
    el.drawerBackdrop.classList.remove("is-open");
    el.drawer.setAttribute("aria-hidden", "true");
    unlockScroll();
    setTimeout(() => { el.drawer.hidden = true; el.drawerBackdrop.hidden = true; el.drawerBody.innerHTML = ""; }, 340);
  }

  function row(label, valueHtml) {
    return `<div class="d-row"><dt>${esc(label)}</dt><dd>${valueHtml}</dd></div>`;
  }

  function openAppDrawer(id) {
    const a = state.apps.find((x) => x.id === id);
    if (!a) return;

    const contact = [];
    if (a.email) contact.push(`<a href="mailto:${esc(a.email)}">${esc(a.email)}</a>`);
    const videoLinks = String(a.videoUrl || "").split(/\n/).map((l) => l.trim()).filter(Boolean);
    const video = videoLinks.length
      ? videoLinks.map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener">Видео${videoLinks.length > 1 ? " " + (i + 1) : ""} ↗</a>`).join("<br>")
      : "—";

    const msgs = Array.isArray(a.messages) ? a.messages : [];
    const convoHtml = msgs.length
      ? `<div class="transcript">${msgs.map((m) => {
          const incoming = m.direction === "in";
          return `<div class="msg msg-${incoming ? "bot" : "user"}">
            ${m.subject ? `<div class="msg-subj">${esc(m.subject)}</div>` : ""}${esc(m.text)}
            <span class="msg-time">${incoming ? "участник" : "мы"} · ${esc(fmtDate(m.at))}</span>
          </div>`;
        }).join("")}</div>`
      : `<p class="reply-hint">Переписки пока нет.</p>`;

    const statusBtns = STATUS_ORDER.map((s) =>
      `<button type="button" class="d-status-btn ${(a.status || "new") === s ? "is-active" : ""}" data-status="${s}">${esc(statusLabel(s))}</button>`
    ).join("");

    const replyBox = state.emailEnabled
      ? `<div class="reply-box">
          <p class="reply-hint">Письмо уйдёт на <b>${esc(a.email)}</b>. Участник сможет ответить прямо на него.</p>
          <input id="reply-subject" class="field" type="text" placeholder="Тема письма (необязательно)">
          <textarea id="reply-message" class="field" placeholder="Текст письма участнику…"></textarea>
          <button id="reply-send" class="btn btn-accent" type="button">Отправить письмо</button>
          <p id="reply-status" class="reply-status"></p>
        </div>`
      : `<p class="reply-warn">Почта (SMTP) не настроена на сервере — отправка писем недоступна. Задайте переменные SMTP_* в настройках бэкенда.</p>`;

    // Категории — массив или fallback на одну
    const cats = Array.isArray(a.categories) && a.categories.length ? a.categories : (a.category ? [a.category] : []);
    const catsHtml = cats.map((c) => `<span class="chip chip-cat">${esc(catLabel(c))}</span>`).join(" ");

    const roleLabels = { student: "Ученик", teacher: "Педагог" };

    openDrawer(`
      <span class="d-kicker">Заявка</span>
      <h2 class="d-title">${esc(a.fullName || "Без имени")}</h2>
      ${statusChip(a.status)}

      <div class="d-section-title">Контакты</div>
      <dl class="d-grid">
        ${row("Дата", esc(fmtDate(a.createdAt)))}
        ${row("Email", contact.length ? contact.join("") : "—")}
        ${row("Телефон", esc(a.phone || "—"))}
        ${row("Telegram", esc(a.telegram || "—"))}
        ${row("Instagram", esc(a.instagram || "—"))}
        ${row("Город", esc(a.city || "—"))}
      </dl>

      <div class="d-section-title">Участник</div>
      <dl class="d-grid">
        ${row("Роль", esc(roleLabels[a.role] || a.role || "—"))}
        ${row("Стаж", esc(a.experience || "—"))}
        ${a.awards ? row("Призовые места", esc(a.awards)) : ""}
      </dl>

      <div class="d-section-title">Оплата</div>
      <dl class="d-grid">
        ${row("Статус", isPaid(a)
          ? `<span class="chip st-paid"><span class="status-dot"></span>Оплачено</span>`
          : `<span class="chip st-awaiting_payment"><span class="status-dot"></span>Не оплачено</span>`)}
        ${row("Сумма", a.paidAmount ? esc(a.paidAmount) + " ₽" : "—")}
        ${a.paymentId ? row("ID платежа", `<span class="mono">${esc(a.paymentId)}</span>`) : ""}
      </dl>

      <div class="d-section-title">Категории</div>
      <div style="margin-bottom:16px;display:flex;flex-wrap:wrap;gap:6px">${catsHtml || "—"}</div>
      ${cats.includes("shadow") ? `
        <div class="d-section-title">Детали категории Тень</div>
        <dl class="d-grid">
          ${a.shadowType ? row("Состав", esc({ solo: "Соло", duet: "Дуэт", group: "Команда" }[a.shadowType] || a.shadowType)) : ""}
          ${a.shadowIdea ? row("Идея номера", esc(a.shadowIdea)) : ""}
        </dl>
      ` : ""}
      ${cats.includes("battle") && a.battleLevel ? `
        <div class="d-section-title">Детали категории Батл</div>
        <dl class="d-grid">
          ${row("Уровень", esc({ amateur: "Любители", professional: "Профи" }[a.battleLevel] || a.battleLevel))}
        </dl>
      ` : ""}

      <div class="d-section-title">Видео и комментарий</div>
      <dl class="d-grid">
        ${row("Видео", video)}
        ${a.comment ? row("Комментарий", esc(a.comment)) : ""}
      </dl>

      <div class="d-section-title">Статус заявки</div>
      <p class="d-hint">Пометка для вас — на каком этапе заявка. Участник её не видит.</p>
      <div class="d-status-row">${statusBtns}</div>

      <div class="d-section-title">Переписка</div>
      ${convoHtml}

      <div class="d-section-title">Ответить участнику на почту</div>
      ${replyBox}

      <details class="d-details">
        <summary>Технические данные</summary>
        <dl class="d-grid" style="margin-top: 12px">
          ${row("Device ID", `<span class="mono">${esc(a.deviceId || "—")}</span>`)}
          ${row("IP", `<span class="mono">${esc(a.ip || "—")}</span>`)}
          ${row("Устройство", `<span class="mono">${esc(a.userAgent || "—")}</span>`)}
          ${row("ID заявки", `<span class="mono">${esc(a.id)}</span>`)}
        </dl>
      </details>
    `);

    // Статусы
    el.drawerBody.querySelectorAll(".d-status-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const status = btn.dataset.status;
        try {
          const res = await api(`/api/applications/${a.id}/status`, {
            method: "POST", body: JSON.stringify({ status }),
          });
          Object.assign(a, res.item);
          el.drawerBody.querySelectorAll(".d-status-btn").forEach((b) => b.classList.toggle("is-active", b.dataset.status === status));
          renderApps();
          toast(`Статус изменён: ${statusLabel(status)}`, "ok");
        } catch (err) {
          toast(`Не удалось изменить статус: ${err.message}`, "err");
        }
      });
    });

    // Ответ письмом
    const sendBtn = document.getElementById("reply-send");
    if (sendBtn) {
      sendBtn.addEventListener("click", async () => {
        const subject = document.getElementById("reply-subject").value.trim();
        const message = document.getElementById("reply-message").value.trim();
        const statusEl = document.getElementById("reply-status");
        if (message.length < 2) {
          statusEl.className = "reply-status err";
          statusEl.textContent = "Напишите текст письма.";
          return;
        }
        if (!window.confirm(`Отправить письмо участнику на ${a.email}?`)) return;

        sendBtn.disabled = true; sendBtn.textContent = "Отправляем…";
        statusEl.className = "reply-status"; statusEl.textContent = "";
        try {
          const res = await api(`/api/applications/${a.id}/reply`, {
            method: "POST", body: JSON.stringify({ subject, message }),
          });
          Object.assign(a, res.item);
          toast(`Письмо отправлено на ${a.email}`, "ok");
          openAppDrawer(a.id); // перерисуем с обновлённой историей (тост не пропадёт)
          renderApps();
        } catch (err) {
          sendBtn.disabled = false; sendBtn.textContent = "Отправить письмо";
          statusEl.className = "reply-status err";
          statusEl.textContent = `Не удалось отправить: ${err.message}`;
          toast("Не удалось отправить письмо", "err");
        }
      });
    }
  }

  function openChatDrawer(sessionId) {
    const c = state.chats.find((x) => x.sessionId === sessionId);
    if (!c) return;
    const msgs = c.messages || [];
    const transcript = msgs.map((m) => `
      <div class="msg msg-${m.role === "user" ? "user" : "bot"}">${esc(m.content)}<span class="msg-time">${esc(fmtDate(m.at))}</span></div>
    `).join("");

    openDrawer(`
      <span class="d-kicker">Диалог с ИИ</span>
      <h2 class="d-title">${msgs.length} сообщений</h2>

      <div class="d-section-title">Идентификация</div>
      <dl class="d-grid">
        ${row("Device ID", `<span class="mono">${esc(c.deviceId || "—")}</span>`)}
        ${row("Session ID", `<span class="mono">${esc(c.sessionId)}</span>`)}
        ${row("IP", `<span class="mono">${esc(c.ip || "—")}</span>`)}
        ${row("Устройство", `<span class="mono">${esc(c.userAgent || "—")}</span>`)}
        ${row("Начат", esc(fmtDate(c.createdAt)))}
        ${row("Обновлён", esc(fmtDate(c.updatedAt)))}
      </dl>

      <div class="d-section-title">Переписка</div>
      <div class="transcript">${transcript || '<p class="reply-hint">Сообщений нет.</p>'}</div>
    `);
  }

  // ── Настройки: фон ──
  const BACKGROUNDS = [
    { id: "light", name: "Светлый", prev: "#f5f5f7", dot: "#f5f5f7" },
    { id: "warm", name: "Тёплый", prev: "linear-gradient(135deg,#f8f4ef,#efe6da)", dot: "#efe6da" },
    { id: "cool", name: "Холодный", prev: "linear-gradient(135deg,#eef2f8,#e2eaf5)", dot: "#e2eaf5" },
    { id: "rose", name: "Розовый", prev: "linear-gradient(135deg,#faf1f3,#f1e0e7)", dot: "#f1e0e7" },
    { id: "mint", name: "Мятный", prev: "linear-gradient(135deg,#eef6f1,#dfeee6)", dot: "#dfeee6" },
    { id: "stage", name: "Сцена", prev: "linear-gradient(rgba(12,12,14,0.55), rgba(12,12,14,0.85)), url('background_opening.jpg') center/cover", dot: "#2a2a2e" },
  ];
  const BG_KEY = "teni_admin_bg";
  const THEME_BY_BG = {
    light: "#f5f5f7",
    warm: "#f8f4ef",
    cool: "#eef2f8",
    rose: "#faf1f3",
    mint: "#eef6f1",
    stage: "#0c0c0e",
  };
  const currentBg = () => localStorage.getItem(BG_KEY) || "light";
  function applyBg(id) {
    const bg = id || "light";
    document.body.dataset.bg = bg;
    if (!el.app.hidden) setThemeColor(THEME_BY_BG[bg] || "#f5f5f7");
    const appleBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (appleBar) appleBar.setAttribute("content", bg === "stage" ? "black-translucent" : "default");
  }

  // ── Настройки: push ──
  function pushSupported() {
    return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  }
  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  async function enablePush() {
    if (!pushSupported()) throw new Error("Push не поддерживается на этом устройстве.");
    const perm = await Notification.requestPermission();
    if (perm !== "granted") throw new Error("Нужно разрешить уведомления в системном окне.");
    const info = await api("/api/push/public-key");
    if (!info.enabled || !info.publicKey) throw new Error("Push не настроен на сервере (нет VAPID-ключей).");
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(info.publicKey),
      });
    }
    await api("/api/push/subscribe", { method: "POST", body: JSON.stringify({ subscription: sub }) });
  }
  async function disablePush() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await api("/api/push/unsubscribe", { method: "POST", body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
      await sub.unsubscribe().catch(() => {});
    }
  }
  async function isPushOn() {
    if (!pushSupported() || Notification.permission !== "granted") return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      return Boolean(await reg.pushManager.getSubscription());
    } catch { return false; }
  }

  async function refreshPushUI() {
    const toggle = document.getElementById("push-toggle");
    const hint = document.getElementById("push-hint");
    const testBtn = document.getElementById("push-test");
    if (!toggle) return;
    if (!pushSupported()) {
      toggle.checked = false; toggle.disabled = true; testBtn.hidden = true;
      hint.textContent = "Это устройство/браузер не поддерживает пуш. На iPhone: добавьте приложение на экран «Домой» (Поделиться → На экран «Домой»), откройте его как приложение и включите уведомления здесь.";
      return;
    }
    if (Notification.permission === "denied") {
      toggle.checked = false; testBtn.hidden = true;
      hint.textContent = "Уведомления запрещены в настройках браузера/системы для этого сайта. Разрешите их и повторите.";
      return;
    }
    const on = await isPushOn();
    toggle.checked = on;
    testBtn.hidden = !on;
    hint.textContent = on
      ? "Включены. Пуш придёт всем устройствам с этой PWA: новое сообщение от участника или новая неоплаченная заявка."
      : "Включите, чтобы получать пуш при новом сообщении или новой неоплаченной заявке.";
  }

  function openSettingsDrawer() {
    const bgHtml = BACKGROUNDS.map((b) => `
      <button type="button" class="bg-swatch ${currentBg() === b.id ? "is-active" : ""}" data-bg="${b.id}">
        <span class="bg-swatch-prev" style="background:${b.prev}"></span>
        <span class="bg-swatch-foot">
          <span class="bg-swatch-name">${esc(b.name)}</span>
        </span>
      </button>`).join("");

    openDrawer(`
      <span class="d-kicker">Настройки</span>
      <h2 class="d-title">Настройки</h2>

      <div class="set-block">
        <div class="d-section-title">Уведомления</div>
        <div class="set-row">
          <div class="set-row-text">
            <div class="set-row-title">Пуш-уведомления</div>
          </div>
          <label class="switch">
            <input type="checkbox" id="push-toggle">
            <span class="switch-track"></span>
          </label>
        </div>
        <p class="set-hint" id="push-hint">Загрузка…</p>
        <button class="btn btn-ghost" id="push-test" type="button" style="margin-top:12px" hidden>Отправить тестовое</button>
        <p class="set-status" id="push-status"></p>
      </div>

      <div class="set-block">
        <div class="d-section-title">Фон приложения</div>
        <div class="bg-grid" id="bg-grid">${bgHtml}</div>
      </div>

      <div class="set-block">
        <button class="btn btn-ghost" id="settings-logout" type="button" style="width:100%">Выйти из аккаунта</button>
      </div>
    `);

    // Фон
    el.drawerBody.querySelectorAll(".bg-swatch").forEach((sw) => {
      sw.addEventListener("click", () => {
        const id = sw.dataset.bg;
        localStorage.setItem(BG_KEY, id);
        applyBg(id);
        el.drawerBody.querySelectorAll(".bg-swatch").forEach((s) => s.classList.toggle("is-active", s.dataset.bg === id));
      });
    });

    document.getElementById("settings-logout")?.addEventListener("click", doLogout);

    // Push
    refreshPushUI();
    const toggle = document.getElementById("push-toggle");
    const status = document.getElementById("push-status");
    const testBtn = document.getElementById("push-test");
    toggle.addEventListener("change", async () => {
      status.className = "set-status"; status.textContent = "";
      toggle.disabled = true;
      try {
        if (toggle.checked) { await enablePush(); status.className = "set-status ok"; status.textContent = "Готово, уведомления включены."; }
        else { await disablePush(); status.textContent = "Уведомления выключены."; }
      } catch (err) {
        status.className = "set-status err"; status.textContent = err.message || "Не удалось изменить настройку.";
      } finally {
        toggle.disabled = false;
        refreshPushUI();
      }
    });
    testBtn.addEventListener("click", async () => {
      status.className = "set-status"; status.textContent = "Отправляем…";
      try {
        const r = await api("/api/push/test", { method: "POST" });
        status.className = "set-status ok"; status.textContent = `Отправлено. Устройств получило: ${r.sent}.`;
      } catch (err) {
        status.className = "set-status err"; status.textContent = err.message || "Не удалось отправить.";
      }
    });
  }

  // ── Табы ──
  function switchTab(tab) {
    state.tab = tab;
    el.tabs.forEach((t) => t.classList.toggle("is-active", t.dataset.tab === tab));
    el.tabbarBtns.forEach((t) => t.classList.toggle("is-active", t.dataset.tab === tab));
    el.viewApps.hidden = tab !== "apps";
    el.viewChats.hidden = tab !== "chats";
    el.viewTrash.hidden = tab !== "trash";
    if (tab === "trash") renderTrash();
  }

  // ── Экраны ──
  // Цвет системной строки (в PWA): тёмный на входе (под фон-картинку, без белой
  // полоски), светлый — в приложении.
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  function setThemeColor(color) { if (themeMeta) themeMeta.setAttribute("content", color); }

  function showLogin(errorMsg) {
    el.app.hidden = true;
    el.loginScreen.hidden = false;
    setThemeColor("#0c0c0e");
    if (errorMsg) { el.loginError.textContent = errorMsg; el.loginError.hidden = false; }
    else el.loginError.hidden = true;
  }
  function showApp() {
    el.loginScreen.hidden = true;
    el.app.hidden = false;
    applyBg(currentBg());
    loadAll();
  }

  // ── События ──
  el.loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const token = el.tokenInput.value.trim();
    if (!token) return;
    setToken(token);
    el.tokenInput.value = "";
    showApp();
  });
  const doLogout = () => { clearToken(); closeDrawer(); showLogin(); };

  let refreshing = false;
  async function manualRefresh(btn) {
    if (refreshing) return;
    refreshing = true;
    [el.refreshBtn, el.tabbarRefresh].forEach((b) => b && b.classList.add("is-spinning"));
    if (el.refreshBtn) { el.refreshBtn.disabled = true; }
    try {
      await loadAll();
      toast("Обновлено", "ok");
    } finally {
      refreshing = false;
      [el.refreshBtn, el.tabbarRefresh].forEach((b) => b && b.classList.remove("is-spinning"));
      if (el.refreshBtn) { el.refreshBtn.disabled = false; }
    }
  }

  el.refreshBtn.addEventListener("click", () => manualRefresh(el.refreshBtn));
  el.tabs.forEach((t) => t.addEventListener("click", () => switchTab(t.dataset.tab)));
  el.tabbarBtns.forEach((t) => t.addEventListener("click", () => switchTab(t.dataset.tab)));
  if (el.tabbarRefresh) el.tabbarRefresh.addEventListener("click", () => manualRefresh(el.tabbarRefresh));
  if (el.settingsBtn) el.settingsBtn.addEventListener("click", openSettingsDrawer);
  if (el.tabbarSettings) el.tabbarSettings.addEventListener("click", openSettingsDrawer);
  el.appsSearch.addEventListener("input", renderApps);
  el.categoryFilter.addEventListener("change", renderApps);
  el.statusFilter.addEventListener("change", renderApps);
  el.chatsSearch.addEventListener("input", renderChats);
  el.drawerClose.addEventListener("click", closeDrawer);
  el.drawerBackdrop.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !el.drawer.hidden) closeDrawer(); });

  // Авто-обновление: заявки, созданные на сервере по факту оплаты (webhook или
  // «сборщик»), подтягиваются сами — без ручного «Обновить». Не дёргаем список,
  // когда открыта карточка заявки или вкладка неактивна.
  setInterval(() => {
    if (!getToken()) return;
    if (el.app.hidden) return;
    if (!el.drawer.hidden) return;
    if (document.visibilityState === "hidden") return;
    loadAll();
  }, 45000);

  applyBg(currentBg());
  updateTrashCount();
  fillCategoryFilter();
  if (getToken()) showApp();
  else showLogin();
})();
