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
    const events = score.events || [];
    if (!samples.length) return;

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const palette = analysis.globalPalette?.length
      ? analysis.globalPalette.map(item => new THREE.Color(item.hex))
      : [new THREE.Color(0xc66b9c), new THREE.Color(0xe7c9df), new THREE.Color(0x8265a8)];
    this.ambientShapes.forEach((item, i) => {
      if (item.mesh.material?.color) item.mesh.material.color.lerp(palette[i % palette.length], 0.4);
    });

    // A single watertight, tapered surface grows from its foot to its crown.
    // Video motion steers its stem; pitch, density and velocity sculpt its folds.
    const rings = 192;
    const radialSegments = 56;
    const positions = [];
    const colors = [];
    const indices = [];
    const height = 4.0;
    let driftX = (samples[0].motionDx || 0) * 0.12;
    let driftZ = -(samples[0].motionDy || 0) * 0.1;
    let twist = 0;
    let previousU = 0;
    const mean = key => samples.reduce((sum, sample) => sum + (sample[key] || 0), 0) / samples.length;
    const averageMotion = mean('motion');
    const aspect = clamp((analysis.width || 1) / Math.max(1, analysis.height || 1), 0.55, 1.8);
    const bottomCenter = (rings + 1) * (radialSegments + 1);
    const topCenter = bottomCenter + 1;
    let bottomPoint = null, topPoint = null;

    positions.length = (rings + 1) * (radialSegments + 1) * 3;
    colors.length = positions.length;
    const colorFor = (u, index) => {
      const sample = samples[index];
      const base = new THREE.Color(sample.dominantColor?.hex || '#c66b9c');
      const pearl = palette[(index + Math.floor(u * 3)) % palette.length];
      return base.lerp(pearl, 0.16).multiplyScalar(0.88 + (sample.brightness || 0.5) * 0.22);
    };

    for (let ring = 0; ring <= rings; ring++) {
      const u = ring / rings;
      const sampleIndex = Math.min(samples.length - 1, Math.floor(u * (samples.length - 1)));
      const sample = samples[sampleIndex];
      const time = u * this.duration;
      const motion = clamp(sample.motion || 0, 0, 1);
      const windowTime = this.duration / rings * 3.2;
      let eventEnergy = 0, pitch = 60, pitchWeight = 0, noteCount = 0;
      for (const event of events) {
        const delta = Math.abs(event.time - time);
        if (delta > windowTime) continue;
        const weight = (1 - delta / windowTime) * (event.velocity || 0.25);
        eventEnergy += weight;
        pitch += ((event.midi || 60) - 60) * weight;
        pitchWeight += weight;
        noteCount++;
      }
      const meanPitch = pitchWeight > 0 ? 60 + (pitch - 60) / pitchWeight : 60;
      const pitchClass = ((meanPitch % 12) + 12) % 12;
      const resonance = clamp(eventEnergy, 0, 1.6);
      const motionX = sample.motionDx || 0;
      const motionY = sample.motionDy || 0;
      const grid = sample.motionGrid || [];
      let gridTotal = 0, gridX = 0, gridY = 0;
      grid.forEach((value, i) => {
        gridTotal += value;
        gridX += ((i % 4) / 3 - 0.5) * value;
        gridY += (Math.floor(i / 4) / 3 - 0.5) * value;
      });
      if (gridTotal > 0) { gridX /= gridTotal; gridY /= gridTotal; }
      const step = u - previousU;
      driftX = clamp(driftX + (motionX * 0.7 + gridX * 0.3) * motion * step * 1.8, -0.78, 0.78);
      driftZ = clamp(driftZ + (-motionY * 0.7 - gridY * 0.3) * motion * step * 1.45, -0.66, 0.66);
      twist += step * (1.25 + pitchClass * 0.1 + motion * 0.9);
      previousU = u;

      const taper = Math.pow(Math.max(0.0005, Math.sin(Math.PI * u)), 0.72);
      const pulse = Math.sin(u * Math.PI * (2.2 + (sample.motionSpeed || 0) * 0.08) + pitchClass * 0.24);
      const bodyRadius = (0.07 + 0.62 * taper) * (1 + motion * 0.16 + resonance * 0.09 + pulse * 0.075);
      const centerX = driftX + Math.sin(u * Math.PI * 1.7 + twist * 0.32) * (0.05 + motion * 0.12);
      const centerZ = driftZ + Math.cos(u * Math.PI * 1.25 - twist * 0.27) * (0.045 + resonance * 0.07);
      const y = -height * 0.5 + height * u + Math.sin(twist * 0.65) * 0.09;
      if (ring === 0) bottomPoint = new THREE.Vector3(centerX, y, centerZ);
      if (ring === rings) topPoint = new THREE.Vector3(centerX, y, centerZ);

      const color = colorFor(u, sampleIndex);
      for (let side = 0; side <= radialSegments; side++) {
        const angle = (side / radialSegments) * Math.PI * 2;
        const lobeCount = 3.2 + (pitchClass / 12) * 2.4 + Math.min(1.3, noteCount * 0.1);
        const folds = 1
          + Math.sin(angle * lobeCount + twist) * (0.12 + motion * 0.07 + resonance * 0.055)
          + Math.sin(angle * (lobeCount + 2.1) - twist * 0.72) * (0.055 + (sample.contrast || 0) * 0.045)
          + Math.cos(angle * 2 - twist * 0.43) * 0.035;
        const radius = Math.max(0.035, bodyRadius * folds);
        const vertex = (ring * (radialSegments + 1) + side) * 3;
        positions[vertex] = centerX + Math.cos(angle) * radius * (aspect >= 1 ? 1.12 : 0.92);
        positions[vertex + 1] = y + Math.sin(angle * 2 + twist) * motion * 0.035;
        positions[vertex + 2] = centerZ + Math.sin(angle) * radius;
        const colorIndex = vertex;
        colors[colorIndex] = color.r;
        colors[colorIndex + 1] = color.g;
        colors[colorIndex + 2] = color.b;

        if (ring < rings && side < radialSegments) {
          const a = ring * (radialSegments + 1) + side;
          const b = a + radialSegments + 1;
          indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
    }

    // Both ends are capped into this same indexed surface, so the sculpture
    // is one solid mesh rather than a group of floating pieces.
    positions.push(bottomPoint.x, bottomPoint.y, bottomPoint.z, topPoint.x, topPoint.y, topPoint.z);
    colors.push(0.86, 0.72, 0.82, 0.92, 0.8, 0.9);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, vertexColors: true,
      transmission: 0.18, roughness: 0.17, metalness: 0.12,
      ior: 1.46, clearcoat: 1, clearcoatRoughness: 0.055,
      transparent: true, opacity: 0.97, side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    this.sculptureGroup.add(mesh);
    const capIndices = radialSegments * 3;
    const sideIndices = rings * radialSegments * 6;
    const sideFaces = indices.splice(0);
    const bottomFaces = [];
    const topFaces = [];
    for (let side = 0; side < radialSegments; side++) {
      bottomFaces.push(bottomCenter, side, side + 1);
      const topRing = rings * (radialSegments + 1) + side;
      topFaces.push(topCenter, topRing + 1, topRing);
    }
    indices.push(...bottomFaces, ...sideFaces, ...topFaces);
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    this.elements.push({
      type: 'solid', strategy: 'single-growing-surface', geom: geometry, mesh,
      totalCount: indices.length, ringCount: rings, indicesPerRing: radialSegments * 6,
      bottomCapIndices: capIndices, sideIndices, topCapStart: capIndices + sideIndices
    });

    this.sculptureGroup.position.set(0, 0, 0);
    this.sculptureGroup.scale.set(1, 1, 1);
    this.sculptureGroup.rotation.set(0, 0, 0);
  }
  updateGrowth(time) {
    this.currentTime = Math.max(0, Math.min(this.duration, time));
    const progress = (this.duration > 0) ? (this.currentTime / this.duration) : 1.0;

    for (let i = 0; i < this.elements.length; i++) {
      const el = this.elements[i];

      if (el.type === 'solid') {
        const visibleRings = Math.floor(progress * el.ringCount);
        const sideCount = Math.min(el.sideIndices, visibleRings * el.indicesPerRing);
        const topCap = progress >= 1 ? el.bottomCapIndices : 0;
        el.geom.setDrawRange(0, el.bottomCapIndices + sideCount + topCap);
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
