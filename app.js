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
    new: "Новая",
    reviewing: "На рассмотрении",
    accepted: "Прошёл отбор",
    rejected: "Отклонена",
    paid: "Оплачено",
  };
  const STATUS_ORDER = ["new", "reviewing", "accepted", "rejected", "paid"];

  const el = {
    loginScreen: document.getElementById("login-screen"),
    loginForm: document.getElementById("login-form"),
    tokenInput: document.getElementById("token-input"),
    loginError: document.getElementById("login-error"),
    app: document.getElementById("app"),
    statusLine: document.getElementById("status-line"),
    refreshBtn: document.getElementById("refresh-btn"),
    logoutBtn: document.getElementById("logout-btn"),
    tabs: Array.from(document.querySelectorAll(".tab")),
    tabAppsCount: document.getElementById("tab-apps-count"),
    tabChatsCount: document.getElementById("tab-chats-count"),
    viewApps: document.getElementById("view-apps"),
    viewChats: document.getElementById("view-chats"),
    appsGrid: document.getElementById("apps-grid"),
    appsEmpty: document.getElementById("apps-empty"),
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
      el.tabAppsCount.textContent = state.apps.length;
      el.tabChatsCount.textContent = state.chats.length;
      renderApps();
      renderChats();
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

  // ── Рендер заявок ──
  function filteredApps() {
    const q = el.appsSearch.value.trim().toLowerCase();
    const cat = el.categoryFilter.value;
    const st = el.statusFilter.value;
    return state.apps.filter((a) => {
      if (cat && a.category !== cat) return false;
      if (st && (a.status || "new") !== st) return false;
      if (q) {
        const hay = `${a.fullName} ${a.email} ${a.phone} ${a.telegram} ${a.city}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function statusChip(status) {
    const s = status || "new";
    return `<span class="chip st-${esc(s)}"><span class="status-dot"></span>${esc(statusLabel(s))}</span>`;
  }

  function renderApps() {
    const items = filteredApps();
    el.appsGrid.innerHTML = "";
    el.appsEmpty.hidden = items.length > 0;
    const frag = document.createDocumentFragment();
    for (const a of items) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "app-card";
      card.addEventListener("click", () => openAppDrawer(a.id));
      const msgs = Array.isArray(a.messages) ? a.messages : [];
      const incoming = msgs.filter((m) => m.direction === "in").length;
      card.innerHTML = `
        <div class="app-card-top">
          <div>
            <div class="app-card-name">${esc(a.fullName || "Без имени")}</div>
            <div class="app-card-date">${esc(fmtDate(a.createdAt))}</div>
          </div>
          <span class="chip chip-cat">${esc(catLabel(a.category))}</span>
        </div>
        <div class="app-card-row"><b>${esc(a.email || "—")}</b></div>
        <div class="app-card-row">${esc(a.phone || "—")}${a.city ? " · " + esc(a.city) : ""}</div>
        <div class="app-card-foot">
          ${statusChip(a.status)}
          ${incoming ? `<span class="chip chip-reply">✉ ответ участника: ${incoming}</span>` : (msgs.length ? `<span class="chip">✉ ${msgs.length}</span>` : "")}
        </div>`;
      frag.appendChild(card);
    }
    el.appsGrid.appendChild(frag);
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
  function openDrawer(html) {
    el.drawerBody.innerHTML = html;
    el.drawer.hidden = false;
    el.drawerBackdrop.hidden = false;
    el.drawer.setAttribute("aria-hidden", "false");
    el.drawer.scrollTop = 0;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      el.drawer.classList.add("is-open");
      el.drawerBackdrop.classList.add("is-open");
    });
  }
  function closeDrawer() {
    el.drawer.classList.remove("is-open");
    el.drawerBackdrop.classList.remove("is-open");
    el.drawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
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
    const video = a.videoUrl ? `<a href="${esc(a.videoUrl)}" target="_blank" rel="noopener">Открыть видео ↗</a>` : "—";

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

    openDrawer(`
      <span class="d-kicker">Заявка · ${esc(catLabel(a.category))}</span>
      <h2 class="d-title">${esc(a.fullName || "Без имени")}</h2>
      ${statusChip(a.status)}

      <div class="d-section-title">Данные участника</div>
      <dl class="d-grid">
        ${row("Дата", esc(fmtDate(a.createdAt)))}
        ${row("Категория", esc(catLabel(a.category)))}
        ${row("Email", contact.length ? contact.join("") : "—")}
        ${row("Телефон", esc(a.phone || "—"))}
        ${row("Telegram", esc(a.telegram || "—"))}
        ${row("Город", esc(a.city || "—"))}
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

  // ── Табы ──
  function switchTab(tab) {
    state.tab = tab;
    el.tabs.forEach((t) => t.classList.toggle("is-active", t.dataset.tab === tab));
    el.viewApps.hidden = tab !== "apps";
    el.viewChats.hidden = tab !== "chats";
  }

  // ── Экраны ──
  function showLogin(errorMsg) {
    el.app.hidden = true;
    el.loginScreen.hidden = false;
    if (errorMsg) { el.loginError.textContent = errorMsg; el.loginError.hidden = false; }
    else el.loginError.hidden = true;
  }
  function showApp() {
    el.loginScreen.hidden = true;
    el.app.hidden = false;
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
  el.refreshBtn.addEventListener("click", loadAll);
  el.logoutBtn.addEventListener("click", () => { clearToken(); closeDrawer(); showLogin(); });
  el.tabs.forEach((t) => t.addEventListener("click", () => switchTab(t.dataset.tab)));
  el.appsSearch.addEventListener("input", renderApps);
  el.categoryFilter.addEventListener("change", renderApps);
  el.statusFilter.addEventListener("change", renderApps);
  el.chatsSearch.addEventListener("input", renderChats);
  el.drawerClose.addEventListener("click", closeDrawer);
  el.drawerBackdrop.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !el.drawer.hidden) closeDrawer(); });

  fillCategoryFilter();
  if (getToken()) showApp();
  else showLogin();
})();
