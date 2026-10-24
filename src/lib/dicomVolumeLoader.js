// ===========================================================================
// Leitor e Reconstrutor de Volume Tomográfico (CBCT / DICOM) para o Eva Clinic
// Utiliza jszip e dicom-parser com ordenação física espacial por ImagePositionPatient
// e downsample adaptativo (0.4mm) para alta performance no navegador sem travar a UI.
// ===========================================================================
import JSZip from 'jszip';
import dicomParser from 'dicom-parser';

/**
 * Filtra e extrai fatias DICOM válidas de um arquivo .ZIP ou lista de arquivos
 */
export async function loadDicomFiles(inputFiles, onProgress = () => {}) {
  const fileArray = Array.from(inputFiles);
  const dicomBuffers = [];

  onProgress({ phase: 'lendo', percent: 5, message: 'Examinando arquivos selecionados...' });

  // 1. Descompacta arquivos ZIP se existirem
  for (let i = 0; i < fileArray.length; i++) {
    const file = fileArray[i];
    if (/\.zip$/i.test(file.name)) {
      onProgress({ phase: 'unzip', percent: 10, message: `Descompactando ${file.name}...` });
      const zipData = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(zipData);
      
      const zipEntries = [];
      zip.forEach((relativePath, zipEntry) => {
        // Ignora pastas, cache e relatórios proprietários do fabricante (ex: Vatech Cache, Analyses, etc.)
        if (
          !zipEntry.dir &&
          !relativePath.includes('__MACOSX') &&
          !/cache/i.test(relativePath) &&
          !/analyses/i.test(relativePath) &&
          !/\.(xml|npj|ini|txt|json|log|png|jpg)$/i.test(relativePath)
        ) {
          zipEntries.push({ path: relativePath, entry: zipEntry });
        }
      });

      const totalEntries = zipEntries.length;
      for (let j = 0; j < totalEntries; j++) {
        const u8 = await zipEntries[j].entry.async('uint8array');
        dicomBuffers.push({ name: zipEntries[j].path, data: u8 });
        if (j % 25 === 0 || j === totalEntries - 1) {
          const pct = 10 + Math.round((j / totalEntries) * 30);
          onProgress({ phase: 'unzip', percent: pct, message: `Lendo fatias do ZIP (${j + 1}/${totalEntries})...` });
        }
      }
    } else {
      // Arquivo avulso (.dcm, .ima ou pasta selecionada)
      if (
        !/cache/i.test(file.name) &&
        !/analyses/i.test(file.name) &&
        !/\.(xml|npj|ini|txt|json|log|png|jpg)$/i.test(file.name)
      ) {
        const buf = await file.arrayBuffer();
        dicomBuffers.push({ name: file.name, data: new Uint8Array(buf) });
      }
    }
  }

  if (dicomBuffers.length === 0) {
    throw new Error('Nenhum arquivo DICOM válido encontrado no arquivo ou pasta selecionada.');
  }

  // 2. Parse individual de cada fatia com dicom-parser
  onProgress({ phase: 'parsing', percent: 45, message: `Processando metadados de ${dicomBuffers.length} fatias...` });
  const parsedSlices = [];

  let patientName = 'Paciente';
  let rows = 0;
  let cols = 0;
  let pixelSpacing = [0.2, 0.2];
  let rescaleIntercept = 0;
  let rescaleSlope = 1;
  let pixelRepresentation = 0;

  let sliceNormal = null;
  let unsupported = null;

  for (let i = 0; i < dicomBuffers.length; i++) {
    try {
      const byteArray = dicomBuffers[i].data;
      const dataSet = dicomParser.parseDicom(byteArray);

      const posStr = dataSet.string('x00200032'); // ImagePositionPatient
      if (!posStr) continue;

      const ts = dataSet.string('x00020010') || '';
      if (/^1\.2\.840\.10008\.1\.2\.(4\.|5$|2$)/.test(ts.trim())) {
        unsupported = ts.trim();
        continue;
      }

      const posParts = posStr.split('\\').map(Number);
      if (!sliceNormal) {
        const o = (dataSet.string('x00200037') || '').split('\\').map(Number);
        if (o.length === 6 && o.every(Number.isFinite)) {
          const n = [o[1] * o[5] - o[2] * o[4], o[2] * o[3] - o[0] * o[5], o[0] * o[4] - o[1] * o[3]];
          const len = Math.hypot(...n) || 1;
          sliceNormal = n.map((v) => v / len);
        } else {
          sliceNormal = [0, 0, 1];
        }
      }
      const posZ = posParts.length === 3
        ? posParts[0] * sliceNormal[0] + posParts[1] * sliceNormal[1] + posParts[2] * sliceNormal[2]
        : i * 0.2;

      if (!rows) {
        rows = dataSet.uint16('x00280010') || 512;
        cols = dataSet.uint16('x00280011') || 512;
        patientName = dataSet.string('x00100010') || patientName;
        const spacingStr = dataSet.string('x00280030');
        if (spacingStr) {
          const sParts = spacingStr.split('\\').map(Number);
          if (sParts.length === 2 && sParts[0] > 0) pixelSpacing = sParts;
        }
        rescaleIntercept = parseFloat(dataSet.string('x00281052') || '0');
        rescaleSlope = parseFloat(dataSet.string('x00281053') || '1');
        pixelRepresentation = dataSet.uint16('x00280103') || 0;
      }

      const pixelDataElement = dataSet.elements.x7fe00010;
      if (!pixelDataElement || !pixelDataElement.length) continue;

      parsedSlices.push({
        name: dicomBuffers[i].name,
        posZ,
        byteArray,
        dataOffset: pixelDataElement.dataOffset,
        length: pixelDataElement.length,
      });
    } catch {
      // Ignora arquivos do diretório que não são DICOM válido
    }

    if (i % 30 === 0) {
      const pct = 45 + Math.round((i / dicomBuffers.length) * 30);
      onProgress({ phase: 'parsing', percent: pct, message: `Lendo fatias DICOM (${i + 1}/${dicomBuffers.length})...` });
    }
  }

  if (parsedSlices.length === 0) {
    if (unsupported) {
      throw new Error('Esta tomografia está gravada em formato compactado, que ainda não é suportado. Exporte do tomógrafo como DICOM sem compressão.');
    }
    throw new Error('Nenhuma fatia tomográfica legível pôde ser interpretada.');
  }

  // 3. Ordenação física espacial ao longo da normal do corte (considera inclinação do exame)
  parsedSlices.sort((a, b) => a.posZ - b.posZ);

  // Espaçamento real entre fatias (mediana das diferenças)
  let sliceSpacingZ = 0.2;
  if (parsedSlices.length > 1) {
    const diffs = [];
    for (let k = 1; k < parsedSlices.length; k++) diffs.push(Math.abs(parsedSlices[k].posZ - parsedSlices[k - 1].posZ));
    diffs.sort((a, b) => a - b);
    sliceSpacingZ = diffs[Math.floor(diffs.length / 2)] || 0.2;
  }


  // 4. Downsample adaptativo (0.4mm) para fluidez absoluta em 60 FPS no navegador
  onProgress({ phase: 'building', percent: 80, message: 'Construindo volume tomográfico otimizado...' });

  const origW = cols;
  const origH = rows;
  const origD = parsedSlices.length;

  const stepXY = origW > 350 ? 2 : 1;
  const stepZ = origD > 250 ? 2 : 1;

  const outW = Math.floor(origW / stepXY);
  const outH = Math.floor(origH / stepXY);
  const outD = Math.floor(origD / stepZ);

  const outSpacing = [
    pixelSpacing[1] * stepXY,
    pixelSpacing[0] * stepXY,
    sliceSpacingZ * stepZ,
  ];

  const totalVoxels = outW * outH * outD;
  const volumeData = new Int16Array(totalVoxels);

  let minHu = Infinity;
  let maxHu = -Infinity;

  for (let zOut = 0; zOut < outD; zOut++) {
    const sliceIndex = zOut * stepZ;
    const slice = parsedSlices[sliceIndex];

    // Cria visualização tipada (Uint16 ou Int16) a partir do offset exato
    const buffer = slice.byteArray.buffer.slice(
      slice.dataOffset,
      slice.dataOffset + origW * origH * 2
    );
    const rawPixels = pixelRepresentation === 1 ? new Int16Array(buffer) : new Uint16Array(buffer);

    for (let yOut = 0; yOut < outH; yOut++) {
      const yIn = yOut * stepXY;
      const rowOffset = yIn * origW;
      const outRowOffset = (zOut * outH + yOut) * outW;

      for (let xOut = 0; xOut < outW; xOut++) {
        const xIn = xOut * stepXY;
        const raw = rawPixels[rowOffset + xIn];
        const hu = Math.round(raw * rescaleSlope + rescaleIntercept);

        if (hu < minHu) minHu = hu;
        if (hu > maxHu) maxHu = hu;

        volumeData[outRowOffset + xOut] = hu;
      }
    }
  }

  onProgress({ phase: 'pronto', percent: 100, message: 'Tomografia carregada com sucesso!' });

  return {
    patientName: patientName.replace(/\^/g, ' ').trim() || 'Exame Tomográfico',
    dims: [outW, outH, outD],
    spacing: outSpacing,
    originalDims: [origW, origH, origD],
    originalSpacing: [pixelSpacing[1], pixelSpacing[0], sliceSpacingZ],
    slicesCount: parsedSlices.length,
    data: volumeData,
    minHu: Math.max(-1024, minHu),
    maxHu: Math.min(4000, maxHu),
    windowPresets: {
      bone: { ww: 2000, wl: 450, label: 'Osso (450 HU)' },
      teeth: { ww: 3000, wl: 1000, label: 'Dentes (1000 HU)' },
      soft: { ww: 400, wl: 40, label: 'Tecido Mole' },
    },
  };
}
