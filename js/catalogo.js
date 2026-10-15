// ========================================================
// CATÁLOGO Y COMPARADOR DE MUEBLES - LOGICA JAVASCRIPT
// ========================================================

class CatalogoMuebles {
  constructor() {
    this.muebles = [];
    this.filtroCategoria = 'todas';
    this.filtroZona = 'todas';
    this.filtroEstado = 'todos';
    this.filtroBusqueda = '';
    this.seleccionComparar = new Set();
    this.editandoId = null;

    this.init();
  }

  async init() {
    this.renderEstructuraDOM();
    this.setupEventListeners();
    await this.cargarMuebles();
    this.actualizarVista();
  }

  // Carga desde el servidor local con fallback a data/muebles.json y localStorage
  async cargarMuebles() {
    try {
      const res = await fetch('/api/muebles');
      if (res.ok) {
        this.muebles = await res.json();
        localStorage.setItem('decoracion_muebles', JSON.stringify(this.muebles));
        return;
      }
    } catch (e) {
      console.warn('Servidor local /api/muebles no disponible, probando data/muebles.json', e);
    }

    // Fallback a archivo estático data/muebles.json (para GitHub Pages, Vercel o visor sin servidor Python)
    try {
      const resStatic = await fetch('data/muebles.json');
      if (resStatic.ok) {
        const staticData = await resStatic.json();
        const local = localStorage.getItem('decoracion_muebles');
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed) && parsed.length > 0) {
              this.muebles = parsed;
              return;
            }
          } catch (err) {}
        }
        this.muebles = staticData;
        localStorage.setItem('decoracion_muebles', JSON.stringify(this.muebles));
        return;
      }
    } catch (e) {
      console.warn('data/muebles.json no accesible estáticamente', e);
    }

    // Fallback final a localStorage
    const local = localStorage.getItem('decoracion_muebles');
    if (local) {
      try {
        this.muebles = JSON.parse(local);
      } catch (err) {
        this.muebles = [];
      }
    } else {
      this.muebles = [];
    }
  }

  // Guardar en servidor local y en localStorage
  async guardarMuebles() {
    localStorage.setItem('decoracion_muebles', JSON.stringify(this.muebles));
    try {
      await fetch('/api/muebles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.muebles)
      });
    } catch (e) {
      console.warn('Error guardando en backend local', e);
    }
    this.actualizarVista();
  }

  // Notificación toast flotante
  mostrarToast(mensaje, tipo = 'success') {
    let toast = document.getElementById('catalogo-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'catalogo-toast';
      toast.className = 'catalogo-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span>✨</span><span>${mensaje}</span>`;
    toast.classList.add('active');
    setTimeout(() => {
      toast.classList.remove('active');
    }, 3200);
  }

  // ========================================================
  // RENDERIZADO DEL DOM PRINCIPAL
  // ========================================================
  renderEstructuraDOM() {
    // Contenedor modal principal del catálogo

    // Contenedor modal principal del catálogo
    const overlay = document.createElement('div');
    overlay.id = 'catalogo-overlay';
    overlay.className = 'catalogo-overlay';
    overlay.innerHTML = `
      <div class="catalogo-container">
        <!-- Header -->
        <div class="catalogo-header">
          <div class="catalogo-title-group">
            <div class="catalogo-icon-badge">🛋️</div>
            <div>
              <h2>Catálogo de Muebles & Comparador</h2>
              <p>Guarda opciones de tiendas, compara medidas y pruébalos a escala real en el salón 3D</p>
            </div>
          </div>
          <div class="catalogo-actions">
            <button id="btn-nuevo-mueble" class="btn-primary-cat">
              <span>➕</span> Añadir Mueble
            </button>
            <button id="btn-cerrar-catalogo" class="btn-close-cat" title="Cerrar">&times;</button>
          </div>
        </div>

        <!-- Barra de Presupuesto y Resumen -->
        <div class="catalogo-budget-bar">
          <div class="budget-stats">
            <div class="stat-pill">
              <span>Total Piezas:</span>
              <strong id="stat-total-muebles">0</strong>
            </div>
            <div class="stat-pill">
              <span>⭐ Favoritos:</span>
              <strong id="stat-total-favs">0</strong>
            </div>
            <div class="stat-pill fav-budget">
              <span>💰 Presupuesto Favoritos:</span>
              <strong id="stat-presupuesto-total">0 €</strong>
            </div>
          </div>
          <div>
            <span style="font-size: 0.8rem; color: #64748b;">💡 Pulsa <strong>"Probar en 3D"</strong> en cualquier mueble para ver si cabe en tu salón.</span>
          </div>
        </div>

        <!-- Filtros y Búsqueda -->
        <div class="catalogo-filter-bar">
          <div class="filter-row-top">
            <div class="category-chips" id="category-chips">
              <button class="chip-btn active" data-cat="todas">Todos los muebles</button>
              <button class="chip-btn" data-cat="sofas">🛋️ Sofás</button>
              <button class="chip-btn" data-cat="mesas_comedor">🪑 Mesas Comedor</button>
              <button class="chip-btn" data-cat="sillas">💺 Sillas</button>
              <button class="chip-btn" data-cat="muebles_tv">📺 Muebles TV</button>
              <button class="chip-btn" data-cat="librerias">📚 Librerías</button>
              <button class="chip-btn" data-cat="mesas_centro">☕ Mesas de Centro</button>
              <button class="chip-btn" data-cat="iluminacion">💡 Iluminación</button>
              <button class="chip-btn" data-cat="decoracion">🖼️ Decoración</button>
            </div>

            <div class="filter-search-group">
              <input type="text" id="input-search-muebles" class="input-search-cat" placeholder="🔍 Buscar por nombre, tienda...">
              <select id="select-zona" class="select-filter-cat">
                <option value="todas">Todas las zonas</option>
                <option value="comedor">Zona Comedor</option>
                <option value="tv">Zona TV</option>
                <option value="descanso">Zona Sofá / Descanso</option>
                <option value="lectura">Rincón Lectura</option>
                <option value="recibidor">Recibidor</option>
              </select>
              <select id="select-estado" class="select-filter-cat">
                <option value="todos">Todos los estados</option>
                <option value="favorito">⭐ Favoritos / Elegidos</option>
                <option value="candidato">💡 Candidatos (En duda)</option>
                <option value="comprado">🛒 Ya Comprados</option>
                <option value="descartado">❌ Descartados</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Grid de Tarjetas -->
        <div class="catalogo-body">
          <div class="muebles-grid" id="muebles-grid">
            <!-- Renderizado dinámico -->
          </div>
        </div>

        <!-- Barra flotante de Comparar -->
        <div class="compare-floating-bar" id="compare-floating-bar">
          <div class="compare-items-thumbs" id="compare-thumbs"></div>
          <span id="compare-count-text" style="color: #f8fafc; font-size: 0.85rem; font-weight: 600;">2 muebles seleccionados</span>
          <button id="btn-ver-comparativa" class="btn-open-compare">
            <span>⚖️</span> Comparar Cara a Cara
          </button>
          <button id="btn-cancelar-comparar" class="btn-clear-compare">Limpiar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Modal Comparador Lado a Lado
    const compareModal = document.createElement('div');
    compareModal.id = 'compare-modal-view';
    compareModal.className = 'compare-modal-view';
    compareModal.innerHTML = `
      <div class="compare-box-container">
        <div class="compare-box-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.4rem;">⚖️</span>
            <h3 style="margin: 0; color: #f8fafc; font-size: 1.15rem;">Comparativa Lado a Lado de Muebles</h3>
          </div>
          <button id="btn-cerrar-comparador" class="btn-close-cat">&times;</button>
        </div>
        <div class="compare-columns-grid" id="compare-columns-grid"></div>
      </div>
    `;
    document.body.appendChild(compareModal);

    // Modal Añadir / Editar Mueble
    const addModal = document.createElement('div');
    addModal.id = 'add-mueble-modal';
    addModal.className = 'add-mueble-modal';
    addModal.innerHTML = `
      <div class="add-mueble-card">
        <div class="add-mueble-header">
          <h3 id="add-modal-title">➕ Guardar Nuevo Mueble</h3>
          <button id="btn-cerrar-add-modal" class="btn-close-cat">&times;</button>
        </div>
        <div class="add-mueble-body">
          <!-- Autocompletar por enlace -->
          <div class="scrape-box">
            <span style="font-size: 0.8rem; color: #93c5fd; font-weight: 600;">⚡ Autocompletar desde enlace de la tienda (IKEA, Kave Home, Sklum, etc.)</span>
            <div class="scrape-input-row">
              <input type="url" id="input-scrape-url" class="form-input-cat" style="flex: 1;" placeholder="Pega aquí el link del mueble...">
              <button type="button" id="btn-ejecutar-scrape" class="btn-scrape-action">
                <span>🪄</span> Autocompletar
              </button>
            </div>
            <small style="color: #64748b; font-size: 0.72rem;">Extrae automáticamente el nombre, foto principal, precio y dimensiones aproximadas.</small>
          </div>

          <!-- Dropzone Imagen o pegar Ctrl+V -->
          <div class="dropzone-img" id="dropzone-img">
            <div id="dropzone-empty-state">
              <span style="font-size: 2rem;">📷</span>
              <p style="margin: 4px 0; font-size: 0.85rem; color: #cbd5e1;">Haz clic para seleccionar imagen, arrastra un archivo o <strong>pega una captura (Ctrl+V)</strong></p>
              <span style="font-size: 0.72rem; color: #64748b;">o escribe la URL directa en el campo inferior</span>
            </div>
            <img id="dropzone-preview-img" class="dropzone-preview" style="display: none;" alt="Preview">
            <input type="file" id="input-file-mueble" accept="image/*" style="display: none;">
          </div>
          <input type="text" id="input-img-url" class="form-input-cat" placeholder="URL de la imagen (o generada automáticamente)">

          <!-- Formulario Datos -->
          <div class="form-grid-2">
            <div class="form-group-cat">
              <label class="form-label-cat">Nombre del Mueble *</label>
              <input type="text" id="input-nombre" class="form-input-cat" placeholder="Ej. Mesa Comedor Extensible Roble" required>
            </div>
            <div class="form-group-cat">
              <label class="form-label-cat">Tienda / Marca</label>
              <input type="text" id="input-tienda" class="form-input-cat" placeholder="Ej. Kave Home, IKEA, Maison...">
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-group-cat">
              <label class="form-label-cat">Categoría *</label>
              <select id="input-categoria" class="form-input-cat">
                <option value="sofas">🛋️ Sofá / Chaise Longue</option>
                <option value="mesas_comedor">🪑 Mesa de Comedor</option>
                <option value="sillas">💺 Sillas</option>
                <option value="muebles_tv">📺 Mueble TV / Aparador</option>
                <option value="librerias">📚 Librería / Estantería</option>
                <option value="mesas_centro">☕ Mesa de Centro / Auxiliar</option>
                <option value="iluminacion">💡 Iluminación / Lámpara</option>
                <option value="decoracion">🖼️ Decoración / Cuadro</option>
              </select>
            </div>
            <div class="form-group-cat">
              <label class="form-label-cat">Zona del Salón</label>
              <select id="input-zona" class="form-input-cat">
                <option value="comedor">Zona Comedor</option>
                <option value="tv">Zona TV</option>
                <option value="descanso">Zona Sofá / Descanso</option>
                <option value="lectura">Rincón Lectura</option>
                <option value="recibidor">Recibidor</option>
              </select>
            </div>
          </div>

          <!-- Dimensiones exactas -->
          <div class="form-grid-3">
            <div class="form-group-cat">
              <label class="form-label-cat">Ancho (cm) *</label>
              <input type="number" id="input-ancho" class="form-input-cat" placeholder="Ej. 180" step="1">
            </div>
            <div class="form-group-cat">
              <label class="form-label-cat">Fondo (cm) *</label>
              <input type="number" id="input-fondo" class="form-input-cat" placeholder="Ej. 90" step="1">
            </div>
            <div class="form-group-cat">
              <label class="form-label-cat">Alto (cm) *</label>
              <input type="number" id="input-alto" class="form-input-cat" placeholder="Ej. 75" step="1">
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-group-cat">
              <label class="form-label-cat">Precio (€)</label>
              <input type="number" id="input-precio" class="form-input-cat" placeholder="Ej. 450" step="0.01">
            </div>
            <div class="form-group-cat">
              <label class="form-label-cat">Estado inicial</label>
              <select id="input-estado" class="form-input-cat">
                <option value="candidato">💡 Candidato (En duda)</option>
                <option value="favorito">⭐ Favorito / Finalista</option>
                <option value="comprado">🛒 Ya Comprado</option>
                <option value="descartado">❌ Descartado</option>
              </select>
            </div>
          </div>

          <div class="form-group-cat">
            <label class="form-label-cat">Acabado / Material</label>
            <input type="text" id="input-acabado" class="form-input-cat" placeholder="Ej. Madera de cerezo, patas metal negro mate, tela beige...">
          </div>

          <!-- Sección de múltiples enlaces / tiendas complementarias -->
          <div class="enlaces-section-box">
            <div class="enlaces-section-header">
              <h4>🌐 Páginas Web y Tiendas Complementarias</h4>
              <button type="button" id="btn-add-enlace-row" class="btn-add-enlace">
                <span>➕</span> Añadir otra web / tienda
              </button>
            </div>
            <div class="enlaces-list-container" id="enlaces-list-container">
              <!-- Filas dinámicas de enlaces -->
            </div>
            <small style="color: #64748b; font-size: 0.73rem;">
              Guarda varias webs para este mueble: ficha técnica oficial del fabricante, distribuidores con diferentes precios/plazos, o tiendas con muestras de telas y acabados.
            </small>
          </div>

          <div class="form-group-cat">
            <label class="form-label-cat">Notas / Pros y Contras</label>
            <textarea id="input-notas" class="form-input-cat" rows="2" placeholder="Detalles de envío, plazo de entrega, dudas sobre si encaja con las sillas..."></textarea>
          </div>
        </div>

        <div class="add-mueble-footer">
          <button type="button" id="btn-cancelar-mueble" class="btn btn-view" style="background: #1e293b;">Cancelar</button>
          <button type="button" id="btn-guardar-mueble" class="btn-primary-cat">💾 Guardar Mueble</button>
        </div>
      </div>
    `;
    document.body.appendChild(addModal);
  }

  // ========================================================
  // EVENT LISTENERS
  // ========================================================
  setupEventListeners() {
    // Abrir y cerrar catálogo
    document.addEventListener('click', (e) => {
      if (e.target.closest('#btn-abrir-catalogo')) {
        document.getElementById('catalogo-overlay').classList.add('active');
        this.actualizarVista();
      }
      if (e.target.closest('#btn-cerrar-catalogo')) {
        document.getElementById('catalogo-overlay').classList.remove('active');
      }
      if (e.target.closest('#btn-cerrar-comparador')) {
        document.getElementById('compare-modal-view').classList.remove('active');
      }
      if (e.target.closest('#btn-cerrar-add-modal') || e.target.closest('#btn-cancelar-mueble')) {
        document.getElementById('add-mueble-modal').classList.remove('active');
      }
    });

    // Filtros de categoría (Chips)
    document.getElementById('category-chips').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip-btn');
      if (!chip) return;
      document.querySelectorAll('#category-chips .chip-btn').forEach(b => b.classList.remove('active'));
      chip.classList.add('active');
      this.filtroCategoria = chip.dataset.cat;
      this.actualizarVista();
    });

    // Filtro de zona y estado
    document.getElementById('select-zona').addEventListener('change', (e) => {
      this.filtroZona = e.target.value;
      this.actualizarVista();
    });

    document.getElementById('select-estado').addEventListener('change', (e) => {
      this.filtroEstado = e.target.value;
      this.actualizarVista();
    });

    // Buscador en tiempo real
    document.getElementById('input-search-muebles').addEventListener('input', (e) => {
      this.filtroBusqueda = e.target.value.toLowerCase().trim();
      this.actualizarVista();
    });

    // Botón añadir mueble
    document.getElementById('btn-nuevo-mueble').addEventListener('click', () => {
      this.abrirModalNuevoMueble();
    });

    // Guardar mueble en el formulario
    document.getElementById('btn-guardar-mueble').addEventListener('click', () => {
      this.guardarFormularioMueble();
    });

    // Scraping por URL
    document.getElementById('btn-ejecutar-scrape').addEventListener('click', () => {
      this.ejecutarScrapingURL();
    });

    // Dropzone y pegar imagen (Ctrl+V)
    const dropzone = document.getElementById('dropzone-img');
    const inputFile = document.getElementById('input-file-mueble');

    dropzone.addEventListener('click', () => inputFile.click());
    inputFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.procesarArchivoImagen(file);
    });

    // Drag and drop en dropzone
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#38bdf8';
    });
    dropzone.addEventListener('dragleave', () => {
      dropzone.style.borderColor = '#334155';
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#334155';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        this.procesarArchivoImagen(e.dataTransfer.files[0]);
      }
    });

    // Pegar imagen del portapapeles con Ctrl+V cuando el modal está activo
    window.addEventListener('paste', (e) => {
      const modal = document.getElementById('add-mueble-modal');
      if (!modal.classList.contains('active')) return;
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          this.procesarArchivoImagen(blob);
          this.mostrarToast('Imagen pegada desde el portapapeles');
          break;
        }
      }
    });

    // Botones del Comparador
    document.getElementById('btn-cancelar-comparar').addEventListener('click', () => {
      this.seleccionComparar.clear();
      this.actualizarBarraComparar();
      this.actualizarVista();
    });

    document.getElementById('btn-ver-comparativa').addEventListener('click', () => {
      this.mostrarModalComparador();
    });

    // Añadir nueva fila de enlace web complementario
    const btnAddEnlace = document.getElementById('btn-add-enlace-row');
    if (btnAddEnlace) {
      btnAddEnlace.addEventListener('click', () => {
        this.crearFilaEnlace();
      });
    }
  }

  // Crear fila para enlace complementario
  crearFilaEnlace(enlaceData = {}) {
    const container = document.getElementById('enlaces-list-container');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'enlace-item-card';

    const tiendaVal = enlaceData.tienda || '';
    const urlVal = enlaceData.url || '';
    const precioVal = enlaceData.precio ? enlaceData.precio : '';
    const notasVal = enlaceData.notas || '';

    row.innerHTML = `
      <div class="enlace-item-row-1">
        <input type="text" class="form-input-cat input-enlace-tienda" placeholder="Tienda / Fuente (ej. Oficial, Distribuidor A)" value="${tiendaVal}">
        <input type="url" class="form-input-cat input-enlace-url" placeholder="https://..." value="${urlVal}">
        <div style="display: flex; gap: 6px;">
          <button type="button" class="btn-mini-scrape" title="Extraer información de esta web">
            <span>🪄</span> Info
          </button>
          <button type="button" class="btn-del-enlace" title="Eliminar este enlace">
            &times;
          </button>
        </div>
      </div>
      <div class="enlace-item-row-2">
        <input type="number" class="form-input-cat input-enlace-precio" placeholder="Precio (€)" value="${precioVal}" step="0.01">
        <input type="text" class="form-input-cat input-enlace-notas" placeholder="Detalles de esta tienda (ej. tela especial, 10% descuento, stock inmediato...)" value="${notasVal}">
        ${urlVal ? `<a href="${urlVal}" target="_blank" class="btn-icon-subtle" title="Abrir web" style="text-decoration: none; width: 32px; height: 32px;">↗</a>` : '<div></div>'}
      </div>
    `;

    // Botón eliminar fila
    row.querySelector('.btn-del-enlace').addEventListener('click', () => {
      row.remove();
    });

    // Botón mini-scrape para este enlace específico
    row.querySelector('.btn-mini-scrape').addEventListener('click', async () => {
      const urlInput = row.querySelector('.input-enlace-url');
      const tiendaInput = row.querySelector('.input-enlace-tienda');
      const precioInput = row.querySelector('.input-enlace-precio');
      const url = urlInput.value.trim();
      if (!url) {
        alert('Introduce una URL para extraer datos.');
        return;
      }

      const fb = this.extraerFallbackDesdeURL(url);
      if (fb.tienda && !tiendaInput.value) tiendaInput.value = fb.tienda;

      try {
        const res = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        if (res.ok) {
          const d = await res.json();
          if (d.tienda) tiendaInput.value = d.tienda;
          if (d.precio > 0) precioInput.value = d.precio;
          if (d.imagen && !document.getElementById('input-img-url').value) {
            document.getElementById('input-img-url').value = d.imagen;
            this.mostrarPreviewImagen(d.imagen);
          }
          this.mostrarToast(`Datos de ${d.tienda || 'la web'} obtenidos`);
        }
      } catch (e) {
        this.mostrarToast(`Tienda detectada: ${fb.tienda}`);
      }
    });

    container.appendChild(row);
  }

  // ========================================================
  // CAPTURA RÁPIDA: SCRAPING Y ARCHIVOS
  // ========================================================
  extraerFallbackDesdeURL(url) {
    try {
      const u = new URL(url);
      const host = u.hostname.replace('www.', '').toLowerCase();
      let tienda = host.split('.')[0].toUpperCase();
      if (host.includes('devina')) tienda = 'Devina Nais';
      else if (host.includes('kave')) tienda = 'Kave Home';
      else if (host.includes('ikea')) tienda = 'IKEA';
      else if (host.includes('sklum')) tienda = 'Sklum';
      else if (host.includes('maisons')) tienda = 'Maisons du Monde';
      else if (host.includes('zara')) tienda = 'Zara Home';
      else if (host.includes('porada')) tienda = 'Porada';
      else if (host.includes('albidecor')) tienda = 'Albidecor';
      else if (host.includes('elcorteingles')) tienda = 'El Corte Inglés';

      const parts = u.pathname.split('/').filter(Boolean);
      let nombre = '';
      if (parts.length > 0) {
        let rawSlug = decodeURIComponent(parts[parts.length - 1]);
        rawSlug = rawSlug.replace(/\.html?$/i, '');
        nombre = rawSlug.replace(/[-_]+/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).trim();
      }

      let cat = 'sofas';
      const low = (url + ' ' + nombre).toLowerCase();
      if (low.includes('sedia') || low.includes('silla') || low.includes('chair')) cat = 'sillas';
      else if (low.includes('tavolo') || low.includes('mesa') || low.includes('table')) cat = 'mesas_comedor';
      else if (low.includes('libreria') || low.includes('estanteria') || low.includes('shelf')) cat = 'librerias';
      else if (low.includes('tv') || low.includes('aparador') || low.includes('sideboard')) cat = 'muebles_tv';
      else if (low.includes('centro') || low.includes('coffee') || low.includes('baja')) cat = 'mesas_centro';
      else if (low.includes('lamp') || low.includes('luz') || low.includes('foco')) cat = 'iluminacion';

      return { nombre, tienda, categoria: cat, url };
    } catch (e) {
      return { nombre: '', tienda: 'Tienda Web', categoria: 'sofas', url };
    }
  }

  async ejecutarScrapingURL() {
    const inputUrl = document.getElementById('input-scrape-url');
    const url = inputUrl.value.trim();
    if (!url) {
      alert('Por favor, introduce una URL válida.');
      return;
    }

    const btn = document.getElementById('btn-ejecutar-scrape');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<span>⏳</span> Analizando...`;
    btn.disabled = true;

    // Extracción inmediata local como base garantizada
    const fallback = this.extraerFallbackDesdeURL(url);
    if (fallback.nombre && !document.getElementById('input-nombre').value) {
      document.getElementById('input-nombre').value = fallback.nombre;
    }
    if (fallback.tienda) {
      document.getElementById('input-tienda').value = fallback.tienda;
    }
    if (fallback.categoria) {
      document.getElementById('input-categoria').value = fallback.categoria;
    }

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.nombre) document.getElementById('input-nombre').value = data.nombre;
        if (data.tienda) document.getElementById('input-tienda').value = data.tienda;
        if (data.categoria) document.getElementById('input-categoria').value = data.categoria;
        if (data.precio > 0) document.getElementById('input-precio').value = data.precio;
        if (data.ancho > 0) document.getElementById('input-ancho').value = data.ancho;
        if (data.fondo > 0) document.getElementById('input-fondo').value = data.fondo;
        if (data.alto > 0) document.getElementById('input-alto').value = data.alto;
        if (data.imagen) {
          document.getElementById('input-img-url').value = data.imagen;
          this.mostrarPreviewImagen(data.imagen);
        }
        this.mostrarToast(`Mueble "${data.nombre || fallback.nombre}" analizado con éxito`);
      } else {
        this.mostrarToast(`Tienda detectada: ${fallback.tienda}. Rellena precio o foto si no eran públicos.`);
      }
    } catch (e) {
      console.warn('Scraping backend no disponible, usando fallback local', e);
      this.mostrarToast(`Datos de ${fallback.tienda} autocompletados desde la URL.`);
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }

  procesarArchivoImagen(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      document.getElementById('input-img-url').value = base64;
      this.mostrarPreviewImagen(base64);
    };
    reader.readAsDataURL(file);
  }

  mostrarPreviewImagen(src) {
    const emptyState = document.getElementById('dropzone-empty-state');
    const previewImg = document.getElementById('dropzone-preview-img');
    emptyState.style.display = 'none';
    previewImg.src = src;
    previewImg.style.display = 'block';
  }

  // ========================================================
  // FORMULARIO NUEVO / EDITAR
  // ========================================================
  abrirModalNuevoMueble(muebleAEditar = null) {
    this.editandoId = muebleAEditar ? muebleAEditar.id : null;
    const modal = document.getElementById('add-mueble-modal');
    const title = document.getElementById('add-modal-title');

    title.innerText = muebleAEditar ? '✏️ Editar Mueble' : '➕ Guardar Nuevo Mueble';
    document.getElementById('input-scrape-url').value = muebleAEditar ? (muebleAEditar.url || '') : '';
    document.getElementById('input-nombre').value = muebleAEditar ? muebleAEditar.nombre : '';
    document.getElementById('input-tienda').value = muebleAEditar ? (muebleAEditar.tienda || '') : '';
    document.getElementById('input-categoria').value = muebleAEditar ? muebleAEditar.categoria : (this.filtroCategoria !== 'todas' ? this.filtroCategoria : 'sofas');
    document.getElementById('input-zona').value = muebleAEditar ? muebleAEditar.zona : 'comedor';
    document.getElementById('input-ancho').value = muebleAEditar ? muebleAEditar.ancho : '';
    document.getElementById('input-fondo').value = muebleAEditar ? muebleAEditar.fondo : '';
    document.getElementById('input-alto').value = muebleAEditar ? muebleAEditar.alto : '';
    document.getElementById('input-precio').value = muebleAEditar ? (muebleAEditar.precio || '') : '';
    document.getElementById('input-estado').value = muebleAEditar ? muebleAEditar.estado : 'candidato';
    document.getElementById('input-acabado').value = muebleAEditar ? (muebleAEditar.acabado || '') : '';
    document.getElementById('input-notas').value = muebleAEditar ? (muebleAEditar.notas || '') : '';
    document.getElementById('input-img-url').value = muebleAEditar ? (muebleAEditar.imagen || '') : '';

    if (muebleAEditar && muebleAEditar.imagen) {
      this.mostrarPreviewImagen(muebleAEditar.imagen);
    } else {
      document.getElementById('dropzone-empty-state').style.display = 'flex';
      document.getElementById('dropzone-preview-img').style.display = 'none';
    }

    // Poblar lista de múltiples enlaces
    const containerEnlaces = document.getElementById('enlaces-list-container');
    if (containerEnlaces) {
      containerEnlaces.innerHTML = '';
      if (muebleAEditar && Array.isArray(muebleAEditar.enlaces) && muebleAEditar.enlaces.length > 0) {
        muebleAEditar.enlaces.forEach(enl => this.crearFilaEnlace(enl));
      } else if (muebleAEditar && muebleAEditar.url) {
        this.crearFilaEnlace({
          tienda: muebleAEditar.tienda || 'Web Oficial',
          url: muebleAEditar.url,
          precio: muebleAEditar.precio || '',
          notas: 'Enlace principal'
        });
      } else {
        this.crearFilaEnlace({ tienda: '', url: '', precio: '', notas: '' });
      }
    }

    modal.classList.add('active');
  }

  guardarFormularioMueble() {
    const nombre = document.getElementById('input-nombre').value.trim();
    if (!nombre) {
      alert('Por favor, indica al menos el nombre del mueble.');
      return;
    }

    // Extraer enlaces múltiples
    const filasEnlaces = document.querySelectorAll('#enlaces-list-container .enlace-item-card');
    const enlaces = [];
    filasEnlaces.forEach(fila => {
      const tienda = fila.querySelector('.input-enlace-tienda').value.trim();
      const url = fila.querySelector('.input-enlace-url').value.trim();
      const precio = parseFloat(fila.querySelector('.input-enlace-precio').value) || 0;
      const notas = fila.querySelector('.input-enlace-notas').value.trim();
      if (url || tienda) {
        enlaces.push({ tienda, url, precio, notas });
      }
    });

    let urlPrincipal = document.getElementById('input-scrape-url').value.trim();
    let tiendaPrincipal = document.getElementById('input-tienda').value.trim();
    let precioPrincipal = parseFloat(document.getElementById('input-precio').value) || 0;

    // Si hay enlaces y no se especificó url/tienda principal, tomar del primero
    if (!urlPrincipal && enlaces.length > 0 && enlaces[0].url) {
      urlPrincipal = enlaces[0].url;
    }
    if (!tiendaPrincipal && enlaces.length > 0 && enlaces[0].tienda) {
      tiendaPrincipal = enlaces[0].tienda;
    }
    if (precioPrincipal === 0 && enlaces.length > 0) {
      const preciosValidos = enlaces.map(e => e.precio).filter(p => p > 0);
      if (preciosValidos.length > 0) {
        precioPrincipal = Math.min(...preciosValidos);
      }
    }

    const nuevoMueble = {
      id: this.editandoId || `mueble_${Date.now()}`,
      nombre,
      categoria: document.getElementById('input-categoria').value,
      zona: document.getElementById('input-zona').value,
      tienda: tiendaPrincipal,
      url: urlPrincipal,
      enlaces,
      imagen: document.getElementById('input-img-url').value.trim() || 'assets/planos/plano_crop_center.png',
      precio: precioPrincipal,
      ancho: parseFloat(document.getElementById('input-ancho').value) || 0,
      fondo: parseFloat(document.getElementById('input-fondo').value) || 0,
      alto: parseFloat(document.getElementById('input-alto').value) || 0,
      estado: document.getElementById('input-estado').value,
      acabado: document.getElementById('input-acabado').value.trim(),
      notas: document.getElementById('input-notas').value.trim(),
      fecha: new Date().toISOString().split('T')[0]
    };

    if (this.editandoId) {
      const idx = this.muebles.findIndex(m => m.id === this.editandoId);
      if (idx !== -1) this.muebles[idx] = nuevoMueble;
      this.mostrarToast(`Mueble "${nombre}" actualizado`);
    } else {
      this.muebles.unshift(nuevoMueble);
      this.mostrarToast(`Mueble "${nombre}" guardado en el catálogo`);
    }

    document.getElementById('add-mueble-modal').classList.remove('active');
    this.guardarMuebles();
  }

  // ========================================================
  // COMPARADOR CARA A CARA (LADO A LADO)
  // ========================================================
  toggleSeleccionComparar(id) {
    if (this.seleccionComparar.has(id)) {
      this.seleccionComparar.delete(id);
    } else {
      if (this.seleccionComparar.size >= 4) {
        alert('Puedes comparar hasta 4 muebles simultáneamente.');
        return;
      }
      this.seleccionComparar.add(id);
    }
    this.actualizarBarraComparar();
    this.actualizarVista();
  }

  actualizarBarraComparar() {
    const bar = document.getElementById('compare-floating-bar');
    const thumbs = document.getElementById('compare-thumbs');
    const countText = document.getElementById('compare-count-text');

    if (this.seleccionComparar.size === 0) {
      bar.classList.remove('active');
      return;
    }

    bar.classList.add('active');
    countText.innerText = `${this.seleccionComparar.size} seleccionados para comparar`;
    thumbs.innerHTML = '';

    this.seleccionComparar.forEach(id => {
      const m = this.muebles.find(item => item.id === id);
      if (m) {
        const img = document.createElement('img');
        img.className = 'compare-thumb-item';
        img.referrerPolicy = 'no-referrer';
        img.src = m.imagen || 'assets/planos/plano_crop_center.png';
        img.title = m.nombre;
        thumbs.appendChild(img);
      }
    });
  }

  mostrarModalComparador() {
    if (this.seleccionComparar.size < 2) {
      alert('Selecciona al menos 2 muebles para compararlos lado a lado.');
      return;
    }

    const modal = document.getElementById('compare-modal-view');
    const grid = document.getElementById('compare-columns-grid');
    grid.innerHTML = '';

    const items = Array.from(this.seleccionComparar).map(id => this.muebles.find(m => m.id === id)).filter(Boolean);
    const preciosValidos = items.map(i => i.precio).filter(p => p > 0);
    const precioMinimo = preciosValidos.length ? Math.min(...preciosValidos) : null;

    items.forEach(m => {
      const esMejorPrecio = precioMinimo !== null && m.precio === precioMinimo;
      const col = document.createElement('div');
      col.className = `compare-col ${m.estado === 'favorito' ? 'highlight-winner' : ''}`;
      col.innerHTML = `
        <img class="compare-col-img" src="${m.imagen || 'assets/planos/plano_crop_center.png'}" alt="${m.nombre}" referrerpolicy="no-referrer">
        <div>
          <h4 style="margin: 0 0 6px 0; color: #f8fafc; font-size: 1.1rem;">${m.nombre}</h4>
          <span style="background: #1e293b; padding: 2px 8px; border-radius: 6px; font-size: 0.78rem; color: #94a3b8;">
            ${m.tienda || 'Sin tienda'}
          </span>
        </div>

        <div class="compare-metric">
          <span class="compare-metric-lbl">Precio Total</span>
          <span class="compare-metric-val ${esMejorPrecio ? 'best-price' : ''}">
            ${m.precio ? `${m.precio.toLocaleString('es-ES')} € ${esMejorPrecio ? '⭐ Más económico' : ''}` : 'No indicado'}
          </span>
        </div>

        <div class="compare-metric">
          <span class="compare-metric-lbl">Dimensiones (Ancho × Fondo × Alto)</span>
          <span class="compare-metric-val">
            ${m.ancho || '?'} × ${m.fondo || '?'} × ${m.alto || '?'} cm
          </span>
        </div>

        <div class="compare-metric">
          <span class="compare-metric-lbl">Acabado / Material</span>
          <span class="compare-metric-val" style="font-size: 0.85rem; font-weight: normal;">
            ${m.acabado || 'No especificado'}
          </span>
        </div>

        <div class="compare-metric">
          <span class="compare-metric-lbl">Webs y Tiendas Complementarias</span>
          <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 4px;">
            ${(Array.isArray(m.enlaces) && m.enlaces.length > 0 ? m.enlaces : (m.url ? [{ tienda: m.tienda || 'Web Oficial', url: m.url, precio: m.precio, notas: '' }] : [])).map(enl => `
              <div style="display: flex; justify-content: space-between; align-items: center; background: #0f172a; padding: 6px 10px; border-radius: 6px; font-size: 0.8rem;">
                <div>
                  <a href="${enl.url || '#'}" target="_blank" style="color: #38bdf8; text-decoration: none; font-weight: 600;">
                    ${enl.tienda || 'Web'} ↗
                  </a>
                  ${enl.notas ? `<div style="font-size: 0.72rem; color: #94a3b8;">${enl.notas}</div>` : ''}
                </div>
                ${enl.precio ? `<span style="font-weight: 700; color: #34d399;">${enl.precio.toLocaleString('es-ES')} €</span>` : ''}
              </div>
            `).join('')}
          </div>
        </div>

        <div class="compare-metric">
          <span class="compare-metric-lbl">Notas / Pros & Contras</span>
          <p style="margin: 0; font-size: 0.82rem; color: #94a3b8; line-height: 1.4;">
            ${m.notas || 'Sin notas registradas.'}
          </p>
        </div>

        <div style="margin-top: auto; display: flex; flex-direction: column; gap: 8px;">
          <button class="btn-primary-cat" onclick="catalogo.marcarComoDefinitivo('${m.id}')" style="justify-content: center;">
            ⭐ Elegir como Favorito
          </button>
          <button class="btn-probar-3d" onclick="catalogo.probarEn3D('${m.id}')">
            👁️ Probar en Salón 3D
          </button>
        </div>
      `;
      grid.appendChild(col);
    });

    modal.classList.add('active');
  }

  marcarComoDefinitivo(id) {
    const mueble = this.muebles.find(m => m.id === id);
    if (!mueble) return;
    mueble.estado = 'favorito';
    this.guardarMuebles();
    this.mostrarToast(`"${mueble.nombre}" marcado como tu mueble Favorito`);
    document.getElementById('compare-modal-view').classList.remove('active');
  }

  // ========================================================
  // ACCIONES DE MUEBLES (PROBAR EN 3D, FAVORITOS, BORRAR)
  // ========================================================
  probarEn3D(id) {
    const mueble = this.muebles.find(m => m.id === id);
    if (!mueble) return;

    // Cerrar modales para ver la escena 3D
    document.getElementById('catalogo-overlay').classList.remove('active');
    document.getElementById('compare-modal-view').classList.remove('active');

    // Comprobar si existe la función global expuesta en app.js
    if (typeof window.probarMuebleEn3D === 'function') {
      window.probarMuebleEn3D(mueble);
      this.mostrarToast(`Mueble "${mueble.nombre}" colocado en el salón 3D a escala real`);
    } else {
      alert(`Mueble "${mueble.nombre}" (${mueble.ancho}x${mueble.fondo}x${mueble.alto} cm). La integración 3D se está conectando.`);
    }
  }

  toggleFavorito(id) {
    const m = this.muebles.find(item => item.id === id);
    if (!m) return;
    m.estado = m.estado === 'favorito' ? 'candidato' : 'favorito';
    this.guardarMuebles();
  }

  eliminarMueble(id) {
    const m = this.muebles.find(item => item.id === id);
    if (!m) return;
    if (confirm(`¿Seguro que quieres eliminar "${m.nombre}" del catálogo?`)) {
      this.muebles = this.muebles.filter(item => item.id !== id);
      this.seleccionComparar.delete(id);
      this.actualizarBarraComparar();
      this.guardarMuebles();
      this.mostrarToast(`"${m.nombre}" eliminado`);
    }
  }

  // ========================================================
  // RENDERIZADO DE VISTA Y TARJETAS
  // ========================================================
  actualizarVista() {
    const grid = document.getElementById('muebles-grid');
    if (!grid) return;

    // Filtrar lista
    const filtrados = this.muebles.filter(m => {
      // Categoría
      if (this.filtroCategoria !== 'todas' && m.categoria !== this.filtroCategoria) return false;
      // Zona
      if (this.filtroZona !== 'todas' && m.zona !== this.filtroZona) return false;
      // Estado
      if (this.filtroEstado !== 'todos' && m.estado !== this.filtroEstado) return false;
      // Búsqueda
      if (this.filtroBusqueda) {
        const texto = `${m.nombre} ${m.tienda || ''} ${m.acabado || ''} ${m.notas || ''}`.toLowerCase();
        if (!texto.includes(this.filtroBusqueda)) return false;
      }
      return true;
    });

    // Actualizar Estadísticas
    const totalFavs = this.muebles.filter(m => m.estado === 'favorito');
    const presupuestoFavs = totalFavs.reduce((acc, curr) => acc + (curr.precio || 0), 0);

    document.getElementById('stat-total-muebles').innerText = this.muebles.length;
    document.getElementById('stat-total-favs').innerText = totalFavs.length;
    document.getElementById('stat-presupuesto-total').innerText = `${presupuestoFavs.toLocaleString('es-ES')} €`;

    // Renderizar tarjetas
    if (filtrados.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #64748b;">
          <span style="font-size: 3rem;">📭</span>
          <h3 style="color: #94a3b8; margin: 12px 0 6px 0;">No se encontraron muebles</h3>
          <p style="font-size: 0.88rem;">Prueba a cambiar los filtros o pulsa en <strong>"Añadir Mueble"</strong> para guardar nuevas piezas.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtrados.map(m => {
      const estaEnComparar = this.seleccionComparar.has(m.id);
      const badgeEstadoTexto = {
        favorito: '⭐ Favorito',
        candidato: '💡 Candidato',
        comprado: '🛒 Comprado',
        descartado: '❌ Descartado'
      }[m.estado] || '💡 Candidato';

      return `
        <div class="mueble-card ${estaEnComparar ? 'selected-compare' : ''}" data-id="${m.id}">
          <div class="card-img-container">
            ${m.imagen ? `<img src="${m.imagen}" alt="${m.nombre}" referrerpolicy="no-referrer" onerror="this.src='assets/planos/plano_crop_center.png'">` : `<div class="card-placeholder-img">🛋️</div>`}
            
            <div class="card-badges-overlay">
              <span class="badge-estado ${m.estado}">${badgeEstadoTexto}</span>
              <button class="btn-toggle-compare ${estaEnComparar ? 'active' : ''}" onclick="catalogo.toggleSeleccionComparar('${m.id}')">
                <span>${estaEnComparar ? '✓ Comparando' : '＋ Comparar'}</span>
              </button>
            </div>
          </div>

          <div class="card-content">
            <div class="card-title-row">
              <h3 class="card-title">${m.nombre}</h3>
              <div class="card-price">${m.precio ? `${m.precio.toLocaleString('es-ES')} €` : 'S/P'}</div>
            </div>

            <div class="card-meta-row">
              <span class="card-shop-tag">${m.tienda || 'Tienda web'}</span>
              <span>•</span>
              <span style="text-transform: capitalize;">${m.zona || 'Salón'}</span>
            </div>

            <!-- Listado de webs y tiendas complementarias -->
            ${(() => {
              const enlacesMueble = Array.isArray(m.enlaces) && m.enlaces.length > 0 
                ? m.enlaces 
                : (m.url ? [{ tienda: m.tienda || 'Web Oficial', url: m.url, precio: m.precio, notas: '' }] : []);

              const preciosValidos = enlacesMueble.map(e => e.precio).filter(p => p > 0);
              const minPrecioWeb = preciosValidos.length ? Math.min(...preciosValidos) : null;

              if (enlacesMueble.length === 0) return '';

              return `
                <div class="card-enlaces-container">
                  <span class="card-enlaces-header-label">🌐 ${enlacesMueble.length === 1 ? 'Web del producto:' : `Webs y Tiendas (${enlacesMueble.length}):`}</span>
                  <div class="card-enlaces-chips-wrap">
                    ${enlacesMueble.map(enl => {
                      const esMejor = minPrecioWeb !== null && enl.precio === minPrecioWeb && enlacesMueble.length > 1;
                      return `
                        <a href="${enl.url || '#'}" target="_blank" class="chip-web-link ${esMejor ? 'is-best-price' : ''}" title="${enl.notas ? `${enl.tienda}: ${enl.notas}` : enl.tienda}">
                          <span>${enl.tienda || 'Web'}</span>
                          ${enl.precio ? `<span class="chip-web-link-price">${enl.precio} €</span>` : ''}
                          <span style="font-size: 0.65rem;">↗</span>
                        </a>
                      `;
                    }).join('')}
                  </div>
                </div>
              `;
            })()}

            <div class="card-dimensions-box">
              <div class="dim-item">
                <span class="dim-label">Ancho</span>
                <span class="dim-val">${m.ancho || '-'} cm</span>
              </div>
              <div class="dim-item">
                <span class="dim-label">Fondo</span>
                <span class="dim-val">${m.fondo || '-'} cm</span>
              </div>
              <div class="dim-item">
                <span class="dim-label">Alto</span>
                <span class="dim-val">${m.alto || '-'} cm</span>
              </div>
            </div>

            ${m.acabado ? `<div style="font-size: 0.8rem; color: #cbd5e1;"><strong>Acabado:</strong> ${m.acabado}</div>` : ''}

            ${m.notas ? `<p class="card-notes" title="${m.notas}">📝 ${m.notas}</p>` : ''}

            <div class="card-footer-actions">
              <button class="btn-probar-3d" onclick="catalogo.probarEn3D('${m.id}')" title="Comprobar en el salón 3D a escala real">
                <span>👁️</span> Probar en 3D
              </button>
              <button class="btn-icon-subtle ${m.estado === 'favorito' ? 'fav-active' : ''}" onclick="catalogo.toggleFavorito('${m.id}')" title="Marcar como Favorito">
                ★
              </button>
              <button class="btn-icon-subtle" onclick="catalogo.abrirModalNuevoMueble(catalogo.muebles.find(x => x.id === '${m.id}'))" title="Editar">
                ✏️
              </button>
              <button class="btn-icon-subtle" onclick="catalogo.eliminarMueble('${m.id}')" title="Eliminar">
                🗑️
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

// Instanciar globalmente
window.catalogo = new CatalogoMuebles();
