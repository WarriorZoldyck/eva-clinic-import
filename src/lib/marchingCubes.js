// ===========================================================================
// Marching Cubes 3D em JavaScript puro para Tomografia Odontológica (CBCT)
// Executa diretamente no navegador, gerando geometria de osso com precisão milimétrica.
// ===========================================================================
import { EDGE_TABLE, TRI_TABLE } from './marchingCubesLookup';

/**
 * Interpola linearmente a posição de um vértice na aresta entre dois cantos
 */
function interp(iso, p1, p2, val1, val2) {
  if (Math.abs(iso - val1) < 1e-5) return [p1[0], p1[1], p1[2]];
  if (Math.abs(iso - val2) < 1e-5) return [p2[0], p2[1], p2[2]];
  if (Math.abs(val1 - val2) < 1e-5) return [p1[0], p1[1], p1[2]];
  const mu = (iso - val1) / (val2 - val1);
  return [
    p1[0] + mu * (p2[0] - p1[0]),
    p1[1] + mu * (p2[1] - p1[1]),
    p1[2] + mu * (p2[2] - p1[2]),
  ];
}

/**
 * Extrai a superfície óssea em 3D de um volume tomográfico
 * @param {Object} volume - { data: Int16Array, dims: [W, H, D], spacing: [dx, dy, dz] }
 * @param {number} thresholdHu - Threshold em Hounsfield Units (ex: 350-500 HU para osso)
 * @param {number} step - Resolução de amostragem (1 = máxima resolução, 2 = ideal e ultra-rápido)
 * @returns {Object} { positions: Float32Array, normals: Float32Array, vertexCount: number }
 */
export function generateBoneIsosurface(volume, thresholdHu = 400, step = 2) {
  const [W, H, D] = volume.dims;
  const [dx, dy, dz] = volume.spacing || [0.4, 0.4, 0.4];
  const data = volume.data;

  // Centro geométrico para alinhar a malha no ponto zero do espaço 3D
  const cx = (W * dx) / 2;
  const cy = (H * dy) / 2;
  const cz = (D * dz) / 2;

  // Função inline rápida de leitura de voxel com clamp
  const getVal = (x, y, z) => {
    if (x < 0 || x >= W || y < 0 || y >= H || z < 0 || z >= D) return -1000;
    return data[z * W * H + y * W + x];
  };

  // Cálculo de gradiente para vetores normais suaves
  const getNormal = (x, y, z) => {
    const nx = getVal(x - step, y, z) - getVal(x + step, y, z);
    const ny = getVal(x, y - step, z) - getVal(x, y + step, z);
    const nz = getVal(x, y, z - step) - getVal(x, y, z + step);
    const len = Math.hypot(nx, ny, nz) || 1;
    return [nx / len, ny / len, nz / len];
  };

  // Buffer dinâmico de triângulos
  let cap = 1 << 20;
  let posArr = new Float32Array(cap);
  let normArr = new Float32Array(cap);
  let n = 0;
  const grow = () => {
    cap *= 2;
    const p2 = new Float32Array(cap); p2.set(posArr); posArr = p2;
    const n2 = new Float32Array(cap); n2.set(normArr); normArr = n2;
  };

  const cornerOffsets = [
    [0, 0, 0],
    [step, 0, 0],
    [step, step, 0],
    [0, step, 0],
    [0, 0, step],
    [step, 0, step],
    [step, step, step],
    [0, step, step],
  ];

  const edgePairs = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];

  const vPos = new Array(8);
  const vVal = new Float32Array(8);
  const vNorm = new Array(8);
  const edgeVerts = new Array(12);
  const edgeNorms = new Array(12);

  for (let z = 0; z < D - step; z += step) {
    for (let y = 0; y < H - step; y += step) {
      for (let x = 0; x < W - step; x += step) {
        let cubeIndex = 0;

        for (let i = 0; i < 8; i++) {
          const px = x + cornerOffsets[i][0];
          const py = y + cornerOffsets[i][1];
          const pz = z + cornerOffsets[i][2];
          const val = getVal(px, py, pz);
          vVal[i] = val;
          vPos[i] = [px * dx - cx, -(py * dy - cy), pz * dz - cz]; // Orientação radiológica padrão
          if (val > thresholdHu) cubeIndex |= 1 << i;
        }

        if (EDGE_TABLE[cubeIndex] === 0) continue;

        // Calcula normais apenas para cantos dos cubos com transição
        for (let i = 0; i < 8; i++) {
          const px = x + cornerOffsets[i][0];
          const py = y + cornerOffsets[i][1];
          const pz = z + cornerOffsets[i][2];
          vNorm[i] = getNormal(px, py, pz);
        }

        const edges = EDGE_TABLE[cubeIndex];
        for (let e = 0; e < 12; e++) {
          if (edges & (1 << e)) {
            const [i1, i2] = edgePairs[e];
            edgeVerts[e] = interp(thresholdHu, vPos[i1], vPos[i2], vVal[i1], vVal[i2]);
            const mu = (thresholdHu - vVal[i1]) / (vVal[i2] - vVal[i1] || 1);
            edgeNorms[e] = [
              vNorm[i1][0] + mu * (vNorm[i2][0] - vNorm[i1][0]),
              vNorm[i1][1] + mu * (vNorm[i2][1] - vNorm[i1][1]),
              vNorm[i1][2] + mu * (vNorm[i2][2] - vNorm[i1][2]),
            ];
          }
        }

        const triList = TRI_TABLE[cubeIndex];
        for (let t = 0; triList[t] !== -1; t += 3) {
          const e0 = triList[t];
          const e1 = triList[t + 1];
          const e2 = triList[t + 2];

          const p0 = edgeVerts[e0];
          const p1 = edgeVerts[e1];
          const p2 = edgeVerts[e2];

          const n0 = edgeNorms[e0];
          const n1 = edgeNorms[e1];
          const n2 = edgeNorms[e2];

          if (n + 9 > cap) grow();
          posArr[n] = p0[0]; posArr[n + 1] = p0[1]; posArr[n + 2] = p0[2];
          posArr[n + 3] = p1[0]; posArr[n + 4] = p1[1]; posArr[n + 5] = p1[2];
          posArr[n + 6] = p2[0]; posArr[n + 7] = p2[1]; posArr[n + 8] = p2[2];
          normArr[n] = n0[0]; normArr[n + 1] = n0[1]; normArr[n + 2] = n0[2];
          normArr[n + 3] = n1[0]; normArr[n + 4] = n1[1]; normArr[n + 5] = n1[2];
          normArr[n + 6] = n2[0]; normArr[n + 7] = n2[1]; normArr[n + 8] = n2[2];
          n += 9;
        }
      }
    }
  }

  const positions = posArr.slice(0, n);
  const normals = normArr.slice(0, n);

  return {
    positions,
    normals,
    vertexCount: positions.length / 3,
    triangleCount: positions.length / 9,
  };
}
