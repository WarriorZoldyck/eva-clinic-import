import { createContext, useContext, useEffect, useMemo, useReducer, useState, useCallback } from 'react';
import { createSeed } from '../lib/seed';
import { addDays, todayISO, uid } from '../lib/utils';
import { procById, CONDITIONS } from '../lib/dental';
import { useAuth } from './AuthContext';

const AppCtx = createContext(null);

export function createCleanState(user) {
  const userName = user?.name || 'Dr(a). Cirurgião-Dentista';
  const shortName = userName.split(' ')[0] || 'Dentista';
  const userCro = user?.cro || 'CRO-SP 00.000';
  const clinicTitle = user?.clinicName || 'Minha Clínica Odontológica';

  return {
    clinicName: clinicTitle,
    patients: [],
    appointments: [],
    odontogram: {},
    plans: [],
    transactions: [],
    inventory: [
      { id: 'i_anest', name: 'Anestésico Lidocaína 2% (tubete)', category: 'Anestésicos', qty: 0, min: 20, unit: 'tubete', cost: 3.5, supplier: 'Dental Cremer' },
      { id: 'i_resina', name: 'Resina Composta A2 (seringa)', category: 'Dentística', qty: 0, min: 5, unit: 'seringa', cost: 70, supplier: 'Dental Speed' },
      { id: 'i_luva', name: 'Luva de Procedimento (caixa)', category: 'Descartáveis', qty: 0, min: 10, unit: 'caixa', cost: 35, supplier: 'Dental Cremer' },
      { id: 'i_masc', name: 'Máscara Cirúrgica Tripla (caixa)', category: 'Descartáveis', qty: 0, min: 5, unit: 'caixa', cost: 18, supplier: 'Dental Cremer' },
    ],
    professionals: [
      {
        id: 'pr_main',
        name: userName,
        short: shortName,
        specialty: 'Responsável Técnico / Cirurgião-Dentista',
        cro: userCro,
        color: '#2ee6c5',
        commission: 0.5,
      },
    ],
    evolutions: [],
    documents: [],
    surgicalGuides: [],
  };
}

function loadUserData(user) {
  if (!user || user.id === 'usr_admin') {
    try {
      const raw = localStorage.getItem('eva-clinic-demo-v2');
      if (raw) return JSON.parse(raw);
    } catch {
      /* ignore */
    }
    return createSeed();
  }

  // Usuário real com espaço próprio
  const userKey = `eva-clinic-user-${user.id}`;
  try {
    const raw = localStorage.getItem(userKey);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return createCleanState(user);
}

const planTotal = (p) => p.items.reduce((s, i) => s + i.price, 0) * (1 - (p.discount || 0) / 100);

function reducer(state, a) {
  switch (a.type) {
    case 'SET_STATE':
      return a.payload;

    case 'RESET_TO_CLEAN':
      return createCleanState(a.user);

    case 'LOAD_DEMO_SEED':
      return createSeed();

    case 'RESET':
      return a.user?.id === 'usr_admin' ? createSeed() : createCleanState(a.user);

    case 'ADD_PATIENT':
      return { ...state, patients: [a.patient, ...state.patients] };
    case 'UPDATE_PATIENT':
      return { ...state, patients: state.patients.map((p) => (p.id === a.id ? { ...p, ...a.patch } : p)) };

    case 'ADD_APPT':
      return { ...state, appointments: [...state.appointments, a.appt] };
    case 'UPDATE_APPT':
      return { ...state, appointments: state.appointments.map((x) => (x.id === a.id ? { ...x, ...a.patch } : x)) };
    case 'DELETE_APPT':
      return { ...state, appointments: state.appointments.filter((x) => x.id !== a.id) };

    case 'ODONTO_ADD': {
      const pt = state.odontogram[a.patientId] || {};
      return {
        ...state,
        odontogram: { ...state.odontogram, [a.patientId]: { ...pt, [a.tooth]: [...(pt[a.tooth] || []), a.entry] } },
      };
    }
    case 'ODONTO_REMOVE': {
      const pt = state.odontogram[a.patientId] || {};
      return {
        ...state,
        odontogram: { ...state.odontogram, [a.patientId]: { ...pt, [a.tooth]: (pt[a.tooth] || []).filter((e) => e.id !== a.entryId) } },
      };
    }

    case 'ADD_TO_PLAN': {
      let plan = state.plans.find((p) => p.patientId === a.patientId && p.status === 'rascunho');
      const proc = procById(a.procedureId);
      const newItem = { id: uid('it'), procedureId: proc.id, name: proc.name, tooth: a.tooth ?? null, faces: a.faces || [], price: proc.price, status: 'pendente', doneAt: null };
      let plans;
      if (plan) {
        plans = state.plans.map((p) => (p.id === plan.id ? { ...p, items: [...p.items, newItem] } : p));
      } else {
        plan = {
          id: uid('tp'), patientId: a.patientId, professionalId: a.professionalId || 'pr1', title: 'Novo plano de tratamento', status: 'rascunho',
          createdAt: todayISO(), discount: 0, installments: 1, method: 'Pix', items: [newItem],
        };
        plans = [plan, ...state.plans];
      }
      // marca no odontograma como planejado
      let odontogram = state.odontogram;
      if (proc.condition && a.tooth) {
        const pt = odontogram[a.patientId] || {};
        const entry = { id: uid('od'), condition: proc.condition, faces: a.faces || [], status: 'planejado', date: todayISO(), itemId: newItem.id };
        odontogram = { ...odontogram, [a.patientId]: { ...pt, [a.tooth]: [...(pt[a.tooth] || []), entry] } };
      }
      return { ...state, plans, odontogram };
    }

    case 'PLAN_UPDATE':
      return { ...state, plans: state.plans.map((p) => (p.id === a.id ? { ...p, ...a.patch } : p)) };

    case 'PLAN_REMOVE_ITEM': {
      const plan = state.plans.find((p) => p.id === a.planId);
      const it = plan?.items?.find((i) => i.id === a.itemId);
      const plans = state.plans.map((p) => (p.id === a.planId ? { ...p, items: p.items.filter((i) => i.id !== a.itemId) } : p));
      let odontogram = state.odontogram;
      if (it?.tooth) {
        const pt = odontogram[plan.patientId] || {};
        odontogram = { ...odontogram, [plan.patientId]: { ...pt, [it.tooth]: (pt[it.tooth] || []).filter((e) => e.itemId !== it.id) } };
      }
      return { ...state, plans, odontogram };
    }

    case 'PLAN_APPROVE': {
      const plan = state.plans.find((p) => p.id === a.id);
      if (!plan) return state;
      const total = planTotal(plan);
      const installments = plan.installments || 1;
      const per = Math.round((total / installments) * 100) / 100;
      const today = todayISO();
      const txs = Array.from({ length: installments }, (_, k) => {
        const due = addDays(today, 30 * k);
        return {
          id: uid('tx'), type: 'receita', description: `${plan.title} — parcela ${k + 1}/${installments}`, category: 'Planos de tratamento',
          amount: per, date: due, dueDate: due, status: 'pendente', method: plan.method || 'Pix', patientId: plan.patientId, planId: plan.id,
        };
      });
      return {
        ...state,
        plans: state.plans.map((p) => (p.id === a.id ? { ...p, status: 'aprovado', approvedAt: today } : p)),
        transactions: [...txs, ...state.transactions],
      };
    }

    case 'ITEM_DONE': {
      const plan = state.plans.find((p) => p.id === a.planId);
      const it = plan?.items?.find((i) => i.id === a.itemId);
      if (!it) return state;
      const proc = procById(it.procedureId);
      const today = todayISO();
      const items = plan.items.map((i) => (i.id === it.id ? { ...i, status: 'realizado', doneAt: today } : i));
      const allDone = items.every((i) => i.status === 'realizado');
      const plans = state.plans.map((p) => (p.id === plan.id ? { ...p, items, status: allDone ? 'concluido' : 'andamento' } : p));

      let odontogram = state.odontogram;
      if (it.tooth && proc?.condition) {
        const pt = odontogram[plan.patientId] || {};
        let list = pt[it.tooth] || [];
        const match = list.find((e) => e.itemId === it.id) || list.find((e) => e.condition === proc.condition && e.status === 'planejado');
        if (proc.condition === 'extracao') {
          list = list.filter((e) => e !== match);
          list = [...list, { id: uid('od'), condition: 'ausente', faces: [], status: 'realizado', date: today }];
        } else if (match) {
          list = list.map((e) => (e === match ? { ...e, status: 'realizado', date: today } : e));
          if (proc.condition === 'restauracao') list = list.filter((e) => !(e.condition === 'carie' && e.faces.some((f) => it.faces.includes(f))));
        } else {
          list = [...list, { id: uid('od'), condition: proc.condition, faces: it.faces, status: 'realizado', date: today }];
        }
        odontogram = { ...odontogram, [plan.patientId]: { ...pt, [it.tooth]: list } };
      }

      const inventory = state.inventory.map((inv) => {
        const m = (proc?.materials || []).find((x) => x.item === inv.id);
        return m ? { ...inv, qty: Math.max(0, inv.qty - m.qty) } : inv;
      });

      const evo = {
        id: uid('ev'), patientId: plan.patientId, professionalId: plan.professionalId, date: today, auto: true,
        text: `${proc?.name || 'Procedimento'}${it.tooth ? ` no dente ${it.tooth}` : ''}${it.faces?.length ? ` (faces ${it.faces.join(', ')})` : ''} realizado(a). Registro gerado a partir do plano "${plan.title}".`,
      };
      return { ...state, plans, odontogram, inventory, evolutions: [evo, ...state.evolutions] };
    }

    case 'ADD_TX':
      return { ...state, transactions: [a.tx, ...state.transactions] };
    case 'PAY_TX':
      return { ...state, transactions: state.transactions.map((t) => (t.id === a.id ? { ...t, status: 'pago', date: todayISO() } : t)) };

    case 'INV_ADJUST':
      return { ...state, inventory: state.inventory.map((i) => (i.id === a.id ? { ...i, qty: Math.max(0, i.qty + a.delta) } : i)) };
    case 'INV_ADD':
      return { ...state, inventory: [a.item, ...state.inventory] };

    case 'ADD_EVOLUTION':
      return { ...state, evolutions: [a.evo, ...state.evolutions] };
    case 'ADD_DOCUMENT':
      return { ...state, documents: [a.doc, ...state.documents] };

    case 'SAVE_SURGICAL_GUIDE': {
      const list = state.surgicalGuides || [];
      const existing = list.find((g) => g.patientId === a.guide.patientId && g.toothNumber === a.guide.toothNumber);
      const today = todayISO();
      let updated;
      if (existing) {
        updated = list.map((g) => (g.id === existing.id ? { ...g, ...a.guide, updatedAt: today } : g));
      } else {
        updated = [{ id: uid('sg'), ...a.guide, createdAt: today, updatedAt: today }, ...list];
      }
      return { ...state, surgicalGuides: updated };
    }

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const { currentUser } = useAuth();
  const [state, dispatch] = useReducer(reducer, currentUser, loadUserData);
  const [toasts, setToasts] = useState([]);
  const [theme, setTheme] = useState(() => localStorage.getItem('eva-theme') || 'light');

  // Recarrega o estado quando o usuário ativo mudar
  useEffect(() => {
    dispatch({ type: 'SET_STATE', payload: loadUserData(currentUser) });
  }, [currentUser?.id]);

  // Salva no localStorage com chave individual por usuário
  useEffect(() => {
    const key = currentUser?.id === 'usr_admin' || !currentUser ? 'eva-clinic-demo-v2' : `eva-clinic-user-${currentUser.id}`;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, currentUser?.id]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('eva-theme', theme);
  }, [theme]);

  const toast = useCallback((msg) => {
    const id = uid('t');
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const helpers = useMemo(
    () => ({
      patient: (id) => state.patients.find((p) => p.id === id),
      professional: (id) => state.professionals.find((p) => p.id === id) || state.professionals[0],
      planTotal,
    }),
    [state.patients, state.professionals]
  );

  const value = useMemo(
    () => ({
      state,
      dispatch,
      toast,
      toasts,
      theme,
      setTheme,
      isCleanSpace: Boolean(currentUser && !currentUser.isDemo && state.patients.length === 0),
      ...helpers,
    }),
    [state, toast, toasts, theme, helpers, currentUser]
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export const useApp = () => useContext(AppCtx);
export { planTotal, CONDITIONS };
