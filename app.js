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

  // Готовые шаблоны писем. [Имя] подставляется автоматически, остальные [ссылки]/
  // [индивидуальная обратная связь] правятся вручную перед отправкой.
  const EMAIL_TEMPLATES = [
    {
      id: "accepted",
      label: "Прошёл видеоотбор + ОС",
      subject: "Вы прошли видеоотбор чемпионата «Тень»",
      body:
`Здравствуйте, [Имя]!
Поздравляем! По результатам видеоотбора вы прошли в чемпионат «Тень».
Обратная связь от Кристины Бродецкой по вашему номеру:
[индивидуальная обратная связь]
Следующий шаг — оплатить основной взнос за участие и заполнить анкету участника.
Срок оплаты основного взноса: до 21 сентября.
Ссылка на оплату:
[ссылка]
Ссылка на анкету участника:
[ссылка]
Пожалуйста, выполните оба шага в установленный срок, чтобы подтвердить участие.
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
Обратная связь от Кристины Бродецкой по вашему номеру:
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
Обратная связь от Кристины Бродецкой по вашему номеру:
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
    tabAnalyticsCount: document.getElementById("tab-analytics-count"),
    viewApps: document.getElementById("view-apps"),
    viewChats: document.getElementById("view-chats"),
    viewSponsors: document.getElementById("view-sponsors"),
    viewAnalytics: document.getElementById("view-analytics"),
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

  const SPONSOR_STATUS_LABELS = { new: "Новая", handled: "Обработана", archived: "Архив" };
  const SPONSOR_STATUS_ORDER = ["new", "handled", "archived"];

  const state = {
    apps: [],
    chats: [],
    sponsors: [],
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

      const [apps, chats, sponsors, analytics, deleted] = await Promise.all([
        api("/api/applications?limit=1000"),
        api("/api/ai/chats?limit=500").catch(() => ({ items: [] })),
        api("/api/sponsors?limit=1000").catch(() => ({ items: [] })),
        api("/api/events?type=vinovnali_click&limit=1000").catch(() => ({ items: [], stats: null })),
        api("/api/applications/deleted/list?limit=300").catch(() => ({ items: [] })),
      ]);
      state.apps = apps.items || [];
      state.emailEnabled = Boolean(apps.emailEnabled);
      state.inboxEnabled = Boolean(apps.inboxEnabled);
      state.chats = chats.items || [];
      state.sponsors = sponsors.items || [];
      state.events = analytics.items || [];
      state.deletedApps = deleted.items || [];
      if (analytics.stats) state.analyticsStats = analytics.stats;
      fillPromoFilter();
      setBadge(el.tabChatsCount, state.chats.length);
      setBadge(el.tabSponsorsCount, state.sponsors.filter((s) => (s.status || "new") === "new").length);
      setBadge(el.tabAnalyticsCount, state.analyticsStats.today || 0);
      renderApps();
      renderChats();
      renderSponsors();
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
      if (isReplyDraftOpen()) return;
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
      if (extra === "has_messages" && !(Array.isArray(a.messages) && a.messages.length)) return false;
      if (extra === "os_yes" && !a.feedbackGiven) return false;
      if (extra === "os_no" && a.feedbackGiven) return false;
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

  function buildAppCardHtml(a) {
    const msgs = Array.isArray(a.messages) ? a.messages : [];
    const nr = needsReply(a);
    const cardCats = appCategories(a);
    const cardCatsHtml = cardCats.map((c) => {
      const st = categoryStatus(a, c);
      const showSt = WORKFLOW_STATUSES.includes(st);
      return `<span class="chip chip-cat">${esc(catLabel(c))}${showSt ? " · " + esc(statusLabel(st)) : ""}</span>`;
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
          : (msgs.length ? `<span class="chip chip-muted">✉ ${msgs.length}</span>` : "")}
        ${a.feedbackGiven ? `<span class="chip chip-os">ОС ✓</span>` : ""}
        ${a.promoCode ? `<span class="chip chip-promo">🎟 ${esc(a.promoCode)}</span>` : ""}
      </div>`;
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

  function renderApps() {
    updateFilterCounts();
    updateInboxAlert();
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
          "Видео": a.videoUrl || "",
          "Сообщений": msgs.length,
          "ID платежа": a.paymentId || "",
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [17, 24, 26, 15, 16, 16, 14, 10, 10, 28, 16, 10, 10, 12, 14, 32, 11, 24].map((wch) => ({ wch }));
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
  function closeDrawer() {
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
    state.drawer = { kind: "app", appId: id, chatId: null };

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

    const payBtns = PAYMENT_STATUSES.map((s) =>
      `<button type="button" class="d-status-btn ${(isPaid(a) ? "paid" : "awaiting_payment") === s ? "is-active" : ""}" data-status="${s}">${esc(statusLabel(s))}</button>`
    ).join("");

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
      </dl>
      <p class="d-hint">Оплата одна на заявку — даже если категорий несколько.</p>
      <div class="d-status-row">${payBtns}</div>

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

      <div class="d-section-title">Статус по категориям</div>
      <p class="d-hint">Можно принять в одной категории и отклонить в другой. Участник статусы не видит.</p>
      ${perCatStatusHtml || "<p class='d-hint'>Категории не указаны.</p>"}
      <label class="d-os-toggle">
        <input type="checkbox" id="fb-toggle" ${a.feedbackGiven ? "checked" : ""}>
        <span>Обратная связь (ОС) предоставлена</span>
      </label>

      <div class="d-section-title">Переписка</div>
      ${needsReply(a) ? `<div class="reply-needed-row">
        <span class="chip chip-reply">✉ требует ответа</span>
        <button type="button" id="mark-handled" class="btn-link">Пометить: не требует ответа</button>
      </div>` : ""}
      ${convoHtml}

      <div class="d-section-title">Ответить участнику на почту</div>
      ${replyBox}

      <details class="d-details">
        <summary>Редактировать / удалить</summary>
        <div style="margin-top:12px">
          <p class="d-hint">Категории (отметьте нужные)</p>
          <div class="edit-cats">${catChecks}</div>
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

    // Оплата (глобально)
    el.drawerBody.querySelectorAll(".d-status-btn[data-status]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const status = btn.dataset.status;
        try {
          const res = await api(`/api/applications/${a.id}/status`, {
            method: "POST", body: JSON.stringify({ status }),
          });
          Object.assign(a, res.item);
          openAppDrawer(a.id, { preserveScroll: true });
          renderApps();
          toast(`Статус оплаты: ${statusLabel(status)}`, "ok");
        } catch (err) {
          toast(`Не удалось изменить статус: ${err.message}`, "err");
        }
      });
    });

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
        const editComment = (document.getElementById("edit-comment")?.value || "").trim();
        if (!categories.length) { toast("Выберите хотя бы одну категорию", "err"); return; }
        if (!editComment) { toast("Укажите комментарий к правке — он попадёт в историю", "err"); return; }
        try {
          const res = await api(`/api/applications/${a.id}/edit`, {
            method: "POST",
            body: JSON.stringify({ categories, videoUrl, promoCode, editComment }),
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
    if (tplSelect) {
      tplSelect.addEventListener("change", async () => {
        const tpl = EMAIL_TEMPLATES.find((t) => t.id === tplSelect.value);
        tplSelect.value = "";
        if (!tpl) return;
        const subjEl = document.getElementById("reply-subject");
        const msgEl = document.getElementById("reply-message");
        const firstName = (a.fullName || "").trim().split(/\s+/)[0] || "";
        const body = tpl.body.replace(/\[Имя\]/g, firstName || "[Имя]");
        if (subjEl.value.trim() || msgEl.value.trim()) {
          const ok = await showConfirm({
            title: "Вставить шаблон?",
            message: "Текущий текст письма будет заменён шаблоном.",
          });
          if (!ok) return;
        }
        subjEl.value = tpl.subject;
        msgEl.value = body;
        msgEl.focus();
        toast("Шаблон вставлен — проверьте [ссылки] и обратную связь", "ok");
      });
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
    el.viewSponsors.hidden = tab !== "sponsors";
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
  const inboxAlert = document.getElementById("inbox-alert");
  if (inboxAlert) inboxAlert.addEventListener("click", () => {
    state.onlyNeedsReply = !state.onlyNeedsReply;
    if (state.onlyNeedsReply) el.statusFilter.value = ""; // показать письма из всех статусов
    renderApps();
  });
  el.chatsSearch.addEventListener("input", renderChats);
  if (el.sponsorsSearch) el.sponsorsSearch.addEventListener("input", renderSponsors);
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
