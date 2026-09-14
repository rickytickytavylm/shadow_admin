// Настройки админ-панели.
//
// PROD_API_BASE — основной адрес бэкенда (RU-прокси перед Railway).
// FALLBACK_API_BASE — прямой адрес Railway: используется автоматически,
//   если основной не отвечает (таймаут / сетевая ошибка).
//
// Локально (localhost / 127.0.0.1) автоматически используется LOCAL_API_BASE.
(() => {
  const PROD_API_BASE = "https://api.xn----7sbocmxidei1bb9cwe.xn--p1ai";
  const FALLBACK_API_BASE = "https://web-production-0ab2f.up.railway.app";
  const LOCAL_API_BASE = "http://localhost:8090";

  const host = location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "";

  window.SHADOW_ADMIN_CONFIG = {
    API_BASE: isLocal ? LOCAL_API_BASE : PROD_API_BASE,
    FALLBACK_API_BASE: isLocal ? "" : FALLBACK_API_BASE,
  };
})();
