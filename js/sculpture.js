/**
 * PULSO — sculpture.js
 * Generación procedural 3D con estética de CRISTAL / VIDRIO LÍQUIDO (Glassmorphism 3D).
 * - Formas ambientales de cristal para la pantalla de inicio.
 * - Gramática geométrica abierta para la escultura final, guiada por el video y la música.
 * - Materiales nacarados y crecimiento determinista sincronizado con la composición.
 */

export class ProceduralSculpture {
  constructor(containerElement) {
    this.container = containerElement;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;

    this.sculptureGroup = null;
    this.ambientGroup = null; // Formas 3D flotantes de cristal
    this.ambientShapes = [];

    this.strands = [];
    this.elements = []; // Alias para compatibilidad
    this.duration = 10;
    this.currentTime = 0;
    this.isInitialized = false;

    this._animFrameId = null;
    this._autoRotate = false;
  }

  init() {
    if (this.isInitialized) return;

    const width = this.container.clientWidth || window.innerWidth || 800;
    const height = this.container.clientHeight || window.innerHeight || 600;

    // Escena con niebla atmosférica en tonos análogos al violeta oscuro
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080414);
    this.scene.fog = new THREE.FogExp2(0x080414, 0.038);

    // Cámara de perspectiva
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(0, 2.2, 9.8);

    // Renderer WebGL con tone mapping fílmico y antialiasing
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.container.appendChild(this.renderer.domElement);

    // Controles de órbita
    if (THREE.OrbitControls) {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.maxDistance = 24;
      this.controls.minDistance = 2.5;
      this.controls.target.set(0, 0.2, 0);
    }

    // Iluminación cinemática multicapa en tonos análogos al violeta
    const ambientLight = new THREE.AmbientLight(0x180c34, 1.6);
    this.scene.add(ambientLight);

    // Luz principal de alta definición para reflejos de cristal
    const keyLight = new THREE.DirectionalLight(0xfff5ff, 2.6);
    keyLight.position.set(6, 9, 8);
    this.scene.add(keyLight);

    // Luces de contorno (Rim lights) en violeta eléctrico y fucsia/magenta
    const rimViolet = new THREE.DirectionalLight(0xa855f7, 2.4);
    rimViolet.position.set(-8, -3, -5);
    this.scene.add(rimViolet);

    const rimMagenta = new THREE.DirectionalLight(0xd946ef, 2.2);
    rimMagenta.position.set(6, -6, 5);
    this.scene.add(rimMagenta);

    // Luz puntual interior para iluminar la refracción del cristal desde dentro
    const innerPoint = new THREE.PointLight(0x9d4edd, 1.8, 18);
    innerPoint.position.set(0, 0.5, 0);
    this.scene.add(innerPoint);

    // Grupo de formas de cristal flotantes en el entorno (mockup glassmorphism)
    this.ambientGroup = new THREE.Group();
    this.scene.add(this.ambientGroup);
    this._createAmbientFloatingGlass();

    // Grupo principal de la escultura
    this.sculptureGroup = new THREE.Group();
    this.scene.add(this.sculptureGroup);

    window.addEventListener('resize', () => this.resize());

    this.isInitialized = true;
    this._startLoop();
  }

  /**
   * Crea las formas 3D de cristal flotantes (toroides y esferas con glass-effect)
   * que flotan en el espacio visible detrás de las tarjetas translúcidas.
   */
  _createAmbientFloatingGlass() {
    this.ambientShapes = [];

    // Tonalidades análogas al violeta con alta transmisión (cristal)
    const glassColors = [
      new THREE.Color(0xa855f7), // Violeta eléctrico
      new THREE.Color(0xd946ef), // Magenta / Fucsia
      new THREE.Color(0x818cf8), // Índigo claro
      new THREE.Color(0x4ef1c2), // Acento cian translúcido (como en el mockup verde/esmeralda)
      new THREE.Color(0xf5d0fe)  // Lavanda cristalino
    ];

    const createGlassMat = (color, transmission = 0.82, roughness = 0.12) => {
      return new THREE.MeshPhysicalMaterial({
        color: color,
        transmission: transmission,
        roughness: roughness,
        metalness: 0.05,
        ior: 1.48,               // Índice de refracción del vidrio
        thickness: 1.6,          // Profundidad de refracción
        clearcoat: 0.9,          // Brillo exterior esmaltado
        clearcoatRoughness: 0.08,
        specularIntensity: 1.0,
        specularColor: new THREE.Color(0xffffff),
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide
      });
    };

    // 1. Toroides de cristal flotantes (como en la Imagen de referencia 1)
    const torusConfigs = [
      { r: 1.8, tube: 0.42, pos: [-4.2, 1.4, -2.8], rot: [0.6, 0.4, 0.2], col: glassColors[0], spd: 0.003 },
      { r: 2.2, tube: 0.38, pos: [3.8, -1.2, -3.2], rot: [-0.4, 0.8, -0.3], col: glassColors[1], spd: -0.0025 },
      { r: 1.4, tube: 0.28, pos: [2.6, 2.6, -2.0], rot: [0.8, -0.5, 0.6], col: glassColors[2], spd: 0.0035 },
      { r: 2.0, tube: 0.35, pos: [-3.2, -2.4, -1.8], rot: [-0.6, 0.3, 0.7], col: glassColors[3], spd: 0.0028 }
    ];

    torusConfigs.forEach((cfg, i) => {
      const geom = new THREE.TorusGeometry(cfg.r, cfg.tube, 24, 48);
      const mat = createGlassMat(cfg.col, 0.84, 0.1);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(...cfg.pos);
      mesh.rotation.set(...cfg.rot);
      this.ambientGroup.add(mesh);

      this.ambientShapes.push({
        mesh,
        basePos: mesh.position.clone(),
        rotSpeedX: cfg.spd * 0.8,
        rotSpeedY: cfg.spd * 1.2,
        floatFreq: 0.6 + i * 0.2,
        floatAmp: 0.25 + i * 0.08
      });
    });

    // 2. Esferas y globos de cristal flotantes (como en las Imágenes de referencia 1 y 2)
    const sphereConfigs = [
      { r: 0.85, pos: [4.6, 1.8, -1.2], col: glassColors[0] },
      { r: 0.65, pos: [-4.8, -0.8, -1.0], col: glassColors[1] },
      { r: 0.45, pos: [-2.4, 3.2, -1.5], col: glassColors[4] },
      { r: 0.55, pos: [3.2, -2.8, -0.8], col: glassColors[2] },
      { r: 0.35, pos: [-1.2, -3.6, -1.2], col: glassColors[3] },
      { r: 0.4,  pos: [1.8, 3.6, -2.2], col: glassColors[0] }
    ];

    sphereConfigs.forEach((cfg, i) => {
      const geom = new THREE.SphereGeometry(cfg.r, 32, 32);
      const mat = createGlassMat(cfg.col, 0.88, 0.08);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(...cfg.pos);
      this.ambientGroup.add(mesh);

      this.ambientShapes.push({
        mesh,
        basePos: mesh.position.clone(),
        rotSpeedX: 0.002,
        rotSpeedY: 0.003,
        floatFreq: 0.8 + i * 0.25,
        floatAmp: 0.3 + i * 0.06
      });
    });
  }

  resize() {
    if (!this.renderer || !this.container) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  setAutoRotate(enabled) {
    this._autoRotate = enabled;
  }

  /**
   * Controla la visibilidad de las figuras de cristal flotantes ambientales.
   * Deben desaparecer cuando se genera o visualiza la escultura para no interferir con su estructura.
   */
  setAmbientVisible(visible) {
    if (this.ambientGroup) {
      this.ambientGroup.visible = !!visible;
    }
  }

  _startLoop() {
    const render = () => {
      this._animFrameId = requestAnimationFrame(render);

      const t = performance.now() * 0.001;

      // Animar suavemente las formas de cristal flotantes solo cuando están visibles (inicio)
      if (this.ambientGroup && this.ambientGroup.visible) {
        for (let i = 0; i < this.ambientShapes.length; i++) {
          const item = this.ambientShapes[i];
          item.mesh.rotation.x += item.rotSpeedX;
          item.mesh.rotation.y += item.rotSpeedY;
          item.mesh.position.y = item.basePos.y + Math.sin(t * item.floatFreq) * item.floatAmp;
          item.mesh.position.x = item.basePos.x + Math.cos(t * item.floatFreq * 0.7) * (item.floatAmp * 0.4);
        }
      }

      if (this.controls) {
        if (this._autoRotate) {
          this.sculptureGroup.rotation.y += 0.0025;
        }
        this.controls.update();
      }

      this.renderer.render(this.scene, this.camera);
    };
    render();
  }

  /**
   * Genera una escultura procedural a partir del análisis visual y la partitura.
   */
  buildFromScore(score, analysis) {
    this.init();
    this.clear();
    this.setAmbientVisible(false);
    this.duration = score.duration || 10;
    this.elements = [];
    this.strands = this.elements;
    this._buildInterpretiveForm(score, analysis);
    this.updateGrowth(0);
  }

  /**
   * Construye una composición procedural según el movimiento, su distribución y la evolución temporal.
   */
  _buildInterpretiveForm(score, analysis) {
    const samples = analysis.samples || [];
    if (!samples.length) return;
    const palette = analysis.globalPalette?.length
      ? analysis.globalPalette.map(c => new THREE.Color(c.hex))
      : [new THREE.Color(0xc66b9c), new THREE.Color(0xe7c9df), new THREE.Color(0x8265a8)];
    this.ambientShapes.forEach((s, i) => s.mesh.material.color.lerp(palette[i % palette.length], 0.45));

    // Seed de los datos reales: imágenes y partituras distintas producen gramáticas distintas.
    let seed = 2166136261;
    samples.forEach((s, i) => {
      seed = Math.imul(seed ^ Math.round((s.motion || 0) * 1000 + (s.contrast || 0) * 97 + i), 16777619);
      (s.motionGrid || []).forEach(v => { seed = Math.imul(seed ^ Math.round(v * 10000), 16777619); });
    });
    score.events.forEach(e => { seed = Math.imul(seed ^ Math.round((e.time || 0) * 100 + (e.midi || 0)), 16777619); });
    let rng = seed >>> 0 || 1;
    const random = () => { rng ^= rng << 13; rng ^= rng >>> 17; rng ^= rng << 5; return (rng >>> 0) / 4294967296; };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const mean = key => samples.reduce((sum, s) => sum + (s[key] || 0), 0) / samples.length;
    const motion = mean('motion'), contrast = mean('contrast');
    const aspect = clamp((analysis.width || 1) / (analysis.height || 1), 0.55, 1.8);
    const paletteColor = i => palette[i % palette.length].clone().lerp(palette[Math.floor(random() * palette.length)], 0.2);
    const material = (color, solid = false) => new THREE.MeshPhysicalMaterial({ color,
      transmission: solid ? 0.04 : 0.22 + random() * 0.45, roughness: 0.1 + random() * 0.2,
      metalness: 0.04 + random() * 0.16, ior: 1.45 + random() * 0.12,
      clearcoat: 0.95, clearcoatRoughness: 0.06, transparent: true,
      opacity: 0.87 + random() * 0.13, side: THREE.DoubleSide });
    const add = (geom, color, kind, born, end, position) => {
      geom.setDrawRange(0, 0);
      const mesh = new THREE.Mesh(geom, material(color, kind.includes('filament') || kind.includes('strut')));
      if (position) mesh.position.copy(position);
      const targetScale = mesh.scale.clone();
      if (kind === 'cell' || kind === 'porous-node') mesh.scale.setScalar(0.0001);
      this.sculptureGroup.add(mesh);
      this.elements.push({ type: 'procedural', strategy: kind, geom, mesh,
        totalCount: geom.index ? geom.index.count : geom.attributes.position.count,
        birthTime: born, growDuration: Math.max(0.25, end - born), targetScale });
      return mesh;
    };
    const tube = (points, radius, color, kind, born, end) => {
      if (points.length < 3) return;
      add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(18, points.length * 4), radius, 7, false), color, kind, born, end);
    };
    const anchorAt = s => {
      const grid = s.motionGrid || []; let total = 0, x = 0, y = 0;
      grid.forEach((v, i) => { total += v; x += ((i % 4) / 3 - 0.5) * v; y += (Math.floor(i / 4) / 3 - 0.5) * v; });
      if (total) { x /= total; y /= total; } else { x = s.motionDx || 0; y = -(s.motionDy || 0); }
      return new THREE.Vector3(x * 0.75, y * 0.65, (random() - 0.5) * 0.3);
    };
    const branch = (root, direction, length, depth, color, born, end) => {
      const points = [root.clone()]; let tip = root.clone(), axis = direction.clone().normalize();
      for (let j = 0; j < 5; j++) { axis.add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5)).normalize(); tip = tip.clone().addScaledVector(axis, length / 5); points.push(tip); }
      tube(points, 0.014 + length * 0.014, color, 'branch', born, end);
      if (depth) for (let j = 0, n = 1 + Math.floor(random() * 2); j < n; j++) branch(tip,
        axis.clone().add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5)), length * (0.45 + random() * 0.2), depth - 1, color.clone().lerp(paletteColor(j), 0.2), born, end);
    };

    let drift = new THREE.Vector3((random() - 0.5) * 0.4, (random() - 0.5) * 0.4, (random() - 0.5) * 0.3);
    const hop = Math.max(1, Math.floor(samples.length / clamp(8 + score.events.length / Math.max(1, this.duration), 8, 20)));
    for (let i = 0; i < samples.length; i += hop) {
      const s = samples[i], activity = clamp((s.motion || 0) * 1.7 + (s.motionSpeed || 0) * 0.04, 0, 1);
      const born = s.time || i / samples.length * this.duration;
      const end = Math.max(born + 0.25, samples[Math.min(samples.length - 1, i + hop)]?.time || this.duration);
      const notesHere = score.events.filter(e => e.time >= born && e.time < end).length;
      const complexity = clamp(0.2 + activity * 0.7 + contrast * 0.3 + Math.min(0.2, notesHere * 0.025), 0.2, 1);
      drift.addScaledVector(anchorAt(s), 0.12 + activity * 0.2).multiplyScalar(0.88).clampLength(0, 0.8);
      const origin = drift.clone(), color = new THREE.Color(s.dominantColor?.hex || paletteColor(i).getHex());
      const axis = new THREE.Vector3((s.motionDx || 0.35) + (random() - 0.5) * 0.6,
        -(s.motionDy || 0.2) + (random() - 0.5) * 0.6, random() - 0.5).normalize();
      const grammar = random();
      // Open grammar: every temporal region chooses a structure and parameters from its visual field.
      if (grammar < 0.24 + activity * 0.1) {
        for (let n = 0; n < 1 + Math.floor(complexity * 2); n++) branch(origin.clone().add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(0.3)), axis, 0.35 + complexity * 0.65, 1 + Math.floor(random() * 2), color, born, end);
      } else if (grammar < 0.45) {
        // Interwoven filaments with changing pitch and radius.
        const side = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 0, 1)).normalize(); if (side.lengthSq() < 0.1) side.set(1, 0, 0);
        const up = new THREE.Vector3().crossVectors(axis, side).normalize();
        for (let n = 0, count = 2 + Math.floor(complexity * 4); n < count; n++) {
          const points = [], phase = random() * 6.28, turns = 0.6 + random() * (1 + activity * 2);
          for (let j = 0; j <= 20; j++) { const u = j / 20, a = phase + u * 6.28 * turns, r = 0.12 + complexity * 0.35 + Math.sin(u * Math.PI) * 0.16;
            points.push(origin.clone().addScaledVector(axis, (u - 0.5) * 0.9).addScaledVector(side, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r)); }
          tube(points, 0.012 + random() * 0.025, paletteColor(n), 'filament-helix', born, end);
        }
      } else if (grammar < 0.66) {
        // Cohesive cellular clusters, linked by short tendons.
        const points = [], count = 3 + Math.floor(complexity * 7);
        for (let n = 0; n < count; n++) { const p = origin.clone().add(new THREE.Vector3((random() - 0.5) * 0.9, (random() - 0.5) * 0.65, (random() - 0.5) * 0.7)); points.push(p);
          add(new THREE.IcosahedronGeometry(0.07 + random() * (0.1 + complexity * 0.12), random() > 0.75 ? 2 : 1), paletteColor(n), 'cell', born, end, p); }
        for (let n = 1; n < Math.min(points.length, 5); n++) tube([points[0], points[0].clone().lerp(points[n], 0.5), points[n]], 0.014, color, 'tendon', born, end);
      } else if (grammar < 0.84) {
        // Folded, indexed membrane whose silhouette follows local direction.
        const rows = 26, cols = 9, vertices = [], indices = [];
        const side = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 0, 1)).normalize(); if (side.lengthSq() < 0.1) side.set(1, 0, 0);
        const up = new THREE.Vector3().crossVectors(axis, side).normalize();
        for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) { const u = r / rows, v = c / cols * 2 - 1, w = Math.sin(Math.PI * u) * (0.22 + complexity * 0.3), fold = Math.sin(u * 8 + v * 3 + random() * 0.02) * 0.13;
          const p = origin.clone().addScaledVector(axis, (u - 0.5) * 1.1).addScaledVector(side, v * w).addScaledVector(up, fold); vertices.push(p.x, p.y, p.z);
          if (r < rows && c < cols) { const a = r * (cols + 1) + c, b = a + cols + 1; indices.push(a, b, a + 1, b, b + 1, a + 1); } }
        const geom = new THREE.BufferGeometry(); geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geom.setIndex(indices); geom.computeVertexNormals(); add(geom, color, 'membrane', born, end);
      } else {
        // Porous web from irregular nodes and locally connected struts.
        const nodes = []; for (let n = 0, count = 4 + Math.floor(complexity * 5); n < count; n++) { const a = random() * 6.28, r = 0.2 + random() * 0.5, p = origin.clone().add(new THREE.Vector3(Math.cos(a) * r, (random() - 0.5) * 0.6, Math.sin(a) * r)); nodes.push(p); add(new THREE.IcosahedronGeometry(0.05 + random() * 0.08, 1), paletteColor(n), 'porous-node', born, end, p); }
        nodes.forEach((p, n) => { const q = nodes[(n + 1 + Math.floor(random() * Math.max(1, nodes.length - 1))) % nodes.length]; tube([p, p.clone().lerp(q, 0.5), q], 0.012 + random() * 0.014, color, 'porous-strut', born, end); });
      }
      if (activity > 0.42 && random() < activity * 0.5) branch(origin, axis, 0.45 + activity * 0.4, 1, color, born, end);
    }
    this.sculptureGroup.scale.set(aspect >= 1 ? 1 : 0.72 + aspect * 0.28, aspect < 1 ? 1 : 0.72 + (1 / aspect) * 0.28, 0.82 + motion * 0.2);
    this.sculptureGroup.rotation.set((random() - 0.5) * 0.6, (random() - 0.5) * 0.7, (random() - 0.5) * 0.6);
    this.sculptureGroup.position.copy(drift);
  }

  updateGrowth(time) {
    this.currentTime = Math.max(0, Math.min(this.duration, time));
    const progress = (this.duration > 0) ? (this.currentTime / this.duration) : 1.0;

    for (let i = 0; i < this.elements.length; i++) {
      const el = this.elements[i];

      if (el.type === 'procedural') {
        const elapsed = this.currentTime - el.birthTime;
        if (elapsed < 0) {
          el.mesh.visible = false;
          el.geom.setDrawRange(0, 0);
          if (el.targetScale) el.mesh.scale.setScalar(0.0001);
        } else {
          el.mesh.visible = true;
          const growth = Math.min(1, elapsed / el.growDuration);
          if (el.strategy === 'cell' || el.strategy === 'porous-node') {
            el.geom.setDrawRange(0, el.totalCount);
            el.mesh.scale.copy(el.targetScale).multiplyScalar(Math.max(0.0001, 1 - Math.pow(1 - growth, 3)));
          } else {
            el.mesh.scale.copy(el.targetScale);
            el.geom.setDrawRange(0, Math.max(3, Math.floor(el.totalCount * growth)));
          }
        }
      } else if (el.type === 'ribbon' || el.type === 'accent') {
        const segments = el.longitudinalSegments || 144;
        const indicesPerSegment = el.type === 'ribbon' ? el.acrossSegments * 6 : 6 * 6;
        const segmentCount = Math.ceil(progress * segments);
        el.geom.setDrawRange(0, Math.min(el.totalCount, segmentCount * indicesPerSegment));
        el.mesh.visible = progress > 0.001;
      } else if (el.type === 'tube') {
        if (progress <= 0.001) {
          el.geom.setDrawRange(0, 0);
          el.mesh.visible = false;
        } else {
          el.mesh.visible = true;
          if (el.isIndexed) {
            const indicesPerSeg = el.radialSegments * 6;
            const segsToShow = Math.ceil(progress * el.tubularSegments);
            const currentCount = Math.min(el.totalCount, segsToShow * indicesPerSeg);
            el.geom.setDrawRange(0, currentCount);
          } else {
            el.geom.setDrawRange(0, Math.floor(progress * el.totalCount));
          }
        }
      } else if (el.type === 'fine_filament') {
        if (this.currentTime < el.birthTime) {
          el.geom.setDrawRange(0, 0);
          el.mesh.visible = false;
        } else {
          el.mesh.visible = true;
          const elapsed = this.currentTime - el.birthTime;
          const growDuration = Math.max(0.35, (el.duration || 0.5) * 1.5);
          const growProgress = Math.min(1.0, elapsed / growDuration);
          const currentCount = Math.floor(growProgress * el.totalCount);
          el.geom.setDrawRange(0, Math.max(2, currentCount));
        }
      } else if (el.type === 'circle' || el.type === 'node' || el.type === 'membrane') {
        if (this.currentTime < el.birthTime) {
          el.mesh.visible = false;
          el.mesh.scale.set(0.0001, 0.0001, 0.0001);
        } else {
          el.mesh.visible = true;
          const elapsed = this.currentTime - el.birthTime;
          const growProgress = Math.min(1.0, elapsed / Math.max(0.3, el.growDuration || 0.5));
          const ease = 1 - Math.pow(1 - growProgress, 3);
          const s = Math.max(0.0001, el.targetScale * ease);
          el.mesh.scale.set(s, s, s);
        }
      }
    }
  }

  prepareForExport() {
    this.setAmbientVisible(false);
    for (let i = 0; i < this.elements.length; i++) {
      const el = this.elements[i];
      el.mesh.visible = true;
      if (el.geom && el.geom.setDrawRange) {
        el.geom.setDrawRange(0, el.totalCount || Infinity);
      }
      if (el.targetScale) {
        el.mesh.scale.set(el.targetScale, el.targetScale, el.targetScale);
      }
    }
  }

  clear() {
    if (!this.sculptureGroup) return;
    while (this.sculptureGroup.children.length > 0) {
      const obj = this.sculptureGroup.children[0];
      this.sculptureGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }
    this.elements = [];
    this.strands = this.elements;
  }

  dispose() {
    if (this._animFrameId) cancelAnimationFrame(this._animFrameId);
    this.clear();
    if (this.ambientGroup) {
      while (this.ambientGroup.children.length > 0) {
        const obj = this.ambientGroup.children[0];
        this.ambientGroup.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      }
    }
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.remove();
      this.renderer.dispose();
    }
    this.isInitialized = false;
  }
}
