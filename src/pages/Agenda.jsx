import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { todayISO, addDays, fmtDate, fmtLongDate, timeToMin, minToTime, uid } from '../lib/utils';
import { APPT_STATUS, PROCEDURES } from '../lib/dental';
import { PROFESSIONALS, CHAIRS } from '../lib/seed';
import {
  Calendar as CalIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  CheckCircle,
  Phone,
  MessageCircle,
  X,
  MapPin,
  FileText,
} from 'lucide-react';

export default function Agenda() {
  const { state, dispatch, toast } = useApp();
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(todayISO());
  const [selectedProf, setSelectedProf] = useState('all');
  const [selectedChair, setSelectedChair] = useState('all');
  const [viewType, setViewType] = useState('chairs'); // 'chairs' | 'professionals'

  // Modais
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [createModal, setCreateModal] = useState(null); // { date, start, chair, profId }

  // Formulário do novo agendamento
  const [formPatientId, setFormPatientId] = useState('');
  const [formProfId, setFormProfId] = useState('pr1');
  const [formChair, setFormChair] = useState('Cadeira 1');
  const [formProc, setFormProc] = useState(PROCEDURES[0].name);
  const [formStart, setFormStart] = useState('09:00');
  const [formDuration, setFormDuration] = useState(30);

  // Filtragem dos agendamentos do dia
  const dayAppointments = useMemo(() => {
    return state.appointments.filter((a) => {
      if (a.date !== currentDate) return false;
      if (selectedProf !== 'all' && a.professionalId !== selectedProf) return false;
      if (selectedChair !== 'all' && a.chair !== selectedChair) return false;
      return true;
    });
  }, [state.appointments, currentDate, selectedProf, selectedChair]);

  // Colunas a exibir (por cadeira ou por profissional)
  const columns = useMemo(() => {
    if (viewType === 'chairs') {
      return CHAIRS.filter((c) => selectedChair === 'all' || c === selectedChair).map((c) => ({
        id: c,
        title: c,
        sub: 'Equipamento e suporte',
      }));
    } else {
      return PROFESSIONALS.filter((p) => selectedProf === 'all' || p.id === selectedProf).map((p) => ({
        id: p.id,
        title: p.short,
        sub: p.specialty,
        color: p.color,
      }));
    }
  }, [viewType, selectedChair, selectedProf]);

  // Horários de 08:00 às 19:00 (intervalos de 30 min)
  const slots = useMemo(() => {
    const list = [];
    for (let m = 8 * 60; m < 19 * 60; m += 30) {
      list.push(m);
    }
    return list;
  }, []);

  const handleCreateAppointment = (e) => {
    e.preventDefault();
    if (!formPatientId) {
      toast('Selecione um paciente para agendar.');
      return;
    }

    const newAppt = {
      id: uid('ap'),
      patientId: formPatientId,
      professionalId: formProfId,
      chair: formChair,
      date: currentDate,
      start: formStart,
      duration: Number(formDuration),
      procedure: formProc,
      status: 'confirmado',
      notes: '',
    };

    dispatch({ type: 'ADD_APPT', appt: newAppt });
    setCreateModal(null);
    toast('Consulta agendada com sucesso!');
  };

  const handleUpdateStatus = (apptId, newStatus) => {
    dispatch({
      type: 'UPDATE_APPT',
      id: apptId,
      patch: { status: newStatus },
    });
    if (selectedAppt) setSelectedAppt({ ...selectedAppt, status: newStatus });
    toast(`Status atualizado para "${APPT_STATUS[newStatus].label}"`);
  };

  const handleDeleteAppointment = (apptId) => {
    dispatch({ type: 'DELETE_APPT', id: apptId });
    setSelectedAppt(null);
    toast('Agendamento cancelado.');
  };

  return (
    <div className="page">
      {/* Cabeçalho da Agenda */}
      <div className="page-head">
        <div>
          <h1>Agenda Odontológica Integrada</h1>
          <p>
            Gestão simultânea de profissionais, cadeiras clínicas e status em tempo real.
          </p>
        </div>

        <div className="actions">
          {/* Navegação de Data */}
          <div className="seg">
            <button onClick={() => setCurrentDate(addDays(currentDate, -1))} title="Dia anterior">
              <ChevronLeft size={16} />
            </button>
            <button
              className={currentDate === todayISO() ? 'on' : ''}
              onClick={() => setCurrentDate(todayISO())}
            >
              Hoje
            </button>
            <button onClick={() => setCurrentDate(addDays(currentDate, 1))} title="Próximo dia">
              <ChevronRight size={16} />
            </button>
          </div>

          <input
            type="date"
            className="input"
            style={{ width: 145 }}
            value={currentDate}
            onChange={(e) => setCurrentDate(e.target.value)}
          />

          <button
            className="btn btn-primary"
            onClick={() => {
              setFormStart('09:00');
              setFormPatientId(state.patients[0]?.id || '');
              setCreateModal(true);
            }}
            id="btn-new-appointment"
          >
            <Plus size={16} />
            Novo Agendamento
          </button>
        </div>
      </div>

      {/* Barra de Filtros e Modo de Visualização */}
      <div className="card row between wrap mb" style={{ padding: '12px 18px' }}>
        <div className="row wrap">
          {/* Alternar visão */}
          <div className="seg">
            <button
              className={viewType === 'chairs' ? 'on' : ''}
              onClick={() => setViewType('chairs')}
            >
              Por Cadeiras
            </button>
            <button
              className={viewType === 'professionals' ? 'on' : ''}
              onClick={() => setViewType('professionals')}
            >
              Por Dentistas
            </button>
          </div>

          {/* Filtro Profissional */}
          <select
            className="select"
            style={{ width: 180 }}
            value={selectedProf}
            onChange={(e) => setSelectedProf(e.target.value)}
          >
            <option value="all">Todos os Dentistas</option>
            {PROFESSIONALS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.short}
              </option>
            ))}
          </select>

          {/* Filtro Cadeira */}
          <select
            className="select"
            style={{ width: 160 }}
            value={selectedChair}
            onChange={(e) => setSelectedChair(e.target.value)}
          >
            <option value="all">Todas as Cadeiras</option>
            {CHAIRS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="row">
          <span className="small muted">
            <b>{dayAppointments.length}</b> atendimentos em{' '}
            <b>{fmtLongDate(currentDate)}</b>
          </span>
        </div>
      </div>

      {/* Grade da Agenda */}
      <div className="agenda" style={{ gridTemplateColumns: `70px repeat(${columns.length}, 1fr)` }}>
        {/* Cabeçalho das Colunas */}
        <div className="agenda-head" style={{ gridColumn: `1 / -1`, gridTemplateColumns: `70px repeat(${columns.length}, 1fr)` }}>
          <div style={{ justifyContent: 'center', color: 'var(--text-3)', fontSize: 11, fontWeight: 700 }}>
            HORA
          </div>
          {columns.map((col) => (
            <div key={col.id} className="row">
              {col.color && (
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: col.color,
                    flexShrink: 0,
                  }}
                />
              )}
              <div>
                <b style={{ fontSize: 13 }}>{col.title}</b>
                <span className="small faint display-block" style={{ fontSize: 11 }}>
                  {col.sub}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Coluna de Horários à esquerda */}
        <div className="agenda-times">
          {slots.filter((_, idx) => idx % 2 === 0).map((m) => (
            <div key={m}>{minToTime(m)}</div>
          ))}
        </div>

        {/* Colunas de Atendimentos */}
        {columns.map((col) => {
          // Atendimentos que pertencem a esta coluna
          const colAppts = dayAppointments.filter((a) =>
            viewType === 'chairs' ? a.chair === col.id : a.professionalId === col.id
          );

          return (
            <div key={col.id} className="agenda-col">
              {/* Slots de 30 minutos clicáveis para agendar rápido */}
              {slots.map((m) => (
                <div
                  key={m}
                  className="agenda-slot"
                  title={`Agendar às ${minToTime(m)} em ${col.title}`}
                  onClick={() => {
                    setFormStart(minToTime(m));
                    if (viewType === 'chairs') setFormChair(col.id);
                    else setFormProfId(col.id);
                    setFormPatientId(state.patients[0]?.id || '');
                    setCreateModal(true);
                  }}
                />
              ))}

              {/* Cards de Agendamentos sobrepostos por coordenadas absolutas */}
              {colAppts.map((ap) => {
                const pt = state.patients.find((p) => p.id === ap.patientId);
                const prof = state.professionals.find((pr) => pr.id === ap.professionalId);
                const startM = timeToMin(ap.start);
                const baseM = 8 * 60; // 08:00
                // cada 30 min = 28px de altura -> cada 1 min = 28 / 30 px = 0.933px
                const top = ((startM - baseM) / 30) * 28;
                const height = (ap.duration / 30) * 28 - 2;

                const profColor = prof?.color || '#2ee6c5';

                return (
                  <div
                    key={ap.id}
                    className={`appt ${ap.status}`}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      '--c': profColor,
                    }}
                    onClick={() => setSelectedAppt(ap)}
                  >
                    <div className="row between" style={{ marginBottom: 2 }}>
                      <b>{pt?.name || 'Paciente'}</b>
                      <span className="mono" style={{ fontSize: 10 }}>
                        {ap.start}
                      </span>
                    </div>
                    <span>
                      {ap.procedure} {viewType === 'chairs' ? `· ${prof?.short}` : `· ${ap.chair}`}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Modal de Detalhes do Agendamento */}
      {selectedAppt && (
        <div className="modal-backdrop" onClick={() => setSelectedAppt(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Detalhes da Consulta</h3>
              <button className="btn btn-ghost btn-xs" onClick={() => setSelectedAppt(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              {(() => {
                const pt = state.patients.find((p) => p.id === selectedAppt.patientId);
                const prof = state.professionals.find((pr) => pr.id === selectedAppt.professionalId);
                return (
                  <>
                    <div className="list-item" style={{ background: 'var(--surface-2)', padding: 12 }}>
                      <div className="avatar" style={{ background: pt?.color || 'var(--brand)' }}>
                        {pt?.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="grow">
                        <h4 style={{ fontSize: 15 }}>{pt?.name}</h4>
                        <span className="small faint">
                          CPF: {pt?.cpf} · Tel: {pt?.phone} · Convênio: {pt?.insurance}
                        </span>
                      </div>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => {
                          setSelectedAppt(null);
                          navigate(`/pacientes/${pt.id}`);
                        }}
                      >
                        Prontuário →
                      </button>
                    </div>

                    <div className="grid g-2">
                      <div className="field">
                        <label>Procedimento Clínico:</label>
                        <b>{selectedAppt.procedure}</b>
                      </div>
                      <div className="field">
                        <label>Dentista Responsável:</label>
                        <b>{prof?.name} ({prof?.cro})</b>
                      </div>
                      <div className="field">
                        <label>Cadeira / Horário:</label>
                        <b>{selectedAppt.chair} · {selectedAppt.start} ({selectedAppt.duration} min)</b>
                      </div>
                      <div className="field">
                        <label>Status Atual:</label>
                        <span className={`badge ${APPT_STATUS[selectedAppt.status]?.cls}`}>
                          {APPT_STATUS[selectedAppt.status]?.label}
                        </span>
                      </div>
                    </div>

                    {/* Mudança Rápida de Status */}
                    <div className="field">
                      <label>Atualizar Status do Atendimento:</label>
                      <div className="row wrap" style={{ gap: 6 }}>
                        {Object.entries(APPT_STATUS).map(([key, val]) => (
                          <button
                            key={key}
                            type="button"
                            className={`btn btn-xs ${selectedAppt.status === key ? 'btn-primary' : ''}`}
                            onClick={() => handleUpdateStatus(selectedAppt.id, key)}
                          >
                            {val.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Ações Rápidas: WhatsApp */}
                    <div className="row">
                      <button
                        className="btn btn-sm grow"
                        onClick={() => {
                          toast(`Lembrete e confirmação enviados via WhatsApp para ${pt?.phone}!`);
                        }}
                      >
                        <MessageCircle size={14} color="var(--brand)" />
                        Confirmar via WhatsApp
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteAppointment(selectedAppt.id)}
                      >
                        Desmarcar Consulta
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação de Agendamento */}
      {createModal && (
        <div className="modal-backdrop" onClick={() => setCreateModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreateAppointment}>
              <div className="modal-head">
                <h3>Novo Agendamento Clínico</h3>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => setCreateModal(null)}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="modal-body">
                <div className="field">
                  <label>Paciente:</label>
                  <select
                    className="select"
                    value={formPatientId}
                    onChange={(e) => setFormPatientId(e.target.value)}
                    required
                  >
                    <option value="">Selecione o paciente cadastrado...</option>
                    {state.patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.cpf})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid g-2">
                  <div className="field">
                    <label>Dentista:</label>
                    <select
                      className="select"
                      value={formProfId}
                      onChange={(e) => setFormProfId(e.target.value)}
                    >
                      {PROFESSIONALS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Cadeira:</label>
                    <select
                      className="select"
                      value={formChair}
                      onChange={(e) => setFormChair(e.target.value)}
                    >
                      {CHAIRS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label>Procedimento Odontológico:</label>
                  <select
                    className="select"
                    value={formProc}
                    onChange={(e) => setFormProc(e.target.value)}
                  >
                    {PROCEDURES.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name} ({p.duration} min — R$ {p.price.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid g-2">
                  <div className="field">
                    <label>Horário Inicial:</label>
                    <input
                      type="time"
                      className="input"
                      value={formStart}
                      onChange={(e) => setFormStart(e.target.value)}
                      required
                    />
                  </div>

                  <div className="field">
                    <label>Duração (minutos):</label>
                    <select
                      className="select"
                      value={formDuration}
                      onChange={(e) => setFormDuration(Number(e.target.value))}
                    >
                      <option value={20}>20 minutos</option>
                      <option value={30}>30 minutos</option>
                      <option value={45}>45 minutos</option>
                      <option value={60}>60 minutos (1 hora)</option>
                      <option value={90}>90 minutos (1h 30m)</option>
                      <option value={120}>120 minutos (2 horas)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-foot">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setCreateModal(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" id="btn-save-appointment">
                  Confirmar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
