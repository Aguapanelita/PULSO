(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const NAMES = ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
  const SCALES = { pmaj: [0, 2, 4, 7, 9], pmin: [0, 3, 5, 7, 10], maj: [0, 2, 4, 5, 7, 9, 11], chr: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const noteName = (m) => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);

  const S = { src: "demo", view: "mix", cols: 5, rows: 3, scale: "pmaj", root: 48, thr: 28, sens: 0.03, cool: 320,
    wave: "triangle", atk: 0.008, rel: 0.7, cut: 3200, rev: 0.3, vol: 0.6, mapVel: true, mapPan: true, mirror: true,
    tint: 0.22, veil: 0, lines: true, notes: true, parts: true };

  let toastT = 0;
  function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600); }

  // ================= dock =================
  document.querySelectorAll(".trigger").forEach((tr) => tr.addEventListener("click", () => {
    const id = tr.dataset.panel, open = tr.getAttribute("aria-expanded") === "true";
    document.querySelectorAll(".trigger").forEach((t) => { t.setAttribute("aria-expanded", "false"); $(t.dataset.panel).hidden = true; });
    if (!open) { tr.setAttribute("aria-expanded", "true"); $(id).hidden = false; }
  }));
  document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => {
    const p = b.closest(".panel"); p.hidden = true; document.querySelector('[data-panel="' + p.id + '"]').setAttribute("aria-expanded", "false");
  }));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") document.querySelectorAll("[data-close]").forEach((b) => { if (!b.closest(".panel").hidden) b.click(); }); });

  // ================= fuentes =================
  const video = document.createElement("video");
  video.muted = true; video.loop = true; video.playsInline = true;
  let stream = null;
  const demo = document.createElement("canvas"); demo.width = 640; demo.height = 360;
  const dctx = demo.getContext("2d");
  const lanes = [0.22, 0.5, 0.78], cars = [];
  for (let i = 0; i < 7; i++) {
    const lane = i % 3;
    cars.push({ lane, x: Math.random() * 640, v: (lane === 1 ? -1 : 1) * (90 + Math.random() * 160), w: 60 + Math.random() * 70, c: ["#E2FF3B", "#EEF0FF", "#6A6AFF", "#9A7BFF"][i % 4] });
  }
  let birdT = 0;
  function drawDemo(dt) {
    dctx.fillStyle = "#0B0C2C"; dctx.fillRect(0, 0, 640, 360);
    dctx.fillStyle = "#16184E"; lanes.forEach((y) => dctx.fillRect(0, y * 360 - 34, 640, 68));
    dctx.strokeStyle = "rgba(238,240,255,.18)"; dctx.setLineDash([18, 16]); dctx.lineWidth = 2;
    [0.36, 0.64].forEach((y) => { dctx.beginPath(); dctx.moveTo(0, y * 360); dctx.lineTo(640, y * 360); dctx.stroke(); });
    dctx.setLineDash([]);
    for (const c of cars) {
      c.x += c.v * dt;
      if (c.v > 0 && c.x > 700) { c.x = -c.w - Math.random() * 200; c.v = 90 + Math.random() * 160; }
      if (c.v < 0 && c.x < -c.w - 60) { c.x = 640 + Math.random() * 200; c.v = -(90 + Math.random() * 160); }
      dctx.fillStyle = c.c; dctx.fillRect(c.x, lanes[c.lane] * 360 - 24, c.w, 48);
    }
    birdT += dt;
    dctx.fillStyle = "#EEF0FF"; dctx.beginPath(); dctx.arc((birdT * 70) % 760 - 60, 40 + Math.sin(birdT * 2.2) * 18, 7, 0, Math.PI * 2); dctx.fill();
  }

  function setSrc(src, status) {
    S.src = src; prev = null;
    $("srcDemo").setAttribute("aria-pressed", String(src === "demo"));
    $("srcCam").setAttribute("aria-pressed", String(src === "cam" || src === "camoff"));
    $("srcFile").setAttribute("aria-pressed", String(src === "file"));
    $("camCtx").hidden = !(src === "cam" || src === "camoff");
    $("vidCtx").hidden = src !== "file";
    $("camOff").textContent = src === "camoff" ? "Encender cámara" : "Apagar cámara";
    $("status").textContent = status;
  }
  function stopStream() { if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; } }
  async function startCam() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("sin API");
      stopStream(); video.pause(); video.removeAttribute("src");
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360 }, audio: false });
      video.srcObject = stream; await video.play();
      setSrc("cam", "Fuente: cámara");
    } catch (e) {
      toast("Esta vista no permite usar la cámara: abre la versión local o la de GitHub Pages");
      $("status").textContent = "Cámara bloqueada en esta vista · versión local (localhost) o GitHub Pages";
    }
  }
  $("srcDemo").addEventListener("click", () => { stopStream(); video.pause(); setSrc("demo", "Fuente: ejemplo · calle sintética"); });
  $("srcCam").addEventListener("click", startCam);
  $("camOff").addEventListener("click", () => {
    if (S.src === "cam") { stopStream(); video.srcObject = null; setSrc("camoff", "Cámara apagada"); }
    else startCam();
  });
  $("srcFile").addEventListener("click", () => $("fileInput").click());
  $("vChange").addEventListener("click", () => $("fileInput").click());
  $("fileInput").addEventListener("change", async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    stopStream(); video.srcObject = null; video.src = URL.createObjectURL(f); video.loop = $("vLoop").getAttribute("aria-pressed") === "true";
    try { await video.play(); } catch (_) {}
    setSrc("file", "Fuente: " + f.name);
    e.target.value = "";
  });
  $("vPlay").addEventListener("click", () => { video.play().catch(() => {}); });
  $("vPause").addEventListener("click", () => video.pause());
  $("vLoop").addEventListener("click", (e) => {
    video.loop = !video.loop; e.currentTarget.setAttribute("aria-pressed", String(video.loop));
    toast(video.loop ? "Loop activado" : "Loop desactivado");
  });

  // ================= capas =================
  function bindToggle(id, key, after) {
    $(id).addEventListener("click", (e) => { S[key] = !S[key]; e.currentTarget.setAttribute("aria-pressed", String(S[key])); if (after) after(); updVisState(); });
  }
  function updVisState() {
    const on = [S.lines && "líneas", S.notes && "notas", S.parts && "partíc."].filter(Boolean);
    $("stVis").textContent = S.view === "mask" ? "máquina" : on.length ? on.length + " capas" : "solo video";
  }
  bindToggle("tLines", "lines"); bindToggle("tNotes", "notes"); bindToggle("tParts", "parts", () => { parts.length = 0; });
  $("tSignal").addEventListener("click", (e) => { const on = $("signal").hidden; $("signal").hidden = !on; e.currentTarget.setAttribute("aria-pressed", String(on)); });
  $("sigHide").addEventListener("click", () => { $("signal").hidden = true; $("tSignal").setAttribute("aria-pressed", "false"); });

  // ================= audio =================
  let ac = null, main = null, master, analyser, recDest, shape;
  const impulses = new WeakMap();
  function impulse(ctx) {
    if (impulses.has(ctx)) return impulses.get(ctx);
    const len = Math.floor(ctx.sampleRate * 2.6), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    impulses.set(ctx, buf); return buf;
  }
  function buildChain(ctx) {
    const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = S.cut; filter.Q.value = 0.8;
    const dry = ctx.createGain(), wet = ctx.createGain(), conv = ctx.createConvolver(), out = ctx.createGain();
    conv.buffer = impulse(ctx);
    filter.connect(dry); filter.connect(conv); conv.connect(wet); dry.connect(out); wet.connect(out);
    const ch = { input: filter, filter, dry, wet, out }; setRev(ch); return ch;
  }
  function setRev(ch) { ch.dry.gain.value = 1 - S.rev * 0.6; ch.wet.gain.value = S.rev * 0.9; }
  function initAudio() {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    main = buildChain(ac);
    master = ac.createGain(); master.gain.value = S.vol;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    analyser = ac.createAnalyser(); analyser.fftSize = 1024;
    shape = ac.createAnalyser(); shape.fftSize = 2048; main.filter.connect(shape);
    recDest = ac.createMediaStreamDestination();
    main.out.connect(master); master.connect(comp); comp.connect(analyser); analyser.connect(ac.destination); comp.connect(recDest);
  }
  function voice(ctx, inputs, midi, vel, pan) {
    const t = ctx.currentTime + 0.01;
    const o = ctx.createOscillator(); o.type = S.wave; o.frequency.value = mtof(midi);
    const g = ctx.createGain(), peak = 0.22 * vel, hold = 0.06;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + S.atk);
    g.gain.setTargetAtTime(peak * 0.6, t + S.atk, 0.08);
    g.gain.setTargetAtTime(0.0001, t + S.atk + hold, S.rel / 4);
    o.connect(g);
    let node = g;
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
    inputs.forEach((i) => node.connect(i));
    o.start(t); o.stop(t + S.atk + hold + S.rel * 1.6 + 0.1);
    return S.atk + hold + S.rel * 1.6 + 0.1;
  }
  const soundOn = () => ac && ac.state === "running";
  function updSoundBtn() {
    const on = soundOn();
    $("soundBtn").setAttribute("aria-pressed", String(on));
    $("soundBtn").textContent = on ? "■ Apagar sonido" : "▶ Activar sonido";
    $("noteDl").disabled = !on || lastMidi == null;
    $("recBtn").disabled = !on && !recording;
  }
  $("soundBtn").addEventListener("click", async () => {
    if (!ac) initAudio();
    try { if (ac.state === "running") await ac.suspend(); else await ac.resume(); } catch (_) {}
    updSoundBtn();
  });

  // ================= descargas =================
  let dlCap;
  async function downloadsCap() {
    if (dlCap !== undefined) return dlCap;
    try { dlCap = window.claude && window.claude.use ? await window.claude.use("downloads") : null; } catch (_) { dlCap = null; }
    return dlCap;
  }
  function wavFromBuffer(buf) {
    const ch = Math.min(2, buf.numberOfChannels), sr = buf.sampleRate, n = buf.length;
    const out = new ArrayBuffer(44 + n * ch * 2), v = new DataView(out);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, "RIFF"); v.setUint32(4, 36 + n * ch * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, ch, true); v.setUint32(24, sr, true); v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true);
    w(36, "data"); v.setUint32(40, n * ch * 2, true);
    const data = []; for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
    let o = 44;
    for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, data[c][i])); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
    return new Blob([out], { type: "audio/wav" });
  }
  async function deliver(blob, base) {
    const cap = await downloadsCap();
    if (cap) {
      try { await cap.save({ filename: base + ".webm", data: blob }); toast("Descarga lista"); }
      catch (e) { toast(e && e.code === "declined" ? "Descarga cancelada" : "No se pudo descargar en esta vista"); }
      return;
    }
    let file = blob, ext = ".webm";
    try { const buf = await ac.decodeAudioData(await blob.arrayBuffer()); file = wavFromBuffer(buf); ext = ".wav"; } catch (_) {}
    const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = base + ext;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast("Descargando " + base + ext);
  }
  function pickMime() {
    if (!window.MediaRecorder) return null;
    for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/ogg"]) if (MediaRecorder.isTypeSupported(m)) return m;
    return "";
  }
  let recorder = null, recording = false, recChunks = [], recBlob = null, recStart = 0;
  $("recBtn").addEventListener("click", () => {
    if (!ac) return;
    const mime = pickMime();
    if (mime === null) { $("recHint").textContent = "Este navegador no permite grabar audio."; return; }
    if (!recording) {
      recChunks = []; recorder = new MediaRecorder(recDest.stream, mime ? { mimeType: mime } : undefined);
      recorder.ondataavailable = (e) => { if (e.data.size) recChunks.push(e.data); };
      recorder.onstop = () => { recBlob = new Blob(recChunks, { type: recorder.mimeType || "audio/webm" }); $("recDl").disabled = false; $("recHint").textContent = "Grabación lista para descargar."; $("stRec").textContent = "lista"; };
      recorder.start(); recording = true; recStart = performance.now();
      $("recBtn").setAttribute("aria-pressed", "true"); $("recBtn").textContent = "■ Detener"; $("recBadge").hidden = false; $("stRec").textContent = "grabando";
    } else {
      recorder.stop(); recording = false;
      $("recBtn").setAttribute("aria-pressed", "false"); $("recBtn").textContent = "● Grabar"; $("recBadge").hidden = true;
    }
  });
  $("recDl").addEventListener("click", () => { if (recBlob) deliver(recBlob, "oir-la-luz-grabacion"); });
  let lastMidi = null;
  $("noteDl").addEventListener("click", () => {
    if (!soundOn() || lastMidi == null) return;
    const mime = pickMime(); if (mime === null) { toast("Este navegador no permite grabar audio"); return; }
    const ch = buildChain(ac), dest = ac.createMediaStreamDestination(); ch.out.connect(dest);
    const rec = new MediaRecorder(dest.stream, mime ? { mimeType: mime } : undefined), chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const m = lastMidi;
    rec.onstop = () => deliver(new Blob(chunks, { type: rec.mimeType || "audio/webm" }), "nota-" + noteName(m).replace("#", "s") + "-" + Math.round(mtof(m)) + "Hz");
    rec.start(); $("noteDl").disabled = true; toast("Grabando " + noteName(m));
    const dur = voice(ac, [ch.input, main.input], m, 0.9, 0);
    setTimeout(() => { rec.stop(); updSoundBtn(); }, (dur + 1.4) * 1000);
  });

  // ================= detección =================
  const PW = 128, PH = 72;
  const proc = document.createElement("canvas"); proc.width = PW; proc.height = PH;
  const pctx = proc.getContext("2d", { willReadFrequently: true });
  let prev = null; const mask = new Uint8Array(PW * PH);
  let energy = [], flash = [], last = [];
  const parts = [], roll = [];
  function ensureGrid() { const n = S.cols * S.rows; if (energy.length !== n) { energy = new Array(n).fill(0); flash = new Array(n).fill(0); last = new Array(n).fill(0); } }
  function cellMidi(c, r) { const sc = SCALES[S.scale]; return S.root + sc[c % sc.length] + 12 * Math.floor(c / sc.length) + 12 * (S.rows - 1 - r); }
  function activeSource() { return S.src === "demo" ? demo : (S.src === "cam" || S.src === "file") && video.readyState >= 2 ? video : null; }
  function srcAspect(src) { if (!src) return 16 / 9; if (src === demo) return 16 / 9; return (video.videoWidth || 16) / (video.videoHeight || 9); }

  function analyse(now) {
    const src = activeSource(); if (!src) { prev = null; return; }
    pctx.save();
    if (S.src === "cam" && S.mirror) { pctx.translate(PW, 0); pctx.scale(-1, 1); }
    pctx.drawImage(src, 0, 0, PW, PH); pctx.restore();
    const d = pctx.getImageData(0, 0, PW, PH).data, gray = new Uint8Array(PW * PH);
    for (let i = 0, j = 0; i < gray.length; i++, j += 4) gray[i] = (d[j] * 0.3 + d[j + 1] * 0.59 + d[j + 2] * 0.11) | 0;
    ensureGrid();
    const counts = new Array(S.cols * S.rows).fill(0);
    if (prev) {
      let changed = 0;
      for (let i = 0; i < gray.length; i++) { const df = Math.abs(gray[i] - prev[i]); mask[i] = df > S.thr ? Math.min(255, df) : 0; if (mask[i]) changed++; }
      const p = S.parts ? Math.min(0.35, 50 / Math.max(1, changed)) : 0;
      for (let y = 0; y < PH; y++) {
        const r = Math.min(S.rows - 1, Math.floor(y / PH * S.rows));
        for (let x = 0; x < PW; x++) {
          const i = y * PW + x; if (!mask[i]) continue;
          counts[r * S.cols + Math.min(S.cols - 1, Math.floor(x / PW * S.cols))]++;
          if (p && Math.random() < p && parts.length < 300) {
            const k = Math.min(1, (mask[i] - S.thr) / 110);
            parts.push({ x: (x + Math.random()) / PW, y: (y + Math.random()) / PH, vy: -0.01 - Math.random() * 0.02, k, life: 1, decay: 1.6 + Math.random() * 1.2 });
          }
        }
      }
    }
    prev = gray;
    const cellPx = (PW / S.cols) * (PH / S.rows);
    for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) {
      const k = r * S.cols + c;
      energy[k] = energy[k] * 0.5 + (counts[k] / cellPx) * 0.5;
      if (energy[k] > S.sens && now - last[k] > S.cool) {
        last[k] = now; flash[k] = 1;
        const m = cellMidi(c, r), vel = S.mapVel ? Math.min(1, 0.35 + energy[k] * 2.2) : 0.8, pan = S.mapPan ? ((c + 0.5) / S.cols) * 2 - 1 : 0;
        if (soundOn()) voice(ac, [main.input], m, vel, pan * 0.85);
        roll.push({ t: now, m }); lastMidi = m; lastFreq = mtof(m); lastNoteT = performance.now(); updScopeCap();
        $("lastNote").textContent = noteName(m);
        $("lastHz").textContent = Math.round(mtof(m)) + " Hz";
        $("lastZone").textContent = (c + 1) + "," + (r + 1);
        $("lastPct").textContent = Math.round(energy[k] * 100) + " %";
        $("noteDl").disabled = !soundOn();
      }
    }
  }

  // ================= dibujo =================
  const view = $("view"), vctx = view.getContext("2d");
  const maskC = document.createElement("canvas"); maskC.width = PW; maskC.height = PH;
  const mctx = maskC.getContext("2d"), mimg = mctx.createImageData(PW, PH);
  function fit(c) {
    const r = c.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    return dpr;
  }
  function drawView(dt) {
    const dpr = fit(view), W = view.width, H = view.height;
    vctx.fillStyle = "#05061A"; vctx.fillRect(0, 0, W, H);
    const src = activeSource(), ar = srcAspect(src);
    let bw = W, bh = W / ar; if (bh > H) { bh = H; bw = H * ar; }
    const bx = (W - bw) / 2, by = (H - bh) / 2;
    if (S.view === "mask") {
      for (let i = 0; i < PW * PH; i++) {
        const j = i * 4, m = mask[i];
        if (m) { const k = Math.min(1, (m - S.thr) / 110); mimg.data[j] = 59 + (226 - 59) * k; mimg.data[j + 1] = 59 + (255 - 59) * k; mimg.data[j + 2] = 255 - 196 * k; }
        else { mimg.data[j] = 8; mimg.data[j + 1] = 9; mimg.data[j + 2] = 32; }
        mimg.data[j + 3] = 255;
      }
      mctx.putImageData(mimg, 0, 0);
      vctx.imageSmoothingEnabled = false; vctx.drawImage(maskC, bx, by, bw, bh); vctx.imageSmoothingEnabled = true;
    } else if (src) {
      vctx.save();
      if (S.src === "cam" && S.mirror) { vctx.translate(bx * 2 + bw, 0); vctx.scale(-1, 1); }
      vctx.drawImage(src, bx, by, bw, bh); vctx.restore();
      if (S.veil > 0) { vctx.fillStyle = "rgba(5,6,26," + S.veil.toFixed(2) + ")"; vctx.fillRect(bx, by, bw, bh); }
    } else {
      vctx.fillStyle = "rgba(238,240,255,.6)"; vctx.font = Math.round(11 * dpr) + "px 'IBM Plex Mono', monospace"; vctx.textAlign = "center";
      vctx.fillText(S.src === "camoff" ? "CÁMARA APAGADA" : "ESPERANDO IMAGEN", W / 2, H / 2); vctx.textAlign = "start";
    }
    // tono azul sobre las zonas que cambian (siempre visible)
    const cw = bw / S.cols, rh = bh / S.rows; ensureGrid();
    for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) {
      const k = r * S.cols + c, f = flash[k];
      if (f > 0.02) {
        vctx.fillStyle = "rgba(59,59,255," + (S.tint * f).toFixed(3) + ")"; vctx.fillRect(bx + c * cw, by + r * rh, cw, rh);
        flash[k] *= Math.pow(0.12, dt);
      }
    }
    // partículas: puntos breves, sin estela
    if (S.parts && S.view !== "mask") {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.y += p.vy * dt; p.life -= p.decay * dt;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        const a = (p.life * 0.55).toFixed(3);
        vctx.fillStyle = p.k > 0.55 ? "rgba(226,255,59," + a + ")" : "rgba(150,150,255," + a + ")";
        const s = (1 + p.k * 1.6) * dpr;
        vctx.fillRect(bx + p.x * bw - s / 2, by + p.y * bh - s / 2, s, s);
      }
    }
    // líneas: grilla de 1 px, marco de la zona activa y nivel de cambio
    if (S.lines) {
      vctx.strokeStyle = "rgba(238,240,255,.22)"; vctx.lineWidth = 1;
      vctx.beginPath();
      for (let c = 1; c < S.cols; c++) { const x = Math.round(bx + c * cw) + 0.5; vctx.moveTo(x, by); vctx.lineTo(x, by + bh); }
      for (let r = 1; r < S.rows; r++) { const y = Math.round(by + r * rh) + 0.5; vctx.moveTo(bx, y); vctx.lineTo(bx + bw, y); }
      vctx.stroke();
      for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) {
        const k = r * S.cols + c, f = flash[k];
        if (f > 0.15) { vctx.strokeStyle = "rgba(226,255,59," + (0.8 * f).toFixed(3) + ")"; vctx.strokeRect(Math.round(bx + c * cw) + 0.5, Math.round(by + r * rh) + 0.5, Math.round(cw) - 1, Math.round(rh) - 1); }
        const e = Math.min(1, energy[k] / Math.max(0.01, S.sens));
        vctx.fillStyle = "rgba(238,240,255,.5)"; vctx.fillRect(bx + c * cw + 8 * dpr, by + (r + 1) * rh - 6 * dpr, (cw - 16 * dpr) * e, dpr);
      }
    }
    if (S.notes) {
      vctx.font = Math.round(10 * dpr) + "px 'IBM Plex Mono', monospace";
      for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) {
        const k = r * S.cols + c, f = flash[k];
        vctx.fillStyle = f > 0.3 ? "#E2FF3B" : "rgba(238,240,255,.62)";
        vctx.fillText(noteName(cellMidi(c, r)).toUpperCase(), bx + c * cw + 8 * dpr, by + (r + 1) * rh - 12 * dpr);
      }
    }
  }

  const scope = $("scope"), sctx = scope.getContext("2d"), tbuf = new Uint8Array(1024);
  const WAVE_NAME = { sine: "seno", triangle: "triangular", square: "cuadrada", sawtooth: "sierra" };
  function waveVal(type, ph) {
    ph = ph - Math.floor(ph);
    if (type === "sine") return Math.sin(2 * Math.PI * ph);
    if (type === "square") return ph < 0.5 ? 1 : -1;
    if (type === "sawtooth") return 2 * ph - 1;
    return ph < 0.25 ? 4 * ph : ph < 0.75 ? 2 - 4 * ph : 4 * ph - 4;
  }
  function harmonic(type, n) {
    if (type === "sine") return n === 1 ? 1 : 0;
    if (type === "square") return n % 2 ? 1 / n : 0;
    if (type === "triangle") return n % 2 ? 1 / (n * n) : 0;
    return 1 / n;
  }
  const fbuf = new Float32Array(2048);
  let lastFreq = 0, lastNoteT = -1e9;
  function updScopeCap() {
    const f = lastFreq || mtof(S.root + 12);
    $("scopeCap").textContent = "forma de onda · " + WAVE_NAME[S.wave];
    $("specCap").textContent = "armónicos · corte " + (S.cut >= 1000 ? (S.cut / 1000).toFixed(1) + "k" : S.cut);
  }
  function drawScope() {
    if ($("signal").hidden) return;
    const dpr = fit(scope), W = scope.width, H = scope.height;
    sctx.clearRect(0, 0, W, H);
    const split = Math.round(W * 0.6), pad = 6 * dpr, mid = H / 2, amp = H * 0.38;
    sctx.strokeStyle = "rgba(238,240,255,.14)"; sctx.lineWidth = 1;
    sctx.beginPath(); sctx.moveTo(0, Math.round(mid) + 0.5); sctx.lineTo(split - pad, Math.round(mid) + 0.5); sctx.moveTo(split + 0.5, 0); sctx.lineTo(split + 0.5, H); sctx.stroke();
    // señal real (si hay sonido), sincronizada al inicio del ciclo y escalada a la misma cantidad de ciclos
    const cycles = 2.5, wantLive = soundOn() && lastFreq && (performance.now() - lastNoteT) < (S.atk + S.rel * 1.4) * 1000 + 150;
    let livePts = null;
    if (wantLive) {
      shape.getFloatTimeDomainData(fbuf);
      let peak = 0; for (let i = 0; i < fbuf.length; i++) peak = Math.max(peak, Math.abs(fbuf[i]));
      if (peak > 0.004) {
        const period = ac.sampleRate / lastFreq, span = Math.min(fbuf.length - 1, Math.round(period * cycles));
        let i0 = 0; for (let i = 1; i < fbuf.length - span; i++) { if (fbuf[i - 1] <= 0 && fbuf[i] > 0) { i0 = i; break; } }
        livePts = []; for (let k = 0; k <= span; k++) livePts.push([k / span * (split - pad), mid - (fbuf[i0 + k] / peak) * amp]);
      }
    }
    // forma ideal de la onda elegida: en neón sin sonido, de fondo cuando hay señal real
    sctx.strokeStyle = livePts ? "rgba(238,240,255,.32)" : "#E2FF3B"; sctx.lineWidth = (livePts ? 1 : 1.6) * dpr;
    sctx.beginPath();
    for (let x = 0; x <= split - pad; x++) { const y = mid - waveVal(S.wave, x / (split - pad) * cycles) * amp; x ? sctx.lineTo(x, y) : sctx.moveTo(x, y); }
    sctx.stroke();
    if (livePts) {
      sctx.strokeStyle = "#E2FF3B"; sctx.lineWidth = 1.6 * dpr; sctx.beginPath();
      livePts.forEach(([x, y], k) => (k ? sctx.lineTo(x, y) : sctx.moveTo(x, y))); sctx.stroke();
    }
    // armónicos teóricos y curva del pasa-bajos (12 dB/oct); los armónicos sobre el corte se apagan
    const f0 = lastFreq || mtof(S.root + 12), N = 12, bw = (W - split - pad * 2) / N, hlCut = hlOn("cut");
    for (let n = 1; n <= N; n++) {
      const a = harmonic(S.wave, n); if (!a) continue;
      const h = Math.max(1, a * (H - pad * 2)), x = split + pad + (n - 1) * bw;
      sctx.fillStyle = f0 * n > S.cut ? "rgba(123,128,179,.45)" : "#E2FF3B";
      sctx.fillRect(Math.round(x + bw * 0.2), Math.round(H - pad - h), Math.max(1, Math.round(bw * 0.6)), Math.round(h));
    }
    sctx.strokeStyle = hlCut ? "#FFFFFF" : "rgba(238,240,255,.6)"; sctx.lineWidth = (hlCut ? 2 : 1) * dpr; sctx.setLineDash([3 * dpr, 3 * dpr]);
    sctx.beginPath();
    for (let x = 0; x <= W - split - pad * 2; x++) {
      const n = 0.5 + x / bw, r = (f0 * n) / S.cut, g = 1 / Math.sqrt(1 + r * r * r * r);
      const y = H - pad - g * (H - pad * 2); x ? sctx.lineTo(split + pad + x, y) : sctx.moveTo(split + pad + x, y);
    }
    sctx.stroke(); sctx.setLineDash([]);
  }

  // ---- envolvente: attack, release, reverb y volumen ----
  const envC = $("env"), ectx = envC.getContext("2d"), mbuf = new Float32Array(1024);
  let HL = { key: null, t: 0 };
  function hlOn(k) { return HL.key === k && performance.now() - HL.t < 1400; }
  function envAt(t) {
    const peak = S.vol, hold = 0.06;
    if (t < 0) return 0;
    if (t < S.atk) return peak * (t / S.atk);
    if (t < S.atk + hold) return peak * (0.6 + 0.4 * Math.exp(-(t - S.atk) / 0.08));
    const vh = peak * (0.6 + 0.4 * Math.exp(-hold / 0.08));
    return vh * Math.exp(-(t - S.atk - hold) / (S.rel / 4));
  }
  function updEnvCap() {
    $("envCapL").textContent = "envolvente · A " + Math.round(S.atk * 1000) + " ms · R " + Math.round(S.rel * 1000) + " ms";
    $("envCapR").textContent = "reverb " + Math.round(S.rev * 100) + " % · vol " + Math.round(S.vol * 100) + " %";
  }
  function drawEnv() {
    if ($("signal").hidden) return;
    const dpr = fit(envC), W = envC.width, H = envC.height, pad = 6 * dpr, meterW = 10 * dpr;
    ectx.clearRect(0, 0, W, H);
    const PW_ = W - meterW - pad * 3, base = H - pad, top = pad + 8 * dpr, hgt = base - top;
    const hold = 0.06, noteEnd = S.atk + hold + S.rel * 1.6, tail = S.rev > 0.01 ? 2.6 * S.rev + 0.4 : 0;
    const T = Math.max(0.5, noteEnd + tail);
    const X = (t) => pad + (t / T) * PW_, Y = (v) => base - v * hgt;
    ectx.strokeStyle = "rgba(238,240,255,.14)"; ectx.lineWidth = 1;
    ectx.beginPath(); ectx.moveTo(pad, Math.round(base) + 0.5); ectx.lineTo(pad + PW_, Math.round(base) + 0.5); ectx.moveTo(pad, Math.round(Y(1)) + 0.5); ectx.lineTo(pad + PW_, Math.round(Y(1)) + 0.5); ectx.stroke();
    // cola de reverb (zona sombreada)
    if (S.rev > 0.01) {
      const hlR = hlOn("rev");
      ectx.fillStyle = hlR ? "rgba(150,150,255,.45)" : "rgba(150,150,255,.2)";
      ectx.beginPath(); ectx.moveTo(X(S.atk), base);
      for (let i = 0; i <= 80; i++) { const t = S.atk + (T - S.atk) * i / 80; ectx.lineTo(X(t), Y(Math.max(envAt(t), S.rev * S.vol * 0.55 * Math.exp(-(t - S.atk) / (0.35 + S.rev * 0.9))))); }
      ectx.lineTo(X(T), base); ectx.closePath(); ectx.fill();
    }
    // tramos: attack y release resaltables
    const seg = (t0, t1, hl) => {
      ectx.strokeStyle = hl ? "#FFFFFF" : "#E2FF3B"; ectx.lineWidth = (hl ? 2.6 : 1.6) * dpr; ectx.beginPath();
      for (let i = 0; i <= 60; i++) { const t = t0 + (t1 - t0) * i / 60; i ? ectx.lineTo(X(t), Y(envAt(t))) : ectx.moveTo(X(t), Y(envAt(t))); }
      ectx.stroke();
    };
    const hlV = hlOn("vol");
    seg(0, S.atk, hlOn("atk") || hlV); seg(S.atk, S.atk + hold, hlV); seg(S.atk + hold, noteEnd, hlOn("rel") || hlV);
    // marcas A y R
    ectx.fillStyle = "rgba(238,240,255,.7)"; ectx.font = Math.round(9 * dpr) + "px 'IBM Plex Mono', monospace";
    ectx.fillText("A", X(S.atk / 2) - 3 * dpr, pad + 6 * dpr);
    ectx.fillText("R", X(S.atk + hold + S.rel * 0.5), pad + 6 * dpr);
    ectx.strokeStyle = "rgba(238,240,255,.25)"; ectx.setLineDash([2 * dpr, 3 * dpr]); ectx.beginPath();
    [S.atk, S.atk + hold].forEach((t) => { const x = Math.round(X(t)) + 0.5; ectx.moveTo(x, top); ectx.lineTo(x, base); }); ectx.stroke(); ectx.setLineDash([]);
    // cabezal de la última nota
    const el = (performance.now() - lastNoteT) / 1000;
    if (soundOn() && el >= 0 && el < T) { const x = Math.round(X(el)) + 0.5; ectx.strokeStyle = "rgba(238,240,255,.8)"; ectx.lineWidth = 1; ectx.beginPath(); ectx.moveTo(x, top - 4 * dpr); ectx.lineTo(x, base); ectx.stroke(); }
    // medidor de nivel: volumen elegido (marco) y nivel real de salida (relleno)
    const mx = W - pad - meterW;
    ectx.strokeStyle = hlV ? "#FFFFFF" : "rgba(238,240,255,.45)"; ectx.lineWidth = 1;
    ectx.strokeRect(Math.round(mx) + 0.5, Math.round(Y(S.vol)) + 0.5, Math.round(meterW) - 1, Math.round(base - Y(S.vol)) - 1);
    let lvl = 0;
    if (analyser && soundOn()) { analyser.getFloatTimeDomainData(mbuf); let sum = 0; for (let i = 0; i < mbuf.length; i++) sum += mbuf[i] * mbuf[i]; lvl = Math.min(1, Math.sqrt(sum / mbuf.length) * 4); }
    if (lvl > 0.002) { ectx.fillStyle = "#E2FF3B"; ectx.fillRect(Math.round(mx) + 2, Math.round(Y(lvl)), Math.round(meterW) - 4, Math.round(base - Y(lvl))); }
  }
  const rollC = $("roll"), rctx = rollC.getContext("2d");
  function drawRoll(now) {
    while (roll.length && now - roll[0].t > 10000) roll.shift();
    if ($("signal").hidden) return;
    const dpr = fit(rollC), W = rollC.width, H = rollC.height, span = 10000;
    rctx.clearRect(0, 0, W, H);
    const lo = S.root - 2, hi = S.root + 12 * S.rows + 14;
    rctx.strokeStyle = "rgba(238,240,255,.12)"; rctx.lineWidth = 1;
    for (let m = Math.ceil(lo / 12) * 12; m < hi; m += 12) { const y = Math.round(H - (m - lo) / (hi - lo) * H) + 0.5; rctx.beginPath(); rctx.moveTo(0, y); rctx.lineTo(W, y); rctx.stroke(); }
    for (const n of roll) {
      const age = (now - n.t) / span, x = W - age * W, y = H - (n.m - lo) / (hi - lo) * H;
      rctx.fillStyle = age < 0.05 ? "#E2FF3B" : "rgba(150,150,255,.85)";
      rctx.fillRect(x - 2 * dpr, y - 1.5 * dpr, 9 * dpr, 3 * dpr);
    }
  }

  // ================= controles =================
  const RANGES = {
    cols: { key: "cols", fmt: (v) => v }, rows: { key: "rows", fmt: (v) => v },
    thr: { key: "thr", fmt: (v) => v }, sens: { key: "sens", fmt: (v) => v + " %", conv: (v) => v / 100 }, cool: { key: "cool", fmt: (v) => v + " ms" },
    atk: { key: "atk", fmt: (v) => v + " ms", conv: (v) => v / 1000 }, rel: { key: "rel", fmt: (v) => v + " ms", conv: (v) => v / 1000 },
    cut: { key: "cut", fmt: (v) => v >= 1000 ? (v / 1000).toFixed(1) + "k" : String(v) },
    rev: { key: "rev", fmt: (v) => v + " %", conv: (v) => v / 100 }, vol: { key: "vol", fmt: (v) => v + " %", conv: (v) => v / 100 },
    tint: { key: "tint", fmt: (v) => v + " %", conv: (v) => v / 100 }, veil: { key: "veil", fmt: (v) => v + " %", conv: (v) => v / 100 },
  };
  Object.entries(RANGES).forEach(([id, cfg]) => {
    const el = $(id), out = $(id + "Out");
    const upd = () => { const v = Number(el.value); S[cfg.key] = cfg.conv ? cfg.conv(v) : v; out.textContent = cfg.fmt(v); onChange(cfg.key); };
    el.addEventListener("input", upd); upd();
    const badge = document.createElement("i"); badge.className = "cc"; badge.hidden = true; badge.dataset.for = id;
    el.closest(".row").querySelector("label").appendChild(badge);
  });
  function onChange(key) {
    if (["atk", "rel", "cut", "rev", "vol"].includes(key)) { HL = { key, t: performance.now() }; updEnvCap(); }
    if (key === "cols" || key === "rows") { ensureGrid(); $("stKeys").textContent = S.cols + " × " + S.rows; }
    if (key === "cut" && typeof updScopeCap === "function") updScopeCap();
    if (key === "sens") $("stDet").textContent = Math.round(S.sens * 100) + " %";
    if (!ac) return;
    if (key === "vol") master.gain.setTargetAtTime(S.vol, ac.currentTime, 0.05);
    if (key === "cut") main.filter.frequency.setTargetAtTime(S.cut, ac.currentTime, 0.05);
    if (key === "rev") setRev(main);
  }
  $("scale").addEventListener("change", (e) => { S.scale = e.target.value; });
  $("root").addEventListener("change", (e) => { S.root = Number(e.target.value); });
  document.querySelectorAll("[data-wave]").forEach((b) => b.addEventListener("click", () => {
    S.wave = b.dataset.wave; document.querySelectorAll("[data-wave]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    $("stSnd").textContent = b.textContent.toLowerCase(); updScopeCap();
    if (soundOn()) { const m = S.root + 12; lastFreq = mtof(m); lastNoteT = performance.now(); voice(ac, [main.input], m, 0.85, 0); updScopeCap(); }
  }));
  document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => {
    S.view = b.dataset.view; document.querySelectorAll("[data-view]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); updVisState();
  }));
  function updMap() {
    const p = ["zona → nota"]; if (S.mapVel) p.push("intensidad → volumen"); if (S.mapPan) p.push("posición x → pan");
    $("mapText").textContent = p.join(" · "); $("stMap").textContent = p.length + (p.length === 1 ? " regla" : " reglas");
  }
  $("mapVel").addEventListener("change", (e) => { S.mapVel = e.target.checked; updMap(); });
  $("mapPan").addEventListener("change", (e) => { S.mapPan = e.target.checked; updMap(); });
  $("mirror").addEventListener("change", (e) => { S.mirror = e.target.checked; prev = null; });
  updMap(); updVisState(); updEnvCap(); HL = { key: null, t: 0 };

  // pantalla completa
  $("fsBtn").addEventListener("click", async () => {
    const st = $("stage");
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (st.requestFullscreen) await st.requestFullscreen();
      else if (st.webkitRequestFullscreen) st.webkitRequestFullscreen();
      else throw new Error("no");
    } catch (_) { toast("Pantalla completa no disponible en esta vista"); }
  });
  document.addEventListener("fullscreenchange", () => { $("fsBtn").textContent = document.fullscreenElement ? "⛶ Salir" : "⛶ Pantalla completa"; });

  // ================= MIDI =================
  const STORE = "oirlaluz.midi.v1";
  let midiMap = {};
  try { midiMap = JSON.parse(localStorage.getItem(STORE) || "{}") || {}; } catch (_) { midiMap = {}; }
  let learning = false, learnTarget = null;
  function saveMap() { try { localStorage.setItem(STORE, JSON.stringify(midiMap)); } catch (_) {} }
  function paintBadges() {
    document.querySelectorAll(".cc").forEach((b) => { b.hidden = true; b.textContent = ""; });
    Object.entries(midiMap).forEach(([cc, id]) => { const b = document.querySelector('.cc[data-for="' + id + '"]'); if (b) { b.hidden = false; b.textContent = "CC" + cc; } });
  }
  paintBadges();
  function onMidi(e) {
    const [st, d1, d2] = e.data;
    if ((st & 0xf0) !== 0xb0) return;
    if (learning && learnTarget) {
      Object.keys(midiMap).forEach((k) => { if (midiMap[k] === learnTarget.id) delete midiMap[k]; });
      midiMap[d1] = learnTarget.id; saveMap(); paintBadges();
      $("midiHint").textContent = "CC " + d1 + " → " + learnTarget.id + ". Toca otro slider o termina con Asignar.";
      learnTarget.classList.remove("target"); learnTarget = null; return;
    }
    const id = midiMap[d1]; if (!id) return;
    const el = $(id), min = Number(el.min), max = Number(el.max), step = Number(el.step) || 1;
    el.value = String(Math.round((min + (d2 / 127) * (max - min)) / step) * step);
    el.dispatchEvent(new Event("input"));
  }
  $("midiBtn").addEventListener("click", async () => {
    if (!navigator.requestMIDIAccess) { $("midiHint").textContent = "Este navegador no tiene Web MIDI. Usa Chrome o Edge en la versión local."; return; }
    try {
      const access = await navigator.requestMIDIAccess();
      const bind = () => { let n = 0; access.inputs.forEach((i) => { i.onmidimessage = onMidi; n++; }); $("stMidi").textContent = n ? n + " conectado" + (n > 1 ? "s" : "") : "sin equipos"; $("midiHint").textContent = n ? "Presiona Asignar." : "No hay controladores conectados. Enchufa uno y vuelve a intentar."; };
      access.onstatechange = bind; bind();
      $("midiBtn").setAttribute("aria-pressed", "true"); $("learnBtn").disabled = false; $("midiClear").disabled = false;
    } catch (e) { $("midiHint").textContent = "MIDI no disponible en esta vista. Abre la versión local en Chrome o Edge."; }
  });
  $("learnBtn").addEventListener("click", () => {
    learning = !learning; $("learnBtn").setAttribute("aria-pressed", String(learning));
    $("dock").classList.toggle("learning", learning);
    if (learnTarget) { learnTarget.classList.remove("target"); learnTarget = null; }
    $("midiHint").textContent = learning ? "Abre otro panel, toca un slider y mueve una perilla." : "Asignaciones guardadas en este navegador.";
  });
  document.querySelectorAll("input[type=range]").forEach((el) => el.addEventListener("pointerdown", () => {
    if (!learning) return;
    if (learnTarget) learnTarget.classList.remove("target");
    learnTarget = el; el.classList.add("target");
    $("midiHint").textContent = "Mueve una perilla para asignarla a " + el.id + ".";
  }));
  $("midiClear").addEventListener("click", () => { midiMap = {}; saveMap(); paintBadges(); $("midiHint").textContent = "Asignaciones borradas."; });

  // ================= bucle =================
  let lastT = performance.now(), acc = 0;
  function loop(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    if (S.src === "demo") drawDemo(dt);
    acc += dt;
    if (acc >= 1 / 15) { acc = 0; analyse(now); }
    drawView(dt); drawScope(); drawEnv(); drawRoll(now);
    if (recording) { const s = Math.floor((now - recStart) / 1000), t = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); $("recTime").textContent = t; $("recBadgeT").textContent = t; }
    requestAnimationFrame(loop);
  }
  updSoundBtn(); drawDemo(0);
  requestAnimationFrame(loop);
})();
