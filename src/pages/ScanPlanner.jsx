// ===========================================================================
// Eva Clinic — Planejamento de Guia Cirúrgico sobre ARQUIVOS REAIS (STL/PLY/DICOM)
//
// Recursos:
// 1. Abertura simultânea de Scans Intraorais (.STL/.PLY) e Tomografia (.DCM).
// 2. Modo Lado a Lado (Tomografia DICOM MPR | Visualizador 3D STL).
// 3. Modos de visualização de tomografia: Axial, Coronal, Sagital e Densidade HU.
// 4. Extração de Osso 3D da Tomografia (DICOM -> STL) para juntar com o scan.
// 5. Planejamento de implantes sincronizado entre 3D e cortes tomográficos.
// 6. Modo Tela Cheia (Workstation) e integração completa com o motor CAD local.
// ===========================================================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  FolderOpen, Eye, EyeOff, Move, RotateCw, Trash2, Crosshair, MousePointer2,
  Download, Cpu, Scissors, Save, Maximize2, Minimize2, Columns, Layers,
  Box, RefreshCw, Sliders, AlertCircle, Sparkles,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import {
  parseDicomSlice, buildVolumeFromSlices, DENTAL_PRESETS,
  extractAxialImageData, extractCoronalImageData, extractSagittalImageData,
} from '../lib/dicomReader';

const CAD_URL = 'http://127.0.0.1:8005';
const ROLES = [
  { id: 'inferior', label: 'Arcada inferior', color: '#e9dcc3', up: 1 },
  { id: 'superior', label: 'Arcada superior', color: '#bcd9ea', up: -1 },
  { id: 'osso', label: 'Osso tomográfico (DICOM)', color: '#fed7aa', up: 1 },
  { id: 'guia', label: 'Guia cirúrgico', color: '#3b82f6', up: 1 },
  { id: 'outro', label: 'Outro / comparação', color: '#c4b5fd', up: 1 },
];
const roleInfo = (id) => ROLES.find((r) => r.id === id) || ROLES[4];
const IMPLANT_D = [3.3, 3.5, 3.75, 4.0, 4.3, 4.5, 5.0, 5.5];
const IMPLANT_L = [7, 8, 10, 11.5, 13, 15, 16];
const MIN_EDGE_MM = 3;

const guessRole = (name) => {
  const n = name.toLowerCase();
  if (/osso|bone|tomografia|dcm|ct/.test(n)) return 'osso';
  if (/guia|guide/.test(n)) return 'guia';
  if (/inf|mand|lower/.test(n)) return 'inferior';
  if (/sup|max|upper/.test(n)) return 'superior';
  return 'outro';
};

const toBase64 = (buf) => {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const fromBase64 = (b64) => {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
};
const saveBlob = (data, name, type) => {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

function buildImplantMeshes(group, d, L) {
  while (group.children.length) {
    const c = group.children.pop();
    c.geometry?.dispose();
    c.material?.dispose();
  }
  const mat = (color, opacity) => new THREE.MeshStandardMaterial({
    color, roughness: 0.35, metalness: 0.4, transparent: true, opacity, depthTest: false,
  });
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(d / 2, (d / 2) * 0.82, L, 32).rotateX(Math.PI / 2).translate(0, 0, -L / 2),
    mat('#2ee6c5', 0.85)
  );
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(d / 2 + 0.25, d / 2 + 0.25, 0.5, 32).rotateX(Math.PI / 2).translate(0, 0, 0.25),
    mat('#94a3b8', 0.95)
  );
  const axis = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 18, 8).rotateX(Math.PI / 2).translate(0, 0, 9),
    mat('#fbbf24', 0.9)
  );
  [body, platform, axis].forEach((m) => { m.renderOrder = 10; group.add(m); });
}

const S = {
  panel: { background: 'var(--surface-solid)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' },
  btn: (on) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 11px',
    borderRadius: 'var(--radius-sm)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
    border: `1px solid ${on ? 'var(--brand)' : 'var(--border-strong)'}`,
    background: on ? 'var(--brand-soft)' : 'var(--surface-2)', color: on ? 'var(--brand)' : 'var(--text)',
  }),
  label: { fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, margin: '14px 0 6px' },
  row: { display: 'flex', alignItems: 'center', gap: 8 },
  input: { width: '100%', background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', padding: '6px 8px', fontSize: 13 },
};
const Num = ({ label, value, step = 0.1, min, max, onChange }) => (
  <label style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}
    <input type="number" style={S.input} value={value} step={step} min={min} max={max} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
  </label>
);

export default function ScanPlanner() {
  const { state, toast } = useApp();
  const containerRef = useRef(null);
  const hostRef = useRef(null);
  const fileRef = useRef(null);
  const dicomFileRef = useRef(null);
  const E = useRef({ models: new Map(), implants: new Map(), seq: 1, tool: 'navegar', selImplant: null }).current;

  // Estados 3D e Modelos
  const [models, setModels] = useState([]);
  const [implants, setImplants] = useState([]);
  const [tool, setTool] = useState('navegar');
  const [gizmo, setGizmo] = useState('translate');
  const [selImplant, setSelImplant] = useState(null);
  const [selModel, setSelModel] = useState(null);
  const [tab, setTab] = useState('modelos');
  const [implantDef, setImplantDef] = useState({ diameter: 4.3, length: 10 });
  const [guideParams, setGuideParams] = useState({ base: '', thickness: 2.5, gap: 0.1, hole_d: 5, sleeve_od: 7.5, sleeve_h: 5, radius: 14 });
  const [clip, setClip] = useState({ on: false, z: 20 });
  const [opening, setOpening] = useState(0);
  const [cad, setCad] = useState('checking');
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [lastGuide, setLastGuide] = useState(null);

  // Novos Estados: Tela Cheia, Modo Lado a Lado e Tomografia DICOM
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState('3d'); // '3d' | 'split' | 'dicom'
  const [dicomVolume, setDicomVolume] = useState(null);
  const [dicomSlices, setDicomSlices] = useState({ axial: 0, coronal: 0, sagittal: 0 });
  const [dicomWw, setDicomWw] = useState(2000);
  const [dicomWl, setDicomWl] = useState(450);
  const [probeHu, setProbeHu] = useState(null);
  const [isExtractingBone, setIsExtractingBone] = useState(false);

  // Canvas refs para os 3 cortes tomográficos MPR
  const axialCanvasRef = useRef(null);
  const coronalCanvasRef = useRef(null);
  const sagittalCanvasRef = useRef(null);

  // ------------------------------------------------------------------ helpers
  const syncModels = useCallback(() => {
    setModels([...E.models.values()].map((m) => ({
      id: m.id, name: m.name, role: m.role, visible: m.mesh.visible,
      opacity: m.mesh.material.opacity, color: '#' + m.mesh.material.color.getHexString(), tris: m.tris,
    })));
  }, [E]);

  const readImplant = useCallback((it) => {
    const q = new THREE.Quaternion();
    it.group.getWorldQuaternion(q);
    const a = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    return {
      id: it.id, label: it.label, diameter: it.diameter, length: it.length,
      pos: it.group.getWorldPosition(new THREE.Vector3()).toArray(), axis: a.toArray(),
      tilt: THREE.MathUtils.radToDeg(Math.acos(Math.min(1, Math.abs(a.z)))),
    };
  }, []);

  const syncImplants = useCallback(() => {
    setImplants([...E.implants.values()].map(readImplant));
  }, [E, readImplant]);

  const fitView = useCallback((view = 'top') => {
    const box = new THREE.Box3();
    E.models.forEach((m) => { if (m.mesh.visible) box.expandByObject(m.mesh); });
    if (box.isEmpty()) box.set(new THREE.Vector3(-30, -30, 0), new THREE.Vector3(30, 30, 30));
    const c = box.getCenter(new THREE.Vector3());
    const r = box.getSize(new THREE.Vector3()).length() * 0.9;
    const dir = { top: [0, -0.05, 1], front: [0, -1, 0.15], left: [-1, 0, 0.15], right: [1, 0, 0.15], back: [0, 1, 0.15] }[view] || [0, -0.05, 1];
    E.camera.position.copy(c).add(new THREE.Vector3(...dir).normalize().multiplyScalar(r));
    E.controls.target.copy(c);
    E.camera.near = Math.max(0.1, r / 500); E.camera.far = r * 50; E.camera.updateProjectionMatrix();
    E.controls.update();
  }, [E]);

  // Alterna tela cheia nativa ou estilizada
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // ------------------------------------------------------------ cena three.js
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.localClippingEnabled = true;
    host.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0f1e');
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 2000);
    camera.up.set(0, 0, 1);
    camera.position.set(40, -120, 90);
    scene.add(camera);
    scene.add(new THREE.HemisphereLight('#ffffff', '#334155', 0.7));
    const head = new THREE.DirectionalLight('#ffffff', 1.1);
    head.position.set(0.3, 0.5, 1); camera.add(head);
    const grid = new THREE.GridHelper(200, 40, '#1f2a4a', '#141c36'); grid.rotation.x = Math.PI / 2; grid.position.z = -0.5;
    scene.add(grid);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.screenSpacePanning = true;
    const tc = new TransformControls(camera, renderer.domElement);
    tc.setSize(0.9);
    tc.addEventListener('dragging-changed', (e) => { controls.enabled = !e.value; });
    tc.addEventListener('objectChange', () => {
      if (E.selImplant) setImplants([...E.implants.values()].map(readImplant));
    });
    const helper = tc.getHelper(); scene.add(helper);

    Object.assign(E, { renderer, scene, camera, controls, tc, helper, clipPlane: new THREE.Plane(new THREE.Vector3(0, 0, -1), 20) });

    const resize = () => {
      if (!host) return;
      const { clientWidth: w, clientHeight: h } = host;
      renderer.setSize(w, h); camera.aspect = w / Math.max(h, 1); camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize); ro.observe(host); resize();

    let raf;
    const loop = () => { raf = requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera); };
    loop();

    const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
    let down = null;
    const el = renderer.domElement;
    const onDown = (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; };
    const onUp = (e) => {
      if (!down || e.button !== 0) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      const dt = performance.now() - down.t; down = null;
      if (moved > 5 || dt > 450 || tc.dragging) return;
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);

      const groups = [...E.implants.values()].map((i) => i.group);
      const hitImp = ray.intersectObjects(groups, true)[0];
      if (hitImp) {
        let o = hitImp.object; while (o && !o.userData.implantId) o = o.parent;
        if (o) { E.selectImplant(o.userData.implantId); return; }
      }

      if (E.tool === 'implante') {
        const targets = [...E.models.values()].filter((m) => m.mesh.visible && m.role !== 'guia').map((m) => m.mesh);
        const hit = ray.intersectObjects(targets, false)[0];
        if (hit) E.placeImplant(hit);
        else toast('Clique sobre a superfície da arcada ou osso para posicionar o implante.', 'info');
      }
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);

    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointerup', onUp);
      tc.dispose(); controls.dispose();
      E.models.forEach((m) => { m.mesh.geometry?.dispose(); m.mesh.material?.dispose(); });
      E.models.clear(); E.implants.clear();
      renderer.dispose();
      if (host.contains(renderer.domElement)) host.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------ implantes
  E.selectImplant = (id) => {
    E.selImplant = id; setSelImplant(id); setSelModel(null);
    const it = E.implants.get(id);
    if (it) {
      E.tc.attach(it.group); E.tc.setMode(E.gizmoMode || 'translate'); E.tc.setSpace('local'); setTab('implantes');
    } else E.tc.detach();
  };

  E.placeImplant = (hit) => {
    const model = [...E.models.values()].find((m) => m.mesh === hit.object);
    const up = roleInfo(model?.role).up;
    const axisWorld = new THREE.Vector3(0, 0, up).transformDirection(model.mesh.matrixWorld);
    const group = new THREE.Group();
    const id = E.seq++;
    const num = E.implants.size + 1;
    const d = E.implantDef.diameter, L = E.implantDef.length;
    buildImplantMeshes(group, d, L);
    group.position.copy(hit.point);
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axisWorld);
    group.traverse((o) => { o.userData.implantId = id; });
    group.userData.implantId = id;
    E.scene.add(group);
    E.implants.set(id, { id, group, label: `Implante ${num}`, diameter: d, length: L });
    E.selectImplant(id); syncImplants();
  };

  E.implantDef = implantDef;
  useEffect(() => { E.implantDef = implantDef; }, [E, implantDef]);
  useEffect(() => { E.tool = tool; }, [E, tool]);
  useEffect(() => { E.gizmoMode = gizmo; E.tc.setMode(gizmo); if (selModel) E.tc.setSpace('world'); }, [E, gizmo, selModel]);

  const patchImplant = (id, patch) => {
    const it = E.implants.get(id); if (!it) return;
    Object.assign(it, patch);
    if (patch.diameter || patch.length) buildImplantMeshes(it.group, it.diameter, it.length);
    it.group.traverse((o) => { o.userData.implantId = id; });
    syncImplants();
  };
  const removeImplant = (id) => {
    const it = E.implants.get(id); if (!it) return;
    if (E.selImplant === id) { E.tc.detach(); E.selImplant = null; setSelImplant(null); }
    E.scene.remove(it.group); E.implants.delete(id); syncImplants();
  };

  // ------------------------------------------------------------ modelos
  const patchModel = (id, patch) => {
    const m = E.models.get(id); if (!m) return;
    if ('visible' in patch) m.mesh.visible = patch.visible;
    if ('opacity' in patch) {
      m.mesh.material.opacity = patch.opacity;
      m.mesh.material.transparent = patch.opacity < 1;
      m.mesh.material.depthWrite = patch.opacity >= 1;
      m.mesh.material.needsUpdate = true;
    }
    if ('color' in patch) m.mesh.material.color.set(patch.color);
    if ('role' in patch) { m.role = patch.role; m.mesh.material.color.set(roleInfo(patch.role).color); }
    syncModels();
  };
  const removeModel = (id) => {
    const m = E.models.get(id); if (!m) return;
    if (E.tc.object === m.mesh) { E.tc.detach(); setSelModel(null); }
    E.scene.remove(m.mesh); m.mesh.geometry?.dispose(); m.mesh.material?.dispose(); E.models.delete(id); syncModels();
  };
  const moveModel = (id) => {
    const m = E.models.get(id); if (!m) return;
    E.selImplant = null; setSelImplant(null);
    if (E.tc.object === m.mesh) { E.tc.detach(); setSelModel(null); return; }
    E.tc.attach(m.mesh); E.tc.setSpace('world'); setSelModel(id);
  };

  const addGeometry = useCallback((geometry, name, bytes, ext, roleOverride) => {
    geometry.deleteAttribute?.('normal');
    const merged = mergeVertices(geometry, 1e-4);
    merged.computeVertexNormals();
    const role = roleOverride || guessRole(name);
    const material = new THREE.MeshStandardMaterial({
      color: roleInfo(role).color, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide,
      clippingPlanes: E.clip?.on ? [E.clipPlane] : [],
      transparent: role === 'guia' || role === 'osso',
      opacity: role === 'guia' ? 0.8 : role === 'osso' ? 0.75 : 1,
      depthWrite: role !== 'guia',
    });
    const mesh = new THREE.Mesh(merged, material);
    const id = E.seq++;
    E.scene.add(mesh);
    E.models.set(id, { id, name, role, mesh, bytes, ext, tris: merged.index ? merged.index.count / 3 : merged.attributes.position.count / 3 });
    return id;
  }, [E]);

  // Carregamento de arquivos (.STL, .PLY e Tomografia .DCM)
  const loadFiles = useCallback(async (fileList) => {
    const rawFiles = [...fileList];
    const stlFiles = rawFiles.filter((f) => /\.(stl|ply)$/i.test(f.name));
    const dcmFiles = rawFiles.filter((f) => /\.(dcm|dicom)$/i.test(f.name) || (!f.name.includes('.') && f.size > 10000));

    if (!stlFiles.length && !dcmFiles.length) {
      toast('Envie arquivos .stl, .ply ou arquivos de tomografia .dcm', 'error');
      return;
    }

    // 1. Processa arquivos de superfície STL / PLY
    for (const f of stlFiles) {
      try {
        const buf = await f.arrayBuffer();
        const ext = f.name.split('.').pop().toLowerCase();
        const geo = ext === 'ply' ? new PLYLoader().parse(buf) : new STLLoader().parse(buf);
        addGeometry(geo, f.name, buf, ext);
      } catch (err) { toast(`Falha ao abrir ${f.name}: ${err.message}`, 'error'); }
    }

    // 2. Processa tomografia DICOM (fatia única ou múltiplas fatias)
    if (dcmFiles.length > 0) {
      try {
        toast(`Processando tomografia: ${dcmFiles.length} fatia(s) DICOM...`, 'info');
        const parsedSlices = [];
        for (const df of dcmFiles) {
          try {
            const buf = await df.arrayBuffer();
            const slice = parseDicomSlice(buf, df.name);
            parsedSlices.push(slice);
          } catch (e) {
            console.warn(`Pulo fatia ${df.name}:`, e.message);
          }
        }

        if (!parsedSlices.length) throw new Error('Nenhum dado válido extraído dos arquivos DICOM.');

        const volume = buildVolumeFromSlices(parsedSlices, 256);
        setDicomVolume(volume);
        setDicomSlices({
          axial: Math.floor(volume.dims[2] / 2),
          coronal: Math.floor(volume.dims[1] / 2),
          sagittal: Math.floor(volume.dims[0] / 2),
        });
        setViewMode('split'); // Abre automaticamente o modo lado a lado
        setTab('tomografia');
        toast(`Tomografia carregada! Volume: ${volume.dims.join(' × ')} voxels ${volume.downsampled ? '(modo otimizado)' : ''}`, 'success');
      } catch (err) {
        toast(`Erro ao carregar tomografia DICOM: ${err.message}`, 'error');
      }
    }

    syncModels(); fitView('top');
    const base = [...E.models.values()].find((m) => m.role === 'inferior' || m.role === 'superior');
    if (base) setGuideParams((g) => (g.base && E.models.has(Number(g.base)) ? g : { ...g, base: String(base.id) }));
  }, [E, addGeometry, syncModels, fitView, toast]);

  // Abertura vertical entre arcadas
  const openingRef = useRef(0);
  useEffect(() => {
    const delta = opening - openingRef.current; openingRef.current = opening;
    E.models.forEach((m) => { if (m.role === 'superior') m.mesh.position.z += delta; });
  }, [E, opening]);

  // Plano de corte
  useEffect(() => {
    E.clip = clip; E.clipPlane.constant = clip.z;
    E.models.forEach((m) => { m.mesh.material.clippingPlanes = clip.on ? [E.clipPlane] : []; m.mesh.material.needsUpdate = true; });
  }, [E, clip, models.length]);

  // Renderização contínua das fatias tomográficas nos Canvases MPR
  useEffect(() => {
    if (!dicomVolume) return;
    const [W, H, D] = dicomVolume.dims;

    // 1. Corte Axial
    if (axialCanvasRef.current) {
      const c = axialCanvasRef.current;
      c.width = W; c.height = H;
      const ctx = c.getContext('2d');
      const imgData = ctx.createImageData(W, H);
      extractAxialImageData(dicomVolume, dicomSlices.axial, dicomWw, dicomWl, imgData);
      ctx.putImageData(imgData, 0, 0);

      // Desenha mirador de implantes projetados
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5;
      implants.forEach((imp) => {
        const px = Math.round(W / 2 + imp.pos[0] / (dicomVolume.spacing[0] || 0.4));
        const py = Math.round(H / 2 - imp.pos[1] / (dicomVolume.spacing[1] || 0.4));
        if (px >= 0 && px < W && py >= 0 && py < H) {
          ctx.beginPath();
          ctx.arc(px, py, Math.max(3, (imp.diameter / 2) / (dicomVolume.spacing[0] || 0.4)), 0, Math.PI * 2);
          ctx.stroke();
        }
      });
    }

    // 2. Corte Coronal
    if (coronalCanvasRef.current) {
      const c = coronalCanvasRef.current;
      c.width = W; c.height = D;
      const ctx = c.getContext('2d');
      const imgData = ctx.createImageData(W, D);
      extractCoronalImageData(dicomVolume, dicomSlices.coronal, dicomWw, dicomWl, imgData);
      ctx.putImageData(imgData, 0, 0);
    }

    // 3. Corte Sagital
    if (sagittalCanvasRef.current) {
      const c = sagittalCanvasRef.current;
      c.width = H; c.height = D;
      const ctx = c.getContext('2d');
      const imgData = ctx.createImageData(H, D);
      extractSagittalImageData(dicomVolume, dicomSlices.sagittal, dicomWw, dicomWl, imgData);
      ctx.putImageData(imgData, 0, 0);
    }
  }, [dicomVolume, dicomSlices, dicomWw, dicomWl, implants]);

  // Função para Extrair Osso 3D da Tomografia DICOM e juntar com o Scan STL
  const extractBoneMeshFromDicom = async () => {
    if (!dicomVolume) {
      toast('Carregue uma tomografia DICOM primeiro.', 'error');
      return;
    }
    setIsExtractingBone(true);
    toast('Extraindo estrutura óssea da tomografia via Marching Cubes CAD...', 'info');

    try {
      const payload = {
        volume_base64: toBase64(dicomVolume.data.buffer),
        dims: dicomVolume.dims,
        spacing: dicomVolume.spacing,
        threshold_hu: dicomWl >= 300 ? dicomWl : 400.0,
      };

      const res = await fetch(`${CAD_URL}/api/dicom-to-bone-stl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);

      const buf = fromBase64(data.stl_base64);
      const name = `osso_tomografia_${dicomVolume.patientName.replace(/\s+/g, '_')}.stl`;
      const id = addGeometry(new STLLoader().parse(buf), name, buf, 'stl', 'osso');
      syncModels();
      toast(`Osso 3D extraído e adicionado ao visualizador: ${data.faces.toLocaleString()} triângulos!`, 'success');
      setViewMode('split');
      setTab('modelos');
    } catch (err) {
      toast(`Falha ao extrair osso da tomografia: ${err.message}`, 'error');
    } finally {
      setIsExtractingBone(false);
    }
  };

  // Motor CAD
  const checkCad = useCallback(() => {
    setCad('checking');
    fetch(`${CAD_URL}/health`).then((r) => (r.ok ? setCad('online') : setCad('offline'))).catch(() => setCad('offline'));
  }, []);
  useEffect(() => { checkCad(); }, [checkCad]);

  const generateGuide = async () => {
    const base = E.models.get(Number(guideParams.base));
    if (!base) { toast('Escolha a arcada de base do guia (aba Guia).', 'error'); return; }
    if (!E.implants.size) { toast('Marque ao menos um implante no modelo.', 'error'); return; }
    setBusy(true);
    try {
      base.mesh.updateMatrixWorld(true);
      const inv = base.mesh.matrixWorld.clone().invert();
      const payload = [...E.implants.values()].map((it) => {
        const w = readImplant(it);
        const p = new THREE.Vector3(...w.pos).applyMatrix4(inv);
        const a = new THREE.Vector3(...w.axis).transformDirection(inv);
        return { pos: p.toArray(), axis: a.toArray() };
      });
      const res = await fetch(`${CAD_URL}/api/guide-from-scan`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stl_base64: toBase64(base.bytes), file_type: base.ext, up: roleInfo(base.role).up, implants: payload,
          radius: guideParams.radius, gap: guideParams.gap, thickness: guideParams.thickness,
          hole_d: guideParams.hole_d, sleeve_od: guideParams.sleeve_od, sleeve_h: guideParams.sleeve_h,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      const buf = fromBase64(data.stl_base64);
      const id = addGeometry(new STLLoader().parse(buf), `guia_${base.name.replace(/\.\w+$/, '')}.stl`, buf, 'stl', 'guia');
      const gm = E.models.get(id).mesh;
      gm.position.copy(base.mesh.position); gm.quaternion.copy(base.mesh.quaternion); gm.scale.copy(base.mesh.scale);
      syncModels();
      setLastGuide({ id, ...data, stl_base64: undefined, buf });
      toast(`Guia gerado: ${data.faces.toLocaleString()} faces, ${data.volume_mm3} mm³, ${data.watertight ? 'malha estanque' : 'ATENÇÃO: malha não estanque'}`, data.watertight ? 'success' : 'error');
      setTab('comparar');
    } catch (err) {
      toast(`Erro ao gerar guia: ${err.message}${cad === 'offline' ? ' — motor CAD offline (npm run cad:engine)' : ''}`, 'error');
    } finally { setBusy(false); }
  };

  const exportPlan = () => {
    const plan = {
      app: 'EvaClinic', version: 1, patientId: patientId || null, createdAt: new Date().toISOString(),
      models: [...E.models.values()].map((m) => ({ name: m.name, role: m.role, matrix: m.mesh.matrixWorld.toArray() })),
      implants: [...E.implants.values()].map(readImplant), guideParams,
      dicomInfo: dicomVolume ? { patient: dicomVolume.patientName, dims: dicomVolume.dims, spacing: dicomVolume.spacing } : null,
    };
    saveBlob(JSON.stringify(plan, null, 2), `planejamento_${patientId || 'paciente'}.json`, 'application/json');
  };

  const spacing = useMemo(() => {
    const out = [];
    for (let i = 0; i < implants.length; i++) for (let j = i + 1; j < implants.length; j++) {
      const a = implants[i], b = implants[j];
      const dist = new THREE.Vector3(...a.pos).distanceTo(new THREE.Vector3(...b.pos));
      out.push({ a: a.label, b: b.label, edge: dist - (a.diameter + b.diameter) / 2 });
    }
    return out;
  }, [implants]);

  const baseModels = models.filter((m) => m.role === 'inferior' || m.role === 'superior');
  const sel = implants.find((i) => i.id === selImplant);

  // ------------------------------------------------------------------- UI
  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: isFullscreen ? '100vh' : 'calc(100vh - 150px)',
        position: isFullscreen ? 'fixed' : 'relative',
        inset: isFullscreen ? 0 : undefined,
        zIndex: isFullscreen ? 99999 : undefined,
        background: isFullscreen ? '#070b16' : undefined,
        padding: isFullscreen ? 14 : 0,
        minHeight: 620,
        gap: 12,
      }}
    >
      {/* Barra Superior de Controles e Modo de Exibição */}
      <div style={{ ...S.row, justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 20 }}>Guia Cirúrgico — Planejamento 3D & Tomografia</h1>
            {dicomVolume && (
              <span className="badge b-brand small" style={{ fontWeight: 700 }}>
                DICOM: {dicomVolume.patientName} ({dicomVolume.dims.join('×')})
              </span>
            )}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
            Abra scans STL/PLY e tomografias DICOM lado a lado, alinhe as estruturas e planeje implantes com segurança.
          </div>
        </div>

        <div style={S.row}>
          {/* Seletor de Modo de Exibição Lado a Lado */}
          <div style={{ display: 'inline-flex', background: 'var(--surface-2)', padding: 3, borderRadius: 8, border: '1px solid var(--border)' }}>
            <button style={{ ...S.btn(viewMode === '3d'), padding: '5px 9px', fontSize: 12 }} onClick={() => setViewMode('3d')}>
              <Box size={14} /> Scan 3D
            </button>
            <button style={{ ...S.btn(viewMode === 'split'), padding: '5px 9px', fontSize: 12 }} onClick={() => setViewMode('split')} title="Tomografia e Scan STL lado a lado">
              <Columns size={14} /> Lado a Lado (TC | STL)
            </button>
            <button style={{ ...S.btn(viewMode === 'dicom'), padding: '5px 9px', fontSize: 12 }} onClick={() => setViewMode('dicom')}>
              <Layers size={14} /> Tomografia MPR
            </button>
          </div>

          <button
            style={S.btn(isFullscreen)}
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Sair da Tela Cheia (ESC)' : 'Usar Guia em Tela Cheia'}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {isFullscreen ? 'Sair' : 'Tela Cheia'}
          </button>

          <select style={{ ...S.input, width: 190 }} value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            <option value="">— Paciente (opcional) —</option>
            {state.patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <span title="Motor CAD local" style={{ ...S.btn(cad === 'online'), cursor: 'pointer' }} onClick={checkCad}>
            <Cpu size={14} /> CAD: {cad === 'online' ? 'online' : cad === 'checking' ? '...' : 'offline'}
          </span>
        </div>
      </div>

      {/* Área Central: Visualizador Lado a Lado (Tomografia + 3D) + Painel Lateral */}
      <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>
        
        {/* -------------------- PAINEL TOMOGRAFIA DICOM MPR (se ativo) -------------------- */}
        {(viewMode === 'split' || viewMode === 'dicom') && (
          <div
            style={{
              ...S.panel,
              flex: viewMode === 'dicom' ? 2 : 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minWidth: 320,
            }}
          >
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={15} color="var(--brand)" />
                <strong style={{ fontSize: 13 }}>Tomografia DICOM (Multiplanar MPR)</strong>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={S.btn(false)} onClick={() => dicomFileRef.current?.click()} title="Abrir arquivo(s) DICOM">
                  <FolderOpen size={13} /> Abrir Tomografia (.DCM)
                </button>
                {dicomVolume && (
                  <button
                    style={{ ...S.btn(true), background: 'var(--brand-soft)', borderColor: 'var(--brand)' }}
                    onClick={extractBoneMeshFromDicom}
                    disabled={isExtractingBone}
                    title="Gera o modelo 3D do osso e junta no visualizador STL"
                  >
                    <Sparkles size={13} /> {isExtractingBone ? 'Extraindo...' : 'Juntar Osso 3D com Scan'}
                  </button>
                )}
              </div>
            </div>

            {dicomVolume ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 8, gap: 8, overflowY: 'auto' }}>
                {/* Janela de Ajuste Dental WW/WL */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: 'var(--surface-2)', padding: '6px 10px', borderRadius: 8 }}>
                  <span style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 700 }}>PRESET:</span>
                  {DENTAL_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      style={{ ...S.btn(dicomWw === p.ww && dicomWl === p.wl), padding: '4px 8px', fontSize: 11 }}
                      onClick={() => { setDicomWw(p.ww); setDicomWl(p.wl); }}
                    >
                      {p.label}
                    </button>
                  ))}
                  <div style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-2)' }}>
                    WL: {dicomWl} HU | WW: {dicomWw} HU {probeHu !== null && <b style={{ color: 'var(--brand)', marginLeft: 8 }}>Densidade: {probeHu} HU</b>}
                  </div>
                </div>

                {/* Grid dos 3 Cortes Tomográficos (Axial, Coronal, Sagital) */}
                <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'dicom' ? '1fr 1fr 1fr' : '1fr 1fr', gap: 8, flex: 1, minHeight: 0 }}>
                  
                  {/* 1. Corte Axial */}
                  <div style={{ background: '#000', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 6, left: 8, fontSize: 11, fontWeight: 700, color: '#38bdf8', zIndex: 1, textShadow: '0 1px 2px #000' }}>
                      Axial (Z: {dicomSlices.axial + 1}/{dicomVolume.dims[2]})
                    </div>
                    <div style={{ flex: 1, display: 'grid', placeItems: 'center', background: '#030712' }}>
                      <canvas
                        ref={axialCanvasRef}
                        style={{ maxWidth: '100%', maxHeight: 220, objectFit: 'contain', cursor: 'crosshair' }}
                        onMouseMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = Math.floor(((e.clientX - rect.left) / rect.width) * dicomVolume.dims[0]);
                          const y = Math.floor(((e.clientY - rect.top) / rect.height) * dicomVolume.dims[1]);
                          const idx = dicomSlices.axial * dicomVolume.dims[0] * dicomVolume.dims[1] + y * dicomVolume.dims[0] + x;
                          if (idx >= 0 && idx < dicomVolume.data.length) setProbeHu(dicomVolume.data[idx]);
                        }}
                        onMouseLeave={() => setProbeHu(null)}
                      />
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={dicomVolume.dims[2] - 1}
                      value={dicomSlices.axial}
                      style={{ width: '100%', margin: 0 }}
                      onChange={(e) => setDicomSlices((s) => ({ ...s, axial: parseInt(e.target.value, 10) }))}
                    />
                  </div>

                  {/* 2. Corte Coronal (Frontal) */}
                  <div style={{ background: '#000', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 6, left: 8, fontSize: 11, fontWeight: 700, color: '#a78bfa', zIndex: 1, textShadow: '0 1px 2px #000' }}>
                      Coronal / Panorâmico (Y: {dicomSlices.coronal + 1}/{dicomVolume.dims[1]})
                    </div>
                    <div style={{ flex: 1, display: 'grid', placeItems: 'center', background: '#030712' }}>
                      <canvas ref={coronalCanvasRef} style={{ maxWidth: '100%', maxHeight: 220, objectFit: 'contain' }} />
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={dicomVolume.dims[1] - 1}
                      value={dicomSlices.coronal}
                      style={{ width: '100%', margin: 0 }}
                      onChange={(e) => setDicomSlices((s) => ({ ...s, coronal: parseInt(e.target.value, 10) }))}
                    />
                  </div>

                  {/* 3. Corte Sagital (Transversal de crista alveolar) */}
                  <div style={{ background: '#000', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 6, left: 8, fontSize: 11, fontWeight: 700, color: '#34d399', zIndex: 1, textShadow: '0 1px 2px #000' }}>
                      Sagital / Transversal (X: {dicomSlices.sagittal + 1}/{dicomVolume.dims[0]})
                    </div>
                    <div style={{ flex: 1, display: 'grid', placeItems: 'center', background: '#030712' }}>
                      <canvas ref={sagittalCanvasRef} style={{ maxWidth: '100%', maxHeight: 220, objectFit: 'contain' }} />
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={dicomVolume.dims[0] - 1}
                      value={dicomSlices.sagittal}
                      style={{ width: '100%', margin: 0 }}
                      onChange={(e) => setDicomSlices((s) => ({ ...s, sagittal: parseInt(e.target.value, 10) }))}
                    />
                  </div>

                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 20, color: 'var(--text-3)' }}>
                <div>
                  <Layers size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-2)' }}>Nenhuma Tomografia Carregada</div>
                  <div style={{ fontSize: 12.5, maxWidth: 360, margin: '8px auto 14px' }}>
                    Arraste arquivos <code>.dcm</code> ou clique em "Abrir Tomografia" para visualizar os cortes MPR e superpor com o scan STL.
                  </div>
                  <button style={S.btn(true)} onClick={() => dicomFileRef.current?.click()}>
                    <FolderOpen size={14} /> Selecionar Arquivos DICOM
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* -------------------- VIEWPORT THREE.JS 3D (Scan STL & Guia) -------------------- */}
        {(viewMode === '3d' || viewMode === 'split') && (
          <div
            style={{
              ...S.panel,
              flex: 1,
              position: 'relative',
              overflow: 'hidden',
              outline: dragOver ? '2px dashed var(--brand)' : 'none',
            }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); loadFiles(e.dataTransfer.files); }}
          >
            <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />

            {/* Barra de Ferramentas Superior do Viewport 3D */}
            <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6, flexWrap: 'wrap', zIndex: 10 }}>
              <button style={S.btn(false)} onClick={() => fileRef.current?.click()}>
                <FolderOpen size={14} /> Abrir STL / PLY
              </button>
              <button style={S.btn(false)} onClick={() => dicomFileRef.current?.click()} title="Carregar tomografia computadorizada">
                <Layers size={14} /> Tomografia (.DCM)
              </button>
              <button style={S.btn(tool === 'navegar')} onClick={() => setTool('navegar')}>
                <MousePointer2 size={14} /> Navegar
              </button>
              <button style={S.btn(tool === 'implante')} onClick={() => setTool('implante')}>
                <Crosshair size={14} /> Posicionar implante
              </button>
              {(selImplant || selModel) && (
                <>
                  <button style={S.btn(gizmo === 'translate')} onClick={() => setGizmo('translate')}>
                    <Move size={14} /> Mover
                  </button>
                  <button style={S.btn(gizmo === 'rotate')} onClick={() => setGizmo('rotate')}>
                    <RotateCw size={14} /> Girar
                  </button>
                </>
              )}
            </div>

            {/* Presets de Ângulo de Câmera */}
            <div style={{ position: 'absolute', bottom: 10, left: 10, display: 'flex', gap: 6, zIndex: 10 }}>
              {[['top', 'Oclusal'], ['front', 'Frontal'], ['left', 'Esq.'], ['right', 'Dir.'], ['back', 'Post.']].map(([v, l]) => (
                <button key={v} style={S.btn(false)} onClick={() => fitView(v)}>{l}</button>
              ))}
              <button style={S.btn(false)} onClick={() => fitView('top')} title="Ajustar Enquadramento">
                <Maximize2 size={14} />
              </button>
            </div>

            {!models.length && (
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', textAlign: 'center', color: 'var(--text-2)' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Arraste os arquivos .STL / .PLY ou Tomografia .DCM aqui</div>
                  <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6 }}>
                    Abra arcada superior, inferior, osso tomográfico ou guia para planejar e comparar.
                  </div>
                </div>
              </div>
            )}

            <input ref={fileRef} type="file" accept=".stl,.ply" multiple hidden onChange={(e) => { loadFiles(e.target.files); e.target.value = ''; }} />
            <input ref={dicomFileRef} type="file" accept=".dcm,.dicom" multiple hidden onChange={(e) => { loadFiles(e.target.files); e.target.value = ''; }} />
          </div>
        )}

        {/* -------------------- PAINEL LATERAL DE CONFIGURAÇÃO E GUIAS -------------------- */}
        <div style={{ ...S.panel, width: 330, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            {[['modelos', 'Modelos'], ['implantes', 'Implantes'], ['guia', 'Guia'], ['comparar', 'Comparar']].map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                style={{
                  flex: 1, padding: '11px 4px', fontSize: 12.5, fontWeight: 700, background: 'none',
                  cursor: 'pointer', border: 'none', color: tab === k ? 'var(--brand)' : 'var(--text-3)',
                  borderBottom: `2px solid ${tab === k ? 'var(--brand)' : 'transparent'}`,
                }}
              >
                {l}
              </button>
            ))}
          </div>

          <div style={{ padding: 14, overflowY: 'auto', flex: 1 }}>
            {tab === 'modelos' && (
              <>
                {!models.length && <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Nenhum arquivo 3D aberto.</div>}
                {models.map((m) => (
                  <div key={m.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 10, marginBottom: 10 }}>
                    <div style={{ ...S.row, justifyContent: 'space-between' }}>
                      <strong style={{ fontSize: 13, wordBreak: 'break-all' }}>{m.name}</strong>
                      <button style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer' }} onClick={() => patchModel(m.id, { visible: !m.visible })}>
                        {m.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{Math.round(m.tris).toLocaleString()} triângulos</div>
                    <select style={{ ...S.input, margin: '8px 0' }} value={m.role} onChange={(e) => patchModel(m.id, { role: e.target.value })}>
                      {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                    <label style={{ fontSize: 12, color: 'var(--text-2)' }}>Opacidade {Math.round(m.opacity * 100)}%
                      <input type="range" min={0.1} max={1} step={0.05} value={m.opacity} style={{ width: '100%' }} onChange={(e) => patchModel(m.id, { opacity: parseFloat(e.target.value) })} />
                    </label>
                    <div style={{ ...S.row, marginTop: 6 }}>
                      <button style={S.btn(selModel === m.id)} onClick={() => moveModel(m.id)}>
                        <Move size={13} /> Mover/Girar
                      </button>
                      <button style={S.btn(false)} onClick={() => removeModel(m.id)}>
                        <Trash2 size={13} /> Remover
                      </button>
                    </div>
                  </div>
                ))}
                {selModel && (
                  <div style={{ fontSize: 12, color: 'var(--warn)' }}>
                    Gizmo ativo no modelo: use Mover/Girar na barra do visualizador para translação ou rotação (alinhamento manual com o osso tomográfico).
                  </div>
                )}
                <div style={S.label}>Abertura vertical (superior): {opening.toFixed(1)} mm</div>
                <input type="range" min={0} max={20} step={0.5} value={opening} style={{ width: '100%' }} onChange={(e) => setOpening(parseFloat(e.target.value))} />
                <div style={S.label}>Plano de corte axial</div>
                <label style={{ ...S.row, fontSize: 13 }}>
                  <input type="checkbox" checked={clip.on} onChange={(e) => setClip((c) => ({ ...c, on: e.target.checked }))} /> Ativar (corta acima de Z)
                </label>
                <input type="range" min={0} max={45} step={0.25} value={clip.z} disabled={!clip.on} style={{ width: '100%' }} onChange={(e) => setClip((c) => ({ ...c, z: parseFloat(e.target.value) }))} />
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Z = {clip.z.toFixed(2)} mm</div>
              </>
            )}

            {tab === 'implantes' && (
              <>
                <div style={S.label}>Novo implante (padrão)</div>
                <div style={{ ...S.row }}>
                  <select style={S.input} value={implantDef.diameter} onChange={(e) => setImplantDef((d) => ({ ...d, diameter: parseFloat(e.target.value) }))}>
                    {IMPLANT_D.map((d) => <option key={d} value={d}>Ø {d} mm</option>)}
                  </select>
                  <select style={S.input} value={implantDef.length} onChange={(e) => setImplantDef((d) => ({ ...d, length: parseFloat(e.target.value) }))}>
                    {IMPLANT_L.map((d) => <option key={d} value={d}>{d} mm</option>)}
                  </select>
                </div>
                <button style={{ ...S.btn(tool === 'implante'), marginTop: 8, width: '100%', justifyContent: 'center' }} onClick={() => setTool('implante')}>
                  <Crosshair size={14} /> Clique no modelo para posicionar
                </button>
                <div style={S.label}>Implantes ({implants.length})</div>
                {!implants.length && <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Ative "Posicionar implante" e clique na arcada ou osso.</div>}
                {implants.map((i) => (
                  <div key={i.id} onClick={() => E.selectImplant(i.id)} style={{ border: `1px solid ${selImplant === i.id ? 'var(--brand)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', padding: 10, marginBottom: 8, cursor: 'pointer' }}>
                    <div style={{ ...S.row, justifyContent: 'space-between' }}>
                      <input style={{ ...S.input, width: 140 }} value={i.label} onClick={(e) => e.stopPropagation()} onChange={(e) => patchImplant(i.id, { label: e.target.value })} />
                      <button style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); removeImplant(i.id); }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 6 }}>Ø {i.diameter} × {i.length} mm · inclinação {i.tilt.toFixed(1)}°</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>({i.pos.map((v) => v.toFixed(1)).join(', ')})</div>
                  </div>
                ))}
                {sel && (
                  <>
                    <div style={S.label}>Implante selecionado</div>
                    <div style={S.row}>
                      <select style={S.input} value={sel.diameter} onChange={(e) => patchImplant(sel.id, { diameter: parseFloat(e.target.value) })}>
                        {IMPLANT_D.map((d) => <option key={d} value={d}>Ø {d} mm</option>)}
                      </select>
                      <select style={S.input} value={sel.length} onChange={(e) => patchImplant(sel.id, { length: parseFloat(e.target.value) })}>
                        {IMPLANT_L.map((d) => <option key={d} value={d}>{d} mm</option>)}
                      </select>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
                      O implante é sincronizado com as fatias da tomografia. Use Mover/Girar no 3D para ajustar a profundidade no osso.
                    </div>
                  </>
                )}
                {spacing.length > 0 && (
                  <>
                    <div style={S.label}>Distância entre implantes</div>
                    {spacing.map((s, k) => (
                      <div key={k} style={{ fontSize: 12.5, color: s.edge < MIN_EDGE_MM ? 'var(--danger)' : 'var(--ok)' }}>
                        {s.a} ↔ {s.b}: {s.edge.toFixed(1)} mm {s.edge < MIN_EDGE_MM ? `(mínimo ${MIN_EDGE_MM} mm)` : '✓'}
                      </div>
                    ))}
                  </>
                )}
              </>
            )}

            {tab === 'guia' && (
              <>
                <div style={S.label}>Arcada de base do guia</div>
                <select style={S.input} value={guideParams.base} onChange={(e) => setGuideParams((g) => ({ ...g, base: e.target.value }))}>
                  <option value="">— selecione —</option>
                  {baseModels.map((m) => <option key={m.id} value={m.id}>{m.name} ({roleInfo(m.role).label})</option>)}
                </select>
                <div style={S.label}>Parâmetros CAD (mm)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <Num label="Espessura" value={guideParams.thickness} min={1.5} max={6} onChange={(v) => setGuideParams((g) => ({ ...g, thickness: v }))} />
                  <Num label="Folga (gap)" value={guideParams.gap} min={0} max={0.5} step={0.05} onChange={(v) => setGuideParams((g) => ({ ...g, gap: v }))} />
                  <Num label="Furo da broca Ø" value={guideParams.hole_d} onChange={(v) => setGuideParams((g) => ({ ...g, hole_d: v }))} />
                  <Num label="Sleeve Ø externo" value={guideParams.sleeve_od} onChange={(v) => setGuideParams((g) => ({ ...g, sleeve_od: v }))} />
                  <Num label="Altura sleeve" value={guideParams.sleeve_h} onChange={(v) => setGuideParams((g) => ({ ...g, sleeve_h: v }))} />
                  <Num label="Raio de apoio" value={guideParams.radius} step={1} min={6} max={30} onChange={(v) => setGuideParams((g) => ({ ...g, radius: v }))} />
                </div>
                <button
                  disabled={busy || cad !== 'online'}
                  onClick={generateGuide}
                  style={{ ...S.btn(true), width: '100%', justifyContent: 'center', marginTop: 16, padding: 11, opacity: busy || cad !== 'online' ? 0.5 : 1 }}
                >
                  <Scissors size={15} /> {busy ? 'Calculando guia no CAD...' : 'Gerar guia cirúrgico estanque'}
                </button>
                {cad !== 'online' && (
                  <div style={{ fontSize: 12, color: 'var(--warn)', marginTop: 8 }}>
                    Motor CAD offline. Execute <code>npm run cad:engine</code> para habilitar o cálculo 3D.
                  </div>
                )}
              </>
            )}

            {tab === 'comparar' && (
              <>
                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                  Sobreponha o guia cirúrgico calculado, os scans intraorais e o osso tomográfico usando opacidade e corte transversal.
                </div>
                {lastGuide && (
                  <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 10, marginTop: 12, fontSize: 12.5 }}>
                    <strong>Último guia gerado</strong>
                    <div>Faces: {lastGuide.faces.toLocaleString()}</div>
                    <div>Volume: {lastGuide.volume_mm3} mm³</div>
                    <div>Dimensões: {lastGuide.extents_mm.join(' × ')} mm</div>
                    <div style={{ color: lastGuide.watertight ? 'var(--ok)' : 'var(--danger)' }}>
                      {lastGuide.watertight ? 'Malha estanque para impressão 3D ✓' : 'Malha não estanque'}
                    </div>
                    <button
                      style={{ ...S.btn(true), marginTop: 8, width: '100%', justifyContent: 'center' }}
                      onClick={() => saveBlob(lastGuide.buf, `guia_cirurgico${patientId ? '_' + patientId : ''}.stl`, 'model/stl')}
                    >
                      <Download size={14} /> Baixar Guia Cirúrgico (.STL)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
            <button style={{ ...S.btn(false), width: '100%', justifyContent: 'center' }} onClick={exportPlan}>
              <Save size={14} /> Exportar Planejamento Completo (.JSON)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
