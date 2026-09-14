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
    reserve: "Резерв",
    accepted: "Прошёл отбор",
    rejected: "Отклонена",
    reviewing: "На рассмотрении",
    new: "Новая", // legacy: старые заявки, кнопки не показываем
  };
  // Статусы этапа 1 (порядок кнопок в карточке). «Новая» убрана из выбора.
  const STATUS_ORDER = ["awaiting_payment", "paid", "reserve", "accepted", "rejected", "reviewing"];
  const WORKFLOW_STATUSES = ["reserve", "accepted", "rejected", "reviewing"];
  const PAYMENT_STATUSES = ["awaiting_payment", "paid"];
  const DEFAULT_REPLY_SUBJECT = "Чемпионат «Тень»";
  const PAY_LINK = "https://xn----7sbocmxidei1bb9cwe.xn--p1ai/apply.html#packages";
  const OS_TEMPLATE_IDS = new Set(["accepted", "reserve", "rejected"]);
  const DEFAULT_BULK_SEND = "2026-09-14T11:00";

  // Готовые шаблоны писем. [Имя] и заметка ОС подставляются автоматически.
  const EMAIL_TEMPLATES = [
    {
      id: "accepted",
      label: "Прошёл видеоотбор + ОС",
      subject: "Вы прошли видеоотбор чемпионата «Тень»",
      body:
`Здравствуйте, [Имя]!

Поздравляем! По результатам видеоотбора вы прошли в чемпионат «Тень».

Обратная связь от Кристины Бродецкой по вашему видео:

[индивидуальная обратная связь]

Следующий шаг — оплатить основной взнос за участие.

Срок оплаты: до 21 сентября включительно

Оплатить участие можно по ссылке:

${PAY_LINK}

После оплаты вам автоматически придёт письмо с подтверждением зачисления в состав участников чемпионата и ссылкой на анкету участника.

Пожалуйста, оплатите взнос в установленный срок, чтобы подтвердить своё участие.

С уважением,
Команда чемпионата «Тень»`,
    },
    {
      id: "reserve",
      label: "Резерв + ОС",
      subject: "Вы в резерве чемпионата «Тень»",
      body:
`Здравствуйте, [Имя]!
Спасибо за вашу заявку и участие в видеоотборе чемпионата «Тень».
По результатам отсмотра ваша заявка попала в резерв.
Это означает, что на данный момент вы не включены в основной список участников, но можете быть приглашены к участию, если появится возможность добавить номер в программу.
Обратная связь от Кристины Бродецкой по вашему видео:
[индивидуальная обратная связь]
Если место освободится, мы свяжемся с вами дополнительно.
С уважением,
Команда чемпионата «Тень»`,
    },
    {
      id: "rejected",
      label: "Не прошёл + ОС",
      subject: "Результаты видеоотбора чемпионата «Тень»",
      body:
`Здравствуйте, [Имя]!
Спасибо за вашу заявку и участие в видеоотборе чемпионата «Тень».
К сожалению, по результатам отсмотра ваша заявка не прошла в основной состав участников.
Обратная связь от Кристины Бродецкой по вашему видео:
[индивидуальная обратная связь]
Мы благодарим вас за интерес к чемпионату и за проделанную работу. Надеемся, что эта обратная связь будет полезна для вашего дальнейшего развития и подготовки будущих номеров.
Будем рады видеть вас на чемпионате в качестве зрителя. «Тень» — это не только сцена для участников, но и пространство для вдохновения, новых идей и сильных выступлений.
С уважением,
Команда чемпионата «Тень»`,
    },
    {
      id: "payment_reminder",
      label: "Напоминание об оплате",
      subject: "Напоминание об оплате основного взноса",
      body:
`Здравствуйте!
Напоминаем, что для подтверждения участия в чемпионате «Тень» необходимо оплатить основной взнос участника.
Срок оплаты: до 21 сентября.
Ссылка на оплату:
[ссылка на оплату]
После оплаты ваше участие будет подтверждено.
С уважением,
Команда чемпионата «Тень»`,
    },
    {
      id: "video_issue",
      label: "Не открывается видео",
      subject: "Не открывается видео для видеоотбора",
      body:
`Здравствуйте!
Мы проверили вашу заявку, но ссылка на видео не открывается или доступ к видео ограничен.
Пожалуйста, откройте доступ по ссылке или пришлите новую ссылку на видео.
Видео можно разместить на YouTube, VK, Google Диске, Яндекс Диске или другой платформе. Главное — чтобы доступ был открыт для просмотра по ссылке.
С уважением,
Команда чемпионата «Тень»`,
    },
  ];

  const el = {
    loginScreen: document.getElementById("login-screen"),
    loginForm: document.getElementById("login-form"),
    tokenInput: document.getElementById("token-input"),
    loginError: document.getElementById("login-error"),
    app: document.getElementById("app"),
    appLoading: document.getElementById("app-loading"),
    tabbarSettings: document.getElementById("tabbar-settings"),
    tabbarBtns: Array.from(document.querySelectorAll(".tabbar-btn[data-tab]")),
    tabbarRefresh: document.getElementById("tabbar-refresh"),
    tabAppsCount: document.getElementById("tab-apps-count"),
    tabChatsCount: document.getElementById("tab-chats-count"),
    tabSponsorsCount: document.getElementById("tab-sponsors-count"),
    tabTicketsCount: document.getElementById("tab-tickets-count"),
    tabShowCount: document.getElementById("tab-show-count"),
    tabAnalyticsCount: document.getElementById("tab-analytics-count"),
    viewApps: document.getElementById("view-apps"),
    viewChats: document.getElementById("view-chats"),
    viewSponsors: document.getElementById("view-sponsors"),
    viewTickets: document.getElementById("view-tickets"),
    viewShow: document.getElementById("view-show"),
    viewAnalytics: document.getElementById("view-analytics"),
    showList: document.getElementById("show-list"),
    showEmpty: document.getElementById("show-empty"),
    showSearch: document.getElementById("show-search"),
    showKindFilter: document.getElementById("show-kind-filter"),
    ticketsList: document.getElementById("tickets-list"),
    ticketsEmpty: document.getElementById("tickets-empty"),
    ticketsSearch: document.getElementById("tickets-search"),
    ticketsStatusFilter: document.getElementById("tickets-status-filter"),
    ticketsPromoFilter: document.getElementById("tickets-promo-filter"),
    ticketsStats: document.getElementById("tickets-stats"),
    ticketsSummaryStats: document.getElementById("tickets-summary-stats"),
    tabFeesCount: document.getElementById("tab-fees-count"),
    viewFees: document.getElementById("view-fees"),
    feesList: document.getElementById("fees-list"),
    feesEmpty: document.getElementById("fees-empty"),
    feesSearch: document.getElementById("fees-search"),
    feesStatusFilter: document.getElementById("fees-status-filter"),
    feesCategoryFilter: document.getElementById("fees-category-filter"),
    feesPromoFilter: document.getElementById("fees-promo-filter"),
    feesStats: document.getElementById("fees-stats"),
    analyticsList: document.getElementById("analytics-list"),
    analyticsEmpty: document.getElementById("analytics-empty"),
    analyticsStats: document.getElementById("analytics-stats"),
    sponsorsList: document.getElementById("sponsors-list"),
    sponsorsEmpty: document.getElementById("sponsors-empty"),
    sponsorsSearch: document.getElementById("sponsors-search"),
    appsGrid: document.getElementById("apps-grid"),
    appsEmpty: document.getElementById("apps-empty"),
    appsSearch: document.getElementById("apps-search"),
    categoryFilter: document.getElementById("category-filter"),
    statusFilter: document.getElementById("status-filter"),
    extraFilter: document.getElementById("extra-filter"),
    promoFilter: document.getElementById("promo-filter"),
    appsSummaryStats: document.getElementById("apps-summary-stats"),
    appsSummaryCats: document.getElementById("apps-summary-cats"),
    appsSummaryAccepted: document.getElementById("apps-summary-accepted"),
    appsSummaryPrices: document.getElementById("apps-summary-prices"),
    deletedArchiveList: document.getElementById("deleted-archive-list"),
    deletedArchiveEmpty: document.getElementById("deleted-archive-empty"),
    chatsList: document.getElementById("chats-list"),
    chatsEmpty: document.getElementById("chats-empty"),
    chatsSearch: document.getElementById("chats-search"),
    drawer: document.getElementById("drawer"),
    drawerBackdrop: document.getElementById("drawer-backdrop"),
    drawerBody: document.getElementById("drawer-body"),
    drawerClose: document.getElementById("drawer-close"),
    toast: document.getElementById("toast"),
    alert: document.getElementById("alert"),
    alertBackdrop: document.getElementById("alert-backdrop"),
    alertTitle: document.getElementById("alert-title"),
    alertMessage: document.getElementById("alert-message"),
    alertCancel: document.getElementById("alert-cancel"),
    alertOk: document.getElementById("alert-ok"),
  };

  const SHOW_KIND_LABELS = {
    collaboration: "Коллаборация",
    coproduction: "Сопродюсирование",
    contact: "Связаться",
    support: "Поддержка",
    vip: "VIP-ложа",
  };
  const SPONSOR_STATUS_LABELS = { new: "Новая", handled: "Обработана", archived: "Архив" };
  const SPONSOR_STATUS_ORDER = ["new", "handled", "archived"];

  const state = {
    apps: [],
    forms: [],
    formSchema: null,
    chats: [],
    sponsors: [],
    tickets: [],
    showLeads: [],
    events: [],
    deletedApps: [],
    analyticsStats: { total: 0, today: 0, last7: 0, last30: 0, uniqueDevices: 0 },
    emailEnabled: false,
    inboxEnabled: false,
    tab: "apps",
    booted: false,
    drawer: { kind: null, appId: null, chatId: null },
  };

  let syncing = false;

  function setLoading(on) {
    if (el.appLoading) el.appLoading.hidden = !on;
  }

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

  // Apple-style подтверждение по центру экрана.
  let alertResolver = null;
  function closeAlert(result) {
    if (!el.alert || el.alert.hidden) return;
    el.alert.classList.remove("is-open");
    el.alertBackdrop.classList.remove("is-open");
    setTimeout(() => {
      el.alert.hidden = true;
      el.alertBackdrop.hidden = true;
    }, 280);
    if (alertResolver) {
      const r = alertResolver;
      alertResolver = null;
      r(result);
    }
  }
  function showConfirm({ title, message }) {
    return new Promise((resolve) => {
      alertResolver = resolve;
      el.alertTitle.textContent = title;
      el.alertMessage.textContent = message;
      el.alert.hidden = false;
      el.alertBackdrop.hidden = false;
      requestAnimationFrame(() => {
        el.alert.classList.add("is-open");
        el.alertBackdrop.classList.add("is-open");
      });
    });
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

  // Если основной адрес (RU-прокси) не отвечает за 8 секунд или падает по сети,
  // переключаемся на прямой адрес Railway и запоминаем это до перезагрузки.
  const FALLBACK_API_BASE = (window.SHADOW_ADMIN_CONFIG?.FALLBACK_API_BASE || "").replace(/\/$/, "");
  let activeApiBase = API_BASE;
  let apiFallbackNotified = false;
  async function fetchWithTimeout(url, options, ms) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      return await fetch(url, { ...options, signal: ctrl.signal });
    } finally {
      clearTimeout(t);
    }
  }
  async function apiFetch(path, options) {
    if (!FALLBACK_API_BASE || activeApiBase !== API_BASE) {
      return fetchWithTimeout(`${activeApiBase}${path}`, options, 25000);
    }
    try {
      return await fetchWithTimeout(`${API_BASE}${path}`, options, 8000);
    } catch (err) {
      activeApiBase = FALLBACK_API_BASE;
      if (!apiFallbackNotified) {
        apiFallbackNotified = true;
        toast("Основной сервер не отвечает, работаем через запасной адрес", "err");
      }
      return fetchWithTimeout(`${FALLBACK_API_BASE}${path}`, options, 25000);
    }
  }

  async function api(path, options = {}) {
    const token = getToken();
    const res = await apiFetch(path, {
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

  // ── Категории / промо в фильтр ──
  function fillCategoryFilter() {
    for (const [value, label] of Object.entries(CATEGORY_LABELS)) {
      const opt = document.createElement("option");
      opt.value = value; opt.textContent = label;
      el.categoryFilter.appendChild(opt);
    }
  }

  function fillPromoFilter() {
    if (!el.promoFilter) return;
    const prev = el.promoFilter.value;
    const codes = new Set();
    for (const a of state.apps || []) {
      if (a.promoCode) codes.add(String(a.promoCode).toUpperCase());
    }
    // Всегда показываем известные коды, даже если ещё не использовались
    ["WELCOME", "ZVEZDA", "PROBRO"].forEach((c) => codes.add(c));
    el.promoFilter.innerHTML = `<option value="">Все промо</option>`;
    [...codes].sort().forEach((code) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = code;
      el.promoFilter.appendChild(opt);
    });
    if (prev) el.promoFilter.value = prev;
  }

  function setBadge(badgeEl, count) {
    if (!badgeEl) return;
    badgeEl.textContent = count;
    badgeEl.dataset.zero = count > 0 ? "0" : "1";
  }

  // ── Загрузка данных ──
  async function syncFreshData({ fetchInbox = false, silent = false } = {}) {
    if (!getToken() || el.app.hidden || syncing) return;
    syncing = true;
    const firstLoad = !state.booted;
    if (firstLoad) setLoading(true);
    try {
      if (fetchInbox) {
        await api("/api/applications/inbox/fetch", { method: "POST" }).catch(() => {});
      }

      const [apps, chats, sponsors, tickets, showLeads, analytics, deleted, forms, formSchema] = await Promise.all([
        api("/api/applications?limit=1000"),
        api("/api/ai/chats?limit=500").catch(() => ({ items: [] })),
        api("/api/sponsors?limit=1000").catch(() => ({ items: [] })),
        api("/api/tickets?limit=2000").catch(() => ({ items: [] })),
        api("/api/show-leads?limit=1000").catch(() => ({ items: [] })),
        api("/api/events?type=vinovnali_click&limit=1000").catch(() => ({ items: [], stats: null })),
        api("/api/applications/deleted/list?limit=300").catch(() => ({ items: [] })),
        api("/api/forms").catch(() => ({ items: [] })),
        state.formSchema ? Promise.resolve(null) : api("/api/forms/schema").catch(() => null),
      ]);
      state.forms = forms.items || [];
      if (formSchema && formSchema.schema) state.formSchema = formSchema.schema;
      state.apps = apps.items || [];
      state.emailEnabled = Boolean(apps.emailEnabled);
      state.inboxEnabled = Boolean(apps.inboxEnabled);
      state.chats = chats.items || [];
      state.sponsors = sponsors.items || [];
      state.tickets = tickets.items || [];
      state.showLeads = showLeads.items || [];
      state.events = analytics.items || [];
      state.deletedApps = deleted.items || [];
      if (analytics.stats) state.analyticsStats = analytics.stats;
      fillPromoFilter();
      setBadge(el.tabChatsCount, state.chats.length);
      setBadge(el.tabSponsorsCount, state.sponsors.filter((s) => (s.status || "new") === "new").length);
      setBadge(el.tabTicketsCount, state.tickets.filter((t) => t.status === "paid").reduce((n, t) => n + (Number(t.quantity) || 1), 0));
      setBadge(el.tabShowCount, state.showLeads.filter((s) => (s.status || "new") === "new").length);
      setBadge(el.tabAnalyticsCount, state.analyticsStats.today || 0);
      renderApps();
      renderChats();
      renderSponsors();
      renderTickets();
      renderFees();
      renderShowLeads();
      renderAnalytics();
      refreshOpenDrawer({ preserveScroll: true });
    } catch (err) {
      if (err.message === "unauthorized") return;
      if (!silent) toast(`Ошибка загрузки: ${err.message}`, "err");
    } finally {
      syncing = false;
      if (firstLoad) { state.booted = true; setLoading(false); }
    }
  }

  async function loadAll() {
    if (!getToken()) return showLogin();
    await syncFreshData({ fetchInbox: true });
  }

  function isReplyDraftOpen() {
    const ta = document.getElementById("reply-message");
    const subj = document.getElementById("reply-subject");
    if (!ta) return false;
    return document.activeElement === ta
      || document.activeElement === subj
      || ta.value.trim().length > 0
      || (subj && subj.value.trim().length > 0);
  }

  function refreshOpenDrawer({ preserveScroll = false } = {}) {
    if (el.drawer.hidden) return;
    if (state.drawer.kind === "app" && state.drawer.appId) {
      if (isReplyDraftOpen() || isOsEditing()) return;
      const a = state.apps.find((x) => x.id === state.drawer.appId);
      if (a) openAppDrawer(a.id, { preserveScroll });
      return;
    }
    if (state.drawer.kind === "chat" && state.drawer.chatId) {
      const c = state.chats.find((x) => x.sessionId === state.drawer.chatId);
      if (c) openChatDrawer(c.sessionId, { preserveScroll });
      return;
    }
    if (state.drawer.kind === "sponsor" && state.drawer.sponsorId) {
      const s = state.sponsors.find((x) => x.id === state.drawer.sponsorId);
      if (s) openSponsorDrawer(s.id, { preserveScroll });
      return;
    }
    if (state.drawer.kind === "ticket" && state.drawer.ticketId) {
      const t = state.tickets.find((x) => x.id === state.drawer.ticketId);
      if (t) openTicketDrawer(t.id, { preserveScroll });
      return;
    }
    if (state.drawer.kind === "show" && state.drawer.showId) {
      const s = state.showLeads.find((x) => x.id === state.drawer.showId);
      if (s) openShowDrawer(s.id, { preserveScroll });
    }
  }

  async function openAppFromList(id) {
    try {
      const res = await api(`/api/applications/${id}`);
      const idx = state.apps.findIndex((x) => x.id === id);
      if (idx >= 0) state.apps[idx] = res.item;
      else state.apps.unshift(res.item);
    } catch { /* откроем из кэша */ }
    openAppDrawer(id);
  }

  // Оплачено ли — независимо от рабочего статуса. Старые заявки (до новой
  // модели) имеют статус «Новая», но с суммой в paidAmount — тоже оплачены.
  function isPaid(a) {
    return a.status === "paid" || Number(a.paidAmount) > 0;
  }

  function appCategories(a) {
    if (Array.isArray(a.categories) && a.categories.length) return a.categories;
    return a.category ? [a.category] : [];
  }

  function categoryStatus(a, cat) {
    const map = a.categoryStatuses && typeof a.categoryStatuses === "object" ? a.categoryStatuses : {};
    if (map[cat]) return map[cat];
    // fallback: глобальный workflow / reviewing для оплаченных
    if (WORKFLOW_STATUSES.includes(a.status)) return a.status;
    return isPaid(a) ? "reviewing" : (a.status || "awaiting_payment");
  }

  function hasCategory(a, cat) {
    return !cat || appCategories(a).includes(cat) || a.category === cat;
  }

  // Совпадает ли заявка со статусом.
  // Если выбрана категория (scopedCategory) — статус смотрим ТОЛЬКО в ней
  // (иначе Ева Винтер с «Тень·Отклонена» + «Соло·Прошёл» попадала в оба фильтра).
  function matchesStatus(a, value, scopedCategory = "") {
    if (!value) return true;
    if (value === "paid") return isPaid(a);
    if (value === "awaiting_payment") return a.status === "awaiting_payment" && !isPaid(a);
    if (WORKFLOW_STATUSES.includes(value)) {
      if (scopedCategory) {
        return hasCategory(a, scopedCategory) && categoryStatus(a, scopedCategory) === value;
      }
      return appCategories(a).some((c) => categoryStatus(a, c) === value)
        || (a.status || "") === value;
    }
    return (a.status || "new") === value;
  }

  // Разбивает «@a, @b» / «a b» / ссылки на отдельные токены.
  function splitSocialValues(raw) {
    return String(raw || "")
      .split(/[,;\n]+/)
      .flatMap((part) => {
        const t = part.trim();
        if (!t) return [];
        if (/^https?:\/\//i.test(t)) return [t];
        return t.split(/\s+/).filter(Boolean);
      });
  }

  function normalizeTelegram(token) {
    const v = String(token || "").trim();
    if (!v) return null;
    const fromUrl = v.match(/^(?:https?:\/\/)?(?:t\.me|telegram\.me)\/@?([A-Za-z0-9_]{3,32})/i);
    if (fromUrl) {
      const nick = fromUrl[1];
      return { href: `https://t.me/${nick}`, label: `@${nick}` };
    }
    const nick = v.replace(/^@/, "");
    if (!/^[A-Za-z0-9_]{3,32}$/.test(nick)) return null;
    return { href: `https://t.me/${nick}`, label: `@${nick}` };
  }

  function normalizeInstagram(token) {
    const v = String(token || "").trim();
    if (!v) return null;
    const fromUrl = v.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([A-Za-z0-9._]{1,30})/i);
    if (fromUrl) {
      const nick = fromUrl[1].replace(/\/+$/, "");
      return { href: `https://www.instagram.com/${nick}/`, label: `@${nick}` };
    }
    const nick = v.replace(/^@/, "").replace(/\/+$/, "");
    if (!/^[A-Za-z0-9._]{1,30}$/.test(nick)) return null;
    return { href: `https://www.instagram.com/${nick}/`, label: `@${nick}` };
  }

  // Несколько юзернеймов → несколько кликабельных ссылок.
  function socialLinksHtml(raw, kind) {
    const tokens = splitSocialValues(raw);
    const links = tokens
      .map((t) => (kind === "tg" ? normalizeTelegram(t) : normalizeInstagram(t)))
      .filter(Boolean);
    if (!links.length) return esc(raw || "—");
    return links
      .map((l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener noreferrer">${esc(l.label)}</a>`)
      .join(", ");
  }

  // Обновляет подписи фильтров: «Оплачено (12)» и т.п.
  // В категориях считаем ТОЛЬКО оплаченные (как просил заказчик).
  function updateFilterCounts() {
    const apps = state.apps || [];
    const paid = apps.filter(isPaid);
    const cat = el.categoryFilter.value;
    const st = el.statusFilter.value;
    for (const opt of el.statusFilter.options) {
      if (opt.dataset.base === undefined) opt.dataset.base = opt.textContent.replace(/\s*\(\d+\)$/, "");
      // Счётчик статуса в разрезе выбранной категории
      let n;
      if (!cat && WORKFLOW_STATUSES.includes(opt.value)) {
        // Общий workflow-счётчик — это количество категорий, а не карточек.
        // Одна заявка, прошедшая в двух категориях, должна дать +2.
        n = apps.reduce((total, a) => total + appCategories(a)
          .filter((c) => categoryStatus(a, c) === opt.value).length, 0);
      } else {
        n = apps.filter((a) => {
          if (cat && !hasCategory(a, cat)) return false;
          if (cat && (!opt.value || opt.value === "paid") && !isPaid(a) && opt.value !== "awaiting_payment") return false;
          return matchesStatus(a, opt.value, cat);
        }).length;
      }
      opt.textContent = `${opt.dataset.base} (${n})`;
    }
    for (const opt of el.categoryFilter.options) {
      if (opt.dataset.base === undefined) opt.dataset.base = opt.textContent.replace(/\s*\(\d+\)$/, "");
      const n = opt.value
        ? paid.filter((a) => hasCategory(a, opt.value) && matchesStatus(a, st, opt.value)).length
        : paid.filter((a) => matchesStatus(a, st)).length;
      opt.textContent = `${opt.dataset.base} (${n})`;
    }
    if (el.promoFilter) {
      for (const opt of el.promoFilter.options) {
        if (opt.dataset.base === undefined) opt.dataset.base = opt.textContent.replace(/\s*\(\d+\)$/, "");
        const n = opt.value
          ? apps.filter((a) => (a.promoCode || "").toUpperCase() === opt.value).length
          : apps.filter((a) => a.promoCode).length;
        if (opt.value === "") {
          opt.textContent = opt.dataset.base; // «Все промо» без числа всех заявок
        } else {
          opt.textContent = `${opt.dataset.base} (${n})`;
        }
      }
    }
  }

  // ── Рендер заявок ──
  function filteredApps() {
    const q = el.appsSearch.value.trim().toLowerCase();
    const cat = el.categoryFilter.value;
    const st = el.statusFilter.value;
    const extra = el.extraFilter ? el.extraFilter.value : "";
    const promo = el.promoFilter ? el.promoFilter.value : "";
    return state.apps.filter((a) => {
      if (state.onlyNeedsReply && !needsReply(a)) return false;
      if (cat && !hasCategory(a, cat)) return false;
      // В разрезе категории показываем только оплаченные (если выбран статус «все» или «оплачено»).
      if (cat && (!st || st === "paid") && !isPaid(a)) return false;
      // Статус + категория = AND внутри этой категории
      if (!matchesStatus(a, st, cat)) return false;
      if (promo && (a.promoCode || "").toUpperCase() !== promo) return false;
      if (extra === "needs_reply" && !needsReply(a)) return false;
      if (extra === "has_messages" && !hasRealCorrespondence(a)) return false;
      if (extra === "os_yes" && !a.feedbackGiven) return false;
      if (extra === "os_no" && a.feedbackGiven) return false;
      if (extra === "fee_paid" && a.feeStatus !== "paid") return false;
      if (extra === "fee_unpaid" && (a.feeStatus === "paid" || !acceptedCategories(a).length)) return false;
      if (extra === "form_yes" && !formsSubmitted(a).length) return false;
      if (extra === "form_no" && (!acceptedCategories(a).length || formsSubmitted(a).length >= acceptedCategories(a).length)) return false;
      if (extra === "fee_form_no" && (!acceptedCategories(a).length || (a.feeStatus === "paid" && formsSubmitted(a).length >= acceptedCategories(a).length))) return false;
      if (q) {
        const hay = `${a.fullName} ${a.email} ${a.phone} ${a.telegram} ${a.instagram} ${a.city} ${a.promoCode || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function statusChip(status) {
    const s = status || "new";
    return `<span class="chip st-${esc(s)}"><span class="status-dot"></span>${esc(statusLabel(s))}</span>`;
  }

  // Письмо «требует ответа»: последнее сообщение — от участника и не помечено «не требует ответа».
  function needsReply(a) {
    const msgs = Array.isArray(a.messages) ? a.messages : [];
    if (!msgs.length) return false;
    const last = msgs[msgs.length - 1];
    if (last.direction !== "in") return false;
    if (a.lastHandledMsgId && a.lastHandledMsgId === last.id) return false;
    return true;
  }

  // Автоподтверждение и шаблоны с ОС не считаются перепиской —
  // иначе после рассылки ОС фильтр «Есть переписка» покажет всех.
  function isIgnoredCorrespondenceMsg(m) {
    if (!m) return true;
    if (m.direction === "in") return false;
    const kind = String(m.kind || "").toLowerCase();
    if (kind === "auto" || kind === "template" || kind === "scheduled") return true;
    const blob = `${m.subject || ""} ${m.text || ""}`.toLowerCase();
    if (blob.includes("обратная связь от кристины")) return true;
    if (blob.includes("заявка принята")) return true;
    if (blob.includes("автоматическое письмо-подтверждение")) return true;
    return false;
  }

  function realCorrespondenceMessages(a) {
    return (Array.isArray(a.messages) ? a.messages : []).filter((m) => !isIgnoredCorrespondenceMsg(m));
  }

  function hasRealCorrespondence(a) {
    return realCorrespondenceMessages(a).length > 0;
  }

  function fillTemplateBody(tpl, a) {
    const firstName = (a.fullName || "").trim().split(/\s+/)[0] || "";
    const os = (a.feedbackText || "").trim();
    return tpl.body
      .replace(/\[Имя\]/g, firstName || "[Имя]")
      .replace(/\[индивидуальная обратная связь\]/g, os || "[индивидуальная обратная связь]")
      .replace(/\[ссылка на оплату\]/g, PAY_LINK)
      .replace(/\[ссылка\]/g, PAY_LINK);
  }

  function localDateTimeToIso(value) {
    const raw = String(value || "").trim();
    const m = raw.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
    if (!m) return "2026-09-14T08:00:00.000Z";
    return new Date(`${m[1]}:00+03:00`).toISOString();
  }

  function isoToLocalDateTime(iso) {
    if (!iso) return DEFAULT_BULK_SEND;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return DEFAULT_BULK_SEND;
    const parts = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Moscow",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const get = (t) => parts.find((p) => p.type === t)?.value || "";
    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
  }

  function ticketPriceBuckets() {
    const paid = (state.tickets || []).filter((t) => t.status === "paid");
    let p2000 = 0;
    let p1500 = 0;
    let p0 = 0;
    let kris = 0;
    let see = 0;
    for (const t of paid) {
      const qty = Number(t.quantity) || 1;
      const unit = Number(t.unitPrice) || (Number(t.paidAmount) / qty) || 0;
      const code = (t.promoCode || "").toUpperCase();
      if (code === "KRISBRO") kris += 1;
      if (code === "SEEYOUSOON") see += 1;
      if (unit === 0 || code === "SEEYOUSOON") p0 += 1;
      else if (unit === 1500 || code === "KRISBRO") p1500 += 1;
      else p2000 += 1;
    }
    return { paid: paid.length, p2000, p1500, p0, kris, see };
  }

  function buildAppCardHtml(a) {
    const msgs = Array.isArray(a.messages) ? a.messages : [];
    const nr = needsReply(a);
    const cardCats = appCategories(a);
    const cardCatsHtml = cardCats.map((c) => {
      const st = categoryStatus(a, c);
      const showSt = WORKFLOW_STATUSES.includes(st);
      let extra = "";
      if (c === "battle" && a.battleLevel) {
        extra = a.battleLevel === "amateur" ? " · любители" : (a.battleLevel === "professional" ? " · профи" : "");
      }
      if (c === "shadow" && a.shadowType) {
        extra = a.shadowType === "solo" ? " · соло" : (a.shadowType === "duet" ? " · дуэт" : (a.shadowType === "group" ? " · группы" : ""));
      }
      return `<span class="chip chip-cat">${esc(catLabel(c))}${extra}${showSt ? " · " + esc(statusLabel(st)) : ""}</span>`;
    }).join("");
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
        ${nr
          ? `<span class="chip chip-reply">✉ требует ответа</span>`
          : (hasRealCorrespondence(a) ? `<span class="chip chip-muted">✉ ${realCorrespondenceMessages(a).length}</span>` : "")}
        ${a.feedbackGiven ? `<span class="chip chip-os">ОС ✓</span>` : ""}
        ${a.feedbackText ? `<span class="chip chip-muted">заметка ОС</span>` : ""}
        ${a.scheduledSendAt && !a.scheduledSentAt ? `<span class="chip chip-muted">⏰ ${esc(fmtDate(a.scheduledSendAt))}</span>` : ""}
        ${a.promoCode ? `<span class="chip chip-promo">🎟 ${esc(a.promoCode)}</span>` : ""}
        ${feeChipHtml(a)}
        ${formChipHtml(a)}
      </div>`;
  }

  // ── Анкеты участников ──
  function formsOf(a) { return (state.forms || []).filter((f) => f.applicationId === a.id); }
  function formsSubmitted(a) { return formsOf(a).filter((f) => f.status === "submitted"); }
  function formChipHtml(a) {
    const acc = acceptedCategories(a);
    if (!acc.length && !formsOf(a).length) return "";
    const done = formsSubmitted(a).length;
    const drafts = formsOf(a).filter((f) => f.status === "draft").length;
    if (done && done >= acc.length) return `<span class="chip st-paid"><span class="status-dot"></span>Анкета ✓${acc.length > 1 ? ` ${done}/${acc.length}` : ""}</span>`;
    if (done) return `<span class="chip chip-os">Анкета ${done}/${acc.length}</span>`;
    if (drafts) return `<span class="chip chip-muted">Анкета: черновик</span>`;
    return `<span class="chip chip-muted">Анкета не заполнена</span>`;
  }
  const FORM_FORMAT_LABELS = { solo: "Соло", duet: "Дуэт", team: "Команда" };
  function formQuestions() {
    const s = state.formSchema;
    if (!s) return [];
    const out = [];
    for (const sec of s.sections) for (const q of sec.questions) out.push({ ...q, section: sec.title });
    return out;
  }
  function formQuestionVisible(q, f) {
    const ans = f.answers || {};
    if (q.formats && !q.formats.includes(f.format)) return false;
    if (q.showIf) {
      const v = String(ans[q.showIf.q] ?? "").trim();
      if (q.showIf.in && !q.showIf.in.includes(v)) return false;
      if (q.showIf.notIn && q.showIf.notIn.includes(v)) return false;
    }
    return true;
  }
  function formAnswerText(q, f) {
    const v = (f.answers || {})[q.id];
    if (q.type === "list") return (Array.isArray(v) ? v : []).filter(Boolean).map((x, i) => `${i + 1}. ${x}`).join("\n");
    if (q.type === "helpers") return (Array.isArray(v) ? v : []).filter((x) => x && (x.name || x.phone)).map((x, i) => `${i + 1}. ${x.name || "—"} · ${x.phone || "—"}`).join("\n");
    return v === undefined || v === null ? "" : String(v);
  }
  function formConsentText(c, f) {
    const v = (f.consents || {})[c.id];
    return c.type === "radio" ? String(v || "") : (v === true ? "Да" : "—");
  }

  // Отдельная выгрузка анкет: ФИО/контакты/категория/формат/дата/статус, затем все ответы по схеме.
  async function exportFormsExcel(btn) {
    const forms = (state.forms || []).filter((f) => f.status === "submitted" || f.status === "draft");
    if (!forms.length) { toast("Анкет пока нет", "err"); return; }
    const label = btn ? btn.querySelector("span") : null;
    const prev = label ? label.textContent : "";
    if (btn) { btn.disabled = true; if (label) label.textContent = "Готовим…"; }
    try {
      const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs");
      const qs = formQuestions();
      const consents = (state.formSchema && state.formSchema.consents) || [];
      const rows = forms
        .sort((a, b) => ((a.submittedAt || a.updatedAt) < (b.submittedAt || b.updatedAt) ? 1 : -1))
        .map((f) => {
          const a = (state.apps || []).find((x) => x.id === f.applicationId) || {};
          const row = {
            "ФИО / контактное лицо": f.answers?.solo_full_name || f.answers?.duet_contact || f.answers?.team_contact || a.fullName || "",
            "Имя из заявки": a.fullName || "",
            "Email": a.email || f.email || "",
            "Телефон": a.phone || "",
            "Instagram": a.instagram || "",
            "Telegram": a.telegram || "",
            "Категория": catLabel(f.category),
            "Формат": FORM_FORMAT_LABELS[f.format] || f.format,
            "Дата заполнения": f.submittedAt ? fmtDate(f.submittedAt) : (f.updatedAt ? fmtDate(f.updatedAt) + " (черновик)" : ""),
            "Статус анкеты": f.status === "submitted" ? "Отправлена" : "Черновик",
            "Взнос": a.feeStatus === "paid" ? "Оплачен" : "Не оплачен",
          };
          for (const q of qs) row[q.label] = formQuestionVisible(q, f) ? formAnswerText(q, f) : "";
          for (const c of consents) row[c.label.slice(0, 60)] = formConsentText(c, f);
          row["История правок"] = (f.editHistory || []).map((h) => `${fmtDate(h.at)} — ${h.by === "admin" ? "орг: " : ""}${h.comment || ""}`).join("\n");
          return row;
        });
      const ws = XLSX.utils.json_to_sheet(rows);
      const firstCols = [26, 22, 26, 16, 16, 16, 22, 10, 18, 14, 12];
      ws["!cols"] = [...firstCols, ...qs.map(() => ({ wch: 28 })).map((x) => x.wch), ...consents.map(() => 14), 40].map((wch) => ({ wch }));
      if (ws["!ref"]) ws["!autofilter"] = { ref: ws["!ref"] };
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Анкеты");
      XLSX.writeFile(wb, `teni-ankety-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast(`Выгружено анкет: ${rows.length}`, "ok");
    } catch (err) {
      toast(`Не удалось выгрузить: ${err.message}`, "err");
    } finally {
      if (btn) { btn.disabled = false; if (label) label.textContent = prev; }
    }
  }

  // Блок анкет в карточке заявки: ответы по секциям + правка с причиной.
  function formsSectionHtml(a) {
    const acc = acceptedCategories(a);
    const forms = formsOf(a);
    if (!acc.length && !forms.length) return "";
    const cats = [...new Set([...acc, ...forms.map((f) => f.category)])];
    const items = cats.map((c) => {
      const f = forms.find((x) => x.category === c);
      const link = `https://xn----7sbocmxidei1bb9cwe.xn--p1ai/anketa.html?id=${encodeURIComponent(a.id)}&cat=${encodeURIComponent(c)}`;
      if (!f) {
        return `<div class="form-card"><div class="form-card-head"><b>${esc(catLabel(c))}</b><span class="chip chip-muted">Не заполнена</span></div>
          <div class="os-note-actions"><button type="button" class="btn btn-ghost" data-copy-link="${esc(link)}">Скопировать ссылку на анкету</button></div></div>`;
      }
      const qs = formQuestions().filter((q) => formQuestionVisible(q, f));
      let lastSection = "";
      const rowsHtml = qs.map((q) => {
        const sec = q.section !== lastSection ? `<div class="form-sec">${esc(q.section)}</div>` : "";
        lastSection = q.section;
        const val = formAnswerText(q, f);
        return `${sec}<div class="form-row" data-form-q="${esc(q.id)}"><span class="form-q">${esc(q.label)}</span><span class="form-a">${val ? esc(val).replace(/\n/g, "<br>") : "—"}</span><button type="button" class="form-edit-btn" data-form-edit="${esc(f.id)}" data-q="${esc(q.id)}" title="Изменить ответ">✎</button></div>`;
      }).join("");
      const consents = ((state.formSchema && state.formSchema.consents) || []).map((c) => `<div class="form-row"><span class="form-q">${esc(c.label.slice(0, 70))}${c.label.length > 70 ? "…" : ""}</span><span class="form-a">${esc(formConsentText(c, f))}</span></div>`).join("");
      const hist = (f.editHistory || []).slice(0, 10).map((h) => `${esc(fmtDate(h.at))} — ${h.by === "admin" ? "орг: " : ""}${esc(h.comment || "")}`).join("<br>");
      return `<div class="form-card">
        <div class="form-card-head"><b>${esc(catLabel(c))} · ${esc(FORM_FORMAT_LABELS[f.format] || f.format)}</b>
          <span class="chip ${f.status === "submitted" ? "st-paid" : "chip-muted"}">${f.status === "submitted" ? "Отправлена " + esc(fmtDate(f.submittedAt)) : "Черновик · " + esc(fmtDate(f.updatedAt))}</span></div>
        <details class="d-details"><summary>Ответы (${qs.length})</summary>
          <div class="form-rows">${rowsHtml}<div class="form-sec">Подтверждения и согласия</div>${consents}</div>
          ${hist ? `<div class="form-sec">История</div><p class="d-hint">${hist}</p>` : ""}
        </details>
        <div class="os-note-actions"><button type="button" class="btn btn-ghost" data-copy-link="${esc(link)}">Скопировать ссылку на анкету</button></div>
      </div>`;
    }).join("");
    return `<div class="d-section-title">Анкеты участника</div>${items}`;
  }

  function bindFormsSection(a) {
    el.drawerBody.querySelectorAll("[data-copy-link]").forEach((btn) => btn.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(btn.dataset.copyLink); toast("Ссылка скопирована", "ok"); }
      catch { window.prompt("Ссылка на анкету:", btn.dataset.copyLink); }
    }));
    el.drawerBody.querySelectorAll("[data-form-edit]").forEach((btn) => btn.addEventListener("click", async () => {
      const f = (state.forms || []).find((x) => x.id === btn.dataset.formEdit);
      const q = formQuestions().find((x) => x.id === btn.dataset.q);
      if (!f || !q) return;
      if (q.type === "list" || q.type === "helpers") { toast("Списки участников правятся участником через анкету", "err"); return; }
      const current = formAnswerText(q, f);
      const next = window.prompt(`${q.label}${q.options ? "\nВарианты: " + q.options.join(" / ") : ""}`, current);
      if (next === null || next === current) return;
      const reason = window.prompt("Почему меняем ответ? Причина попадёт в историю анкеты.", "");
      if (reason === null) return;
      if (reason.trim().length < 3) { toast("Укажите причину", "err"); return; }
      try {
        const res = await api(`/api/forms/${f.id}/edit`, { method: "POST", body: JSON.stringify({ answers: { [q.id]: next }, editComment: reason.trim() }) });
        const idx = state.forms.findIndex((x) => x.id === f.id);
        if (idx >= 0) state.forms[idx] = res.item;
        openAppDrawer(a.id, { preserveScroll: true });
        toast("Ответ изменён, причина записана", "ok");
      } catch (err) {
        toast(`Не удалось: ${err.message}`, "err");
      }
    }));
  }

  // ── Взнос за участие ──
  const FEE_PRICES = { solo: 10000, battle: 9000, duet: 7000, team: 4500 };
  const FEE_LABELS = { paid: "Взнос оплачен", awaiting_payment: "Взнос: начал оплату" };

  function acceptedCategories(a) {
    return appCategories(a).filter((c) => categoryStatus(a, c) === "accepted");
  }
  function feeKind(a, cat) {
    if (cat === "battle") return "battle";
    if (cat === "duet") return "duet";
    if (cat === "team") return "team";
    if (cat === "shadow") return a.shadowType === "duet" ? "duet" : (a.shadowType === "group" ? "team" : "solo");
    return "solo";
  }
  // Ожидаемая сумма взноса без промокода (для команд — за одного человека, точное число неизвестно).
  function feeExpected(a) {
    return acceptedCategories(a).reduce((s, c) => {
      const k = feeKind(a, c);
      const people = k === "duet" ? 2 : 1;
      return s + FEE_PRICES[k] * people;
    }, 0);
  }
  function feeChipHtml(a) {
    if (a.feeStatus === "paid") {
      return `<span class="chip st-paid"><span class="status-dot"></span>Взнос ${esc((Number(a.feeAmount) || 0).toLocaleString("ru-RU"))} ₽${a.feePromo ? " · " + esc(a.feePromo) : ""}</span>`;
    }
    if (a.feeStatus === "awaiting_payment") {
      return `<span class="chip st-awaiting_payment"><span class="status-dot"></span>Взнос: начал оплату</span>`;
    }
    if (acceptedCategories(a).length && a.status !== "awaiting_payment") {
      return `<span class="chip chip-muted">Взнос не оплачен</span>`;
    }
    return "";
  }
  function fmtRub(n) { return `${(Number(n) || 0).toLocaleString("ru-RU")} ₽`; }

  function feeCandidates() {
    return (state.apps || []).filter((a) => a.feeStatus === "paid" || (a.status !== "awaiting_payment" && acceptedCategories(a).length));
  }

  function filteredFees() {
    const q = (el.feesSearch?.value || "").trim().toLowerCase();
    const st = el.feesStatusFilter ? el.feesStatusFilter.value : "paid";
    const cat = el.feesCategoryFilter ? el.feesCategoryFilter.value : "";
    const promo = el.feesPromoFilter ? el.feesPromoFilter.value : "";
    return feeCandidates()
      .filter((a) => {
        if (st === "paid") return a.feeStatus === "paid";
        if (st === "awaiting_payment") return a.feeStatus === "awaiting_payment";
        if (st === "unpaid") return a.feeStatus !== "paid";
        return true;
      })
      .filter((a) => !cat || (a.feeStatus === "paid" ? (a.feeCategories || []).includes(cat) : acceptedCategories(a).includes(cat)))
      .filter((a) => {
        if (!promo) return true;
        const code = (a.feePromo || "").toUpperCase();
        if (promo === "__none__") return !code;
        return code === promo;
      })
      .filter((a) => !q || `${a.fullName} ${a.email} ${a.phone} ${a.telegram} ${a.feePromo || ""}`.toLowerCase().includes(q))
      .sort((a, b) => {
        const ka = a.feePaidAt || a.feeCreatedAt || a.createdAt || "";
        const kb = b.feePaidAt || b.feeCreatedAt || b.createdAt || "";
        return ka < kb ? 1 : -1;
      });
  }

  function fillFeesCategoryFilter() {
    if (!el.feesCategoryFilter) return;
    const current = el.feesCategoryFilter.value;
    const cats = new Set();
    feeCandidates().forEach((a) => {
      (a.feeStatus === "paid" ? (a.feeCategories || []) : acceptedCategories(a)).forEach((c) => cats.add(c));
    });
    el.feesCategoryFilter.innerHTML = `<option value="">Все категории</option>` +
      [...cats].sort().map((c) => `<option value="${esc(c)}">${esc(catLabel(c))}</option>`).join("");
    if ([...cats].includes(current)) el.feesCategoryFilter.value = current;
  }

  function renderFees() {
    if (!el.feesList) return;
    fillFeesCategoryFilter();
    const all = feeCandidates();
    const paid = all.filter((a) => a.feeStatus === "paid");
    const revenue = paid.reduce((s, a) => s + (Number(a.feeAmount) || 0), 0);
    const started = all.filter((a) => a.feeStatus === "awaiting_payment").length;
    const unpaid = all.filter((a) => a.feeStatus !== "paid").length;
    const expectedUnpaid = all.filter((a) => a.feeStatus !== "paid").reduce((s, a) => s + feeExpected(a), 0);
    const byCat = {};
    paid.forEach((a) => (a.feeCategories || []).forEach((c) => { byCat[c] = (byCat[c] || 0) + 1; }));
    const byPromo = {};
    paid.forEach((a) => { if (a.feePromo) byPromo[a.feePromo] = (byPromo[a.feePromo] || 0) + 1; });
    const box = (label, val) => `<div class="stat-box"><span class="stat-val">${val}</span><span class="stat-label">${label}</span></div>`;
    if (el.feesStats) {
      el.feesStats.innerHTML =
        box("Оплатили взнос", paid.length) +
        box("Сумма, ₽", revenue.toLocaleString("ru-RU")) +
        box("Прошли, не оплатили", unpaid) +
        box("Начали, не завершили", started) +
        box("Ожидается, ₽ (без промо)", expectedUnpaid.toLocaleString("ru-RU")) +
        box("Анкет отправлено", (state.forms || []).filter((f) => f.status === "submitted").length) +
        box("Анкет черновиков", (state.forms || []).filter((f) => f.status === "draft").length) +
        Object.entries(byCat).sort((x, y) => y[1] - x[1]).map(([c, n]) => box(catLabel(c), n)).join("") +
        Object.entries(byPromo).map(([p, n]) => box(p, n)).join("");
    }
    setBadge(el.tabFeesCount, paid.length);
    const items = filteredFees();
    el.feesList.innerHTML = "";
    if (el.feesEmpty) {
      el.feesEmpty.hidden = items.length > 0;
      el.feesEmpty.textContent = "По этому фильтру взносов нет.";
    }
    const frag = document.createDocumentFragment();
    for (const a of items) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "chat-card";
      card.addEventListener("click", () => openAppFromList(a.id));
      const cats = a.feeStatus === "paid" ? (a.feeCategories || []) : acceptedCategories(a);
      const chip = a.feeStatus === "paid"
        ? `<span class="chip st-paid">Оплачен · ${esc(fmtRub(a.feeAmount))}</span>`
        : (a.feeStatus === "awaiting_payment"
          ? `<span class="chip st-awaiting_payment">Начал оплату</span>`
          : `<span class="chip chip-muted">Не оплачен · ожидается ~${esc(fmtRub(feeExpected(a)))}</span>`);
      card.innerHTML = `
        <div class="chat-card-top">
          ${chip}
          <span class="chat-card-id">${esc(fmtDate(a.feePaidAt || a.feeCreatedAt || a.createdAt))}</span>
        </div>
        <div class="app-card-name">${esc(a.fullName || "—")}</div>
        <div class="chat-card-preview">${esc(cats.map(catLabel).join(", ") || "—")}${a.feeParticipants > 1 ? ` · ${a.feeParticipants} чел.` : ""}${a.feePromo ? " · 🎟 " + esc(a.feePromo) : ""} · ${formsSubmitted(a).length ? `анкета ✓ ${formsSubmitted(a).length}/${Math.max(1, acceptedCategories(a).length)}` : "анкеты нет"}</div>
        <div class="chat-card-meta"><span>${esc(a.phone || "—")}${a.email ? " · " + esc(a.email) : ""}</span></div>`;
      frag.appendChild(card);
    }
    el.feesList.appendChild(frag);
  }

  async function exportFeesExcel(btn) {
    const items = filteredFees();
    if (!items.length) { toast("Нет данных для экспорта", "err"); return; }
    const label = btn ? btn.querySelector("span") : null;
    const prev = label ? label.textContent : "";
    if (btn) { btn.disabled = true; if (label) label.textContent = "Готовим…"; }
    try {
      const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs");
      const rows = items.map((a) => ({
        "Дата оплаты": a.feePaidAt ? fmtDate(a.feePaidAt) : "",
        "ФИО": a.fullName || "",
        "Email": a.email || "",
        "Телефон": a.phone || "",
        "Telegram": a.telegram || "",
        "Категории (взнос)": (a.feeStatus === "paid" ? (a.feeCategories || []) : acceptedCategories(a)).map(catLabel).join(", "),
        "Участников": a.feeParticipants || "",
        "Статус взноса": a.feeStatus === "paid" ? "Оплачен" : (a.feeStatus === "awaiting_payment" ? "Начал оплату" : "Не оплачен"),
        "Сумма, ₽": a.feeStatus === "paid" ? (Number(a.feeAmount) || 0) : "",
        "Ожидается, ₽": a.feeStatus !== "paid" ? feeExpected(a) : "",
        "Промокод": a.feePromo || "",
        "ID платежа": a.feePaymentId || "",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [17, 26, 26, 16, 16, 30, 10, 16, 12, 14, 14, 30].map((wch) => ({ wch }));
      if (ws["!ref"]) ws["!autofilter"] = { ref: ws["!ref"] };
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Взносы");
      XLSX.writeFile(wb, `teni-vznosy-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      toast(`Не удалось выгрузить: ${err.message}`, "err");
    } finally {
      if (btn) { btn.disabled = false; if (label) label.textContent = prev; }
    }
  }

  function updateInboxAlert() {
    const banner = document.getElementById("inbox-alert");
    if (!banner) return;
    const count = (state.apps || []).filter(needsReply).length;
    banner.classList.toggle("is-on", !!state.onlyNeedsReply);
    if (state.onlyNeedsReply) {
      banner.hidden = false;
      banner.textContent = "Показаны письма, требующие ответа — сбросить фильтр";
    } else if (count > 0) {
      banner.hidden = false;
      const word = count % 10 === 1 && count % 100 !== 11 ? "письмо требует" : "писем требуют";
      banner.textContent = `${count} ${word} ответа — показать`;
    } else {
      banner.hidden = true;
    }
  }

  // Поле даты над списком показывает реальную ближайшую дату рассылки,
  // а не значение по умолчанию. Пока пользователь его не трогал.
  let bulkSendTouched = false;
  function syncBulkSendField() {
    const atEl = document.getElementById("bulk-send-at");
    if (!atEl || bulkSendTouched) return;
    const pending = (state.apps || [])
      .filter((a) => a.scheduledSendAt && !a.scheduledSentAt)
      .map((a) => a.scheduledSendAt)
      .sort();
    atEl.value = pending.length ? isoToLocalDateTime(pending[0]) : DEFAULT_BULK_SEND;
    const btn = document.getElementById("bulk-schedule");
    if (btn) {
      btn.textContent = pending.length
        ? `Таймер рассылки · ${pending.length} в очереди`
        : "Таймер рассылки";
    }
  }

  function renderApps() {
    updateFilterCounts();
    updateInboxAlert();
    syncBulkSendField();
    const items = filteredApps();
    // Бейдж = число заявок по текущему фильтру (динамически).
    setBadge(el.tabAppsCount, items.length);
    el.appsGrid.innerHTML = "";
    el.appsEmpty.hidden = items.length > 0;
    const frag = document.createDocumentFragment();
    for (const a of items) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "app-card";
      card.addEventListener("click", () => openAppFromList(a.id));
      card.innerHTML = buildAppCardHtml(a);
      frag.appendChild(card);
    }
    el.appsGrid.appendChild(frag);
  }

  // ── Экспорт заявок в Excel (SheetJS подгружается с CDN по клику) ──
  async function exportToExcel(btn) {
    const apps = state.apps || [];
    if (!apps.length) { toast("Нет заявок для экспорта", "err"); return; }
    const label = btn ? btn.querySelector("span") : null;
    const prev = label ? label.textContent : "";
    if (btn) { btn.disabled = true; if (label) label.textContent = "Готовим…"; }
    try {
      const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs");
      const roleLabels = { student: "Ученик", teacher: "Педагог" };
      const rows = apps.map((a) => {
        const cats = Array.isArray(a.categories) && a.categories.length ? a.categories : (a.category ? [a.category] : []);
        const msgs = Array.isArray(a.messages) ? a.messages : [];
        const dispStatus = (a.status && a.status !== "new" && a.status !== "awaiting_payment")
          ? a.status
          : (isPaid(a) ? "paid" : "awaiting_payment");
        return {
          "Дата": fmtDate(a.createdAt),
          "ФИО": a.fullName || "",
          "Email": a.email || "",
          "Телефон": a.phone || "",
          "Telegram": a.telegram || "",
          "Instagram": a.instagram || "",
          "Город": a.city || "",
          "Роль": roleLabels[a.role] || a.role || "",
          "Стаж": a.experience || "",
          "Категории": cats.map(catLabel).join(", "),
          "Статус": statusLabel(dispStatus),
          "Оплачено": isPaid(a) ? "Да" : "Нет",
          "Сумма, ₽": Number(a.paidAmount) || "",
          "Промокод": a.promoCode || "",
          "ОС": a.feedbackGiven ? "Предоставлена" : "",
          "Обратная связь": a.feedbackText || "",
          "Батл": a.battleLevel === "amateur" ? "Любители" : (a.battleLevel === "professional" ? "Профи" : (a.battleLevel || "")),
          "Тень": a.shadowType === "solo" ? "Соло" : (a.shadowType === "duet" ? "Дуэт" : (a.shadowType === "group" ? "Группы" : (a.shadowType || ""))),
          "Видео": a.videoUrl || "",
          "Сообщений": realCorrespondenceMessages(a).length,
          "ID платежа": a.paymentId || "",
          "Взнос": a.feeStatus === "paid" ? "Оплачен" : (a.feeStatus === "awaiting_payment" ? "Начал оплату" : (acceptedCategories(a).length ? "Не оплачен" : "")),
          "Сумма взноса, ₽": a.feeStatus === "paid" ? (Number(a.feeAmount) || 0) : "",
          "Промокод взноса": a.feePromo || "",
          "Дата взноса": a.feePaidAt ? fmtDate(a.feePaidAt) : "",
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [17, 24, 26, 15, 16, 16, 14, 10, 10, 28, 16, 10, 10, 12, 14, 40, 12, 10, 32, 11, 24, 14, 14, 14, 17].map((wch) => ({ wch }));
      if (ws["!ref"]) ws["!autofilter"] = { ref: ws["!ref"] };
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Заявки");
      const d = new Date().toISOString().slice(0, 10);
      XLSX.writeFileXLSX(wb, `teni-zayavki-${d}.xlsx`);
      toast(`Экспортировано заявок: ${rows.length}`, "ok");
    } catch (err) {
      console.error("[export] ", err);
      toast("Не удалось создать Excel (нужен интернет)", "err");
    } finally {
      if (btn) { btn.disabled = false; if (label) label.textContent = prev; }
    }
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

  // ── Рендер заявок спонсоров ──
  function filteredSponsors() {
    const q = el.sponsorsSearch.value.trim().toLowerCase();
    const list = [...state.sponsors].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    if (!q) return list;
    return list.filter((s) => `${s.name} ${s.brand} ${s.email} ${s.phone} ${s.message}`.toLowerCase().includes(q));
  }

  function renderSponsors() {
    const items = filteredSponsors();
    el.sponsorsList.innerHTML = "";
    el.sponsorsEmpty.hidden = items.length > 0;
    const frag = document.createDocumentFragment();
    for (const s of items) {
      const st = s.status || "new";
      const card = document.createElement("button");
      card.type = "button";
      card.className = "chat-card";
      card.addEventListener("click", () => openSponsorDrawer(s.id));
      card.innerHTML = `
        <div class="chat-card-top">
          <span class="chip sp-${esc(st)}">${esc(SPONSOR_STATUS_LABELS[st] || st)}</span>
          <span class="chat-card-id">${esc(fmtDate(s.createdAt))}</span>
        </div>
        <div class="app-card-name">${esc(s.brand || s.name || "Без названия")}</div>
        <div class="chat-card-preview">${esc(s.message || "—")}</div>
        <div class="chat-card-meta">
          <span>${esc(s.name || "—")}${s.email ? " · " + esc(s.email) : ""}</span>
        </div>`;
      frag.appendChild(card);
    }
    el.sponsorsList.appendChild(frag);
  }

  function filteredShowLeads() {
    const q = (el.showSearch?.value || "").trim().toLowerCase();
    const kind = el.showKindFilter ? el.showKindFilter.value : "";
    return [...(state.showLeads || [])]
      .filter((s) => !kind || s.kind === kind)
      .filter((s) => {
        if (!q) return true;
        return `${s.fullName} ${s.email} ${s.phone} ${s.telegram} ${s.comment}`.toLowerCase().includes(q);
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  function renderShowLeads() {
    if (!el.showList) return;
    const items = filteredShowLeads();
    el.showList.innerHTML = "";
    if (el.showEmpty) el.showEmpty.hidden = items.length > 0;
    const frag = document.createDocumentFragment();
    for (const s of items) {
      const st = s.status || "new";
      const card = document.createElement("button");
      card.type = "button";
      card.className = "chat-card";
      card.addEventListener("click", () => openShowDrawer(s.id));
      card.innerHTML = `
        <div class="chat-card-top">
          <span class="chip sp-${esc(st)}">${esc(SHOW_KIND_LABELS[s.kind] || s.kind)}</span>
          <span class="chat-card-id">${esc(fmtDate(s.createdAt))}</span>
        </div>
        <div class="app-card-name">${esc(s.fullName || "—")}</div>
        <div class="chat-card-preview">${esc(s.comment || (s.amount ? s.amount.toLocaleString("ru-RU") + " ₽" : "—"))}</div>
        <div class="chat-card-meta">
          <span>${esc(s.phone || "—")}${s.telegram ? " · " + esc(s.telegram) : ""}${s.email ? " · " + esc(s.email) : ""}</span>
        </div>`;
      frag.appendChild(card);
    }
    el.showList.appendChild(frag);
  }

  function openShowDrawer(id, { preserveScroll = false } = {}) {
    const s = state.showLeads.find((x) => x.id === id);
    if (!s) return;
    state.drawer = { kind: "show", showId: id };
    const st = s.status || "new";
    const statusBtns = SPONSOR_STATUS_ORDER.map((v) =>
      `<button type="button" class="d-status-btn ${st === v ? "is-active" : ""}" data-show-status="${v}">${esc(SPONSOR_STATUS_LABELS[v])}</button>`
    ).join("");
    openDrawer(`
      <span class="d-kicker">Виновна ли?</span>
      <h2 class="d-title">${esc(s.fullName || "—")}</h2>
      <span class="chip sp-${esc(st)}">${esc(SHOW_KIND_LABELS[s.kind] || s.kind)}</span>

      <div class="d-section-title">Контакты</div>
      <dl class="d-grid">
        ${row("Дата", esc(fmtDate(s.createdAt)))}
        ${row("Тип", esc(SHOW_KIND_LABELS[s.kind] || s.kind))}
        ${row("Email", s.email ? `<a href="mailto:${esc(s.email)}">${esc(s.email)}</a>` : "—")}
        ${row("Телефон", s.phone ? `<a href="tel:${esc(s.phone)}">${esc(s.phone)}</a>` : "—")}
        ${row("Telegram", esc(s.telegram || "—"))}
        ${s.amount ? row("Сумма", esc(s.amount.toLocaleString("ru-RU") + " ₽")) : ""}
      </dl>

      <div class="d-section-title">Комментарий</div>
      <div class="transcript"><div class="msg msg-bot">${esc(s.comment || "—")}</div></div>

      <div class="d-section-title">Статус</div>
      <div class="d-status-row">${statusBtns}</div>
    `, { preserveScroll });

    el.drawerBody.querySelectorAll(".d-status-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const status = btn.dataset.showStatus;
        try {
          const res = await api(`/api/show-leads/${s.id}/status`, {
            method: "POST", body: JSON.stringify({ status }),
          });
          Object.assign(s, res.item);
          setBadge(el.tabShowCount, state.showLeads.filter((x) => (x.status || "new") === "new").length);
          renderShowLeads();
          openShowDrawer(s.id, { preserveScroll: true });
          toast(`Статус: ${SPONSOR_STATUS_LABELS[status] || status}`, "ok");
        } catch (err) {
          toast(`Не удалось изменить статус: ${err.message}`, "err");
        }
      });
    });
  }

  function filteredTickets() {
    const q = (el.ticketsSearch?.value || "").trim().toLowerCase();
    const st = el.ticketsStatusFilter ? el.ticketsStatusFilter.value : "paid";
    const promo = el.ticketsPromoFilter ? el.ticketsPromoFilter.value : "";
    return [...(state.tickets || [])]
      .filter((t) => !st || t.status === st)
      .filter((t) => {
        if (!promo) return true;
        const code = (t.promoCode || "").toUpperCase();
        if (promo === "__none__") return !code;
        return code === promo;
      })
      .filter((t) => {
        if (!q) return true;
        return `${t.fullName} ${t.email} ${t.phone} ${t.orderNumber} ${t.promoCode}`.toLowerCase().includes(q);
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  function renderTickets() {
    if (!el.ticketsList) return;
    const paid = (state.tickets || []).filter((t) => t.status === "paid");
    const seats = paid.reduce((n, t) => n + (Number(t.quantity) || 1), 0);
    const revenue = paid.reduce((n, t) => n + (Number(t.paidAmount) || 0), 0);
    const unpaid = (state.tickets || []).filter((t) => t.status === "awaiting_payment").length;
    const box = (label, val) =>
      `<div class="stat-box"><span class="stat-val">${val}</span><span class="stat-label">${label}</span></div>`;
    const buckets = ticketPriceBuckets();
    if (el.ticketsStats) {
      el.ticketsStats.innerHTML =
        box("Оплачено заказов", paid.length) +
        box("Билетов", seats) +
        box("Сумма, ₽", revenue.toLocaleString("ru-RU")) +
        box("Не оплачено", unpaid) +
        box("2000 ₽", buckets.p2000) +
        box("1500 ₽ · KRISBRO", buckets.p1500) +
        box("0 ₽ · SEEYOUSOON", buckets.p0);
    }
    const items = filteredTickets();
    el.ticketsList.innerHTML = "";
    if (el.ticketsEmpty) {
      el.ticketsEmpty.hidden = items.length > 0;
      el.ticketsEmpty.textContent = "По этому фильтру зрителей нет.";
    }
    const frag = document.createDocumentFragment();
    for (const t of items) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "chat-card";
      card.addEventListener("click", () => openTicketDrawer(t.id));
      const qty = Number(t.quantity) || 1;
      card.innerHTML = `
        <div class="chat-card-top">
          <span class="chip st-${esc(t.status || "")}">${esc(statusLabel(t.status))}</span>
          <span class="chat-card-id">${esc(t.orderNumber || fmtDate(t.createdAt))}</span>
        </div>
        <div class="app-card-name">${esc(t.fullName || "—")}</div>
        <div class="chat-card-preview">${qty} ${qty === 1 ? "билет" : "билета"} · ${esc((Number(t.paidAmount) || 0).toLocaleString("ru-RU"))} ₽${t.promoCode ? " · " + esc(t.promoCode) : ""}</div>
        <div class="chat-card-meta">
          <span>${esc(t.phone || "—")}${t.email ? " · " + esc(t.email) : ""}</span>
        </div>`;
      frag.appendChild(card);
    }
    el.ticketsList.appendChild(frag);
  }

  function openTicketDrawer(id, { preserveScroll = false } = {}) {
    const t = state.tickets.find((x) => x.id === id);
    if (!t) return;
    state.drawer = { kind: "ticket", ticketId: id };
    openDrawer(`
      <span class="d-kicker">Зрительский билет</span>
      <h2 class="d-title">${esc(t.fullName || "—")}</h2>
      <span class="chip st-${esc(t.status || "")}">${esc(statusLabel(t.status))}</span>

      <div class="d-section-title">Заказ</div>
      <dl class="d-grid">
        ${row("Номер", esc(t.orderNumber || "—"))}
        ${row("Дата", esc(fmtDate(t.createdAt)))}
        ${row("Билетов", esc(String(t.quantity || 1)))}
        ${row("Цена за шт.", esc((Number(t.unitPrice) || 0).toLocaleString("ru-RU") + " ₽"))}
        ${row("Сумма", esc((Number(t.paidAmount) || 0).toLocaleString("ru-RU") + " ₽"))}
        ${row("Промокод", esc(t.promoCode || "—"))}
        ${row("Письмо", t.emailSent ? "Отправлено" : "Ещё нет")}
      </dl>

      <div class="d-section-title">Контакты</div>
      <dl class="d-grid">
        ${row("Email", t.email ? `<a href="mailto:${esc(t.email)}">${esc(t.email)}</a>` : "—")}
        ${row("Телефон", t.phone ? `<a href="tel:${esc(t.phone)}">${esc(t.phone)}</a>` : "—")}
      </dl>

      <details class="d-details">
        <summary>Технические данные</summary>
        <dl class="d-grid" style="margin-top: 12px">
          ${row("ID платежа", `<span class="mono">${esc(t.paymentId || "—")}</span>`)}
          ${row("IP", `<span class="mono">${esc(t.ip || "—")}</span>`)}
          ${row("ID заказа", `<span class="mono">${esc(t.id)}</span>`)}
        </dl>
      </details>
    `, { preserveScroll });
  }

  async function exportTicketsExcel(btn) {
    const items = filteredTickets();
    if (!items.length) { toast("Нет зрителей для экспорта", "err"); return; }
    const label = btn ? btn.querySelector("span") : null;
    const prev = label ? label.textContent : "";
    if (btn) { btn.disabled = true; if (label) label.textContent = "Готовим…"; }
    try {
      const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs");
      const rows = items.map((t) => ({
        "Дата": fmtDate(t.createdAt),
        "Номер заказа": t.orderNumber || "",
        "ФИО": t.fullName || "",
        "Телефон": t.phone || "",
        "Email": t.email || "",
        "Билетов": Number(t.quantity) || 1,
        "Сумма, ₽": Number(t.paidAmount) || 0,
        "Промокод": t.promoCode || "",
        "Статус": statusLabel(t.status),
        "Письмо": t.emailSent ? "Да" : "Нет",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [17, 14, 26, 16, 26, 10, 12, 12, 14, 10].map((wch) => ({ wch }));
      if (ws["!ref"]) ws["!autofilter"] = { ref: ws["!ref"] };
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Зрители");
      XLSX.writeFile(wb, "teni-zriteli.xlsx");
    } catch (err) {
      toast(`Не удалось выгрузить: ${err.message}`, "err");
    } finally {
      if (btn) { btn.disabled = false; if (label) label.textContent = prev; }
    }
  }

  // ── Рендер аналитики (сводка по заявкам + клики «Купить билет») ──
  function renderAnalytics() {
    if (!el.analyticsList) return;
    const box = (label, val) =>
      `<div class="stat-box"><span class="stat-val">${Number(val) || 0}</span><span class="stat-label">${label}</span></div>`;

    // Сводка по оплаченным заявкам
    const apps = state.apps || [];
    const paid = apps.filter(isPaid);
    const revenue = paid.reduce((sum, a) => sum + (Number(a.paidAmount) || 0), 0);
    const promoCount = apps.filter((a) => a.promoCode).length;
    const osYes = paid.filter((a) => a.feedbackGiven).length;
    const osNo = paid.length - osYes;
    // Сумма «слотов» категорий (может быть больше числа оплаченных заявок)
    const catSlots = paid.reduce((n, a) => n + appCategories(a).length, 0);
    if (el.appsSummaryStats) {
      el.appsSummaryStats.innerHTML =
        box("Оплачено", paid.length) +
        box("Категорий всего", catSlots) +
        box("Сумма, ₽", revenue) +
        box("Промокоды", promoCount) +
        box("ОС да", osYes) +
        box("ОС нет", osNo);
    }
    if (el.appsSummaryCats) {
      el.appsSummaryCats.innerHTML = Object.keys(CATEGORY_LABELS).map((key) => {
        const n = paid.filter((a) => hasCategory(a, key)).length;
        return box(CATEGORY_LABELS[key], n);
      }).join("");
    }
    // Прошёл отбор — считаем категории, не заявки
    let acceptedTotal = 0;
    const acceptedByCat = {};
    for (const a of paid) {
      for (const c of appCategories(a)) {
        if (categoryStatus(a, c) === "accepted") {
          acceptedTotal += 1;
          acceptedByCat[c] = (acceptedByCat[c] || 0) + 1;
        }
      }
    }
    if (el.appsSummaryAccepted) {
      el.appsSummaryAccepted.innerHTML =
        box("Всего «прошёл»", acceptedTotal) +
        Object.keys(CATEGORY_LABELS).map((key) => box(CATEGORY_LABELS[key], acceptedByCat[key] || 0)).join("");
    }
    // Разбивка по суммам оплаты
    const byPrice = {};
    for (const a of paid) {
      const amt = Number(a.paidAmount) || 0;
      byPrice[amt] = (byPrice[amt] || 0) + 1;
    }
    if (el.appsSummaryPrices) {
      const keys = Object.keys(byPrice).map(Number).sort((a, b) => b - a);
      el.appsSummaryPrices.innerHTML = keys.length
        ? keys.map((amt) => box(`${amt.toLocaleString("ru-RU")} ₽`, byPrice[amt])).join("")
        : box("Нет данных", 0);
    }
    const feesSummary = document.getElementById("fees-summary-stats");
    if (feesSummary) {
      const feePaid = apps.filter((a) => a.feeStatus === "paid");
      const feeRevenue = feePaid.reduce((s, a) => s + (Number(a.feeAmount) || 0), 0);
      const feeUnpaid = apps.filter((a) => a.feeStatus !== "paid" && a.status !== "awaiting_payment" && acceptedCategories(a).length).length;
      const feeByCat = {};
      feePaid.forEach((a) => (a.feeCategories || []).forEach((c) => { feeByCat[c] = (feeByCat[c] || 0) + 1; }));
      const feeByPromo = {};
      feePaid.forEach((a) => { if (a.feePromo) feeByPromo[a.feePromo] = (feeByPromo[a.feePromo] || 0) + 1; });
      feesSummary.innerHTML =
        box("Оплатили взнос", feePaid.length) +
        `<div class="stat-box"><span class="stat-val">${feeRevenue.toLocaleString("ru-RU")}</span><span class="stat-label">Сумма взносов, ₽</span></div>` +
        box("Прошли, не оплатили", feeUnpaid) +
        Object.keys(CATEGORY_LABELS).filter((k) => feeByCat[k]).map((k) => box(CATEGORY_LABELS[k], feeByCat[k])).join("") +
        Object.entries(feeByPromo).map(([p, n]) => box(p, n)).join("");
    }
    if (el.ticketsSummaryStats) {
      const tb = ticketPriceBuckets();
      el.ticketsSummaryStats.innerHTML =
        box("Оплачено", tb.paid) +
        box("2000 ₽", tb.p2000) +
        box("1500 ₽", tb.p1500) +
        box("0 ₽", tb.p0) +
        box("KRISBRO", tb.kris) +
        box("SEEYOUSOON", tb.see);
    }
    // Архив удалённых оплаченных
    if (el.deletedArchiveList) {
      const del = state.deletedApps || [];
      el.deletedArchiveList.innerHTML = "";
      if (el.deletedArchiveEmpty) el.deletedArchiveEmpty.hidden = del.length > 0;
      const frag = document.createDocumentFragment();
      for (const d of del) {
        const cats = Array.isArray(d.categories) ? d.categories.map(catLabel).join(", ") : "—";
        const card = document.createElement("div");
        card.className = "chat-card chat-card--static";
        card.innerHTML = `
          <div class="chat-card-top">
            <span class="chip chip-muted">Удалена ${esc(fmtDate(d.deletedAt))}</span>
            <span class="chat-card-id">${esc(fmtDate(d.createdAt))}</span>
          </div>
          <div class="app-card-name">${esc(d.fullName || "—")}</div>
          <div class="chat-card-preview">${esc(cats)}</div>
          <div class="chat-card-meta">
            <span>${esc(d.email || "—")}${d.phone ? " · " + esc(d.phone) : ""}${d.paidAmount ? " · " + esc(d.paidAmount) + " ₽" : ""}${d.promoCode ? " · " + esc(d.promoCode) : ""}</span>
          </div>`;
        frag.appendChild(card);
      }
      el.deletedArchiveList.appendChild(frag);
    }

    const s = state.analyticsStats || {};
    if (el.analyticsStats) {
      el.analyticsStats.innerHTML =
        box("Всего", s.total) +
        box("Сегодня", s.today) +
        box("7 дней", s.last7) +
        box("30 дней", s.last30) +
        box("Устройств", s.uniqueDevices);
    }
    const items = state.events || [];
    el.analyticsList.innerHTML = "";
    el.analyticsEmpty.hidden = items.length > 0;
    const frag = document.createDocumentFragment();
    for (const e of items) {
      const dev = e.deviceId ? esc(e.deviceId.slice(0, 12)) + "…" : "—";
      const card = document.createElement("div");
      card.className = "chat-card chat-card--static";
      card.innerHTML = `
        <div class="chat-card-top">
          <span class="chip chip-os">Купить билет</span>
          <span class="chat-card-id">${esc(fmtDate(e.createdAt))}</span>
        </div>
        <div class="chat-card-meta">
          <span>device: ${dev}</span>
        </div>`;
      frag.appendChild(card);
    }
    el.analyticsList.appendChild(frag);
  }

  function openSponsorDrawer(id, { preserveScroll = false } = {}) {
    const s = state.sponsors.find((x) => x.id === id);
    if (!s) return;
    state.drawer = { kind: "sponsor", appId: null, chatId: null, sponsorId: id };
    const st = s.status || "new";
    const statusBtns = SPONSOR_STATUS_ORDER.map((v) =>
      `<button type="button" class="d-status-btn ${st === v ? "is-active" : ""}" data-sp-status="${v}">${esc(SPONSOR_STATUS_LABELS[v])}</button>`
    ).join("");
    const contact = [];
    if (s.email) contact.push(`<a href="mailto:${esc(s.email)}">${esc(s.email)}</a>`);

    openDrawer(`
      <span class="d-kicker">Заявка на спонсорство</span>
      <h2 class="d-title">${esc(s.brand || s.name || "Без названия")}</h2>
      <span class="chip sp-${esc(st)}">${esc(SPONSOR_STATUS_LABELS[st] || st)}</span>

      <div class="d-section-title">Контакты</div>
      <dl class="d-grid">
        ${row("Дата", esc(fmtDate(s.createdAt)))}
        ${row("Контактное лицо", esc(s.name || "—"))}
        ${row("Бренд/компания", esc(s.brand || "—"))}
        ${row("Email", contact.length ? contact.join("") : "—")}
        ${row("Телефон", esc(s.phone || "—"))}
      </dl>

      <div class="d-section-title">Сообщение</div>
      <div class="transcript"><div class="msg msg-bot">${esc(s.message || "—")}</div></div>

      <div class="d-section-title">Статус</div>
      <p class="d-hint">Пометка для вас — обработана ли заявка.</p>
      <div class="d-status-row">${statusBtns}</div>

      <details class="d-details">
        <summary>Технические данные</summary>
        <dl class="d-grid" style="margin-top: 12px">
          ${row("IP", `<span class="mono">${esc(s.ip || "—")}</span>`)}
          ${row("Устройство", `<span class="mono">${esc(s.userAgent || "—")}</span>`)}
          ${row("ID заявки", `<span class="mono">${esc(s.id)}</span>`)}
        </dl>
      </details>
    `, { preserveScroll });

    el.drawerBody.querySelectorAll(".d-status-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const status = btn.dataset.spStatus;
        try {
          const res = await api(`/api/sponsors/${s.id}/status`, {
            method: "POST", body: JSON.stringify({ status }),
          });
          Object.assign(s, res.item);
          el.drawerBody.querySelectorAll(".d-status-btn").forEach((b) => b.classList.toggle("is-active", b.dataset.spStatus === status));
          setBadge(el.tabSponsorsCount, state.sponsors.filter((x) => (x.status || "new") === "new").length);
          renderSponsors();
          toast(`Статус: ${SPONSOR_STATUS_LABELS[status] || status}`, "ok");
        } catch (err) {
          toast(`Не удалось изменить статус: ${err.message}`, "err");
        }
      });
    });
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

  function openDrawer(html, { preserveScroll = false } = {}) {
    const prevScroll = preserveScroll ? el.drawer.scrollTop : 0;
    el.drawerBody.innerHTML = html;
    el.drawer.hidden = false;
    el.drawerBackdrop.hidden = false;
    el.drawer.setAttribute("aria-hidden", "false");
    if (preserveScroll) el.drawer.scrollTop = prevScroll;
    else el.drawer.scrollTop = 0;
    lockScroll();
    requestAnimationFrame(() => {
      el.drawer.classList.add("is-open");
      el.drawerBackdrop.classList.add("is-open");
      if (preserveScroll) el.drawer.scrollTop = prevScroll;
    });
  }
  // ── Черновики ОС: localStorage + сервер, чтобы текст не терялся ни при каком сценарии ──
  const OS_DRAFT_PREFIX = "teni_os_draft_";
  function readOsDraft(id) {
    try {
      const v = localStorage.getItem(OS_DRAFT_PREFIX + id);
      return v === null ? null : v;
    } catch { return null; }
  }
  function writeOsDraft(id, text) {
    try { localStorage.setItem(OS_DRAFT_PREFIX + id, text); } catch {}
  }
  function clearOsDraft(id) {
    try { localStorage.removeItem(OS_DRAFT_PREFIX + id); } catch {}
  }
  // Текст из открытого поля ОС этой заявки (если редактируется), иначе null.
  function captureOsDraft(id) {
    if (state.drawer?.kind !== "app" || state.drawer.appId !== id) return null;
    const ta = document.getElementById("os-note-edit");
    if (!ta || ta.hidden) return null;
    return ta.value;
  }
  function isOsEditing() {
    const ta = document.getElementById("os-note-edit");
    return !!ta && !ta.hidden;
  }

  function persistOsDraft() {
    const appId = state.drawer?.kind === "app" ? state.drawer.appId : null;
    const ta = document.getElementById("os-note-edit");
    if (!appId || !ta || ta.hidden) return;
    const a = state.apps.find((x) => x.id === appId);
    if (!a || ta.value === (a.feedbackText || "")) return;
    writeOsDraft(appId, ta.value);
    api(`/api/applications/${appId}/feedback-text`, {
      method: "POST",
      body: JSON.stringify({ text: ta.value }),
    }).then((res) => {
      if (res?.item && a) Object.assign(a, res.item);
      clearOsDraft(appId);
      renderApps();
      toast("Обратная связь сохранена", "ok");
    }).catch(() => {
      toast("Нет связи — черновик ОС сохранён на устройстве", "err");
    });
  }

  // Старые записи автописьма хранят только пометку «отправлено». Показываем
  // полный текст письма, как его получил участник.
  function expandAutoMessageText(m, a) {
    const t = String(m.text || "");
    if (!t.startsWith("Автоматическое письмо-подтверждение")) return t;
    const cats = appCategories(a).map(catLabel).join(", ") || "—";
    return [
      "Спасибо, что подали заявку на видеоотбор чемпионата «Тень»!",
      "",
      `Выбранные категории: ${cats}`,
      "",
      "До 14 сентября вы получите обратную связь по итогам видеоотбора от Кристины Бродецкой.",
      "",
      "14 сентября будут опубликованы списки участников, прошедших видеоотбор.",
      "",
      "Если вы прошли отбор, у вас будет 7 дней, чтобы оплатить основной взнос участника и закрепить за собой место!",
      "",
      "Если захотите подать заявку ещё в одну категорию до 7 сентября 2026 года, просто ответьте на это письмо и напишите, какую категорию хотите добавить.",
      "",
      "Приглашайте друзей и близких поддержать вас на чемпионате — зрители станут важной частью атмосферы «Тени».",
      "",
      "Следите за новостями:",
      "Telegram: @teni_champ",
      "Instagram (запрещённая сеть): @teni_championship",
      "",
      "Команда чемпионата «ТЕНЬ»",
    ].join("\n");
  }

  // Итог отбора для письма: прошёл > резерв > не прошёл (как на сервере).
  function selectionOutcomeClient(a) {
    const sts = appCategories(a).map((c) => categoryStatus(a, c));
    if (sts.includes("accepted")) return "accepted";
    if (sts.includes("reserve")) return "reserve";
    if (sts.includes("rejected")) return "rejected";
    return null;
  }

  function closeDrawer() {
    persistOsDraft();
    el.drawer.classList.remove("is-open");
    el.drawerBackdrop.classList.remove("is-open");
    el.drawer.setAttribute("aria-hidden", "true");
    state.drawer = { kind: null, appId: null, chatId: null };
    unlockScroll();
    setTimeout(() => { el.drawer.hidden = true; el.drawerBackdrop.hidden = true; el.drawerBody.innerHTML = ""; }, 340);
  }

  function row(label, valueHtml) {
    return `<div class="d-row"><dt>${esc(label)}</dt><dd>${valueHtml}</dd></div>`;
  }

  function openAppDrawer(id, { preserveScroll = false } = {}) {
    const a = state.apps.find((x) => x.id === id);
    if (!a) return;
    // Если ОС сейчас редактируется — не теряем текст при перерисовке карточки.
    const liveOs = captureOsDraft(id);
    state.drawer = { kind: "app", appId: id, chatId: null };
    const osDraft = liveOs !== null ? liveOs : readOsDraft(id);
    const osEditing = liveOs !== null || (osDraft !== null && osDraft !== (a.feedbackText || ""));
    const osInitial = osEditing ? osDraft : (a.feedbackText || "");
    const outcomePreview = selectionOutcomeClient(a);
    const previewTpl = outcomePreview ? EMAIL_TEMPLATES.find((t) => t.id === outcomePreview) : null;

    const contact = [];
    if (a.email) contact.push(`<a href="mailto:${esc(a.email)}">${esc(a.email)}</a>`);
    const videoLinks = String(a.videoUrl || "").split(/\n/).map((l) => l.trim()).filter(Boolean);
    const video = videoLinks.length
      ? videoLinks.map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener">Видео${videoLinks.length > 1 ? " " + (i + 1) : ""} ↗</a>`).join("<br>")
      : "—";

    const msgs = Array.isArray(a.messages) ? a.messages : [];
    const convoHtml = msgs.length
      ? `<div class="transcript transcript--scroll" id="app-transcript">${msgs.map((m) => {
          const incoming = m.direction === "in";
          const text = expandAutoMessageText(m, a);
          return `<div class="msg msg-${incoming ? "bot" : "user"}">
            ${m.subject ? `<div class="msg-subj">${esc(m.subject)}</div>` : ""}${esc(text)}
            <span class="msg-time">${incoming ? "участник" : (m.kind === "auto" ? "автописьмо" : (m.kind === "template" ? "шаблон" : "мы"))} · ${esc(fmtDate(m.at))}</span>
          </div>`;
        }).join("")}</div>`
      : `<p class="reply-hint">Переписки пока нет.</p>`;

    // Тумблера «оплачено / не оплачено» больше нет: статус оплаты меняется
    // только промокодом WELCOME/ZVEZDA в правке или возвратом с комментарием.
    const paidEvidence = [];
    if (a.paymentId) paidEvidence.push("есть платёж ЮKassa");
    if (Number(a.paidAmount) > 0) paidEvidence.push(`сумма ${a.paidAmount} ₽`);
    if (a.promoCode) paidEvidence.push(`промокод ${a.promoCode}`);
    const payHistory = (Array.isArray(a.editHistory) ? a.editHistory : [])
      .filter((h) => h?.patch && (h.patch.status || h.patch.from) && !("feeStatus" in h.patch));
    const feeHistory = (Array.isArray(a.editHistory) ? a.editHistory : [])
      .filter((h) => h?.patch && ("feeStatus" in h.patch));

    // Категории — массив или fallback на одну
    const cats = appCategories(a);
    const catsHtml = cats.map((c) => `<span class="chip chip-cat">${esc(catLabel(c))}</span>`).join(" ");
    const perCatStatusHtml = cats.map((c) => {
      const cur = categoryStatus(a, c);
      const btns = WORKFLOW_STATUSES.map((s) =>
        `<button type="button" class="d-status-btn ${cur === s ? "is-active" : ""}" data-cat-status="${s}" data-category="${esc(c)}">${esc(statusLabel(s))}</button>`
      ).join("");
      return `<div class="cat-status-block">
        <div class="cat-status-label">${esc(catLabel(c))}</div>
        <div class="d-status-row">${btns}</div>
      </div>`;
    }).join("");

    const templateOptions = EMAIL_TEMPLATES
      .map((t) => `<option value="${t.id}">${esc(t.label)}</option>`)
      .join("");
    // Предзаполняем тему: последняя тема переписки или дефолт.
    const lastSubj = [...msgs].reverse().find((m) => m.subject)?.subject || DEFAULT_REPLY_SUBJECT;
    const replyBox = state.emailEnabled
      ? `<div class="reply-box">
          <p class="reply-hint">Письмо уйдёт на <b>${esc(a.email)}</b>. Участник сможет ответить прямо на него.</p>
          <select id="reply-template" class="field field--select" aria-label="Шаблон письма">
            <option value="">📄 Вставить шаблон…</option>
            ${templateOptions}
          </select>
          <label class="d-os-toggle" id="reply-use-tpl-wrap" hidden>
            <input type="checkbox" id="reply-use-tpl" checked>
            <span>Вставить шаблон</span>
          </label>
          <div class="subject-row">
            <input id="reply-subject" class="field" type="text" placeholder="Тема письма" value="${esc(lastSubj)}">
            <button type="button" id="reply-subject-clear" class="subject-clear" aria-label="Очистить тему" title="Очистить тему">×</button>
          </div>
          <textarea id="reply-message" class="field" placeholder="Текст письма участнику…"></textarea>
          <button id="reply-send" class="btn btn-accent" type="button">Отправить письмо</button>
          <p id="reply-status" class="reply-status"></p>
        </div>`
      : `<p class="reply-warn">Почта (SMTP) не настроена на сервере — отправка писем недоступна. Задайте переменные SMTP_* в настройках бэкенда.</p>`;

    const roleLabels = { student: "Ученик", teacher: "Педагог" };
    const catChecks = Object.entries(CATEGORY_LABELS).map(([val, label]) =>
      `<label class="edit-cat-check"><input type="checkbox" value="${esc(val)}" ${cats.includes(val) ? "checked" : ""}> ${esc(label)}</label>`
    ).join("");

    openDrawer(`
      <span class="d-kicker">Заявка</span>
      <h2 class="d-title">${esc(a.fullName || "Без имени")}</h2>
      ${isPaid(a) ? statusChip("paid") : statusChip("awaiting_payment")}

      <div class="d-section-title">Контакты</div>
      <dl class="d-grid">
        ${row("Дата", esc(fmtDate(a.createdAt)))}
        ${row("Email", contact.length ? contact.join("") : "—")}
        ${row("Телефон", esc(a.phone || "—"))}
        ${row("Telegram", a.telegram ? socialLinksHtml(a.telegram, "tg") : "—")}
        ${row("Instagram", a.instagram ? socialLinksHtml(a.instagram, "ig") : "—")}
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
        ${row("Сумма", a.paidAmount ? esc(a.paidAmount) + " ₽" : (a.promoCode ? "0 ₽" : "—"))}
        ${a.promoCode ? row("Промокод", `<span class="chip chip-promo">🎟 ${esc(a.promoCode)}</span>`) : ""}
        ${a.paymentId ? row("ID платежа", `<span class="mono">${esc(a.paymentId)}</span>`) : ""}
        ${payHistory.length ? row("История оплаты", payHistory.map((h) => `${esc(fmtDate(h.at))} — ${esc(h.comment || "")}`).join("<br>")) : ""}
      </dl>
      <p class="d-hint">Оплата одна на заявку. Руками статус оплаты не переключается: «Оплачено» ставится промокодом WELCOME / ZVEZDA в «Редактировать» или возвратом с указанием причины.</p>
      ${!isPaid(a) ? `
        <div class="os-note-actions">
          ${a.paymentId ? `<button type="button" class="btn btn-ghost" id="pay-verify">Проверить оплату в ЮKassa</button>` : ""}
          <button type="button" class="btn btn-ghost" id="pay-restore">Вернуть «Оплачено»${paidEvidence.length ? " · " + esc(paidEvidence.join(", ")) : ""}</button>
        </div>` : ""}

      ${(acceptedCategories(a).length || a.feeStatus) ? `
      <div class="d-section-title">Взнос за участие</div>
      <dl class="d-grid">
        ${row("Статус", a.feeStatus === "paid"
          ? `<span class="chip st-paid"><span class="status-dot"></span>Оплачен</span>`
          : (a.feeStatus === "awaiting_payment"
            ? `<span class="chip st-awaiting_payment"><span class="status-dot"></span>Начал оплату, не завершил</span>`
            : `<span class="chip chip-muted">Не оплачен</span>`))}
        ${row("Категории", esc((a.feeStatus === "paid" ? (a.feeCategories || []) : acceptedCategories(a)).map(catLabel).join(", ") || "—"))}
        ${a.feeStatus === "paid" ? row("Сумма", esc(fmtRub(a.feeAmount))) : row("Ожидается", esc(fmtRub(feeExpected(a))) + (acceptedCategories(a).some((c) => feeKind(a, c) === "team") ? " × чел." : "") + " без промо")}
        ${a.feeParticipants ? row("Участников", esc(String(a.feeParticipants))) : ""}
        ${a.feePromo ? row("Промокод", `<span class="chip chip-promo">🎟 ${esc(a.feePromo)}</span>`) : ""}
        ${a.feePaidAt ? row("Дата оплаты", esc(fmtDate(a.feePaidAt))) : ""}
        ${a.feePaymentId ? row("ID платежа", `<span class="mono">${esc(a.feePaymentId)}</span>`) : ""}
        ${feeHistory.length ? row("История", feeHistory.map((h) => `${esc(fmtDate(h.at))} — ${esc(h.comment || "")}`).join("<br>")) : ""}
      </dl>
      <div class="os-note-actions">
        ${a.feeStatus !== "paid" ? `<button type="button" class="btn btn-ghost" id="fee-mark-paid">Отметить взнос оплаченным</button>` : ""}
        ${a.feePaymentId ? `<button type="button" class="btn btn-ghost" id="fee-verify">Проверить взнос в ЮKassa</button>` : ""}
        ${a.feeStatus === "paid" ? `<button type="button" class="btn btn-ghost" id="fee-reset">Снять отметку взноса</button>` : ""}
      </div>` : ""}

      ${formsSectionHtml(a)}

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

      <div class="d-section-title">Обратная связь (заметка)</div>
      <p class="d-hint">Сохраняется автоматически по мере набора и отдельно от письма. В письмо подставляется сама — по статусу «прошёл / резерв / не прошёл».</p>
      <div class="os-note" id="os-note">
        <div class="os-note-view" id="os-note-view" ${osEditing ? "hidden" : ""}>${a.feedbackText ? esc(a.feedbackText) : "<span class='d-hint'>Пока пусто</span>"}</div>
        <textarea id="os-note-edit" class="field" rows="6" ${osEditing ? "" : "hidden"}>${esc(osInitial)}</textarea>
        <p class="d-hint" id="os-autosave" style="margin-top:6px">${osEditing ? "Черновик восстановлен — не забудьте нажать «Сохранить»" : ""}</p>
        <div class="os-note-actions">
          <button type="button" class="btn btn-ghost" id="os-edit" ${osEditing ? "hidden" : ""}>Редактировать</button>
          <button type="button" class="btn btn-ghost" id="os-save" ${osEditing ? "" : "hidden"}>Сохранить</button>
          <button type="button" class="btn btn-ghost" id="os-clear" ${osEditing ? "" : "hidden"}>Удалить текст</button>
          <button type="button" class="btn btn-ghost" id="os-copy">Копировать заметку</button>
        </div>
      </div>

      <div class="d-section-title">Статус по категориям</div>
      <p class="d-hint">Можно принять в одной категории и отклонить в другой. Участник статусы не видит.</p>
      ${perCatStatusHtml || "<p class='d-hint'>Категории не указаны.</p>"}
      <label class="d-os-toggle">
        <input type="checkbox" id="fb-toggle" ${a.feedbackGiven ? "checked" : ""}>
        <span>Обратная связь (ОС) предоставлена</span>
      </label>

      <div class="d-section-title">Письмо по таймеру</div>
      ${previewTpl
        ? `<p class="d-hint">Шаблон подбирается автоматически по статусу: <b>${esc(previewTpl.label)}</b>. Заметка ОС вставляется сама${(a.feedbackText || "").trim() ? "" : " — <b>пока заметка пустая</b>"}. Руками шаблон ставить не нужно.</p>
           <details class="d-details"><summary>Показать письмо, которое уйдёт</summary>
             <div class="transcript" style="margin-top:10px"><div class="msg msg-user" style="max-width:100%"><div class="msg-subj">${esc(previewTpl.subject)}</div>${esc(fillTemplateBody(previewTpl, a))}</div></div>
           </details>`
        : `<p class="d-hint">Статус пока «на рассмотрении» — письмо по таймеру не уйдёт, пока не выбран «прошёл / резерв / не прошёл».</p>`}
      ${a.scheduledSentAt
        ? `<p class="d-hint">Письмо этой волны уже отправлено ${esc(fmtDate(a.scheduledSentAt))}.</p>`
        : `<p class="d-hint">${a.scheduledSendAt
          ? "Запланировано на " + esc(fmtDate(a.scheduledSendAt)) + ". Можно поменять дату только для этой заявки."
          : "Таймер на все заявки ставится кнопкой «Таймер рассылки» над списком. Здесь — дата только для этой заявки."}</p>
        <input id="app-send-at" class="field" type="datetime-local" value="${esc(isoToLocalDateTime(a.scheduledSendAt))}">
        <button type="button" class="btn btn-ghost" id="app-schedule" style="margin-top:10px">Поставить таймер на эту заявку</button>`}

      <div class="d-section-title">Переписка</div>
      <div class="reply-needed-row">
        ${needsReply(a)
          ? `<span class="chip chip-reply">✉ требует ответа</span>`
          : `<span class="chip chip-muted">✉ не требует ответа</span>`}
        <button type="button" id="mark-handled" class="btn-link">Пометить: не требует ответа</button>
      </div>
      ${convoHtml}

      <div class="d-section-title">Ответить участнику на почту</div>
      ${replyBox}

      <details class="d-details">
        <summary>Редактировать / удалить</summary>
        <div style="margin-top:12px">
          <p class="d-hint">Категории (отметьте нужные)</p>
          <div class="edit-cats">${catChecks}</div>
          <div id="edit-battle-wrap" ${cats.includes("battle") ? "" : "hidden"}>
            <p class="d-hint" style="margin-top:10px">Батл · уровень</p>
            <select id="edit-battle-level" class="field field--select">
              <option value="" ${!a.battleLevel ? "selected" : ""}>Не указан</option>
              <option value="amateur" ${a.battleLevel === "amateur" ? "selected" : ""}>Любители</option>
              <option value="professional" ${a.battleLevel === "professional" ? "selected" : ""}>Профи</option>
            </select>
          </div>
          <div id="edit-shadow-wrap" ${cats.includes("shadow") ? "" : "hidden"}>
            <p class="d-hint" style="margin-top:10px">Тень · состав</p>
            <select id="edit-shadow-type" class="field field--select">
              <option value="" ${!a.shadowType ? "selected" : ""}>Не указан</option>
              <option value="solo" ${a.shadowType === "solo" ? "selected" : ""}>Соло</option>
              <option value="duet" ${a.shadowType === "duet" ? "selected" : ""}>Дуэт</option>
              <option value="group" ${a.shadowType === "group" ? "selected" : ""}>Группы</option>
            </select>
            <label class="d-hint" style="display:block;margin-top:10px">Идея номера</label>
            <textarea id="edit-shadow-idea" class="field" rows="3">${esc(a.shadowIdea || "")}</textarea>
          </div>
          <label class="d-hint" style="display:block;margin-top:10px">Видео (каждая ссылка с новой строки)</label>
          <textarea id="edit-videos" class="field" rows="3">${esc(a.videoUrl || "")}</textarea>
          <label class="d-hint" style="display:block;margin-top:10px">Промокод (например WELCOME / ZVEZDA / PROBRO)</label>
          <input id="edit-promo" class="field" type="text" value="${esc(a.promoCode || "")}" autocapitalize="characters">
          <label class="d-hint" style="display:block;margin-top:10px">Комментарий к правке (обязательно для истории)</label>
          <input id="edit-comment" class="field" type="text" placeholder="Что изменили и почему…">
          <button id="edit-save" class="btn btn-ghost" type="button" style="margin-top:10px">Сохранить правки</button>
          <button id="app-delete" class="btn btn-ghost" type="button" style="margin-top:10px;color:#c62828">Удалить заявку</button>
          ${Array.isArray(a.editHistory) && a.editHistory.length ? `
            <div class="d-section-title" style="margin-top:16px">История правок</div>
            <div class="edit-history">
              ${a.editHistory.map((h) => `
                <div class="edit-history-item">
                  <div class="edit-history-at">${esc(fmtDate(h.at))}</div>
                  <div>${esc(h.comment || "—")}</div>
                </div>
              `).join("")}
            </div>
          ` : `<p class="d-hint" style="margin-top:12px">Истории правок пока нет.</p>`}
        </div>
      </details>

      <details class="d-details">
        <summary>Технические данные</summary>
        <dl class="d-grid" style="margin-top: 12px">
          ${row("Device ID", `<span class="mono">${esc(a.deviceId || "—")}</span>`)}
          ${row("IP", `<span class="mono">${esc(a.ip || "—")}</span>`)}
          ${row("Устройство", `<span class="mono">${esc(a.userAgent || "—")}</span>`)}
          ${row("ID заявки", `<span class="mono">${esc(a.id)}</span>`)}
        </dl>
      </details>
    `, { preserveScroll });

    // Переписка: последние письма внизу на виду, старые листаются вверх.
    const transcriptEl = document.getElementById("app-transcript");
    if (transcriptEl) transcriptEl.scrollTop = transcriptEl.scrollHeight;

    // Возврат «Оплачено» после ошибочного переключения — только с причиной в историю.
    const payRestore = document.getElementById("pay-restore");
    if (payRestore) {
      payRestore.addEventListener("click", async () => {
        const reason = window.prompt("Почему возвращаем «Оплачено»? Причина попадёт в историю правок.", "Оплата подтверждена, статус был переключён ошибочно");
        if (reason === null) return;
        if (reason.trim().length < 3) { toast("Укажите причину", "err"); return; }
        payRestore.disabled = true;
        try {
          const res = await api(`/api/applications/${a.id}/restore-paid`, {
            method: "POST", body: JSON.stringify({ editComment: reason.trim() }),
          });
          Object.assign(a, res.item);
          openAppDrawer(a.id, { preserveScroll: true });
          renderApps();
          renderAnalytics();
          toast("Статус «Оплачено» возвращён, причина записана в историю", "ok");
        } catch (err) {
          payRestore.disabled = false;
          toast(`Не удалось: ${err.message}`, "err");
        }
      });
    }
    const payVerify = document.getElementById("pay-verify");
    if (payVerify) {
      payVerify.addEventListener("click", async () => {
        payVerify.disabled = true;
        payVerify.textContent = "Проверяем…";
        try {
          const res = await api(`/api/applications/${a.id}/verify-payment`, { method: "POST", body: "{}" });
          if (res.item) Object.assign(a, res.item);
          openAppDrawer(a.id, { preserveScroll: true });
          renderApps();
          renderAnalytics();
          toast(res.paid ? `ЮKassa подтверждает оплату${res.amount ? " · " + res.amount + " ₽" : ""}` : `ЮKassa: платёж не завершён (${res.reason || "нет оплаты"})`, res.paid ? "ok" : "err");
        } catch (err) {
          payVerify.disabled = false;
          payVerify.textContent = "Проверить оплату в ЮKassa";
          toast(`Не удалось проверить: ${err.message}`, "err");
        }
      });
    }

    bindFormsSection(a);

    // ── Взнос за участие: ручная отметка / сверка / снятие ──
    const feeMark = document.getElementById("fee-mark-paid");
    if (feeMark) {
      feeMark.addEventListener("click", async () => {
        const amountRaw = window.prompt("Сумма взноса, ₽ (0 — если оплачено вне сайта по промокоду ALREADYPAID):", String(feeExpected(a) || 0));
        if (amountRaw === null) return;
        const amount = Number(String(amountRaw).replace(/[^\d]/g, ""));
        if (!Number.isFinite(amount)) { toast("Введите число", "err"); return; }
        const promo = window.prompt("Промокод (если был), иначе оставьте пустым:", amount === 0 ? "ALREADYPAID" : "");
        if (promo === null) return;
        const reason = window.prompt("Причина ручной отметки (попадёт в историю):", "Оплата переводом на карту, подтверждена");
        if (reason === null) return;
        if (reason.trim().length < 3) { toast("Укажите причину", "err"); return; }
        feeMark.disabled = true;
        try {
          const res = await api(`/api/applications/${a.id}/fee-paid`, {
            method: "POST",
            body: JSON.stringify({ amount, promoCode: promo.trim(), editComment: reason.trim() }),
          });
          Object.assign(a, res.item);
          openAppDrawer(a.id, { preserveScroll: true });
          renderApps(); renderFees(); renderAnalytics();
          toast("Взнос отмечен оплаченным", "ok");
        } catch (err) {
          feeMark.disabled = false;
          toast(`Не удалось: ${err.message}`, "err");
        }
      });
    }
    const feeVerify = document.getElementById("fee-verify");
    if (feeVerify) {
      feeVerify.addEventListener("click", async () => {
        feeVerify.disabled = true;
        feeVerify.textContent = "Проверяем…";
        try {
          const res = await api(`/api/applications/${a.id}/fee-verify`, { method: "POST", body: "{}" });
          if (res.item) Object.assign(a, res.item);
          openAppDrawer(a.id, { preserveScroll: true });
          renderApps(); renderFees(); renderAnalytics();
          toast(res.paid ? "ЮKassa подтверждает оплату взноса" : `ЮKassa: платёж не завершён (${res.reason || "нет оплаты"})`, res.paid ? "ok" : "err");
        } catch (err) {
          feeVerify.disabled = false;
          feeVerify.textContent = "Проверить взнос в ЮKassa";
          toast(`Не удалось проверить: ${err.message}`, "err");
        }
      });
    }
    const feeReset = document.getElementById("fee-reset");
    if (feeReset) {
      feeReset.addEventListener("click", async () => {
        const reason = window.prompt("Почему снимаем отметку взноса? Причина попадёт в историю.", "");
        if (reason === null) return;
        if (reason.trim().length < 3) { toast("Укажите причину", "err"); return; }
        feeReset.disabled = true;
        try {
          const res = await api(`/api/applications/${a.id}/fee-reset`, {
            method: "POST", body: JSON.stringify({ editComment: reason.trim() }),
          });
          Object.assign(a, res.item);
          openAppDrawer(a.id, { preserveScroll: true });
          renderApps(); renderFees(); renderAnalytics();
          toast("Отметка взноса снята", "ok");
        } catch (err) {
          feeReset.disabled = false;
          toast(`Не удалось: ${err.message}`, "err");
        }
      });
    }

    // Статус по категории
    el.drawerBody.querySelectorAll(".d-status-btn[data-cat-status]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const status = btn.dataset.catStatus;
        const category = btn.dataset.category;
        try {
          const res = await api(`/api/applications/${a.id}/category-status`, {
            method: "POST", body: JSON.stringify({ category, status }),
          });
          Object.assign(a, res.item);
          openAppDrawer(a.id, { preserveScroll: true });
          renderApps();
          toast(`${catLabel(category)} → ${statusLabel(status)}`, "ok");
        } catch (err) {
          toast(`Не удалось: ${err.message}`, "err");
        }
      });
    });

    el.drawerBody.querySelectorAll(".edit-cats input").forEach((cb) => {
      cb.addEventListener("change", () => {
        const selected = [...el.drawerBody.querySelectorAll(".edit-cats input:checked")].map((x) => x.value);
        const battleWrap = document.getElementById("edit-battle-wrap");
        const shadowWrap = document.getElementById("edit-shadow-wrap");
        if (battleWrap) battleWrap.hidden = !selected.includes("battle");
        if (shadowWrap) shadowWrap.hidden = !selected.includes("shadow");
      });
    });

    const osView = document.getElementById("os-note-view");
    const osEdit = document.getElementById("os-note-edit");
    const osEditBtn = document.getElementById("os-edit");
    const osSaveBtn = document.getElementById("os-save");
    const osClearBtn = document.getElementById("os-clear");
    const osCopyBtn = document.getElementById("os-copy");
    const setOsMode = (editing) => {
      if (osView) osView.hidden = editing;
      if (osEdit) osEdit.hidden = !editing;
      if (osEditBtn) osEditBtn.hidden = editing;
      if (osSaveBtn) osSaveBtn.hidden = !editing;
      if (osClearBtn) osClearBtn.hidden = !editing;
    };
    const osAutosaveEl = document.getElementById("os-autosave");
    let osAutosaveTimer = null;
    const scheduleOsAutosave = () => {
      if (!osEdit) return;
      writeOsDraft(a.id, osEdit.value);
      if (osAutosaveEl) osAutosaveEl.textContent = "Черновик сохранён на этом устройстве…";
      clearTimeout(osAutosaveTimer);
      osAutosaveTimer = setTimeout(async () => {
        const text = osEdit.value;
        try {
          const res = await api(`/api/applications/${a.id}/feedback-text`, {
            method: "POST",
            body: JSON.stringify({ text }),
          });
          if (res?.item) {
            a.feedbackText = res.item.feedbackText || text;
            if (osView) osView.innerHTML = a.feedbackText ? esc(a.feedbackText) : "<span class='d-hint'>Пока пусто</span>";
          }
          if (osEdit.value === text) clearOsDraft(a.id);
          if (osAutosaveEl) osAutosaveEl.textContent = `Сохранено на сервере · ${new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
        } catch {
          if (osAutosaveEl) osAutosaveEl.textContent = "Нет связи — черновик хранится на устройстве, сохраним при следующей попытке";
        }
      }, 900);
    };
    if (osEdit) osEdit.addEventListener("input", scheduleOsAutosave);
    if (osEditing && osEdit) scheduleOsAutosave();
    if (osEditBtn) {
      osEditBtn.addEventListener("click", () => {
        setOsMode(true);
        osEdit?.focus();
      });
    }
    if (osClearBtn) {
      osClearBtn.addEventListener("click", async () => {
        const ok = await showConfirm({
          title: "Удалить весь текст обратной связи?",
          message: "Текст в поле будет очищен. Сохранится только после нажатия «Сохранить».",
        });
        if (!ok) return;
        if (osEdit) osEdit.value = "";
        osEdit?.focus();
        scheduleOsAutosave();
      });
    }
    if (osCopyBtn) {
      osCopyBtn.addEventListener("click", async () => {
        const text = (osEdit && !osEdit.hidden ? osEdit.value : (a.feedbackText || "")).trim();
        if (!text) { toast("Заметка пустая", "err"); return; }
        try {
          await navigator.clipboard.writeText(text);
          toast("Заметка скопирована", "ok");
        } catch {
          toast("Не удалось скопировать", "err");
        }
      });
    }
    if (osSaveBtn) {
      osSaveBtn.addEventListener("click", async () => {
        osSaveBtn.disabled = true;
        clearTimeout(osAutosaveTimer);
        try {
          const res = await api(`/api/applications/${a.id}/feedback-text`, {
            method: "POST",
            body: JSON.stringify({ text: osEdit ? osEdit.value : "" }),
          });
          Object.assign(a, res.item);
          clearOsDraft(a.id);
          if (osEdit) osEdit.hidden = true; // чтобы перерисовка не подхватила поле как «редактируется»
          openAppDrawer(a.id, { preserveScroll: true });
          renderApps();
          toast("Обратная связь сохранена", "ok");
        } catch (err) {
          osSaveBtn.disabled = false;
          toast(`Не удалось сохранить ОС: ${err.message}`, "err");
        }
      });
    }

    const appScheduleBtn = document.getElementById("app-schedule");
    if (appScheduleBtn) {
      appScheduleBtn.addEventListener("click", async () => {
        const at = localDateTimeToIso(document.getElementById("app-send-at")?.value);
        appScheduleBtn.disabled = true;
        try {
          const res = await api(`/api/applications/${a.id}/schedule`, {
            method: "POST",
            body: JSON.stringify({ at }),
          });
          Object.assign(a, res.item);
          openAppDrawer(a.id, { preserveScroll: true });
          renderApps();
          toast("Таймер поставлен на эту заявку", "ok");
        } catch (err) {
          appScheduleBtn.disabled = false;
          toast(`Не удалось поставить таймер: ${err.message}`, "err");
        }
      });
    }

    // ОС — отдельная пометка этапа, не связана с «требует ответа»
    const fbToggle = document.getElementById("fb-toggle");
    if (fbToggle) {
      fbToggle.addEventListener("change", async () => {
        try {
          const res = await api(`/api/applications/${a.id}/feedback`, {
            method: "POST", body: JSON.stringify({ given: fbToggle.checked }),
          });
          Object.assign(a, res.item);
          openAppDrawer(a.id, { preserveScroll: true });
          renderApps();
          toast(fbToggle.checked ? "ОС отмечена как предоставленная" : "Отметка ОС снята", "ok");
        } catch (err) {
          fbToggle.checked = !fbToggle.checked;
          toast(`Не удалось сохранить: ${err.message}`, "err");
        }
      });
    }

    // Редактирование категорий/видео/промо + комментарий в историю
    const editSave = document.getElementById("edit-save");
    if (editSave) {
      editSave.addEventListener("click", async () => {
        const categories = [...el.drawerBody.querySelectorAll(".edit-cats input:checked")].map((x) => x.value);
        const videoUrl = document.getElementById("edit-videos")?.value || "";
        const promoCode = document.getElementById("edit-promo")?.value || "";
        const battleLevel = document.getElementById("edit-battle-level")?.value || "";
        const shadowType = document.getElementById("edit-shadow-type")?.value || "";
        const shadowIdea = document.getElementById("edit-shadow-idea")?.value || "";
        const editComment = (document.getElementById("edit-comment")?.value || "").trim();
        if (!categories.length) { toast("Выберите хотя бы одну категорию", "err"); return; }
        if (!editComment) { toast("Укажите комментарий к правке — он попадёт в историю", "err"); return; }
        try {
          const res = await api(`/api/applications/${a.id}/edit`, {
            method: "POST",
            body: JSON.stringify({ categories, videoUrl, promoCode, battleLevel, shadowType, shadowIdea, editComment }),
          });
          Object.assign(a, res.item);
          openAppDrawer(a.id, { preserveScroll: true });
          renderApps();
          renderAnalytics();
          toast("Заявка обновлена", "ok");
        } catch (err) {
          toast(`Не удалось сохранить: ${err.message}`, "err");
        }
      });
    }

    const delBtn = document.getElementById("app-delete");
    if (delBtn) {
      delBtn.addEventListener("click", async () => {
        const ok = await showConfirm({
          title: "Удалить заявку?",
          message: `«${a.fullName || "Без имени"}» будет удалена безвозвратно.`,
        });
        if (!ok) return;
        try {
          await api(`/api/applications/${a.id}`, { method: "DELETE" });
          state.apps = state.apps.filter((x) => x.id !== a.id);
          closeDrawer();
          renderApps();
          renderAnalytics();
          toast("Заявка удалена", "ok");
        } catch (err) {
          toast(`Не удалось удалить: ${err.message}`, "err");
        }
      });
    }

    const subjClear = document.getElementById("reply-subject-clear");
    if (subjClear) {
      subjClear.addEventListener("click", () => {
        const subjEl = document.getElementById("reply-subject");
        if (subjEl) { subjEl.value = ""; subjEl.focus(); }
      });
    }

    // Пометить «не требует ответа»
    const markHandled = document.getElementById("mark-handled");
    if (markHandled) {
      markHandled.addEventListener("click", async () => {
        markHandled.disabled = true;
        try {
          const res = await api(`/api/applications/${a.id}/handled`, { method: "POST", body: "{}" });
          Object.assign(a, res.item);
          openAppDrawer(a.id, { preserveScroll: true });
          renderApps();
          toast("Помечено: не требует ответа", "ok");
        } catch (err) {
          markHandled.disabled = false;
          toast(`Не удалось: ${err.message}`, "err");
        }
      });
    }

    // Пикер шаблонов писем
    const tplSelect = document.getElementById("reply-template");
    const useTplWrap = document.getElementById("reply-use-tpl-wrap");
    const useTpl = document.getElementById("reply-use-tpl");
    let replyTplState = { id: "", prevSubject: "", prevBody: "" };
    if (tplSelect) {
      tplSelect.addEventListener("change", async () => {
        const tpl = EMAIL_TEMPLATES.find((t) => t.id === tplSelect.value);
        tplSelect.value = "";
        if (!tpl) return;
        const subjEl = document.getElementById("reply-subject");
        const msgEl = document.getElementById("reply-message");
        const body = fillTemplateBody(tpl, a);
        if (subjEl.value.trim() || msgEl.value.trim()) {
          const ok = await showConfirm({
            title: "Вставить шаблон?",
            message: "Текущий текст письма будет заменён шаблоном.",
          });
          if (!ok) return;
        }
        replyTplState = { id: tpl.id, prevSubject: subjEl.value, prevBody: msgEl.value };
        subjEl.value = tpl.subject;
        msgEl.value = body;
        if (useTplWrap) useTplWrap.hidden = false;
        if (useTpl) useTpl.checked = true;
        msgEl.dispatchEvent(new Event("input"));
        msgEl.focus();
        toast(a.feedbackText ? "Шаблон вставлен вместе с заметкой ОС" : "Шаблон вставлен — допишите обратную связь в заметке", "ok");
      });
    }
    if (useTpl) {
      useTpl.addEventListener("change", () => {
        const subjEl = document.getElementById("reply-subject");
        const msgEl = document.getElementById("reply-message");
        if (!useTpl.checked) {
          if (subjEl) subjEl.value = replyTplState.prevSubject || "";
          if (msgEl) msgEl.value = replyTplState.prevBody || "";
          replyTplState.id = "";
          if (msgEl) msgEl.dispatchEvent(new Event("input"));
          toast("Шаблон убран из письма", "ok");
        }
      });
    }

    // Черновик ручного письма живёт на устройстве, пока не отправлен.
    const replyMsgEl = document.getElementById("reply-message");
    const replySubjEl = document.getElementById("reply-subject");
    if (replyMsgEl) {
      const draftKey = `teni_reply_draft_${a.id}`;
      try {
        const saved = JSON.parse(localStorage.getItem(draftKey) || "null");
        if (saved && (saved.body || "").trim()) {
          replyMsgEl.value = saved.body || "";
          if (replySubjEl && saved.subject) replySubjEl.value = saved.subject;
          if (saved.tplId) {
            replyTplState = { id: saved.tplId, prevSubject: "", prevBody: "" };
            if (useTplWrap) useTplWrap.hidden = false;
            if (useTpl) useTpl.checked = true;
          }
        }
      } catch {}
      const saveReplyDraft = () => {
        try {
          if (!replyMsgEl.value.trim() && !(replySubjEl?.value || "").trim()) {
            localStorage.removeItem(draftKey);
            return;
          }
          localStorage.setItem(draftKey, JSON.stringify({
            subject: replySubjEl ? replySubjEl.value : "",
            body: replyMsgEl.value,
            tplId: replyTplState.id || "",
          }));
        } catch {}
      };
      replyMsgEl.addEventListener("input", saveReplyDraft);
      if (replySubjEl) replySubjEl.addEventListener("input", saveReplyDraft);
    }

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
          const kind = (useTpl && useTpl.checked && OS_TEMPLATE_IDS.has(replyTplState.id))
            ? "template"
            : "";
          const res = await api(`/api/applications/${a.id}/reply`, {
            method: "POST", body: JSON.stringify({ subject, message, kind }),
          });
          Object.assign(a, res.item);
          try { localStorage.removeItem(`teni_reply_draft_${a.id}`); } catch {}
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

  function openChatDrawer(sessionId, { preserveScroll = false } = {}) {
    const c = state.chats.find((x) => x.sessionId === sessionId);
    if (!c) return;
    state.drawer = { kind: "chat", appId: null, chatId: sessionId };
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
    `, { preserveScroll });
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
    state.drawer = { kind: "settings", appId: null, chatId: null };
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
    el.tabbarBtns.forEach((t) => t.classList.toggle("is-active", t.dataset.tab === tab));
    el.viewApps.hidden = tab !== "apps";
    el.viewChats.hidden = tab !== "chats";
    if (el.viewSponsors) el.viewSponsors.hidden = tab !== "sponsors";
    if (el.viewFees) el.viewFees.hidden = tab !== "fees";
    if (el.viewTickets) el.viewTickets.hidden = tab !== "tickets";
    if (el.viewShow) el.viewShow.hidden = tab !== "show";
    if (el.viewAnalytics) el.viewAnalytics.hidden = tab !== "analytics";
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
    state.booted = false;
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
    if (el.tabbarRefresh) el.tabbarRefresh.classList.add("is-spinning");
    try {
      await loadAll();
      toast("Обновлено", "ok");
    } finally {
      refreshing = false;
      if (el.tabbarRefresh) el.tabbarRefresh.classList.remove("is-spinning");
    }
  }

  if (el.tabbarRefresh) el.tabbarRefresh.addEventListener("click", () => manualRefresh(el.tabbarRefresh));
  el.tabbarBtns.forEach((t) => t.addEventListener("click", () => switchTab(t.dataset.tab)));
  if (el.tabbarSettings) el.tabbarSettings.addEventListener("click", openSettingsDrawer);
  el.appsSearch.addEventListener("input", renderApps);
  el.categoryFilter.addEventListener("change", renderApps);
  el.statusFilter.addEventListener("change", renderApps);
  if (el.extraFilter) el.extraFilter.addEventListener("change", renderApps);
  if (el.promoFilter) el.promoFilter.addEventListener("change", renderApps);
  const exportBtn = document.getElementById("export-excel");
  if (exportBtn) exportBtn.addEventListener("click", () => exportToExcel(exportBtn));
  const bulkSendAtEl = document.getElementById("bulk-send-at");
  if (bulkSendAtEl) bulkSendAtEl.addEventListener("input", () => { bulkSendTouched = true; });
  const bulkScheduleBtn = document.getElementById("bulk-schedule");
  if (bulkScheduleBtn) {
    bulkScheduleBtn.addEventListener("click", async () => {
      const atEl = document.getElementById("bulk-send-at");
      const at = localDateTimeToIso(atEl?.value || DEFAULT_BULK_SEND);
      const withOutcome = (state.apps || []).filter((a) => {
        if (a.scheduledSentAt) return false;
        return appCategories(a).some((c) => ["accepted", "reserve", "rejected"].includes(categoryStatus(a, c)));
      });
      const eligible = withOutcome.filter((a) => (a.feedbackText || "").trim());
      const noOs = withOutcome.length - eligible.length;
      if (!withOutcome.length) {
        toast("Нет заявок со статусом прошёл / резерв / не прошёл", "err");
        return;
      }
      if (!eligible.length) {
        toast(`У всех ${withOutcome.length} заявок с результатом пустая заметка ОС — сначала допишите обратную связь`, "err");
        return;
      }
      const ok = await showConfirm({
        title: "Поставить таймер рассылки?",
        message: `Письма уйдут ${atEl?.value?.replace("T", " ") || "14.09 11:00"} по Москве. Шаблон подбирается по статусу, заметка ОС вставляется сама. Заявок с ОС: ${eligible.length}.${noOs ? ` Без заметки ОС — ${noOs}, их пропустим (фильтр «ОС не предоставлена» покажет).` : ""} «На рассмотрении» не трогаем.`,
      });
      if (!ok) return;
      bulkScheduleBtn.disabled = true;
      try {
        const res = await api("/api/applications/schedule-bulk", {
          method: "POST",
          body: JSON.stringify({ at, ids: eligible.map((x) => x.id), requireFeedback: true }),
        });
        toast(`Таймер поставлен: ${res.scheduled} заявок${res.skipped ? `, пропущено ${res.skipped}` : ""}${noOs ? `, без ОС осталось ${noOs}` : ""}`, "ok");
        bulkSendTouched = false;
        await loadAll();
      } catch (err) {
        toast(`Не удалось поставить таймер: ${err.message}`, "err");
      } finally {
        bulkScheduleBtn.disabled = false;
      }
    });
  }
  document.querySelectorAll(".search-clear").forEach((btn) => {
    const input = document.getElementById(btn.dataset.clear);
    if (!input) return;
    const sync = () => { btn.hidden = !input.value; };
    input.addEventListener("input", sync);
    btn.addEventListener("click", () => {
      input.value = "";
      input.dispatchEvent(new Event("input"));
      input.focus();
      sync();
    });
    sync();
  });
  const inboxAlert = document.getElementById("inbox-alert");
  if (inboxAlert) inboxAlert.addEventListener("click", () => {
    state.onlyNeedsReply = !state.onlyNeedsReply;
    if (state.onlyNeedsReply) el.statusFilter.value = ""; // показать письма из всех статусов
    renderApps();
  });
  el.chatsSearch.addEventListener("input", renderChats);
  if (el.sponsorsSearch) el.sponsorsSearch.addEventListener("input", renderSponsors);
  if (el.showSearch) el.showSearch.addEventListener("input", renderShowLeads);
  if (el.showKindFilter) el.showKindFilter.addEventListener("change", renderShowLeads);
  if (el.ticketsSearch) el.ticketsSearch.addEventListener("input", renderTickets);
  if (el.ticketsStatusFilter) el.ticketsStatusFilter.addEventListener("change", renderTickets);
  if (el.ticketsPromoFilter) el.ticketsPromoFilter.addEventListener("change", renderTickets);
  const exportTicketsBtn = document.getElementById("export-tickets");
  if (exportTicketsBtn) exportTicketsBtn.addEventListener("click", () => exportTicketsExcel(exportTicketsBtn));
  if (el.feesSearch) el.feesSearch.addEventListener("input", renderFees);
  if (el.feesStatusFilter) el.feesStatusFilter.addEventListener("change", renderFees);
  if (el.feesCategoryFilter) el.feesCategoryFilter.addEventListener("change", renderFees);
  if (el.feesPromoFilter) el.feesPromoFilter.addEventListener("change", renderFees);
  const exportFeesBtn = document.getElementById("export-fees");
  if (exportFeesBtn) exportFeesBtn.addEventListener("click", () => exportFeesExcel(exportFeesBtn));
  const exportFormsBtn = document.getElementById("export-forms");
  if (exportFormsBtn) exportFormsBtn.addEventListener("click", () => exportFormsExcel(exportFormsBtn));
  el.drawerClose.addEventListener("click", closeDrawer);
  el.drawerBackdrop.addEventListener("click", closeDrawer);
  el.alertCancel.addEventListener("click", () => closeAlert(false));
  el.alertOk.addEventListener("click", () => closeAlert(true));
  el.alertBackdrop.addEventListener("click", () => closeAlert(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!el.alert.hidden) closeAlert(false);
      else if (!el.drawer.hidden) closeDrawer();
    }
  });

  // Авто-обновление: подтягиваем заявки и переписку, в т.ч. когда открыта карточка.
  function shouldAutoSync() {
    if (!getToken()) return false;
    if (el.app.hidden) return false;
    if (document.visibilityState === "hidden") return false;
    return true;
  }

  setInterval(() => {
    if (!shouldAutoSync()) return;
    const inAppDrawer = !el.drawer.hidden && state.drawer.kind === "app";
    syncFreshData({ silent: true, fetchInbox: inAppDrawer });
  }, 15000);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && shouldAutoSync()) {
      syncFreshData({ fetchInbox: true });
    }
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (e) => {
      if (e.data?.type === "teni-refresh" && shouldAutoSync()) {
        syncFreshData({ fetchInbox: true });
      }
    });
  }

  applyBg(currentBg());
  localStorage.removeItem("teni_admin_trash");
  fillCategoryFilter();
  if (getToken()) showApp();
  else showLogin();
})();
