import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useApp } from '../store/AppContext';
import { toothName, toothType, isUpper, CONDITIONS } from '../lib/dental';
import {
  Target,
  RotateCw,
  Download,
  LocateFixed,
  Layers,
  Settings2,
  ChevronRight,
  ChevronLeft,
  Plus,
  Minus,
  Info,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Zap,
  ArrowLeft,
  Crosshair,
  Ruler,
  Activity,
  Package,
  Printer,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
} from 'lucide-react';

// ===========================================================================
// DADOS CLÍNICOS: SISTEMAS DE IMPLANTE E BROCAS
// ===========================================================================
const IMPLANT_SYSTEMS = [
  { id: 'neodent', name: 'Neodent Grand Morse', country: 'Brasil' },
  { id: 'straumann', name: 'Straumann BLT', country: 'Suíça' },
  { id: 'biomet3i', name: 'Biomet 3i T3', country: 'EUA' },
  { id: 'nobelbiocare', name: 'Nobel Biocare Active', country: 'Suécia' },
  { id: 'implamed', name: 'Implamed Unitite', country: 'Brasil' },
  { id: 'osstem', name: 'Osstem TSIII', country: 'Coreia' },
];

const IMPLANT_DIAMETERS = [3.3, 3.5, 3.75, 4.0, 4.3, 4.5, 5.0, 5.5];
const IMPLANT_LENGTHS = [7, 8, 10, 11.5, 13, 15, 16];

const BONE_QUALITY = [
  { id: 'D1', label: 'D1 — Osso cortical denso', color: '#dc2626', description: 'Alta densidade, torque elevado' },
  { id: 'D2', label: 'D2 — Cortical espessa + trabecular fino', color: '#f97316', description: 'Densidade boa, boa estabilidade primária' },
  { id: 'D3', label: 'D3 — Cortical fina + trabecular grosso', color: '#eab308', description: 'Densidade moderada, cuidado no torque' },
  { id: 'D4', label: 'D4 — Trabecular fino pouco denso', color: '#a855f7', description: 'Baixa densidade, risco de falha' },
];

const GUIDE_TYPES = [
  { id: 'mucosa', label: 'Suportado por Mucosa', icon: '🦷', desc: 'Apoia diretamente na gengiva' },
  { id: 'dente', label: 'Suportado por Dentes', icon: '🔩', desc: 'Ancora em dentes adjacentes' },
  { id: 'osso', label: 'Suportado por Osso', icon: '🦴', desc: 'Fixado diretamente ao osso' },
];

// Parâmetros padrão por tipo de dente
const DEFAULT_PARAMS_BY_TYPE = {
  incisor:  { diameter: 3.5, length: 11.5, angle: 0, depth: 2, torque: 35 },
  canine:   { diameter: 3.75, length: 13, angle: 0, depth: 2, torque: 35 },
  premolar: { diameter: 4.0, length: 11.5, angle: 5, depth: 2, torque: 35 },
  molar:    { diameter: 4.3, length: 10, angle: 0, depth: 2, torque: 35 },
};

// ===========================================================================
// VISUALIZADOR 3D: IMPLANTE NO ALVÉOLO ÓSSEO
// ===========================================================================
function ImplantViewer3D({ toothNum, params, showBone, showGuide, showNeighbors }) {
  const mountRef = useRef(null);
  const ctx = useRef({});
  const animRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = el.clientWidth, H = el.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    el.appendChild(renderer.domElement);

    // Cena
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1a);
    scene.fog = new THREE.FogExp2(0x0a0f1a, 0.03);

    // Câmera
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.01, 60);
    camera.position.set(3, 4, 6);
    camera.lookAt(0, 0, 0);

    // Controles
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1;
    controls.maxDistance = 18;
    controls.target.set(0, -1, 0);

    // Iluminação clínica
    const ambient = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfff8f0, 1.6);
    keyLight.position.set(4, 8, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe0f4ff, 0.7);
    fillLight.position.set(-4, 3, -2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
    rimLight.position.set(0, -2, -5);
    scene.add(rimLight);

    // Grade cirúrgica de referência
    const gridHelper = new THREE.GridHelper(12, 24, 0x1e3a5f, 0x0f2040);
    gridHelper.position.y = -4.5;
    scene.add(gridHelper);

    // Axes de planejamento
    const axesGroup = new THREE.Group();

    // Linha de eixo do implante (vertical)
    const axisGeo = new THREE.CylinderGeometry(0.015, 0.015, 14, 8);
    const axisMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.4 });
    const axisMesh = new THREE.Mesh(axisGeo, axisMat);
    axisMesh.position.y = 2.5;
    axesGroup.add(axisMesh);

    // Cruz de centralização no topo
    [-1, 1].forEach((dir) => {
      const lineGeo = new THREE.CylinderGeometry(0.01, 0.01, 1.5, 6);
      lineGeo.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI / 2));
      const lineMesh = new THREE.Mesh(lineGeo, new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.3 }));
      lineMesh.position.set(0.4 * dir, 5.5, 0);
      axesGroup.add(lineMesh);
    });

    scene.add(axesGroup);

    ctx.current = { renderer, scene, camera, controls, axesGroup };

    // Resize
    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(el);

    // Loop
    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  // Recria o modelo 3D sempre que os parâmetros mudam
  useEffect(() => {
    const { scene } = ctx.current;
    if (!scene) return;

    // Remove modelos anteriores (exceto luz, grid, axes)
    const toRemove = [];
    scene.traverse((obj) => {
      if (obj.userData.model) toRemove.push(obj);
    });
    toRemove.forEach((obj) => scene.remove(obj));

    const type = toothType(toothNum) || 'molar';
    const upper = isUpper(toothNum);
    const dir = upper ? 1 : -1;

    const d = params.diameter / 10; // cm
    const L = params.length / 10;   // cm
    const angleRad = (params.angle * Math.PI) / 180;

    // ── Bloco ósseo (representação do alvéolo) ──
    if (showBone) {
      const boneGroup = new THREE.Group();
      boneGroup.userData.model = true;

      // Osso cortical (exterior mais denso)
      const cortGeo = new THREE.CylinderGeometry(d * 2.8, d * 2.9, L * 1.6, 32, 1, true);
      const cortMat = new THREE.MeshStandardMaterial({
        color: 0xf5deb3,
        roughness: 0.85,
        metalness: 0.05,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.55,
      });
      const cortMesh = new THREE.Mesh(cortGeo, cortMat);
      cortMesh.position.y = -L * 0.3 * dir;
      boneGroup.add(cortMesh);

      // Osso trabecular (interior esponjoso)
      const trabGeo = new THREE.CylinderGeometry(d * 2.6, d * 2.7, L * 1.45, 32, 1, true);
      const trabMat = new THREE.MeshStandardMaterial({
        color: 0xffe4c4,
        roughness: 0.9,
        metalness: 0.02,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.35,
      });
      const trabMesh = new THREE.Mesh(trabGeo, trabMat);
      trabMesh.position.y = -L * 0.3 * dir;
      boneGroup.add(trabMesh);

      // Alvéolo preparado (furo cilíndrico escuro)
      const holeGeo = new THREE.CylinderGeometry(d * 0.52, d * 0.5, L * 1.1, 24);
      const holeMat = new THREE.MeshStandardMaterial({ color: 0x1a0a00, roughness: 1 });
      const holeMesh = new THREE.Mesh(holeGeo, holeMat);
      holeMesh.position.y = -L * 0.25 * dir;
      boneGroup.add(holeMesh);

      // Gengiva (mucosa ao redor)
      const ginGeo = new THREE.CylinderGeometry(d * 3.2, d * 3.0, 0.3, 32);
      const ginMat = new THREE.MeshStandardMaterial({ color: 0xe07070, roughness: 0.7, metalness: 0.0 });
      const ginMesh = new THREE.Mesh(ginGeo, ginMat);
      ginMesh.position.y = 0.05;
      boneGroup.add(ginMesh);

      // Linha da crista óssea
      const cristaGeo = new THREE.TorusGeometry(d * 2.75, 0.025, 8, 32);
      const cristaMat = new THREE.MeshStandardMaterial({ color: 0xf0c060, roughness: 0.5 });
      const cristaMesh = new THREE.Mesh(cristaGeo, cristaMat);
      cristaMesh.position.y = -0.05;
      cristaGeo.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
      boneGroup.add(cristaMesh);

      boneGroup.rotation.z = angleRad;
      scene.add(boneGroup);
    }

    // ── Implante (fixture de titânio) ──
    const implantGroup = new THREE.Group();
    implantGroup.userData.model = true;

    // Corpo do implante (roscado)
    const rSegments = 6;
    const points = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const r = d * 0.5 * (1 - t * 0.08); // leve conicidade apical
      const y = -t * L;
      points.push(new THREE.Vector2(r, y));
    }
    const implGeo = new THREE.LatheGeometry(points, 32);

    // Roscas helicoidais (simuladas por marcações no UV)
    // Usamos um custom material titanium-like
    const implMat = new THREE.MeshStandardMaterial({
      color: 0xc8d8e8,
      roughness: 0.22,
      metalness: 0.96,
      envMapIntensity: 0.8,
    });
    const implMesh = new THREE.Mesh(implGeo, implMat);
    implMesh.castShadow = true;
    implantGroup.add(implMesh);

    // Anel cervical (plataforma protética)
    const collarGeo = new THREE.CylinderGeometry(d * 0.58, d * 0.52, 0.15, 32);
    const collarMat = new THREE.MeshStandardMaterial({ color: 0xd0dde8, roughness: 0.15, metalness: 0.98 });
    const collarMesh = new THREE.Mesh(collarGeo, collarMat);
    collarMesh.position.y = 0.07;
    implantGroup.add(collarMesh);

    // Caixa interna hexagonal (conexão)
    const hexGeo = new THREE.CylinderGeometry(d * 0.25, d * 0.25, 0.25, 6);
    const hexMat = new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.3, metalness: 0.9 });
    const hexMesh = new THREE.Mesh(hexGeo, hexMat);
    hexMesh.position.y = 0.2;
    implantGroup.add(hexMesh);

    // Pilares de encaixe (abutment mockup)
    const abutGeo = new THREE.CylinderGeometry(d * 0.38, d * 0.45, 0.6, 16);
    const abutMat = new THREE.MeshStandardMaterial({ color: 0xb8c8d4, roughness: 0.2, metalness: 0.95 });
    const abutMesh = new THREE.Mesh(abutGeo, abutMat);
    abutMesh.position.y = 0.45;
    implantGroup.add(abutMesh);

    // Coroa protética (representação simplificada)
    const crownGeo = new THREE.SphereGeometry(d * 0.72, 24, 16);
    crownGeo.scale(1, 0.65, 0.85);
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0xfaf5e4,
      roughness: 0.35,
      metalness: 0.0,
      transparent: true,
      opacity: 0.88,
    });
    const crownMesh = new THREE.Mesh(crownGeo, crownMat);
    crownMesh.position.y = 0.85;
    implantGroup.add(crownMesh);

    // Linhas de referência de profundidade
    [0.25, 0.5, 0.75, 1.0].forEach((t) => {
      const ringGeo = new THREE.TorusGeometry(d * 0.55, 0.018, 6, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: t === params.depth / params.length ? 0xff9900 : 0x00aaff,
        transparent: true,
        opacity: 0.6,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = -t * L;
      ring.rotation.x = Math.PI / 2;
      implantGroup.add(ring);
    });

    // Marca de profundidade do colo ósseo (depth param)
    const depthY = -(params.depth / 10);
    const depthRingGeo = new THREE.TorusGeometry(d * 0.62, 0.03, 8, 32);
    const depthRingMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    const depthRing = new THREE.Mesh(depthRingGeo, depthRingMat);
    depthRing.position.y = depthY;
    depthRing.rotation.x = Math.PI / 2;
    implantGroup.add(depthRing);

    implantGroup.position.y = 0.15;
    implantGroup.rotation.z = angleRad;
    scene.add(implantGroup);

    // ── Guia cirúrgico (anel de aço inox) ──
    if (showGuide) {
      const guideGroup = new THREE.Group();
      guideGroup.userData.model = true;

      // Anel superior (a manga do guia)
      const sleeveGeo = new THREE.CylinderGeometry(d * 0.72, d * 0.68, 0.6, 32);
      const sleeveMat = new THREE.MeshStandardMaterial({
        color: 0x607080,
        roughness: 0.3,
        metalness: 0.92,
        transparent: true,
        opacity: 0.82,
      });
      const sleeveMesh = new THREE.Mesh(sleeveGeo, sleeveMat);
      sleeveMesh.position.y = 0.3;
      guideGroup.add(sleeveMesh);

      // Corpo resina do guia
      const guideBodyGeo = new THREE.CylinderGeometry(d * 2.2, d * 2.4, 0.45, 32);
      const guideBodyMat = new THREE.MeshStandardMaterial({
        color: 0x4488cc,
        roughness: 0.4,
        metalness: 0.1,
        transparent: true,
        opacity: 0.35,
      });
      const guideBodyMesh = new THREE.Mesh(guideBodyGeo, guideBodyMat);
      guideBodyMesh.position.y = 0.55;
      guideGroup.add(guideBodyMesh);

      guideGroup.rotation.z = angleRad;
      scene.add(guideGroup);
    }

    // ── Dentes vizinhos (contexto anatômico) ──
    if (showNeighbors) {
      [-1, 1].forEach((side) => {
        const neighGeo = new THREE.SphereGeometry(d * 0.85, 16, 12);
        neighGeo.scale(1, 1.2, 0.9);
        const neighMat = new THREE.MeshStandardMaterial({
          color: 0xf5f0e8,
          roughness: 0.4,
          metalness: 0.0,
          transparent: true,
          opacity: 0.5,
        });
        const neighMesh = new THREE.Mesh(neighGeo, neighMat);
        neighMesh.userData.model = true;
        neighMesh.position.set(side * (d * 1.8 + 0.35), 0.7, 0);
        scene.add(neighMesh);
      });
    }
  }, [params, toothNum, showBone, showGuide, showNeighbors]);

  return (
    <div
      ref={mountRef}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0a0f1a 0%, #0f1e35 100%)',
      }}
    />
  );
}

// ===========================================================================
// COMPONENTE PRINCIPAL
// ===========================================================================
export default function SurgicalGuide() {
  const { state, dispatch, toast } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const patientId = searchParams.get('patient') || null;
  const toothParam = parseInt(searchParams.get('tooth') || '36', 10);

  // Dados do paciente
  const patient = useMemo(
    () => state.patients.find((p) => p.id === patientId) || null,
    [state.patients, patientId]
  );

  // Dente selecionado
  const [selectedTooth, setSelectedTooth] = useState(toothParam);

  // Parâmetros do implante
  const type = toothType(selectedTooth);
  const defaultP = DEFAULT_PARAMS_BY_TYPE[type] || DEFAULT_PARAMS_BY_TYPE.molar;

  const [params, setParams] = useState({
    system: 'neodent',
    diameter: defaultP.diameter,
    length: defaultP.length,
    angle: defaultP.angle,
    depth: defaultP.depth,
    torque: defaultP.torque,
    bone: 'D2',
    guideType: 'dente',
  });

  const [showBone, setShowBone] = useState(true);
  const [showGuide, setShowGuide] = useState(true);
  const [showNeighbors, setShowNeighbors] = useState(true);
  const [activeTab, setActiveTab] = useState('implante'); // 'implante' | 'guia' | 'protocolo'
  const [saved, setSaved] = useState(false);

  // Dentes com implante planejado no odontograma do paciente
  const teethWithImplant = useMemo(() => {
    if (!patient) return [];
    const odonto = (state.odontogram && state.odontogram[patient.id]) || {};
    return Object.entries(odonto)
      .filter(([, entries]) => entries.some((e) => e.condition === 'implante' || e.condition === 'ausente'))
      .map(([num]) => parseInt(num, 10));
  }, [patient, state.odontogram]);

  // Carrega planejamento salvo para o dente selecionado se existir
  useEffect(() => {
    const existing = (state.surgicalGuides || []).find(
      (g) => (g.patientId === (patient?.id || null)) && g.toothNumber === selectedTooth
    );
    if (existing) {
      setParams({
        system: existing.system || 'neodent',
        diameter: existing.diameter,
        length: existing.length,
        angle: existing.angle,
        depth: existing.depth,
        torque: existing.torque,
        bone: existing.bone || 'D2',
        guideType: existing.guideType || 'dente',
      });
      setSaved(true);
    } else {
      const t = toothType(selectedTooth);
      const d = DEFAULT_PARAMS_BY_TYPE[t] || DEFAULT_PARAMS_BY_TYPE.molar;
      setParams((prev) => ({ ...prev, diameter: d.diameter, length: d.length, angle: d.angle, depth: d.depth, torque: d.torque }));
      setSaved(false);
    }
  }, [selectedTooth, patient?.id, state.surgicalGuides]);

  const setParam = useCallback((key, val) => {
    setParams((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
  }, []);

  const boneQuality = BONE_QUALITY.find((b) => b.id === params.bone);
  const systemInfo = IMPLANT_SYSTEMS.find((s) => s.id === params.system);

  // Análise de risco automática
  const riskAnalysis = useMemo(() => {
    const risks = [];
    if (params.bone === 'D4') risks.push({ level: 'alto', msg: 'Osso D4: alta taxa de insucesso primário. Considere enxerto ósseo.' });
    if (params.bone === 'D3' && params.diameter < 4.0) risks.push({ level: 'medio', msg: 'Diâmetro reduzido em osso D3: avalie implante mais largo.' });
    if (params.angle > 15) risks.push({ level: 'medio', msg: 'Angulação > 15°: planeje componente angulado para a prótese.' });
    if (params.angle > 25) risks.push({ level: 'alto', msg: 'Angulação crítica > 25°: revise posicionamento anatômico.' });
    if (params.length < 8 && params.bone !== 'D1') risks.push({ level: 'medio', msg: 'Implante curto (< 8mm): estabilidade primária reduzida.' });
    if (params.torque > 45) risks.push({ level: 'alto', msg: 'Torque > 45 Ncm: risco de micro-fratura óssea.' });
    return risks;
  }, [params]);

  const handleSave = () => {
    dispatch({
      type: 'SAVE_SURGICAL_GUIDE',
      guide: {
        patientId: patient?.id || null,
        toothNumber: selectedTooth,
        system: params.system,
        diameter: params.diameter,
        length: params.length,
        angle: params.angle,
        depth: params.depth,
        torque: params.torque,
        bone: params.bone,
        guideType: params.guideType,
      },
    });
    toast(`Planejamento cirúrgico do dente #${selectedTooth} salvo com sucesso!`, 'success');
    setSaved(true);
  };

  // Relatório PDF (simulado como texto estruturado)
  const handleExportReport = () => {
    const lines = [
      '═══════════════════════════════════════════════════',
      '   EVA CLINIC — PLANEJAMENTO CIRÚRGICO GUIADO',
      '═══════════════════════════════════════════════════',
      '',
      `Paciente: ${patient?.name || 'Não especificado'}`,
      `Dente: #${selectedTooth} — ${toothName(selectedTooth)}`,
      `Data: ${new Date().toLocaleDateString('pt-BR')}`,
      '',
      '── SISTEMA DE IMPLANTE ──────────────────────────',
      `Sistema: ${systemInfo?.name} (${systemInfo?.country})`,
      `Diâmetro: ${params.diameter} mm`,
      `Comprimento: ${params.length} mm`,
      `Angulação: ${params.angle}°`,
      `Profundidade sub-crestal: ${params.depth} mm`,
      `Torque de inserção: ${params.torque} Ncm`,
      '',
      '── OSSO E GUIA ──────────────────────────────────',
      `Qualidade óssea: ${boneQuality?.label}`,
      `Tipo de guia: ${GUIDE_TYPES.find((g) => g.id === params.guideType)?.label}`,
      '',
      '── ANÁLISE DE RISCO ─────────────────────────────',
      riskAnalysis.length === 0
        ? '✓ Nenhum risco identificado automaticamente.'
        : riskAnalysis.map((r) => `[${r.level.toUpperCase()}] ${r.msg}`).join('\n'),
      '',
      '── PROTOCOLO CIRÚRGICO ──────────────────────────',
      '1. Tomografia CBCT pré-operatória',
      '2. Escaneamento intraoral STL',
      '3. Planejamento virtual (este documento)',
      '4. Confecção do guia em resina + anilha metálica',
      '5. Prova do guia em boca antes da cirurgia',
      '6. Cirurgia guiada com broca piloto → sequência',
      `7. Instalação: ${params.diameter} × ${params.length} mm @ ${params.angle}°`,
      `8. Torque final: ${params.torque} Ncm`,
      '9. Radiografia periapical de controle',
      '10. Período de osseointegração: 3–6 meses',
      '',
      '═══════════════════════════════════════════════════',
      '   Eva Clinic Odontologia Especializada',
      '   Gerado pelo sistema Eva Clinic PRO',
      '═══════════════════════════════════════════════════',
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planejamento-implante-${selectedTooth}-${patient?.name?.replace(/\s+/g, '-') || 'paciente'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Relatório exportado!', 'success');
  };

  // ===========================================================================
  // RENDER
  // ===========================================================================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0, background: '#0a0f1a', color: '#e2e8f0', fontFamily: 'inherit' }}>
      {/* ── HEADER ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
        background: 'rgba(15,25,50,0.98)', borderBottom: '1px solid rgba(0,255,204,0.12)',
        backdropFilter: 'blur(12px)', zIndex: 10,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <ArrowLeft size={15} />
        </button>

        {/* Logo / título */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #0d9488, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.01em' }}>
              Guia Cirúrgico — Planejamento de Implante
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              Cirurgia Guiada 3D • Eva Clinic PRO
            </div>
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>Paciente:</span>
            <select
              value={patient?.id || ''}
              onChange={(e) => {
                const pId = e.target.value;
                if (pId) {
                  navigate(`/guia-cirurgico?patient=${pId}&tooth=${selectedTooth}`);
                } else {
                  navigate(`/guia-cirurgico?tooth=${selectedTooth}`);
                }
              }}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#e2e8f0',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 12,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="" style={{ background: '#0a0f1a' }}>-- Selecionar paciente --</option>
              {state.patients.map((p) => (
                <option key={p.id} value={p.id} style={{ background: '#0a0f1a' }}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {patient && (
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #0d9488, #0ea5e9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff',
            }}>
              {patient.name?.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* ── CORPO PRINCIPAL ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: 0 }}>

        {/* ── PAINEL ESQUERDO: SELEÇÃO DE DENTE ── */}
        <div style={{
          width: 200, flexShrink: 0, background: 'rgba(10,15,30,0.95)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          overflowY: 'auto', padding: '14px 0',
        }}>
          <div style={{ padding: '0 14px 8px', fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Dentes Planejados
          </div>

          {/* Dentes com implante no odontograma */}
          {teethWithImplant.length > 0 ? (
            teethWithImplant.map((n) => (
              <button
                key={n}
                onClick={() => setSelectedTooth(n)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '9px 14px', border: 'none',
                  background: selectedTooth === n ? 'rgba(13,148,136,0.15)' : 'transparent',
                  borderLeft: selectedTooth === n ? '2px solid #0d9488' : '2px solid transparent',
                  color: selectedTooth === n ? '#0d9488' : '#94a3b8',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: selectedTooth === n ? 'rgba(13,148,136,0.2)' : 'rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                }}>
                  {n}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>#{n}</div>
                  <div style={{ fontSize: 9, opacity: 0.7 }}>{toothType(n)}</div>
                </div>
              </button>
            ))
          ) : (
            <div style={{ padding: '12px 14px', fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
              Nenhum dente marcado como implante no odontograma.
              <br /><br />
              Selecione um dente abaixo:
            </div>
          )}

          <div style={{ margin: '10px 14px 6px', height: 1, background: 'rgba(255,255,255,0.06)' }} />

          <div style={{ padding: '0 14px 8px', fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Todos os dentes
          </div>

          {/* Grade FDI compacta */}
          {[
            [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28],
            [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38],
          ].map((row, ri) => (
            <div key={ri} style={{ display: 'flex', flexWrap: 'wrap', gap: 3, padding: '2px 14px 6px' }}>
              {row.map((n) => (
                <button
                  key={n}
                  onClick={() => setSelectedTooth(n)}
                  style={{
                    width: 24, height: 22, border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 9, fontWeight: 600,
                    background: selectedTooth === n ? '#0d9488' : teethWithImplant.includes(n) ? 'rgba(13,148,136,0.2)' : 'rgba(255,255,255,0.05)',
                    color: selectedTooth === n ? '#fff' : teethWithImplant.includes(n) ? '#0d9488' : '#64748b',
                    transition: 'all 0.1s',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* ── VISUALIZADOR 3D CENTRAL ── */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <ImplantViewer3D
            toothNum={selectedTooth}
            params={params}
            showBone={showBone}
            showGuide={showGuide}
            showNeighbors={showNeighbors}
          />

          {/* Overlay: controles de visualização */}
          <div style={{
            position: 'absolute', top: 14, right: 14, display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            {[
              { icon: showBone ? Eye : EyeOff, label: 'Osso', active: showBone, toggle: () => setShowBone((v) => !v) },
              { icon: showGuide ? Eye : EyeOff, label: 'Guia', active: showGuide, toggle: () => setShowGuide((v) => !v) },
              { icon: showNeighbors ? Eye : EyeOff, label: 'Vizinhos', active: showNeighbors, toggle: () => setShowNeighbors((v) => !v) },
            ].map((btn, i) => (
              <button
                key={i}
                onClick={btn.toggle}
                title={btn.label}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
                  background: btn.active ? 'rgba(13,148,136,0.25)' : 'rgba(10,15,30,0.75)',
                  border: `1px solid ${btn.active ? 'rgba(13,148,136,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 8, color: btn.active ? '#0d9488' : '#64748b',
                  cursor: 'pointer', fontSize: 11, fontWeight: 600, backdropFilter: 'blur(8px)',
                  transition: 'all 0.2s',
                }}
              >
                <btn.icon size={13} />
                {btn.label}
              </button>
            ))}
          </div>

          {/* Overlay: informações do implante */}
          <div style={{
            position: 'absolute', bottom: 14, left: 14,
            background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(13,148,136,0.2)', borderRadius: 12, padding: '12px 16px',
            minWidth: 220,
          }}>
            <div style={{ fontSize: 10, color: '#0d9488', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
              Implante Selecionado
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
              #{selectedTooth} — {toothName(selectedTooth).split(' • ')[1]}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
              {[
                { l: 'Diâmetro', v: `${params.diameter} mm` },
                { l: 'Comprimento', v: `${params.length} mm` },
                { l: 'Angulação', v: `${params.angle}°` },
                { l: 'Torque', v: `${params.torque} Ncm` },
              ].map(({ l, v }) => (
                <div key={l}>
                  <div style={{ fontSize: 9, color: '#64748b' }}>{l}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Análise de risco inline */}
            {riskAnalysis.length > 0 && (
              <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                {riskAnalysis.slice(0, 2).map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                    <AlertTriangle size={11} color={r.level === 'alto' ? '#ef4444' : '#f59e0b'} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 10, color: r.level === 'alto' ? '#ef4444' : '#f59e0b', lineHeight: 1.4 }}>{r.msg}</span>
                  </div>
                ))}
              </div>
            )}
            {riskAnalysis.length === 0 && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={11} color="#0d9488" />
                <span style={{ fontSize: 10, color: '#0d9488' }}>Parâmetros dentro do ideal</span>
              </div>
            )}
          </div>

          {/* Overlay: sistema */}
          <div style={{
            position: 'absolute', bottom: 14, right: 14,
            background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px',
            fontSize: 10, color: '#64748b',
          }}>
            <span style={{ color: '#94a3b8', fontWeight: 600 }}>{systemInfo?.name}</span>
            <br />{params.diameter} × {params.length} mm
          </div>
        </div>

        {/* ── PAINEL DIREITO: PARÂMETROS ── */}
        <div style={{
          width: 320, flexShrink: 0, background: 'rgba(10,15,30,0.97)',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          overflowY: 'auto', display: 'flex', flexDirection: 'column',
        }}>
          {/* Abas */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 4px' }}>
            {[
              { id: 'implante', label: 'Implante', icon: Target },
              { id: 'guia', label: 'Guia', icon: Layers },
              { id: 'protocolo', label: 'Protocolo', icon: FileText },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  padding: '11px 4px', border: 'none', background: 'transparent', cursor: 'pointer',
                  fontSize: 11, fontWeight: 600,
                  color: activeTab === id ? '#0d9488' : '#64748b',
                  borderBottom: activeTab === id ? '2px solid #0d9488' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {/* ── ABA: IMPLANTE ── */}
            {activeTab === 'implante' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* Sistema */}
                <div>
                  <label style={labelStyle}>Sistema de Implante</label>
                  <select
                    value={params.system}
                    onChange={(e) => setParam('system', e.target.value)}
                    style={selectStyle}
                  >
                    {IMPLANT_SYSTEMS.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Diâmetro */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={labelStyle}>Diâmetro (mm)</label>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0d9488' }}>{params.diameter} mm</span>
                  </div>
                  <input type="range" min={3.3} max={5.5} step={0.05}
                    value={params.diameter}
                    onChange={(e) => setParam('diameter', parseFloat(e.target.value))}
                    style={rangeStyle}
                  />
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                    {IMPLANT_DIAMETERS.map((v) => (
                      <button key={v} onClick={() => setParam('diameter', v)}
                        style={chipStyle(params.diameter === v)}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comprimento */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={labelStyle}>Comprimento (mm)</label>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0d9488' }}>{params.length} mm</span>
                  </div>
                  <input type="range" min={7} max={16} step={0.5}
                    value={params.length}
                    onChange={(e) => setParam('length', parseFloat(e.target.value))}
                    style={rangeStyle}
                  />
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                    {IMPLANT_LENGTHS.map((v) => (
                      <button key={v} onClick={() => setParam('length', v)}
                        style={chipStyle(params.length === v)}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Angulação */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={labelStyle}>Angulação de Inserção</label>
                    <span style={{ fontSize: 14, fontWeight: 700, color: params.angle > 20 ? '#ef4444' : params.angle > 10 ? '#f59e0b' : '#0d9488' }}>
                      {params.angle}°
                    </span>
                  </div>
                  <input type="range" min={-30} max={30} step={1}
                    value={params.angle}
                    onChange={(e) => setParam('angle', parseInt(e.target.value))}
                    style={rangeStyle}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#475569', marginTop: 2 }}>
                    <span>-30° (Mesial)</span>
                    <span>0° (Axial)</span>
                    <span>+30° (Distal)</span>
                  </div>
                </div>

                {/* Profundidade sub-crestal */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={labelStyle}>Profundidade Sub-crestal</label>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0d9488' }}>{params.depth} mm</span>
                  </div>
                  <input type="range" min={0} max={4} step={0.5}
                    value={params.depth}
                    onChange={(e) => setParam('depth', parseFloat(e.target.value))}
                    style={rangeStyle}
                  />
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                    0 = nível crestal · 1–2 mm = sub-crestal ideal
                  </div>
                </div>

                {/* Torque */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={labelStyle}>Torque de Inserção (Ncm)</label>
                    <span style={{ fontSize: 14, fontWeight: 700, color: params.torque > 45 ? '#ef4444' : '#0d9488' }}>
                      {params.torque} Ncm
                    </span>
                  </div>
                  <input type="range" min={15} max={60} step={5}
                    value={params.torque}
                    onChange={(e) => setParam('torque', parseInt(e.target.value))}
                    style={rangeStyle}
                  />
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                    Recomendado: 25–45 Ncm
                  </div>
                </div>

                {/* Qualidade óssea */}
                <div>
                  <label style={labelStyle}>Qualidade Óssea (Misch)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {BONE_QUALITY.map((b) => (
                      <button key={b.id} onClick={() => setParam('bone', b.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                          background: params.bone === b.id ? 'rgba(13,148,136,0.12)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${params.bone === b.id ? 'rgba(13,148,136,0.4)' : 'rgba(255,255,255,0.08)'}`,
                          borderRadius: 8, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                        }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: b.color, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: params.bone === b.id ? '#0d9488' : '#94a3b8' }}>{b.id}</div>
                          <div style={{ fontSize: 9, color: '#64748b' }}>{b.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── ABA: GUIA ── */}
            {activeTab === 'guia' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={labelStyle}>Tipo de Guia Cirúrgico</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {GUIDE_TYPES.map((g) => (
                      <button key={g.id} onClick={() => setParam('guideType', g.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                          background: params.guideType === g.id ? 'rgba(13,148,136,0.12)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${params.guideType === g.id ? 'rgba(13,148,136,0.4)' : 'rgba(255,255,255,0.08)'}`,
                          borderRadius: 10, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                        }}>
                        <span style={{ fontSize: 22 }}>{g.icon}</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: params.guideType === g.id ? '#0d9488' : '#e2e8f0' }}>{g.label}</div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>{g.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visibilidade do visualizador */}
                <div>
                  <label style={labelStyle}>Visualizador 3D</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      { label: 'Mostrar osso/alvéolo', value: showBone, set: setShowBone },
                      { label: 'Mostrar guia cirúrgico', value: showGuide, set: setShowGuide },
                      { label: 'Mostrar dentes vizinhos', value: showNeighbors, set: setShowNeighbors },
                    ].map(({ label, value, set }) => (
                      <div key={label}
                        onClick={() => set((v) => !v)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '9px 12px', background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, cursor: 'pointer',
                        }}>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>{label}</span>
                        <div style={{
                          width: 36, height: 20, borderRadius: 10,
                          background: value ? '#0d9488' : 'rgba(255,255,255,0.1)',
                          position: 'relative', transition: 'all 0.2s',
                        }}>
                          <div style={{
                            position: 'absolute', top: 2, left: value ? 18 : 2,
                            width: 16, height: 16, borderRadius: '50%', background: '#fff',
                            transition: 'all 0.2s',
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Info técnica do guia */}
                <div style={{ padding: '14px', background: 'rgba(13,148,136,0.07)', border: '1px solid rgba(13,148,136,0.15)', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0d9488', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Info size={13} /> Especificações do Guia
                  </div>
                  {[
                    { l: 'Material', v: 'Resina Fotopolimerizável' },
                    { l: 'Anilha', v: 'Aço Inox 316L (Ø Metal Sleeve)' },
                    { l: 'Impressão', v: 'Impressora 3D SLA/DLP' },
                    { l: 'Precisão', v: '≤ 0.1 mm desvio linear' },
                    { l: 'Angulação guia', v: `${params.angle}° em relação ao eixo axial` },
                    { l: 'Diâmetro da anilha', v: `Ø${(params.diameter + 0.3).toFixed(2)} mm interno` },
                  ].map(({ l, v }) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 10, color: '#64748b' }}>{l}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── ABA: PROTOCOLO ── */}
            {activeTab === 'protocolo' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Análise de risco */}
                <div>
                  <label style={labelStyle}>Análise de Risco Automatizada</label>
                  {riskAnalysis.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.2)', borderRadius: 8 }}>
                      <CheckCircle2 size={14} color="#0d9488" />
                      <span style={{ fontSize: 11, color: '#0d9488' }}>Todos os parâmetros dentro do intervalo ideal clínico</span>
                    </div>
                  ) : (
                    riskAnalysis.map((r, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', marginBottom: 6,
                        background: r.level === 'alto' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                        border: `1px solid ${r.level === 'alto' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
                        borderRadius: 8,
                      }}>
                        <AlertTriangle size={13} color={r.level === 'alto' ? '#ef4444' : '#f59e0b'} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontSize: 11, color: r.level === 'alto' ? '#ef4444' : '#f59e0b', lineHeight: 1.5 }}>{r.msg}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Sequência de brocas */}
                <div>
                  <label style={labelStyle}>Sequência de Brocas Cirúrgicas</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {[
                      { step: 1, name: 'Broca Lança (Piloto)', d: '2.0 mm', speed: '800 rpm', irr: 'Solução salina', color: '#0ea5e9' },
                      { step: 2, name: 'Broca Helicoidal 1', d: `${(params.diameter * 0.55).toFixed(1)} mm`, speed: '600 rpm', irr: 'Solução salina', color: '#6366f1' },
                      { step: 3, name: 'Broca Helicoidal 2', d: `${(params.diameter * 0.75).toFixed(1)} mm`, speed: '500 rpm', irr: 'Solução salina', color: '#8b5cf6' },
                      { step: 4, name: 'Broca Final (Calibrador)', d: `${params.diameter.toFixed(1)} mm`, speed: '400 rpm', irr: 'Solução salina', color: '#0d9488' },
                      ...(params.bone === 'D1' ? [{ step: 5, name: 'Macho (Rosqueamento)', d: `Ø ${params.diameter} mm`, speed: '20 rpm', irr: 'Leve irrigação', color: '#f97316' }] : []),
                    ].map(({ step, name, d, speed, irr, color }) => (
                      <div key={step} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8,
                      }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                          {step}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0' }}>{name}</div>
                          <div style={{ fontSize: 9, color: '#64748b' }}>{d} · {speed} · {irr}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Checklist pré-operatório */}
                <div>
                  <label style={labelStyle}>Checklist Pré-Operatório</label>
                  {[
                    'Tomografia CBCT analisada',
                    'Escaneamento intraoral STL pronto',
                    'Guia cirúrgico impresso e esterilizado',
                    'Kit de implantes reservado',
                    'Protocolo anestésico definido',
                    'Consentimento do paciente assinado',
                    'Antibioticoterapia prescrita (D-1)',
                    'Radiografia periapical de controle preparada',
                  ].map((item, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: 4, border: '1.5px solid rgba(13,148,136,0.4)',
                        background: 'rgba(13,148,136,0.08)', flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── AÇÕES ── */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={handleSave}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '11px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: saved ? 'rgba(13,148,136,0.15)' : 'linear-gradient(135deg, #0d9488, #0ea5e9)',
                color: saved ? '#0d9488' : '#fff', fontWeight: 700, fontSize: 13,
                transition: 'all 0.2s',
              }}
            >
              {saved ? <CheckCircle2 size={15} /> : <Save size={15} />}
              {saved ? 'Planejamento Salvo' : 'Salvar Planejamento'}
            </button>
            <button
              onClick={handleExportReport}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontWeight: 600, fontSize: 12,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <FileText size={14} />
              Exportar Relatório
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Estilos reutilizáveis
const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8',
  letterSpacing: '0.02em', marginBottom: 8,
};
const selectStyle = {
  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '8px 10px', color: '#e2e8f0', fontSize: 12, outline: 'none',
};
const rangeStyle = {
  width: '100%', accentColor: '#0d9488', height: 4, cursor: 'pointer',
};
const chipStyle = (active) => ({
  padding: '4px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600,
  background: active ? '#0d9488' : 'rgba(255,255,255,0.06)',
  color: active ? '#fff' : '#64748b', transition: 'all 0.1s',
});
