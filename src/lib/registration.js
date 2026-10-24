// ===========================================================================
// Alinhamento Rígido de Malha 3D (STL x Tomografia CBCT)
// Algoritmo de Kabsch (SVD 3x3) + Cálculo de Erro Médio (TRE) + Refinamento ICP
// ===========================================================================
import * as THREE from 'three';

/**
 * Decomposição em Autovalores e Autovetores de Matriz Simétrica 3x3 (Método de Jacobi)
 */
function jacobi3x3(A, maxIter = 50) {
  const V = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const D = [A[0].slice(), A[1].slice(), A[2].slice()];

  for (let it = 0; it < maxIter; it++) {
    // Encontra o maior elemento fora da diagonal
    let p = 0, q = 1;
    let maxOff = Math.abs(D[0][1]);
    if (Math.abs(D[0][2]) > maxOff) { p = 0; q = 2; maxOff = Math.abs(D[0][2]); }
    if (Math.abs(D[1][2]) > maxOff) { p = 1; q = 2; maxOff = Math.abs(D[1][2]); }

    if (maxOff < 1e-12) break;

    const diff = D[q][q] - D[p][p];
    let t;
    if (Math.abs(D[p][q]) < Math.abs(diff) * 1e-15) {
      t = D[p][q] / diff;
    } else {
      const phi = diff / (2 * D[p][q]);
      t = 1 / (Math.abs(phi) + Math.sqrt(phi * phi + 1));
      if (phi < 0) t = -t;
    }

    const c = 1 / Math.sqrt(t * t + 1);
    const s = t * c;
    const tau = s / (1 + c);
    const h = t * D[p][q];

    D[p][q] = 0;
    D[p][p] -= h;
    D[q][q] += h;

    for (let j = 0; j < 3; j++) {
      if (j !== p && j !== q) {
        const g1 = D[Math.min(j, p)][Math.max(j, p)];
        const g2 = D[Math.min(j, q)][Math.max(j, q)];
        const np = g1 - s * (g2 + tau * g1);
        const nq = g2 + s * (g1 - tau * g2);
        D[Math.min(j, p)][Math.max(j, p)] = np;
        D[Math.min(j, q)][Math.max(j, q)] = nq;
      }
      const v1 = V[j][p];
      const v2 = V[j][q];
      V[j][p] = v1 - s * (v2 + tau * v1);
      V[j][q] = v2 + s * (v1 - tau * v2);
    }
  }

  return {
    eigenvalues: [D[0][0], D[1][1], D[2][2]],
    eigenvectors: V,
  };
}

/**
 * Decomposição em Valores Singulares 3x3 (SVD): H = U * Sigma * V^T
 */
function svd3x3(H) {
  // H^T * H (3x3 simétrica)
  const HtH = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        HtH[i][j] += H[k][i] * H[k][j];
      }
    }
  }

  const { eigenvalues, eigenvectors } = jacobi3x3(HtH);

  // Ordena por autovalores decrescentes
  const order = [0, 1, 2].sort((a, b) => eigenvalues[b] - eigenvalues[a]);
  const s = order.map((idx) => Math.sqrt(Math.max(0, eigenvalues[idx])));
  const V = [
    [eigenvectors[0][order[0]], eigenvectors[0][order[1]], eigenvectors[0][order[2]]],
    [eigenvectors[1][order[0]], eigenvectors[1][order[1]], eigenvectors[1][order[2]]],
    [eigenvectors[2][order[0]], eigenvectors[2][order[1]], eigenvectors[2][order[2]]],
  ];

  // U = H * V * diag(1/s)
  const U = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let col = 0; col < 3; col++) {
    const invS = s[col] > 1e-8 ? 1 / s[col] : 0;
    for (let row = 0; row < 3; row++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) sum += H[row][k] * V[k][col];
      U[row][col] = sum * invS;
    }
  }

  return { U, S: s, V };
}

/**
 * Algoritmo de Kabsch: Encontra a rotação e translação rígida ideal que alinha
 * um conjunto de pontos P (no STL) a um conjunto de pontos Q (na Tomografia / Osso).
 * 
 * @param {Array<THREE.Vector3>} pointsP - Pontos marcados no modelo STL
 * @param {Array<THREE.Vector3>} pointsQ - Pontos marcados na Tomografia
 * @returns {Object} { R: THREE.Matrix3, T: THREE.Vector3, matrix4: THREE.Matrix4, errorMm: number }
 */
export function computeKabschAlignment(pointsP, pointsQ) {
  const N = Math.min(pointsP.length, pointsQ.length);
  if (N < 3) {
    throw new Error('São necessários no mínimo 3 pares de pontos correspondentes para alinhar.');
  }

  // 1. Centróides
  const cP = new THREE.Vector3();
  const cQ = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    cP.add(pointsP[i]);
    cQ.add(pointsQ[i]);
  }
  cP.divideScalar(N);
  cQ.divideScalar(N);

  // 2. Matriz de Covariância 3x3: H = sum((p_i - cP) * (q_i - cQ)^T)
  const H = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  for (let i = 0; i < N; i++) {
    const p = pointsP[i].clone().sub(cP);
    const q = pointsQ[i].clone().sub(cQ);

    H[0][0] += p.x * q.x; H[0][1] += p.x * q.y; H[0][2] += p.x * q.z;
    H[1][0] += p.y * q.x; H[1][1] += p.y * q.y; H[1][2] += p.y * q.z;
    H[2][0] += p.z * q.x; H[2][1] += p.z * q.y; H[2][2] += p.z * q.z;
  }

  // 3. SVD de H: H = U * S * V^T
  const { U, V } = svd3x3(H);

  // 4. Rotação: R = V * U^T
  const R = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        R[i][j] += V[i][k] * U[j][k];
      }
    }
  }

  // Verifica reflexão (det(R) deve ser +1)
  const detR =
    R[0][0] * (R[1][1] * R[2][2] - R[1][2] * R[2][1]) -
    R[0][1] * (R[1][0] * R[2][2] - R[1][2] * R[2][0]) +
    R[0][2] * (R[1][0] * R[2][1] - R[1][1] * R[2][0]);

  if (detR < 0) {
    // Inverte a última coluna de V para eliminar a reflexão
    for (let i = 0; i < 3; i++) {
      R[i][0] = 0; R[i][1] = 0; R[i][2] = 0;
      for (let j = 0; j < 3; j++) {
        for (let k = 0; k < 3; k++) {
          const vElem = k === 2 ? -V[i][k] : V[i][k];
          R[i][j] += vElem * U[j][k];
        }
      }
    }
  }

  // 5. Translação: T = cQ - R * cP
  const rMat = new THREE.Matrix4().set(
    R[0][0], R[0][1], R[0][2], 0,
    R[1][0], R[1][1], R[1][2], 0,
    R[2][0], R[2][1], R[2][2], 0,
    0, 0, 0, 1
  );

  const rCp = cP.clone().applyMatrix4(rMat);
  const T = cQ.clone().sub(rCp);

  // Matriz 4x4 completa de transformação homogênea
  const transform = new THREE.Matrix4().set(
    R[0][0], R[0][1], R[0][2], T.x,
    R[1][0], R[1][1], R[1][2], T.y,
    R[2][0], R[2][1], R[2][2], T.z,
    0, 0, 0, 1
  );

  // 6. Cálculo do Erro Médio de Alinhamento (Target Registration Error - TRE em mm)
  let totalErrorSq = 0;
  for (let i = 0; i < N; i++) {
    const transformedP = pointsP[i].clone().applyMatrix4(transform);
    totalErrorSq += transformedP.distanceToSquared(pointsQ[i]);
  }
  const meanErrorMm = Math.sqrt(totalErrorSq / N);

  return {
    transform,
    rotation: rMat,
    translation: T,
    errorMm: meanErrorMm,
  };
}

/**
 * Refinamento automático (ICP ponto-a-ponto) do STL sobre a superfície do osso/dentes da TC.
 * @param {Float32Array} sourceWorld - pontos do STL já no espaço do mundo (x,y,z...)
 * @param {Float32Array} targetPositions - posições da malha do osso (espaço do mundo)
 * @returns {{ transform: THREE.Matrix4, rmsBefore: number, rmsAfter: number, pairs: number }}
 */
export function icpRefine(sourceWorld, targetPositions, { iterations = 25, maxDist = 3, cell = 2 } = {}) {
  // Grade espacial dos pontos-alvo (subamostrados)
  const grid = new Map();
  const tStep = Math.max(1, Math.floor(targetPositions.length / 3 / 300000));
  const key = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
  for (let i = 0; i < targetPositions.length; i += 3 * tStep) {
    const k = key(targetPositions[i], targetPositions[i + 1], targetPositions[i + 2]);
    let arr = grid.get(k);
    if (!arr) grid.set(k, (arr = []));
    arr.push(i);
  }
  const reach = Math.ceil(maxDist / cell);
  const nearest = (x, y, z) => {
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
    let best = -1, bestD = maxDist * maxDist;
    for (let a = -reach; a <= reach; a++) for (let b = -reach; b <= reach; b++) for (let c = -reach; c <= reach; c++) {
      const arr = grid.get(`${cx + a},${cy + b},${cz + c}`);
      if (!arr) continue;
      for (const i of arr) {
        const dx = targetPositions[i] - x, dy = targetPositions[i + 1] - y, dz = targetPositions[i + 2] - z;
        const d = dx * dx + dy * dy + dz * dz;
        if (d < bestD) { bestD = d; best = i; }
      }
    }
    return best >= 0 ? { i: best, d: bestD } : null;
  };

  const n = sourceWorld.length / 3;
  const pts = [];
  for (let i = 0; i < n; i++) pts.push(new THREE.Vector3(sourceWorld[i * 3], sourceWorld[i * 3 + 1], sourceWorld[i * 3 + 2]));

  const total = new THREE.Matrix4();
  let rmsBefore = null, rms = 0, pairs = 0;
  for (let it = 0; it < iterations; it++) {
    const P = [], Q = [];
    let sum = 0;
    for (const p of pts) {
      const nn = nearest(p.x, p.y, p.z);
      if (!nn) continue;
      P.push(p);
      Q.push(new THREE.Vector3(targetPositions[nn.i], targetPositions[nn.i + 1], targetPositions[nn.i + 2]));
      sum += nn.d;
    }
    if (P.length < 10) break;
    rms = Math.sqrt(sum / P.length);
    pairs = P.length;
    if (rmsBefore === null) rmsBefore = rms;
    const { transform } = computeKabschAlignment(P, Q);
    pts.forEach((p) => p.applyMatrix4(transform));
    total.premultiply(transform);
    if (rms < 0.05) break;
  }
  if (rmsBefore === null) throw new Error('O STL está longe demais da tomografia. Faça primeiro o alinhamento por pontos.');
  return { transform: total, rmsBefore, rmsAfter: rms, pairs };
}
