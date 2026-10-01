// ЛК клиента (bp-client) — клиентская половина машины сборки КП.
// Источник состояния — админка (bp-admin): по умолчанию ЛК грузит опубликованное
// состояние (published.json репо админки), ссылка «Предпросмотр ЛК клиента» из
// админки передаёт текущее состояние конструктора в адресе (#preview=…) — правки
// админы видны в ЛК сразу. Движок и данные подгружаются со страницы админки,
// поэтому изменения админы приходят в ЛК без дублирования кода.
(function () {
  const ADMIN = new URLSearchParams(location.search).get("admin") || "https://ivanmetel.github.io/meleshin-bp-admin/";
  const V = "24";

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

  // Поиск по позициям (Иван 01.10, вернул): строка над панелью сметы; фильтрует
  // строки показанных таблиц — итоги и каунтеры пересчитываются по показанным
  // строкам (принцип калькулятора), цена героя остаётся ценой КП. В «Условиях»
  // поиска нет — документ не фильтруется.
  const searchNote = (t) => {
    if (!t.searchCounts.s) return "";
    const parts = [];
    if (STATE.works) parts.push("работы " + t.searchCounts.works[0] + " из " + t.searchCounts.works[1]);
    if (STATE.materials) parts.push("материалы " + t.searchCounts.mats[0] + " из " + t.searchCounts.mats[1]);
    return parts.length ? "Поиск: " + parts.join(" · ") : "";
  };
  // Строка поиска живёт над панелью; в «Условиях» поле скрыто, но место
  // зарезервировано (min-height тулбара) — рамка панели не прыгает между видами.
  const toolbar = (t) =>
    '<div class="d3-toolbar">' + (STATE.view === "conditions" ? "" :
      '<div class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
      '<input id="est-search" placeholder="Поиск по позициям…" value="' + esc(STATE.search) + '"></div>' +
      '<div class="doc-filter-note" id="search-note">' + searchNote(t) + "</div>") + "</div>";

  function render() {
    const a = build();
    document.getElementById("hero").innerHTML = renderHero(a);
    document.getElementById("content").innerHTML = toolbar(estimateTables(a)) + renderEstimate(a);
    document.getElementById("print-doc").innerHTML = renderDoc(a, { print: true });
    wire();
  }

  function wire() {
    const hero = document.getElementById("hero");
    const content = document.getElementById("content");
    const rerender = () => {
      const a = build();
      hero.innerHTML = renderHero(a);
      content.innerHTML = toolbar(estimateTables(a)) + renderEstimate(a);
    };
    // Экраны — в герое (под ценой): Условия — вид, Работы/Материалы — переключатели.
    hero.addEventListener("click", (e) => {
      const viewBtn = e.target.closest("[data-view]");
      const scr = e.target.closest("[data-screen]");
      if (!viewBtn && !scr) return;
      if (viewBtn) STATE.view = viewBtn.dataset.view;
      if (scr) {
        STATE.view = "estimate";
        const k = scr.dataset.screen;
        const other = k === "works" ? STATE.materials : STATE.works;
        if (other) STATE[k] = !STATE[k];   // хотя бы один экран остаётся нажатым
      }
      rerender();
    });
    // Помещения (клик в «Условиях» возвращает к таблицам) + сохранение PDF.
    content.addEventListener("click", (e) => {
      if (e.target.closest("#btn-pdf")) { window.print(); return; }
      const roomBtn = e.target.closest("[data-room]");
      if (!roomBtn) return;
      STATE.view = "estimate";
      STATE.room = roomBtn.dataset.room;
      rerender();
    });
    // Ввод поиска: обновляем панель и заметку, поле не пересоздаём — фокус живёт.
    content.addEventListener("input", (e) => {
      if (e.target.id !== "est-search") return;
      STATE.search = e.target.value;
      const estRoot = document.getElementById("est-root");
      if (estRoot) estRoot.innerHTML = renderEstimate(build());
      const note = document.getElementById("search-note");
      if (note) note.textContent = searchNote(estimateTables(build()));
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
