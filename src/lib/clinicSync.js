import { evaOsSupabase } from './supabase';
import { createCleanState } from '../store/AppContext';

/**
 * clinicSync.js
 * Sincronização em nuvem das tabelas clínicas com o Supabase Central (evaOsSupabase).
 * Garante que pacientes, agenda, tratamentos, odontograma, finanças e estoque
 * persistam e sejam idênticos em qualquer máquina ou navegador.
 */

// Debounce helper para evitar sobrecarga de requisições durante digitação
let syncTimer = null;

/**
 * Busca todos os dados da clínica do usuário na nuvem
 * @param {string} userId UUID do usuário em clinic_users
 * @returns {Promise<object|null>} Estado completo da clínica ou null se for usuário novo sem registros
 */
export async function fetchCloudClinicData(userId, user) {
  if (!userId || userId === 'usr_admin') return null;

  try {
    const [
      patientsRes,
      apptsRes,
      plansRes,
      odontoRes,
      txRes,
      invRes,
      evoRes,
      docRes,
      userRes,
    ] = await Promise.all([
      evaOsSupabase.from('clinic_patients').select('*').eq('clinic_user_id', userId),
      evaOsSupabase.from('clinic_appointments').select('*').eq('clinic_user_id', userId),
      evaOsSupabase.from('clinic_treatment_plans').select('*').eq('clinic_user_id', userId),
      evaOsSupabase.from('clinic_odontograms').select('*').eq('clinic_user_id', userId),
      evaOsSupabase.from('clinic_transactions').select('*').eq('clinic_user_id', userId),
      evaOsSupabase.from('clinic_inventory').select('*').eq('clinic_user_id', userId),
      evaOsSupabase.from('clinic_evolutions').select('*').eq('clinic_user_id', userId),
      evaOsSupabase.from('clinic_documents').select('*').eq('clinic_user_id', userId),
      evaOsSupabase.from('clinic_users').select('*').eq('id', userId).maybeSingle(),
    ]);

    // Verifica se há ao menos pacientes ou registros salvos na nuvem
    const hasData =
      (patientsRes.data && patientsRes.data.length > 0) ||
      (apptsRes.data && apptsRes.data.length > 0) ||
      (plansRes.data && plansRes.data.length > 0) ||
      (odontoRes.data && odontoRes.data.length > 0) ||
      (txRes.data && txRes.data.length > 0) ||
      (invRes.data && invRes.data.length > 0);

    const clinicUser = userRes.data || {};
    const baseClean = createCleanState({
      ...user,
      name: clinicUser.name || user?.name,
      clinicName: clinicUser.clinic_name || user?.clinicName,
      cro: clinicUser.cro || user?.cro,
    });

    if (!hasData) {
      // Usuário ainda não tem dados na nuvem, retorna base limpa
      return null;
    }

    // Recompõe o odontograma agrupado por patientId e tooth
    const odontogram = {};
    (odontoRes.data || []).forEach((row) => {
      if (!odontogram[row.patient_id]) odontogram[row.patient_id] = {};
      if (!odontogram[row.patient_id][row.tooth]) odontogram[row.patient_id][row.tooth] = [];
      odontogram[row.patient_id][row.tooth].push({
        id: row.id,
        condition: row.condition,
        faces: row.faces || [],
        status: row.status,
        date: row.date,
        itemId: row.item_id,
        notes: row.notes,
      });
    });

    // Mapeia pacientes
    const patients = (patientsRes.data || []).map((p) => ({
      id: p.id,
      name: p.name,
      gender: p.gender || '',
      birthDate: p.birth_date || '',
      cpf: p.cpf || '',
      phone: p.phone || '',
      email: p.email || '',
      insurance: p.insurance || 'Particular',
      address: p.address || {},
      allergies: p.allergies || [],
      conditions: p.conditions || [],
      notes: p.notes || '',
      tags: p.tags || [],
      createdAt: p.created_at,
    }));

    // Mapeia agendamentos
    const appointments = (apptsRes.data || []).map((a) => ({
      id: a.id,
      patientId: a.patient_id,
      professionalId: a.professional_id,
      chair: a.chair || 'Cadeira 1',
      date: a.date,
      time: a.time,
      duration: a.duration || 30,
      procedureId: a.procedure_id,
      status: a.status || 'agendado',
      confirmed: Boolean(a.confirmed),
      notes: a.notes || '',
    }));

    // Mapeia planos de tratamento
    const plans = (plansRes.data || []).map((pl) => ({
      id: pl.id,
      patientId: pl.patient_id,
      professionalId: pl.professional_id,
      title: pl.title,
      status: pl.status || 'rascunho',
      discount: Number(pl.discount) || 0,
      installments: pl.installments || 1,
      method: pl.method || 'Pix',
      items: pl.items || [],
      approvedAt: pl.approved_at || null,
      createdAt: pl.created_at,
    }));

    // Mapeia transações
    const transactions = (txRes.data || []).map((t) => ({
      id: t.id,
      type: t.type,
      description: t.description,
      category: t.category,
      amount: Number(t.amount) || 0,
      date: t.date,
      dueDate: t.due_date,
      status: t.status,
      method: t.method || 'Pix',
      patientId: t.patient_id,
      planId: t.plan_id,
    }));

    // Mapeia estoque
    const inventory = (invRes.data && invRes.data.length > 0)
      ? invRes.data.map((i) => ({
          id: i.id,
          name: i.name,
          category: i.category,
          qty: i.qty ?? 0,
          min: i.min ?? 5,
          unit: i.unit || 'unidade',
          cost: Number(i.cost) || 0,
          supplier: i.supplier || '',
        }))
      : baseClean.inventory;

    // Mapeia evoluções
    const evolutions = (evoRes.data || []).map((e) => ({
      id: e.id,
      patientId: e.patient_id,
      professionalId: e.professional_id,
      date: e.date,
      text: e.text,
      auto: Boolean(e.auto),
    }));

    // Mapeia documentos
    const documents = (docRes.data || []).map((d) => ({
      id: d.id,
      patientId: d.patient_id,
      type: d.type,
      title: d.title,
      date: d.date,
      content: d.content,
    }));

    return {
      clinicName: clinicUser.clinic_name || baseClean.clinicName,
      patients,
      appointments,
      plans,
      odontogram,
      transactions,
      inventory,
      professionals: baseClean.professionals,
      evolutions,
      documents,
      surgicalGuides: [],
    };
  } catch (err) {
    console.warn('Erro ao carregar dados da nuvem:', err);
    return null;
  }
}

/**
 * Salva o estado da clínica na nuvem com debounce para máxima performance
 */
export function queueCloudSync(userId, state) {
  if (!userId || userId === 'usr_admin') return;

  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    saveClinicDataToCloud(userId, state);
  }, 1200);
}

/**
 * Executa a sincronização completa das tabelas no Supabase Central
 */
export async function saveClinicDataToCloud(userId, state) {
  if (!userId || userId === 'usr_admin' || !state) return;

  try {
    // 1. Pacientes
    if (Array.isArray(state.patients) && state.patients.length > 0) {
      const patientRows = state.patients.map((p) => ({
        id: p.id,
        clinic_user_id: userId,
        name: p.name,
        gender: p.gender || null,
        birth_date: p.birthDate || null,
        cpf: p.cpf || null,
        phone: p.phone || null,
        email: p.email || null,
        insurance: p.insurance || 'Particular',
        address: p.address || {},
        allergies: p.allergies || [],
        conditions: p.conditions || [],
        notes: p.notes || null,
        tags: p.tags || [],
        updated_at: new Date().toISOString(),
      }));
      await evaOsSupabase.from('clinic_patients').upsert(patientRows);
    }

    // 2. Agendamentos
    if (Array.isArray(state.appointments) && state.appointments.length > 0) {
      const apptRows = state.appointments.map((a) => ({
        id: a.id,
        clinic_user_id: userId,
        patient_id: a.patientId,
        professional_id: a.professionalId || 'pr_main',
        chair: a.chair || 'Cadeira 1',
        date: a.date,
        time: a.time,
        duration: a.duration || 30,
        procedure_id: a.procedureId || null,
        status: a.status || 'agendado',
        confirmed: Boolean(a.confirmed),
        notes: a.notes || null,
        updated_at: new Date().toISOString(),
      }));
      await evaOsSupabase.from('clinic_appointments').upsert(apptRows);
    }

    // 3. Planos de Tratamento
    if (Array.isArray(state.plans) && state.plans.length > 0) {
      const planRows = state.plans.map((pl) => ({
        id: pl.id,
        clinic_user_id: userId,
        patient_id: pl.patientId,
        professional_id: pl.professionalId || 'pr_main',
        title: pl.title,
        status: pl.status || 'rascunho',
        discount: pl.discount || 0,
        installments: pl.installments || 1,
        method: pl.method || 'Pix',
        items: pl.items || [],
        approved_at: pl.approvedAt || null,
        updated_at: new Date().toISOString(),
      }));
      await evaOsSupabase.from('clinic_treatment_plans').upsert(planRows);
    }

    // 4. Odontograma: serializa entradas e salva
    if (state.odontogram && typeof state.odontogram === 'object') {
      const odontoRows = [];
      Object.entries(state.odontogram).forEach(([patientId, teeth]) => {
        if (!teeth || typeof teeth !== 'object') return;
        Object.entries(teeth).forEach(([tooth, entries]) => {
          if (!Array.isArray(entries)) return;
          entries.forEach((e) => {
            odontoRows.push({
              clinic_user_id: userId,
              patient_id: patientId,
              tooth: String(tooth),
              condition: e.condition,
              faces: e.faces || [],
              status: e.status || 'planejado',
              date: e.date || new Date().toISOString().slice(0, 10),
              item_id: e.itemId || null,
              notes: e.notes || null,
            });
          });
        });
      });

      if (odontoRows.length > 0) {
        // Limpa anteriores do usuário e insere atualizados
        await evaOsSupabase.from('clinic_odontograms').delete().eq('clinic_user_id', userId);
        await evaOsSupabase.from('clinic_odontograms').insert(odontoRows);
      }
    }

    // 5. Transações Financeiras
    if (Array.isArray(state.transactions) && state.transactions.length > 0) {
      const txRows = state.transactions.map((t) => ({
        id: t.id,
        clinic_user_id: userId,
        type: t.type || 'receita',
        description: t.description || 'Consulta Odontológica',
        category: t.category || 'Geral',
        amount: Number(t.amount) || 0,
        date: t.date || new Date().toISOString().slice(0, 10),
        due_date: t.dueDate || t.date || new Date().toISOString().slice(0, 10),
        status: t.status || 'pendente',
        method: t.method || 'Pix',
        patient_id: t.patientId || null,
        plan_id: t.planId || null,
      }));
      await evaOsSupabase.from('clinic_transactions').upsert(txRows);
    }

    // 6. Estoque
    if (Array.isArray(state.inventory) && state.inventory.length > 0) {
      const invRows = state.inventory.map((i) => ({
        id: i.id,
        clinic_user_id: userId,
        name: i.name,
        category: i.category,
        qty: i.qty ?? 0,
        min: i.min ?? 5,
        unit: i.unit || 'unidade',
        cost: Number(i.cost) || 0,
        supplier: i.supplier || null,
        updated_at: new Date().toISOString(),
      }));
      await evaOsSupabase.from('clinic_inventory').upsert(invRows);
    }

    // 7. Evoluções
    if (Array.isArray(state.evolutions) && state.evolutions.length > 0) {
      const evoRows = state.evolutions.map((e) => ({
        id: e.id,
        clinic_user_id: userId,
        patient_id: e.patientId,
        professional_id: e.professionalId || null,
        date: e.date || new Date().toISOString().slice(0, 10),
        text: e.text,
        auto: Boolean(e.auto),
      }));
      await evaOsSupabase.from('clinic_evolutions').upsert(evoRows);
    }

    // 8. Documentos
    if (Array.isArray(state.documents) && state.documents.length > 0) {
      const docRows = state.documents.map((d) => ({
        id: d.id,
        clinic_user_id: userId,
        patient_id: d.patientId,
        type: d.type,
        title: d.title,
        date: d.date || new Date().toISOString().slice(0, 10),
        content: d.content,
      }));
      await evaOsSupabase.from('clinic_documents').upsert(docRows);
    }
  } catch (err) {
    console.warn('Aviso durante sincronização com a nuvem:', err);
  }
}
