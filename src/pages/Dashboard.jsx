import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';
import { BRL, todayISO, fmtDate } from '../lib/utils';
import {
  TrendingUp,
  Users,
  Calendar,
  FileSpreadsheet,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Sparkles,
  CheckCircle2,
  DollarSign,
  ChevronRight,
  Cake,
  Activity,
  PlusCircle,
  Database,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function Dashboard() {
  const { state, dispatch, toast, isCleanSpace, isDemoSeed } = useApp();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const today = todayISO();

  // KPIs Financeiros
  const kpis = useMemo(() => {
    const thisMonth = today.slice(0, 7);
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonth = lastMonthDate.toISOString().slice(0, 7);

    const revThisMonth = state.transactions
      .filter((t) => t.type === 'receita' && t.date.startsWith(thisMonth) && t.status === 'pago')
      .reduce((s, t) => s + t.amount, 0);

    const revLastMonth = state.transactions
      .filter((t) => t.type === 'receita' && t.date.startsWith(lastMonth) && t.status === 'pago')
      .reduce((s, t) => s + t.amount, 0);

    const pendingRevenue = state.transactions
      .filter((t) => t.type === 'receita' && t.status === 'pendente')
      .reduce((s, t) => s + t.amount, 0);

    const todayAppointments = state.appointments.filter((a) => a.date === today);
    const completedToday = todayAppointments.filter((a) => a.status === 'concluido').length;

    const pendingPlans = state.plans.filter((p) => p.status === 'aguardando');
    const criticalStock = state.inventory.filter((i) => i.qty <= i.min);

    const growth = revLastMonth > 0 ? Math.round(((revThisMonth - revLastMonth) / revLastMonth) * 100) : 15;

    return {
      revThisMonth,
      growth,
      pendingRevenue,
      todayTotal: todayAppointments.length,
      todayCompleted: completedToday,
      pendingPlansCount: pendingPlans.length,
      criticalStockCount: criticalStock.length,
    };
  }, [state, today]);

  // Gráfico Histórico Financeiro (Últimos 6 meses)
  const chartData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mStr = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('pt-BR', { month: 'short' });

      const receita = state.transactions
        .filter((t) => t.type === 'receita' && t.date.startsWith(mStr) && t.status === 'pago')
        .reduce((s, t) => s + t.amount, 0);

      const despesa = state.transactions
        .filter((t) => t.type === 'despesa' && t.date.startsWith(mStr) && t.status === 'pago')
        .reduce((s, t) => s + t.amount, 0);

      months.push({ mes: label.toUpperCase(), receita, despesa });
    }
    return months;
  }, [state.transactions]);

  // Distribuição de Procedimentos por Especialidade
  const specData = [
    { name: 'Dentística & Estética', value: 42, color: '#2ee6c5' },
    { name: 'Implantodontia', value: 28, color: '#7c5cff' },
    { name: 'Endodontia', value: 16, color: '#f472b6' },
    { name: 'Ortodontia & Geral', value: 14, color: '#fbbf24' },
  ];

  // Consultas de Hoje
  const todayAppointments = state.appointments
    .filter((a) => a.date === today)
    .sort((a, b) => a.start.localeCompare(b.start));

  // Aniversariantes do Mês Atual
  const curMonthNum = new Date().getMonth() + 1;
  const birthdays = state.patients.filter((p) => {
    if (!p.birth) return false;
    const bMonth = parseInt(p.birth.split('-')[1], 10);
    return bMonth === curMonthNum;
  });

  return (
    <div className="page">
      {/* Cabeçalho */}
      <div className="page-head">
        <div>
          <h1>{currentUser?.clinicName || 'Painel Geral da Clínica'}</h1>
          <p>
            Bem-vindo(a), <b>{currentUser?.name || 'Cirurgião-Dentista'}</b>. Visão consolidada de atendimentos, odontograma e faturamento.
          </p>
        </div>

        <div className="actions">
          {currentUser && !currentUser.isDemo && state.patients.length > 0 && (
            <button
              className="btn btn-ghost"
              onClick={() => {
                if (window.confirm('Deseja zerar os dados da sua clínica e retornar ao estado original limpo? Todos os dados cadastrados serão resetados.')) {
                  dispatch({ type: 'RESET_TO_CLEAN', user: currentUser });
                  toast('Clínica restaurada para o estado original limpo!');
                }
              }}
              title="Restaurar clínica para o estado original limpo"
              style={{ fontSize: 13, color: 'var(--text-3)' }}
            >
              <RotateCcw size={15} />
              Restaurar Original
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={() => navigate('/pacientes')}
            id="btn-quick-new-patient"
          >
            <Users size={16} />
            Novo Paciente
          </button>
          <button
            className="btn"
            onClick={() => navigate('/agenda')}
            id="btn-quick-schedule"
          >
            <Calendar size={16} />
            Ver Agenda
          </button>
        </div>
      </div>

      {/* Alerta se houver dados de demonstração em conta real */}
      {!currentUser?.isDemo && isDemoSeed && (
        <div
          className="card mb"
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            padding: '16px 20px',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <AlertCircle size={24} color="var(--danger)" />
            <div>
              <h4 style={{ margin: '0 0 2px', fontSize: 14, color: '#fff' }}>
                Dados de Demonstração Detectados na sua Conta
              </h4>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-dim)' }}>
                Sua conta continha dados de demonstração carregados. Clique no botão ao lado para restaurar seu ambiente original limpo.
              </p>
            </div>
          </div>
          <button
            className="btn btn-primary"
            style={{ background: 'var(--danger)', borderColor: 'var(--danger)', color: '#fff', fontSize: 13 }}
            onClick={() => {
              dispatch({ type: 'RESET_TO_CLEAN', user: currentUser });
              toast('Dados de demonstração removidos! Sua clínica voltou ao original limpo.');
            }}
          >
            <RotateCcw size={15} /> Restaurar Clínica Limpa
          </button>
        </div>
      )}

      {/* Banner de Boas-Vindas para Espaço Zerado */}
      {isCleanSpace && (
        <div
          className="card mb"
          style={{
            background: 'linear-gradient(135deg, rgba(46, 230, 197, 0.12) 0%, rgba(124, 92, 255, 0.15) 100%)',
            border: '1px solid rgba(46, 230, 197, 0.3)',
            padding: '20px 24px',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'var(--brand-grad)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <Sparkles size={24} color="#0d1117" />
            </div>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#fff' }}>
                Espaço Exclusivo Configurado com Sucesso!
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-dim)' }}>
                Sua clínica está zerada e pronta para o atendimento diário. Cadastre seu primeiro paciente ou agende uma consulta.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/pacientes')}
              style={{ fontSize: 13 }}
            >
              <PlusCircle size={15} /> Cadastrar Paciente
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/agenda')}
              style={{ fontSize: 13 }}
            >
              <Calendar size={15} /> Agendar Consulta
            </button>
          </div>
        </div>
      )}

      {/* Grid de 4 KPIs Executivos */}
      <div className="grid g-4 mb">
        <div className="card kpi" style={{ '--glow': '#2ee6c5' }}>
          <div className="row between">
            <span className="small faint" style={{ fontWeight: 700, textTransform: 'uppercase' }}>
              Faturamento no Mês
            </span>
            <div className="kpi-icon" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="kpi-value">{BRL(kpis.revThisMonth)}</div>
          <div className="row mt" style={{ fontSize: 12 }}>
            <span className="badge b-ok small">+{kpis.growth}% vs anterior</span>
            <span className="faint">A receber: {BRL(kpis.pendingRevenue)}</span>
          </div>
        </div>

        <div className="card kpi" style={{ '--glow': '#7c5cff' }}>
          <div className="row between">
            <span className="small faint" style={{ fontWeight: 700, textTransform: 'uppercase' }}>
              Atendimentos de Hoje
            </span>
            <div className="kpi-icon" style={{ background: 'var(--violet-soft)', color: '#a78bfa' }}>
              <Calendar size={20} />
            </div>
          </div>
          <div className="kpi-value">
            {kpis.todayTotal} <span style={{ fontSize: 16, color: 'var(--text-3)', fontWeight: 500 }}>agendados</span>
          </div>
          <div className="row mt" style={{ fontSize: 12 }}>
            <span className="badge b-brand small">{kpis.todayCompleted} concluídos</span>
            <span className="faint">4 cadeiras ativas</span>
          </div>
        </div>

        <div className="card kpi" style={{ '--glow': '#fbbf24' }}>
          <div className="row between">
            <span className="small faint" style={{ fontWeight: 700, textTransform: 'uppercase' }}>
              Orçamentos Pendentes
            </span>
            <div className="kpi-icon" style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}>
              <FileSpreadsheet size={20} />
            </div>
          </div>
          <div className="kpi-value">{kpis.pendingPlansCount}</div>
          <div className="row mt" style={{ fontSize: 12 }}>
            <span className="badge b-warn small">Aguardando aprovação</span>
            <span className="faint" onClick={() => navigate('/tratamentos')} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
              Ver planos →
            </span>
          </div>
        </div>

        <div className="card kpi" style={{ '--glow': '#fb7185' }}>
          <div className="row between">
            <span className="small faint" style={{ fontWeight: 700, textTransform: 'uppercase' }}>
              Estoque Crítico
            </span>
            <div className="kpi-icon" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="kpi-value">{kpis.criticalStockCount}</div>
          <div className="row mt" style={{ fontSize: 12 }}>
            <span className="badge b-danger small">Abaixo do mínimo</span>
            <span className="faint" onClick={() => navigate('/estoque')} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
              Repor itens →
            </span>
          </div>
        </div>
      </div>

      {/* Seção Principal: Gráfico + Agenda de Hoje */}
      <div className="grid g-main mb">
        {/* Gráfico Financeiro */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>
                <Activity size={18} color="var(--brand)" />
                Fluxo Financeiro Semestral
              </h3>
              <span className="sub">Receitas de procedimentos vs despesas operacionais da clínica</span>
            </div>
            <div className="row">
              <span className="badge plain small" style={{ color: 'var(--brand)' }}>● Receita</span>
              <span className="badge plain small" style={{ color: 'var(--danger)' }}>● Despesa</span>
            </div>
          </div>

          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2ee6c5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2ee6c5" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorDesp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fb7185" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#fb7185" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="mes" stroke="var(--text-3)" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="var(--text-3)"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface-solid)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(value) => [BRL(value), '']}
                />
                <Area type="monotone" dataKey="receita" stroke="#2ee6c5" strokeWidth={3} fillOpacity={1} fill="url(#colorRec)" />
                <Area type="monotone" dataKey="despesa" stroke="#fb7185" strokeWidth={2} fillOpacity={1} fill="url(#colorDesp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Atendimentos do Dia */}
        <div className="card">
          <div className="card-head">
            <h3>
              <Clock size={18} color="var(--brand)" />
              Pacientes Hoje ({todayAppointments.length})
            </h3>
            <button className="btn btn-ghost btn-xs" onClick={() => navigate('/agenda')}>
              Ver todos →
            </button>
          </div>

          <div className="col" style={{ maxHeight: 290, overflowY: 'auto', gap: 10 }}>
            {todayAppointments.length === 0 ? (
              <p className="empty">Nenhum paciente agendado para hoje.</p>
            ) : (
              todayAppointments.map((ap) => {
                const pt = state.patients.find((p) => p.id === ap.patientId);
                const prof = state.professionals.find((pr) => pr.id === ap.professionalId);
                return (
                  <div
                    key={ap.id}
                    className="list-item row between"
                    style={{ background: 'var(--surface-2)', padding: '10px 12px' }}
                    onClick={() => pt && navigate(`/pacientes/${pt.id}`)}
                  >
                    <div className="row">
                      <div
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: 12,
                          fontWeight: 700,
                          color: 'var(--brand)',
                          padding: '4px 8px',
                          borderRadius: 8,
                          background: 'var(--surface)',
                        }}
                      >
                        {ap.start}
                      </div>
                      <div>
                        <b style={{ fontSize: 13 }}>{pt?.name || 'Paciente'}</b>
                        <div className="small faint">
                          {ap.procedure} · {prof?.short} ({ap.chair})
                        </div>
                      </div>
                    </div>

                    <span
                      className={`badge small ${
                        ap.status === 'concluido'
                          ? 'b-ok'
                          : ap.status === 'atendimento'
                          ? 'b-violet'
                          : ap.status === 'confirmado'
                          ? 'b-brand'
                          : 'b-info'
                      }`}
                    >
                      {ap.status}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Grid Inferior: Mix de Procedimentos + Aniversariantes */}
      <div className="grid g-2">
        {/* Distribuição Clínica */}
        <div className="card">
          <div className="card-head">
            <h3>
              <FileSpreadsheet size={18} color="var(--brand)" />
              Mix de Procedimentos Clínicos
            </h3>
          </div>

          <div className="row between wrap">
            <div style={{ width: 180, height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={specData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                    {specData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="col grow" style={{ gap: 8 }}>
              {specData.map((s) => (
                <div key={s.name} className="row between">
                  <div className="row">
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
                    <span className="small">{s.name}</span>
                  </div>
                  <b className="small">{s.value}%</b>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Aniversariantes do Mês (Relacionamento & Fidelização) */}
        <div className="card">
          <div className="card-head">
            <h3>
              <Cake size={18} color="#f472b6" />
              Aniversariantes do Mês ({birthdays.length})
            </h3>
            <span className="badge b-violet small">Campanha de Fidelização</span>
          </div>

          <div className="col" style={{ gap: 8 }}>
            {birthdays.slice(0, 4).map((pt) => (
              <div
                key={pt.id}
                className="list-item row between"
                style={{ background: 'var(--surface-2)', padding: '8px 12px', cursor: 'pointer' }}
                onClick={() => navigate(`/pacientes/${pt.id}`)}
              >
                <div className="row">
                  <div className="avatar sm" style={{ background: pt.color }}>
                    {pt.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <b style={{ fontSize: 13 }}>{pt.name}</b>
                    <span className="small faint display-block">
                      Dia {pt.birth.split('-')[2]} deste mês · Tel: {pt.phone}
                    </span>
                  </div>
                </div>

                <button
                  className="btn btn-sm btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    toast(`Mensagem de parabéns enviada via WhatsApp para ${pt.name}!`);
                  }}
                  id={`btn-congrat-${pt.id}`}
                >
                  <Sparkles size={13} color="var(--brand)" />
                  Enviar WhatsApp
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
