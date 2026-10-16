import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { magicPlanData } from './magicplan_data.js';

// Detección de dispositivo móvil / tablet
const isMobileDevice = window.innerWidth <= 900 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// --- ESTADO GLOBAL ---
const state = {
  wallHeight: isMobileDevice ? 2.47 : 1.20,
  floorMode: 'parquet',
  tableLegs: 'star',
  tableFinish: 'holandnat',
  tableLegFinish: 'arkansas',
  chairFinish: 'browngrey',
  shelfFinish: 'cerezo',
  sideboardModel: 'punt',
  ledLightOn: true,
  selectedObject: null,
  showCotas: true
};

// ========================================================
// PERSISTENCIA DE PREFERENCIAS (LOCALSTORAGE)
// ========================================================
const STORAGE_KEY = 'decoracion_preferencias_usuario_v1';

function loadUserPreferences() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const cfg = JSON.parse(raw);
      if (cfg.sideboardModel) state.sideboardModel = cfg.sideboardModel;
      if (cfg.tableFinish) state.tableFinish = cfg.tableFinish;
      if (cfg.tableLegs) state.tableLegs = cfg.tableLegs;
      if (cfg.tableLegFinish) state.tableLegFinish = cfg.tableLegFinish;
      if (cfg.chairFinish) state.chairFinish = cfg.chairFinish;
      if (cfg.shelfFinish) state.shelfFinish = cfg.shelfFinish;
      if (typeof cfg.wallHeight === 'number') state.wallHeight = cfg.wallHeight;
      if (cfg.floorMode) state.floorMode = cfg.floorMode;
      if (typeof cfg.ledLightOn === 'boolean') state.ledLightOn = cfg.ledLightOn;
      if (typeof cfg.showCotas === 'boolean') state.showCotas = cfg.showCotas;
      console.log('✓ Preferencias cargadas desde localStorage:', state);
    }
  } catch (e) {
    console.warn('Error leyendo localStorage:', e);
  }
}

function saveUserPreferences() {
  try {
    const cfg = {
      sideboardModel: state.sideboardModel,
      tableFinish: state.tableFinish,
      tableLegs: state.tableLegs,
      tableLegFinish: state.tableLegFinish,
      chairFinish: state.chairFinish,
      shelfFinish: state.shelfFinish,
      wallHeight: state.wallHeight,
      floorMode: state.floorMode,
      ledLightOn: state.ledLightOn,
      showCotas: state.showCotas
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    mostrarAvisoGuardado();
  } catch (e) {
    console.warn('No se pudo guardar en localStorage:', e);
  }
}

let toastTimer = null;
function mostrarAvisoGuardado(texto = 'Preferencias guardadas por defecto') {
  let toast = document.getElementById('toast-notif');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notif';
    toast.style.cssText = 'position:fixed; bottom:24px; right:24px; background:#0f172a; color:#38bdf8; border:1px solid #0284c7; border-radius:10px; padding:10px 18px; z-index:10005; font-size:0.85rem; font-weight:600; box-shadow:0 12px 30px rgba(0,0,0,0.6); pointer-events:none; transition:opacity 0.3s ease; opacity:0; display:flex; align-items:center; gap:8px;';
    document.body.appendChild(toast);
  }
  toast.innerHTML = '<span>💾</span> <span>' + texto + '</span>';
  toast.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.style.opacity = '0';
  }, 2200);
}

// Cargar preferencias antes de crear los modelos 3D
loadUserPreferences();

const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#11151c');

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 120);
camera.position.set(0, 18, 14);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
container.appendChild(renderer.domElement);

// Controles de órbita
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI / 2.05;
controls.target.set(0, 0, -1.0);

// Controles de transformación (Gizmo)
const transformControls = new TransformControls(camera, renderer.domElement);
transformControls.size = 0.85;
scene.add(transformControls);

transformControls.addEventListener('dragging-changed', (event) => {
  controls.enabled = !event.value;
});

// Grupos
const floorGroup = new THREE.Group();
const wallsGroup = new THREE.Group();
const furnitureGroup = new THREE.Group();
const cajonGroup = new THREE.Group();
const cotasGroup = new THREE.Group();
scene.add(floorGroup);
scene.add(wallsGroup);
scene.add(furnitureGroup);
scene.add(cajonGroup);
scene.add(cotasGroup);

const selectableObjects = [];
window.selectableObjects = selectableObjects;
window.scene = scene;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// --- ILUMINACIÓN ---
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x485060, 0.9);
hemiLight.position.set(0, 30, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xfff8ed, 1.7);
dirLight.position.set(10, 24, 8);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 50;
dirLight.shadow.camera.left = -14;
dirLight.shadow.camera.right = 14;
dirLight.shadow.camera.top = 16;
dirLight.shadow.camera.bottom = -16;
dirLight.shadow.bias = -0.0003;
scene.add(dirLight);

const ambientLight = new THREE.AmbientLight(0xd9e3ed, 0.5);
scene.add(ambientLight);

// Luz LED cálida para el cajón tras el sofá
const ledLight = new THREE.PointLight(0xffbe76, 1.3, 5.5, 1.5);
ledLight.position.set(2.8, 1.05, -7.5);
cajonGroup.add(ledLight);

// --- CARGA DEL PLANO VECTORIAL ORIGINAL DE MAGICPLAN ---
const textureLoader = new THREE.TextureLoader();
let planMesh = null;
let parquetMesh = null;

function buildFloor() {
  const w = magicPlanData.page_w_m;
  const h = magicPlanData.page_h_m;
  const floorGeo = new THREE.PlaneGeometry(w, h);

  textureLoader.load('assets/planos/plano_magicplan.png', (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const planMat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide
    });

    planMesh = new THREE.Mesh(floorGeo, planMat);
    planMesh.rotation.x = -Math.PI / 2;
    planMesh.position.y = 0;
    planMesh.receiveShadow = true;
    floorGroup.add(planMesh);

    updateFloorMode();
  });

  const parquetMat = new THREE.MeshStandardMaterial({
    map: createParquetTexture(),
    roughness: 0.52,
    metalness: 0.04,
    transparent: true,
    opacity: 1.0
  });

  parquetMesh = new THREE.Mesh(floorGeo, parquetMat);
  parquetMesh.rotation.x = -Math.PI / 2;
  parquetMesh.position.y = 0.002;
  parquetMesh.receiveShadow = true;
  floorGroup.add(parquetMesh);
}

function updateFloorMode() {
  if (!planMesh || !parquetMesh) return;

  if (state.floorMode === 'plan') {
    planMesh.visible = true;
    parquetMesh.material.opacity = 0;
  } else if (state.floorMode === 'blend') {
    planMesh.visible = true;
    parquetMesh.material.opacity = 0.45;
  } else if (state.floorMode === 'parquet') {
    planMesh.visible = false;
    parquetMesh.material.opacity = 1.0;
  }
}

function createParquetTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Fondo base de roble gris / greige neutro (color exacto del parquet subido por el usuario)
  ctx.fillStyle = '#a9a7a2';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const plankH = 48;
  const plankW = 340;
  for (let y = 0; y < canvas.height; y += plankH) {
    const offset = (Math.floor(y / plankH) % 2) * (plankW / 2);
    for (let x = -plankW; x < canvas.width + plankW; x += plankW) {
      const px = x + offset;
      const shade = (Math.random() - 0.5) * 14;
      const baseR = Math.min(255, Math.max(0, 169 + shade));
      const baseG = Math.min(255, Math.max(0, 167 + shade));
      const baseB = Math.min(255, Math.max(0, 162 + shade));

      ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
      ctx.fillRect(px + 1, y + 1, plankW - 2, plankH - 2);

      // Veta de roble marcada longitudinalmente (ondas, nudos y fibras)
      ctx.save();
      ctx.beginPath();
      ctx.rect(px + 1, y + 1, plankW - 2, plankH - 2);
      ctx.clip();

      const numLines = 6;
      for (let l = 0; l < numLines; l++) {
        const ly = y + 4 + (plankH - 8) * (l / numLines) + (Math.random() - 0.5) * 4;
        const lineDarkness = 0.32 + Math.random() * 0.28;
        ctx.strokeStyle = `rgba(108, 105, 100, ${lineDarkness})`;
        ctx.lineWidth = 1.0 + Math.random() * 1.6;

        ctx.beginPath();
        ctx.moveTo(px, ly);
        ctx.bezierCurveTo(
          px + plankW * 0.3, ly + (Math.random() - 0.5) * 6,
          px + plankW * 0.7, ly + (Math.random() - 0.5) * 6,
          px + plankW, ly + (Math.random() - 0.5) * 3
        );
        ctx.stroke();
      }

      // Sutiles vetas secundarias más finas
      for (let s = 0; s < 4; s++) {
        const sy = y + 2 + Math.random() * (plankH - 4);
        ctx.strokeStyle = 'rgba(85, 82, 78, 0.22)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(px, sy);
        ctx.lineTo(px + plankW, sy + (Math.random() - 0.5) * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Bisel perimetral / junta de unión entre lamas de parquet
      ctx.strokeStyle = 'rgba(70, 68, 64, 0.42)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, y + 0.5, plankW - 1, plankH - 1);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 7);
  return texture;
}

// --- RADIADOR EN PARED NORTE (80 cm ancho, sube a 90 cm, elementos planos, a 15 cm de la esquina) ---
function buildNorthWallRadiator() {
  const radGroup = new THREE.Group();
  radGroup.name = 'Radiador Pared Norte (80 x 90 cm - Elementos Planos)';

  // Material blanco esmaltado electrostático RAL 9016
  const radMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.28,
    metalness: 0.05
  });

  // Material cromado para valvulería y accesorios
  const chromeMat = new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    roughness: 0.15,
    metalness: 0.92
  });

  // Coordenadas exactas:
  // Esquina de la pared norte: Point 8 en magicplan_data = [-2.0693, -6.2177]
  // Separación de 15 cm respecto a la esquina: extremo derecho en X = -2.2193m
  // Anchura de 80 cm: de X = -2.2193m a X = -3.0193m (Centro X = -2.6193m)
  // Cara interna de pared norte en Z = -6.2177m (el radiador sobresale hacia +Z)
  // Cota superior solicitada: sube hasta 90 cm (Y_top = 0.90m, Y_bottom = 0.10m, cuerpo = 0.80m)
  const radWidth = 0.80;
  const radHeight = 0.80;
  const yBottom = 0.10;
  const yTop = 0.90;
  const yCenter = (yBottom + yTop) / 2; // 0.50m
  const xRight = -2.0693 - 0.15; // -2.2193m
  const xLeft = xRight - radWidth; // -3.0193m
  const xCenter = (xRight + xLeft) / 2; // -2.6193m

  const zWall = -6.2177;
  const standoff = 0.028; // Separación a pared para circulación de aire
  const bodyDepth = 0.065; // Fondo total de elementos planos
  const zBack = zWall + standoff;
  const zCenter = zBack + bodyDepth / 2;
  const zFront = zBack + bodyDepth;

  // 1. Elementos planos verticales (10 lamas planas de diseño contemporáneo)
  const numElements = 10;
  const elementW = 0.071; // 7.1 cm ancho de lama
  const stepX = (radWidth - elementW) / (numElements - 1); // separación regular

  for (let i = 0; i < numElements; i++) {
    const elX = xRight - elementW / 2 - i * stepX;

    // Cara frontal plana visible
    const flatGeo = new THREE.BoxGeometry(elementW - 0.003, radHeight, 0.016);
    const flatMesh = new THREE.Mesh(flatGeo, radMat);
    flatMesh.position.set(elX, yCenter, zFront - 0.008);
    flatMesh.castShadow = true;
    flatMesh.receiveShadow = true;
    radGroup.add(flatMesh);

    // Columna trasera con aletas de convección
    const channelGeo = new THREE.BoxGeometry(elementW - 0.022, radHeight - 0.04, bodyDepth - 0.016);
    const channelMesh = new THREE.Mesh(channelGeo, radMat);
    channelMesh.position.set(elX, yCenter, zCenter - 0.004);
    channelMesh.castShadow = true;
    channelMesh.receiveShadow = true;
    radGroup.add(channelMesh);
  }

  // 2. Colectores horizontales superior e inferior
  const manifoldGeo = new THREE.CylinderGeometry(0.016, 0.016, radWidth - 0.04, 16);
  manifoldGeo.rotateZ(Math.PI / 2);

  const topManifold = new THREE.Mesh(manifoldGeo, radMat);
  topManifold.position.set(xCenter, yTop - 0.06, zCenter - 0.004);
  topManifold.castShadow = true;
  radGroup.add(topManifold);

  const bottomManifold = new THREE.Mesh(manifoldGeo, radMat);
  bottomManifold.position.set(xCenter, yBottom + 0.06, zCenter - 0.004);
  bottomManifold.castShadow = true;
  radGroup.add(bottomManifold);

  // 3. Remate decorativo enrasado superior (enrasado exacto a 90 cm de cota)
  const topTrimGeo = new THREE.BoxGeometry(radWidth, 0.010, bodyDepth);
  const topTrim = new THREE.Mesh(topTrimGeo, radMat);
  topTrim.position.set(xCenter, yTop - 0.005, zCenter);
  topTrim.castShadow = true;
  radGroup.add(topTrim);

  // 4. Soportes de anclaje a pared
  const bracketGeo = new THREE.BoxGeometry(0.025, 0.035, standoff + 0.02);
  const bracketPositions = [
    [xRight - 0.12, yTop - 0.10],
    [xLeft + 0.12, yTop - 0.10],
    [xRight - 0.12, yBottom + 0.10],
    [xLeft + 0.12, yBottom + 0.10]
  ];
  bracketPositions.forEach(([bx, by]) => {
    const bracket = new THREE.Mesh(bracketGeo, radMat);
    bracket.position.set(bx, by, zWall + (standoff + 0.02) / 2);
    bracket.castShadow = true;
    radGroup.add(bracket);
  });

  // 5. Válvula con cabezal termostático blanco (en lado derecho hacia la esquina)
  const valveGroup = new THREE.Group();
  const valveBodyGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.05, 16);
  valveBodyGeo.rotateZ(Math.PI / 2);
  const valveBody = new THREE.Mesh(valveBodyGeo, chromeMat);
  valveGroup.add(valveBody);

  const pipeGeo = new THREE.CylinderGeometry(0.009, 0.009, standoff + 0.04, 12);
  pipeGeo.rotateX(Math.PI / 2);
  const pipe = new THREE.Mesh(pipeGeo, chromeMat);
  pipe.position.set(-0.015, 0, -(standoff + 0.04) / 2);
  valveGroup.add(pipe);

  const thermoHeadGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.055, 16);
  thermoHeadGeo.rotateX(Math.PI / 2);
  const thermoHead = new THREE.Mesh(thermoHeadGeo, radMat);
  thermoHead.position.set(0.01, 0, 0.035);
  valveGroup.add(thermoHead);

  const thermoRingGeo = new THREE.CylinderGeometry(0.023, 0.023, 0.010, 16);
  thermoRingGeo.rotateX(Math.PI / 2);
  const thermoRing = new THREE.Mesh(thermoRingGeo, new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.5 }));
  thermoRing.position.set(0.01, 0, 0.012);
  valveGroup.add(thermoRing);

  valveGroup.position.set(xRight + 0.025, yBottom + 0.06, zCenter - 0.004);
  radGroup.add(valveGroup);

  // 6. Detentor inferior izquierdo
  const lockshieldGroup = new THREE.Group();
  const lockshieldBodyGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.04, 16);
  lockshieldBodyGeo.rotateZ(Math.PI / 2);
  const lockshieldBody = new THREE.Mesh(lockshieldBodyGeo, chromeMat);
  lockshieldGroup.add(lockshieldBody);

  const lockshieldCap = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.015, 6), chromeMat);
  lockshieldCap.rotateZ(Math.PI / 2);
  lockshieldCap.position.set(-0.015, 0, 0);
  lockshieldGroup.add(lockshieldCap);

  const pipeLeft = new THREE.Mesh(pipeGeo, chromeMat);
  pipeLeft.position.set(0.01, 0, -(standoff + 0.04) / 2);
  lockshieldGroup.add(pipeLeft);

  lockshieldGroup.position.set(xLeft - 0.025, yBottom + 0.06, zCenter - 0.004);
  radGroup.add(lockshieldGroup);

  // 7. Purgador manual superior derecho
  const bleederGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.025, 6);
  bleederGeo.rotateZ(Math.PI / 2);
  const bleeder = new THREE.Mesh(bleederGeo, chromeMat);
  bleeder.position.set(xRight + 0.015, yTop - 0.06, zCenter - 0.004);
  radGroup.add(bleeder);

  return radGroup;
}

// --- EXTRUSIÓN VECTORIAL DE MUROS DE MAGICPLAN ---
function rebuildWalls() {
  while (wallsGroup.children.length > 0) {
    wallsGroup.remove(wallsGroup.children[0]);
  }

  const h = state.wallHeight;

  const wallMat = new THREE.MeshStandardMaterial({
    color: '#eef2f6',
    roughness: 0.85,
    metalness: 0.05
  });

  const wallTopMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    roughness: 0.5
  });

  magicPlanData.rooms.forEach((room) => {
    const shape = new THREE.Shape();
    room.pts.forEach((p, idx) => {
      if (idx === 0) shape.moveTo(p[0], -p[1]);
      else shape.lineTo(p[0], -p[1]);
    });
    shape.closePath();

    const extrudeSettings = { depth: h, bevelEnabled: false };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.rotateX(-Math.PI / 2);

    const mesh = new THREE.Mesh(geo, [wallMat, wallTopMat]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    wallsGroup.add(mesh);
  });

  if (magicPlanData.pilasters) {
    magicPlanData.pilasters.forEach((pts) => {
      const shape = new THREE.Shape();
      pts.forEach((p, idx) => {
        if (idx === 0) shape.moveTo(p[0], -p[1]);
        else shape.lineTo(p[0], -p[1]);
      });
      shape.closePath();

      const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      wallsGroup.add(mesh);
    });
  }

  // PARED DERECHA DEL SALÓN (Longitud total: 5.10m, de Z = -8.14m a Z = -3.05m)
  // Las puertas del balcón ocupan algo menos de media pared en el centro (de Z = -6.70m a Z = -4.50m)
  const zWallRear = -8.1444;
  const zDoorStart = -6.70;
  const zDoorEnd = -4.50;
  const zWallFront = -3.0456;

  // 1. Tramo de pared trasera derecha (Sólida blanca, junto al sofá y radiador)
  const lenRearWall = Math.abs(zDoorStart - zWallRear); // 1.44m
  const rearWallGeo = new THREE.BoxGeometry(0.14, h, lenRearWall);
  const rearWallMesh = new THREE.Mesh(rearWallGeo, [wallMat, wallTopMat]);
  rearWallMesh.position.set(4.94, h / 2, (zWallRear + zDoorStart) / 2);
  rearWallMesh.castShadow = true;
  rearWallMesh.receiveShadow = true;
  wallsGroup.add(rearWallMesh);

  // 2. Tramo de pared delantera derecha (Sólida blanca)
  const lenFrontWall = Math.abs(zWallFront - zDoorEnd); // 1.45m
  const frontWallGeo = new THREE.BoxGeometry(0.14, h, lenFrontWall);
  const frontWallMesh = new THREE.Mesh(frontWallGeo, [wallMat, wallTopMat]);
  frontWallMesh.position.set(4.94, h / 2, (zDoorEnd + zWallFront) / 2);
  frontWallMesh.castShadow = true;
  frontWallMesh.receiveShadow = true;
  wallsGroup.add(frontWallMesh);

  // 3. Puertas correderas del balcón en el centro (anchura: 2.20m)
  const doorWidth = Math.abs(zDoorEnd - zDoorStart); // 2.20m
  const zDoorCenter = (zDoorStart + zDoorEnd) / 2;    // -5.60m

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#93c5fd',
    transparent: true,
    opacity: 0.35,
    roughness: 0.1,
    transmission: 0.85,
    thickness: 0.05
  });
  const doorGlassGeo = new THREE.BoxGeometry(0.04, h * 0.92, doorWidth - 0.10);
  const doorGlass = new THREE.Mesh(doorGlassGeo, glassMat);
  doorGlass.position.set(4.94, (h * 0.92) / 2, zDoorCenter);
  wallsGroup.add(doorGlass);

  // Carpintería / marcos blancos de la puerta del balcón
  const frameMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.3 });
  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, doorWidth), frameMat);
  frameTop.position.set(4.94, h * 0.92, zDoorCenter);
  wallsGroup.add(frameTop);

  const framePost1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, h, 0.08), frameMat);
  framePost1.position.set(4.94, h / 2, zDoorStart + 0.04);
  wallsGroup.add(framePost1);

  const framePost2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, h, 0.08), frameMat);
  framePost2.position.set(4.94, h / 2, zDoorEnd - 0.04);
  wallsGroup.add(framePost2);

  const frameMullion = new THREE.Mesh(new THREE.BoxGeometry(0.08, h * 0.92, 0.06), frameMat);
  frameMullion.position.set(4.94, (h * 0.92) / 2, zDoorCenter);
  wallsGroup.add(frameMullion);

  // 4. Estor enrollable gris oscuro (ÚNICAMENTE en el hueco de las puertas del balcón)
  const blindMat = new THREE.MeshStandardMaterial({
    color: '#2e3036',
    roughness: 0.90,
    metalness: 0.02
  });
  const blindH = h * 0.58; // Estor recogido hasta media altura
  const blindGeo = new THREE.BoxGeometry(0.02, blindH, doorWidth - 0.04);
  const blindMesh = new THREE.Mesh(blindGeo, blindMat);
  blindMesh.position.set(4.90, h - blindH / 2, zDoorCenter);
  blindMesh.castShadow = true;
  blindMesh.receiveShadow = true;
  wallsGroup.add(blindMesh);

  // Barandilla del balcón en la terraza exterior
  const railMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.35, metalness: 0.8 });
  const railGeo = new THREE.BoxGeometry(0.06, 1.05, 5.60);
  const railMesh = new THREE.Mesh(railGeo, railMat);
  railMesh.position.set(6.75, 1.05 / 2, zDoorCenter);
  railMesh.castShadow = true;
  wallsGroup.add(railMesh);

  // RADIADOR BLANCO EN LA PARED DERECHA (instalado en el tramo de pared sólida junto al sofá)
  const radiatorGroup = new THREE.Group();
  radiatorGroup.name = 'Radiador Pared Derecha';
  const radMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35 });
  const radBaseGeo = new THREE.BoxGeometry(0.12, 0.65, 0.90);
  const radBase = new THREE.Mesh(radBaseGeo, radMat);
  radBase.position.set(4.88, 0.45, -7.10);
  radBase.castShadow = true;
  radiatorGroup.add(radBase);

  // Elementos/nervios verticales del radiador
  for (let r = 0; r < 8; r++) {
    const ribGeo = new THREE.BoxGeometry(0.02, 0.62, 0.08);
    const rib = new THREE.Mesh(ribGeo, radMat);
    rib.position.set(4.81, 0.45, -7.45 + r * 0.10);
    rib.castShadow = true;
    radiatorGroup.add(rib);
  }
  wallsGroup.add(radiatorGroup);

  // RADIADOR BLANCO EN LA PARED NORTE (Elementos planos, 80 cm ancho, sube a 90 cm, a 15 cm de la esquina)
  const northRadiator = buildNorthWallRadiator();
  wallsGroup.add(northRadiator);

  // Isla de cocina
  const targetK = magicPlanData.furniture_targets.kitchen_island;
  const islandGeo = new THREE.BoxGeometry(1.1, 0.9, 2.8);
  const islandMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2 });
  const islandMesh = new THREE.Mesh(islandGeo, islandMat);
  islandMesh.position.set(targetK.x, 0.45, targetK.z);
  islandMesh.castShadow = true;
  wallsGroup.add(islandMesh);

  const cooktopGeo = new THREE.BoxGeometry(0.6, 0.02, 0.85);
  const cooktopMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.1 });
  const cooktop = new THREE.Mesh(cooktopGeo, cooktopMat);
  cooktop.position.set(targetK.x, 0.91, targetK.z - 0.5);
  wallsGroup.add(cooktop);
}

// --- SOFÁ MODULAR EN U (Dimensiones exactas: 385 x 257 x 83 cm) ---
let sofaObject = null;
const sofaDefaultPos = new THREE.Vector3();
const sofaDefaultRot = new THREE.Euler();

function createFabricTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#3c4047';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let x = 0; x < canvas.width; x += 4) {
    for (let y = 0; y < canvas.height; y += 4) {
      const noise = Math.floor((Math.random() - 0.5) * 16);
      if ((x + y) % 8 === 0) {
        ctx.fillStyle = `rgb(${72 + noise}, ${76 + noise}, ${84 + noise})`;
        ctx.fillRect(x, y, 2, 2);
      } else {
        ctx.fillStyle = `rgb(${55 + noise}, ${58 + noise}, ${64 + noise})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  return texture;
}

const fabricTexture = createFabricTexture();

function buildModularSofa() {
  const sofa = new THREE.Group();
  sofa.name = 'Sofá Modular en U (385 x 257 x 83 cm)';

  // Material Antracita fiel a la foto (no negro puro, con relieve y volumen táctil)
  const matSofa = new THREE.MeshStandardMaterial({
    map: fabricTexture,
    color: '#494d56',
    roughness: 0.82,
    metalness: 0.04
  });

  const matCushion = new THREE.MeshStandardMaterial({
    map: fabricTexture,
    color: '#4f535d',
    roughness: 0.80,
    metalness: 0.03
  });

  const baseH = 0.22;
  const totalBackH = 0.83; // Altura completa del respaldo hasta el suelo (sin huecos ni partes flotantes)

  // Cotas de referencia del sofá:
  // Ancho total: 3.85m (de X = -1.925 a X = +1.925)
  // Trasera en Z = -1.285 (fijada para tocar en Z = -6.9565m en coordenadas del salón)
  const zRear = -2.57 / 2; // -1.285m
  const wTotal = 3.85;
  const xLeft = -wTotal / 2;  // -1.925m
  const xRight = wTotal / 2;  // +1.925m
  const backThick = 0.26;

  // 1. RESPALDO TRASERO CONTINUO Y SÓLIDO (3.85m de ancho, desde el suelo a 0.83m de altura)
  // Apoya completamente en el suelo y en la base, eliminando cualquier hueco o sensación de flotar
  const backGeo = new THREE.BoxGeometry(wTotal, totalBackH, backThick);
  const backMesh = new THREE.Mesh(backGeo, matSofa);
  backMesh.position.set(0, totalBackH / 2, zRear + backThick / 2);
  backMesh.castShadow = true;
  backMesh.receiveShadow = true;
  sofa.add(backMesh);

  // 2. ALA IZQUIERDA PROFUNDA CON RINCÓN EN L (Fondo total: 2.57m hasta Z = +1.285m)
  const leftWingW = 1.05;
  const leftWingD = 2.57;
  const baseLeftGeo = new THREE.BoxGeometry(leftWingW, baseH, leftWingD);
  const baseLeftMesh = new THREE.Mesh(baseLeftGeo, matSofa);
  baseLeftMesh.position.set(xLeft + leftWingW / 2, baseH / 2, zRear + leftWingD / 2);
  baseLeftMesh.castShadow = true;
  baseLeftMesh.receiveShadow = true;
  sofa.add(baseLeftMesh);

  // Respaldo lateral izquierdo continuo apoyado en suelo/base
  const backLeftD = 1.62;
  const backLeftGeo = new THREE.BoxGeometry(backThick, totalBackH, backLeftD);
  const backLeftMesh = new THREE.Mesh(backLeftGeo, matSofa);
  backLeftMesh.position.set(xLeft + backThick / 2, totalBackH / 2, zRear + backLeftD / 2);
  backLeftMesh.castShadow = true;
  backLeftMesh.receiveShadow = true;
  sofa.add(backLeftMesh);

  // Reposabrazos izquierdo frontal (bajo, 58 cm, apoyado desde el suelo)
  const armLeftD = leftWingD - backLeftD; // 0.95m
  const armLeftH = 0.58;
  const armLeftGeo = new THREE.BoxGeometry(backThick, armLeftH, armLeftD);
  const armLeftMesh = new THREE.Mesh(armLeftGeo, matSofa);
  armLeftMesh.position.set(xLeft + backThick / 2, armLeftH / 2, zRear + backLeftD + armLeftD / 2);
  armLeftMesh.castShadow = true;
  armLeftMesh.receiveShadow = true;
  sofa.add(armLeftMesh);

  // Cojines de asiento del ala izquierda (apoyados directamente sobre la base a baseH)
  const seatL1 = new THREE.Mesh(new THREE.BoxGeometry(leftWingW - backThick - 0.03, 0.16, 0.88), matCushion);
  seatL1.position.set(xLeft + backThick + (leftWingW - backThick) / 2, baseH + 0.08, zRear + leftWingD - 0.46);
  seatL1.castShadow = true;
  sofa.add(seatL1);

  const seatL2 = new THREE.Mesh(new THREE.BoxGeometry(leftWingW - backThick - 0.03, 0.16, 0.82), matCushion);
  seatL2.position.set(xLeft + backThick + (leftWingW - backThick) / 2, baseH + 0.08, zRear + leftWingD - 0.46 - 0.85);
  seatL2.castShadow = true;
  sofa.add(seatL2);

  // 2 cojines de respaldo para el flanco izquierdo (descansan sobre los cojines de asiento a Y = 0.38)
  const cushionBackH = 0.44;
  const cushionCenterY = 0.36 + cushionBackH / 2; // Y = 0.58 (apoya en 0.36m, embebido 2cm en el asiento)
  for (let i = 0; i < 2; i++) {
    const bcLeft = new THREE.Mesh(new THREE.BoxGeometry(0.16, cushionBackH, 0.72), matCushion);
    bcLeft.position.set(xLeft + backThick + 0.09, cushionCenterY, zRear + 0.52 + i * 0.76);
    bcLeft.rotation.z = -0.06;
    bcLeft.castShadow = true;
    sofa.add(bcLeft);
  }

  // 3. CUERPO CENTRAL (Asientos centrales)
  const centerW = wTotal - leftWingW - 1.05; // 1.75m entre el ala izquierda y la chaise longue
  const centerD = 1.05;
  const xCenter = xLeft + leftWingW + centerW / 2;
  const baseCenterGeo = new THREE.BoxGeometry(centerW, baseH, centerD);
  const baseCenterMesh = new THREE.Mesh(baseCenterGeo, matSofa);
  baseCenterMesh.position.set(xCenter, baseH / 2, zRear + centerD / 2);
  baseCenterMesh.castShadow = true;
  baseCenterMesh.receiveShadow = true;
  sofa.add(baseCenterMesh);

  // 2 cojines centrales de asiento
  const cWidth = (centerW - 0.04) / 2;
  for (let i = 0; i < 2; i++) {
    const cMesh = new THREE.Mesh(new THREE.BoxGeometry(cWidth, 0.16, centerD - backThick - 0.04), matCushion);
    cMesh.position.set(xLeft + leftWingW + cWidth / 2 + i * (cWidth + 0.04), baseH + 0.08, zRear + backThick + (centerD - backThick) / 2);
    cMesh.castShadow = true;
    sofa.add(cMesh);

    // Cojines de respaldo traseros (apoyan sobre el asiento y contra el respaldo sólido)
    const bcMesh = new THREE.Mesh(new THREE.BoxGeometry(cWidth - 0.02, cushionBackH, 0.16), matCushion);
    bcMesh.position.set(xLeft + leftWingW + cWidth / 2 + i * (cWidth + 0.04), cushionCenterY, zRear + backThick + 0.09);
    bcMesh.rotation.x = 0.07;
    bcMesh.castShadow = true;
    sofa.add(bcMesh);
  }

  // Cojín de rincón en la esquina izquierda trasera
  const cornerBc = new THREE.Mesh(new THREE.BoxGeometry(0.72, cushionBackH, 0.16), matCushion);
  cornerBc.position.set(xLeft + leftWingW / 2 + 0.12, cushionCenterY, zRear + backThick + 0.09);
  cornerBc.rotation.x = 0.07;
  cornerBc.castShadow = true;
  sofa.add(cornerBc);

  // 4. CHAISE LONGUE DERECHA MÁS CORTA (Fondo total: 1.65m en lugar de 2.57m, exactamente como en la foto)
  const chaiseW = 1.05;
  const chaiseD = 1.65;
  const xChaise = xRight - chaiseW / 2;
  const zChaiseCenter = zRear + chaiseD / 2;

  // Base de la chaise longue
  const baseChaiseGeo = new THREE.BoxGeometry(chaiseW, baseH, chaiseD);
  const baseChaiseMesh = new THREE.Mesh(baseChaiseGeo, matSofa);
  baseChaiseMesh.position.set(xChaise, baseH / 2, zChaiseCenter);
  baseChaiseMesh.castShadow = true;
  baseChaiseMesh.receiveShadow = true;
  sofa.add(baseChaiseMesh);

  // Cojín largo acolchado corrido de la chaise longue
  const chaiseCushionW = chaiseW - backThick - 0.03;
  const chaiseCushionD = chaiseD - backThick - 0.04;
  const chaiseCushionGeo = new THREE.BoxGeometry(chaiseCushionW, 0.16, chaiseCushionD);
  const chaiseCushion = new THREE.Mesh(chaiseCushionGeo, matCushion);
  chaiseCushion.position.set(xRight - backThick - chaiseCushionW / 2, baseH + 0.08, zRear + backThick + chaiseCushionD / 2);
  chaiseCushion.castShadow = true;
  sofa.add(chaiseCushion);

  // Reposabrazos derecho (en el lateral exterior de la chaise longue, altura 58 cm, apoyado en el suelo)
  const armRightD = 1.10;
  const armRightGeo = new THREE.BoxGeometry(backThick, armLeftH, armRightD);
  const armRightMesh = new THREE.Mesh(armRightGeo, matSofa);
  armRightMesh.position.set(xRight - backThick / 2, armLeftH / 2, zRear + chaiseD - armRightD / 2);
  armRightMesh.castShadow = true;
  armRightMesh.receiveShadow = true;
  sofa.add(armRightMesh);

  // Respaldo acolchado de la chaise longue (apoyado en el cojín y respaldo trasero)
  const chaiseBc = new THREE.Mesh(new THREE.BoxGeometry(chaiseCushionW, cushionBackH, 0.16), matCushion);
  chaiseBc.position.set(xRight - backThick - chaiseCushionW / 2, cushionCenterY, zRear + backThick + 0.09);
  chaiseBc.rotation.x = 0.07;
  chaiseBc.castShadow = true;
  sofa.add(chaiseBc);

  // UBICACIÓN REAL DEL SOFÁ:
  // 1. Separado de la pared de la derecha (deja 38 cm libres para el radiador)
  // 2. Apoyado en la esquina que sobresale de la columna (Point 5: X = 0.7157, Z = -6.9565)
  const sofaPosX = 2.64;
  const sofaPosZ = -6.9565 + 2.57 / 2; // -5.6715m (trasera en Z = -6.9565m)
  sofa.position.set(sofaPosX, 0, sofaPosZ);
  sofa.rotation.y = 0;

  sofaDefaultPos.copy(sofa.position);
  sofaDefaultRot.copy(sofa.rotation);

  furnitureGroup.add(sofa);
  selectableObjects.push(sofa);
  sofaObject = sofa;

  createCotas(sofa);
}

function createCotas(targetGroup) {
  while (cotasGroup.children.length > 0) {
    cotasGroup.remove(cotasGroup.children[0]);
  }

  const lineMat = new THREE.LineBasicMaterial({ color: '#38bdf8', linewidth: 2 });
  const zRear = -2.57 / 2;

  // Cota Ancho Frontal (385 cm)
  const cotaW = [
    new THREE.Vector3(-3.85 / 2, 0.05, 2.57 / 2 + 0.3),
    new THREE.Vector3(3.85 / 2, 0.05, 2.57 / 2 + 0.3)
  ];
  targetGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(cotaW), lineMat));

  // Cota Fondo Ala Izquierda (257 cm)
  const cotaDLeft = [
    new THREE.Vector3(-3.85 / 2 - 0.3, 0.05, zRear),
    new THREE.Vector3(-3.85 / 2 - 0.3, 0.05, zRear + 2.57)
  ];
  targetGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(cotaDLeft), lineMat));

  // Cota Fondo Chaise Longue Derecha (165 cm)
  const cotaDRight = [
    new THREE.Vector3(3.85 / 2 + 0.3, 0.05, zRear),
    new THREE.Vector3(3.85 / 2 + 0.3, 0.05, zRear + 1.65)
  ];
  targetGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(cotaDRight), lineMat));

  const spriteW = createTextSprite('Ancho: 385 cm');
  spriteW.position.set(0, 0.35, 2.57 / 2 + 0.45);
  targetGroup.add(spriteW);

  const spriteDLeft = createTextSprite('Ala Izq: 257 cm');
  spriteDLeft.position.set(-3.85 / 2 - 0.55, 0.35, 0);
  targetGroup.add(spriteDLeft);

  const spriteDRight = createTextSprite('Chaise: 165 cm');
  spriteDRight.position.set(3.85 / 2 + 0.55, 0.35, zRear + 1.65 / 2);
  targetGroup.add(spriteDRight);

  const spriteH = createTextSprite('Alto: 83 cm');
  spriteH.position.set(-3.85 / 2 - 0.55, 0.83, zRear);
  targetGroup.add(spriteH);
}

function createTextSprite(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.roundRect(4, 4, 248, 72, 14);
  ctx.fill();

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.roundRect(4, 4, 248, 72, 14);
  ctx.stroke();

  ctx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 40);

  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
  sprite.scale.set(1.2, 0.38, 1);
  return sprite;
}

// --- MUEBLE A MEDIDA TRAS EL SOFÁ: CAJÓN DE ESCAYOLA + TABLERO DE MADERA ---
let shelfMesh = null;
const shelfFinishes = {
  cerezo: { name: 'Cerezo', colorHex: '#c06c3e', tint: '#cc794a', roughness: 0.46 },
  caramel: { name: 'Pino Caramelo', colorHex: '#ad7d48', tint: '#b8864e', roughness: 0.52 },
  naturale: { name: 'Roble Natural', colorHex: '#b58d60', tint: '#c49a6c', roughness: 0.55 },
  tabacco: { name: 'Tabacco', colorHex: '#6a4c35', tint: '#78573d', roughness: 0.58 }
};

function buildSofaCustomLedge() {
  while (cajonGroup.children.length > 0) {
    cajonGroup.remove(cajonGroup.children[0]);
  }

  // GEOMETRÍA EXACTA SOLICITADA:
  // 1. El sofá apoya en la esquina que sobresale de la columna (Point 5: X = 0.7157, Z = -6.9565).
  // 2. El sofá está separado de la pared derecha por el radiador.
  // 3. La madera y el cajón AUMENTAN para cubrir todo el hueco desde la esquina saliente (Point 5).
  // 4. Se cierra contra la pared diagonal trasera sin dejar hueco.
  // 5. La madera corona a 0.865m (3.5 cm MÁS ALTA QUE EL SOFÁ).

  const pColSaliente = [0.7157, -6.9565]; // Esquina de la columna que sobresale y que toca el sofá
  const pRightFront   = [4.9400, -6.9565]; // Línea delantera extendida hasta la pared derecha del radiador
  const pRightRear    = [4.9400, -8.3056]; // Esquina trasera derecha (intersección pared diagonal y ventanal)
  const pColRear      = [1.0704, -7.3192]; // Esquina interior donde la pared diagonal se encuentra con la columna
  const pColSide      = [1.1114, -7.0699]; // Arista lateral de la columna

  // Polígono que abraza la columna hasta la esquina que sobresale:
  const ledgePts = [
    pColSaliente,
    pRightFront,
    pRightRear,
    pColRear,
    pColSide
  ];

  const ledgeH = 0.825; // Base de escayola
  const woodThick = 0.04; // Tablero de madera de 4 cm

  // 1. BASE: CAJÓN DE ESCAYOLA / PLADUR
  const plasterMat = new THREE.MeshStandardMaterial({
    color: '#f0f3f6',
    roughness: 0.92,
    metalness: 0.02
  });

  const baseShape = new THREE.Shape();
  ledgePts.forEach((p, i) => {
    if (i === 0) baseShape.moveTo(p[0], -p[1]);
    else baseShape.lineTo(p[0], -p[1]);
  });
  baseShape.closePath();

  const baseGeo = new THREE.ExtrudeGeometry(baseShape, { depth: ledgeH, bevelEnabled: false });
  baseGeo.rotateX(-Math.PI / 2);
  const baseMesh = new THREE.Mesh(baseGeo, plasterMat);
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  cajonGroup.add(baseMesh);

  // 2. ENCIMERA: TABLERO DE MADERA MACIZA (AUMENTADO PARA CUBRIR EL HUECO Y MÁS ALTO QUE EL SOFÁ)
  const shelfShape = new THREE.Shape();
  const shelfPts = [
    [pColSaliente[0] - 0.005, -pColSaliente[1]],
    [pRightFront[0] + 0.005, -pRightFront[1]],
    [pRightRear[0] + 0.005, -pRightRear[1] + 0.005],
    [pColRear[0] - 0.005, -pColRear[1] + 0.005],
    [pColSide[0], -pColSide[1]]
  ];
  shelfPts.forEach((p, i) => {
    if (i === 0) shelfShape.moveTo(p[0], p[1]);
    else shelfShape.lineTo(p[0], p[1]);
  });
  shelfShape.closePath();

  const shelfGeo = new THREE.ExtrudeGeometry(shelfShape, {
    depth: woodThick,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.003,
    bevelSegments: 2
  });
  shelfGeo.rotateX(-Math.PI / 2);

  const cfg = shelfFinishes[state.shelfFinish];
  const woodTex = createWoodTexture(cfg.colorHex);
  const woodMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: cfg.tint,
    roughness: cfg.roughness,
    metalness: 0.05
  });

  shelfMesh = new THREE.Mesh(shelfGeo, woodMat);
  shelfMesh.position.y = ledgeH;
  shelfMesh.castShadow = true;
  shelfMesh.receiveShadow = true;
  cajonGroup.add(shelfMesh);

  // 3. ELEMENTOS DECORATIVOS SOBRE EL TABLERO (a 0.865m de altura)
  const finalShelfTop = ledgeH + woodThick;
  buildShelfDecorations(finalShelfTop);

  // 4. Luz LED indirecta
  ledLight.position.set(2.8, finalShelfTop + 0.08, -7.55);
  ledLight.visible = state.ledLightOn;
  cajonGroup.add(ledLight);
}

function buildShelfDecorations(shelfY) {
  // A. Jarrón cerámico nórdico (esquina derecha)
  const vaseMat = new THREE.MeshStandardMaterial({ color: '#f5f5f4', roughness: 0.35 });
  const vasePoints = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const radius = 0.08 + Math.sin(t * Math.PI) * 0.05 - (t > 0.7 ? 0.03 : 0);
    vasePoints.push(new THREE.Vector2(radius, t * 0.32));
  }
  const vaseGeo = new THREE.LatheGeometry(vasePoints, 24);
  const vase = new THREE.Mesh(vaseGeo, vaseMat);
  vase.position.set(4.35, shelfY, -7.55);
  vase.castShadow = true;
  cajonGroup.add(vase);

  // Ramas secas
  const twigMat = new THREE.MeshStandardMaterial({ color: '#78573d', roughness: 0.9 });
  for (let r = 0; r < 4; r++) {
    const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.45), twigMat);
    twig.position.set(4.35 + (r - 1.5) * 0.025, shelfY + 0.30, -7.55 + (r % 2 ? 0.02 : -0.02));
    twig.rotation.set((r - 2) * 0.12, 0, (r - 1.5) * 0.18);
    twig.castShadow = true;
    cajonGroup.add(twig);
  }

  // B. Pila de libros de arquitectura
  const bookColors = ['#1e293b', '#e2e8f0', '#94a3b8'];
  for (let b = 0; b < 3; b++) {
    const bookGeo = new THREE.BoxGeometry(0.24, 0.03, 0.32);
    const bookMat = new THREE.MeshStandardMaterial({ color: bookColors[b], roughness: 0.6 });
    const book = new THREE.Mesh(bookGeo, bookMat);
    book.position.set(2.6, shelfY + b * 0.032 + 0.015, -7.35);
    book.rotation.y = (b - 1) * 0.12;
    book.castShadow = true;
    cajonGroup.add(book);
  }

  // C. Bol decorativo de diseño
  const bowlGeo = new THREE.SphereGeometry(0.10, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const bowlMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.4, metalness: 0.6 });
  const bowl = new THREE.Mesh(bowlGeo, bowlMat);
  bowl.position.set(1.4, shelfY, -7.15);
  bowl.rotation.x = Math.PI;
  bowl.castShadow = true;
  cajonGroup.add(bowl);
}

function setShelfFinish(finishKey) {
  state.shelfFinish = finishKey;
  saveUserPreferences();
  const cfg = shelfFinishes[finishKey];
  if (shelfMesh && cfg) {
    const newTex = createWoodTexture(cfg.colorHex);
    shelfMesh.material.map = newTex;
    shelfMesh.material.color.set(cfg.tint);
    shelfMesh.material.roughness = cfg.roughness;
    shelfMesh.material.needsUpdate = true;
  }
}

// --- MESA DEVINA NAIS: PIANO MASTER ---
let tableGroup = null;
let currentLegsGroup = null;
let tableTopMesh = null;
const tableDefaultPos = new THREE.Vector3();
const tableDefaultRot = new THREE.Euler();

const finishes = {
  caramel: { name: 'Nat. Caramel', colorHex: '#ad7d48', tint: '#b8864e', roughness: 0.52 },
  tabacco: { name: 'Tabacco', colorHex: '#684d38', tint: '#73563f', roughness: 0.56 },
  cenere: { name: 'Cenere', colorHex: '#524f4b', tint: '#5c5853', roughness: 0.60 },
  desertnut: { name: 'Desert Nut', colorHex: '#5e4839', tint: '#695140', roughness: 0.54 },
  carbone: { name: 'Carbone', colorHex: '#252628', tint: '#2e3033', roughness: 0.65 },
  holandnat: { name: 'Holand Nat.', colorHex: '#8b6e47', tint: '#94754d', roughness: 0.62 }
};

const legFinishes = {
  antracite: { name: 'Antracite', color: '#525660', roughness: 0.38, metalness: 0.35 },
  ironblack: { name: 'Iron Black / Old', color: '#202124', roughness: 0.45, metalness: 0.20 },
  bronze: { name: 'Bronze', color: '#a2764c', roughness: 0.28, metalness: 0.45 },
  arkansas: { name: 'Arkansas', color: '#6d717c', roughness: 0.48, metalness: 0.30 },
  cobre: { name: 'Cobre / Rame', color: '#b36746', roughness: 0.30, metalness: 0.70 }
};

function createWoodTexture(colorHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Fondo base con tono roble
  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Veteado fluido de roble macizo
  for (let i = 0; i < 45; i++) {
    const y = Math.random() * canvas.height;
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(50, 32, 16, 0.12)' : 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1.5 + Math.random() * 4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(
      canvas.width * 0.33, y + (Math.random() - 0.5) * 30,
      canvas.width * 0.66, y + (Math.random() - 0.5) * 30,
      canvas.width, y + (Math.random() - 0.5) * 15
    );
    ctx.stroke();
  }

  // Porosidad abierta típica del roble (microtrazos discontinuos de poro)
  ctx.fillStyle = 'rgba(40, 26, 14, 0.24)';
  for (let p = 0; p < 600; p++) {
    const px = Math.random() * canvas.width;
    const py = Math.random() * canvas.height;
    const pLen = 6 + Math.random() * 14;
    ctx.fillRect(px, py, pLen, 1.2);
  }

  // Pequeñas grietas y fendas superficiales naturales de la madera maciza
  const cracks = [
    { x: 190, y: 130, len: 130, angle: 0.05 },
    { x: 360, y: 390, len: 85,  angle: -0.04 },
    { x: 610, y: 210, len: 160, angle: 0.03 },
    { x: 820, y: 140, len: 105, angle: -0.05 },
    { x: 440, y: 75,  len: 70,  angle: 0.07 },
    { x: 730, y: 420, len: 120, angle: -0.02 }
  ];

  cracks.forEach(c => {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.angle);
    // Grieta negra principal
    ctx.strokeStyle = 'rgba(20, 12, 8, 0.82)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-c.len / 2, 0);
    ctx.lineTo(-c.len * 0.1, (Math.random() - 0.5) * 2);
    ctx.lineTo(c.len * 0.2, (Math.random() - 0.5) * 2);
    ctx.lineTo(c.len / 2, 0);
    ctx.stroke();

    // Pequeñas ramificaciones de tensión de la madera
    for (let r = 0; r < 3; r++) {
      const rx = (Math.random() - 0.5) * (c.len * 0.7);
      const rlen = 2.5 + Math.random() * 4.5;
      ctx.beginPath();
      ctx.moveTo(rx, 0);
      ctx.lineTo(rx + (Math.random() - 0.5) * 2, (Math.random() > 0.5 ? 1 : -1) * rlen);
      ctx.stroke();
    }
    ctx.restore();
  });

  // Nudos naturales con hendidura negra (como en la foto de la tabla)
  const knots = [
    { x: 270, y: 250, r: 13 },
    { x: 690, y: 320, r: 16 }
  ];

  knots.forEach(k => {
    ctx.save();
    ctx.translate(k.x, k.y);

    for (let ring = k.r; ring > 4; ring -= 3) {
      ctx.strokeStyle = 'rgba(45, 28, 14, 0.38)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, ring * 1.5, ring * 0.85, 0.18, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(18, 10, 6, 0.90)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.5, 2.2, 0.22, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(18, 10, 6, 0.85)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(3, 1);
    ctx.lineTo(24, 3.5);
    ctx.stroke();

    ctx.restore();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1);
  return texture;
}

function createBlackMarbleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Fondo base negro profundo Nero Marquina
  ctx.fillStyle = '#111215';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Manchas tonales suaves minerales
  for (let c = 0; c < 20; c++) {
    const cx = Math.random() * canvas.width;
    const cy = Math.random() * canvas.height;
    const rad = 60 + Math.random() * 120;
    const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, rad);
    grad.addColorStop(0, 'rgba(32, 34, 38, 0.45)');
    grad.addColorStop(1, 'rgba(17, 18, 21, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Vetas finas blancas y calcitas (características del mármol Nero Marquina)
  const mainVeins = [
    { startX: 40, startY: 30, endX: 520, endY: 480, cp1x: 180, cp1y: 220, cp2x: 380, cp2y: 290, w: 2.2 },
    { startX: 340, startY: 20, endX: 980, endY: 440, cp1x: 520, cp1y: 160, cp2x: 760, cp2y: 360, w: 2.8 },
    { startX: 620, startY: 40, endX: 1010, endY: 220, cp1x: 750, cp1y: 80, cp2x: 910, cp2y: 170, w: 1.6 },
    { startX: 120, startY: 460, endX: 460, endY: 240, cp1x: 220, cp1y: 380, cp2x: 330, cp2y: 310, w: 1.5 }
  ];

  mainVeins.forEach(v => {
    // Velo suave exterior
    ctx.strokeStyle = 'rgba(235, 240, 245, 0.22)';
    ctx.lineWidth = v.w * 3.2;
    ctx.beginPath();
    ctx.moveTo(v.startX, v.startY);
    ctx.bezierCurveTo(v.cp1x, v.cp1y, v.cp2x, v.cp2y, v.endX, v.endY);
    ctx.stroke();

    // Veta blanca nítida
    ctx.strokeStyle = 'rgba(250, 252, 255, 0.85)';
    ctx.lineWidth = v.w;
    ctx.beginPath();
    ctx.moveTo(v.startX, v.startY);
    ctx.bezierCurveTo(v.cp1x, v.cp1y, v.cp2x, v.cp2y, v.endX, v.endY);
    ctx.stroke();

    // Pequeñas ramificaciones secundarias
    for (let t = 0; t < 3; t++) {
      const tPos = 0.25 + t * 0.25;
      const tx = v.startX + (v.endX - v.startX) * tPos + (Math.random() - 0.5) * 40;
      const ty = v.startY + (v.endY - v.startY) * tPos + (Math.random() - 0.5) * 40;
      ctx.strokeStyle = 'rgba(240, 245, 250, 0.45)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + (Math.random() - 0.5) * 60, ty + (Math.random() - 0.5) * 50);
      ctx.stroke();
    }
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function buildTableDevinaNais() {
  tableGroup = new THREE.Group();
  tableGroup.name = 'Mesa Devina Nais - Piano Master (200 x 100 cm)';

  // Dimensiones exactas solicitadas por el usuario: 200 x 100 cm
  const tableLength = 2.00;
  const tableWidth = 1.00;
  const tableThick = 0.069;
  const tableHeight = 0.76;

  const shape = new THREE.Shape();
  shape.moveTo(-tableLength / 2, -tableWidth / 2);
  
  const steps = 20;
  for (let i = 1; i <= steps; i++) {
    const x = -tableLength / 2 + (tableLength / steps) * i;
    const y = -tableWidth / 2 + Math.sin(i * 0.85) * 0.018;
    shape.lineTo(x, y);
  }
  shape.lineTo(tableLength / 2, tableWidth / 2);

  for (let i = steps - 1; i >= 0; i--) {
    const x = -tableLength / 2 + (tableLength / steps) * i;
    const y = tableWidth / 2 + Math.sin(i * 1.1 + 1.2) * 0.020;
    shape.lineTo(x, y);
  }
  shape.closePath();

  const extrudeSettings = {
    steps: 1,
    depth: tableThick,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 4
  };

  const topGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  topGeo.rotateX(-Math.PI / 2);

  const topTex = createWoodTexture(finishes[state.tableFinish].colorHex);
  const topMat = new THREE.MeshStandardMaterial({
    map: topTex,
    color: finishes[state.tableFinish].tint,
    roughness: finishes[state.tableFinish].roughness,
    metalness: 0.05
  });

  tableTopMesh = new THREE.Mesh(topGeo, topMat);
  tableTopMesh.position.y = tableHeight - tableThick;
  tableTopMesh.castShadow = true;
  tableTopMesh.receiveShadow = true;
  tableGroup.add(tableTopMesh);

  // Cotas 3D sobre la mesa (200 x 100 cm)
  const lineMat = new THREE.LineBasicMaterial({ color: '#f59e0b', linewidth: 2 });
  const cotaTableW = [
    new THREE.Vector3(-tableLength / 2, tableHeight + 0.02, tableWidth / 2 + 0.18),
    new THREE.Vector3(tableLength / 2, tableHeight + 0.02, tableWidth / 2 + 0.18)
  ];
  tableGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(cotaTableW), lineMat));

  const cotaTableD = [
    new THREE.Vector3(tableLength / 2 + 0.18, tableHeight + 0.02, -tableWidth / 2),
    new THREE.Vector3(tableLength / 2 + 0.18, tableHeight + 0.02, tableWidth / 2)
  ];
  tableGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(cotaTableD), lineMat));

  const spriteTW = createTextSprite('200 cm');
  spriteTW.position.set(0, tableHeight + 0.22, tableWidth / 2 + 0.32);
  tableGroup.add(spriteTW);

  const spriteTD = createTextSprite('100 cm');
  spriteTD.position.set(tableLength / 2 + 0.35, tableHeight + 0.22, 0);
  tableGroup.add(spriteTD);

  // Patas
  currentLegsGroup = new THREE.Group();
  tableGroup.add(currentLegsGroup);
  renderTableLegs(state.tableLegs);

  // 6 Sillas
  buildDiningChairs(tableGroup);

  const target = magicPlanData.furniture_targets.table;
  tableGroup.position.set(target.x, 0, target.z);
  tableGroup.rotation.y = target.rotY;

  tableDefaultPos.copy(tableGroup.position);
  tableDefaultRot.copy(tableGroup.rotation);

  furnitureGroup.add(tableGroup);
  selectableObjects.push(tableGroup);
}

function renderTableLegs(type) {
  while (currentLegsGroup.children.length > 0) {
    currentLegsGroup.remove(currentLegsGroup.children[0]);
  }

  const legCfg = legFinishes[state.tableLegFinish] || legFinishes.antracite;
  const ironMat = new THREE.MeshStandardMaterial({
    color: legCfg.color,
    roughness: legCfg.roughness,
    metalness: legCfg.metalness
  });

  const legH = 0.76 - 0.069;

  if (type === 'star') {
    const starBase = new THREE.Group();
    const beamGeo = new THREE.BoxGeometry(0.09, legH * 1.15, 0.07);

    const angles = [
      { rx: 0.28, rz: 0.52, px: 0.42, pz: 0.24 },
      { rx: -0.28, rz: 0.52, px: 0.42, pz: -0.24 },
      { rx: 0.28, rz: -0.52, px: -0.42, pz: 0.24 },
      { rx: -0.28, rz: -0.52, px: -0.42, pz: -0.24 }
    ];

    angles.forEach(({ rx, rz, px, pz }) => {
      const legMesh = new THREE.Mesh(beamGeo, ironMat);
      legMesh.position.set(px, legH / 2, pz);
      legMesh.rotation.set(rx, 0, rz);
      legMesh.castShadow = true;
      starBase.add(legMesh);
    });

    const joint = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.15, 0.32), ironMat);
    joint.position.set(0, legH / 2, 0);
    joint.castShadow = true;
    starBase.add(joint);

    currentLegsGroup.add(starBase);
  } else {
    const waveBase = new THREE.Group();

    [-0.52, 0.52].forEach((xPos) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, -0.32),
        new THREE.Vector3(0.08, legH * 0.33, -0.15),
        new THREE.Vector3(-0.08, legH * 0.66, 0.15),
        new THREE.Vector3(0, legH, 0.32)
      ]);

      const waveGeo = new THREE.TubeGeometry(curve, 32, 0.045, 12, false);
      const waveMesh1 = new THREE.Mesh(waveGeo, ironMat);
      waveMesh1.position.x = xPos;
      waveMesh1.castShadow = true;
      waveBase.add(waveMesh1);

      const waveMesh2 = waveMesh1.clone();
      waveMesh2.rotation.y = Math.PI;
      waveMesh2.position.set(xPos, 0, 0);
      waveBase.add(waveMesh2);

      const topPlate = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 0.7), ironMat);
      topPlate.position.set(xPos, legH - 0.01, 0);
      topPlate.castShadow = true;
      waveBase.add(topPlate);
    });

    currentLegsGroup.add(waveBase);
  }
}

const chairFinishes = {
  browngrey: { name: 'Brown Grey (Visón / Topo)', color: '#564f4a', roughness: 0.70, metalness: 0.05 },
  camel: { name: 'Camel (Tostado cálido)', color: '#9c6d48', roughness: 0.65, metalness: 0.05 }
};
let diningChairsMat = null;

function buildDiningChairs(targetGroup) {
  // Sillas Devina Nais - Modelo James Roll (Poltroncina con base giratoria de 4 radios)
  const chairCfg = chairFinishes[state.chairFinish] || chairFinishes.browngrey;
  diningChairsMat = new THREE.MeshStandardMaterial({
    color: chairCfg.color,
    roughness: chairCfg.roughness,
    metalness: chairCfg.metalness
  });
  const chairLegMat = new THREE.MeshStandardMaterial({ color: '#1a1c20', roughness: 0.45, metalness: 0.5 });

  const chairPositions = [
    [-0.55, -0.62, 0],
    [0, -0.62, 0],
    [0.55, -0.62, 0],
    [-0.55, 0.62, Math.PI],
    [0, 0.62, Math.PI],
    [0.55, 0.62, Math.PI]
  ];

  chairPositions.forEach(([x, z, rot]) => {
    const chair = new THREE.Group();

    // Asiento acolchado tipo butaca
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.48), diningChairsMat);
    seat.position.y = 0.46;
    seat.castShadow = true;
    chair.add(seat);

    // Respaldo curvado envolvente
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.40, 0.07), diningChairsMat);
    back.position.set(0, 0.67, -0.21);
    back.rotation.x = -0.08;
    back.castShadow = true;
    chair.add(back);

    // Brazos envolventes integrados que descienden hacia adelante
    [-0.24, 0.24].forEach(ax => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.38), diningChairsMat);
      arm.position.set(ax, 0.56, -0.05);
      arm.rotation.x = -0.12;
      arm.castShadow = true;
      chair.add(arm);
    });

    // Base giratoria James Roll (eje central + 4 radios en estrella a ras de suelo)
    const centralPost = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.22), chairLegMat);
    centralPost.position.y = 0.31;
    centralPost.castShadow = true;
    chair.add(centralPost);

    // 4 radios de la estrella
    const spokeAngles = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];
    spokeAngles.forEach(ang => {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.02, 0.26), chairLegMat);
      spoke.position.set(Math.sin(ang) * 0.13, 0.08, Math.cos(ang) * 0.13);
      spoke.rotation.y = ang;
      spoke.rotation.x = 0.18;
      spoke.castShadow = true;
      chair.add(spoke);
    });

    chair.position.set(x, 0, z);
    chair.rotation.y = rot;
    targetGroup.add(chair);
  });
}

function setChairFinish(finishKey) {
  state.chairFinish = finishKey;
  saveUserPreferences();
  const cfg = chairFinishes[finishKey];
  if (diningChairsMat && cfg) {
    diningChairsMat.color.set(cfg.color);
    diningChairsMat.roughness = cfg.roughness;
    diningChairsMat.metalness = cfg.metalness;
    diningChairsMat.needsUpdate = true;
  }
}

// --- MUEBLE DE TELEVISIÓN Y LIBRERÍA (CEREZO CÁLIDO) ---
// Dimensiones: ancho 325 cm (145 cm columna alta + 180 cm mueble bajo), alto 218 cm, fondo 48/40 cm
// Orientación corregida: La columna alta (librería y armarios) a la IZQUIERDA (cerca de la columna/paso),
// y el mueble bajo con la TV de 50" a la DERECHA.
// Ubicación: apoyado en la pared frontal (Z = -3.0456m) mirando hacia el salón (-Z).
let tvUnitGroup = null;
const tvUnitDefaultPos = new THREE.Vector3();
const tvUnitDefaultRot = new THREE.Euler();

function buildTvLivingUnit() {
  tvUnitGroup = new THREE.Group();
  tvUnitGroup.name = 'Mueble TV y Librería (Cerezo - 325 x 218 cm)';

  // Material cerezo cálido idéntico a las fotos
  const cherryTex = createWoodTexture('#a2552e');
  const cherryMat = new THREE.MeshStandardMaterial({
    map: cherryTex,
    color: '#a85b34',
    roughness: 0.48,
    metalness: 0.03
  });

  const metalHandleMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    roughness: 0.3,
    metalness: 0.85
  });

  // 1. COLUMNA ALTA A LA IZQUIERDA (Librería + Armarios: 145 cm ancho, 218 cm alto, 40 cm fondo)
  // En coordenadas locales: de X = -1.625 a X = -0.175 (ancho 1.45m). Fondo de Z = 0 a Z = -0.40m
  const highH = 2.18; // Alto real (techo a 2.47m)
  const highD = 0.40;

  // A. Estantería Abierta para Libros (45 cm ancho): de X = -1.625 a X = -1.175
  const bookColW = 0.45;
  const bookColX = -1.625 + bookColW / 2;
  const bookCaseGeo = new THREE.BoxGeometry(bookColW, highH, highD);
  const bookCase = new THREE.Mesh(bookCaseGeo, cherryMat);
  bookCase.position.set(bookColX, highH / 2, -highD / 2);
  bookCase.castShadow = true;
  bookCase.receiveShadow = true;
  tvUnitGroup.add(bookCase);

  const numShelves = 6;
  const shelfSpacing = highH / (numShelves + 1);
  const spineColors = ['#f8fafc', '#1e293b', '#b91c1c', '#1d4ed8', '#eab308', '#15803d', '#ea580c', '#64748b'];

  for (let s = 1; s <= numShelves; s++) {
    const sy = s * shelfSpacing;
    let bx = bookColX - bookColW / 2 + 0.04;
    while (bx < bookColX + bookColW / 2 - 0.05) {
      const bThickness = 0.02 + Math.random() * 0.025;
      const bHeight = shelfSpacing * 0.70 + Math.random() * (shelfSpacing * 0.22);
      const bColor = spineColors[Math.floor(Math.random() * spineColors.length)];
      const bookMat = new THREE.MeshStandardMaterial({ color: bColor, roughness: 0.6 });
      const bMesh = new THREE.Mesh(new THREE.BoxGeometry(bThickness, bHeight, highD * 0.65), bookMat);
      bMesh.position.set(bx + bThickness / 2, sy + bHeight / 2, -highD + (highD * 0.65) / 2 + 0.01);
      bMesh.castShadow = true;
      tvUnitGroup.add(bMesh);
      bx += bThickness + 0.003;
    }
  }

  // B. Módulo Central con 2 Puertas Batientes (48 cm ancho): de X = -1.175 a X = -0.695
  const midColW = 0.48;
  const midColX = -1.175 + midColW / 2;
  const midBodyGeo = new THREE.BoxGeometry(midColW, highH, highD);
  const midBody = new THREE.Mesh(midBodyGeo, cherryMat);
  midBody.position.set(midColX, highH / 2, -highD / 2);
  midBody.castShadow = true;
  midBody.receiveShadow = true;
  tvUnitGroup.add(midBody);

  const doorH = (highH - 0.03) / 2;
  for (let d = 0; d < 2; d++) {
    const doorGeo = new THREE.BoxGeometry(midColW - 0.01, doorH - 0.01, 0.012);
    const doorMesh = new THREE.Mesh(doorGeo, cherryMat);
    const dy = 0.015 + d * doorH + doorH / 2;
    doorMesh.position.set(midColX, dy, -highD - 0.006);
    doorMesh.castShadow = true;
    tvUnitGroup.add(doorMesh);

    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.02), metalHandleMat);
    knob.rotation.x = Math.PI / 2;
    knob.position.set(midColX + (midColW / 2 - 0.05), dy + (d === 0 ? doorH * 0.35 : -doorH * 0.35), -highD - 0.018);
    knob.castShadow = true;
    tvUnitGroup.add(knob);
  }

  // C. Armario de Puerta Alta Entera (52 cm ancho): de X = -0.695 a X = -0.175
  const rightColW = 0.52;
  const rightColX = -0.695 + rightColW / 2;
  const rightBodyGeo = new THREE.BoxGeometry(rightColW, highH, highD);
  const rightBody = new THREE.Mesh(rightBodyGeo, cherryMat);
  rightBody.position.set(rightColX, highH / 2, -highD / 2);
  rightBody.castShadow = true;
  rightBody.receiveShadow = true;
  tvUnitGroup.add(rightBody);

  const tallDoorGeo = new THREE.BoxGeometry(rightColW - 0.01, highH - 0.02, 0.012);
  const tallDoor = new THREE.Mesh(tallDoorGeo, cherryMat);
  tallDoor.position.set(rightColX, highH / 2, -highD - 0.006);
  tallDoor.castShadow = true;
  tvUnitGroup.add(tallDoor);

  const tallKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.02), metalHandleMat);
  tallKnob.rotation.x = Math.PI / 2;
  tallKnob.position.set(rightColX - (rightColW / 2 - 0.05), highH * 0.52, -highD - 0.018);
  tallKnob.castShadow = true;
  tvUnitGroup.add(tallKnob);

  // 2. MÓDULO BAJO DE TV A LA DERECHA (180 cm ancho, 52 cm alto, 48 cm fondo)
  // En coordenadas locales: de X = -0.175 a X = +1.625 (centro en X = +0.725)
  const lowW = 1.80;
  const lowH = 0.52;
  const lowD = 0.48;
  const lowX = 0.725;
  const lowBaseGeo = new THREE.BoxGeometry(lowW, lowH, lowD);
  const lowBase = new THREE.Mesh(lowBaseGeo, cherryMat);
  lowBase.position.set(lowX, lowH / 2, -lowD / 2);
  lowBase.castShadow = true;
  lowBase.receiveShadow = true;
  tvUnitGroup.add(lowBase);

  // 6 Cajones frontales con tiradores horizontales de aluminio (3 columnas x 2 filas)
  const colW = (lowW - 0.04) / 3;
  const rowH = (lowH - 0.04) / 2;
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 2; r++) {
      const drawerGeo = new THREE.BoxGeometry(colW - 0.015, rowH - 0.015, 0.01);
      const drawerFront = new THREE.Mesh(drawerGeo, cherryMat);
      const dx = lowX - lowW / 2 + 0.02 + c * colW + colW / 2;
      const dy = 0.02 + r * rowH + rowH / 2;
      drawerFront.position.set(dx, dy, -lowD - 0.005);
      drawerFront.castShadow = true;
      tvUnitGroup.add(drawerFront);

      const handleGeo = new THREE.BoxGeometry(0.18, 0.012, 0.02);
      const handle = new THREE.Mesh(handleGeo, metalHandleMat);
      handle.position.set(dx, dy + rowH * 0.25, -lowD - 0.016);
      handle.castShadow = true;
      tvUnitGroup.add(handle);
    }
  }

  // TELEVISIÓN DE 50 PULGADAS SOBRE EL MUEBLE BAJO (Centrada en X = +0.725)
  const tvGroup = new THREE.Group();
  tvGroup.name = 'Smart TV 50"';
  const tvW = 1.12;
  const tvH = 0.65;
  const tvThick = 0.035;

  const frameMat = new THREE.MeshStandardMaterial({ color: '#15171c', roughness: 0.35, metalness: 0.6 });
  const tvFrameGeo = new THREE.BoxGeometry(tvW, tvH, tvThick);
  const tvFrame = new THREE.Mesh(tvFrameGeo, frameMat);
  tvFrame.position.set(0, lowH + 0.08 + tvH / 2, 0);
  tvFrame.castShadow = true;
  tvGroup.add(tvFrame);

  const screenMat = new THREE.MeshStandardMaterial({ color: '#090a0d', roughness: 0.15, metalness: 0.4 });
  const screenGeo = new THREE.PlaneGeometry(tvW - 0.03, tvH - 0.03);
  const screen = new THREE.Mesh(screenGeo, screenMat);
  // Pantalla mirando hacia -Z (hacia el sofá)
  screen.rotation.y = Math.PI;
  screen.position.set(0, lowH + 0.08 + tvH / 2, -tvThick / 2 - 0.002);
  tvGroup.add(screen);

  const baseMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.25, metalness: 0.8 });
  const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.012, 0.24), baseMat);
  basePlinth.position.set(0, lowH + 0.006, 0);
  basePlinth.castShadow = true;
  tvGroup.add(basePlinth);

  const standStem = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.075, 0.05), baseMat);
  standStem.position.set(0, lowH + 0.045, 0);
  standStem.castShadow = true;
  tvGroup.add(standStem);

  tvGroup.position.set(lowX, 0, -lowD / 2);
  tvUnitGroup.add(tvGroup);

  // UBICACIÓN REAL EN EL SALÓN:
  // La trasera apoya exactamente en la pared frontal Z = -3.0456m
  // X = 2.50m alinea la composición entre la columna izquierda y el balcón
  tvUnitGroup.position.set(2.50, 0, -3.0456);
  tvUnitGroup.rotation.y = 0;

  tvUnitDefaultPos.copy(tvUnitGroup.position);
  tvUnitDefaultRot.copy(tvUnitGroup.rotation);

  furnitureGroup.add(tvUnitGroup);
  selectableObjects.push(tvUnitGroup);
}

// --- MUEBLE CLASIFICADOR / PLANERO PUPITRE DE IMPRENTA ---
// Medidas exactas del usuario:
// Ancho: 89 cm (0.89 m)
// Profundidad: 57 cm (0.57 m)
// Alto delantera: 102 cm (1.02 m)
// Alto trasera: 122 cm (1.22 m)
// Madera: Pino caramelo oscurecido a castaño cálido con pátina
let planChestGroup = null;
const planChestDefaultPos = new THREE.Vector3();
const planChestDefaultRot = new THREE.Euler();

function createTrapezoidSideGeo(t, d, hFront, hRear, yBase) {
  const geo = new THREE.BufferGeometry();
  const x0 = -t / 2, x1 = t / 2;
  const zRear = -d / 2, zFront = d / 2;
  const vertices = new Float32Array([
    x0, yBase, zRear,    x1, yBase, zRear,    x1, hRear, zRear,    x0, hRear, zRear,   // 0, 1, 2, 3 (trasera)
    x0, yBase, zFront,   x1, yBase, zFront,   x1, hFront, zFront,  x0, hFront, zFront  // 4, 5, 6, 7 (delantera)
  ]);
  const indices = [
    // Trasera (-Z)
    0, 2, 1,  0, 3, 2,
    // Delantera (+Z)
    4, 5, 6,  4, 6, 7,
    // Costado Exterior Izquierdo (-X)
    0, 7, 3,  0, 4, 7,
    // Costado Exterior Derecho (+X)
    1, 2, 6,  1, 6, 5,
    // Parte Superior inclinada
    3, 6, 2,  3, 7, 6,
    // Base Inferior (-Y)
    0, 1, 5,  0, 5, 4
  ];
  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildPlanChestPupitre() {
  planChestGroup = new THREE.Group();
  planChestGroup.name = 'Mueble Planero Pupitre (Pino Caramelo Oscurecido - 89 x 57 x 122 cm)';

  const w = 0.89;
  const d = 0.57;
  const hFront = 1.02;
  const hRear = 1.22;
  const legH = 0.08;

  // Textura y color caramelo tostado/castaño cálido fiel a la foto real
  const caramelTex = createWoodTexture('#7c5232');
  const caramelMat = new THREE.MeshStandardMaterial({
    map: caramelTex,
    color: '#865633',
    roughness: 0.46,
    metalness: 0.04
  });

  const brassShellMat = new THREE.MeshStandardMaterial({
    color: '#b0934c',
    roughness: 0.35,
    metalness: 0.82
  });

  // 1. 4 PATAS CUADRADAS
  const legW = 0.06;
  const legGeo = new THREE.BoxGeometry(legW, legH, legW);
  const legPositions = [
    [-w / 2 + legW / 2, legH / 2, -d / 2 + legW / 2],
    [w / 2 - legW / 2, legH / 2, -d / 2 + legW / 2],
    [-w / 2 + legW / 2, legH / 2, d / 2 - legW / 2],
    [w / 2 - legW / 2, legH / 2, d / 2 - legW / 2]
  ];
  legPositions.forEach(([lx, ly, lz]) => {
    const legMesh = new THREE.Mesh(legGeo, caramelMat);
    legMesh.position.set(lx, ly, lz);
    legMesh.castShadow = true;
    planChestGroup.add(legMesh);
  });

  // 2. SUELO / TABLERO INFERIOR
  const bottomGeo = new THREE.BoxGeometry(w, 0.025, d);
  const bottomMesh = new THREE.Mesh(bottomGeo, caramelMat);
  bottomMesh.position.set(0, legH + 0.0125, 0);
  bottomMesh.castShadow = true;
  bottomMesh.receiveShadow = true;
  planChestGroup.add(bottomMesh);

  // 3. TRASERA SÓLIDA
  const backH = hRear - legH;
  const backGeo = new THREE.BoxGeometry(w - 0.04, backH, 0.025);
  const backMesh = new THREE.Mesh(backGeo, caramelMat);
  backMesh.position.set(0, legH + backH / 2, -d / 2 + 0.0125);
  backMesh.castShadow = true;
  backMesh.receiveShadow = true;
  planChestGroup.add(backMesh);

  // 4. COSTADOS LATERALES SÓLIDOS (Geometría trapezoidal limpia y sin huecos)
  const sideThickness = 0.025;
  const leftSideGeo = createTrapezoidSideGeo(sideThickness, d, hFront, hRear, legH);
  const leftSide = new THREE.Mesh(leftSideGeo, caramelMat);
  leftSide.position.set(-w / 2 + sideThickness / 2, 0, 0);
  leftSide.castShadow = true;
  leftSide.receiveShadow = true;
  planChestGroup.add(leftSide);

  const rightSideGeo = createTrapezoidSideGeo(sideThickness, d, hFront, hRear, legH);
  const rightSide = new THREE.Mesh(rightSideGeo, caramelMat);
  rightSide.position.set(w / 2 - sideThickness / 2, 0, 0);
  rightSide.castShadow = true;
  rightSide.receiveShadow = true;
  planChestGroup.add(rightSide);

  // Molduras verticales en los laterales (como en la foto)
  [-1, 1].forEach(sign => {
    const grooveGeo = new THREE.BoxGeometry(0.005, 0.65, 0.32);
    const grooveMat = new THREE.MeshStandardMaterial({ color: '#5a371f', roughness: 0.55 });
    const groove = new THREE.Mesh(grooveGeo, grooveMat);
    groove.position.set(sign * (w / 2 + 0.001), 0.58, 0);
    planChestGroup.add(groove);
  });

  // 5. FRONTAL Y 12 CAJONES DE IMPRENTA/PLANOS
  const frontH = hFront - legH;
  const frontBackingGeo = new THREE.BoxGeometry(w - 0.05, frontH, 0.02);
  const frontBacking = new THREE.Mesh(frontBackingGeo, caramelMat);
  frontBacking.position.set(0, legH + frontH / 2, d / 2 - 0.01);
  frontBacking.castShadow = true;
  planChestGroup.add(frontBacking);

  const numDrawers = 12;
  const drawerH = frontH / numDrawers;

  for (let i = 0; i < numDrawers; i++) {
    const dy = legH + (i + 0.5) * drawerH;

    // Frente de cajón
    const dfGeo = new THREE.BoxGeometry(w - 0.06, drawerH - 0.006, 0.015);
    const dfMesh = new THREE.Mesh(dfGeo, caramelMat);
    dfMesh.position.set(0, dy, d / 2 + 0.005);
    dfMesh.castShadow = true;
    planChestGroup.add(dfMesh);

    // Tirador de concha de latón envejecido (cup pull)
    const shellGeo = new THREE.SphereGeometry(0.016, 12, 6, 0, Math.PI, 0, Math.PI * 0.55);
    shellGeo.rotateX(Math.PI / 2);
    const shellHandle = new THREE.Mesh(shellGeo, brassShellMat);
    shellHandle.position.set(0, dy + 0.002, d / 2 + 0.016);
    shellHandle.castShadow = true;
    planChestGroup.add(shellHandle);
  }

  // 6. TAPA INCLINADA SUPERIOR (PUPITRE)
  // Longitud a lo largo de la pendiente = hipotenusa(0.57, 0.20) = 0.6044m
  const slopeLen = Math.hypot(d, hRear - hFront);
  const topThick = 0.028;
  const topGeo = new THREE.BoxGeometry(w + 0.03, topThick, slopeLen + 0.03);
  const topMesh = new THREE.Mesh(topGeo, caramelMat);

  const angle = Math.atan2(hRear - hFront, d);
  topMesh.rotation.x = angle;
  topMesh.position.set(0, (hFront + hRear) / 2 + topThick / 2, 0);
  topMesh.castShadow = true;
  topMesh.receiveShadow = true;
  planChestGroup.add(topMesh);

  // Tachuelas de latón decorativas a lo largo de la cornisa
  const studGeo = new THREE.SphereGeometry(0.005, 8, 8);
  const numStuds = 14;
  for (let st = 0; st < numStuds; st++) {
    const stud = new THREE.Mesh(studGeo, brassShellMat);
    const sx = -(w / 2) + 0.02 + st * ((w - 0.04) / (numStuds - 1));
    stud.position.set(sx, hFront + 0.026, d / 2 + 0.015);
    planChestGroup.add(stud);
  }

  // UBICACIÓN FIJADA POR EL USUARIO:
  // En la pared a la derecha del mueble de TV (X = 0.6237m),
  // a exactamente 15 cm de la esquina del salón (Z = -3.0456m) para respetar la puerta del dormitorio.
  // Trasera de 122 cm pegada a la pared (+X), cajones y plano inclinado mirando al salón (-X).
  planChestGroup.position.set(0.3387, 0, -2.4506);
  planChestGroup.rotation.y = -Math.PI / 2;

  planChestDefaultPos.copy(planChestGroup.position);
  planChestDefaultRot.copy(planChestGroup.rotation);

  furnitureGroup.add(planChestGroup);
  selectableObjects.push(planChestGroup);
}

// --- LIBRERÍAS DEVINA NAIS INFINITY (ZONA NOOK DONDE ESTABA EL MUEBLE DE IMPRENTA) ---
// Dimensiones oficiales: 80 x 42 cm, alto 200 cm
// Diseño oficial Devina Nais Infinity:
// - Columna central metálica vertical (spine) con placa base en el suelo y remaches de fijación
// - 5 baldas de roble macizo de 3.5 cm (rovere materico en Nat. Caramel) voladas a los lados
// - Barritas metálicas laterales en cada balda ("archetti ferma-libri" en U de hierro Arkansas)
// Ubicación: en las paredes del nook donde estaba antes el mueble de imprenta:
// - Unidad 1: Pared Lateral del Nook (tramo de 1.38 m, X = -4.68 m, mirando al este)
// - Unidad 2: Pared Frontal del Nook (tramo de 1.40 m, Z = -1.60 m, mirando al norte/comedor)
let infinityWestGroup = null;
let infinityNorthGroup = null;
const infinityWestDefaultPos = new THREE.Vector3();
const infinityWestDefaultRot = new THREE.Euler();
const infinityNorthDefaultPos = new THREE.Vector3();
const infinityNorthDefaultRot = new THREE.Euler();
const infinityShelvesMaterials = [];

function createInfinityBookcaseUnit(label) {
  const group = new THREE.Group();
  group.name = `Librería Devina Nais Infinity (${label} - 60 x 42 x 200 cm)`;

  const w = 0.60;
  const d = 0.42;
  const h = 2.00;
  const shelfThick = 0.035; // 3.5 cm macizo

  // 1. Materiales
  // Hierro Arkansas (columna central, base y varillas laterales)
  const ironArkansasMat = new THREE.MeshStandardMaterial({
    color: '#2a2c30',
    roughness: 0.42,
    metalness: 0.82
  });

  const ironPlateMat = new THREE.MeshStandardMaterial({
    color: '#383b40',
    roughness: 0.48,
    metalness: 0.75
  });

  // Roble Macizo Nat. Caramel para las baldas
  const curFinish = finishes[state.tableFinish] || finishes.caramel;
  const shelfMat = new THREE.MeshStandardMaterial({
    map: createWoodTexture(curFinish.colorHex),
    color: curFinish.tint,
    roughness: curFinish.roughness,
    metalness: 0.04
  });
  infinityShelvesMaterials.push(shelfMat);

  // 2. BASE METÁLICA DE SUELO (Placa de acero Arkansas)
  const baseW = 0.42;
  const baseD = 0.38;
  const baseH = 0.014;
  const baseGeo = new THREE.BoxGeometry(baseW, baseH, baseD);
  const baseMesh = new THREE.Mesh(baseGeo, ironArkansasMat);
  baseMesh.position.set(0, baseH / 2, 0);
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // 3. COLUMNA CENTRAL METÁLICA (Spine vertical que sostiene las baldas)
  const colW = 0.20; // 20 cm de ancho
  const colD = 0.05; // 5 cm de fondo
  const colGeo = new THREE.BoxGeometry(colW, h, colD);
  const colMesh = new THREE.Mesh(colGeo, ironPlateMat);
  colMesh.position.set(0, h / 2, -d / 2 + colD / 2);
  colMesh.castShadow = true;
  group.add(colMesh);

  // Placa frontal de la columna visible entre baldas
  const plateW = 0.16;
  const plateGeo = new THREE.BoxGeometry(plateW, h, 0.008);
  const plateMesh = new THREE.Mesh(plateGeo, ironArkansasMat);
  plateMesh.position.set(0, h / 2, -d / 2 + colD + 0.004);
  group.add(plateMesh);

  // Remaches / pernos industriales en la columna central
  const rivetGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.012, 10);
  rivetGeo.rotateX(Math.PI / 2);
  const rivetMat = new THREE.MeshStandardMaterial({ color: '#18191a', roughness: 0.3, metalness: 0.9 });

  // 4. 5 BALDAS DE ROBLE MACIZO CON COLUMNA CENTRAL Y BARRITAS LATERALES
  // Alturas según ficha técnica oficial: 34 cm base + 36 cm entre baldas
  const shelfLevels = [0.22, 0.58, 0.94, 1.30, 1.66];
  const shelfGeo = new THREE.BoxGeometry(w, shelfThick, d);

  // Geometrías para las barritas en los laterales ("archetti ferma-libri")
  const rodRadius = 0.004; // 8 mm diámetro
  const rodH = 0.09; // 9 cm de alto
  const rodLen = 0.22; // 22 cm de fondo

  shelfLevels.forEach((sy) => {
    // Balda de roble macizo
    const shelf = new THREE.Mesh(shelfGeo, shelfMat);
    shelf.position.set(0, sy, 0);
    shelf.castShadow = true;
    shelf.receiveShadow = true;
    group.add(shelf);

    // Ménsula / soporte de acero bajo la balda unido a la columna central
    const bracketGeo = new THREE.BoxGeometry(colW + 0.04, 0.04, 0.15);
    const bracket = new THREE.Mesh(bracketGeo, ironArkansasMat);
    bracket.position.set(0, sy - shelfThick / 2 - 0.02, -d / 2 + 0.075);
    bracket.castShadow = true;
    group.add(bracket);

    // Tornillos / pernos en la columna a la altura de cada balda
    [-0.06, 0.06].forEach(rx => {
      const rMesh = new THREE.Mesh(rivetGeo, rivetMat);
      rMesh.position.set(rx, sy + 0.06, -d / 2 + colD + 0.008);
      group.add(rMesh);
    });

    // BARRITAS EN LOS LATERALES DE LAS BALDAS (Archetti en U de hierro Arkansas)
    [-1, 1].forEach(side => {
      const sideX = side * (w / 2 - 0.012);

      // Montante vertical trasero
      const postRearGeo = new THREE.CylinderGeometry(rodRadius, rodRadius, rodH, 8);
      const postRear = new THREE.Mesh(postRearGeo, ironArkansasMat);
      postRear.position.set(sideX, sy + shelfThick / 2 + rodH / 2, -rodLen / 2);
      postRear.castShadow = true;
      group.add(postRear);

      // Montante vertical delantero
      const postFront = new THREE.Mesh(postRearGeo, ironArkansasMat);
      postFront.position.set(sideX, sy + shelfThick / 2 + rodH / 2, rodLen / 2);
      postFront.castShadow = true;
      group.add(postFront);

      // Barra horizontal superior conectando ambos montantes
      const topBarGeo = new THREE.CylinderGeometry(rodRadius, rodRadius, rodLen, 8);
      topBarGeo.rotateX(Math.PI / 2);
      const topBar = new THREE.Mesh(topBarGeo, ironArkansasMat);
      topBar.position.set(sideX, sy + shelfThick / 2 + rodH, 0);
      topBar.castShadow = true;
      group.add(topBar);
    });
  });

  // 5. DECORACIÓN FIEL A LA FOTO REAL (libros, cerámicas, esculturas, lámpara barco de papel)
  const decorColors = ['#1e293b', '#b45309', '#047857', '#991b1b', '#475569', '#d97706', '#cbd5e1'];

  // Balda 0 (inferior): pila horizontal de libros grandes
  const stackH = 0.038;
  for (let b = 0; b < 4; b++) {
    const bookGeo = new THREE.BoxGeometry(0.20 - b * 0.012, stackH, 0.26 - b * 0.012);
    const bMat = new THREE.MeshStandardMaterial({ color: decorColors[(b * 2) % decorColors.length], roughness: 0.5 });
    const bMesh = new THREE.Mesh(bookGeo, bMat);
    bMesh.position.set(-0.18, shelfLevels[0] + shelfThick / 2 + b * stackH + stackH / 2, 0);
    bMesh.castShadow = true;
    group.add(bMesh);
  }

  // Fila de libros verticales a la derecha de la columna
  let curX = 0.10;
  for (let i = 0; i < 4; i++) {
    const bW = 0.022 + Math.random() * 0.015;
    const bH = 0.22 + Math.random() * 0.06;
    const bD = d * 0.65;
    const bookGeo = new THREE.BoxGeometry(bW, bH, bD);
    const bMat = new THREE.MeshStandardMaterial({ color: decorColors[(i + 1) % decorColors.length], roughness: 0.55 });
    const bMesh = new THREE.Mesh(bookGeo, bMat);
    bMesh.position.set(curX + bW / 2, shelfLevels[0] + shelfThick / 2 + bH / 2, 0);
    bMesh.castShadow = true;
    group.add(bMesh);
    curX += bW + 0.003;
  }

  // Balda 1: Escultura origami / lámpara barco papel blanco (como en la foto del usuario)
  const boatGeo = new THREE.ConeGeometry(0.10, 0.12, 4);
  boatGeo.rotateX(Math.PI);
  boatGeo.scale(1.6, 0.8, 1.0);
  const boatMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.2,
    emissive: '#fff7ed',
    emissiveIntensity: 0.35
  });
  const boatMesh = new THREE.Mesh(boatGeo, boatMat);
  boatMesh.position.set(0, shelfLevels[1] + shelfThick / 2 + 0.06, 0.04);
  boatMesh.castShadow = true;
  group.add(boatMesh);

  // Libros verticales a la izquierda
  curX = -w / 2 + 0.03;
  for (let i = 0; i < 3; i++) {
    const bW = 0.024;
    const bH = 0.20 + i * 0.02;
    const bD = d * 0.60;
    const bMat = new THREE.MeshStandardMaterial({ color: decorColors[(i + 4) % decorColors.length], roughness: 0.6 });
    const bMesh = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bD), bMat);
    bMesh.position.set(curX + bW / 2, shelfLevels[1] + shelfThick / 2 + bH / 2, 0);
    bMesh.castShadow = true;
    group.add(bMesh);
    curX += bW + 0.003;
  }

  // Balda 2: Libros + planta en maceta terracota (como en la foto del usuario)
  curX = -w / 2 + 0.03;
  for (let i = 0; i < 4; i++) {
    const bW = 0.024;
    const bH = 0.23 - i * 0.01;
    const bD = d * 0.62;
    const bMat = new THREE.MeshStandardMaterial({ color: decorColors[i % decorColors.length], roughness: 0.6 });
    const bMesh = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bD), bMat);
    bMesh.position.set(curX + bW / 2, shelfLevels[2] + shelfThick / 2 + bH / 2, 0);
    bMesh.castShadow = true;
    group.add(bMesh);
    curX += bW + 0.003;
  }
  const potGeo = new THREE.CylinderGeometry(0.045, 0.035, 0.09, 14);
  const potMat = new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.7 });
  const pot = new THREE.Mesh(potGeo, potMat);
  pot.position.set(0.18, shelfLevels[2] + shelfThick / 2 + 0.045, 0);
  pot.castShadow = true;
  group.add(pot);
  const plantGeo = new THREE.SphereGeometry(0.055, 10, 8);
  const plantMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.8 });
  const plant = new THREE.Mesh(plantGeo, plantMat);
  plant.position.set(0.18, shelfLevels[2] + shelfThick / 2 + 0.11, 0);
  group.add(plant);

  // Balda 3: Cuencos cerámicos azul petróleo / turquesa y revistas apiladas
  [-0.18, -0.11].forEach((vx, vi) => {
    const bowlGeo = new THREE.CylinderGeometry(0.040, 0.030, 0.08 + vi * 0.015, 16);
    const bowlMat = new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.18, metalness: 0.1 });
    const bowlMesh = new THREE.Mesh(bowlGeo, bowlMat);
    bowlMesh.position.set(vx, shelfLevels[3] + shelfThick / 2 + 0.045, 0);
    bowlMesh.castShadow = true;
    group.add(bowlMesh);
  });
  for (let m = 0; m < 4; m++) {
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.015, 0.25), new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.7 }));
    mag.position.set(0.18, shelfLevels[3] + shelfThick / 2 + m * 0.015 + 0.007, 0);
    mag.castShadow = true;
    group.add(mag);
  }

  // Balda 4 (superior): Pila de libros + jarrón cerámico blanco
  for (let b = 0; b < 3; b++) {
    const bookGeo = new THREE.BoxGeometry(0.18, stackH, 0.23);
    const bMat = new THREE.MeshStandardMaterial({ color: decorColors[(b + 2) % decorColors.length], roughness: 0.6 });
    const bMesh = new THREE.Mesh(bookGeo, bMat);
    bMesh.position.set(-0.18, shelfLevels[4] + shelfThick / 2 + b * stackH + stackH / 2, 0);
    bMesh.castShadow = true;
    group.add(bMesh);
  }
  const topVaseGeo = new THREE.CylinderGeometry(0.035, 0.045, 0.16, 16);
  const topVaseMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.2 });
  const topVase = new THREE.Mesh(topVaseGeo, topVaseMat);
  topVase.position.set(0.18, shelfLevels[4] + shelfThick / 2 + 0.08, 0);
  topVase.castShadow = true;
  group.add(topVase);

  return group;
}

function buildInfinityBookcases() {
  // LAS DOS UNIDADES DE 60 CM EN LA PARED AMPLIADA DE 185 CM (Z = -1.60 m)
  // Pared que va desde X = -3.85 m hasta X = -2.00 m (1.85 m de ancho).
  // Se colocan las dos librerías gemelas de 60 cm separadas 10 cm entre sí.

  // 1. UNIDAD IZQUIERDA (60 cm)
  infinityWestGroup = createInfinityBookcaseUnit('Librería Izquierda');
  infinityWestGroup.position.set(-3.271, 0, -1.812);
  infinityWestGroup.rotation.y = Math.PI;

  infinityWestDefaultPos.copy(infinityWestGroup.position);
  infinityWestDefaultRot.copy(infinityWestGroup.rotation);

  furnitureGroup.add(infinityWestGroup);
  selectableObjects.push(infinityWestGroup);

  // 2. UNIDAD DERECHA (60 cm)
  infinityNorthGroup = createInfinityBookcaseUnit('Librería Derecha');
  infinityNorthGroup.position.set(-2.571, 0, -1.812);
  infinityNorthGroup.rotation.y = Math.PI;

  infinityNorthDefaultPos.copy(infinityNorthGroup.position);
  infinityNorthDefaultRot.copy(infinityNorthGroup.rotation);

  furnitureGroup.add(infinityNorthGroup);
  selectableObjects.push(infinityNorthGroup);
}

// --- APARADORES (PUNT CHICAGO MÁRMOL 230 cm & DEVINA NAIS ZERO.22 215 cm) & RELOJ XL ---
let sideboardGroup = null;
let wallClockGroup = null;
let sideboardLegMat = null;
const sideboardDefaultPos = new THREE.Vector3();
const sideboardDefaultRot = new THREE.Euler();

// MODELO 1: APARADOR PUNT CHICAGO / MÁRMOL NEGRO NERO MARQUINA (230 x 50 x 75 cm)
function buildSideboardPunt(targetGroup) {
  const w = 2.30;
  const d = 0.50;
  const h = 0.75;
  const marbleThick = 0.024;
  const airGap = 0.060;
  const legH = 0.200;
  const bodyH = h - marbleThick - airGap - legH; // 0.466 m
  const bodyW = 1.940;
  const bodyD = 0.450;

  const curFinish = finishes[state.tableFinish] || finishes.holandnat;
  const woodMat = new THREE.MeshStandardMaterial({
    map: createWoodTexture(curFinish.colorHex),
    color: curFinish.tint,
    roughness: curFinish.roughness,
    metalness: 0.04
  });

  const interiorWoodMat = new THREE.MeshStandardMaterial({
    map: createWoodTexture(curFinish.colorHex),
    color: curFinish.tint,
    roughness: 0.65,
    metalness: 0.02
  });

  const marbleMat = new THREE.MeshStandardMaterial({
    map: createBlackMarbleTexture(),
    color: '#0e0f11',
    roughness: 0.14,
    metalness: 0.10
  });

  const metalFrameMat = new THREE.MeshStandardMaterial({
    color: '#1a1b1e',
    roughness: 0.35,
    metalness: 0.85
  });
  sideboardLegMat = metalFrameMat;

  const smokedGlassMat = new THREE.MeshStandardMaterial({
    color: '#181b20',
    roughness: 0.08,
    metalness: 0.25,
    transparent: true,
    opacity: 0.55
  });

  const glassShelfMat = new THREE.MeshStandardMaterial({
    color: '#28323a',
    roughness: 0.05,
    metalness: 0.30,
    transparent: true,
    opacity: 0.60
  });

  // 1. Sobre volado de mármol negro
  const marbleTopGeo = new THREE.BoxGeometry(w, marbleThick, d);
  const marbleTop = new THREE.Mesh(marbleTopGeo, marbleMat);
  marbleTop.position.set(0, h - marbleThick / 2, 0);
  marbleTop.castShadow = true;
  marbleTop.receiveShadow = true;
  targetGroup.add(marbleTop);

  // 2. Estructura metálica arquitectónica
  const legProfile = 0.024;
  const frameSpanW = bodyW + 0.020;
  const frameSpanD = bodyD + 0.016;
  const legTotalH = h - marbleThick;

  const legGeo = new THREE.BoxGeometry(legProfile, legTotalH, legProfile);
  const legCoords = [
    [-frameSpanW / 2 + legProfile / 2, legTotalH / 2, -frameSpanD / 2 + legProfile / 2],
    [frameSpanW / 2 - legProfile / 2, legTotalH / 2, -frameSpanD / 2 + legProfile / 2],
    [-frameSpanW / 2 + legProfile / 2, legTotalH / 2, frameSpanD / 2 - legProfile / 2],
    [frameSpanW / 2 - legProfile / 2, legTotalH / 2, frameSpanD / 2 - legProfile / 2]
  ];

  legCoords.forEach(([lx, ly, lz]) => {
    const leg = new THREE.Mesh(legGeo, metalFrameMat);
    leg.position.set(lx, ly, lz);
    leg.castShadow = true;
    targetGroup.add(leg);
  });

  // Tirantes inferiores de unión
  const bottomBarLongGeo = new THREE.BoxGeometry(frameSpanW - legProfile * 2, 0.016, 0.016);
  const bottomBarLongFront = new THREE.Mesh(bottomBarLongGeo, metalFrameMat);
  bottomBarLongFront.position.set(0, legH - 0.02, frameSpanD / 2 - legProfile / 2);
  targetGroup.add(bottomBarLongFront);

  const bottomBarLongBack = new THREE.Mesh(bottomBarLongGeo, metalFrameMat);
  bottomBarLongBack.position.set(0, legH - 0.02, -frameSpanD / 2 + legProfile / 2);
  targetGroup.add(bottomBarLongBack);

  const bottomBarSideGeo = new THREE.BoxGeometry(0.016, 0.016, frameSpanD - legProfile * 2);
  const bottomBarSideL = new THREE.Mesh(bottomBarSideGeo, metalFrameMat);
  bottomBarSideL.position.set(-frameSpanW / 2 + legProfile / 2, legH - 0.02, 0);
  targetGroup.add(bottomBarSideL);

  const bottomBarSideR = new THREE.Mesh(bottomBarSideGeo, metalFrameMat);
  bottomBarSideR.position.set(frameSpanW / 2 - legProfile / 2, legH - 0.02, 0);
  targetGroup.add(bottomBarSideR);

  // Perfiles superiores bajo el mármol
  const topSupportGeo = new THREE.BoxGeometry(w - 0.08, 0.018, 0.018);
  const topSupportFront = new THREE.Mesh(topSupportGeo, metalFrameMat);
  topSupportFront.position.set(0, h - marbleThick - 0.009, frameSpanD / 2 - 0.03);
  targetGroup.add(topSupportFront);

  const topSupportBack = new THREE.Mesh(topSupportGeo, metalFrameMat);
  topSupportBack.position.set(0, h - marbleThick - 0.009, -frameSpanD / 2 + 0.03);
  targetGroup.add(topSupportBack);

  [-0.45, 0.45].forEach(cx => {
    const riserGeo = new THREE.BoxGeometry(0.020, airGap, 0.020);
    const riser = new THREE.Mesh(riserGeo, metalFrameMat);
    riser.position.set(cx, legH + bodyH + airGap / 2, 0);
    targetGroup.add(riser);
  });

  // 3. Cuerpo contenedor suspendido
  const panelT = 0.018;
  const bodyYCenter = legH + bodyH / 2;

  const bodyTopBotGeo = new THREE.BoxGeometry(bodyW, panelT, bodyD);
  const bodyTop = new THREE.Mesh(bodyTopBotGeo, woodMat);
  bodyTop.position.set(0, legH + bodyH - panelT / 2, 0);
  bodyTop.castShadow = true;
  targetGroup.add(bodyTop);

  const bodyBot = new THREE.Mesh(bodyTopBotGeo, woodMat);
  bodyBot.position.set(0, legH + panelT / 2, 0);
  bodyBot.castShadow = true;
  targetGroup.add(bodyBot);

  const bodySideGeo = new THREE.BoxGeometry(panelT, bodyH - panelT * 2, bodyD);
  const bodySideL = new THREE.Mesh(bodySideGeo, woodMat);
  bodySideL.position.set(-bodyW / 2 + panelT / 2, bodyYCenter, 0);
  bodySideL.castShadow = true;
  targetGroup.add(bodySideL);

  const bodySideR = new THREE.Mesh(bodySideGeo, woodMat);
  bodySideR.position.set(bodyW / 2 - panelT / 2, bodyYCenter, 0);
  bodySideR.castShadow = true;
  targetGroup.add(bodySideR);

  const bodyBackGeo = new THREE.BoxGeometry(bodyW - panelT * 2, bodyH - panelT * 2, 0.012);
  const bodyBack = new THREE.Mesh(bodyBackGeo, interiorWoodMat);
  bodyBack.position.set(0, bodyYCenter, -bodyD / 2 + 0.010);
  targetGroup.add(bodyBack);

  // 4 módulos con 4 puertas de cristal ahumado
  const numDoors = 4;
  const innerW = bodyW - panelT * 2;
  const compW = innerW / numDoors;
  const divGeo = new THREE.BoxGeometry(0.016, bodyH - panelT * 2, bodyD - 0.04);

  for (let d = 1; d < numDoors; d++) {
    const divX = -innerW / 2 + d * compW;
    const divider = new THREE.Mesh(divGeo, interiorWoodMat);
    divider.position.set(divX, bodyYCenter, -0.01);
    targetGroup.add(divider);
  }

  const doorW = compW - 0.005;
  const doorH = bodyH - 0.008;
  const frameBorder = 0.018;

  for (let i = 0; i < numDoors; i++) {
    const doorCenterX = -innerW / 2 + (i + 0.5) * compW;

    const doorRailGeo = new THREE.BoxGeometry(doorW, frameBorder, 0.014);
    const topRail = new THREE.Mesh(doorRailGeo, metalFrameMat);
    topRail.position.set(doorCenterX, legH + bodyH / 2 + doorH / 2 - frameBorder / 2, bodyD / 2 - 0.007);
    targetGroup.add(topRail);

    const botRail = new THREE.Mesh(doorRailGeo, metalFrameMat);
    botRail.position.set(doorCenterX, legH + bodyH / 2 - doorH / 2 + frameBorder / 2, bodyD / 2 - 0.007);
    targetGroup.add(botRail);

    const doorStileGeo = new THREE.BoxGeometry(frameBorder, doorH - frameBorder * 2, 0.014);
    const leftStile = new THREE.Mesh(doorStileGeo, metalFrameMat);
    leftStile.position.set(doorCenterX - doorW / 2 + frameBorder / 2, bodyYCenter, bodyD / 2 - 0.007);
    targetGroup.add(leftStile);

    const rightStile = new THREE.Mesh(doorStileGeo, metalFrameMat);
    rightStile.position.set(doorCenterX + doorW / 2 - frameBorder / 2, bodyYCenter, bodyD / 2 - 0.007);
    targetGroup.add(rightStile);

    const glassGeo = new THREE.BoxGeometry(doorW - frameBorder * 2, doorH - frameBorder * 2, 0.005);
    const glassPane = new THREE.Mesh(glassGeo, smokedGlassMat);
    glassPane.position.set(doorCenterX, bodyYCenter, bodyD / 2 - 0.007);
    targetGroup.add(glassPane);

    const isLeftOpening = (i % 2 === 0);
    const handleX = isLeftOpening ? (doorCenterX + doorW / 2 - 0.009) : (doorCenterX - doorW / 2 + 0.009);
    const handleGeo = new THREE.BoxGeometry(0.005, 0.12, 0.008);
    const handle = new THREE.Mesh(handleGeo, metalFrameMat);
    handle.position.set(handleX, bodyYCenter, bodyD / 2 + 0.004);
    targetGroup.add(handle);

    const shelfGeo = new THREE.BoxGeometry(compW - 0.03, 0.008, bodyD - 0.07);
    const shelf = new THREE.Mesh(shelfGeo, glassShelfMat);
    shelf.position.set(doorCenterX, bodyYCenter, -0.01);
    targetGroup.add(shelf);
  }

  // Cristalería fina
  const glasswareMat = new THREE.MeshStandardMaterial({
    color: '#e0effa',
    roughness: 0.10,
    metalness: 0.18,
    transparent: true,
    opacity: 0.65
  });

  const m1Center = -innerW / 2 + 0.5 * compW;
  const m3Center = -innerW / 2 + 2.5 * compW;

  [-0.08, 0.00, 0.08].forEach(ox => {
    const stemGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.07, 8);
    const stem = new THREE.Mesh(stemGeo, glasswareMat);
    stem.position.set(m1Center + ox, bodyYCenter + 0.04, -0.01);
    targetGroup.add(stem);

    const cupGeo = new THREE.CylinderGeometry(0.024, 0.014, 0.055, 12);
    const cup = new THREE.Mesh(cupGeo, glasswareMat);
    cup.position.set(m1Center + ox, bodyYCenter + 0.08, -0.01);
    targetGroup.add(cup);
  });

  const decanterGeo = new THREE.CylinderGeometry(0.022, 0.060, 0.13, 16);
  const decanter = new THREE.Mesh(decanterGeo, glasswareMat);
  decanter.position.set(m3Center - 0.06, legH + 0.08, -0.01);
  targetGroup.add(decanter);

  const stopperGeo = new THREE.SphereGeometry(0.022, 12, 12);
  const stopper = new THREE.Mesh(stopperGeo, glasswareMat);
  stopper.position.set(m3Center - 0.06, legH + 0.16, -0.01);
  targetGroup.add(stopper);

  [-0.03, 0.06].forEach(vx => {
    const tumblerGeo = new THREE.CylinderGeometry(0.028, 0.024, 0.065, 12);
    const tumbler = new THREE.Mesh(tumblerGeo, glasswareMat);
    tumbler.position.set(m3Center + vx + 0.06, legH + 0.045, -0.01);
    targetGroup.add(tumbler);
  });

  // Luz LED interior
  const vitrineLightL = new THREE.PointLight(0xffedd4, 0.85, 2.0, 1.8);
  vitrineLightL.position.set(-0.45, legH + bodyH - 0.04, 0.06);
  targetGroup.add(vitrineLightL);

  const vitrineLightR = new THREE.PointLight(0xffedd4, 0.85, 2.0, 1.8);
  vitrineLightR.position.set(0.45, legH + bodyH - 0.04, 0.06);
  targetGroup.add(vitrineLightR);

  // Lámpara y bandeja sobre el mármol
  const lampBaseGeo = new THREE.CylinderGeometry(0.055, 0.075, 0.020, 16);
  const lampBase = new THREE.Mesh(lampBaseGeo, metalFrameMat);
  lampBase.position.set(-0.75, h + 0.010, 0);
  targetGroup.add(lampBase);

  const sphereGeo = new THREE.SphereGeometry(0.12, 24, 24);
  const sphereMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.15,
    emissive: '#fff2db',
    emissiveIntensity: 0.65
  });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  sphere.position.set(-0.75, h + 0.13, 0);
  targetGroup.add(sphere);

  const lampLight = new THREE.PointLight(0xffecd1, 1.2, 3.5, 1.8);
  lampLight.position.set(-0.75, h + 0.15, 0.08);
  targetGroup.add(lampLight);

  const trayGeo = new THREE.CylinderGeometry(0.12, 0.10, 0.035, 20);
  const trayMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.35 });
  const tray = new THREE.Mesh(trayGeo, trayMat);
  tray.position.set(0.65, h + 0.018, 0);
  targetGroup.add(tray);
}

// MODELO 2: APARADOR DEVINA NAIS ZERO.22 (215 x 50 x 75 cm)
function buildSideboardZero22(targetGroup) {
  const w = 2.15;
  const d = 0.50;
  const h = 0.75;
  const legH = 0.20;
  const bodyH = 0.55;
  const rimH = 0.028;
  const tSide = 0.025;

  const curFinish = finishes[state.tableFinish] || finishes.holandnat;
  const woodMat = new THREE.MeshStandardMaterial({
    map: createWoodTexture(curFinish.colorHex),
    color: curFinish.tint,
    roughness: curFinish.roughness,
    metalness: 0.04
  });

  const interiorWoodMat = new THREE.MeshStandardMaterial({
    map: createWoodTexture(curFinish.colorHex),
    color: curFinish.tint,
    roughness: 0.65,
    metalness: 0.02
  });

  const curLegCfg = legFinishes[state.tableLegFinish] || legFinishes.arkansas;
  sideboardLegMat = new THREE.MeshStandardMaterial({
    color: curLegCfg.color,
    roughness: curLegCfg.roughness,
    metalness: curLegCfg.metalness || 0.6
  });

  const aluminumMat = new THREE.MeshStandardMaterial({
    color: '#1a1b1e',
    roughness: 0.35,
    metalness: 0.85
  });

  const lacquerMat = new THREE.MeshStandardMaterial({
    color: '#1a1b1e',
    roughness: 0.38,
    metalness: 0.12
  });

  const smokedGlassMat = new THREE.MeshStandardMaterial({
    color: '#16191e',
    roughness: 0.08,
    metalness: 0.20,
    transparent: true,
    opacity: 0.50
  });

  const glassShelfMat = new THREE.MeshStandardMaterial({
    color: '#28323a',
    roughness: 0.05,
    metalness: 0.30,
    transparent: true,
    opacity: 0.58
  });

  // 1. Sobre rehundido y estructura principal
  const topW = w - 2 * tSide;
  const topD = d - 0.025;
  const topY = legH + bodyH - rimH - 0.011;
  const topGeo = new THREE.BoxGeometry(topW, 0.022, topD);
  const top = new THREE.Mesh(topGeo, woodMat);
  top.position.set(0, topY, -0.008);
  top.castShadow = true;
  top.receiveShadow = true;
  targetGroup.add(top);

  const backRimGeo = new THREE.BoxGeometry(topW, rimH, 0.018);
  const backRim = new THREE.Mesh(backRimGeo, woodMat);
  backRim.position.set(0, legH + bodyH - rimH / 2, -d / 2 + 0.012);
  targetGroup.add(backRim);

  const botGeo = new THREE.BoxGeometry(w, 0.022, d);
  const bot = new THREE.Mesh(botGeo, woodMat);
  bot.position.set(0, legH + 0.011, 0);
  bot.castShadow = true;
  bot.receiveShadow = true;
  targetGroup.add(bot);

  const backGeo = new THREE.BoxGeometry(w, bodyH - 0.044, 0.015);
  const back = new THREE.Mesh(backGeo, interiorWoodMat);
  back.position.set(0, legH + bodyH / 2, -d / 2 + 0.012);
  targetGroup.add(back);

  // 2. Laterales con palillería cannettata
  const sideGeo = new THREE.BoxGeometry(tSide, bodyH, d);
  const sideLeft = new THREE.Mesh(sideGeo, woodMat);
  sideLeft.position.set(-w / 2 + tSide / 2, legH + bodyH / 2, 0);
  sideLeft.castShadow = true;
  targetGroup.add(sideLeft);

  const sideRight = new THREE.Mesh(sideGeo, woodMat);
  sideRight.position.set(w / 2 - tSide / 2, legH + bodyH / 2, 0);
  sideRight.castShadow = true;
  targetGroup.add(sideRight);

  const numSideSlats = 24;
  const sideSlatDepth = (d - 0.03) / numSideSlats;
  for (let i = 0; i < numSideSlats; i++) {
    const sz = -d / 2 + 0.015 + (i + 0.5) * sideSlatDepth;
    const slatGeo = new THREE.BoxGeometry(0.008, bodyH - 0.006, sideSlatDepth * 0.72);
    const slatL = new THREE.Mesh(slatGeo, woodMat);
    slatL.position.set(-w / 2 - 0.004, legH + bodyH / 2, sz);
    targetGroup.add(slatL);

    const slatR = new THREE.Mesh(slatGeo, woodMat);
    slatR.position.set(w / 2 + 0.004, legH + bodyH / 2, sz);
    targetGroup.add(slatR);
  }

  // 3. Distribución modular: Puerta madera 60cm, cubilete 30cm, 2 puertas cristal 60cm
  const wDoor1 = 0.60;
  const wNiche = 0.30;
  const wGlassDoor = 0.60;

  const xDiv1 = -0.45;
  const xDiv2 = -0.15;
  const xDiv3 = 0.45;

  const divGeo = new THREE.BoxGeometry(0.018, bodyH - rimH - 0.022, d - 0.04);
  const div1 = new THREE.Mesh(divGeo, interiorWoodMat);
  div1.position.set(xDiv1, legH + (bodyH - rimH) / 2, -0.01);
  targetGroup.add(div1);

  const div2 = new THREE.Mesh(divGeo, interiorWoodMat);
  div2.position.set(xDiv2, legH + (bodyH - rimH) / 2, -0.01);
  targetGroup.add(div2);

  const divGlassGeo = new THREE.BoxGeometry(0.018, bodyH - rimH - 0.022, d - 0.06);
  const div3 = new THREE.Mesh(divGlassGeo, interiorWoodMat);
  div3.position.set(xDiv3, legH + (bodyH - rimH) / 2, -0.02);
  targetGroup.add(div3);

  // Sección Izquierda: 1 Puerta madera con palillería
  const xDoor1Center = -0.75;
  const door1BaseGeo = new THREE.BoxGeometry(wDoor1 - 0.006, bodyH - 0.008, 0.014);
  const door1Base = new THREE.Mesh(door1BaseGeo, woodMat);
  door1Base.position.set(xDoor1Center, legH + bodyH / 2, d / 2 - 0.007);
  door1Base.castShadow = true;
  targetGroup.add(door1Base);

  const numFrontSlats = 28;
  const frontSlatW = (wDoor1 - 0.012) / numFrontSlats;
  for (let i = 0; i < numFrontSlats; i++) {
    const sx = -1.05 + 0.006 + (i + 0.5) * frontSlatW;
    const slatFrontGeo = new THREE.BoxGeometry(frontSlatW * 0.74, bodyH - 0.01, 0.008);
    const slatFront = new THREE.Mesh(slatFrontGeo, woodMat);
    slatFront.position.set(sx, legH + bodyH / 2, d / 2 + 0.004);
    slatFront.castShadow = true;
    targetGroup.add(slatFront);
  }

  const woodShelfGeo = new THREE.BoxGeometry(wDoor1 - 0.03, 0.018, d - 0.06);
  const woodShelf = new THREE.Mesh(woodShelfGeo, interiorWoodMat);
  woodShelf.position.set(xDoor1Center, legH + (bodyH - rimH) / 2, -0.01);
  targetGroup.add(woodShelf);

  // Sección Central: Cubilete encastrado en lacado negro mate
  const xNicheCenter = -0.30;
  const nicheT = 0.015;
  const nicheD = d - 0.035;
  const nicheYBottom = legH + 0.022;
  const nicheYTop = topY - 0.011;
  const nicheH = nicheYTop - nicheYBottom;
  const nicheYCenter = nicheYBottom + nicheH / 2;

  const nBotGeo = new THREE.BoxGeometry(wNiche - 0.004, nicheT, nicheD);
  const nBot = new THREE.Mesh(nBotGeo, lacquerMat);
  nBot.position.set(xNicheCenter, nicheYBottom + nicheT / 2, d / 2 - nicheD / 2);
  targetGroup.add(nBot);

  const nTop = new THREE.Mesh(nBotGeo, lacquerMat);
  nTop.position.set(xNicheCenter, nicheYTop - nicheT / 2, d / 2 - nicheD / 2);
  targetGroup.add(nTop);

  const nSideGeo = new THREE.BoxGeometry(nicheT, nicheH - nicheT * 2, nicheD);
  const nSideL = new THREE.Mesh(nSideGeo, lacquerMat);
  nSideL.position.set(xNicheCenter - wNiche / 2 + nicheT / 2 + 0.002, nicheYCenter, d / 2 - nicheD / 2);
  targetGroup.add(nSideL);

  const nSideR = new THREE.Mesh(nSideGeo, lacquerMat);
  nSideR.position.set(xNicheCenter + wNiche / 2 - nicheT / 2 - 0.002, nicheYCenter, d / 2 - nicheD / 2);
  targetGroup.add(nSideR);

  const nBackGeo = new THREE.BoxGeometry(wNiche - 0.004, nicheH - nicheT * 2, 0.012);
  const nBack = new THREE.Mesh(nBackGeo, lacquerMat);
  nBack.position.set(xNicheCenter, nicheYCenter, d / 2 - nicheD + 0.006);
  targetGroup.add(nBack);

  const nShelfGeo = new THREE.BoxGeometry(wNiche - nicheT * 2 - 0.004, nicheT, nicheD - 0.015);
  const nShelf = new THREE.Mesh(nShelfGeo, lacquerMat);
  nShelf.position.set(xNicheCenter, nicheYCenter, d / 2 - nicheD / 2 + 0.008);
  targetGroup.add(nShelf);

  const bookGeo = new THREE.BoxGeometry(0.18, 0.16, 0.028);
  const bookMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.35 });
  const book = new THREE.Mesh(bookGeo, bookMat);
  book.position.set(xNicheCenter - 0.02, nicheYCenter - nicheH / 4 + 0.02, d / 2 - 0.14);
  book.rotation.y = 0.08;
  targetGroup.add(book);

  const bowlGeo = new THREE.CylinderGeometry(0.06, 0.035, 0.055, 16);
  const bowlMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.25 });
  const bowl = new THREE.Mesh(bowlGeo, bowlMat);
  bowl.position.set(xNicheCenter, nicheYCenter + nicheH / 4 + 0.02, d / 2 - 0.16);
  targetGroup.add(bowl);

  // Sección Derecha: 2 puertas cristal ahumado
  const glassDoorCenters = [0.15, 0.75];
  glassDoorCenters.forEach((gxc, idx) => {
    const frameW = wGlassDoor - 0.006;
    const frameH = bodyH - 0.008;
    const borderT = 0.016;

    const railGeo = new THREE.BoxGeometry(frameW, borderT, 0.016);
    const topRail = new THREE.Mesh(railGeo, aluminumMat);
    topRail.position.set(gxc, legH + bodyH / 2 + frameH / 2 - borderT / 2, d / 2 - 0.008);
    targetGroup.add(topRail);

    const botRail = new THREE.Mesh(railGeo, aluminumMat);
    botRail.position.set(gxc, legH + bodyH / 2 - frameH / 2 + borderT / 2, d / 2 - 0.008);
    targetGroup.add(botRail);

    const stileGeo = new THREE.BoxGeometry(borderT, frameH - borderT * 2, 0.016);
    const leftStile = new THREE.Mesh(stileGeo, aluminumMat);
    leftStile.position.set(gxc - frameW / 2 + borderT / 2, legH + bodyH / 2, d / 2 - 0.008);
    targetGroup.add(leftStile);

    const rightStile = new THREE.Mesh(stileGeo, aluminumMat);
    rightStile.position.set(gxc + frameW / 2 - borderT / 2, legH + bodyH / 2, d / 2 - 0.008);
    targetGroup.add(rightStile);

    const glassPaneGeo = new THREE.BoxGeometry(frameW - borderT * 2, frameH - borderT * 2, 0.006);
    const glassPane = new THREE.Mesh(glassPaneGeo, smokedGlassMat);
    glassPane.position.set(gxc, legH + bodyH / 2, d / 2 - 0.008);
    targetGroup.add(glassPane);

    const handleSide = (idx === 0) ? (gxc + frameW / 2 - 0.008) : (gxc - frameW / 2 + 0.008);
    const handleGeo = new THREE.BoxGeometry(0.006, 0.12, 0.008);
    const handle = new THREE.Mesh(handleGeo, aluminumMat);
    handle.position.set(handleSide, legH + bodyH / 2, d / 2 + 0.004);
    targetGroup.add(handle);

    const gShelfGeo = new THREE.BoxGeometry(wGlassDoor - 0.035, 0.008, d - 0.08);
    const gShelf = new THREE.Mesh(gShelfGeo, glassShelfMat);
    gShelf.position.set(gxc, legH + (bodyH - rimH) / 2, -0.01);
    targetGroup.add(gShelf);
  });

  // Cristalería fina interior
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#e2f0fb',
    roughness: 0.1,
    metalness: 0.15,
    transparent: true,
    opacity: 0.65
  });

  [-0.10, 0.00, 0.10].forEach(ox => {
    const stemGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.08, 8);
    const stem = new THREE.Mesh(stemGeo, glassMat);
    stem.position.set(glassDoorCenters[0] + ox, legH + (bodyH - rimH) / 2 + 0.045, -0.01);
    targetGroup.add(stem);

    const cupGeo = new THREE.CylinderGeometry(0.026, 0.015, 0.06, 12);
    const cup = new THREE.Mesh(cupGeo, glassMat);
    cup.position.set(glassDoorCenters[0] + ox, legH + (bodyH - rimH) / 2 + 0.09, -0.01);
    targetGroup.add(cup);
  });

  const decanterGeo = new THREE.CylinderGeometry(0.025, 0.065, 0.14, 16);
  const decanter = new THREE.Mesh(decanterGeo, glassMat);
  decanter.position.set(glassDoorCenters[1] - 0.06, legH + 0.085, -0.01);
  targetGroup.add(decanter);

  const decanterStopperGeo = new THREE.SphereGeometry(0.025, 12, 12);
  const decanterStopper = new THREE.Mesh(decanterStopperGeo, glassMat);
  decanterStopper.position.set(glassDoorCenters[1] - 0.06, legH + 0.17, -0.01);
  targetGroup.add(decanterStopper);

  [-0.04, 0.06].forEach(vx => {
    const tumblerGeo = new THREE.CylinderGeometry(0.03, 0.026, 0.07, 12);
    const tumbler = new THREE.Mesh(tumblerGeo, glassMat);
    tumbler.position.set(glassDoorCenters[1] + vx + 0.07, legH + 0.05, -0.01);
    targetGroup.add(tumbler);
  });

  const vitrineLight = new THREE.PointLight(0xffedd4, 0.85, 2.2, 1.8);
  vitrineLight.position.set(0.45, legH + bodyH - 0.06, 0.05);
  targetGroup.add(vitrineLight);

  // 4. Exactamente 5 patas de hierro Devina Nais
  const legPositions = [
    [-w / 2 + 0.06, legH / 2, -d / 2 + 0.06],
    [w / 2 - 0.06, legH / 2, -d / 2 + 0.06],
    [-w / 2 + 0.06, legH / 2, d / 2 - 0.06],
    [w / 2 - 0.06, legH / 2, d / 2 - 0.06],
    [0.00, legH / 2, d / 2 - 0.06]
  ];
  legPositions.forEach(([lx, ly, lz]) => {
    const legGeo = new THREE.CylinderGeometry(0.012, 0.009, legH, 12);
    const leg = new THREE.Mesh(legGeo, sideboardLegMat);
    leg.position.set(lx, ly, lz);
    leg.castShadow = true;
    targetGroup.add(leg);
  });

  const frameGeo = new THREE.BoxGeometry(w - 0.14, 0.018, d - 0.12);
  const frame = new THREE.Mesh(frameGeo, sideboardLegMat);
  frame.position.set(0, legH - 0.01, 0);
  targetGroup.add(frame);

  // Lámpara y bandeja sobre el sobre
  const lampBaseGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.02, 16);
  const lampBase = new THREE.Mesh(lampBaseGeo, sideboardLegMat);
  lampBase.position.set(-0.75, topY + 0.011 + 0.01, 0);
  targetGroup.add(lampBase);

  const sphereGeo = new THREE.SphereGeometry(0.12, 24, 24);
  const sphereMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.15,
    emissive: '#fff2db',
    emissiveIntensity: 0.65
  });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  sphere.position.set(-0.75, topY + 0.011 + 0.13, 0);
  targetGroup.add(sphere);

  const lampLight = new THREE.PointLight(0xffecd1, 1.2, 3.5, 1.8);
  lampLight.position.set(-0.75, topY + 0.011 + 0.15, 0.08);
  targetGroup.add(lampLight);

  const trayGeo = new THREE.CylinderGeometry(0.12, 0.10, 0.035, 20);
  const trayMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.35 });
  const tray = new THREE.Mesh(trayGeo, trayMat);
  tray.position.set(0.65, topY + 0.011 + 0.018, 0);
  targetGroup.add(tray);
}

// GESTOR DE APARADOR INTERACTIVO
function renderSideboard(model) {
  state.sideboardModel = model;

  while (sideboardGroup.children.length > 0) {
    sideboardGroup.remove(sideboardGroup.children[0]);
  }

  if (model === 'zero22') {
    sideboardGroup.name = 'Aparador Devina Nais Zero.22 (215 x 50 x 75 cm)';
    buildSideboardZero22(sideboardGroup);
  } else {
    sideboardGroup.name = 'Aparador Punt Chicago Mármol (230 x 50 x 75 cm)';
    buildSideboardPunt(sideboardGroup);
  }

  document.querySelectorAll('[data-sideboard]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sideboard === model);
  });

  const specsEl = document.getElementById('sideboard-specs-text');
  if (specsEl) {
    if (model === 'zero22') {
      specsEl.innerHTML = `
        <span><strong>Modelo elegido:</strong> Devina Nais Zero.22 (215 x 50 x 75 cm)</span>
        <span><strong>Frente:</strong> Puerta roble con palillería (60 cm) + Cubilete negro (30 cm) + 2 puertas cristal (60 cm)</span>
        <span><strong>Detalles:</strong> Puertas/costados sobrepasan el sobre • 5 patas de hierro (4 esquinas + 1 central)</span>
      `;
    } else {
      specsEl.innerHTML = `
        <span><strong>Modelo elegido:</strong> Punt Chicago / Colección Mármol (230 x 50 x 75 cm)</span>
        <span><strong>Sobre:</strong> Mármol Negro Nero Marquina pulido volado (230 x 50 cm)</span>
        <span><strong>Estructura:</strong> Metal antracita con air gap (6 cm) • 4 puertas cristal ahumado e iluminación interior</span>
      `;
    }
  }
}

function setSideboardModel(model) {
  renderSideboard(model);
  saveUserPreferences();
}

// RELOJ NOMON BARCELONA
function buildWallClock() {
  wallClockGroup = new THREE.Group();
  wallClockGroup.name = 'Reloj de Pared Nomon Barcelona (Ø 110 cm)';

  const clockRadius = 0.55;
  const ringMat = new THREE.MeshStandardMaterial({
    color: '#16171a',
    roughness: 0.38,
    metalness: 0.85
  });

  const brassDetailMat = new THREE.MeshStandardMaterial({
    color: '#c29b4e',
    roughness: 0.22,
    metalness: 0.90
  });

  const walnutClockMat = new THREE.MeshStandardMaterial({
    map: createWoodTexture('#4a3020'),
    color: '#553622',
    roughness: 0.55,
    metalness: 0.03
  });

  // Aros dobles concéntricos
  const outerRingGeo = new THREE.TorusGeometry(clockRadius, 0.005, 12, 64);
  const outerRing = new THREE.Mesh(outerRingGeo, ringMat);
  wallClockGroup.add(outerRing);

  const innerRingGeo = new THREE.TorusGeometry(clockRadius * 0.90, 0.004, 12, 64);
  const innerRing = new THREE.Mesh(innerRingGeo, ringMat);
  wallClockGroup.add(innerRing);

  // Soporte superior latón
  const wallPeg = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.045, 16), brassDetailMat);
  wallPeg.rotateX(Math.PI / 2);
  wallPeg.position.set(0, clockRadius + 0.20, -0.02);
  wallClockGroup.add(wallPeg);

  const hookPin = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.025, 12), brassDetailMat);
  hookPin.position.set(0, clockRadius + 0.21, 0.005);
  wallClockGroup.add(hookPin);

  // Varilla vertical
  const vertRod = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, (clockRadius * 2) + 0.28, 12), brassDetailMat);
  vertRod.position.set(0, 0.05, 0);
  wallClockGroup.add(vertRod);

  // Bloques de nogal
  const walnutBlockGeo = new THREE.BoxGeometry(0.055, 0.035, 0.030);
  const blockTop = new THREE.Mesh(walnutBlockGeo, walnutClockMat);
  blockTop.position.set(0, clockRadius, 0);
  wallClockGroup.add(blockTop);

  const blockBot = new THREE.Mesh(walnutBlockGeo, walnutClockMat);
  blockBot.position.set(0, -clockRadius, 0);
  wallClockGroup.add(blockBot);

  // Mecanismo central
  const centerMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.025, 24), brassDetailMat);
  centerMotor.rotateX(Math.PI / 2);
  centerMotor.position.set(0, 0, 0.015);
  wallClockGroup.add(centerMotor);

  const centerWalnutBar = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.016, 0.010), walnutClockMat);
  centerWalnutBar.position.set(0, 0, 0.026);
  wallClockGroup.add(centerWalnutBar);

  // Agujas esbeltas
  const minuteAngle = -Math.PI / 3.2;
  const minHand = new THREE.Mesh(new THREE.BoxGeometry(0.012, clockRadius * 0.76, 0.005), walnutClockMat);
  minHand.position.set(Math.sin(-minuteAngle) * (clockRadius * 0.36), Math.cos(-minuteAngle) * (clockRadius * 0.36), 0.032);
  minHand.rotation.z = minuteAngle;
  wallClockGroup.add(minHand);

  const hourAngle = Math.PI / 2.7;
  const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.016, clockRadius * 0.50, 0.005), walnutClockMat);
  hourHand.position.set(Math.sin(-hourAngle) * (clockRadius * 0.23), Math.cos(-hourAngle) * (clockRadius * 0.23), 0.036);
  hourHand.rotation.z = hourAngle;
  // Reloj centrado en la pared intermedia de 135 cm (X = -4.68 m, de Z = -3.15 m a Z = -1.78 m)
  wallClockGroup.position.set(-4.66, 1.72, -2.469);
  wallClockGroup.rotation.y = Math.PI / 2;
  furnitureGroup.add(wallClockGroup);
}

function buildSideboardAndClock() {
  sideboardGroup = new THREE.Group();
  sideboardGroup.position.set(-5.0839, 0, -4.6854);
  sideboardGroup.rotation.y = Math.PI / 2;
  sideboardDefaultPos.copy(sideboardGroup.position);
  sideboardDefaultRot.copy(sideboardGroup.rotation);
  furnitureGroup.add(sideboardGroup);
  selectableObjects.push(sideboardGroup);

  renderSideboard(state.sideboardModel || 'punt');
  buildWallClock();
}

function setTableFinish(finishKey) {
  state.tableFinish = finishKey;
  const cfg = finishes[finishKey];
  if (tableTopMesh && cfg) {
    const newTex = createWoodTexture(cfg.colorHex);
    tableTopMesh.material.map = newTex;
    tableTopMesh.material.color.set(cfg.tint);
    tableTopMesh.material.roughness = cfg.roughness;
    tableTopMesh.material.needsUpdate = true;
  }
  if (cfg && infinityShelvesMaterials.length > 0) {
    infinityShelvesMaterials.forEach(mat => {
      mat.map = createWoodTexture(cfg.colorHex);
      mat.color.set(cfg.tint);
      mat.roughness = cfg.roughness;
      mat.needsUpdate = true;
    });
  }
  if (sideboardGroup) {
    renderSideboard(state.sideboardModel || 'punt');
  }
  saveUserPreferences();
}

function setTableLegFinish(finishKey) {
  state.tableLegFinish = finishKey;
  renderTableLegs(state.tableLegs);
  if (sideboardLegMat) {
    const legCfg = legFinishes[finishKey] || legFinishes.arkansas;
    sideboardLegMat.color.set(legCfg.color);
    sideboardLegMat.roughness = legCfg.roughness;
    sideboardLegMat.metalness = legCfg.metalness || 0.6;
    sideboardLegMat.needsUpdate = true;
  }
  saveUserPreferences();
}

// --- VISTAS DE CÁMARA PREDEFINIDAS ---
let targetCamPos = camera.position.clone();
let targetControlsTarget = controls.target.clone();
let isAnimatingCamera = false;

function setCameraPreset(preset) {
  isAnimatingCamera = true;
  const tableT = magicPlanData.furniture_targets.table;

  switch (preset) {
    case 'isometric':
      targetCamPos.set(0, 18, 14);
      targetControlsTarget.set(0, 0, -1.0);
      break;
    case 'top':
      targetCamPos.set(0, 26, 0.01);
      targetControlsTarget.set(0, 0, 0);
      break;
    case 'living':
      targetCamPos.set(1.5, 3.8, 0.0);
      targetControlsTarget.set(2.6, 0.8, -5.67);
      break;
    case 'tv':
      targetCamPos.set(2.50, 1.7, -5.6);
      targetControlsTarget.set(2.50, 1.1, -3.2);
      break;
    case 'planero':
      targetCamPos.set(-1.3, 1.85, -3.85);
      targetControlsTarget.set(0.34, 0.95, -2.45);
      break;
    case 'cajon':
      targetCamPos.set(2.8, 2.6, -4.5);
      targetControlsTarget.set(2.8, 0.9, -7.4);
      break;
    case 'dining':
      targetCamPos.set(-1.4, 2.3, -2.8);
      targetControlsTarget.set(tableT.x, 0.85, tableT.z);
      break;
    case 'libreria':
      targetCamPos.set(-2.92, 1.85, -4.20);
      targetControlsTarget.set(-2.92, 1.20, -1.812);
      break;
    case 'reloj':
      targetCamPos.set(-2.20, 1.85, -2.469);
      targetControlsTarget.set(-4.66, 1.72, -2.469);
      break;
    case 'radiador-norte':
      targetCamPos.set(-2.62, 1.35, -3.8);
      targetControlsTarget.set(-2.62, 0.60, -6.18);
      break;
    case 'kitchen':
      const kT = magicPlanData.furniture_targets.kitchen_island;
      targetCamPos.set(kT.x, 4.0, kT.z + 5.5);
      targetControlsTarget.set(kT.x, 0.8, kT.z);
      break;
  }
}

// --- SELECCIÓN Y MANIPULACIÓN CON GIZMO ---
const gizmoBar = document.getElementById('gizmo-bar');
const selectedItemName = document.getElementById('selected-item-name');

function selectObject(obj) {
  state.selectedObject = obj;
  if (obj) {
    transformControls.attach(obj);
    selectedItemName.textContent = obj.name || 'Mueble Seleccionado';
    gizmoBar.classList.add('visible');
  } else {
    transformControls.detach();
    selectedItemName.textContent = 'Ningún mueble seleccionado';
    gizmoBar.classList.remove('visible');
  }
}

window.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.control-panel') || e.target.closest('.app-header') || e.target.closest('.gizmo-bar')) {
    return;
  }

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(selectableObjects, true);

  if (intersects.length > 0) {
    let topParent = intersects[0].object;
    while (topParent.parent && !selectableObjects.includes(topParent)) {
      topParent = topParent.parent;
    }
    if (selectableObjects.includes(topParent)) {
      selectObject(topParent);
    }
  }
});

// --- EVENT LISTENERS ---
document.querySelectorAll('.btn-view').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.btn-view').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    setCameraPreset(btn.dataset.view);
  });
});

// Selector de Suelo
document.getElementById('btn-floor-plan').addEventListener('click', (e) => {
  document.querySelectorAll('[id^="btn-floor-"]').forEach(b => b.classList.remove('active'));
  e.currentTarget.classList.add('active');
  state.floorMode = 'plan';
  updateFloorMode();
  saveUserPreferences();
});

document.getElementById('btn-floor-blend').addEventListener('click', (e) => {
  document.querySelectorAll('[id^="btn-floor-"]').forEach(b => b.classList.remove('active'));
  e.currentTarget.classList.add('active');
  state.floorMode = 'blend';
  updateFloorMode();
  saveUserPreferences();
});

document.getElementById('btn-floor-parquet').addEventListener('click', (e) => {
  document.querySelectorAll('[id^="btn-floor-"]').forEach(b => b.classList.remove('active'));
  e.currentTarget.classList.add('active');
  state.floorMode = 'parquet';
  updateFloorMode();
  saveUserPreferences();
});

// Acabado del Tablero de la repisa tras el sofá
document.querySelectorAll('[data-shelf-finish]').forEach(swatch => {
  swatch.addEventListener('click', () => {
    document.querySelectorAll('[data-shelf-finish]').forEach(s => s.classList.remove('active'));
    swatch.classList.add('active');
    setShelfFinish(swatch.dataset.shelfFinish);
  });
});

// Luz LED de la repisa
document.getElementById('btn-led-on').addEventListener('click', () => {
  document.getElementById('btn-led-on').classList.add('active');
  document.getElementById('btn-led-off').classList.remove('active');
  state.ledLightOn = true;
  ledLight.visible = true;
  saveUserPreferences();
});

document.getElementById('btn-led-off').addEventListener('click', () => {
  document.getElementById('btn-led-off').classList.add('active');
  document.getElementById('btn-led-on').classList.remove('active');
  state.ledLightOn = false;
  ledLight.visible = false;
  saveUserPreferences();
});

// Patas Mesa
document.getElementById('btn-legs-star').addEventListener('click', () => {
  document.getElementById('btn-legs-star').classList.add('active');
  document.getElementById('btn-legs-wave').classList.remove('active');
  state.tableLegs = 'star';
  renderTableLegs('star');
  saveUserPreferences();
});

document.getElementById('btn-legs-wave').addEventListener('click', () => {
  document.getElementById('btn-legs-wave').classList.add('active');
  document.getElementById('btn-legs-star').classList.remove('active');
  state.tableLegs = 'wave';
  renderTableLegs('wave');
  saveUserPreferences();
});

// Acabados Mesa Devina Nais
document.querySelectorAll('[data-finish]').forEach(swatch => {
  swatch.addEventListener('click', () => {
    document.querySelectorAll('[data-finish]').forEach(s => s.classList.remove('active'));
    swatch.classList.add('active');
    setTableFinish(swatch.dataset.finish);
  });
});

// Acabados Patas Hierro Devina Nais
document.querySelectorAll('[data-leg-finish]').forEach(swatch => {
  swatch.addEventListener('click', () => {
    document.querySelectorAll('[data-leg-finish]').forEach(s => s.classList.remove('active'));
    swatch.classList.add('active');
    setTableLegFinish(swatch.dataset.legFinish);
  });
});

// Acabados Sillas James Roll Devina Nais
document.querySelectorAll('[data-chair-finish]').forEach(swatch => {
  swatch.addEventListener('click', () => {
    document.querySelectorAll('[data-chair-finish]').forEach(s => s.classList.remove('active'));
    swatch.classList.add('active');
    setChairFinish(swatch.dataset.chairFinish);
  });
});

// Selector Modelo de Aparador (Punt Mármol vs Devina Nais Zero.22)
document.querySelectorAll('[data-sideboard]').forEach(btn => {
  btn.addEventListener('click', () => {
    setSideboardModel(btn.dataset.sideboard);
  });
});

// Selección Muebles
document.getElementById('btn-select-sofa').addEventListener('click', () => {
  if (sofaObject) {
    selectObject(sofaObject);
    setCameraPreset('living');
  }
});

document.getElementById('btn-select-table').addEventListener('click', () => {
  if (tableGroup) {
    selectObject(tableGroup);
    setCameraPreset('dining');
  }
});

const btnSelectLibraryWest = document.getElementById('btn-select-library-west');
if (btnSelectLibraryWest) {
  btnSelectLibraryWest.addEventListener('click', () => {
    if (infinityWestGroup) {
      selectObject(infinityWestGroup);
      setCameraPreset('libreria');
    }
  });
}

const btnSelectLibraryNorth = document.getElementById('btn-select-library-north');
if (btnSelectLibraryNorth) {
  btnSelectLibraryNorth.addEventListener('click', () => {
    if (infinityNorthGroup) {
      selectObject(infinityNorthGroup);
      setCameraPreset('libreria');
    }
  });
}

document.getElementById('btn-toggle-cotas').addEventListener('click', () => {
  state.showCotas = !state.showCotas;
  cotasGroup.visible = state.showCotas;
  saveUserPreferences();
  document.getElementById('btn-toggle-cotas').textContent = state.showCotas ? 'Ocultar Cotas 3D' : 'Ver Cotas 3D';
});

// Altura de Muros (Sincronizado entre panel lateral y botón flotante móvil)
function setWallHeight(h) {
  state.wallHeight = h;
  const isHigh = Math.abs(h - 2.47) < 0.1;

  const btnLow = document.getElementById('btn-walls-low');
  const btnHigh = document.getElementById('btn-walls-high');
  if (btnLow && btnHigh) {
    if (isHigh) {
      btnHigh.classList.add('active');
      btnLow.classList.remove('active');
    } else {
      btnLow.classList.add('active');
      btnHigh.classList.remove('active');
    }
  }

  const btnFabWalls = document.getElementById('btn-toggle-walls-mobile');
  if (btnFabWalls) {
    if (isHigh) {
      btnFabWalls.classList.add('is-high');
      btnFabWalls.innerHTML = '<span class="fab-icon">🏢</span><span class="fab-text">Paredes 2.47m (Bajar)</span>';
      btnFabWalls.setAttribute('title', 'Paredes a altura real de techo (2.47m). Pulsa para bajar a corte 1.20m');
    } else {
      btnFabWalls.classList.remove('is-high');
      btnFabWalls.innerHTML = '<span class="fab-icon">🏠</span><span class="fab-text">Paredes 1.20m (Subir)</span>';
      btnFabWalls.setAttribute('title', 'Paredes en corte maqueta (1.20m). Pulsa para subir a altura real (2.47m)');
    }
  }

  rebuildWalls();
  saveUserPreferences();
}

const btnWallsLow = document.getElementById('btn-walls-low');
if (btnWallsLow) {
  btnWallsLow.addEventListener('click', () => setWallHeight(1.20));
}

const btnWallsHigh = document.getElementById('btn-walls-high');
if (btnWallsHigh) {
  btnWallsHigh.addEventListener('click', () => setWallHeight(2.47));
}

const btnFabWalls = document.getElementById('btn-toggle-walls-mobile');
if (btnFabWalls) {
  btnFabWalls.addEventListener('click', () => {
    const nextH = Math.abs(state.wallHeight - 2.47) < 0.1 ? 1.20 : 2.47;
    setWallHeight(nextH);
  });
}

// Sincronizar UI inicial con el estado detectado (2.47m en móvil, 1.20m en escritorio)
setWallHeight(state.wallHeight);

// Iluminación General
document.getElementById('btn-light-day').addEventListener('click', () => {
  document.getElementById('btn-light-day').classList.add('active');
  document.getElementById('btn-light-warm').classList.remove('active');
  dirLight.color.setHex(0xfff8ed);
  dirLight.intensity = 1.7;
  ambientLight.color.setHex(0xd9e3ed);
});

document.getElementById('btn-light-warm').addEventListener('click', () => {
  document.getElementById('btn-light-warm').classList.add('active');
  document.getElementById('btn-light-day').classList.remove('active');
  dirLight.color.setHex(0xff9a55);
  dirLight.intensity = 1.25;
  ambientLight.color.setHex(0xb27f52);
});

// Gizmo Actions
document.getElementById('gizmo-mode-translate').addEventListener('click', () => {
  transformControls.setMode('translate');
  document.getElementById('gizmo-mode-translate').classList.add('active');
  document.getElementById('gizmo-mode-rotate').classList.remove('active');
});

document.getElementById('gizmo-mode-rotate').addEventListener('click', () => {
  transformControls.setMode('rotate');
  document.getElementById('gizmo-mode-rotate').classList.add('active');
  document.getElementById('gizmo-mode-translate').classList.remove('active');
});

document.getElementById('btn-reset-pos').addEventListener('click', () => {
  if (state.selectedObject === sofaObject) {
    sofaObject.position.copy(sofaDefaultPos);
    sofaObject.rotation.copy(sofaDefaultRot);
  } else if (state.selectedObject === tableGroup) {
    tableGroup.position.copy(tableDefaultPos);
    tableGroup.rotation.copy(tableDefaultRot);
  } else if (state.selectedObject === tvUnitGroup) {
    tvUnitGroup.position.copy(tvUnitDefaultPos);
    tvUnitGroup.rotation.copy(tvUnitDefaultRot);
  } else if (state.selectedObject === planChestGroup) {
    planChestGroup.position.copy(planChestDefaultPos);
    planChestGroup.rotation.copy(planChestDefaultRot);
  } else if (state.selectedObject === infinityWestGroup) {
    infinityWestGroup.position.copy(infinityWestDefaultPos);
    infinityWestGroup.rotation.copy(infinityWestDefaultRot);
  } else if (state.selectedObject === infinityNorthGroup) {
    infinityNorthGroup.position.copy(infinityNorthDefaultPos);
    infinityNorthGroup.rotation.copy(infinityNorthDefaultRot);
  } else if (state.selectedObject === sideboardGroup) {
    sideboardGroup.position.copy(sideboardDefaultPos);
    sideboardGroup.rotation.copy(sideboardDefaultRot);
  }
});

// Selección directa de muebles adicionales
const btnSelectTv = document.getElementById('btn-select-tv');
if (btnSelectTv) {
  btnSelectTv.addEventListener('click', () => {
    if (tvUnitGroup) {
      selectObject(tvUnitGroup);
      setCameraPreset('tv');
    }
  });
}

const btnSelectPlanero = document.getElementById('btn-select-planero');
if (btnSelectPlanero) {
  btnSelectPlanero.addEventListener('click', () => {
    if (planChestGroup) {
      selectObject(planChestGroup);
      setCameraPreset('planero');
    }
  });
}

const btnSelectSideboard = document.getElementById('btn-select-sideboard');
if (btnSelectSideboard) {
  btnSelectSideboard.addEventListener('click', () => {
    if (sideboardGroup) {
      selectObject(sideboardGroup);
      setCameraPreset('reloj');
    }
  });
}

const btnViewRadiadorNorth = document.getElementById('btn-view-radiador-north');
if (btnViewRadiadorNorth) {
  btnViewRadiadorNorth.addEventListener('click', () => {
    setCameraPreset('radiador-norte');
  });
}

document.getElementById('btn-deselect').addEventListener('click', () => {
  selectObject(null);
});

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Inicialización de todos los elementos
buildFloor();
rebuildWalls();
buildModularSofa();
buildSofaCustomLedge();
buildTableDevinaNais();
buildTvLivingUnit();
buildPlanChestPupitre();
buildInfinityBookcases();
buildSideboardAndClock();

// SINCRONIZACIÓN DE INTERFAZ DESDE EL ESTADO GUARDADO
function syncUIFromState() {
  // 1. Aparador
  document.querySelectorAll('[data-sideboard]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sideboard === state.sideboardModel);
  });
  const specsEl = document.getElementById('sideboard-specs-text');
  if (specsEl) {
    if (state.sideboardModel === 'zero22') {
      specsEl.innerHTML = `
        <span><strong>Modelo elegido:</strong> Devina Nais Zero.22 (215 x 50 x 75 cm)</span>
        <span><strong>Frente:</strong> Puerta roble con palillería (60 cm) + Cubilete negro (30 cm) + 2 puertas cristal (60 cm)</span>
        <span><strong>Detalles:</strong> Puertas/costados sobrepasan el sobre • 5 patas de hierro (4 esquinas + 1 central)</span>
      `;
    } else {
      specsEl.innerHTML = `
        <span><strong>Modelo elegido:</strong> Punt Chicago / Colección Mármol (230 x 50 x 75 cm)</span>
        <span><strong>Sobre:</strong> Mármol Negro Nero Marquina pulido volado (230 x 50 cm)</span>
        <span><strong>Estructura:</strong> Metal antracita con air gap (6 cm) • 4 puertas cristal ahumado e iluminación interior</span>
      `;
    }
  }

  // 2. Patas de mesa
  const btnStar = document.getElementById('btn-legs-star');
  const btnWave = document.getElementById('btn-legs-wave');
  if (btnStar && btnWave) {
    btnStar.classList.toggle('active', state.tableLegs === 'star');
    btnWave.classList.toggle('active', state.tableLegs === 'wave');
  }

  // 3. Acabados mesa
  document.querySelectorAll('[data-finish]').forEach(b => {
    b.classList.toggle('active', b.dataset.finish === state.tableFinish);
  });

  // 4. Acabados patas mesa
  document.querySelectorAll('[data-leg-finish]').forEach(b => {
    b.classList.toggle('active', b.dataset.legFinish === state.tableLegFinish);
  });

  // 5. Acabados sillas
  document.querySelectorAll('[data-chair-finish]').forEach(b => {
    b.classList.toggle('active', b.dataset.chairFinish === state.chairFinish);
  });

  // 6. Acabados repisa sofá
  document.querySelectorAll('[data-shelf-finish]').forEach(b => {
    b.classList.toggle('active', b.dataset.shelfFinish === state.shelfFinish);
  });

  // 7. Modo de suelo
  const btnFlPlan = document.getElementById('btn-floor-plan');
  const btnFlBlend = document.getElementById('btn-floor-blend');
  const btnFlParquet = document.getElementById('btn-floor-parquet');
  if (btnFlPlan && btnFlBlend && btnFlParquet) {
    btnFlPlan.classList.toggle('active', state.floorMode === 'plan');
    btnFlBlend.classList.toggle('active', state.floorMode === 'blend');
    btnFlParquet.classList.toggle('active', state.floorMode === 'parquet');
  }

  // 8. Altura de muros
  const btnLow = document.getElementById('btn-walls-low');
  const btnHigh = document.getElementById('btn-walls-high');
  const isHigh = Math.abs(state.wallHeight - 2.47) < 0.1;
  if (btnLow && btnHigh) {
    btnLow.classList.toggle('active', !isHigh);
    btnHigh.classList.toggle('active', isHigh);
  }

  // 9. LED
  const btnLedOn = document.getElementById('btn-led-on');
  const btnLedOff = document.getElementById('btn-led-off');
  if (btnLedOn && btnLedOff) {
    btnLedOn.classList.toggle('active', state.ledLightOn);
    btnLedOff.classList.toggle('active', !state.ledLightOn);
  }
}

// Botones guardar / restablecer preferencias
const btnSaveDef = document.getElementById('btn-save-default');
if (btnSaveDef) {
  btnSaveDef.addEventListener('click', () => {
    saveUserPreferences();
    mostrarAvisoGuardado('⭐ Configuración guardada como predeterminada');
  });
}

const btnResetDef = document.getElementById('btn-reset-default');
if (btnResetDef) {
  btnResetDef.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    mostrarAvisoGuardado('🔄 Restableciendo valores originales...');
    setTimeout(() => {
      window.location.reload();
    }, 600);
  });
}

syncUIFromState();

// ========================================================
// INTEGRACIÓN CATÁLOGO: PROBAR MUEBLE CANDIDATO EN 3D
// ========================================================
const candidatoMueblesGroup = new THREE.Group();
furnitureGroup.add(candidatoMueblesGroup);

function crearSpriteCota(nombre, w, d, h) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');

  // Fondo redondeado oscuro
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 120, 20);
  ctx.fill();
  ctx.stroke();

  // Texto título
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  const displayTitle = nombre.length > 30 ? nombre.substring(0, 28) + '...' : nombre;
  ctx.fillText(displayTitle, 256, 52);

  // Texto medidas
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
  const wCm = Math.round(w * 100);
  const dCm = Math.round(d * 100);
  const hCm = Math.round(h * 100);
  ctx.fillText(`📐 ${wCm} × ${dCm} × ${hCm} cm`, 256, 96);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(1.5, 0.42, 1);
  return sprite;
}

function probarMuebleEn3D(mueble) {
  // Retirar cualquier candidato previo para no superponer
  const previo = candidatoMueblesGroup.getObjectByName('mueble_candidato_activo');
  if (previo) {
    candidatoMueblesGroup.remove(previo);
    const idx = selectableObjects.indexOf(previo);
    if (idx !== -1) selectableObjects.splice(idx, 1);
  }

  const group = new THREE.Group();
  group.name = `[3D] ${mueble.nombre || 'Mueble Candidato'}`;
  group.userData = { id: mueble.id, esCandidato: true, datos: mueble };

  const w = (parseFloat(mueble.ancho) || 100) / 100;
  const d = (parseFloat(mueble.fondo) || 80) / 100;
  const h = (parseFloat(mueble.alto) || 75) / 100;

  // Color de acabado según descripción
  let colorHex = 0xb46a3c; // tono cerezo cálido por defecto
  let roughness = 0.45;
  let metalness = 0.05;

  const desc = ((mueble.acabado || '') + ' ' + (mueble.nombre || '')).toLowerCase();
  if (desc.includes('roble') || desc.includes('natural')) {
    colorHex = 0xc59b6d;
  } else if (desc.includes('nogal') || desc.includes('oscuro') || desc.includes('tabacco')) {
    colorHex = 0x5a3d28;
  } else if (desc.includes('negro') || desc.includes('metal') || desc.includes('hierro')) {
    colorHex = 0x242424;
    roughness = 0.3;
    metalness = 0.6;
  } else if (desc.includes('blanco') || desc.includes('lacado')) {
    colorHex = 0xf0f0f0;
    roughness = 0.25;
  } else if (desc.includes('visón') || desc.includes('topo') || desc.includes('grey') || desc.includes('gris')) {
    colorHex = 0x767069;
  } else if (desc.includes('beige') || desc.includes('arena') || desc.includes('lino')) {
    colorHex = 0xd5c9b7;
  }

  const matPrincipal = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: roughness,
    metalness: metalness
  });

  const matDetalle = new THREE.MeshStandardMaterial({
    color: 0x1f242d,
    roughness: 0.35,
    metalness: 0.7
  });

  if (mueble.categoria === 'mesas_comedor' || mueble.categoria === 'mesas_centro') {
    // Tablero
    const boardH = Math.min(0.045, h * 0.08);
    const topGeo = new THREE.BoxGeometry(w, boardH, d);
    const topMesh = new THREE.Mesh(topGeo, matPrincipal);
    topMesh.position.set(0, h - boardH / 2, 0);
    topMesh.castShadow = true;
    topMesh.receiveShadow = true;
    group.add(topMesh);

    // 4 Patas
    const legThick = Math.min(0.06, w * 0.05);
    const legH = h - boardH;
    const legGeo = new THREE.BoxGeometry(legThick, legH, legThick);
    const legPositions = [
      [-w / 2 + legThick, legH / 2, -d / 2 + legThick],
      [w / 2 - legThick, legH / 2, -d / 2 + legThick],
      [-w / 2 + legThick, legH / 2, d / 2 - legThick],
      [w / 2 - legThick, legH / 2, d / 2 - legThick]
    ];
    legPositions.forEach(pos => {
      const legMesh = new THREE.Mesh(legGeo, matDetalle);
      legMesh.position.set(pos[0], pos[1], pos[2]);
      legMesh.castShadow = true;
      group.add(legMesh);
    });
  } else if (mueble.categoria === 'sillas') {
    const seatH = Math.min(0.48, h * 0.55);
    const seatThick = 0.06;
    const seatGeo = new THREE.BoxGeometry(w, seatThick, d * 0.85);
    const seatMesh = new THREE.Mesh(seatGeo, matPrincipal);
    seatMesh.position.set(0, seatH, 0);
    seatMesh.castShadow = true;
    group.add(seatMesh);

    const legThick = 0.035;
    const legGeo = new THREE.BoxGeometry(legThick, seatH, legThick);
    const legPos = [
      [-w / 2 + legThick, seatH / 2, -d * 0.85 / 2 + legThick],
      [w / 2 - legThick, seatH / 2, -d * 0.85 / 2 + legThick],
      [-w / 2 + legThick, seatH / 2, d * 0.85 / 2 - legThick],
      [w / 2 - legThick, seatH / 2, d * 0.85 / 2 - legThick]
    ];
    legPos.forEach(p => {
      const l = new THREE.Mesh(legGeo, matDetalle);
      l.position.set(p[0], p[1], p[2]);
      l.castShadow = true;
      group.add(l);
    });

    const backH = h - seatH;
    const backGeo = new THREE.BoxGeometry(w, backH, 0.05);
    const backMesh = new THREE.Mesh(backGeo, matPrincipal);
    backMesh.position.set(0, seatH + backH / 2, -d * 0.85 / 2 + 0.025);
    backMesh.castShadow = true;
    group.add(backMesh);
  } else {
    // Volumen general con cantos destacados
    const bodyGeo = new THREE.BoxGeometry(w, h, d);
    const bodyMesh = new THREE.Mesh(bodyGeo, matPrincipal);
    bodyMesh.position.set(0, h / 2, 0);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    const edges = new THREE.EdgesGeometry(bodyGeo);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 });
    const lineMesh = new THREE.LineSegments(edges, lineMat);
    lineMesh.position.copy(bodyMesh.position);
    group.add(lineMesh);
  }

  // Cota dimensional flotante en lo alto
  const sprite = crearSpriteCota(mueble.nombre, w, d, h);
  sprite.position.set(0, h + 0.28, 0);
  group.add(sprite);

  // Posición inicial sugerida según zona
  let posX = 0;
  let posZ = 0;
  if (mueble.zona === 'comedor') {
    posX = -1.2;
    posZ = 0.5;
  } else if (mueble.zona === 'tv') {
    posX = 1.0;
    posZ = -3.8;
  } else if (mueble.zona === 'descanso') {
    posX = 1.5;
    posZ = -0.5;
  } else if (mueble.zona === 'lectura') {
    posX = -3.2;
    posZ = -1.8;
  } else {
    posX = 0;
    posZ = 0;
  }

  group.position.set(posX, 0, posZ);
  group.name = 'mueble_candidato_activo';

  candidatoMueblesGroup.add(group);
  selectableObjects.push(group);

  // Seleccionar automáticamente con el Gizmo
  selectObject(group);

  // Mover suavemente la cámara hacia el mueble
  targetCamPos.set(posX - 2.8, 2.5, posZ + 3.2);
  targetControlsTarget.set(posX, h * 0.5, posZ);
  isAnimatingCamera = true;
}

window.probarMuebleEn3D = probarMuebleEn3D;

// Render loop
function animate() {
  requestAnimationFrame(animate);

  if (isAnimatingCamera) {
    camera.position.lerp(targetCamPos, 0.07);
    controls.target.lerp(targetControlsTarget, 0.07);
    if (camera.position.distanceTo(targetCamPos) < 0.05 && controls.target.distanceTo(targetControlsTarget) < 0.05) {
      isAnimatingCamera = false;
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();
