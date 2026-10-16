// Constantes clínicas: dentição FDI, faces, condições e catálogo de procedimentos

export const PERMANENT = {
  upper: [
    [18, 17, 16, 15, 14, 13, 12, 11],
    [21, 22, 23, 24, 25, 26, 27, 28],
  ],
  lower: [
    [48, 47, 46, 45, 44, 43, 42, 41],
    [31, 32, 33, 34, 35, 36, 37, 38],
  ],
};

export const DECIDUOUS = {
  upper: [
    [55, 54, 53, 52, 51],
    [61, 62, 63, 64, 65],
  ],
  lower: [
    [85, 84, 83, 82, 81],
    [71, 72, 73, 74, 75],
  ],
};

export const isDeciduous = (n) => Math.floor(n / 10) >= 5;
export const isUpper = (n) => [1, 2, 5, 6].includes(Math.floor(n / 10));

export const toothType = (n) => {
  const u = n % 10;
  if (isDeciduous(n)) return u <= 2 ? 'incisor' : u === 3 ? 'canine' : 'molar';
  if (u <= 2) return 'incisor';
  if (u === 3) return 'canine';
  if (u <= 5) return 'premolar';
  return 'molar';
};

const TYPE_NAMES = {
  incisor: 'Incisivo',
  canine: 'Canino',
  premolar: 'Pré-molar',
  molar: 'Molar',
};

export const toothName = (n) => {
  const q = Math.floor(n / 10);
  const u = n % 10;
  const side = [1, 4, 5, 8].includes(q) ? 'Direito' : 'Esquerdo';
  const arch = isUpper(n) ? 'Superior' : 'Inferior';
  let base = TYPE_NAMES[toothType(n)];
  if (!isDeciduous(n)) {
    if (u === 1) base = 'Incisivo central';
    if (u === 2) base = 'Incisivo lateral';
    if (u === 4) base = '1º pré-molar';
    if (u === 5) base = '2º pré-molar';
    if (u === 6) base = '1º molar';
    if (u === 7) base = '2º molar';
    if (u === 8) base = '3º molar (siso)';
  } else {
    base += ' decíduo';
  }
  return `${arch} ${side} • ${base}`;
};

export const toothSimpleName = (n) => {
  const q = Math.floor(n / 10);
  const u = n % 10;
  const side = [1, 4, 5, 8].includes(q) ? 'Direito' : 'Esquerdo';
  const arch = isUpper(n) ? 'Superior' : 'Inferior';
  let base = TYPE_NAMES[toothType(n)];
  if (u === 1) base = 'Incisivo Central';
  if (u === 2) base = 'Incisivo Lateral';
  if (u === 4) base = '1º Pré-Molar';
  if (u === 5) base = '2º Pré-Molar';
  if (u === 6) base = '1º Molar';
  if (u === 7) base = '2º Molar';
  if (u === 8) base = '3º Molar';
  return { side, arch, base };
};

export const FACES = [
  { id: 'O', name: 'Oclusal / Incisal', short: 'Oclusal' },
  { id: 'M', name: 'Mesial', short: 'Mesial' },
  { id: 'D', name: 'Distal', short: 'Distal' },
  { id: 'V', name: 'Vestibular', short: 'Vestibular' },
  { id: 'L', name: 'Lingual / Palatina', short: 'Palatina' },
];

// Condições clínicas alinhadas à referência visual médica
export const CONDITIONS = {
  higido: { label: 'Hígido', color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4', level: 'tooth', icon: 'check' },
  carie: { label: 'Cárie', color: '#e11d48', bg: '#ffe4e6', border: '#fecdd3', level: 'face', icon: 'dot' },
  restauracao: { label: 'Restauração', color: '#0284c7', bg: '#e0f2fe', border: '#bae6fd', level: 'face', icon: 'dot' },
  tratamento: { label: 'Tratamento', color: '#ea580c', bg: '#ffedd5', border: '#fed7aa', level: 'tooth', icon: 'dot' },
  ausente: { label: 'Ausente', color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0', level: 'tooth', icon: 'circle' },
  extracao: { label: 'Extração', color: '#9333ea', bg: '#f3e8ff', border: '#e9d5ff', level: 'tooth', icon: 'x' },
  outros: { label: 'Outros', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', level: 'tooth', icon: 'plus' },
  // Compatibilidade com apontamentos anteriores
  canal: { label: 'Tratamento de Canal', color: '#9333ea', bg: '#f3e8ff', border: '#e9d5ff', level: 'tooth', icon: 'dot' },
  selante: { label: 'Selante', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', level: 'face', icon: 'dot' },
  coroa: { label: 'Coroa / Prótese', color: '#d97706', bg: '#fef3c7', border: '#fde68a', level: 'tooth', icon: 'dot' },
  implante: { label: 'Implante', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1', level: 'tooth', icon: 'dot' },
  fratura: { label: 'Fratura', color: '#ea580c', bg: '#ffedd5', border: '#fed7aa', level: 'face', icon: 'dot' },
};

export const PROCEDURES = [
  { id: 'p_aval', name: 'Consulta de avaliação', category: 'Clínico geral', price: 150, duration: 30 },
  { id: 'p_prof', name: 'Profilaxia e limpeza', category: 'Prevenção', price: 180, duration: 45, materials: [{ item: 'i_luva', qty: 2 }, { item: 'i_pasta', qty: 1 }] },
  { id: 'p_rasp', name: 'Raspagem periodontal (quadrante)', category: 'Periodontia', price: 250, duration: 60, materials: [{ item: 'i_anest', qty: 1 }] },
  { id: 'p_sel', name: 'Selante', category: 'Prevenção', price: 90, duration: 20, tooth: true, condition: 'selante', faces: true },
  { id: 'p_res1', name: 'Restauração em resina (1 face)', category: 'Dentística', price: 180, duration: 40, tooth: true, condition: 'restauracao', faces: true, materials: [{ item: 'i_resina', qty: 1 }, { item: 'i_anest', qty: 1 }] },
  { id: 'p_res2', name: 'Restauração em resina (2+ faces)', category: 'Dentística', price: 260, duration: 60, tooth: true, condition: 'restauracao', faces: true, materials: [{ item: 'i_resina', qty: 2 }, { item: 'i_anest', qty: 1 }] },
  { id: 'p_fac', name: 'Faceta em resina', category: 'Estética', price: 450, duration: 60, tooth: true, condition: 'restauracao', faces: true, materials: [{ item: 'i_resina', qty: 2 }] },
  { id: 'p_endo1', name: 'Endodontia unirradicular', category: 'Endodontia', price: 650, duration: 90, tooth: true, condition: 'canal', materials: [{ item: 'i_lima', qty: 1 }, { item: 'i_anest', qty: 2 }] },
  { id: 'p_endo3', name: 'Endodontia molar', category: 'Endodontia', price: 1100, duration: 120, tooth: true, condition: 'canal', materials: [{ item: 'i_lima', qty: 2 }, { item: 'i_anest', qty: 2 }] },
  { id: 'p_coroa', name: 'Coroa em porcelana', category: 'Prótese', price: 1800, duration: 60, tooth: true, condition: 'coroa' },
  { id: 'p_impl', name: 'Implante dentário', category: 'Implantodontia', price: 3200, duration: 120, tooth: true, condition: 'implante', materials: [{ item: 'i_impl', qty: 1 }, { item: 'i_anest', qty: 3 }] },
  { id: 'p_ext', name: 'Extração simples', category: 'Cirurgia', price: 220, duration: 40, tooth: true, condition: 'extracao', materials: [{ item: 'i_anest', qty: 1 }, { item: 'i_fio', qty: 1 }] },
  { id: 'p_siso', name: 'Extração de siso', category: 'Cirurgia', price: 450, duration: 60, tooth: true, condition: 'extracao', materials: [{ item: 'i_anest', qty: 2 }, { item: 'i_fio', qty: 1 }] },
  { id: 'p_clar', name: 'Clareamento a laser', category: 'Estética', price: 900, duration: 90 },
  { id: 'p_orto', name: 'Manutenção ortodôntica', category: 'Ortodontia', price: 200, duration: 30 },
  { id: 'p_ptot', name: 'Prótese total', category: 'Prótese', price: 2500, duration: 60 },
];

export const procById = (id) => PROCEDURES.find((p) => p.id === id);

export const PLAN_STATUS = {
  rascunho: { label: 'Rascunho', cls: '' },
  aguardando: { label: 'Aguardando aprovação', cls: 'b-warn' },
  aprovado: { label: 'Aprovado', cls: 'b-info' },
  andamento: { label: 'Em andamento', cls: 'b-ok' },
  concluido: { label: 'Concluído', cls: 'b-ok' },
  recusado: { label: 'Recusado', cls: 'b-danger' },
};

export const APPT_STATUS = {
  agendado: { label: 'Agendado', cls: 'b-info' },
  confirmado: { label: 'Confirmado', cls: 'b-brand' },
  atendimento: { label: 'Em atendimento', cls: 'b-violet' },
  concluido: { label: 'Concluído', cls: 'b-ok' },
  faltou: { label: 'Faltou', cls: 'b-danger' },
  cancelado: { label: 'Cancelado', cls: '' },
};
