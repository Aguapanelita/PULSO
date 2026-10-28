# PULSO

PULSO convierte un video en una composición sonora y una escultura 3D procedural que evoluciona con su reproducción. El análisis se ejecuta localmente en el navegador.

## Estructura

```text
PULSO/
├── index.html          # Página de entrada y estructura de las tres pantallas
├── style.css           # Estilos
├── js/                 # Código modular de análisis, audio, escultura y exportación
│   ├── app.js
│   ├── analyzer.js
│   ├── exporter.js
│   ├── music.js
│   ├── sculpture.js
│   ├── timeline.js
│   └── video-recorder.js
└── vendor/             # Bibliotecas locales que carga index.html
    ├── three.min.js
    ├── OrbitControls.js
    ├── GLTFExporter.js
    └── lame.min.js
```

`script.js` era una versión antigua y monolítica que duplicaba la aplicación modular. La página no lo cargaba, así que se retiró para evitar confusiones.

## Publicar en GitHub Pages

No se necesita instalar dependencias ni compilar el proyecto. Conserva las carpetas `js/` y `vendor/` junto a `index.html` y `style.css`, respetando esos nombres. En la configuración de Pages, publica desde la raíz de la rama elegida. La página usa rutas relativas, por lo que funciona también en un repositorio de proyecto.

Para probar localmente, abre la carpeta con un servidor web local. Los módulos JavaScript del navegador no funcionan de forma fiable al abrir `index.html` directamente como archivo.
