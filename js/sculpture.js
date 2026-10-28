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

  resetView() {
    this._autoRotate = false;
    if (this.controls) this.controls.reset();
    if (this.camera) this.camera.position.set(0, 2.2, 9.8);
    if (this.sculptureGroup) this.sculptureGroup.rotation.set(0, 0, 0);
    if (this.controls) {
      this.controls.target.set(0, 0.2, 0);
      this.controls.update();
    }
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
    const events = score.events || [];
    if (!samples.length) return;

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    // Allocate once, then write only the new cross sections reached by playback.
    // Buffer capacity is bounded; visible geometry and colors are appended over time.
    const rings = clamp(Math.max(48, (samples.length - 1) * 2), 48, 192);
    const radialSegments = 56;
    const positions = new Float32Array((rings + 1) * (radialSegments + 1) * 3 + 6);
    const colors = new Float32Array(positions.length);
    const maxIndices = (rings * radialSegments * 6) + radialSegments * 6;
    const indexArray = new Uint32Array(maxIndices);
    const bottomCenter = (rings + 1) * (radialSegments + 1);
    const topCenter = bottomCenter + 1;
    const geometry = new THREE.BufferGeometry();
    const positionAttribute = new THREE.BufferAttribute(positions, 3);
    const colorAttribute = new THREE.BufferAttribute(colors, 3);
    positionAttribute.setUsage(THREE.DynamicDrawUsage);
    colorAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', positionAttribute);
    geometry.setAttribute('color', colorAttribute);
    geometry.setIndex(new THREE.BufferAttribute(indexArray, 1));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 3.2);

    const material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, vertexColors: true,
      transmission: 0.04, roughness: 0.2, metalness: 0.04,
      ior: 1.46, clearcoat: 1, clearcoatRoughness: 0.055,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    this.sculptureGroup.add(mesh);
    const capIndices = radialSegments * 3;
    let indexCount = 0;
    for (let side = 0; side < radialSegments; side++) {
      indexArray[indexCount++] = bottomCenter;
      indexArray[indexCount++] = side + 1;
      indexArray[indexCount++] = side;
    }
    const firstSample = samples[0];
    const initialColor = new THREE.Color(firstSample.dominantColor?.hex || '#704080');
    for (let side = 0; side <= radialSegments; side++) {
      const angle = side / radialSegments * Math.PI * 2;
      const offset = side * 3;
      positions[offset] = Math.cos(angle) * 0.035;
      positions[offset + 1] = -2;
      positions[offset + 2] = Math.sin(angle) * 0.035;
      colors[offset] = initialColor.r;
      colors[offset + 1] = initialColor.g;
      colors[offset + 2] = initialColor.b;
    }
    positions[bottomCenter * 3 + 1] = -2;
    colors[bottomCenter * 3] = initialColor.r;
    colors[bottomCenter * 3 + 1] = initialColor.g;
    colors[bottomCenter * 3 + 2] = initialColor.b;
    positionAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
    geometry.index.needsUpdate = true;
    geometry.setDrawRange(0, indexCount);
    geometry.computeVertexNormals();

    this.elements.push({
      type: 'solid', strategy: 'single-growing-surface', geom: geometry, mesh,
      totalCount: maxIndices, ringCount: rings, radialSegments, indicesPerRing: radialSegments * 6,
      bottomCapIndices: capIndices, topCenter, bottomCenter, sampleData: samples, events,
      positions, colors, indexArray, indexCount, generatedRings: 0, topCapAdded: false,
      eventCursor: 0, activeEvents: [], currentX: 0, currentZ: 0,
      currentTwist: 0, currentDriftX: 0, currentDriftZ: 0, currentLift: 0
    });

    this.sculptureGroup.position.set(0, 0, 0);
    this.sculptureGroup.scale.set(1, 1, 1);
    this.sculptureGroup.rotation.set(0, 0, 0);
  }

  _resetSolidGrowth(el) {
    el.positions.fill(0);
    el.colors.fill(0);
    el.indexArray.fill(0);
    el.indexCount = el.bottomCapIndices;
    for (let side = 0; side < el.radialSegments; side++) {
      const offset = side * 3;
      el.indexArray[offset] = el.bottomCenter;
      el.indexArray[offset + 1] = side + 1;
      el.indexArray[offset + 2] = side;
    }
    el.generatedRings = 0;
    el.topCapAdded = false;
    el.eventCursor = 0;
    el.activeEvents.length = 0;
    el.currentX = 0;
    el.currentZ = 0;
    el.currentTwist = 0;
    el.currentDriftX = 0;
    el.currentDriftZ = 0;
    el.currentLift = 0;
    const sample = el.sampleData[0];
    const color = new THREE.Color(sample.dominantColor?.hex || '#704080');
    for (let side = 0; side <= el.radialSegments; side++) {
      const angle = side / el.radialSegments * Math.PI * 2;
      const offset = side * 3;
      el.positions[offset] = Math.cos(angle) * 0.035;
      el.positions[offset + 1] = -2;
      el.positions[offset + 2] = Math.sin(angle) * 0.035;
      el.colors[offset] = color.r;
      el.colors[offset + 1] = color.g;
      el.colors[offset + 2] = color.b;
    }
    el.positions[el.bottomCenter * 3 + 1] = -2;
    el.colors[el.bottomCenter * 3] = color.r;
    el.colors[el.bottomCenter * 3 + 1] = color.g;
    el.colors[el.bottomCenter * 3 + 2] = color.b;
    const position = el.geom.getAttribute('position');
    const colors = el.geom.getAttribute('color');
    position.needsUpdate = true;
    colors.needsUpdate = true;
    position.updateRange.offset = 0; position.updateRange.count = -1;
    colors.updateRange.offset = 0; colors.updateRange.count = -1;
    el.geom.index.needsUpdate = true;
    el.geom.index.updateRange.offset = 0; el.geom.index.updateRange.count = -1;
    el.geom.setDrawRange(0, el.indexCount);
  }

  _appendSolidRing(el, ring) {
    const samples = el.sampleData;
    const u = ring / el.ringCount;
    const time = u * this.duration;
    const sampleIndex = Math.min(samples.length - 1, Math.floor(u * (samples.length - 1)));
    const sample = samples[sampleIndex];
    const motion = Math.max(0, Math.min(1, sample.motion || 0));
    const windowTime = this.duration / el.ringCount * 1.6;
    while (el.eventCursor < el.events.length && el.events[el.eventCursor].time <= time + windowTime) {
      el.activeEvents.push(el.events[el.eventCursor++]);
    }
    while (el.activeEvents.length && el.activeEvents[0].time < time - windowTime) el.activeEvents.shift();
    let energy = 0, pitchSum = 0, pitchWeight = 0, eventCount = 0;
    for (const event of el.activeEvents) {
      const delta = Math.abs(event.time - time);
      if (delta > windowTime) continue;
      const weight = (1 - delta / windowTime) * (event.velocity || 0.25);
      energy += weight;
      pitchSum += (event.midi || 60) * weight;
      pitchWeight += weight;
      eventCount++;
    }
    const pitch = pitchWeight ? pitchSum / pitchWeight : 60;
    const pitchClass = ((pitch % 12) + 12) % 12;
    const resonance = Math.min(1.4, energy);
    let gridX = 0, gridY = 0, gridTotal = 0;
    (sample.motionGrid || []).forEach((value, i) => {
      gridTotal += value;
      gridX += ((i % 4) / 3 - 0.5) * value;
      gridY += (Math.floor(i / 4) / 3 - 0.5) * value;
    });
    if (gridTotal > 0) { gridX /= gridTotal; gridY /= gridTotal; }

    const step = 1 / el.ringCount;
    el.currentDriftX = Math.max(-0.82, Math.min(0.82, el.currentDriftX + ((sample.motionDx || 0) * 0.65 + gridX * 0.35) * motion * step * 2.3));
    el.currentDriftZ = Math.max(-0.72, Math.min(0.72, el.currentDriftZ - ((sample.motionDy || 0) * 0.65 + gridY * 0.35) * motion * step * 1.9));
    el.currentLift = Math.max(-0.65, Math.min(0.65, el.currentLift + ((sample.motionDy || 0) * 0.65 + gridY * 0.35) * motion * step * 1.4));
    el.currentTwist += step * (1.2 + pitchClass * 0.11 + motion * 1.5 + Math.min(0.7, sample.motionSpeed || 0));
    const turn = (sample.motionDx || 0) - (samples[Math.max(0, sampleIndex - 1)].motionDx || 0);
    el.currentX += (el.currentDriftX - el.currentX) * 0.22 + turn * motion * 0.16;
    el.currentZ += (el.currentDriftZ - el.currentZ) * 0.22 + ((sample.motionDy || 0) * gridX) * motion * 0.08;

    const taper = Math.min(1, 0.26 + u * 3.1, 0.26 + (1 - u) * 3.1);
    const contrast = Math.max(0, Math.min(1, sample.contrast || 0));
    const saturation = (sample.dominantColor?.s || 0);
    const pulse = Math.sin(el.currentTwist * 2.4 + pitchClass * 0.5);
    const radius = Math.max(0.045, (0.095 + motion * 0.19 + contrast * 0.11 + saturation * 0.08 + resonance * 0.055 + pulse * 0.055) * taper);
    const centerX = el.currentX + Math.sin(el.currentTwist + pitchClass * 0.22) * (0.035 + motion * 0.1);
    const centerZ = el.currentZ + Math.cos(el.currentTwist * 0.83 - pitchClass * 0.17) * (0.035 + resonance * 0.075);
    const y = -2 + 4 * u + el.currentLift + Math.sin(el.currentTwist * 0.53) * 0.08;
    const color = new THREE.Color(sample.dominantColor?.hex || '#704080');
    const ringStart = ring * (el.radialSegments + 1);
    const prevStart = ringStart - el.radialSegments - 1;
    const lobeCount = 2.4 + pitchClass * 0.19 + Math.min(2, eventCount * 0.16) + contrast;
    for (let side = 0; side <= el.radialSegments; side++) {
      const angle = side / el.radialSegments * Math.PI * 2;
      const folds = 1
        + Math.sin(angle * lobeCount + el.currentTwist) * (0.11 + motion * 0.1 + resonance * 0.04)
        + Math.sin(angle * (lobeCount + 1.7) - el.currentTwist * 0.74) * (0.045 + contrast * 0.075)
        + Math.cos(angle * 2 - el.currentTwist * 0.4) * 0.04;
      const r = Math.max(0.035, radius * folds);
      const vertex = (ringStart + side) * 3;
      el.positions[vertex] = centerX + Math.cos(angle) * r * 1.05;
      el.positions[vertex + 1] = y + Math.sin(angle * 2 + el.currentTwist) * motion * 0.04;
      el.positions[vertex + 2] = centerZ + Math.sin(angle) * r;
      el.colors[vertex] = color.r;
      el.colors[vertex + 1] = color.g;
      el.colors[vertex + 2] = color.b;
      if (side < el.radialSegments) {
        const a = prevStart + side, b = ringStart + side, offset = el.indexCount;
        el.indexArray[offset] = a;
        el.indexArray[offset + 1] = b;
        el.indexArray[offset + 2] = a + 1;
        el.indexArray[offset + 3] = b;
        el.indexArray[offset + 4] = b + 1;
        el.indexArray[offset + 5] = a + 1;
        el.indexCount += 6;
      }
    }
    if (ring === el.ringCount) {
      const center = el.topCenter * 3;
      el.positions[center] = centerX;
      el.positions[center + 1] = y;
      el.positions[center + 2] = centerZ;
      el.colors[center] = color.r;
      el.colors[center + 1] = color.g;
      el.colors[center + 2] = color.b;
    }
    el.generatedRings = ring;
    const position = el.geom.getAttribute('position');
    const colors = el.geom.getAttribute('color');
    position.updateRange.offset = ringStart * 3;
    position.updateRange.count = (el.radialSegments + 1) * 3;
    position.needsUpdate = true;
    colors.updateRange.offset = ringStart * 3;
    colors.updateRange.count = (el.radialSegments + 1) * 3;
    colors.needsUpdate = true;
    const newIndices = el.radialSegments * 6;
    el.geom.index.updateRange.offset = el.indexCount - newIndices;
    el.geom.index.updateRange.count = newIndices;
    el.geom.index.needsUpdate = true;
  }

  updateGrowth(time) {
    this.currentTime = Math.max(0, Math.min(this.duration, time));
    const progress = (this.duration > 0) ? (this.currentTime / this.duration) : 1.0;

    for (let i = 0; i < this.elements.length; i++) {
      const el = this.elements[i];

      if (el.type === 'solid') {
        const targetRing = Math.min(el.ringCount, Math.floor(progress * el.ringCount));
        if (targetRing < el.generatedRings) this._resetSolidGrowth(el);
        const previousRing = el.generatedRings;
        while (el.generatedRings < targetRing) this._appendSolidRing(el, el.generatedRings + 1);
        let geometryChanged = el.generatedRings !== previousRing;
        if (progress >= 1 && !el.topCapAdded) {
          for (let side = 0; side < el.radialSegments; side++) {
            const offset = el.indexCount;
            const ringStart = el.ringCount * (el.radialSegments + 1);
            el.indexArray[offset] = el.topCenter;
            el.indexArray[offset + 1] = ringStart + side + 1;
            el.indexArray[offset + 2] = ringStart + side;
            el.indexCount += 3;
          }
          el.topCapAdded = true;
          el.geom.index.needsUpdate = true;
          el.geom.index.updateRange.offset = el.indexCount - el.bottomCapIndices;
          el.geom.index.updateRange.count = el.bottomCapIndices;
          geometryChanged = true;
        }
        if (geometryChanged) el.geom.computeVertexNormals();
        el.geom.setDrawRange(0, el.indexCount);
        el.mesh.visible = progress > 0.001;
      } else if (el.type === 'procedural') {
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
    this.updateGrowth(this.duration);
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
