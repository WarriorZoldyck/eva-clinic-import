// ===========================================================================
// Eva Clinic — Exportador CAD de Guia Cirúrgico Dento-Suportado (Cliente)
// Gera arquivo binário STL estanque (watertight) pronto para impressão 3D (SLA/DLP)
// ===========================================================================

export function exportBinarySTL(geometry, filename = 'guia_cirurgico.stl') {
  // Converte geometria Three.js para arquivo binário STL (padrão industrial)
  const isBufferGeometry = geometry.isBufferGeometry;
  if (!isBufferGeometry) {
    throw new Error('A geometria precisa ser um BufferGeometry do Three.js');
  }

  const index = geometry.index;
  const position = geometry.attributes.position;
  const numTriangles = index ? index.count / 3 : position.count / 3;

  const bufferLength = 84 + numTriangles * 50;
  const buffer = new ArrayBuffer(bufferLength);
  const view = new DataView(buffer);

  // 80 bytes de cabeçalho
  const header = 'Eva Clinic Marching Cubes CAD Surgical Guide - Watertight 3D Mesh';
  for (let i = 0; i < 80; i++) {
    view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
  }

  // 4 bytes: quantidade de triângulos
  view.setUint32(80, numTriangles, true);

  let offset = 84;
  const getVertex = (i) => [
    position.getX(i),
    position.getY(i),
    position.getZ(i),
  ];

  for (let t = 0; t < numTriangles; t++) {
    let i0, i1, i2;
    if (index) {
      i0 = index.getX(t * 3);
      i1 = index.getX(t * 3 + 1);
      i2 = index.getX(t * 3 + 2);
    } else {
      i0 = t * 3;
      i1 = t * 3 + 1;
      i2 = t * 3 + 2;
    }

    const v0 = getVertex(i0);
    const v1 = getVertex(i1);
    const v2 = getVertex(i2);

    // Vetores aresta
    const ax = v1[0] - v0[0], ay = v1[1] - v0[1], az = v1[2] - v0[2];
    const bx = v2[0] - v0[0], by = v2[1] - v0[1], bz = v2[2] - v0[2];

    // Vetor normal
    let nx = ay * bz - az * by;
    let ny = az * bx - ax * bz;
    let nz = ax * by - ay * bx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 1e-6) {
      nx /= len; ny /= len; nz /= len;
    } else {
      nx = 0; ny = 0; nz = 1;
    }

    // Normal
    view.setFloat32(offset, nx, true); offset += 4;
    view.setFloat32(offset, ny, true); offset += 4;
    view.setFloat32(offset, nz, true); offset += 4;

    // Vértice 0
    view.setFloat32(offset, v0[0], true); offset += 4;
    view.setFloat32(offset, v0[1], true); offset += 4;
    view.setFloat32(offset, v0[2], true); offset += 4;

    // Vértice 1
    view.setFloat32(offset, v1[0], true); offset += 4;
    view.setFloat32(offset, v1[1], true); offset += 4;
    view.setFloat32(offset, v1[2], true); offset += 4;

    // Vértice 2
    view.setFloat32(offset, v2[0], true); offset += 4;
    view.setFloat32(offset, v2[1], true); offset += 4;
    view.setFloat32(offset, v2[2], true); offset += 4;

    // 2 bytes de atributo não utilizado
    view.setUint16(offset, 0, true); offset += 2;
  }

  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return {
    numTriangles,
    sizeBytes: bufferLength,
  };
}

export function downloadBase64STL(base64Data, filename = 'guia_cirurgico.stl') {
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
