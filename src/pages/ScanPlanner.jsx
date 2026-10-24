// ===========================================================================
// Eva Clinic — Planejamento de Guia Cirúrgico Estilo Exoplan (Tomografia + STL)
// 
// Arquitetura:
// 1. Tela em 4 Quadrantes (Axial, Coronal, Sagital, 3D) com mira cruzada sincronizada.
// 2. Leitura robusta de Tomografia CBCT (Vatech e outros) com jszip + dicom-parser em 0.4mm.
// 3. Geração de Osso 3D instantânea no navegador via Marching Cubes local (sem depender de servidor).
// 4. Alinhamento Rígido por 3+ Pontos com Algoritmo de Kabsch (SVD) e validação TRE em mm.
// 5. ToothPicker inteligente: clique no dente do modelo, estimação FDI e marcação no prontuário.
// 6. Posicionamento de implantes com anilhas e projeção nos 3 cortes ortogonais 2D.
// ===========================================================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  FolderOpen, Eye, EyeOff, Move, RotateCw, Trash2, Crosshair, MousePointer2,
  Download, Cpu, Scissors, Save, Maximize2, Minimize2, Columns, Layers,
  Box, RefreshCw, Sliders, AlertCircle, Sparkles, RotateCcw, Compass,
  ClipboardCheck, FolderUp, Check, ExternalLink, FileText, Target,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { uid, todayISO } from '../lib/utils';
import { PROCEDURES, toothName, PERMANENT } from '../lib/dental';
import { loadDicomFiles } from '../lib/dicomVolumeLoader';
import { generateBoneIsosurface } from '../lib/marchingCubes';
import MprViewport from '../components/cad/MprViewport';
import Viewer3D from '../components/cad/Viewer3D';
import RegistrationPanel from '../components/cad/RegistrationPanel';
import ToothPicker from '../components/cad/ToothPicker';

const CAD_URL = 'http://127.0.0.1:8005';
const ROLES = [
  { id: 'inferior', label: 'Arcada inferior (CEREC)', color: '#e9dcc3', up: 1 },
  { id: 'superior', label: 'Arcada superior (CEREC)', color: '#bcd9ea', up: -1 },
  { id: 'osso', label: 'Osso tomográfico (3D)', color: '#fed7aa', up: 1 },
  { id: 'guia', label: 'Guia cirúrgico', color: '#3b82f6', up: 1 },
  { id: 'outro', label: 'Outro / comparação', color: '#c4b5fd', up: 1 },
];
const roleInfo = (id) => ROLES.find((r) => r.id === id) || ROLES[4];
const IMPLANT_D = [3.3, 3.5, 3.75, 4.0, 4.3, 4.5, 5.0, 5.5];
const IMPLANT_L = [7, 8.5, 10, 11.5, 13, 15, 16];
const MIN_EDGE_MM = 3;

const guessRole = (name) => {
  const n = name.toLowerCase();
  if (/osso|bone|tomografia|dcm|ct/.test(n)) return 'osso';
  if (/guia|guide/.test(n)) return 'guia';
  if (/inf|mand|lower/.test(n)) return 'inferior';
  if (/sup|max|upper/.test(n)) return 'superior';
  return 'outro';
};

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

export default function ScanPlanner() {
  const { state, dispatch, toast } = useApp();
  const navigate = useNavigate();

  const containerRef = useRef(null);
  const fileRef = useRef(null);
  const folderRef = useRef(null);
  const dicomRef = useRef(null);

  // Estados dos Modelos STL (CEREC/inLab)
  const [models, setModels] = useState([]);
  const [selModelId, setSelModelId] = useState(null);
  const [modelCounter, setModelCounter] = useState(1);

  // Estados da Tomografia DICOM e Volume MPR
  const [volume, setVolume] = useState(null);
  const [slices, setSlices] = useState({ axial: 0, coronal: 0, sagittal: 0 });
  const [crosshair, setCrosshair] = useState({ x: 0, y: 0, z: 0 });
  const [ww, setWw] = useState(2000);
  const [wl, setWl] = useState(450);

  // Estados do Osso 3D em JavaScript local (Marching Cubes)
  const [boneGeometry, setBoneGeometry] = useState(null);
  const [boneThreshold, setBoneThreshold] = useState(400);
  const [boneOpacity, setBoneOpacity] = useState(0.85);
  const [isExtractingBone, setIsExtractingBone] = useState(false);

  // Estados dos Implantes
  const [implants, setImplants] = useState([]);
  const [selImplantId, setSelImplantId] = useState(null);
  const [implantDef, setImplantDef] = useState({ diameter: 4.3, length: 10 });

  // Estados de Navegação e Layout
  const [expandedQuadrant, setExpandedQuadrant] = useState(null); // null (4 quadrantes) | 'axial' | 'coronal' | 'sagittal' | '3d'
  const [tool, setTool] = useState('navegar'); // 'navegar' | 'dente' | 'implante' | 'alinhamento'
  const [gizmoMode, setGizmoMode] = useState('translate');
  const [tab, setTab] = useState('modelos');
  const [patientId, setPatientId] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState({ active: false, percent: 0, message: '' });

  // Estados de Alinhamento Rígido por Pontos (Kabsch)
  const [isRegistering, setIsRegistering] = useState(false);
  const [activeRegTarget, setActiveRegTarget] = useState('stl'); // 'stl' | 'tomografia'
  const [registrationPoints, setRegistrationPoints] = useState({ stl: [], tomografia: [] });

  // Estados do ToothPicker (Clique no dente)
  const [selectedToothPoint, setSelectedToothPoint] = useState(null);

  // Estados do Guia Cirúrgico (CAD)
  const [guideParams, setGuideParams] = useState({ base: '', thickness: 2.5, gap: 0.1, hole_d: 5, sleeve_od: 7.5, sleeve_h: 5, radius: 14 });
  const [cad, setCad] = useState('checking');
  const [busy, setBusy] = useState(false);
  const [lastGuide, setLastGuide] = useState(null);

  // Verifica saúde do CAD Server (opcional para exportação física de guia)
  const checkCad = useCallback(() => {
    setCad('checking');
    fetch(`${CAD_URL}/health`).then((r) => (r.ok ? setCad('online') : setCad('offline'))).catch(() => setCad('offline'));
  }, []);
  useEffect(() => { checkCad(); }, [checkCad]);

  // Alterna Tela Cheia
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };
  useEffect(() => {
    const handleFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  // ---------------------------------------------------------------------------
  // Carregamento de Arquivos: ZIP com subpastas, pasta inteira ou STL/PLY
  // ---------------------------------------------------------------------------
  const handleLoadFiles = async (fileList) => {
    const files = Array.from(fileList);
    if (!files.length) return;

    const stlFiles = files.filter((f) => /\.(stl|ply)$/i.test(f.name));
    const zipOrDcmFiles = files.filter(
      (f) =>
        /\.(zip|dcm|dicom|ima)$/i.test(f.name) ||
        (!f.name.includes('.') && f.size > 1000) ||
        /ct|slice|image|im_|ser/i.test(f.name)
    );

    // 1. Carrega malhas de superfície 3D (STL / PLY)
    for (const f of stlFiles) {
      try {
        const buf = await f.arrayBuffer();
        const ext = f.name.split('.').pop().toLowerCase();
        const rawGeo = ext === 'ply' ? new PLYLoader().parse(buf) : new STLLoader().parse(buf);
        const geo = mergeVertices(rawGeo, 1e-4);
        geo.computeVertexNormals();

        const id = Date.now() + Math.random();
        const role = guessRole(f.name);
        const newModel = {
          id,
          name: f.name,
          role,
          geometry: geo,
          bytes: buf,
          ext,
          visible: true,
          opacity: 1,
          color: roleInfo(role).color,
          position: [0, 0, 0],
          quaternion: [0, 0, 0, 1],
          scale: [1, 1, 1],
        };

        setModels((prev) => [...prev, newModel]);
        setSelModelId(id);
        toast(`Modelo 3D "${f.name}" carregado com sucesso!`, 'success');
      } catch (err) {
        toast(`Erro ao carregar ${f.name}: ${err.message}`, 'error');
      }
    }

    // 2. Carrega tomografia CBCT com o novo leitor (jszip + dicom-parser)
    if (zipOrDcmFiles.length > 0) {
      setProgress({ active: true, percent: 10, message: 'Processando tomografia...' });
      try {
        const vol = await loadDicomFiles(zipOrDcmFiles, (p) => {
          setProgress({ active: true, percent: p.percent, message: p.message });
        });

        setVolume(vol);
        setSlices({
          axial: Math.floor(vol.dims[2] / 2),
          coronal: Math.floor(vol.dims[1] / 2),
          sagittal: Math.floor(vol.dims[0] / 2),
        });
        setCrosshair({
          x: Math.floor(vol.dims[0] / 2),
          y: Math.floor(vol.dims[1] / 2),
          z: Math.floor(vol.dims[2] / 2),
        });
        setWw(vol.windowPresets.bone.ww);
        setWl(vol.windowPresets.bone.wl);

        toast(`Tomografia carregada! ${vol.slicesCount} fatias (${vol.dims.join(' × ')} voxels @ 0.4mm)`, 'success');

        // Gera automaticamente a superfície do osso 3D no próprio navegador
        rebuildBoneMesh(vol, 400);
      } catch (err) {
        toast(`Erro na tomografia: ${err.message}`, 'error');
      } finally {
        setTimeout(() => setProgress({ active: false, percent: 0, message: '' }), 800);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Geração Local de Osso 3D (Marching Cubes em JavaScript puro)
  // ---------------------------------------------------------------------------
  const rebuildBoneMesh = useCallback((volData, threshold) => {
    if (!volData) return;
    setIsExtractingBone(true);
    setProgress({ active: true, percent: 60, message: 'Extraindo osso 3D no navegador...' });

    setTimeout(() => {
      try {
        const { positions, normals, vertexCount } = generateBoneIsosurface(volData, threshold, 2);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

        setBoneGeometry(geo);
        toast(`Osso 3D gerado: ${Math.round(vertexCount / 3).toLocaleString()} triângulos no espaço da TC!`, 'success');
      } catch (err) {
        toast(`Erro ao gerar osso 3D: ${err.message}`, 'error');
      } finally {
        setIsExtractingBone(false);
        setProgress({ active: false, percent: 0, message: '' });
      }
    }, 50);
  }, [toast]);

  // Atualização de Threshold do Osso via Slider
  const handleThresholdChange = (val) => {
    setBoneThreshold(val);
    if (volume) rebuildBoneMesh(volume, val);
  };

  // ---------------------------------------------------------------------------
  // Alinhamento Rígido por Pontos (Kabsch SVD)
  // ---------------------------------------------------------------------------
  const handleApplyTransform = (transformMatrix) => {
    if (!selModelId) {
      // Se nenhum selecionado, aplica ao primeiro modelo STL
      const target = models.find((m) => m.role === 'inferior' || m.role === 'superior');
      if (target) applyTransformToModel(target.id, transformMatrix);
      return;
    }
    applyTransformToModel(selModelId, transformMatrix);
  };

  const applyTransformToModel = (modelId, transformMatrix) => {
    setModels((prev) =>
      prev.map((m) => {
        if (m.id !== modelId) return m;
        const currentMat = new THREE.Matrix4().compose(
          new THREE.Vector3(...m.position),
          new THREE.Quaternion(...m.quaternion),
          new THREE.Vector3(...m.scale)
        );
        const newMat = transformMatrix.clone().multiply(currentMat);
        const pos = new THREE.Vector3();
        const quat = new THREE.Quaternion();
        const scl = new THREE.Vector3();
        newMat.decompose(pos, quat, scl);
        return {
          ...m,
          position: pos.toArray(),
          quaternion: quat.toArray(),
          scale: scl.toArray(),
        };
      })
    );
  };

  const handleResetTransform = (modelId) => {
    const id = modelId || selModelId;
    setModels((prev) =>
      prev.map((m) => {
        if (id && m.id !== id) return m;
        return {
          ...m,
          position: [0, 0, 0],
          quaternion: [0, 0, 0, 1],
          scale: [1, 1, 1],
        };
      })
    );
    toast('Modelo retornado ao eixo zero original do escaneador.', 'info');
  };

  // ---------------------------------------------------------------------------
  // Cliques na Cena 3D: Dente, Implante ou Ponto de Alinhamento
  // ---------------------------------------------------------------------------
  const handleSceneClick = ({ hit, screenPos }) => {
    // 1. Marcação de Pontos para o Alinhamento Kabsch
    if (tool === 'alinhamento' || isRegistering) {
      const p = { pos: hit.point.toArray(), normal: hit.normal?.toArray() || [0, 0, 1] };
      if (activeRegTarget === 'stl') {
        setRegistrationPoints((prev) => ({ ...prev, stl: [...prev.stl, p] }));
        toast(`Ponto P${registrationPoints.stl.length + 1} marcado no STL.`, 'info');
      } else {
        setRegistrationPoints((prev) => ({ ...prev, tomografia: [...prev.tomografia, p] }));
        toast(`Ponto Q${registrationPoints.tomografia.length + 1} marcado na Tomografia/Osso.`, 'info');
      }
      return;
    }

    // 2. Seleção de Dente (ToothPicker com FDI Estimado)
    if (tool === 'dente') {
      const model = models.find((m) => m.id === hit.object.userData.modelId);
      const archRole = model?.role || 'inferior';
      setSelectedToothPoint({
        point: hit.point,
        normal: hit.normal || new THREE.Vector3(0, 0, 1),
        screenPos,
        archRole,
      });
      return;
    }

    // 3. Posicionamento de Implante Direto
    if (tool === 'implante') {
      placeImplantAtPoint(hit.point, hit.normal);
    }
  };

  // Adiciona Implante 3D
  const placeImplantAtPoint = (point, normal = new THREE.Vector3(0, 0, 1), toothNum = null) => {
    const newImp = {
      id: Date.now() + Math.random(),
      label: toothNum ? `Implante #${toothNum}` : `Implante ${implants.length + 1}`,
      tooth: toothNum,
      diameter: implantDef.diameter,
      length: implantDef.length,
      pos: point.toArray(),
      axis: normal.toArray(),
      tilt: THREE.MathUtils.radToDeg(Math.acos(Math.min(1, Math.abs(normal.z)))),
    };
    setImplants((prev) => [...prev, newImp]);
    setSelImplantId(newImp.id);
    toast(`Implante Ø ${implantDef.diameter} × ${implantDef.length} mm posicionado!`, 'success');
  };

  // Confirmação do ToothPicker
  const handleToothPickerConfirm = ({ tooth, procedureId, clinicalNotes, placeImplant, hitPoint, hitNormal }) => {
    if (!patientId) {
      toast('Selecione um paciente na barra superior para gravar no prontuário.', 'warn');
      return;
    }
    const pat = state.patients.find((p) => p.id === patientId);
    const now = todayISO();

    // 1. Marca no Odontograma 2D
    dispatch({
      type: 'ODONTO_ADD',
      patientId,
      tooth,
      entry: {
        id: uid('od'),
        condition: 'implante',
        faces: [],
        status: 'planejado',
        date: now,
        notes: clinicalNotes,
      },
    });

    // 2. Adiciona ao Plano de Tratamento
    dispatch({
      type: 'ADD_TO_PLAN',
      patientId,
      procedureId,
      tooth,
      faces: [],
    });

    // 3. Registra Evolução Clínica no Prontuário
    dispatch({
      type: 'ADD_EVOLUTION',
      evo: {
        id: uid('ev'),
        patientId,
        professionalId: 'pr1',
        date: now,
        text: `[Planejamento Tomográfico & Scan 3D — Dente #${tooth} (${toothName(tooth)})]\n${clinicalNotes}`,
      },
    });

    // 4. Se solicitado, posiciona o implante 3D no modelo exatamente no ponto do clique
    if (placeImplant && hitPoint) {
      placeImplantAtPoint(hitPoint, hitNormal, tooth);
    }

    toast(`Dente #${tooth} registrado no prontuário de ${pat?.name}!`, 'success');
    setSelectedToothPoint(null);
  };

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: isFullscreen ? '100vh' : 'calc(100vh - 140px)',
        position: isFullscreen ? 'fixed' : 'relative',
        inset: isFullscreen ? 0 : undefined,
        zIndex: isFullscreen ? 99999 : undefined,
        background: '#070b16',
        padding: isFullscreen ? 12 : 0,
        gap: 10,
        minHeight: 640,
        color: '#f8fafc',
      }}
    >
      {/* ----------------- BARRA SUPERIOR DE COMANDOS EXOPLAN ----------------- */}
      <div style={{ ...S.row, justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, padding: '4px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Compass size={20} color="var(--brand)" />
            Guia Cirúrgico Exoplan — Tomografia + STL
          </h1>
          {volume && (
            <span className="badge b-brand small" style={{ fontWeight: 700, fontSize: 11 }}>
              CBCT: {volume.patientName} ({volume.dims.join('×')} @ 0.4mm)
            </span>
          )}
        </div>

        <div style={{ ...S.row, flexWrap: 'wrap', gap: 6 }}>
          {/* Seletor de Ferramentas Primárias */}
          <div style={{ display: 'inline-flex', background: 'var(--surface-2)', padding: 3, borderRadius: 8, border: '1px solid var(--border)' }}>
            <button
              style={S.btn(tool === 'navegar')}
              onClick={() => setTool('navegar')}
              title="Navegar e inspecionar cortes e cena 3D"
            >
              <MousePointer2 size={14} /> Navegar
            </button>
            <button
              style={S.btn(tool === 'dente')}
              onClick={() => setTool('dente')}
              title="Clique em qualquer dente do STL para detectar o FDI e marcar no prontuário"
            >
              <Target size={14} /> Selecionar Dente (FDI)
            </button>
            <button
              style={S.btn(tool === 'implante')}
              onClick={() => setTool('implante')}
              title="Clique no modelo para adicionar implante com anilha"
            >
              <Crosshair size={14} /> Posicionar Implante
            </button>
            <button
              style={S.btn(tool === 'alinhamento' || isRegistering)}
              onClick={() => {
                setTool('alinhamento');
                setIsRegistering(true);
                setTab('alinhamento');
              }}
              title="Alinhamento rígido STL x Tomografia (Kabsch)"
            >
              <Compass size={14} /> Alinhar Pontos
            </button>
          </div>

          {/* Resetar Eixo Zero */}
          <button
            style={S.btn(false)}
            onClick={() => handleResetTransform()}
            title="Volta os modelos STL para o ponto zero original do escaneador"
          >
            <RotateCcw size={14} /> Eixo Zero
          </button>

          {/* Seletor de Paciente */}
          <select
            style={{ ...S.input, width: 170, fontSize: 12 }}
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
          >
            <option value="">— Paciente —</option>
            {state.patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Botão Tela Cheia */}
          <button style={S.btn(isFullscreen)} onClick={toggleFullscreen} title="Tela Cheia Cirúrgica">
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Barra de Progresso / Loading */}
      {progress.active && (
        <div style={{ background: 'var(--surface-2)', padding: '6px 12px', borderRadius: 6, border: '1px solid var(--brand)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
            <span>{progress.message}</span>
            <strong>{progress.percent}%</strong>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${progress.percent}%`, height: '100%', background: 'var(--brand)', transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {/* ----------------- ÁREA CENTRAL: 4 QUADRANTES + PAINEL LATERAL ----------------- */}
      <div style={{ display: 'flex', gap: 10, flex: 1, minHeight: 0 }}>
        
        {/* LAYOUT EM 4 QUADRANTES ESTILO EXOPLAN */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: expandedQuadrant ? '1fr' : '1fr 1fr',
            gridTemplateRows: expandedQuadrant ? '1fr' : '1fr 1fr',
            gap: 8,
            minHeight: 0,
          }}
        >
          {/* Quadrantes 1, 2 e 3: Cortes Tomográficos MPR (Axial, Coronal, Sagital) */}
          {volume ? (
            <MprViewport
              volume={volume}
              slices={slices}
              onSliceChange={setSlices}
              crosshair={crosshair}
              onCrosshairChange={setCrosshair}
              ww={ww}
              wl={wl}
              onWwChange={setWw}
              onWlChange={setWl}
              implants={implants}
              expandedQuadrant={expandedQuadrant}
              onToggleMaximize={(q) => setExpandedQuadrant((cur) => (cur === q ? null : q))}
            />
          ) : (
            (!expandedQuadrant || expandedQuadrant !== '3d') && (
              <div
                style={{
                  gridColumn: '1 / span 2',
                  gridRow: '1 / span 2',
                  display: 'grid',
                  placeItems: 'center',
                  background: '#040711',
                  borderRadius: 8,
                  border: '1px dashed var(--border)',
                  textAlign: 'center',
                  padding: 24,
                }}
              >
                <div>
                  <Layers size={48} style={{ opacity: 0.3, marginBottom: 12, color: 'var(--brand)' }} />
                  <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>Nenhuma Tomografia CBCT Carregada</h3>
                  <p style={{ fontSize: 12.5, color: 'var(--text-3)', maxWidth: 440, margin: '0 auto 16px' }}>
                    Abra o arquivo <code>dicon_EVA.zip</code> ou a pasta inteira da tomografia (Vatech, etc.).
                    As fatias serão organizadas e o osso 3D gerado instantaneamente no seu navegador.
                  </p>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button style={S.btn(true)} onClick={() => dicomRef.current?.click()}>
                      <FolderOpen size={14} /> Abrir Arquivo (.ZIP / .DCM)
                    </button>
                    <button style={S.btn(false)} onClick={() => folderRef.current?.click()}>
                      <FolderUp size={14} /> Selecionar Pasta Tomografia
                    </button>
                  </div>
                </div>
              </div>
            )
          )}

          {/* Quadrante 4: Viewport 3D (STL + Osso local + Implantes + Planos de Corte) */}
          {(!expandedQuadrant || expandedQuadrant === '3d') && (
            <div
              style={{
                gridColumn: expandedQuadrant === '3d' ? '1 / -1' : undefined,
                gridRow: expandedQuadrant === '3d' ? '1 / -1' : undefined,
                height: '100%',
                minHeight: 0,
              }}
            >
              <Viewer3D
                models={models}
                implants={implants}
                selectedImplantId={selImplantId}
                onSelectImplant={setSelImplantId}
                selectedModelId={selModelId}
                onSelectModel={setSelModelId}
                tool={tool}
                gizmoMode={gizmoMode}
                volume={volume}
                slices={slices}
                boneGeometry={boneGeometry}
                boneOpacity={boneOpacity}
                showMprPlanes={Boolean(volume)}
                isMaximized={expandedQuadrant === '3d'}
                onToggleMaximize={(q) => setExpandedQuadrant((cur) => (cur === q ? null : q))}
                onSceneClick={handleSceneClick}
                registrationPoints={registrationPoints}
                isRegistering={isRegistering || tool === 'alinhamento'}
              />
            </div>
          )}
        </div>

        {/* ----------------- PAINEL LATERAL DE FERRAMENTAS & ABAS ----------------- */}
        <div style={{ ...S.panel, width: 330, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Abas */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            {[['modelos', 'Modelos'], ['tomografia', 'TC / Osso'], ['alinhamento', 'Alinhar'], ['implantes', 'Implantes']].map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                style={{
                  flex: 1, padding: '10px 4px', fontSize: 12, fontWeight: 700, background: 'none',
                  cursor: 'pointer', border: 'none', color: tab === k ? 'var(--brand)' : 'var(--text-3)',
                  borderBottom: `2px solid ${tab === k ? 'var(--brand)' : 'transparent'}`,
                }}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Conteúdo das Abas */}
          <div style={{ padding: 12, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            
            {/* ABA 1: MODELOS STL (CEREC / inLab) */}
            {tab === 'modelos' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)' }}>ARQUIVOS DE SUPERFÍCIE ({models.length})</span>
                  <button style={{ ...S.btn(false), padding: '4px 8px', fontSize: 11 }} onClick={() => fileRef.current?.click()}>
                    <FolderOpen size={12} /> Adicionar STL
                  </button>
                </div>

                {!models.length && (
                  <div style={{ fontSize: 12.5, color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' }}>
                    Nenhum scan STL aberto. Clique acima para abrir a arcada superior ou inferior do CEREC.
                  </div>
                )}

                {models.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setSelModelId(m.id)}
                    style={{
                      border: `1px solid ${selModelId === m.id ? 'var(--brand)' : 'var(--border)'}`,
                      borderRadius: 6,
                      padding: 8,
                      cursor: 'pointer',
                      background: selModelId === m.id ? 'var(--surface-2)' : 'transparent',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: 12.5 }}>{m.name}</strong>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setModels((prev) => prev.map((x) => (x.id === m.id ? { ...x, visible: !x.visible } : x)));
                          }}
                        >
                          {m.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <button
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setModels((prev) => prev.filter((x) => x.id !== m.id));
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <select
                      style={{ ...S.input, margin: '6px 0', fontSize: 12, padding: '4px 6px' }}
                      value={m.role}
                      onChange={(e) => {
                        const r = e.target.value;
                        setModels((prev) => prev.map((x) => (x.id === m.id ? { ...x, role: r, color: roleInfo(r).color } : x)));
                      }}
                    >
                      {ROLES.map((r) => (
                        <option key={r.id} value={r.id}>{r.label}</option>
                      ))}
                    </select>

                    <label style={{ fontSize: 11, color: 'var(--text-2)' }}>
                      Opacidade {Math.round(m.opacity * 100)}%
                      <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={m.opacity}
                        style={{ width: '100%', height: 4 }}
                        onChange={(e) => {
                          const op = parseFloat(e.target.value);
                          setModels((prev) => prev.map((x) => (x.id === m.id ? { ...x, opacity: op } : x)));
                        }}
                      />
                    </label>
                  </div>
                ))}

                {selModelId && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)' }}>TRANSFORMAÇÃO MANUAL (GIZMO)</span>
                    <div style={{ ...S.row, marginTop: 6 }}>
                      <button style={S.btn(gizmoMode === 'translate')} onClick={() => setGizmoMode('translate')}>
                        <Move size={13} /> Mover
                      </button>
                      <button style={S.btn(gizmoMode === 'rotate')} onClick={() => setGizmoMode('rotate')}>
                        <RotateCw size={13} /> Girar
                      </button>
                      <button style={{ ...S.btn(false), color: 'var(--warn)' }} onClick={() => handleResetTransform(selModelId)}>
                        <RotateCcw size={13} /> Resetar
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ABA 2: TOMOGRAFIA CBCT & CONTROLE DE OSSO 3D */}
            {tab === 'tomografia' && (
              <>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button style={{ ...S.btn(false), flex: 1, justifyContent: 'center' }} onClick={() => dicomRef.current?.click()}>
                    <FolderOpen size={13} /> Abrir ZIP/DCM
                  </button>
                  <button style={{ ...S.btn(false), flex: 1, justifyContent: 'center' }} onClick={() => folderRef.current?.click()}>
                    <FolderUp size={13} /> Pasta Tomografia
                  </button>
                </div>

                {volume ? (
                  <>
                    <div style={{ background: 'var(--surface-2)', padding: 10, borderRadius: 6, fontSize: 12 }}>
                      <div><strong>Paciente:</strong> {volume.patientName}</div>
                      <div><strong>Dimensões:</strong> {volume.dims.join(' × ')} voxels</div>
                      <div><strong>Espaçamento:</strong> {volume.spacing.map((s) => s.toFixed(2)).join(' × ')} mm</div>
                      <div><strong>Fatias Físicas:</strong> {volume.slicesCount}</div>
                    </div>

                    <div style={S.label}>Densidade do Osso 3D (Marching Cubes): {boneThreshold} HU</div>
                    <input
                      type="range"
                      min={200}
                      max={1200}
                      step={25}
                      value={boneThreshold}
                      style={{ width: '100%' }}
                      onChange={(e) => handleThresholdChange(parseInt(e.target.value, 10))}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-3)' }}>
                      <span>Tecido Mole (200 HU)</span>
                      <span>Osso (400 HU)</span>
                      <span>Dentes (1000 HU)</span>
                    </div>

                    <label style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 8, display: 'block' }}>
                      Opacidade do Osso 3D: {Math.round(boneOpacity * 100)}%
                      <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={boneOpacity}
                        style={{ width: '100%', height: 4 }}
                        onChange={(e) => setBoneOpacity(parseFloat(e.target.value))}
                      />
                    </label>

                    <div style={S.label}>Presets de Janela Tomográfica (2D)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {Object.entries(volume.windowPresets).map(([key, p]) => (
                        <button
                          key={key}
                          style={{ ...S.btn(ww === p.ww && wl === p.wl), padding: '5px 8px', fontSize: 11 }}
                          onClick={() => { setWw(p.ww); setWl(p.wl); }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 12.5, color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' }}>
                    Nenhuma tomografia carregada.
                  </div>
                )}
              </>
            )}

            {/* ABA 3: ALINHAMENTO RÍGIDO (KABSCH / SVD) */}
            {tab === 'alinhamento' && (
              <RegistrationPanel
                stlModel={models.find((m) => m.role === 'inferior' || m.role === 'superior')}
                boneModel={boneGeometry}
                onApplyTransform={handleApplyTransform}
                onResetTransform={handleResetTransform}
                isRegistering={isRegistering}
                setIsRegistering={setIsRegistering}
                activeTarget={activeRegTarget}
                setActiveTarget={setActiveRegTarget}
                stlPoints={registrationPoints.stl}
                bonePoints={registrationPoints.tomografia}
                onClearPoints={() => setRegistrationPoints({ stl: [], tomografia: [] })}
                toast={toast}
              />
            )}

            {/* ABA 4: IMPLANTES */}
            {tab === 'implantes' && (
              <>
                <div style={S.label}>Dimensões do Implante</div>
                <div style={S.row}>
                  <select
                    style={S.input}
                    value={implantDef.diameter}
                    onChange={(e) => setImplantDef((d) => ({ ...d, diameter: parseFloat(e.target.value) }))}
                  >
                    {IMPLANT_D.map((d) => <option key={d} value={d}>Ø {d} mm</option>)}
                  </select>
                  <select
                    style={S.input}
                    value={implantDef.length}
                    onChange={(e) => setImplantDef((d) => ({ ...d, length: parseFloat(e.target.value) }))}
                  >
                    {IMPLANT_L.map((d) => <option key={d} value={d}>{d} mm</option>)}
                  </select>
                </div>

                <button
                  style={{ ...S.btn(tool === 'implante'), width: '100%', justifyContent: 'center', marginTop: 8 }}
                  onClick={() => setTool('implante')}
                >
                  <Crosshair size={14} /> Clique no Modelo para Posicionar
                </button>

                <div style={S.label}>Implantes Planejados ({implants.length})</div>
                {!implants.length && (
                  <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
                    Nenhum implante posicionado ainda. Use o botão acima ou clique num dente com a ferramenta "Selecionar Dente".
                  </div>
                )}

                {implants.map((imp) => (
                  <div
                    key={imp.id}
                    onClick={() => setSelImplantId(imp.id)}
                    style={{
                      border: `1px solid ${selImplantId === imp.id ? 'var(--brand)' : 'var(--border)'}`,
                      borderRadius: 6,
                      padding: 8,
                      background: selImplantId === imp.id ? 'var(--surface-2)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: 12.5 }}>{imp.label}</strong>
                      <button
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setImplants((prev) => prev.filter((i) => i.id !== imp.id));
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 4 }}>
                      Ø {imp.diameter} × {imp.length} mm · Inclinação {imp.tilt.toFixed(1)}°
                    </div>
                  </div>
                ))}
              </>
            )}

          </div>
        </div>

      </div>

      {/* Floating Popover: ToothPicker quando o usuário clica num dente */}
      {selectedToothPoint && (
        <ToothPicker
          selectedPoint={selectedToothPoint}
          onConfirm={handleToothPickerConfirm}
          onCancel={() => setSelectedToothPoint(null)}
          patients={state.patients}
          selectedPatientId={patientId}
        />
      )}

      {/* Inputs Ocultos de Arquivos */}
      <input ref={fileRef} type="file" accept=".stl,.ply" multiple hidden onChange={(e) => { handleLoadFiles(e.target.files); e.target.value = ''; }} />
      <input ref={dicomRef} type="file" accept=".dcm,.dicom,.ima,.zip" multiple hidden onChange={(e) => { handleLoadFiles(e.target.files); e.target.value = ''; }} />
      <input ref={folderRef} type="file" webkitdirectory="" directory="" multiple hidden onChange={(e) => { handleLoadFiles(e.target.files); e.target.value = ''; }} />
    </div>
  );
}
