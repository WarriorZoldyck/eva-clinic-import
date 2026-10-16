import { createContext, useContext, useEffect, useMemo, useReducer, useState, useCallback } from 'react';
import { createSeed } from '../lib/seed';
import { addDays, todayISO, uid } from '../lib/utils';
import { procById, CONDITIONS } from '../lib/dental';

const KEY = 'eva-clinic-demo-v2';
const AppCtx = createContext(null);

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return createSeed();
}

const planTotal = (p) => p.items.reduce((s, i) => s + i.price, 0) * (1 - (p.discount || 0) / 100);

function reducer(state, a) {
  switch (a.type) {
    case 'RESET':
      return createSeed();

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
      const it = plan.items.find((i) => i.id === a.itemId);
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
      const total = planTotal(plan);
      const per = Math.round((total / plan.installments) * 100) / 100;
      const today = todayISO();
      const txs = Array.from({ length: plan.installments }, (_, k) => {
        const due = addDays(today, 30 * k);
        return {
          id: uid('tx'), type: 'receita', description: `${plan.title} — parcela ${k + 1}/${plan.installments}`, category: 'Planos de tratamento',
          amount: per, date: due, dueDate: due, status: 'pendente', method: plan.method, patientId: plan.patientId, planId: plan.id,
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
      const it = plan.items.find((i) => i.id === a.itemId);
      const proc = procById(it.procedureId);
      const today = todayISO();
      const items = plan.items.map((i) => (i.id === it.id ? { ...i, status: 'realizado', doneAt: today } : i));
      const allDone = items.every((i) => i.status === 'realizado');
      const plans = state.plans.map((p) => (p.id === plan.id ? { ...p, items, status: allDone ? 'concluido' : 'andamento' } : p));

      // odontograma: planejado -> realizado (extração vira "ausente")
      let odontogram = state.odontogram;
      if (it.tooth && proc.condition) {
        const pt = odontogram[plan.patientId] || {};
        let list = pt[it.tooth] || [];
        const match = list.find((e) => e.itemId === it.id) || list.find((e) => e.condition === proc.condition && e.status === 'planejado');
        if (proc.condition === 'extracao') {
          list = list.filter((e) => e !== match);
          list = [...list, { id: uid('od'), condition: 'ausente', faces: [], status: 'realizado', date: today }];
        } else if (match) {
          list = list.map((e) => (e === match ? { ...e, status: 'realizado', date: today } : e));
          // procedimento restaurador resolve a cárie nas mesmas faces
          if (proc.condition === 'restauracao') list = list.filter((e) => !(e.condition === 'carie' && e.faces.some((f) => it.faces.includes(f))));
        } else {
          list = [...list, { id: uid('od'), condition: proc.condition, faces: it.faces, status: 'realizado', date: today }];
        }
        odontogram = { ...odontogram, [plan.patientId]: { ...pt, [it.tooth]: list } };
      }

      // baixa automática de estoque
      const inventory = state.inventory.map((inv) => {
        const m = (proc.materials || []).find((x) => x.item === inv.id);
        return m ? { ...inv, qty: Math.max(0, inv.qty - m.qty) } : inv;
      });

      const evo = {
        id: uid('ev'), patientId: plan.patientId, professionalId: plan.professionalId, date: today, auto: true,
        text: `${proc.name}${it.tooth ? ` no dente ${it.tooth}` : ''}${it.faces?.length ? ` (faces ${it.faces.join(', ')})` : ''} realizado(a). Registro gerado automaticamente a partir do plano "${plan.title}".`,
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

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, load);
  const [toasts, setToasts] = useState([]);
  const [theme, setTheme] = useState(() => localStorage.getItem('eva-theme') || 'light');

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('eva-theme', theme);
  }, [theme]);

  const toast = useCallback((msg) => {
    const id = uid('t');
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const helpers = useMemo(() => ({
    patient: (id) => state.patients.find((p) => p.id === id),
    professional: (id) => state.professionals.find((p) => p.id === id),
    planTotal,
  }), [state.patients, state.professionals]);

  const value = useMemo(() => ({ state, dispatch, toast, toasts, theme, setTheme, ...helpers }), [state, toast, toasts, theme, helpers]);
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => useContext(AppCtx);
// eslint-disable-next-line react-refresh/only-export-components
export { planTotal, CONDITIONS };
