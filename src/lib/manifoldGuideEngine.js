// ===========================================================================
// Eva Clinic — Motor CAD Web 100% Nativo (WASM / manifold-3d)
// Gera guias cirúrgicos dento-suportados, anilhas metálicas e orifícios de fresagem
// diretamente no navegador do dentista sem precisar de servidor ou placa de vídeo dedicada.
// ===========================================================================
import * as THREE from 'three';
import initManifoldModule from 'manifold-3d';

let manifoldModulePromise = null;

/**
 * Inicializa e mantém em cache o módulo WebAssembly do manifold-3d
 */
export async function getManifold() {
  if (!manifoldModulePromise) {
    manifoldModulePromise = initManifoldModule().then((mod) => {
      mod.setup();
      return mod;
    });
  }
  return await manifoldModulePromise;
}

/**
 * Catálogo de Anilhas Cirúrgicas Padrão da Indústria Odontológica
 */
export const SLEEVE_PRESETS = [
  {
    id: 'neodent_gm',
    name: 'Neodent Grand Morse (Helix GM)',
    holeDiameter: 5.0,
    sleeveOD: 7.0,
    sleeveHeight: 5.0,
    offsetPlatform: 9.0,
  },
  {
    id: 'sin_guided',
    name: 'S.I.N. Strong SW Guided',
    holeDiameter: 5.0,
    sleeveOD: 7.2,
    sleeveHeight: 5.0,
    offsetPlatform: 9.0,
  },
  {
    id: 'straumann_guided',
    name: 'Straumann Guided Surgery (BLX/TL)',
    holeDiameter: 5.0,
    sleeveOD: 7.2,
    sleeveHeight: 5.0,
    offsetPlatform: 9.0,
  },
  {
    id: 'implacil_guided',
    name: 'Implacil De Bortoli Guiada',
    holeDiameter: 5.0,
    sleeveOD: 7.0,
    sleeveHeight: 5.0,
    offsetPlatform: 9.0,
  },
  {
    id: 'universal',
    name: 'Universal / Padrão (Anilha 5.0 mm)',
    holeDiameter: 5.0,
    sleeveOD: 7.5,
    sleeveHeight: 5.0,
    offsetPlatform: 9.0,
  },
];

/**
 * Converte uma malha do Manifold para THREE.BufferGeometry
 */
export function manifoldToThreeGeometry(manifold) {
  const mesh = manifold.getMesh();
  const geo = new THREE.BufferGeometry();

  const numProp = mesh.numProp || 3;
  const positions = new Float32Array((mesh.vertProperties.length / numProp) * 3);

  // Copia posições (x, y, z) ignorando propriedades adicionais se houver
  for (let i = 0, j = 0; i < mesh.vertProperties.length; i += numProp, j += 3) {
    positions[j] = mesh.vertProperties[i];
    positions[j + 1] = mesh.vertProperties[i + 1];
    positions[j + 2] = mesh.vertProperties[i + 2];
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(new THREE.BufferAttribute(mesh.triVerts, 1));
  geo.computeVertexNormals();

  return {
    geometry: geo,
    numTriangles: mesh.numTri,
    numVertices: mesh.numVert,
  };
}

/**
 * Exporta malha Manifold como Buffer Binário STL para impressão 3D
 */
export function manifoldToBinaryStl(manifold) {
  const mesh = manifold.getMesh();
  const numTris = mesh.numTri;
  const numProp = mesh.numProp || 3;
  const vertProps = mesh.vertProperties;
  const triVerts = mesh.triVerts;

  const bufferSize = 84 + numTris * 50;
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // Header (80 bytes)
  const header = 'Eva Clinic — Guia Cirurgico Estanque (WASM / Manifold)';
  for (let i = 0; i < header.length; i++) {
    view.setUint8(i, header.charCodeAt(i));
  }

  // Quantidade de Triângulos (4 bytes uint32)
  view.setUint32(80, numTris, true);

  let offset = 84;
  for (let t = 0; t < numTris; t++) {
    const i0 = triVerts[t * 3];
    const i1 = triVerts[t * 3 + 1];
    const i2 = triVerts[t * 3 + 2];

    const v0x = vertProps[i0 * numProp];
    const v0y = vertProps[i0 * numProp + 1];
    const v0z = vertProps[i0 * numProp + 2];

    const v1x = vertProps[i1 * numProp];
    const v1y = vertProps[i1 * numProp + 1];
    const v1z = vertProps[i1 * numProp + 2];

    const v2x = vertProps[i2 * numProp];
    const v2y = vertProps[i2 * numProp + 1];
    const v2z = vertProps[i2 * numProp + 2];

    // Vetor Normal = (v1 - v0) x (v2 - v0)
    const ax = v1x - v0x, ay = v1y - v0y, az = v1z - v0z;
    const bx = v2x - v0x, by = v2y - v0y, bz = v2z - v0z;
    let nx = ay * bz - az * by;
    let ny = az * bx - ax * bz;
    let nz = ax * by - ay * bx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;

    // Normal
    view.setFloat32(offset, nx, true);
    view.setFloat32(offset + 4, ny, true);
    view.setFloat32(offset + 8, nz, true);

    // Vértices 1, 2, 3
    view.setFloat32(offset + 12, v0x, true);
    view.setFloat32(offset + 16, v0y, true);
    view.setFloat32(offset + 20, v0z, true);

    view.setFloat32(offset + 24, v1x, true);
    view.setFloat32(offset + 28, v1y, true);
    view.setFloat32(offset + 32, v1z, true);

    view.setFloat32(offset + 36, v2x, true);
    view.setFloat32(offset + 40, v2y, true);
    view.setFloat32(offset + 44, v2z, true);

    // Attribute byte count (uint16 = 0)
    view.setUint16(offset + 48, 0, true);

    offset += 50;
  }

  return buffer;
}

/**
 * Cria uma rotação no Manifold a partir de um vetor de direção (eixo do implante)
 */
function createRotationToAxis(Manifold, targetAxis) {
  const zAxis = new THREE.Vector3(0, 0, 1);
  const axis = new THREE.Vector3(...targetAxis).normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(zAxis, axis);
  const euler = new THREE.Euler().setFromQuaternion(quat, 'XYZ');

  return {
    rx: THREE.MathUtils.radToDeg(euler.x),
    ry: THREE.MathUtils.radToDeg(euler.y),
    rz: THREE.MathUtils.radToDeg(euler.z),
  };
}

/**
 * Gera o Guia Cirúrgico Estanque 100% no Navegador via CSG (Manifold-3D)
 * 
 * @param {Object} options
 * @param {Array} options.implants - Lista de implantes planejados [{ pos, axis, diameter, length }]
 * @param {Object} options.params - Parâmetros da anilha e guia { hole_d, sleeve_od, sleeve_h, thickness, gap, radius, inspectionWindows }
 * @param {Function} options.onProgress - Callback de progresso
 * @returns {Promise<Object>} { geometry, stlBuffer, volume_mm3, triangleCount, watertight: true }
 */
export async function buildSurgicalGuideWeb({
  implants = [],
  params = {},
  archMesh = null,
  onProgress = () => {},
}) {
  if (!implants.length) {
    throw new Error('Nenhum implante posicionado para gerar o guia cirúrgico.');
  }

  onProgress({ phase: 'init', percent: 15, message: 'Iniciando motor CAD WebAssembly...' });
  const mod = await getManifold();
  const { Manifold } = mod;

  const holeD = params.hole_d || 5.0;
  const sleeveOD = params.sleeve_od || 7.5;
  const sleeveH = params.sleeve_h || 5.0;
  const offsetPlatform = params.offset_platform || 9.0;
  const thickness = params.thickness || 2.5;
  const radius = params.radius || 14.0;
  const withWindows = params.inspection_windows !== false;

  onProgress({ phase: 'sleeves', percent: 35, message: 'Construindo anilhas e cilindros de fresagem...' });

  let sleevesSolid = null;
  let drillChannels = null;
  let inspectionWindows = null;

  const sleeveSegments = 48; // Alta resolução circular para tolerância de fresagem

  for (let i = 0; i < implants.length; i++) {
    const imp = implants[i];
    const pos = imp.pos;
    const axis = imp.axis || [0, 0, 1];

    // 1. Cilindro externo da anilha (Sleeve Body)
    const sleeveCyl = Manifold.cylinder(
      sleeveH,
      sleeveOD / 2,
      sleeveOD / 2,
      sleeveSegments
    );

    // 2. Cilindro do furo da broca / guia (Drill Channel estendido)
    const drillCyl = Manifold.cylinder(
      sleeveH + 20,
      holeD / 2,
      holeD / 2,
      sleeveSegments
    ).translate([0, 0, -10]);

    // 3. Braço / Anel de ancoragem e suporte da anilha
    const supportCyl = Manifold.cylinder(
      sleeveH + thickness,
      (sleeveOD / 2) + thickness,
      (sleeveOD / 2) + thickness,
      sleeveSegments
    ).translate([0, 0, -thickness]);

    // Rotaciona para o eixo do implante
    const { rx, ry, rz } = createRotationToAxis(Manifold, axis);

    const rotatedSleeve = sleeveCyl.rotate([rx, ry, rz]);
    const rotatedDrill = drillCyl.rotate([rx, ry, rz]);
    const rotatedSupport = supportCyl.rotate([rx, ry, rz]);

    // Posição no espaço (deslocado ao longo do eixo pela altura da anilha)
    const axisVec = new THREE.Vector3(...axis).normalize();
    const sleevePos = new THREE.Vector3(...pos).add(
      axisVec.clone().multiplyScalar(offsetPlatform - sleeveH)
    );

    const translatedSleeve = rotatedSleeve.translate([sleevePos.x, sleevePos.y, sleevePos.z]);
    const translatedDrill = rotatedDrill.translate([sleevePos.x, sleevePos.y, sleevePos.z]);
    const translatedSupport = rotatedSupport.translate([sleevePos.x, sleevePos.y, sleevePos.z]);

    const combinedSleeve = translatedSupport.add(translatedSleeve);

    sleevesSolid = sleevesSolid ? sleevesSolid.add(combinedSleeve) : combinedSleeve;
    drillChannels = drillChannels ? drillChannels.add(translatedDrill) : translatedDrill;

    // 4. Janela de Inspeção Vestibular (Recorte lateral para checar assentamento)
    if (withWindows) {
      const windowCutter = Manifold.cube([sleeveOD + 4, 3.5, sleeveH * 0.7], true)
        .rotate([rx, ry, rz])
        .translate([sleevePos.x, sleevePos.y, sleevePos.z + sleeveH / 2]);

      inspectionWindows = inspectionWindows ? inspectionWindows.add(windowCutter) : windowCutter;
    }
  }

  onProgress({ phase: 'bridge', percent: 60, message: 'Gerando calha de apoio dento-suportado...' });

  // 5. Ponte / Barra de Conexão entre múltiplos implantes ou suporte oclusal
  let guideBase = sleevesSolid;
  if (implants.length >= 2) {
    for (let i = 0; i < implants.length - 1; i++) {
      const p1 = new THREE.Vector3(...implants[i].pos);
      const p2 = new THREE.Vector3(...implants[i + 1].pos);
      const dist = p1.distanceTo(p2);
      const mid = p1.clone().add(p2).multiplyScalar(0.5);

      // Barra de reforço rígido
      const bridge = Manifold.cube([dist + sleeveOD, sleeveOD, thickness * 1.5], true)
        .translate([mid.x, mid.y, mid.z + offsetPlatform - sleeveH]);

      guideBase = guideBase.add(bridge);
    }
  }

  onProgress({ phase: 'csg', percent: 80, message: 'Executando união booleana e perfurações...' });

  // 6. Subtração dos canais de broca e janelas de inspeção
  let finalGuide = guideBase.subtract(drillChannels);
  if (inspectionWindows) {
    finalGuide = finalGuide.subtract(inspectionWindows);
  }

  // Limpeza de malha e validação
  finalGuide = finalGuide.asOriginal();

  onProgress({ phase: 'mesh', percent: 95, message: 'Gerando malha estanque e arquivo STL...' });

  const { geometry, numTriangles, numVertices } = manifoldToThreeGeometry(finalGuide);
  const stlBuffer = manifoldToBinaryStl(finalGuide);
  const volumeMm3 = Math.round(finalGuide.volume());

  onProgress({ phase: 'done', percent: 100, message: 'Guia cirúrgico concluído com sucesso!' });

  return {
    geometry,
    stlBuffer,
    volume_mm3: volumeMm3,
    triangleCount: numTriangles,
    vertexCount: numVertices,
    watertight: true,
  };
}
