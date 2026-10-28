# PULSO

**PULSO convierte un video en una composición sonora y una escultura 3D procedural que evoluciona en el navegador.** El video se analiza localmente: no se envía a un servidor.

## 1. Concepto y relación imagen-sonido

La relación que propone PULSO es una **traducción audiovisual**: el video no se imita con sonidos literales ni se le asigna una banda sonora convencional. Sus variaciones de color, brillo, contraste y actividad visual se convierten en reglas musicales. La escultura 3D hace visible parte de ese mismo recorrido temporal.

El sistema muestrea el video con un canvas de análisis de 128 × 72 píxeles. En cada muestra calcula luminancia, contraste, color promedio, un tono dominante estimado y diferencias de luminancia respecto del fotograma anterior. Es una lectura abstracta de la imagen; no reconoce objetos, personas ni el significado de la escena.

La traducción busca que se pueda escuchar la actividad que suele quedar en segundo plano: cambios de intensidad, pausas, transiciones cromáticas y desplazamiento aproximado. Las pausas reducen la actividad de algunas capas; cambios de tono pueden modificar la escala; el movimiento puede afectar la densidad, la articulación y el paneo. Son correspondencias algorítmicas, no equivalencias universales entre un color y una emoción.

## 2. Banco de sonidos y disparador

PULSO no utiliza grabaciones de theremín, handpan, guitarras, cuerdas o voces. `js/music.js` genera esos timbres en tiempo real con osciladores y procesadores de Web Audio. Por eso, la columna de procedencia distingue una síntesis propia de una muestra de audio externa.

## 3. Parámetros y gráfica

### Parámetros musicales

No hay controles en la interfaz para editar directamente los parámetros del sintetizador. Los valores se derivan del análisis del video mediante `MusicComposer` en `js/music.js`; la interfaz permite reproducir, pausar, desplazarse por el tiempo y exportar.

| Rasgo visual | Parámetro musical afectado | Por qué se usa |
|---|---|---|
| Hue dominante | Escala, grado y selección de notas | Mantiene una relación cromática consistente a lo largo de la composición. |
| Brillo medio | Registro y velocidad/intensidad de algunas capas | Traduce una diferencia global de luminancia sin analizar semánticamente la escena. |
| Movimiento entre fotogramas | Densidad de eventos, duración e intensidad de melodía y acentos | Hace que periodos activos tengan más articulación que periodos quietos. |
| Centro aproximado de píxeles cambiantes (`motionDx`) | Paneo estéreo | Da una dimensión espacial sencilla al desplazamiento detectado. |
| Contraste | Frecuencia de corte del filtro | Vincula la variación tonal del fotograma con el brillo tímbrico. |

El movimiento se estima mediante diferencias de luminancia entre fotogramas, no mediante optical flow. `motionDx` y `motionDy` son centros ponderados de los píxeles que cambiaron, así que pueden reaccionar a flashes o cortes como si fueran desplazamiento.

### Decisiones gráficas

La interfaz usa fondo oscuro, violeta y magenta, tipografía sans serif con detalles monoespaciados, paneles translúcidos y reflejos. Esta identidad enmarca el resultado como una experiencia de escucha y observación; **no codifica el color de la interfaz como si fuera la paleta del video**. Los colores aplicados a los anillos de la escultura proceden de las muestras analizadas, mediante un tono dominante estimado y valores promedio.

La vista 3D utiliza Three.js y un material físico de apariencia vítrea. La escultura final se construye como **una sola superficie tubular indexada**, desarrollada por anillos a lo largo del tiempo. Movimiento, distribución espacial, contraste, tono y eventos musicales modifican su curvatura, grosor, pliegues y color. Es una forma conectada, pero la implementación actual no genera ramificaciones topológicas; además, mantiene una tendencia de crecimiento vertical.

**Capturas de la aplicación**

Home page:
<img width="1917" height="907" alt="image" src="https://github.com/user-attachments/assets/bee13507-b762-4c05-85c9-72b84211b411" />


![Resultado de ejemplo: escultura 3D, metadatos, video original y controles de reproducción](docs/captura-resultado.png)

### Archivos principales

| Archivo | Función |
|---|---|
| `index.html`, `style.css` | Estructura de pantallas, controles y presentación visual. |
| `js/app.js` | Coordina carga, análisis, composición, escultura, reproducción y exportación. |
| `js/analyzer.js` | Muestrea video con Canvas y calcula métricas visuales. |
| `js/music.js` | Convierte las muestras en eventos y sintetiza/reproduce el score con Web Audio. |
| `js/sculpture.js` | Construye la escena Three.js y hace crecer la malla tubular. |
| `js/timeline.js` | Sincroniza posición del video, audio y crecimiento de la malla. |
| `js/exporter.js`, `js/video-recorder.js` | Exportan audio, modelo, imagen y grabación audiovisual. |
| `vendor/` | Dependencias locales Three.js, OrbitControls, GLTFExporter y LameJS. |

## 4. Reflexión y mejoras

Traducir imagen a sonido hizo evidente que una misma secuencia contiene muchas señales posibles, pero el sistema solo escucha las que su análisis puede medir. La diferencia de luminancia puede dar ritmo e intensidad, aunque no explica qué se mueve ni por qué. El hue global puede orientar una escala, pero no conserva todos los colores ni descubre una armonía “correcta”. La síntesis evoca timbres etéreos, pero no reemplaza la expresividad de instrumentos y voces reales.

Quedan fuera del sistema actual, entre otras cosas, el contenido semántico de las escenas, la profundidad real de la imagen, el movimiento óptico preciso, las diferencias de timbre de una grabación auténtica y los cambios cromáticos dentro de una misma zona del fotograma. La escultura registra muestras en sus anillos, pero su topología es una trayectoria tubular y no una estructura ramificada libre.

**Mejoras concretas propuestas:**

1. **Incorporar optical flow y muestreo cromático por regiones.** Sustituir el centro aproximado de cambios de luminancia por vectores de movimiento y analizar varias regiones o una paleta por fotograma. Esto reduciría falsos acentos por flashes y permitiría que dirección, zonas de color y escultura dependieran de más información visual.
2. **Añadir controles de mapping y capas con procedencia explícita.** Permitir ajustar densidad, registro, paneo y mezcla de timbres, mostrando qué rasgo visual controla cada parámetro. Si se incorporan grabaciones reales, añadir una tabla de atribución con autor, origen y licencia por archivo de audio.
