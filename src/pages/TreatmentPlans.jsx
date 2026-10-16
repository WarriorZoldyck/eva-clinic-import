import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { BRL, fmtDate } from '../lib/utils';
import { PLAN_STATUS } from '../lib/dental';
import {
  FileSpreadsheet,
  CheckCircle,
  Clock,
  AlertCircle,
  Filter,
  DollarSign,
  ChevronRight,
  Printer,
  Sparkles,
} from 'lucide-react';

export default function TreatmentPlans() {
  const { state, dispatch, toast } = useApp();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState('all');
  const [profFilter, setProfFilter] = useState('all');

  const filteredPlans = useMemo(() => {
    return state.plans.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (profFilter !== 'all' && p.professionalId !== profFilter) return false;
      return true;
    });
  }, [state.plans, statusFilter, profFilter]);

  // Totais financeiros por status
  const summary = useMemo(() => {
    let awaitingTotal = 0;
    let approvedTotal = 0;
    let completedTotal = 0;

    state.plans.forEach((p) => {
      const tot = p.items.reduce((s, i) => s + i.price, 0) * (1 - (p.discount || 0) / 100);
      if (p.status === 'aguardando') awaitingTotal += tot;
      else if (['aprovado', 'andamento'].includes(p.status)) approvedTotal += tot;
      else if (p.status === 'concluido') completedTotal += tot;
    });

    return { awaitingTotal, approvedTotal, completedTotal };
  }, [state.plans]);

  const handleApprove = (planId) => {
    dispatch({ type: 'PLAN_APPROVE', id: planId });
    toast('Orçamento aprovado e faturamento agendado com sucesso!');
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Planos de Tratamento & Orçamentos</h1>
          <p>
            Acompanhe o funil de orçamentos desde a avaliação clínica até a conclusão dos procedimentos.
          </p>
        </div>
      </div>

      {/* Cards de Resumo do Funil */}
      <div className="grid g-3 mb">
        <div className="card kpi" style={{ '--glow': '#fbbf24' }}>
          <span className="small faint" style={{ fontWeight: 700, textTransform: 'uppercase' }}>
            Aguardando Aprovação
          </span>
          <div className="kpi-value">{BRL(summary.awaitingTotal)}</div>
          <span className="small muted mt display-block">
            {state.plans.filter((p) => p.status === 'aguardando').length} pacientes avaliados
          </span>
        </div>

        <div className="card kpi" style={{ '--glow': '#2ee6c5' }}>
          <span className="small faint" style={{ fontWeight: 700, textTransform: 'uppercase' }}>
            Em Execução / Aprovados
          </span>
          <div className="kpi-value">{BRL(summary.approvedTotal)}</div>
          <span className="small muted mt display-block">
            {state.plans.filter((p) => ['aprovado', 'andamento'].includes(p.status)).length} planos ativos
          </span>
        </div>

        <div className="card kpi" style={{ '--glow': '#34d399' }}>
          <span className="small faint" style={{ fontWeight: 700, textTransform: 'uppercase' }}>
            Tratamentos Concluídos
          </span>
          <div className="kpi-value">{BRL(summary.completedTotal)}</div>
          <span className="small muted mt display-block">Reabilitações finalizadas</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="card row between wrap mb" style={{ padding: '12px 18px' }}>
        <div className="row wrap">
          <div className="seg">
            <button className={statusFilter === 'all' ? 'on' : ''} onClick={() => setStatusFilter('all')}>
              Todos ({state.plans.length})
            </button>
            <button className={statusFilter === 'aguardando' ? 'on' : ''} onClick={() => setStatusFilter('aguardando')}>
              Aguardando
            </button>
            <button className={statusFilter === 'andamento' ? 'on' : ''} onClick={() => setStatusFilter('andamento')}>
              Em Andamento
            </button>
            <button className={statusFilter === 'concluido' ? 'on' : ''} onClick={() => setStatusFilter('concluido')}>
              Concluídos
            </button>
          </div>

          <select
            className="select"
            style={{ width: 180 }}
            value={profFilter}
            onChange={(e) => setProfFilter(e.target.value)}
          >
            <option value="all">Todos os Dentistas</option>
            {state.professionals.map((pr) => (
              <option key={pr.id} value={pr.id}>
                {pr.name}
              </option>
            ))}
          </select>
        </div>

        <span className="small muted">
          Mostrando <b>{filteredPlans.length}</b> orçamentos
        </span>
      </div>

      {/* Lista de Planos */}
      <div className="grid g-2">
        {filteredPlans.map((plan) => {
          const pt = state.patients.find((p) => p.id === plan.patientId);
          const prof = state.professionals.find((pr) => pr.id === plan.professionalId);
          const total = plan.items.reduce((s, i) => s + i.price, 0) * (1 - (plan.discount || 0) / 100);
          const done = plan.items.filter((i) => i.status === 'realizado').length;
          const pct = Math.round((done / plan.items.length) * 100) || 0;

          return (
            <div key={plan.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-head">
                <div>
                  <div className="row">
                    <b style={{ fontSize: 15 }}>{plan.title}</b>
                    <span className={`badge ${PLAN_STATUS[plan.status]?.cls}`}>
                      {PLAN_STATUS[plan.status]?.label}
                    </span>
                  </div>
                  <span className="small faint">
                    Paciente: <b>{pt?.name || 'Não informado'}</b> · {prof?.short}
                  </span>
                </div>

                <div className="avatar sm" style={{ background: pt?.color || 'var(--brand)' }}>
                  {pt?.name?.slice(0, 2).toUpperCase()}
                </div>
              </div>

              {/* Procedimentos */}
              <div className="col mb grow" style={{ gap: 6 }}>
                {plan.items.map((it) => (
                  <div
                    key={it.id}
                    className="row between"
                    style={{
                      padding: '6px 10px',
                      borderRadius: 8,
                      background: 'var(--surface-2)',
                      fontSize: 12,
                    }}
                  >
                    <div>
                      <b>{it.name}</b> {it.tooth ? <span className="mono faint">(Dente {it.tooth})</span> : ''}
                    </div>
                    <div className="row">
                      <span className="faint">{BRL(it.price)}</span>
                      <span className={`badge small ${it.status === 'realizado' ? 'b-ok' : 'b-warn'}`}>
                        {it.status === 'realizado' ? 'OK' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Progresso */}
              <div className="mb">
                <div className="row between small mb" style={{ marginBottom: 4 }}>
                  <span className="faint">Execução Clínica</span>
                  <b>{pct}% concluído</b>
                </div>
                <div className="progress">
                  <div style={{ width: `${pct}%` }} />
                </div>
              </div>

              {/* Rodapé com Valor e Ações */}
              <div
                className="row between pt"
                style={{
                  borderTop: '1px solid var(--border)',
                  paddingTop: 12,
                  marginTop: 'auto',
                }}
              >
                <div>
                  <span className="small faint display-block">Valor Total</span>
                  <b style={{ fontSize: 16, color: 'var(--brand)' }}>{BRL(total)}</b>
                </div>

                <div className="row">
                  {plan.status === 'aguardando' && (
                    <button
                      className="btn btn-ok btn-sm"
                      onClick={() => handleApprove(plan.id)}
                    >
                      <CheckCircle size={14} /> Aprovar
                    </button>
                  )}

                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => pt && navigate(`/pacientes/${pt.id}`)}
                  >
                    Prontuário <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
