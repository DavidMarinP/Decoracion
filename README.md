# 🛋️ Decoración 3D - Visor de Plano y Catálogo MagicPlan

Aplicación web interactiva 3D con Three.js para visualización de planos arquitectónicos a escala 1:1, configuración y renderizado de mobiliario, y catálogo comparativo de muebles. Diseñado para funcionar tanto en escritorio como en dispositivos móviles.

---

## 📱 Uso en Móvil (GitHub Pages)

Puedes abrir la aplicación directamente en el navegador de tu móvil o tablet a través de **GitHub Pages**:
- **URL**: `https://davidmarinp.github.io/Decoracion/`
- En móviles, la interfaz cuenta con controles táctiles optimizados (arrastrar con un dedo para rotar, dos dedos para zoom/desplazamiento) y botones de acceso rápido para alternar la altura de las paredes o desplegar el panel de configuración de muebles.

> [!TIP]
> En iOS (Safari) o Android (Chrome), puedes pulsar **"Añadir a la pantalla de inicio"** para usarla a pantalla completa como una app nativa.

---

## 🚀 Uso en Local

Si deseas ejecutar el servidor local en Python (que incluye utilidades adicionales de sincronización y scraping de imágenes):

1. Haz doble clic en `iniciar_visor.bat` o ejecuta en la terminal:
   ```bash
   python server.py
   ```
2. Accede desde tu navegador en el PC a:
   ```
   http://localhost:8080
   ```
3. O desde tu móvil conectado a la misma red WiFi local escaneando el código QR generado o accediendo a la IP mostrada por la consola.

---

## 🛠️ Tecnologías

- **Three.js** (WebGL 3D)
- **HTML5 / CSS3 / JavaScript (ES Modules)**
- **MagicPlan export data**
- **Python 3** (servidor local opcional para endpoints y scraping)
