// ===========================================================================
// Eva Clinic — Leitor & Motor de Tomografia DICOM (MPR Axial, Sagital, Coronal)
// Zero dependências externas, ultra-otimizado para CBCT / TC odontológica.
// Suporta arquivos únicos multi-frame ou pastas com centenas de fatias .dcm.
// ===========================================================================

export const DENTAL_PRESETS = [
  { id: 'bone', label: 'Osso alveolar / Implante', ww: 2000, wl: 450 },
  { id: 'denseBone', label: 'Cortical & Dente', ww: 3000, wl: 800 },
  { id: 'soft', label: 'Tecidos moles', ww: 450, wl: 40 },
  { id: 'sinus', label: 'Vias aéreas & Seio maxilar', ww: 1600, wl: -200 },
];

/**
 * Lê uma string ASCII ou tag numérica no buffer DICOM
 */
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
 * Decodifica um arquivo DICOM (.dcm) individual
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
  let explicit = true;

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
    windowCenter: 400,
    windowWidth: 2000,
    pixelSpacing: [0.3, 0.3],
    sliceThickness: 0.3,
    sliceLocation: 0,
    imagePositionPatient: [0, 0, 0],
    patientName: 'Paciente',
    pixelDataOffset: -1,
    pixelDataLength: 0,
  };

  while (offset + 8 <= len) {
    const group = view.getUint16(offset, true);
    const element = view.getUint16(offset + 2, true);
    const tag = (group << 16) | element;

    let vr = '';
    let elementLength = 0;
    let dataOffset = 0;

    // Detecta Explicit VR x Implicit VR
    if (explicit) {
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

    if (elementLength === 0xffffffff) {
      // Indefinite length sequence
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
 * Constrói um Volume 3D contínuo a partir de uma lista de fatias ou de um arquivo multi-frame.
 * Aplica downsampling se o volume exceder limites de memória para garantir fluidez a 60 FPS.
 */
export function buildVolumeFromSlices(parsedList, maxDimension = 256) {
  if (!parsedList || !parsedList.length) {
    throw new Error('Nenhuma fatia DICOM fornecida.');
  }

  // 1. Caso multi-frame (arquivo único contendo todas as fatias do exame)
  if (parsedList.length === 1 && parsedList[0].meta.numberOfFrames > 1) {
    const single = parsedList[0];
    const { rows, cols, numberOfFrames, rescaleSlope, rescaleIntercept, pixelSpacing, sliceThickness } = single.meta;
    const totalSlices = numberOfFrames;
    const raw = single.rawPixels;

    // Calcula escala de downsampling se for muito pesado
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

  // 2. Caso série de fatias individuais (.dcm separados)
  // Ordena espacialmente por posição Z
  parsedList.sort((a, b) => a.meta.sliceLocation - b.meta.sliceLocation);

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

  // Estima espessura entre fatias consecutivas
  let dz = first.sliceThickness || 0.3;
  if (parsedList.length >= 2) {
    const dist = Math.abs(parsedList[1].meta.sliceLocation - parsedList[0].meta.sliceLocation);
    if (dist > 0.05 && dist < 10) dz = dist;
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

/**
 * Converte Hounsfield Unit para pixel em escala de cinza 0-255 com base em WW/WL
 */
export function huToGray(hu, ww, wl) {
  const low = wl - ww / 2;
  const high = wl + ww / 2;
  if (hu <= low) return 0;
  if (hu >= high) return 255;
  return Math.round(((hu - low) / ww) * 255);
}

/**
 * Cria LUT (Lookup Table) rápida para 60 FPS
 */
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

/**
 * Extrai corte Axial (Z constante)
 */
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

/**
 * Extrai corte Coronal (Y constante)
 */
export function extractCoronalImageData(volume, ySlice, ww, wl, outImageData) {
  const [W, H, D] = volume.dims;
  const y = Math.max(0, Math.min(H - 1, Math.round(ySlice)));
  const { lut, minHU } = createLut(ww, wl, volume.minHU, volume.maxHU);
  const data = outImageData.data;
  const vol = volume.data;

  let pIdx = 0;
  // No Coronal, a altura é o eixo Z (de cima para baixo ou invertido)
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

/**
 * Extrai corte Sagital (X constante)
 */
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
