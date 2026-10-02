// ЛК клиента v2 (bp-client) — клиентская половина машины сборки КП.
// Источник состояния — админка (bp-admin): по умолчанию ЛК грузит опубликованное
// состояние (published.json репо админки), ссылка «Предпросмотр ЛК клиента» из
// админки передаёт текущее состояние конструктора в адресе (#preview=…) — правки
// админы видны в ЛК сразу. Движок и данные подгружаются со страницы админки,
// поэтому изменения админы приходят в ЛК без дублирования кода.
// v2 (Иван 02.10): одна вкладка — КП; экранов сметы нет; выбор помещения —
// строка кнопок в документе, фильтрует таблицу работ; «Сохранить PDF» —
// полный документ.
(function () {
  const ADMIN = new URLSearchParams(location.search).get("admin") || "https://ivanmetel.github.io/meleshin-bp-admin/";
  const V = "34";

  const loadScript = (src) => new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = res;
    s.onerror = () => rej(new Error("не загрузился: " + src));
    document.head.appendChild(s);
  });

  // #preview=… — предпросмотр из админки: манифест + вариант + статус в адресе
  const decodePreview = () => {
    const m = location.hash.match(/^#preview=(.+)$/);
    if (!m) return null;
    try {
      const b64 = decodeURIComponent(m[1]);   // хэш приходит percent-encoded
      return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))));
    } catch (e) {
      return null;
    }
  };

  // Кабинет v2: герой (без экранов) + вкладка КП (engine renderEstimate).
  function render() {
    const a = build();
    document.getElementById("hero").innerHTML = renderHero(a);
    document.getElementById("content").innerHTML = renderEstimate(a);
    document.getElementById("print-doc").innerHTML = renderDoc(a, { print: true });
    wire();
  }

  function wire() {
    const content = document.getElementById("content");
    // Помещение фильтрует таблицу работ в документе (строка кнопок между
    // заголовком зоны и таблицей) — меняется только вкладка КП; печать
    // собирается от манифеста, выбор помещения в PDF не попадает.
    content.addEventListener("click", (e) => {
      if (e.target.closest("#btn-pdf")) { window.print(); return; }
      const roomBtn = e.target.closest("[data-room]");
      if (!roomBtn) return;
      STATE.room = roomBtn.dataset.room;
      document.getElementById("content").innerHTML = renderEstimate(build());
    });
  }

  (async () => {
    await loadScript(ADMIN + "data.js?v=" + V);
    await loadScript(ADMIN + "engine.js?v=" + V);
    const preview = decodePreview();
    if (preview && preview.manifest) {
      STATE.manifest = preview.manifest;
      STATE.variant = preview.variant || "base";
      STATE.status = preview.status || "sent";
    } else {
      try {
        const r = await fetch(ADMIN + "published.json", { cache: "no-cache" });
        const pub = await r.json();
        STATE.manifest = pub.manifest;
        STATE.variant = pub.variant || "base";
        STATE.status = pub.status || "sent";
      } catch (e) {
        // админка недоступна — рендер демо-сборки из манифеста движка по умолчанию
      }
    }
    render();
  })();
})();
