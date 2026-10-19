// Dados fictícios gerados de forma determinística, relativos à data atual
import { addDays, todayISO, uid, colorFor } from './utils';
import { PROCEDURES, procById } from './dental';

function rng(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export const PROFESSIONALS = [
  { id: 'pr1', name: 'Dra. Eva Martins', short: 'Dra. Eva', specialty: 'Clínica geral · Estética', cro: 'CRO-SP 98.231', color: '#2ee6c5', commission: 0.4 },
  { id: 'pr2', name: 'Dr. Rafael Lima', short: 'Dr. Rafael', specialty: 'Implantodontia', cro: 'CRO-SP 87.112', color: '#7c5cff', commission: 0.45 },
  { id: 'pr3', name: 'Dra. Camila Souza', short: 'Dra. Camila', specialty: 'Ortodontia', cro: 'CRO-SP 102.554', color: '#f472b6', commission: 0.4 },
  { id: 'pr4', name: 'Dr. Bruno Teixeira', short: 'Dr. Bruno', specialty: 'Endodontia', cro: 'CRO-SP 91.408', color: '#fbbf24', commission: 0.42 },
];

export const CHAIRS = ['Cadeira 1', 'Cadeira 2', 'Cadeira 3', 'Cadeira 4'];

const NAMES = [
  ['Ana Beatriz Carvalho', 'F'], ['Lucas Fernandes', 'M'], ['Mariana Rocha', 'F'], ['Pedro Henrique Alves', 'M'],
  ['Juliana Prado', 'F'], ['Gabriel Monteiro', 'M'], ['Larissa Nogueira', 'F'], ['Rafael Duarte', 'M'],
  ['Beatriz Campos', 'F'], ['Thiago Ribeiro', 'M'], ['Camila Azevedo', 'F'], ['Felipe Barros', 'M'],
  ['Isabela Moreira', 'F'], ['Gustavo Pires', 'M'], ['Letícia Cardoso', 'F'], ['Matheus Gomes', 'M'],
  ['Fernanda Lopes', 'F'], ['Diego Martins', 'M'], ['Amanda Teixeira', 'F'], ['Rodrigo Mendes', 'M'],
  ['Carolina Dias', 'F'], ['Vinícius Araújo', 'M'], ['Patrícia Freitas', 'F'], ['Eduardo Castro', 'M'],
];

const INSURANCES = ['Particular', 'Particular', 'OdontoPrev', 'Amil Dental', 'SulAmérica Odonto', 'Bradesco Dental', 'Particular'];
const STREETS = ['Rua Augusta', 'Av. Paulista', 'Rua Oscar Freire', 'Rua Haddock Lobo', 'Av. Brigadeiro Faria Lima', 'Rua Pamplona', 'Al. Santos'];
const ALLERGIES = ['Nenhuma', 'Nenhuma', 'Nenhuma', 'Penicilina', 'Látex', 'Dipirona', 'Nenhuma'];
const CONDITIONS_MED = ['Nenhuma', 'Nenhuma', 'Hipertensão controlada', 'Diabetes tipo 2', 'Nenhuma', 'Asma', 'Nenhuma'];

export const INVENTORY = [
  { id: 'i_anest', name: 'Anestésico Lidocaína 2% (tubete)', category: 'Anestésicos', qty: 86, min: 40, unit: 'tubete', cost: 3.2, supplier: 'Dental Cremer' },
  { id: 'i_resina', name: 'Resina composta A2 (seringa 4g)', category: 'Dentística', qty: 9, min: 10, unit: 'seringa', cost: 68, supplier: 'Dental Speed' },
  { id: 'i_luva', name: 'Luva de procedimento M (par)', category: 'Descartáveis', qty: 340, min: 200, unit: 'par', cost: 0.6, supplier: 'Dental Cremer' },
  { id: 'i_pasta', name: 'Pasta profilática (pote)', category: 'Prevenção', qty: 14, min: 6, unit: 'pote', cost: 22, supplier: 'Surya Dental' },
  { id: 'i_lima', name: 'Lima endodôntica rotatória', category: 'Endodontia', qty: 4, min: 8, unit: 'unidade', cost: 95, supplier: 'Dental Speed' },
  { id: 'i_impl', name: 'Implante cone morse 3.5x11', category: 'Implantodontia', qty: 6, min: 4, unit: 'unidade', cost: 420, supplier: 'Neodent' },
  { id: 'i_fio', name: 'Fio de sutura nylon 4-0', category: 'Cirurgia', qty: 38, min: 15, unit: 'unidade', cost: 4.5, supplier: 'Dental Cremer' },
  { id: 'i_masc', name: 'Máscara tripla (caixa 50)', category: 'Descartáveis', qty: 12, min: 5, unit: 'caixa', cost: 18, supplier: 'Surya Dental' },
  { id: 'i_algin', name: 'Alginato para moldagem 410g', category: 'Prótese', qty: 3, min: 4, unit: 'pacote', cost: 34, supplier: 'Dental Speed' },
  { id: 'i_clar', name: 'Gel clareador 35% (kit)', category: 'Estética', qty: 7, min: 3, unit: 'kit', cost: 160, supplier: 'FGM' },
  { id: 'i_braq', name: 'Kit braquetes metálicos', category: 'Ortodontia', qty: 11, min: 5, unit: 'kit', cost: 120, supplier: 'Morelli' },
  { id: 'i_sug', name: 'Sugador descartável (pct 40)', category: 'Descartáveis', qty: 22, min: 10, unit: 'pacote', cost: 9, supplier: 'Dental Cremer' },
];

export function createSeed() {
  const r = rng(20261015);
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const today = todayISO();
  const yearNow = new Date().getFullYear();

  // ---------- Pacientes ----------
  const patients = NAMES.map(([name, gender], i) => {
    const birthYear = yearNow - (8 + Math.floor(r() * 60));
    const month = 1 + Math.floor(r() * 12);
    const day = 1 + Math.floor(r() * 27);
    // garante alguns aniversariantes neste mês
    const m = i % 7 === 0 ? new Date().getMonth() + 1 : month;
    const first = name.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return {
      id: `pt${i + 1}`,
      name,
      gender,
      birth: `${birthYear}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      cpf: `${100 + i * 13}.${(400 + i * 7) % 999}.${(250 + i * 31) % 999}-${String(10 + i).slice(-2)}`,
      phone: `(11) 9${8000 + Math.floor(r() * 1999)}-${1000 + Math.floor(r() * 8999)}`,
      email: `${first}.${i + 1}@email.com`,
      insurance: pick(INSURANCES),
      address: `${pick(STREETS)}, ${100 + Math.floor(r() * 1900)} — São Paulo/SP`,
      createdAt: addDays(today, -Math.floor(30 + r() * 700)),
      color: colorFor(name),
      tags: i % 5 === 0 ? ['VIP'] : i % 4 === 0 ? ['Ortodontia'] : [],
      anamnesis: {
        allergies: pick(ALLERGIES),
        conditions: pick(CONDITIONS_MED),
        medications: r() > 0.7 ? 'Losartana 50mg' : 'Nenhum',
        smoker: r() > 0.85,
        pregnant: false,
        bleeding: r() > 0.85,
        complaint: pick(['Sensibilidade ao frio', 'Dor ao mastigar', 'Revisão de rotina', 'Deseja clarear os dentes', 'Sangramento gengival', 'Dente quebrado']),
        updatedAt: addDays(today, -Math.floor(r() * 120)),
      },
    };
  });

  // ---------- Agenda ----------
  const appointments = [];
  const quick = ['p_aval', 'p_prof', 'p_res1', 'p_res2', 'p_endo1', 'p_orto', 'p_rasp', 'p_clar', 'p_coroa', 'p_ext'];
  for (let d = -45; d <= 14; d++) {
    const date = addDays(today, d);
    const wd = new Date(date + 'T12:00:00').getDay();
    if (wd === 0) continue;
    const perDay = wd === 6 ? 4 : 7 + Math.floor(r() * 5);
    const used = {};
    for (let k = 0; k < perDay; k++) {
      const prof = PROFESSIONALS[k % PROFESSIONALS.length];
      const proc = procById(prof.id === 'pr3' ? (r() > 0.4 ? 'p_orto' : 'p_aval') : prof.id === 'pr4' ? pick(['p_endo1', 'p_endo3', 'p_aval']) : pick(quick));
      const dur = Math.max(30, Math.round(proc.duration / 30) * 30);
      let start = 8 * 60 + Math.floor(r() * 18) * 30;
      used[prof.id] = used[prof.id] || [];
      // evita sobreposição simples
      let tries = 0;
      while (used[prof.id].some(([s, e]) => start < e && start + dur > s) && tries < 20) {
        start = 8 * 60 + Math.floor(r() * 18) * 30;
        tries++;
      }
      if (tries >= 20 || start + dur > 19 * 60) continue;
      used[prof.id].push([start, start + dur]);
      const p = patients[Math.floor(r() * patients.length)];
      let status = 'agendado';
      if (d < 0) status = r() > 0.9 ? 'faltou' : r() > 0.95 ? 'cancelado' : 'concluido';
      else if (d === 0) {
        const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
        status = start + dur < nowMin ? (r() > 0.88 ? 'faltou' : 'concluido') : start <= nowMin ? 'atendimento' : r() > 0.4 ? 'confirmado' : 'agendado';
      } else status = r() > 0.6 ? 'confirmado' : 'agendado';
      appointments.push({
        id: uid('ap'),
        patientId: p.id,
        professionalId: prof.id,
        chair: CHAIRS[PROFESSIONALS.indexOf(prof)],
        date,
        start: `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`,
        duration: dur,
        procedure: proc.name,
        status,
        notes: '',
      });
    }
  }

  // ---------- Odontograma ----------
  const odontogram = {};
  const mk = (tooth, condition, faces, status, daysAgo = 60) => ({
    id: uid('od'), condition, faces, status, date: addDays(today, -daysAgo),
  });
  const setT = (pid, tooth, entry) => {
    odontogram[pid] = odontogram[pid] || {};
    odontogram[pid][tooth] = [...(odontogram[pid][tooth] || []), entry];
  };
  // Paciente destaque (pt1) com quadro clínico fiel à referência (Imagem 2)
  setT('pt1', 16, { id: 'od_16_1', condition: 'restauracao', faces: ['O'], status: 'realizado', date: '2023-03-15', notes: 'Restauração Oclusal' });
  setT('pt1', 16, { id: 'od_16_2', condition: 'carie', faces: ['O'], status: 'existente', date: '2023-03-10', notes: 'Cárie Oclusal ativa' });
  setT('pt1', 25, mk(25, 'restauracao', ['O'], 'realizado', 20));
  setT('pt1', 27, mk(27, 'restauracao', ['O'], 'realizado', 45));
  setT('pt1', 46, mk(46, 'restauracao', ['O'], 'realizado', 60));
  setT('pt1', 35, mk(35, 'extracao', [], 'realizado', 90));
  setT('pt1', 11, mk(11, 'restauracao', ['V'], 'realizado', 30));
  // demais pacientes
  patients.slice(1).forEach((p) => {
    const n = Math.floor(r() * 5);
    for (let k = 0; k < n; k++) {
      const tooth = pick([16, 17, 26, 27, 36, 37, 46, 47, 14, 15, 24, 25, 11, 21, 34, 44]);
      const cond = pick(['restauracao', 'restauracao', 'carie', 'canal', 'selante', 'coroa']);
      const faces = ['restauracao', 'carie', 'selante'].includes(cond) ? [pick(['O', 'M', 'D', 'V'])] : [];
      setT(p.id, tooth, mk(tooth, cond, faces, cond === 'carie' ? 'existente' : pick(['existente', 'realizado']), Math.floor(r() * 400)));
    }
  });

  // ---------- Planos de tratamento ----------
  const item = (procId, tooth = null, faces = [], status = 'pendente', doneAt = null) => {
    const p = procById(procId);
    return { id: uid('it'), procedureId: procId, name: p.name, tooth, faces, price: p.price, status, doneAt };
  };
  const plans = [
    {
      id: 'tp1', patientId: 'pt1', professionalId: 'pr1', title: 'Reabilitação oral — fase 1', status: 'andamento',
      createdAt: addDays(today, -20), approvedAt: addDays(today, -18), discount: 5, installments: 6, method: 'Cartão de crédito',
      items: [
        item('p_endo3', 26, [], 'realizado', addDays(today, -12)),
        item('p_coroa', 26),
        item('p_res1', 36, ['O']),
        item('p_impl', 46),
        item('p_siso', 38),
        item('p_res2', 11, ['V', 'M'], 'realizado', addDays(today, -30)),
      ],
    },
    {
      id: 'tp2', patientId: 'pt2', professionalId: 'pr2', title: 'Implante unitário', status: 'aguardando',
      createdAt: addDays(today, -3), discount: 0, installments: 10, method: 'Cartão de crédito',
      items: [item('p_impl', 36), item('p_coroa', 36)],
    },
    {
      id: 'tp3', patientId: 'pt3', professionalId: 'pr1', title: 'Estética do sorriso', status: 'aprovado',
      createdAt: addDays(today, -8), approvedAt: addDays(today, -6), discount: 10, installments: 4, method: 'Pix',
      items: [item('p_clar'), item('p_fac', 11, ['V']), item('p_fac', 21, ['V'])],
    },
    {
      id: 'tp4', patientId: 'pt5', professionalId: 'pr4', title: 'Endodontia 46', status: 'concluido',
      createdAt: addDays(today, -60), approvedAt: addDays(today, -59), discount: 0, installments: 2, method: 'Pix',
      items: [item('p_endo3', 46, [], 'realizado', addDays(today, -40)), item('p_res2', 46, ['O', 'D'], 'realizado', addDays(today, -33))],
    },
    {
      id: 'tp5', patientId: 'pt7', professionalId: 'pr1', title: 'Restaurações e profilaxia', status: 'aguardando',
      createdAt: addDays(today, -1), discount: 0, installments: 1, method: 'Pix',
      items: [item('p_prof'), item('p_res1', 16, ['O']), item('p_res1', 27, ['O'])],
    },
    {
      id: 'tp6', patientId: 'pt9', professionalId: 'pr2', title: 'Prótese protocolo', status: 'recusado',
      createdAt: addDays(today, -25), discount: 0, installments: 12, method: 'Boleto',
      items: [item('p_ptot'), item('p_impl', 36), item('p_impl', 46)],
    },
  ];

  // ---------- Financeiro ----------
  const transactions = [];
  const cats = ['Procedimentos', 'Procedimentos', 'Procedimentos', 'Convênios'];
  const methods = ['Pix', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro'];
  for (let d = -180; d <= 0; d++) {
    const date = addDays(today, d);
    const wd = new Date(date + 'T12:00:00').getDay();
    if (wd === 0) continue;
    const n = 1 + Math.floor(r() * 4);
    for (let k = 0; k < n; k++) {
      const p = pick(PROCEDURES);
      const pt = pick(patients);
      transactions.push({
        id: uid('tx'), type: 'receita', description: `${p.name} — ${pt.name.split(' ')[0]}`, category: pick(cats),
        amount: p.price, date, dueDate: date, status: 'pago', method: pick(methods), patientId: pt.id,
      });
    }
  }
  const expenses = [
    ['Aluguel do consultório', 'Infraestrutura', 6800, 5], ['Folha de pagamento', 'Pessoal', 14500, 5], ['Laboratório de prótese', 'Laboratório', 3200, 15],
    ['Energia elétrica', 'Infraestrutura', 980, 10], ['Fornecedor de materiais', 'Materiais', 2600, 20], ['Marketing digital', 'Marketing', 1500, 25],
    ['Software e sistemas', 'Tecnologia', 390, 8],
  ];
  for (let mBack = 5; mBack >= -1; mBack--) {
    const base = new Date();
    base.setDate(1);
    base.setMonth(base.getMonth() - mBack);
    expenses.forEach(([desc, cat, val, day]) => {
      const dt = new Date(base.getFullYear(), base.getMonth(), day, 12);
      const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const amount = Math.round(val * (0.9 + r() * 0.2));
      const status = iso <= today ? (r() > 0.93 ? 'pendente' : 'pago') : 'pendente';
      transactions.push({ id: uid('tx'), type: 'despesa', description: desc, category: cat, amount, date: iso, dueDate: iso, status, method: 'Boleto' });
    });
  }
  // parcelas a receber dos planos aprovados
  plans.filter((p) => ['aprovado', 'andamento', 'concluido'].includes(p.status)).forEach((p) => {
    const total = p.items.reduce((s, i) => s + i.price, 0) * (1 - p.discount / 100);
    const per = Math.round((total / p.installments) * 100) / 100;
    for (let k = 0; k < p.installments; k++) {
      const due = addDays(p.approvedAt, 30 * k);
      transactions.push({
        id: uid('tx'), type: 'receita', description: `${p.title} — parcela ${k + 1}/${p.installments}`, category: 'Planos de tratamento',
        amount: per, date: due, dueDate: due, status: due <= today ? (due < addDays(today, -20) || p.status === 'concluido' ? 'pago' : 'pendente') : 'pendente',
        method: p.method, patientId: p.patientId, planId: p.id,
      });
    }
  });

  // ---------- Evoluções ----------
  const evolutions = [
    { id: uid('ev'), patientId: 'pt1', professionalId: 'pr4', date: addDays(today, -12), text: 'Tratamento endodôntico do 26 concluído. 3 canais instrumentados e obturados. Paciente sem queixas. Indicada coroa protética.' },
    { id: uid('ev'), patientId: 'pt1', professionalId: 'pr1', date: addDays(today, -30), text: 'Restauração classe IV em resina composta no 11 (faces V e M). Ajuste oclusal realizado.' },
    { id: uid('ev'), patientId: 'pt1', professionalId: 'pr1', date: addDays(today, -45), text: 'Avaliação inicial. Radiografia panorâmica solicitada. Identificada cárie oclusal no 36 e ausência do 46.' },
  ];

  const documents = [
    { id: uid('dc'), patientId: 'pt1', name: 'Radiografia panorâmica', type: 'Imagem', date: addDays(today, -44), url: '/images/panoramica.png' },
    { id: uid('dc'), patientId: 'pt1', name: 'Termo de consentimento — Endodontia', type: 'PDF', date: addDays(today, -20) },
    { id: uid('dc'), patientId: 'pt1', name: 'Receituário — Amoxicilina 500mg', type: 'PDF', date: addDays(today, -12) },
  ];

  return {
    version: 1,
    patients,
    professionals: PROFESSIONALS,
    appointments,
    odontogram,
    plans,
    transactions,
    inventory: INVENTORY.map((i) => ({ ...i })),
    evolutions,
    documents,
    surgicalGuides: [],
  };
}
