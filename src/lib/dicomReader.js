// ===========================================================================
// Eva Clinic — Leitor & Motor de Tomografia DICOM (MPR Axial, Sagital, Coronal)
// Suporta Explicit VR, Implicit VR, multi-frame e pastas com fatias individuais.
// Otimizado para TC Cone Beam (CBCT) odontológica de alta resolução.
// ===========================================================================

export const DENTAL_PRESETS = [
  { id: 'bone', label: 'Osso alveolar / Implante', ww: 2000, wl: 450 },
  { id: 'denseBone', label: 'Cortical & Dente', ww: 3000, wl: 800 },
  { id: 'soft', label: 'Tecidos moles', ww: 450, wl: 40 },
  { id: 'sinus', label: 'Vias aéreas & Seio maxilar', ww: 1600, wl: -200 },
];

const VALID_VRS = new Set([
  'AE', 'AS', 'AT', 'CS', 'DA', 'DS', 'DT', 'FL', 'FD', 'IS', 'LO', 'LT',
  'OB', 'OD', 'OF', 'OL', 'OW', 'PN', 'SH', 'SL', 'SQ', 'SS', 'ST', 'SV',
  'TM', 'UC', 'UI', 'UL', 'UN', 'UR', 'US', 'UT', 'UV',
]);

function readTagString(view, offset, length) {
  let s = '';
  for (let i = 0; i < length; i++) {
    const c = view.getUint8(offset + i);
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s.trim();
}

/**
 * Decodifica um arquivo DICOM (.dcm) individual com suporte robusto a
 * Explicit VR e Implicit VR Little Endian.
 */
export function parseDicomSlice(arrayBuffer, fileName = 'slice.dcm') {
  const view = new DataView(arrayBuffer);
  const u8 = new Uint8Array(arrayBuffer);
  const len = arrayBuffer.byteLength;

  if (len < 132) {
    throw new Error('Arquivo muito pequeno para ser um DICOM válido.');
  }

  // Verifica assinatura DICM (offset 128)
  let isPart10 = false;
  if (
    u8[128] === 0x44 && // 'D'
    u8[129] === 0x49 && // 'I'
    u8[130] === 0x43 && // 'C'
    u8[131] === 0x4d    // 'M'
  ) {
    isPart10 = true;
  }

  let offset = isPart10 ? 132 : 0;
  let datasetExplicit = true; // Group 0002 é sempre explicit; dataset pode ser implicit

  const meta = {
    fileName,
    rows: 0,
    cols: 0,
    numberOfFrames: 1,
    bitsAllocated: 16,
    bitsStored: 16,
    highBit: 15,
    pixelRepresentation: 0, // 0 = unsigned, 1 = signed
    rescaleSlope: 1,
    rescaleIntercept: 0,
    windowCenter: 450,
    windowWidth: 2000,
    pixelSpacing: [0.3, 0.3],
    sliceThickness: 0.3,
    sliceLocation: 0,
    instanceNumber: 1,
    imagePositionPatient: [0, 0, 0],
    patientName: 'Paciente',
    pixelDataOffset: -1,
    pixelDataLength: 0,
  };

  while (offset + 8 <= len) {
    const group = view.getUint16(offset, true);
    const element = view.getUint16(offset + 2, true);
    const tag = (group << 16) | element;

    // Se saiu do group 0002, verifica se a sintaxe do dataset é implícita
    let isExplicit = true;
    if (group > 0x0002) {
      if (!datasetExplicit) {
        isExplicit = false;
      } else {
        // Checagem de segurança de VR
        const c1 = String.fromCharCode(u8[offset + 4]);
        const c2 = String.fromCharCode(u8[offset + 5]);
        const candidateVr = c1 + c2;
        if (!VALID_VRS.has(candidateVr)) {
          isExplicit = false;
          datasetExplicit = false;
        }
      }
    }

    let vr = '';
    let elementLength = 0;
    let dataOffset = 0;

    if (isExplicit) {
      vr = String.fromCharCode(u8[offset + 4], u8[offset + 5]);
      if (['OB', 'OW', 'OF', 'SQ', 'UT', 'UN'].includes(vr)) {
        if (offset + 12 > len) break;
        elementLength = view.getUint32(offset + 8, true);
        dataOffset = offset + 12;
      } else {
        elementLength = view.getUint16(offset + 6, true);
        dataOffset = offset + 8;
      }
    } else {
      elementLength = view.getUint32(offset + 4, true);
      dataOffset = offset + 8;
    }

    // Leitura da Transfer Syntax UID no Group 0002
    if (tag === 0x00020010) {
      const syntax = readTagString(view, dataOffset, Math.min(elementLength, 64));
      // 1.2.840.10008.1.2 é Implicit VR Little Endian
      if (syntax.startsWith('1.2.840.10008.1.2') && !syntax.startsWith('1.2.840.10008.1.2.')) {
        datasetExplicit = false;
      }
    }

    if (elementLength === 0xffffffff) {
      // SQ indefinido
      offset = dataOffset + 4;
      continue;
    }

    // Leitura das tags fundamentais
    if (tag === 0x00280010) {
      // Rows
      meta.rows = elementLength === 2 ? view.getUint16(dataOffset, true) : view.getUint32(dataOffset, true);
    } else if (tag === 0x00280011) {
      // Columns
      meta.cols = elementLength === 2 ? view.getUint16(dataOffset, true) : view.getUint32(dataOffset, true);
    } else if (tag === 0x00280008) {
      // Number of Frames
      const s = readTagString(view, dataOffset, Math.min(elementLength, 16));
      const n = parseInt(s, 10);
      if (!isNaN(n) && n > 0) meta.numberOfFrames = n;
    } else if (tag === 0x00280100) {
      // Bits Allocated
      meta.bitsAllocated = view.getUint16(dataOffset, true);
    } else if (tag === 0x00280101) {
      // Bits Stored
      meta.bitsStored = view.getUint16(dataOffset, true);
    } else if (tag === 0x00280103) {
      // Pixel Representation
      meta.pixelRepresentation = view.getUint16(dataOffset, true);
    } else if (tag === 0x00281050) {
      // Window Center
      const s = readTagString(view, dataOffset, Math.min(elementLength, 32));
      const val = parseFloat(s.split('\\')[0]);
      if (!isNaN(val)) meta.windowCenter = val;
    } else if (tag === 0x00281051) {
      // Window Width
      const s = readTagString(view, dataOffset, Math.min(elementLength, 32));
      const val = parseFloat(s.split('\\')[0]);
      if (!isNaN(val)) meta.windowWidth = val;
    } else if (tag === 0x00281052) {
      // Rescale Intercept
      const s = readTagString(view, dataOffset, Math.min(elementLength, 32));
      const val = parseFloat(s);
      if (!isNaN(val)) meta.rescaleIntercept = val;
    } else if (tag === 0x00281053) {
      // Rescale Slope
      const s = readTagString(view, dataOffset, Math.min(elementLength, 32));
      const val = parseFloat(s);
      if (!isNaN(val)) meta.rescaleSlope = val;
    } else if (tag === 0x00280030) {
      // Pixel Spacing
      const s = readTagString(view, dataOffset, Math.min(elementLength, 32));
      const parts = s.split('\\').map((v) => parseFloat(v));
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        meta.pixelSpacing = [parts[0], parts[1]];
      }
    } else if (tag === 0x00180050) {
      // Slice Thickness
      const s = readTagString(view, dataOffset, Math.min(elementLength, 32));
      const val = parseFloat(s);
      if (!isNaN(val)) meta.sliceThickness = val;
    } else if (tag === 0x00200013) {
      // Instance Number
      const s = readTagString(view, dataOffset, Math.min(elementLength, 16));
      const n = parseInt(s, 10);
      if (!isNaN(n)) meta.instanceNumber = n;
    } else if (tag === 0x00201041) {
      // Slice Location
      const s = readTagString(view, dataOffset, Math.min(elementLength, 32));
      const val = parseFloat(s);
      if (!isNaN(val)) meta.sliceLocation = val;
    } else if (tag === 0x00200032) {
      // Image Position Patient [x, y, z]
      const s = readTagString(view, dataOffset, Math.min(elementLength, 64));
      const parts = s.split('\\').map((v) => parseFloat(v));
      if (parts.length === 3 && !parts.some(isNaN)) {
        meta.imagePositionPatient = parts;
        meta.sliceLocation = parts[2];
      }
    } else if (tag === 0x00100010) {
      // Patient Name
      meta.patientName = readTagString(view, dataOffset, Math.min(elementLength, 64)) || 'Paciente';
    } else if (tag === 0x7fe00010) {
      // Pixel Data
      meta.pixelDataOffset = dataOffset;
      meta.pixelDataLength = elementLength;
      break;
    }

    offset = dataOffset + elementLength;
    if (offset % 2 !== 0) offset++;
  }

  if (meta.pixelDataOffset < 0 || meta.rows <= 0 || meta.cols <= 0) {
    throw new Error('Não foi possível localizar os dados de imagem deste DICOM.');
  }

  // Extrai PixelData nativo
  let rawPixels;
  const pixelCount = meta.rows * meta.cols * meta.numberOfFrames;

  if (meta.bitsAllocated === 16) {
    if (meta.pixelRepresentation === 1) {
      rawPixels = new Int16Array(arrayBuffer, meta.pixelDataOffset, pixelCount);
    } else {
      rawPixels = new Uint16Array(arrayBuffer, meta.pixelDataOffset, pixelCount);
    }
  } else {
    rawPixels = new Uint8Array(arrayBuffer, meta.pixelDataOffset, pixelCount);
  }

  return {
    meta,
    rawPixels,
  };
}

/**
 * Constrói o volume 3D garantindo a ordenação correta das fatias (por posição Z ou Instance Number)
 */
export function buildVolumeFromSlices(parsedList, maxDimension = 256) {
  if (!parsedList || !parsedList.length) {
    throw new Error('Nenhuma fatia DICOM fornecida.');
  }

  // 1. Caso multi-frame
  if (parsedList.length === 1 && parsedList[0].meta.numberOfFrames > 1) {
    const single = parsedList[0];
    const { rows, cols, numberOfFrames, rescaleSlope, rescaleIntercept, pixelSpacing, sliceThickness } = single.meta;
    const totalSlices = numberOfFrames;
    const raw = single.rawPixels;

    const step = rows > maxDimension || cols > maxDimension ? 2 : 1;
    const outW = Math.floor(cols / step);
    const outH = Math.floor(rows / step);
    const outD = totalSlices;

    const volumeHU = new Int16Array(outW * outH * outD);
    let minHU = 99999;
    let maxHU = -99999;

    let idx = 0;
    for (let z = 0; z < outD; z++) {
      const frameOffset = z * rows * cols;
      for (let y = 0; y < outH; y++) {
        const rowOffset = frameOffset + y * step * cols;
        for (let x = 0; x < outW; x++) {
          const rawVal = raw[rowOffset + x * step];
          const hu = Math.round(rawVal * rescaleSlope + rescaleIntercept);
          volumeHU[idx++] = hu;
          if (hu < minHU) minHU = hu;
          if (hu > maxHU) maxHU = hu;
        }
      }
    }

    return {
      dims: [outW, outH, outD],
      spacing: [pixelSpacing[1] * step, pixelSpacing[0] * step, sliceThickness || 0.3],
      data: volumeHU,
      minHU,
      maxHU,
      patientName: single.meta.patientName,
      downsampled: step > 1,
    };
  }

  // 2. Caso série de fatias individuais (.dcm)
  // Ordena prioritariamente por Z da posição do paciente, ou por sliceLocation, ou por instanceNumber
  parsedList.sort((a, b) => {
    if (a.meta.imagePositionPatient[2] !== b.meta.imagePositionPatient[2]) {
      return a.meta.imagePositionPatient[2] - b.meta.imagePositionPatient[2];
    }
    if (a.meta.sliceLocation !== b.meta.sliceLocation) {
      return a.meta.sliceLocation - b.meta.sliceLocation;
    }
    return a.meta.instanceNumber - b.meta.instanceNumber;
  });

  const first = parsedList[0].meta;
  const rows = first.rows;
  const cols = first.cols;
  const totalSlices = parsedList.length;

  const step = rows > maxDimension || cols > maxDimension ? 2 : 1;
  const outW = Math.floor(cols / step);
  const outH = Math.floor(rows / step);
  const outD = totalSlices;

  const volumeHU = new Int16Array(outW * outH * outD);
  let minHU = 99999;
  let maxHU = -99999;

  let idx = 0;
  for (let z = 0; z < outD; z++) {
    const slice = parsedList[z];
    const raw = slice.rawPixels;
    const slope = slice.meta.rescaleSlope;
    const intercept = slice.meta.rescaleIntercept;

    for (let y = 0; y < outH; y++) {
      const rowOffset = y * step * cols;
      for (let x = 0; x < outW; x++) {
        const rawVal = raw[rowOffset + x * step];
        const hu = Math.round(rawVal * slope + intercept);
        volumeHU[idx++] = hu;
        if (hu < minHU) minHU = hu;
        if (hu > maxHU) maxHU = hu;
      }
    }
  }

  let dz = first.sliceThickness || 0.3;
  if (parsedList.length >= 2) {
    const dist = Math.abs(parsedList[1].meta.sliceLocation - parsedList[0].meta.sliceLocation);
    if (dist > 0.05 && dist < 15) dz = dist;
  }

  return {
    dims: [outW, outH, outD],
    spacing: [first.pixelSpacing[1] * step, first.pixelSpacing[0] * step, dz],
    data: volumeHU,
    minHU,
    maxHU,
    patientName: first.patientName,
    downsampled: step > 1,
  };
}

export function huToGray(hu, ww, wl) {
  const low = wl - ww / 2;
  const high = wl + ww / 2;
  if (hu <= low) return 0;
  if (hu >= high) return 255;
  return Math.round(((hu - low) / ww) * 255);
}

export function createLut(ww, wl, minHU = -1024, maxHU = 3071) {
  const range = maxHU - minHU + 1;
  const lut = new Uint8Array(range);
  const low = wl - ww / 2;
  const high = wl + ww / 2;
  for (let i = 0; i < range; i++) {
    const hu = minHU + i;
    if (hu <= low) lut[i] = 0;
    else if (hu >= high) lut[i] = 255;
    else lut[i] = Math.round(((hu - low) / ww) * 255);
  }
  return { lut, minHU };
}

export function extractAxialImageData(volume, zSlice, ww, wl, outImageData) {
  const [W, H, D] = volume.dims;
  const z = Math.max(0, Math.min(D - 1, Math.round(zSlice)));
  const { lut, minHU } = createLut(ww, wl, volume.minHU, volume.maxHU);
  const data = outImageData.data;
  const vol = volume.data;

  const zOffset = z * W * H;
  let pIdx = 0;

  for (let i = 0; i < W * H; i++) {
    const hu = vol[zOffset + i];
    const gray = lut[hu - minHU] || 0;
    data[pIdx++] = gray;
    data[pIdx++] = gray;
    data[pIdx++] = gray;
    data[pIdx++] = 255;
  }
  return outImageData;
}

export function extractCoronalImageData(volume, ySlice, ww, wl, outImageData) {
  const [W, H, D] = volume.dims;
  const y = Math.max(0, Math.min(H - 1, Math.round(ySlice)));
  const { lut, minHU } = createLut(ww, wl, volume.minHU, volume.maxHU);
  const data = outImageData.data;
  const vol = volume.data;

  let pIdx = 0;
  for (let z = D - 1; z >= 0; z--) {
    const zOffset = z * W * H + y * W;
    for (let x = 0; x < W; x++) {
      const hu = vol[zOffset + x];
      const gray = lut[hu - minHU] || 0;
      data[pIdx++] = gray;
      data[pIdx++] = gray;
      data[pIdx++] = gray;
      data[pIdx++] = 255;
    }
  }
  return outImageData;
}

export function extractSagittalImageData(volume, xSlice, ww, wl, outImageData) {
  const [W, H, D] = volume.dims;
  const x = Math.max(0, Math.min(W - 1, Math.round(xSlice)));
  const { lut, minHU } = createLut(ww, wl, volume.minHU, volume.maxHU);
  const data = outImageData.data;
  const vol = volume.data;

  let pIdx = 0;
  for (let z = D - 1; z >= 0; z--) {
    const zOffset = z * W * H;
    for (let y = 0; y < H; y++) {
      const hu = vol[zOffset + y * W + x];
      const gray = lut[hu - minHU] || 0;
      data[pIdx++] = gray;
      data[pIdx++] = gray;
      data[pIdx++] = gray;
      data[pIdx++] = 255;
    }
  }
  return outImageData;
}
