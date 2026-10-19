/* Vivamente — música ambiente suave, gerada no próprio navegador (WebAudio): sem arquivo, sem direitos autorais.
   Pads lentos em acordes abertos + notas de sino em escala pentatônica, com reverb. Começa no primeiro toque/clique
   (os navegadores não deixam tocar sozinho) e o botão ♪ liga/desliga. A preferência fica guardada. */
(function () {
  var AC = window.AudioContext || window.webkitAudioContext;
  var btn = document.getElementById("gmusic");
  if (!AC || !btn) { if (btn) btn.hidden = true; return; }

  var KEY = "vivamente-musica";
  var ctx = null, master = null, dry = null, wet = null, analyser = null, timer = null;
  var tocando = false, queroTocar = true;
  var proxAcorde = 0, proxNota = 0, idxAcorde = 0, ultimaNota = -1;
  var VOL = 1;

  try { if (localStorage.getItem(KEY) === "off") queroTocar = false; } catch (e) {}

  // acordes (Cmaj9 · Am9 · Fmaj9 · G6/9) em oitavas graves, para um colchão sonoro quente
  var ACORDES = [
    [130.81, 261.63, 392.0, 493.88, 587.33, 659.25],
    [110.0, 220.0, 329.63, 392.0, 493.88, 523.25],
    [87.31, 174.61, 261.63, 440.0, 523.25, 659.25],
    [98.0, 196.0, 293.66, 493.88, 587.33, 659.25]
  ];
  // escala pentatônica de Dó para as notas de sino
  var NOTAS = [392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];

  function impulso(seg) {
    var rate = ctx.sampleRate, len = Math.floor(rate * seg);
    var buf = ctx.createBuffer(2, len, rate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    return buf;
  }

  function montar() {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -22; comp.ratio.value = 4;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    dry = ctx.createGain(); dry.gain.value = 0.7;
    wet = ctx.createGain(); wet.gain.value = 0.55;
    var conv = ctx.createConvolver();
    conv.buffer = impulso(4.5);
    dry.connect(master);
    wet.connect(conv); conv.connect(master);
    master.connect(comp); comp.connect(analyser); analyser.connect(ctx.destination);
    window.vivaMusica = { ctx: ctx, analyser: analyser };
  }

  function pad(freq, t0, dur) {
    [["sine", 0, 0.05], ["triangle", 3, 0.03]].forEach(function (cfg) {
      var o = ctx.createOscillator();
      o.type = cfg[0]; o.frequency.value = freq; o.detune.value = cfg[1] + (Math.random() * 6 - 3);
      var g = ctx.createGain();
      var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 2200; f.Q.value = 0.4;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(cfg[2], t0 + 3.2);
      g.gain.setValueAtTime(cfg[2], t0 + dur - 3.4);
      g.gain.linearRampToValueAtTime(0.0001, t0 + dur + 2.2);
      o.connect(f); f.connect(g); g.connect(dry); g.connect(wet);
      o.start(t0); o.stop(t0 + dur + 2.4);
    });
  }

  function sino(freq, t0, pan) {
    var o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = freq;
    var o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = freq * 2.003;
    var g = ctx.createGain(), g2 = ctx.createGain();
    var p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.16, t0 + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 4.2);
    g2.gain.setValueAtTime(0.0001, t0);
    g2.gain.linearRampToValueAtTime(0.03, t0 + 0.02);
    g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
    o.connect(g); o2.connect(g2); g2.connect(g);
    if (p) { p.pan.value = pan; g.connect(p); p.connect(dry); p.connect(wet); }
    else { g.connect(dry); g.connect(wet); }
    o.start(t0); o2.start(t0); o.stop(t0 + 4.4); o2.stop(t0 + 1.8);
  }

  function agendar() {
    if (!ctx || ctx.state !== "running") return;
    var agora = ctx.currentTime, horizonte = agora + 2;
    while (proxAcorde < horizonte) {
      var ac = ACORDES[idxAcorde % ACORDES.length];
      ac.forEach(function (f, i) { pad(f, proxAcorde + i * 0.18, 10); });
      idxAcorde++;
      proxAcorde += 8.5;
    }
    while (proxNota < horizonte) {
      var i;
      do { i = Math.floor(Math.random() * NOTAS.length); } while (i === ultimaNota);
      ultimaNota = i;
      sino(NOTAS[i], proxNota, Math.random() * 1.2 - 0.6);
      proxNota += 1.9 + Math.random() * 2.6;
    }
  }

  function ligar() {
    if (tocando) return;
    if (!ctx) montar();
    var inicio = function () {
      var t = ctx.currentTime;
      if (!proxAcorde || proxAcorde < t) { proxAcorde = t + 0.15; proxNota = t + 1.4; }
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(VOL, t + 4);
      agendar();
      if (!timer) timer = setInterval(agendar, 600);
    };
    tocando = true;
    atualizar();
    if (ctx.state === "suspended") ctx.resume().then(inicio); else inicio();
    aviso("♪ Música ambiente ligada");
  }

  function desligar() {
    if (!tocando || !ctx) return;
    tocando = false;
    atualizar();
    aviso("Música desligada");
    var t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0, t + 1.2);
    clearInterval(timer); timer = null;
    setTimeout(function () { if (!tocando && ctx) { ctx.suspend(); proxAcorde = 0; } }, 1500);
  }

  function aviso(txt) {
    var el = document.getElementById("gtoast");
    if (!el) { el = document.createElement("div"); el.id = "gtoast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    el.textContent = txt; el.classList.add("on");
    clearTimeout(aviso.t); aviso.t = setTimeout(function () { el.classList.remove("on"); }, 2600);
  }

  function atualizar() {
    btn.classList.toggle("on", tocando);
    btn.setAttribute("aria-pressed", tocando ? "true" : "false");
    btn.title = tocando ? "Desligar a música ambiente" : "Ligar a música ambiente";
  }

  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    queroTocar = !tocando;
    try { localStorage.setItem(KEY, queroTocar ? "on" : "off"); } catch (er) {}
    if (queroTocar) ligar(); else desligar();
  });

  // o navegador só libera o som depois de um gesto: o primeiro toque/tecla inicia a música (se não foi desligada)
  function primeiroGesto(e) {
    if (btn.contains(e.target)) return; // clique no próprio botão ♪ é tratado por ele
    document.removeEventListener("pointerdown", primeiroGesto, true);
    document.removeEventListener("keydown", primeiroGesto, true);
    if (queroTocar && !tocando) ligar();
  }
  document.addEventListener("pointerdown", primeiroGesto, true);
  document.addEventListener("keydown", primeiroGesto, true);

  // pausa quando a aba fica em segundo plano
  document.addEventListener("visibilitychange", function () {
    if (!ctx || !tocando) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });

  atualizar();
})();
