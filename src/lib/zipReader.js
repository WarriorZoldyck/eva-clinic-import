// ===========================================================================
// Eva Clinic — Descompressor ZIP nativo para Tomografias DICOM
// Extrai arquivos .dcm de arquivos .zip no próprio navegador usando
// a API padrão DecompressionStream ('deflate-raw'). Zero dependências externas.
// ===========================================================================

/**
 * Lê todos os arquivos contidos em um buffer de arquivo .ZIP
 * Retorna uma lista de { name, arrayBuffer }
 */
export async function extractZipFiles(zipArrayBuffer) {
  const view = new DataView(zipArrayBuffer);
  const u8 = new Uint8Array(zipArrayBuffer);
  const len = zipArrayBuffer.byteLength;
  const files = [];

  let offset = 0;

  while (offset + 30 <= len) {
    const signature = view.getUint32(offset, true);

    // Assinatura do Local File Header: 0x04034b50 ("PK\x03\x04")
    if (signature !== 0x04034b50) {
      // Se não for header local (ex.: Central Directory 0x02014b50), interrompe busca local
      break;
    }

    const flags = view.getUint16(offset + 6, true);
    const method = view.getUint16(offset + 8, true); // 0 = uncompressed, 8 = deflate
    let compSize = view.getUint32(offset + 18, true);
    let uncompSize = view.getUint32(offset + 22, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);

    const nameOffset = offset + 30;
    let name = '';
    for (let i = 0; i < nameLen; i++) {
      name += String.fromCharCode(u8[nameOffset + i]);
    }

    const dataOffset = nameOffset + nameLen + extraLen;

    // Se as dimensões estão no Data Descriptor posterior (bit 3 da flag)
    if ((flags & 0x0008) && compSize === 0) {
      // Procura próxima assinatura PK para delimitar o bloco
      let nextSig = dataOffset;
      while (nextSig + 4 <= len) {
        if (
          u8[nextSig] === 0x50 &&
          u8[nextSig + 1] === 0x4b &&
          ((u8[nextSig + 2] === 0x03 && u8[nextSig + 3] === 0x04) ||
            (u8[nextSig + 2] === 0x01 && u8[nextSig + 3] === 0x02) ||
            (u8[nextSig + 2] === 0x07 && u8[nextSig + 3] === 0x08))
        ) {
          break;
        }
        nextSig++;
      }
      compSize = nextSig - dataOffset;
    }

    if (dataOffset + compSize > len) break;

    // Pula diretórios
    if (!name.endsWith('/') && compSize > 0) {
      const compressedSlice = u8.subarray(dataOffset, dataOffset + compSize);

      try {
        let fileBuffer;
        if (method === 0) {
          // Arquivo não compactado (Stored)
          fileBuffer = compressedSlice.slice().buffer;
        } else if (method === 8) {
          // Compactado com Deflate padrão
          if (typeof DecompressionStream !== 'undefined') {
            const ds = new DecompressionStream('deflate-raw');
            const stream = new Response(compressedSlice).body.pipeThrough(ds);
            fileBuffer = await new Response(stream).arrayBuffer();
          } else {
            console.warn('DecompressionStream não suportado neste navegador.');
          }
        }

        if (fileBuffer && fileBuffer.byteLength > 0) {
          files.push({
            name,
            arrayBuffer: fileBuffer,
            size: fileBuffer.byteLength,
          });
        }
      } catch (err) {
        console.warn(`Erro ao descompactar ${name}:`, err.message);
      }
    }

    offset = dataOffset + compSize;

    // Se houver Data Descriptor (0x08074b50), pula 16 ou 12 bytes
    if (offset + 4 <= len && view.getUint32(offset, true) === 0x08074b50) {
      offset += 16;
    }

    // Alinha para próximo byte se necessário
    while (offset < len && u8[offset] !== 0x50) {
      offset++;
    }
  }

  return files;
}
