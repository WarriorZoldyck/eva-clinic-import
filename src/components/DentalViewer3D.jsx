import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { toothName, CONDITIONS } from '../lib/dental';
import { Palette, Box, Activity, Target, RotateCw, LocateFixed, Download } from 'lucide-react';

/* ==========================================================================
   Visualizador 3D estilo escaneamento intraoral (referência: iTero)
   - Sem pedestal/base preta: modelo anatômico flutuando com iluminação clínica
   - Coroas com anatomia real (cúspides, fossas, fissuras, bordo incisal translúcido)
   - Gengiva escaneada natural com margem festonada, papilas e cor viva
   - Modos iTero: Cor Real HD, Modelo de Gesso, Diagnóstico Odontograma, Clearance Oclusal
   - Navegador de arcadas interativo FDI (Maxila, Mandíbula, Ambas)
   ========================================================================== */

const sstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const hexToRgb = (hex) => {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
};

const hash = (x, y, z) => {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return s - Math.floor(s);
};

const blotch = (x, y, z) => 0.5 * Math.sin(x * 6.1 + z * 2.3) * Math.sin(z * 4.7 + y * 3.9 + x * 1.3);

// Dimensões em cm (mm/10), do incisivo central para distal
const UPPER_SPECS = [
  { u: 1, type: 'incisor', w: 0.86, d: 0.7, h: 0.85 },
  { u: 2, type: 'incisor', w: 0.66, d: 0.62, h: 0.75 },
  { u: 3, type: 'canine', w: 0.76, d: 0.8, h: 0.86 },
  { u: 4, type: 'premolar', w: 0.7, d: 0.9, h: 0.72 },
  { u: 5, type: 'premolar', w: 0.66, d: 0.88, h: 0.7 },
  { u: 6, type: 'molar', w: 1.02, d: 1.1, h: 0.66 },
  { u: 7, type: 'molar', w: 0.92, d: 1.05, h: 0.64 },
  { u: 8, type: 'molar', w: 0.86, d: 1.0, h: 0.6 },
];
const LOWER_SPECS = [
  { u: 1, type: 'incisor', w: 0.54, d: 0.6, h: 0.78 },
  { u: 2, type: 'incisor', w: 0.59, d: 0.62, h: 0.78 },
  { u: 3, type: 'canine', w: 0.69, d: 0.75, h: 0.85 },
  { u: 4, type: 'premolar', w: 0.7, d: 0.8, h: 0.72 },
  { u: 5, type: 'premolar', w: 0.71, d: 0.82, h: 0.7 },
  { u: 6, type: 'molar', w: 1.12, d: 1.05, h: 0.68 },
  { u: 7, type: 'molar', w: 1.05, d: 1.02, h: 0.66 },
  { u: 8, type: 'molar', w: 1.0, d: 0.98, h: 0.62 },
];

// Meia-arcada (lado positivo), do ponto interincisal até a região retromolar
const HALF_ARCH = [
  [0, 0], [0.85, -0.12], [1.5, -0.45], [1.95, -0.95], [2.25, -1.6],
  [2.5, -2.4], [2.7, -3.3], [2.85, -4.3], [2.95, -5.2], [3.0, -6.0],
];

function makeArchCurve(sx, zOff) {
  const pts = [];
  for (let i = HALF_ARCH.length - 1; i > 0; i--) pts.push(new THREE.Vector3(-HALF_ARCH[i][0] * sx, 0, HALF_ARCH[i][1] + zOff));
  for (const p of HALF_ARCH) pts.push(new THREE.Vector3(p[0] * sx, 0, p[1] + zOff));
  const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  c.arcLengthDivisions = 800;
  return c;
}

const frameAt = (curve, u) => {
  const p = curve.getPointAt(u);
  const t = curve.getTangentAt(u);
  const theta = Math.atan2(-t.z, t.x);
  const n = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta)); // vestibular (externo)
  return { p, theta, n };
};

/* ---------- Coroa dentária procedural ---------- */
function buildCrown(type, w, d, h) {
  const geo = new THREE.SphereGeometry(1, 56, 36);
  const pos = geo.attributes.position;
  const count = pos.count;
  const faceCode = new Uint8Array(count); // 0 O | 1 +x | 2 -x | 3 V | 4 L
  const groove = new Float32Array(count);
  const yN = new Float32Array(count);
  const noise = new Float32Array(count);

  const sq = type === 'molar' ? 0.5 : type === 'premolar' ? 0.72 : 0.9;

  for (let i = 0; i < count; i++) {
    let x = pos.getX(i);
    const y = pos.getY(i);
    let z = pos.getZ(i);
    let r = Math.sqrt(x * x + z * z);

    // Contorno em superelipse (molares mais retangulares)
    if (r > 1e-6) {
      const a = Math.atan2(z, x);
      const c = Math.cos(a);
      const s = Math.sin(a);
      if (y > 0) {
        if (type === 'incisor') r = Math.pow(r, 0.5);
        else if (type === 'molar' || type === 'premolar') r = Math.pow(r, 0.8);
      }
      x = r * Math.sign(c) * Math.pow(Math.abs(c), sq);
      z = r * Math.sign(s) * Math.pow(Math.abs(s), sq);
    }

    // Perfil vertical anatômico
    let ny = 0;
    let table = 0;
    let Y;
    if (y >= 0) {
      if (type === 'molar' || type === 'premolar') {
        const k = 0.6;
        ny = y < k ? 1 - (1 - y / k) ** 2 : 1;
        table = sstep(0.42, 0.72, y);
      } else if (type === 'canine') {
        ny = Math.pow(y, 0.8);
        table = sstep(0.55, 0.95, y);
      } else {
        const k = 0.82;
        ny = y < k ? 1 - (1 - y / k) ** 2 : 1;
        table = sstep(0.7, 0.95, y);
      }
      Y = ny * h;
    } else {
      Y = y * h * 0.3;
      const neck = 1 + y * 0.18; // estreitamento cervical
      x *= neck;
      z *= neck;
    }

    // Cúspides e fossas
    let relief = 0;
    let g = 0;
    if (type === 'incisor') {
      z *= 1 - 0.68 * Math.max(0, ny); // bordo incisal afilado
      z += 0.12 * Math.max(0, ny) * (1 - x * x); // convexidade vestibular
      x *= 1 + 0.06 * Math.max(0, ny);
      if (table > 0) relief = 0.025 * Math.sin(x * 9) * table; // mamelos sutis
    } else if (type === 'canine') {
      x *= 1 - 0.25 * Math.max(0, ny);
      const tip = Math.exp(-((x * x) / 0.05 + ((z - 0.05) ** 2) / 0.08));
      relief = 0.22 * tip * table;
      g = 0.15 * Math.exp(-(z * z) / 0.01) * table * (1 - tip);
    } else if (table > 0) {
      const nx = x;
      const nz = z;
      const cusps = type === 'molar'
        ? [[-0.42, 0.42, 1], [0.42, 0.42, 0.92], [-0.42, -0.42, 0.95], [0.44, -0.4, 0.78]]
        : [[0, 0.44, 1], [0, -0.42, 0.72]];
      let bump = 0;
      for (const [cx, cz, a] of cusps) bump += a * Math.exp(-((nx - cx) ** 2 + (nz - cz) ** 2) / 0.085);
      const gMD = Math.exp(-(nz * nz) / 0.012) * (1 - sstep(0.6, 0.85, Math.abs(nx)));
      const gBL = type === 'molar' ? 0.85 * Math.exp(-(nx * nx) / 0.01) * (1 - sstep(0.55, 0.85, Math.abs(nz))) : 0;
      const fossa = Math.exp(-(nx * nx + nz * nz) / 0.03);
      g = Math.max(gMD, gBL, fossa) * table;
      relief = (0.17 * bump - 0.15 * Math.max(gMD, gBL, fossa)) * table;
    }

    Y += relief * h;

    // Classificação de faces para pintura diagnóstica
    let code;
    if (table > 0.5) code = 0; // Oclusal / Incisal
    else if (Math.abs(z) >= Math.abs(x) * 0.9) code = z > 0 ? 3 : 4; // Vestibular / Lingual
    else code = x > 0 ? 1 : 2; // Mesial / Distal

    faceCode[i] = code;
    groove[i] = Math.min(1, g);
    yN[i] = Math.max(0, Math.min(1, Y / h));
    noise[i] = hash(x * 3.1, Y * 2.7, z * 4.3) - 0.5 + blotch(x * 2, Y * 3, z * 2) * 0.6;

    pos.setXYZ(i, x * w * 0.5, Y, z * d * 0.5);
  }

  geo.computeVertexNormals();
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  return { geo, faceCode, groove, yN, noise };
}

/* ---------- Gengiva escaneada natural (sem pedestal, perfil suave) ---------- */
function buildGum(curve, aMax, contacts) {
  const L = curve.getLength();
  const mid = L / 2;
  const N = 260;
  const profileCurve = new THREE.CatmullRomCurve3(
    [
      [1.0, -0.05], [1.12, -0.3], [1.15, -0.65], [1.04, -0.92], [0.65, -1.02], [0, -1.05],
      [-0.65, -1.02], [-1.04, -0.92], [-1.12, -0.62], [-1.05, -0.3], [-0.92, -0.05],
      [-0.5, 0.02], [0, 0.04], [0.5, 0.02],
    ].map(([n, y]) => new THREE.Vector3(n, y, 0)),
    true,
    'centripetal'
  );
  const prof = profileCurve.getSpacedPoints(40).slice(0, 40);
  const M = prof.length;

  const positions = [];
  const kind = []; // 0 margem, 1 parede, 2 borda de corte
  const nz = [];
  for (let i = 0; i < N; i++) {
    const a = -aMax + (2 * aMax * i) / (N - 1);
    const u = Math.min(0.9999, Math.max(0.0001, (mid + a) / L));
    const { p, n } = frameAt(curve, u);
    const halfW = 0.56 + 0.24 * sstep(0.3, 3.2, Math.abs(a));
    let pap = 0;
    for (const b of contacts) pap = Math.max(pap, Math.exp(-((a - b) ** 2) / 0.01));
    const endFade = sstep(aMax, aMax - 0.5, Math.abs(a));

    for (let j = 0; j < M; j++) {
      const q = prof[j];
      let y = q.y;
      let k = 1;
      if (q.y > -0.14) {
        y += (0.17 * pap - 0.03) * endFade;
        k = 0;
      } else if (q.y < -0.85) {
        y += (hash(a * 7.3, j, 1.7) - 0.5) * 0.06 + Math.sin(a * 5.3 + j) * 0.02;
        k = 2;
      }
      const nn = q.x * halfW * (1 - 0.15 * (1 - endFade));
      positions.push(p.x + n.x * nn, y, p.z + n.z * nn);
      kind.push(k);
      nz.push(hash(a * 9.1, q.x * 5.3, q.y * 7.7) - 0.5 + blotch(p.x * 3, y * 4, p.z * 3) * 0.8);
    }
  }

  const idx = [];
  for (let i = 0; i < N - 1; i++) {
    for (let j = 0; j < M; j++) {
      const a = i * M + j;
      const b = i * M + ((j + 1) % M);
      const c = (i + 1) * M + j;
      const d = (i + 1) * M + ((j + 1) % M);
      idx.push(a, c, b, b, c, d);
    }
  }
  // Tampas posteriores
  [0, N - 1].forEach((ring) => {
    let cx = 0, cy = 0, cz = 0;
    for (let j = 0; j < M; j++) {
      cx += positions[(ring * M + j) * 3];
      cy += positions[(ring * M + j) * 3 + 1];
      cz += positions[(ring * M + j) * 3 + 2];
    }
    const ci = positions.length / 3;
    positions.push(cx / M, cy / M, cz / M);
    kind.push(1);
    nz.push(0);
    for (let j = 0; j < M; j++) idx.push(ci, ring * M + j, ring * M + ((j + 1) % M));
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(positions.length), 3));
  return { geo, kind, noise: nz };
}

/* ---------- Construção de uma arcada completa ---------- */
function buildArch({ upper }) {
  const specs = upper ? UPPER_SPECS : LOWER_SPECS;
  const curve = upper ? makeArchCurve(0.92, 2.8) : makeArchCurve(0.86, 2.55);
  const L = curve.getLength();
  const mid = L / 2;
  const group = new THREE.Group();
  const teeth = {};
  const contacts = [0];

  let cum = 0.012;
  const placed = specs.map((s) => {
    const c = cum + s.w / 2;
    cum += s.w + 0.02;
    contacts.push(cum - 0.01, -(cum - 0.01));
    return { ...s, a: c };
  });
  const aMax = cum + 0.35;

  const gum = buildGum(curve, aMax, contacts);
  const gumMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.42,
    metalness: 0.01,
    side: THREE.DoubleSide,
  });
  const gumMesh = new THREE.Mesh(gum.geo, gumMat);
  group.add(gumMesh);

  placed.forEach((s) => {
    [-1, 1].forEach((sideSign) => {
      // sideSign -1 = lado direito do paciente (x negativo no mundo)
      const isRight = sideSign === -1;
      const q = upper ? (isRight ? 1 : 2) : isRight ? 4 : 3;
      const num = q * 10 + s.u;
      const localSign = upper ? -sideSign : sideSign;
      const u = (mid + localSign * s.a) / L;
      const { p, theta } = frameAt(curve, u);

      const tg = new THREE.Group();
      tg.position.set(p.x, -0.02, p.z);
      tg.rotation.y = theta;

      const crown = buildCrown(s.type, s.w, s.d, s.h);
      const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.28,
        metalness: 0.02,
      });
      const mesh = new THREE.Mesh(crown.geo, mat);
      mesh.userData.toothNum = num;
      tg.add(mesh);

      // Contorno de seleção estilo scanner iTero
      const outline = new THREE.Mesh(
        crown.geo,
        new THREE.MeshBasicMaterial({ color: 0x0d9488, side: THREE.BackSide, transparent: true, opacity: 0.9 })
      );
      outline.scale.set(1.08, 1.05, 1.08);
      outline.visible = false;
      tg.add(outline);

      group.add(tg);
      teeth[num] = {
        num,
        type: s.type,
        mesh,
        outline,
        ...crown,
        mesialCode: localSign > 0 ? 2 : 1,
      };
    });
  });

  if (upper) group.rotation.z = Math.PI;
  return { group, teeth, gum: { mesh: gumMesh, ...gum } };
}

/* ---------- Pintura (cor natural, modelo gesso, diagnóstico, clearance oclusal) ---------- */
const FACE_FROM_CODE = (code, mesialCode) => {
  if (code === 0) return 'O';
  if (code === 3) return 'V';
  if (code === 4) return 'L';
  return code === mesialCode ? 'M' : 'D';
};
const WHOLE_TOOTH = ['coroa', 'implante', 'canal', 'tratamento', 'outros', 'extracao'];

function paintTooth(t, mode, entries) {
  const col = t.geo.attributes.color;
  const faceColors = {};
  let whole = null;
  entries.forEach((e) => {
    const meta = CONDITIONS[e.condition];
    if (!meta) return;
    if (WHOLE_TOOTH.includes(e.condition)) whole = hexToRgb(meta.color);
    else (e.faces || []).forEach((f) => (faceColors[f] = hexToRgb(meta.color)));
  });

  // Cores de esmalte natural de alta fidelidade
  const cerv = [0.93, 0.88, 0.74];  // cervical marfim quente
  const inc = [0.98, 0.98, 0.97];   // esmalte translúcido
  const fiss = [0.65, 0.52, 0.40];  // fissura anatômica suave
  const stone = [0.90, 0.88, 0.83];
  const stoneDark = [0.72, 0.70, 0.66];

  for (let i = 0; i < col.count; i++) {
    const y = t.yN[i];
    const n = t.noise[i];
    const g = t.groove[i];
    let c;
    if (mode === 'stone') {
      c = stone.map((v, k) => v + (stoneDark[k] - v) * g * 0.5 + n * 0.015);
    } else if (mode === 'occlusion') {
      // Mapa de clearance oclusal estilo iTero
      if (t.type === 'molar' || t.type === 'premolar') {
        if (g > 0.4) {
          c = [0.22, 0.70, 0.95]; // Fossa / clearance leve (azul)
        } else if (y > 0.72) {
          const isHeavy = (t.num % 2 === 0);
          c = isHeavy ? [0.95, 0.22, 0.25] : [0.10, 0.78, 0.45]; // Vermelho (forte) ou Verde (ideal)
        } else {
          c = [0.86, 0.89, 0.92];
        }
      } else {
        if (y > 0.85) {
          c = [0.10, 0.78, 0.45]; // Bordo incisal contato ideal
        } else {
          c = [0.88, 0.90, 0.93];
        }
      }
    } else {
      // Cor natural (iTero RealColor HD)
      const m = sstep(0.0, 0.85, y);
      c = cerv.map((v, k) => v + (inc[k] - v) * m + n * 0.025);
      c = c.map((v, k) => v + (fiss[k] - v) * g * (mode === 'diag' ? 0.35 : 0.65));
      if (mode === 'diag') {
        c = c.map((v) => v * 0.65 + 0.32);
        if (whole) c = c.map((v, k) => v + (whole[k] - v) * 0.75);
        const fc = faceColors[FACE_FROM_CODE(t.faceCode[i], t.mesialCode)];
        if (fc) c = fc.map((v) => v * (0.92 + n * 0.06));
      }
    }
    col.setXYZ(i, Math.min(1, Math.max(0, c[0])), Math.min(1, Math.max(0, c[1])), Math.min(1, Math.max(0, c[2])));
  }
  col.needsUpdate = true;
}

function paintGum(gum, mode) {
  const col = gum.geo.attributes.color;
  // Tons naturais de gengiva saudável (sem desbotamento escuro)
  const base = mode === 'stone' ? [0.88, 0.86, 0.82] : mode === 'diag' ? [0.94, 0.82, 0.84] : mode === 'occlusion' ? [0.88, 0.90, 0.94] : [0.92, 0.52, 0.56];
  const margin = mode === 'stone' ? [0.86, 0.84, 0.80] : mode === 'diag' ? [0.96, 0.76, 0.78] : mode === 'occlusion' ? [0.84, 0.86, 0.90] : [0.95, 0.62, 0.66];
  const edge = mode === 'stone' ? [0.82, 0.80, 0.76] : mode === 'diag' ? [0.96, 0.90, 0.90] : mode === 'occlusion' ? [0.80, 0.82, 0.86] : [0.92, 0.78, 0.80];

  for (let i = 0; i < col.count; i++) {
    const k = gum.kind[i];
    const ref = k === 0 ? margin : k === 2 ? edge : base;
    const n = gum.noise[i] * 0.04;
    col.setXYZ(
      i,
      Math.min(1, Math.max(0, ref[0] + n)),
      Math.min(1, Math.max(0, ref[1] + n * 0.6)),
      Math.min(1, Math.max(0, ref[2] + n * 0.6))
    );
  }
  col.needsUpdate = true;
}

/* ---------- Câmeras pré-definidas ---------- */
const PRESETS = {
  iso: { pos: [6.2, 5.5, 10.8], target: [0, 0.4, -0.4], up: [0, 1, 0] },
  frontal: { pos: [0, 0.8, 12.8], target: [0, 0.6, 0], up: [0, 1, 0] },
  direita: { pos: [-12.5, 1.2, 1.2], target: [0, 0.6, -0.4], up: [0, 1, 0] },
  esquerda: { pos: [12.5, 1.2, 1.2], target: [0, 0.6, -0.4], up: [0, 1, 0] },
  oclusalLower: { pos: [0, 11.5, 1.8], target: [0, -0.4, -0.4], up: [0, 0, -1] },
  oclusalUpper: { pos: [0, -11.5, 1.8], target: [0, 1.5, -0.4], up: [0, 0, 1] },
  oclusalBoth: { pos: [0, 8.5, 8.5], target: [0, 0.5, -0.4], up: [0, 1, 0] },
};

/* ---------- Mini-mapa das arcadas (navegador estilo iTero) ---------- */
function ArchNavigator({ arch, onArch, selected, onTooth, odonto, mode }) {
  const row = (isUpper) => {
    const nums = isUpper
      ? [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
      : [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
    return nums.map((n, i) => {
      const phi = Math.PI - (i / 15) * Math.PI;
      const cx = 60 + 44 * Math.cos(phi);
      const cy = isUpper ? 92 - 68 * Math.sin(phi) : 112 + 68 * Math.sin(phi);
      const u = n % 10;
      const r = u >= 6 ? 6.2 : u >= 4 ? 5.2 : 4.4;
      const entries = odonto[n] || [];
      const missing = entries.some((e) => e.condition === 'ausente');
      const last = entries[entries.length - 1];
      const fill = mode === 'diag' && last && CONDITIONS[last.condition] ? CONDITIONS[last.condition].color : '#ffffff';
      return (
        <circle
          key={n}
          cx={cx}
          cy={cy}
          r={r}
          fill={missing ? 'transparent' : fill}
          stroke={selected === n ? '#0d9488' : '#94a3b8'}
          strokeWidth={selected === n ? 2.2 : 0.9}
          strokeDasharray={missing ? '2 1.5' : undefined}
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            onTooth(n);
          }}
        >
          <title>{`${n} • ${toothName(n)}`}</title>
        </circle>
      );
    });
  };

  const archBg = (isUpper) => (
    <path
      d={isUpper ? 'M 8 96 C 8 0, 112 0, 112 96 L 98 96 C 98 22, 22 22, 22 96 Z' : 'M 8 108 C 8 204, 112 204, 112 108 L 98 108 C 98 182, 22 182, 22 108 Z'}
      fill={arch === (isUpper ? 'upper' : 'lower') || arch === 'both' ? '#fbd5d9' : '#f1f5f9'}
      stroke={arch === (isUpper ? 'upper' : 'lower') ? '#0d9488' : 'transparent'}
      strokeWidth="1.5"
      style={{ cursor: 'pointer' }}
      onClick={() => onArch(isUpper ? 'upper' : 'lower')}
    />
  );

  return (
    <div className="itero-nav">
      <svg viewBox="0 0 120 204" width="112" height="190">
        {archBg(true)}
        {archBg(false)}
        {row(true)}
        {row(false)}
        <g style={{ cursor: 'pointer' }} onClick={() => onArch('both')}>
          <rect x="38" y="94" width="44" height="16" rx="8" fill={arch === 'both' ? '#0d9488' : '#ffffff'} stroke="#cbd5e1" />
          <text x="60" y="105.5" textAnchor="middle" fontSize="8.5" fontWeight="700" fill={arch === 'both' ? '#ffffff' : '#475569'}>
            Ambas
          </text>
        </g>
      </svg>
      <div className="itero-nav-label">{arch === 'upper' ? 'Maxila' : arch === 'lower' ? 'Mandíbula' : 'Oclusão'}</div>
    </div>
  );
}

/* ========================================================================== */
export default function DentalViewer3D({ patientOdonto = {}, onSelectTooth, initialSelected = 16 }) {
  const wrapRef = useRef(null);
  const mountRef = useRef(null);
  const ctx = useRef({});
  const onSelectRef = useRef(onSelectTooth);
  onSelectRef.current = onSelectTooth;

  const [selected, setSelected] = useState(initialSelected);
  const [hovered, setHovered] = useState(null);
  const [mode, setMode] = useState('natural'); // natural | stone | diag | occlusion
  const [arch, setArch] = useState('both'); // both | upper | lower
  const [jaw, setJaw] = useState(16);
  const [autoRotate, setAutoRotate] = useState(false);
  const [preset, setPreset] = useState('iso');

  useEffect(() => {
    if (initialSelected) setSelected(initialSelected);
  }, [initialSelected]);

  // Montagem da cena Three.js
  useEffect(() => {
    const mount = mountRef.current;
    const w = mount.clientWidth || 800;
    const h = mount.clientHeight || 600;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 200);
    camera.position.set(...PRESETS.iso.pos);
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0); // Fundo transparente para o gradiente clínico CSS
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.replaceChildren(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 5;
    controls.maxDistance = 30;
    controls.rotateSpeed = 0.8;
    controls.autoRotateSpeed = 1.2;
    controls.target.set(...PRESETS.iso.target);

    // Sistema de iluminação clínica 3D de alta luminosidade (sem sombras pretas)
    scene.add(new THREE.AmbientLight(0xffffff, 1.4));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(5, 12, 10);
    scene.add(keyLight);

    const head = new THREE.DirectionalLight(0xffffff, 1.2);
    head.position.set(0, 0, 1);
    camera.add(head);

    const fillLight = new THREE.DirectionalLight(0xfff6ec, 0.9);
    fillLight.position.set(-6, -8, 6);
    scene.add(fillLight);

    // Arcadas Maxilar e Mandibular
    const model = new THREE.Group();
    scene.add(model);

    const upper = buildArch({ upper: true });
    upper.group.position.y = 1.5;
    model.add(upper.group);

    const lowerPivot = new THREE.Group();
    lowerPivot.position.set(0, 0.9, -4.6); // eixo condilar aproximado
    const lower = buildArch({ upper: false });
    lower.group.position.set(0, -0.9, 4.6);
    lowerPivot.add(lower.group);
    model.add(lowerPivot);

    const teeth = { ...upper.teeth, ...lower.teeth };
    Object.assign(ctx.current, { scene, camera, renderer, controls, upper, lower, lowerPivot, teeth, tween: null });

    // Interação: hover + clique sem conflito com rotação
    const ray = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let down = null;
    const pick = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(mouse, camera);
      const targets = Object.values(teeth)
        .filter((t) => t.mesh.visible && (Math.floor(t.num / 10) <= 2 ? upper.group.visible : lowerPivot.visible))
        .map((t) => t.mesh);
      const hit = ray.intersectObjects(targets, false)[0];
      return hit ? hit.object.userData.toothNum : null;
    };
    const onMove = (e) => {
      const n = pick(e);
      setHovered(n);
      renderer.domElement.style.cursor = n ? 'pointer' : 'grab';
    };
    const onDown = (e) => (down = { x: e.clientX, y: e.clientY });
    const onUp = (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 5) return;
      const n = pick(e);
      if (n) {
        setSelected(n);
        onSelectRef.current?.(n);
      }
    };
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);

    let raf;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const tw = ctx.current.tween;
      if (tw) {
        tw.t = Math.min(1, tw.t + 0.05);
        const k = 1 - Math.pow(1 - tw.t, 3);
        camera.position.lerpVectors(tw.p0, tw.p1, k);
        controls.target.lerpVectors(tw.t0, tw.t1, k);
        if (tw.t >= 1) ctx.current.tween = null;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    const ro = new ResizeObserver(() => {
      const nw = mount.clientWidth;
      const nh = mount.clientHeight;
      if (!nw || !nh) return;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      controls.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
      renderer.dispose();
    };
  }, []);

  const flyTo = (name) => {
    const c = ctx.current;
    if (!c.camera) return;
    const p = PRESETS[name] || PRESETS.iso;
    if (p.up) c.camera.up.set(...p.up);
    c.tween = {
      t: 0,
      p0: c.camera.position.clone(),
      p1: new THREE.Vector3(...p.pos),
      t0: c.controls.target.clone(),
      t1: new THREE.Vector3(...p.target),
    };
  };

  const applyPreset = (name) => {
    setPreset(name);
    if (name === 'oclusal') {
      if (arch === 'both') {
        const isUp = [1, 2].includes(Math.floor(selected / 10));
        setArch(isUp ? 'upper' : 'lower');
        flyTo(isUp ? 'oclusalUpper' : 'oclusalLower');
      } else {
        flyTo(arch === 'upper' ? 'oclusalUpper' : 'oclusalLower');
      }
    } else {
      flyTo(name);
    }
  };

  // Visibilidade de arcadas
  useEffect(() => {
    const c = ctx.current;
    if (!c.upper) return;
    c.upper.group.visible = arch !== 'lower';
    c.lowerPivot.visible = arch !== 'upper';
    if (arch === 'both') {
      setPreset('iso');
      flyTo('iso');
    } else {
      setPreset('oclusal');
      flyTo(arch === 'upper' ? 'oclusalUpper' : 'oclusalLower');
    }
  }, [arch]);

  // Abertura mandibular
  useEffect(() => {
    if (ctx.current.lowerPivot) ctx.current.lowerPivot.rotation.x = arch === 'both' ? (jaw * Math.PI) / 180 : 0;
  }, [jaw, arch]);

  useEffect(() => {
    if (ctx.current.controls) ctx.current.controls.autoRotate = autoRotate;
  }, [autoRotate]);

  // Pintura das superfícies e gengiva
  useEffect(() => {
    const c = ctx.current;
    if (!c.teeth) return;
    Object.values(c.teeth).forEach((t) => {
      const entries = patientOdonto[t.num] || [];
      const missing = entries.some((e) => e.condition === 'ausente');
      const extract = entries.some((e) => e.condition === 'extracao');
      t.mesh.visible = !missing;
      t.mesh.material.transparent = mode === 'diag' && extract;
      t.mesh.material.opacity = mode === 'diag' && extract ? 0.55 : 1;
      paintTooth(t, mode, entries);
    });
    [c.upper.gum, c.lower.gum].forEach((g) => {
      paintGum(g, mode);
    });
  }, [mode, patientOdonto]);

  // Destaque de dente selecionado e hover
  useEffect(() => {
    const c = ctx.current;
    if (!c.teeth) return;
    Object.values(c.teeth).forEach((t) => {
      const sel = t.num === selected;
      t.outline.visible = sel && t.mesh.visible;
      t.mesh.material.emissive.setHex(sel ? 0x0d9488 : t.num === hovered ? 0x38bdf8 : 0x000000);
      t.mesh.material.emissiveIntensity = sel ? 0.22 : t.num === hovered ? 0.15 : 0;
    });
  }, [selected, hovered, mode, patientOdonto]);

  const selectFromNav = (n) => {
    setSelected(n);
    onSelectTooth?.(n);
    const isUp = [1, 2].includes(Math.floor(n / 10));
    if (arch !== 'both' && (arch === 'upper') !== isUp) setArch(isUp ? 'upper' : 'lower');
  };

  const exportPng = () => {
    const { renderer } = ctx.current;
    if (!renderer) return;
    const src = renderer.domElement;
    const out = document.createElement('canvas');
    out.width = src.width;
    out.height = src.height;
    const g = out.getContext('2d');
    const grd = g.createRadialGradient(out.width / 2, out.height * 0.45, 0, out.width / 2, out.height * 0.45, out.width * 0.7);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(0.45, '#f0f6fa');
    grd.addColorStop(1, '#d8e8f2');
    g.fillStyle = grd;
    g.fillRect(0, 0, out.width, out.height);
    g.drawImage(src, 0, 0);

    // Carimbo profissional Eva Clinic
    g.fillStyle = '#0d9488';
    g.font = 'bold 20px sans-serif';
    g.fillText('Eva Clinic — Escaneamento 3D', 24, out.height - 36);
    g.fillStyle = '#64748b';
    g.font = '14px sans-serif';
    g.fillText(`Dente #${selected} • ${new Date().toLocaleDateString('pt-BR')}`, 24, out.height - 16);

    const a = document.createElement('a');
    a.href = out.toDataURL('image/png');
    a.download = `eva-clinic-itero-scan-dente-${selected}.png`;
    a.click();
  };

  const entries = patientOdonto[selected] || [];
  const MODES = [
    { id: 'natural', icon: Palette, label: 'Cor Real (iTero RealColor HD)' },
    { id: 'stone', icon: Box, label: 'Modelo de Gesso (iTero Plaster)' },
    { id: 'diag', icon: Activity, label: 'Diagnóstico Clínico (Odontograma)' },
    { id: 'occlusion', icon: Target, label: 'Contatos Oclusais (iTero Clearance)' },
  ];

  return (
    <div className="itero-viewer" ref={wrapRef}>
      <div ref={mountRef} className="itero-canvas" />

      {/* Coluna esquerda: navegador de arcadas + barra de ferramentas iTero */}
      <div className="itero-left">
        <ArchNavigator
          arch={arch}
          onArch={setArch}
          selected={selected}
          onTooth={selectFromNav}
          odonto={patientOdonto}
          mode={mode}
        />
        <div className="itero-tools">
          {MODES.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              id={`btn-3d-mode-${id}`}
              className={`itero-tool ${mode === id ? 'on' : ''}`}
              onClick={() => setMode(id)}
              title={label}
              aria-label={label}
              aria-pressed={mode === id}
            >
              <Icon size={18} />
            </button>
          ))}
        </div>
      </div>

      {/* Topo direito: vistas angulares e controles rápidos */}
      <div className="itero-top">
        <div className="itero-seg" role="group" aria-label="Vistas">
          {[
            ['iso', 'Perspectiva'],
            ['frontal', 'Frontal'],
            ['oclusal', 'Oclusal'],
            ['direita', 'Direita'],
            ['esquerda', 'Esquerda'],
          ].map(([id, label]) => (
            <button
              key={id}
              id={`btn-preset-${id}`}
              className={preset === id ? 'on' : ''}
              onClick={() => applyPreset(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          className={`itero-icon-btn ${autoRotate ? 'on' : ''}`}
          onClick={() => setAutoRotate((v) => !v)}
          title="Rotação automática contínua"
          aria-pressed={autoRotate}
          id="btn-3d-autorotate"
        >
          <RotateCw size={16} />
        </button>
        <button
          className="itero-icon-btn"
          onClick={() => applyPreset(arch === 'both' ? 'iso' : 'oclusal')}
          title="Recentralizar câmera"
          id="btn-3d-recenter"
        >
          <LocateFixed size={16} />
        </button>
        <button
          className="itero-icon-btn"
          onClick={exportPng}
          title="Exportar imagem do escaneamento (PNG)"
          id="btn-export-mockup-png"
        >
          <Download size={16} />
        </button>
      </div>

      {/* Inferior esquerdo: dente selecionado */}
      <div className="itero-info">
        <div className="itero-info-badge">{selected}</div>
        <div style={{ minWidth: 0 }}>
          <div className="itero-info-title">{toothName(selected)}</div>
          <div className="itero-info-tags">
            {entries.length === 0 ? (
              <span className="itero-tag">Hígido</span>
            ) : (
              entries.map((e) => (
                <span key={e.id} className="itero-tag" style={{ '--c': CONDITIONS[e.condition]?.color || '#64748b' }}>
                  <i />
                  {CONDITIONS[e.condition]?.label || e.condition}
                  {e.faces?.length ? ` (${e.faces.join(',')})` : ''}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Inferior direito: legenda diagnóstica / oclusal ou abertura mandibular */}
      <div className="itero-bottom-right">
        {mode === 'diag' && (
          <div className="itero-legend">
            {['carie', 'restauracao', 'tratamento', 'extracao', 'coroa', 'canal'].map((k) => (
              <span key={k}>
                <i style={{ background: CONDITIONS[k].color }} />
                {CONDITIONS[k].label}
              </span>
            ))}
          </div>
        )}
        {mode === 'occlusion' && (
          <div className="itero-legend">
            <span>
              <i style={{ background: '#ef4444' }} /> Contato Forte (&lt; 0.2mm)
            </span>
            <span>
              <i style={{ background: '#10b981' }} /> Contato Ideal (0.5mm)
            </span>
            <span>
              <i style={{ background: '#38bdf8' }} /> Folga Suave (&gt; 1.0mm)
            </span>
          </div>
        )}
        {arch === 'both' && (
          <label className="itero-jaw">
            <span>Abertura</span>
            <input
              type="range"
              min="0"
              max="35"
              value={jaw}
              onChange={(e) => setJaw(Number(e.target.value))}
              id="slider-jaw-open"
            />
            <b>{jaw}°</b>
          </label>
        )}
      </div>
    </div>
  );
}
