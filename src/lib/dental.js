// Constantes clínicas: dentição FDI, faces, condições e catálogo completo de procedimentos por especialidade

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
  canal: { label: 'Tratamento de Canal', color: '#9333ea', bg: '#f3e8ff', border: '#e9d5ff', level: 'tooth', icon: 'dot' },
  selante: { label: 'Selante', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', level: 'face', icon: 'dot' },
  coroa: { label: 'Coroa / Prótese', color: '#d97706', bg: '#fef3c7', border: '#fde68a', level: 'tooth', icon: 'dot' },
  implante: { label: 'Implante', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', level: 'tooth', icon: 'dot' },
  fratura: { label: 'Fratura', color: '#ea580c', bg: '#ffedd5', border: '#fed7aa', level: 'face', icon: 'dot' },
};

// Especialidades odontológicas
export const SPECIALTIES = [
  'Todas',
  'Cirurgia',
  'Dentística',
  'Diagnóstico',
  'Endodontia',
  'Implantodontia',
  'Prótese',
  'Periodontia',
  'Ortodontia',
];

// Catálogo expandido de procedimentos organizados por especialidade médica
export const PROCEDURES = [
  // 1. Cirurgia
  { id: 'p_ext', name: 'Extração simples', category: 'Cirurgia', price: 220, duration: 40, tooth: true, condition: 'extracao', materials: [{ item: 'i_anest', qty: 1 }] },
  { id: 'p_siso', name: 'Extração de dente incluso / siso', category: 'Cirurgia', price: 450, duration: 60, tooth: true, condition: 'extracao', materials: [{ item: 'i_anest', qty: 2 }] },
  { id: 'p_apic', name: 'Apicectomia com obturação retrógrada', category: 'Cirurgia', price: 750, duration: 80, tooth: true, condition: 'tratamento' },
  { id: 'p_fluor', name: 'Aplicação tópica de flúor', category: 'Cirurgia', price: 120, duration: 30 },
  { id: 'p_biop_lab', name: 'Biópsia de lábio com envio anatomopatológico', category: 'Cirurgia', price: 380, duration: 45 },
  { id: 'p_biop_ling', name: 'Biópsia de língua com envio anatomopatológico', category: 'Cirurgia', price: 420, duration: 45 },
  { id: 'p_aprf', name: 'APRF (Fibrina Rica em Plaquetas / Membrana autóloga)', category: 'Cirurgia', price: 550, duration: 60 },
  { id: 'p_aum_vest', name: 'Aumento de vestíbulo cirúrgico', category: 'Cirurgia', price: 680, duration: 60 },
  { id: 'p_fren', name: 'Frenectomia labial / lingual', category: 'Cirurgia', price: 350, duration: 45 },
  { id: 'p_ulect', name: 'Ulectomia / Ulotomia', category: 'Cirurgia', price: 280, duration: 30 },

  // 2. Dentística & Estética
  { id: 'p_res1', name: 'Restauração em resina composta (1 face)', category: 'Dentística', price: 180, duration: 40, tooth: true, condition: 'restauracao', faces: true, materials: [{ item: 'i_resina', qty: 1 }, { item: 'i_anest', qty: 1 }] },
  { id: 'p_res2', name: 'Restauração em resina composta (2+ faces)', category: 'Dentística', price: 260, duration: 60, tooth: true, condition: 'restauracao', faces: true, materials: [{ item: 'i_resina', qty: 2 }, { item: 'i_anest', qty: 1 }] },
  { id: 'p_res_est', name: 'Restauração estética direta em dente anterior', category: 'Dentística', price: 320, duration: 60, tooth: true, condition: 'restauracao', faces: true },
  { id: 'p_aum_coroa', name: 'Aumento de coroa clínica', category: 'Dentística', price: 450, duration: 50, tooth: true, condition: 'tratamento' },
  { id: 'p_clar_laser', name: 'Clareamento dental a laser em consultório', category: 'Dentística', price: 950, duration: 90 },
  { id: 'p_clar_caseiro', name: 'Clareamento dental caseiro supervisionado com moldeiras', category: 'Dentística', price: 600, duration: 45 },
  { id: 'p_desg_selet', name: 'Desgaste seletivo / Ajuste oclusal', category: 'Dentística', price: 220, duration: 40, tooth: true },
  { id: 'p_faceta_res', name: 'Faceta em resina composta direta', category: 'Dentística', price: 480, duration: 60, tooth: true, condition: 'restauracao', faces: true },
  { id: 'p_faceta_porc', name: 'Faceta / Lente de contato em porcelana', category: 'Dentística', price: 1800, duration: 90, tooth: true, condition: 'coroa' },

  // 3. Diagnóstico
  { id: 'p_aval', name: 'Consulta de avaliação / Diagnóstico clínico inicial', category: 'Diagnóstico', price: 150, duration: 30 },
  { id: 'p_retorno', name: 'Consulta de retorno e acompanhamento', category: 'Diagnóstico', price: 80, duration: 20 },
  { id: 'p_rx_periap', name: 'Radiografia periapical digital', category: 'Diagnóstico', price: 45, duration: 15, tooth: true },
  { id: 'p_tc_laudo', name: 'Análise e planejamento tomográfico Cone Beam (CBCT)', category: 'Diagnóstico', price: 250, duration: 45 },
  { id: 'p_foto', name: 'Documentação fotográfica clínica digital', category: 'Diagnóstico', price: 120, duration: 30 },

  // 4. Endodontia
  { id: 'p_endo1', name: 'Endodontia unirradicular', category: 'Endodontia', price: 650, duration: 90, tooth: true, condition: 'canal', materials: [{ item: 'i_anest', qty: 2 }] },
  { id: 'p_endo2', name: 'Endodontia birradicular', category: 'Endodontia', price: 850, duration: 90, tooth: true, condition: 'canal', materials: [{ item: 'i_anest', qty: 2 }] },
  { id: 'p_endo3', name: 'Endodontia molar / multirradicular', category: 'Endodontia', price: 1100, duration: 120, tooth: true, condition: 'canal', materials: [{ item: 'i_anest', qty: 2 }] },
  { id: 'p_reendo', name: 'Retratamento endodôntico', category: 'Endodontia', price: 1350, duration: 120, tooth: true, condition: 'canal' },

  // 5. Implantodontia
  { id: 'p_impl', name: 'Implante dentário de titânio (cone morse)', category: 'Implantodontia', price: 2800, duration: 90, tooth: true, condition: 'implante', materials: [{ item: 'i_anest', qty: 3 }] },
  { id: 'p_impl_guia', name: 'Instalação de implante com Guia Cirúrgico CAD', category: 'Implantodontia', price: 3400, duration: 90, tooth: true, condition: 'implante' },
  { id: 'p_enx_osseo', name: 'Enxerto ósseo particulado com biomaterial', category: 'Implantodontia', price: 1400, duration: 60, tooth: true },
  { id: 'p_lev_seio', name: 'Levantamento de seio maxilar (Sinus Lift)', category: 'Implantodontia', price: 2200, duration: 90 },

  // 6. Prótese
  { id: 'p_coroa', name: 'Coroa total em porcelana pura / zircônia', category: 'Prótese', price: 1800, duration: 60, tooth: true, condition: 'coroa' },
  { id: 'p_prot_impl', name: 'Prótese fixa unitária sobre implante', category: 'Prótese', price: 2200, duration: 60, tooth: true, condition: 'coroa' },
  { id: 'p_inlay', name: 'Inlay / Onlay em cerâmica pura', category: 'Prótese', price: 1100, duration: 60, tooth: true, condition: 'restauracao' },
  { id: 'p_ptot', name: 'Prótese total (dentadura)', category: 'Prótese', price: 2500, duration: 60 },
  { id: 'p_ppr', name: 'Prótese parcial removível (PPR com grampos)', category: 'Prótese', price: 1900, duration: 60 },

  // 7. Periodontia
  { id: 'p_prof', name: 'Profilaxia e limpeza supragengival', category: 'Periodontia', price: 180, duration: 45, materials: [{ item: 'i_luva', qty: 2 }] },
  { id: 'p_rasp', name: 'Raspagem periodontal subgengival (quadrante)', category: 'Periodontia', price: 250, duration: 60, materials: [{ item: 'i_anest', qty: 1 }] },
  { id: 'p_gengiv', name: 'Gengivoplastia estética / Gengivectomia', category: 'Periodontia', price: 550, duration: 60 },
  { id: 'p_enx_conj', name: 'Enxerto de tecido conjuntivo subepitelial', category: 'Periodontia', price: 1200, duration: 80 },

  // 8. Ortodontia
  { id: 'p_doc_orto', name: 'Documentação ortodôntica e cefalometria', category: 'Ortodontia', price: 350, duration: 40 },
  { id: 'p_orto', name: 'Manutenção mensal de aparelho ortodôntico', category: 'Ortodontia', price: 200, duration: 30 },
  { id: 'p_alinha', name: 'Planejamento e alinhador transparente', category: 'Ortodontia', price: 4500, duration: 60 },
];

export const procById = (id, customList = []) => {
  return [...PROCEDURES, ...(customList || [])].find((p) => p.id === id);
};

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
