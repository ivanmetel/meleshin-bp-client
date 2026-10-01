// ЛК клиента (bp-client) — клиентская половина машины сборки КП.
// Источник состояния — админка (bp-admin): по умолчанию ЛК грузит опубликованное
// состояние (published.json репо админки), ссылка «Предпросмотр ЛК клиента» из
// админки передаёт текущее состояние конструктора в адресе (#preview=…) — правки
// админы видны в ЛК сразу. Движок и данные подгружаются со страницы админки,
// поэтому изменения админы приходят в ЛК без дублирования кода.
(function () {
  const ADMIN = new URLSearchParams(location.search).get("admin") || "https://ivanmetel.github.io/meleshin-bp-admin/";
  const V = "18";

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

  // Вид «Условия»: предпросмотр КП + согласование и сохранение PDF (Иван 01.10 —
  // действия убраны из героя и живут здесь).
  function conditionsHtml(a) {
    return '<div class="cond-view"><div class="cond-head"><div class="cond-title">Предпросмотр КП</div>' +
      '<div class="cond-actions">' +
      '<button class="btn ghost" id="btn-pdf">Сохранить PDF</button>' +
      "</div></div>" + renderDoc(a) + "</div>";
  }

  function viewHtml(a) {
    const right = STATE.view === "conditions" ? conditionsHtml(a) : renderPanel(a);
    return '<div class="est-body">' + renderRail(a) + right + "</div>";
  }

  function render() {
    const a = build();
    document.getElementById("hero").innerHTML = renderHero(a);
    document.getElementById("content").innerHTML = '<div id="est-root">' + viewHtml(a) + "</div>";
    document.getElementById("print-doc").innerHTML = renderDoc(a);
    wire();
  }

  function wire() {
    // Смена вида/экрана/помещения: точечное обновление зоны — героя и скролл не трогаем.
    const estRoot = document.getElementById("est-root");
    if (estRoot) estRoot.addEventListener("click", (e) => {
      const scr = e.target.closest("[data-screen]");
      const roomBtn = e.target.closest("[data-room]");
      const viewBtn = e.target.closest("[data-view]");
      if (viewBtn) STATE.view = viewBtn.dataset.view;
      if (scr) {
        STATE.view = "estimate";
        const k = scr.dataset.screen;
        const other = k === "works" ? STATE.materials : STATE.works;
        if (other) STATE[k] = !STATE[k];   // хотя бы один экран остаётся нажатым
      }
      if (roomBtn) { STATE.view = "estimate"; STATE.room = roomBtn.dataset.room; }
      if (scr || roomBtn || viewBtn) estRoot.innerHTML = viewHtml(build());
    });
    const pdf = document.getElementById("btn-pdf");
    if (pdf) pdf.addEventListener("click", () => window.print());
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
