// Orientação do arco dentário calculada a partir do próprio arquivo STL (espaço local do modelo)
import * as THREE from 'three';

function eigenSym3(m) {
  // Jacobi simples para matriz simétrica 3x3
  const a = m.map((r) => r.slice());
  const v = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let it = 0; it < 60; it++) {
    let p = 0, q = 1;
    if (Math.abs(a[0][2]) > Math.abs(a[p][q])) { p = 0; q = 2; }
    if (Math.abs(a[1][2]) > Math.abs(a[p][q])) { p = 1; q = 2; }
    if (Math.abs(a[p][q]) < 1e-9) break;
    const th = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
    const c = Math.cos(th), s = Math.sin(th);
    for (let k = 0; k < 3; k++) {
      const akp = a[k][p], akq = a[k][q];
      a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq;
    }
    for (let k = 0; k < 3; k++) {
      const apk = a[p][k], aqk = a[q][k];
      a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk;
    }
    for (let k = 0; k < 3; k++) {
      const vkp = v[k][p], vkq = v[k][q];
      v[k][p] = c * vkp - s * vkq; v[k][q] = s * vkp + c * vkq;
    }
  }
  return [0, 1, 2]
    .map((i) => ({ val: a[i][i], vec: new THREE.Vector3(v[0][i], v[1][i], v[2][i]).normalize() }))
    .sort((x, y) => y.val - x.val);
}

export function computeArchFrame(geometry) {
  const pos = geometry.attributes.position;
  const nrm = geometry.attributes.normal;
  const count = pos.count;
  const step = Math.max(1, Math.floor(count / 40000));
  const c = new THREE.Vector3();
  let k = 0;
  for (let i = 0; i < count; i += step) { c.x += pos.getX(i); c.y += pos.getY(i); c.z += pos.getZ(i); k++; }
  c.divideScalar(k);
  const m = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const nSum = new THREE.Vector3();
  for (let i = 0; i < count; i += step) {
    const x = pos.getX(i) - c.x, y = pos.getY(i) - c.y, z = pos.getZ(i) - c.z;
    m[0][0] += x * x; m[0][1] += x * y; m[0][2] += x * z;
    m[1][1] += y * y; m[1][2] += y * z; m[2][2] += z * z;
    if (nrm) { nSum.x += nrm.getX(i); nSum.y += nrm.getY(i); nSum.z += nrm.getZ(i); }
  }
  m[1][0] = m[0][1]; m[2][0] = m[0][2]; m[2][1] = m[1][2];
  const [e0, e1, e2] = eigenSym3(m);
  const lateral = e0.vec; // largura do arco
  let depth = e1.vec; // ântero-posterior
  let occlusal = e2.vec; // normal do plano oclusal
  if (nSum.dot(occlusal) < 0) occlusal = occlusal.clone().negate();

  // A frente do arco é a ponta onde os pontos ficam próximos da linha média
  let minD = Infinity, maxD = -Infinity;
  const samples = [];
  for (let i = 0; i < count; i += step) {
    const p = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).sub(c);
    const d = p.dot(depth), l = Math.abs(p.dot(lateral));
    samples.push([d, l]);
    if (d < minD) minD = d;
    if (d > maxD) maxD = d;
  }
  const span = maxD - minD || 1;
  let hiL = 0, hiN = 0, loL = 0, loN = 0;
  for (const [d, l] of samples) {
    if (d > maxD - span * 0.15) { hiL += l; hiN++; }
    if (d < minD + span * 0.15) { loL += l; loN++; }
  }
  if (hiN && loN && hiL / hiN > loL / loN) { depth = depth.clone().negate(); [minD, maxD] = [-maxD, -minD]; }

  // Centro polar: ~40% da profundidade a partir da região posterior
  const center = c.clone().add(depth.clone().multiplyScalar(minD + span * 0.4));
  return { center: center.toArray(), occlusal: occlusal.toArray(), forward: depth.toArray(), lateral: lateral.toArray() };
}

const ANGLES = [0.18, 0.35, 0.55, 0.78, 1.05, 1.35, 1.65];

/** Sugere o dente FDI a partir de um ponto no espaço local do modelo */
export function estimateFdiFromFrame(localPoint, frame, archRole = 'inferior') {
  const c = new THREE.Vector3(...frame.center);
  const n = new THREE.Vector3(...frame.occlusal);
  const f = new THREE.Vector3(...frame.forward);
  const isUpper = archRole === 'superior';
  const right = isUpper ? n.clone().cross(f) : f.clone().cross(n); // lado direito do paciente
  const p = localPoint.clone().sub(c);
  const x = p.dot(right), y = p.dot(f);
  const ang = Math.abs(Math.atan2(x, y));
  let idx = ANGLES.findIndex((a) => ang < a);
  idx = idx === -1 ? 8 : idx + 1;
  const isRight = x > 0;
  const quadrant = isUpper ? (isRight ? 1 : 2) : (isRight ? 4 : 3);
  return quadrant * 10 + idx;
}
