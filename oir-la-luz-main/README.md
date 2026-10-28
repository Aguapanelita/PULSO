# PULSO — Plataforma experimental de traducción audiovisual

> **«Descubre el ritmo oculto de tus imágenes»**

**PULSO** es una plataforma web experimental que transforma videos propios del usuario en composiciones sonoras algorítmicas mediante el análisis temporal de sus colores, luminosidad y flujos de movimiento. Como resultado complementario, genera una **escultura tridimensional procedural** en Three.js que florece y evoluciona en sincronía con los acontecimientos musicales.

El usuario puede explorar interactivamente la escultura en 3D, reproducir la composición y descargar tanto el audio (**WAV**, **MP3**), el modelo tridimensional (**GLB**, **PNG**), como un **video del desarrollo evolutivo de la escultura sincronizado con el sonido**.

---

## 1. Principio y Cadena de Traducción

La plataforma opera bajo el concepto de que una imagen en movimiento contiene patrones rítmicos, armónicos y dinámicos latentes:

```
Video del usuario ──> Canvas API (Muestreo temporal 128x72)
                          │
       ┌──────────────────┴──────────────────┐
       ▼                                     ▼
Color & Luminancia                       Movimiento
• Tono dominante (Hue)                 • Intensidad (ΔY)
• Saturación y contraste               • Dirección (ΔX, ΔY)
• Brillo promedio                      • Velocidad y Aceleración
       │                               • Periodos de reposo
       └──────────────────┬──────────────────┘
                          ▼
            Composición Algorítmica (Partitura)
       ┌──────────────────┴──────────────────┐
       ▼                                     ▼
Web Audio API (Síntesis)          Three.js (Escultura 3D)
• Modos & Escalas tonales         • Filamentos bioluminiscentes
• Drones & Acordes Pad            • Tallos compactos (Graves)
• Melodías & Plucks FM            • Zarcillos en espiral (Agudos)
• Paneo estéreo por flujo         • Membranas translúcidas (Acordes)
• Filtro biquad & Convolución     • Nódulos texturales (Acentos)
       │                                     │
       └──────────────────┬──────────────────┘
                          ▼
          Sincronización Audiovisual (Timeline)
                          │
     ┌────────────────────┼────────────────────┐
     ▼                    ▼                    ▼
Audio (WAV / MP3)    Modelo 3D (GLB)     Video Evolutivo
```

---

## 2. Correspondencias y Reglas de Diseño (*Mapping Matrix*)

### A. De Imagen a Sonido

| Variable Visual | Parámetro Musical | Regla y Justificación Artística |
|---|---|---|
| **Tono dominante (Hue $0^\circ\text{--}360^\circ$)** | **Modo y Tonalidad** | • **Rojos/Naranjas ($340^\circ\text{--}40^\circ$):** Re Dórico (cálido, terrenal).<br>• **Amarillos/Dorados ($40^\circ\text{--}100^\circ$):** Do Mayor Pentatónico (radiante, abierto).<br>• **Verdes/Esmeraldas ($100^\circ\text{--}170^\circ$):** Fa Lidio (etéreo, flotante).<br>• **Azules/Cianes ($170^\circ\text{--}250^\circ$):** La Menor Pentatónico (profundo, acuático).<br>• **Violetas/Magentas ($250^\circ\text{--}340^\circ$):** Mi Frigio (místico, dramático). |
| **Intensidad de movimiento ($\Delta Y$)** | **Densidad y Dinámica** | A mayor movimiento, mayor frecuencia de eventos melódicos y mayor velocidad (*velocity*) de disparo. |
| **Aceleración ($d\text{Motion}/dt$)** | **Articulación y Textura** | Cambios bruscos producen notas *staccato* rápidas y micro-percusiones de ruido filtrado. |
| **Dirección de movimiento ($\Delta X$)** | **Paneo estéreo** | El centro de masa del movimiento modula dinámicamente el paneo estéreo (izquierda $\leftrightarrow$ derecha) mediante `StereoPannerNode`. |
| **Brillo promedio ($Y$)** | **Registro tonal (Altura)** | Escenas más luminosas activan octavas más agudas; escenas oscuras acentúan el bajo profundo (*sub-bass*). |
| **Contraste ($\sigma_Y$)** | **Timbre y Filtro** | Modula la frecuencia de corte del filtro pasa-bajos biquad ($400\text{ Hz}\text{--}10\text{ kHz}$) y la resonancia $Q$. |
| **Reposo / Quietud** | **Drones y Silencios** | Caídas en el movimiento suspenden arpegios rápidos y sostienen acordes de pad con reverberación amplia. |

### B. De Imagen y Sonido a Escultura 3D Multifacética: «Morfología Creciente de Cristal»

La escultura 3D final no se limita a filamentos, sino que materializa un ecosistema geométrico procedural de cristal con refracción y barniz reflectante (`MeshPhysicalMaterial`):

| Dimensión Sonora y Visual | Morfología 3D Generada | Comportamiento y Justificación Artística |
|---|---|---|
| **Sonidos agudos y sostenidos en el tiempo** | **Filamentos de cristal fino** (`THREE.Line`) | Aparecen específicamente ante notas de alta frecuencia sostenidas ($>350\text{ Hz}$, duración $\ge 0.32\text{ s}$), proyectándose en espirales etéreas ascendentes como hilos de luz. |
| **Acordes armónicos (Pads) y transiciones cromáticas** | **Círculos y anillos concéntricos** (`TorusGeometry`) | Ondas de cristal orbitantes (*halos*) que nacen en la elevación temporal de cada acorde y se expanden radialmente como gotas congeladas en agua. |
| **Pulsos graves (Bajos y anclaje tonal)** | **Nódulos y gemas facetadas** (`IcosahedronGeometry`) | Actúan como el núcleo gravitacional y anclaje de la escultura, materializando la regla: *notas graves = geometrías más compactas y sólidas*. |
| **Picos de aceleración y contraste** | **Membranas y lentes vítreas** (`CylinderGeometry`) | Discos translúcidos flotantes en la periferia que reflejan los impactos dinámicos y la dispersión superficial. |
| **Cuerpo melódico continuo y color de fotogramas** | **Tallos fluidos volumétricos** (`TubeGeometry`) | Entrelazan la estructura central mediante *curl noise*, absorbiendo y pintando el color predominante exacto de cada fotograma a lo largo del tiempo. |

---

## 3. Estructura de la Interfaz (3 Pantallas)

1. **Pantalla 1 · Inicio**:
   - Título PULSO y manifiesto conceptual: *«Descubre el ritmo oculto de tus imágenes»*.
   - Zona de selección y arrastre (*drag-and-drop*) para archivos de video del usuario (MP4, WebM, MOV).
   - Botón **«Probar con video de ejemplo»**: genera proceduralmente una escena fluida en Canvas para probar la plataforma de inmediato sin necesidad de subir un archivo.
   - Ficha de previsualización con metadatos técnicos (resolución, duración en segundos) y botón para iniciar el análisis.

2. **Pantalla 2 · Procesamiento**:
   - Monitor en tiempo real del video original con efecto de escaneo.
   - Barra de progreso real con porcentaje exacto.
   - Indicadores en vivo: tira de muestras de la paleta cromática activa, medidor de movimiento en %, medidor de brillo en %, medidor de contraste y brújula del vector de paneo direccional.
   - Botón de cancelación del proceso.

3. **Pantalla 3 · Resultado**:
   - Lienzo 3D a pantalla completa con navegación interactiva mediante `OrbitControls` (rotar con clic izquierdo, trasladar con clic derecho, zoom con rueda).
   - Barra superior flotante con metadatos de la composición (tonalidad, cantidad de notas, duración) y botón «Nuevo video».
   - Miniatura flotante sincronizada del video original (*Picture-in-Picture*), conmutable con un botón.
   - Barra de reproducción inferior: Reproducir/Pausar, tiempo transcurrido / total, barra de arrastre temporal (*scrubber* interactivo para retroceder o avanzar el crecimiento de la escultura), conmutador de bucle y botón de rotación 3D automática.
   - Botón **«Exportar creación»** que abre el centro de descargas.

---

## 4. Centro de Exportación («Exportar creación»)

Todos los archivos generados son **reales y completos**, sin simulaciones ni cambios artificiales de extensión:

- **Audio WAV**: Composición sonora completa sin pérdidas, codificada en PCM lineal de 16 bits estéreo a 44.1 kHz mediante un codificador binario RIFF nativo.
- **Audio MP3**: Codificación real en MP3 a 192 kbps utilizando `lamejs` en el navegador a partir del renderizado offline de la Web Audio API.
- **Modelo 3D GLB**: Geometría tridimensional madura con mallas, normales y materiales PBR estándar glTF 2.0 binario (`.glb`), exportado mediante `THREE.GLTFExporter`. Compatible con Blender, Unreal Engine, visores 3D de Windows y WebGL.
- **Captura PNG**: Imagen de alta resolución del viewport tridimensional desde el ángulo de cámara elegido por el usuario.
- **Video evolutivo sincronizado (MP4 / WebM)**: Registra el nacimiento y desarrollo progresivo de la escultura geométrica desde el estado cero hasta su forma final, sincronizada frame a frame con la pista de audio de la composición.

---

## 5. Arquitectura del Código

El código está organizado en módulos ES6 independientes y desacoplados:

```
oir-la-luz-main/
├── index.html               # Estructura semántica de las 3 pantallas y modal de exportación
├── style.css                # Sistema visual inmersivo, minimalista y responsivo
├── README.md                # Documentación exhaustiva
├── js/
│   ├── app.js               # Orquestador principal, flujo de pantallas y eventos de UI
│   ├── analyzer.js          # Muestreo de video en Canvas, métricas de color y movimiento
│   ├── music.js             # Generación de partitura algorítmica y motor de síntesis Web Audio
│   ├── sculpture.js         # Escultura 3D procedural en Three.js con crecimiento temporal
│   ├── timeline.js          # Reloj maestro de sincronización audiovisual y scrubbing
│   ├── exporter.js          # Motores de codificación WAV, MP3, GLB y PNG
│   └── video-recorder.js    # Grabador de video determinista con MediaRecorder y audio stream
├── vendor/
│   ├── three.min.js         # Three.js r128 (local)
│   ├── OrbitControls.js     # Controles de órbita para Three.js (local)
│   ├── GLTFExporter.js      # Exportador glTF/GLB para Three.js (local)
│   └── lame.min.js          # Codificador MP3 en JavaScript (local)
├── tests.html               # Suite de 10 pruebas unitarias en navegador
├── e2e.html                 # Prueba de integración End-to-End automática
└── tests/
    └── server_test_runner.py# Ejecutor de pruebas automatizado en headless Edge/Chrome
```

---

## 6. Instrucciones de Ejecución

### Ejecución Local

Dado que la aplicación utiliza módulos JavaScript (`import`/`export`) y APIs avanzadas de audio y video, debe servirse a través de un servidor HTTP local.

**Windows (PowerShell):**
```powershell
Set-Location "c:\Users\lenovo\Desktop\DISP_PERIF\Encargo_06\oir-la-luz-main"
py -m http.server 8123
```

**macOS / Linux (Terminal):**
```bash
cd /ruta/a/oir-la-luz-main
python3 -m http.server 8123
```

Luego, abre en tu navegador (Chrome o Edge recomendado):
```
http://localhost:8123
```

### Publicación en GitHub Pages

1. Sube el repositorio a GitHub.
2. En GitHub: **Settings → Pages → Source: Deploy from a branch → Branch: `main` → Folder: `/ (root)`**.
3. Guarda los cambios. La plataforma se ejecutará inmediatamente con soporte HTTPS completo sin requerir backend alguno.

---

## 7. Verificación y Pruebas Automatizadas

La aplicación cuenta con una suite completa de pruebas unitarias y de integración:

1. **Pruebas Unitarias (`tests.html`)**:
   Valida conversiones cromáticas, validación de archivos, composición determinista, renderizado de audio offline, escultura procedural 3D, sincronización del timeline, exportación binaria WAV, exportación MP3 con LameJS, compatibilidad de GLTFExporter y detección de códecs de video.
2. **Prueba End-to-End (`e2e.html`)**:
   Automatiza el flujo completo: generación de video sintético $\to$ análisis $\to$ generación de escultura y música $\to$ reproducción $\to$ pre-renderizado de audio.
3. **Ejecución de tests desde terminal:**
   ```powershell
   python tests/server_test_runner.py
   ```
   Resultado: `Total pruebas recibidas: 10. TODAS LAS PRUEBAS PASARON EXITOSAMENTE.`

---

## 8. Créditos

- **PULSO — Plataforma experimental de traducción audiovisual** (2026).
- Diseñado y desarrollado para exploración en Creative Coding, generación musical algorítmica y escultura procedural tridimensional.
- Tecnologías: Vanilla JavaScript (ES6+), Web Audio API, Canvas 2D API, Three.js r128, OrbitControls, GLTFExporter, LameJS.
