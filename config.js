// Настройки админ-панели.
//
// PROD_API_BASE — адрес бэкенда на Railway.
//   После первого деплоя бэка вставьте сюда его URL, например:
//   "https://shadow-backend-production.up.railway.app"
//   Домен админки не забудьте добавить в ALLOWED_ORIGINS бэкенда.
//
// Локально (localhost / 127.0.0.1) автоматически используется LOCAL_API_BASE.
(() => {
  const PROD_API_BASE = "https://web-production-0ab2f.up.railway.app";
  const LOCAL_API_BASE = "http://localhost:8090";

  const host = location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "";

  window.SHADOW_ADMIN_CONFIG = {
    API_BASE: isLocal ? LOCAL_API_BASE : PROD_API_BASE,
  };
})();
