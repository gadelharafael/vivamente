/* Vivamente — cartão de visita: navegação entre páginas (botões, bolinhas, teclado, deslizar, #hash),
   ajuste da página ao tamanho da tela e botão de PDF (link para o arquivo pronto). */
(function () {
  var pages = Array.prototype.slice.call(document.querySelectorAll(".page"));
  var ids = pages.map(function (p) { return p.id; });
  var dots = document.getElementById("gdots");
  var cnt = document.getElementById("gcnt");
  var prev = document.getElementById("gprev");
  var next = document.getElementById("gnext");
  var cur = 0;

  pages.forEach(function (p, i) {
    var d = document.createElement("i");
    d.title = p.dataset.titulo || "";
    d.onclick = function () { show(i); };
    dots.appendChild(d);
  });

  // A página sempre cabe inteira na janela (sem rolagem): ocupa a área livre e, se o texto não couber,
  // reduz a escala aos poucos até caber. Em celular a largura é a da tela; em computador, no máximo 460 px.
  // há conteúdo cortado? (os brilhos e a folha decorativos ficam de fora da conta)
  function estoura(a, z) {
    var body = a.querySelector(".pbody");
    if (body) return body.scrollHeight > body.clientHeight + 1 || body.scrollWidth > body.clientWidth + 1;
    var kids = Array.prototype.filter.call(a.children, function (k) { return !/(^|\s)(glow|leaf|pf)(\s|$)/.test(k.className); });
    var last = kids[kids.length - 1];
    if (!last) return false;
    return last.getBoundingClientRect().bottom > a.getBoundingClientRect().bottom - 26 * z;
  }

  function fit() {
    var a = pages[cur];
    if (!a) return;
    var nav = document.querySelector(".gnav");
    var navH = nav ? nav.offsetHeight : 64;
    var availW = window.innerWidth - 12;
    var availH = window.innerHeight - navH - 22;
    var body = a.querySelector(".pbody") || a;
    var z = 1, ok = false;
    for (; z >= 0.58; z = Math.round((z - 0.04) * 100) / 100) {
      var W = Math.min(460, availW / z), H = availH / z;
      a.style.setProperty("--pw", W + "px");
      a.style.setProperty("--ph", H + "px");
      a.style.zoom = z === 1 ? "" : z;
      if (!estoura(a, z)) { ok = true; break; }
    }
    if (!ok) { a.style.zoom = 0.58; }
  }

  function show(i, hash) {
    i = Math.max(0, Math.min(pages.length - 1, i));
    pages.forEach(function (p, k) { p.classList.toggle("active", k === i); });
    Array.prototype.forEach.call(dots.children, function (d, k) { d.classList.toggle("on", k === i); });
    cur = i;
    cnt.textContent = i + 1 + " / " + pages.length;
    prev.disabled = i === 0;
    next.disabled = i === pages.length - 1;
    document.title = (i ? pages[i].dataset.titulo + " · " : "") + "Vivamente — Cartão de visita";
    if (hash !== false) history.replaceState(null, "", "#" + ids[i]);
    window.scrollTo(0, 0);
    fit();
  }

  function fromHash() {
    var k = ids.indexOf(location.hash.replace("#", ""));
    show(k >= 0 ? k : 0, false);
  }

  prev.onclick = function () { show(cur - 1); };
  next.onclick = function () { show(cur + 1); };
  window.addEventListener("hashchange", fromHash);
  window.addEventListener("resize", fit);
  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight" || e.key === "PageDown") show(cur + 1);
    else if (e.key === "ArrowLeft" || e.key === "PageUp") show(cur - 1);
    else if (e.key === "Home") show(0);
    else if (e.key === "End") show(pages.length - 1);
  });

  // deslizar para o lado (celular)
  var x0 = null, y0 = null;
  document.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  document.addEventListener("touchend", function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) show(cur + (dx < 0 ? 1 : -1));
    x0 = y0 = null;
  }, { passive: true });

  document.body.classList.add("ready");
  fromHash();
  // imagens carregam depois: reajusta
  window.addEventListener("load", fit);
})();
