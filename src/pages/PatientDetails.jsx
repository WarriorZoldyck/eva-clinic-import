import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { age, fmtDate, BRL, todayISO, uid } from '../lib/utils';
import { PROCEDURES, procById, PLAN_STATUS } from '../lib/dental';
import Odontogram from '../components/Odontogram';
import DentalViewer3D from '../components/DentalViewer3D';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
  FileSpreadsheet,
  HeartPulse,
  Clock,
  Image as ImageIcon,
  DollarSign,
  Plus,
  CheckCircle,
  AlertTriangle,
  Printer,
  ChevronLeft,
  X,
  FileCheck,
  Eye,
  ShieldCheck,
  Send,
  Box,
} from 'lucide-react';

export default function PatientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dispatch, toast } = useApp();

  const patient = state.patients.find((p) => p.id === id) || state.patients[0];
  const [activeTab, setActiveTab] = useState('odonto'); // 'odonto' | '3d' | 'plans' | 'anamnesis' | 'evolution' | 'docs' | 'financial'
  const [selectedTooth3D, setSelectedTooth3D] = useState(16);

  // Estados locais para novos registros
  const [newEvoText, setNewEvoText] = useState('');
  const [newEvoProf, setNewEvoProf] = useState('pr1');

  // Anamnese editável
  const [anamnesis, setAnamnesis] = useState(patient?.anamnesis || {});

  // Modal de imagem de raio-x
  const [viewingXray, setViewingXray] = useState(false);

  if (!patient) {
    return (
      <div className="page">
        <p className="empty">Paciente não encontrado.</p>
        <button className="btn btn-primary" onClick={() => navigate('/pacientes')}>
          Voltar para Pacientes
        </button>
      </div>
    );
  }

  const patientPlans = state.plans.filter((p) => p.patientId === patient.id);
  const patientEvolutions = state.evolutions.filter((e) => e.patientId === patient.id);
  const patientDocs = state.documents.filter((d) => d.patientId === patient.id);
  const patientOdonto = state.odontogram[patient.id] || {};
  const patientTx = state.transactions.filter((t) => t.patientId === patient.id);

  const handleSaveAnamnesis = (e) => {
    e.preventDefault();
    dispatch({
      type: 'UPDATE_PATIENT',
      id: patient.id,
      patch: {
        anamnesis: {
          ...anamnesis,
          updatedAt: todayISO(),
        },
      },
    });
    toast('Anamnese do paciente atualizada com sucesso!');
  };

  const handleAddEvolution = (e) => {
    e.preventDefault();
    if (!newEvoText.trim()) return;

    const evo = {
      id: uid('ev'),
      patientId: patient.id,
      professionalId: newEvoProf,
      date: todayISO(),
      text: newEvoText.trim(),
    };

    dispatch({ type: 'ADD_EVOLUTION', evo });
    setNewEvoText('');
    toast('Evolução clínica registrada no prontuário.');
  };

  const handleApprovePlan = (planId) => {
    dispatch({ type: 'PLAN_APPROVE', id: planId });
    toast('Plano aprovado! As parcelas foram geradas no contas a receber.');
  };

  const handleExecuteItem = (planId, itemId) => {
    dispatch({ type: 'ITEM_DONE', planId, itemId });
    toast('Procedimento realizado! Estoque atualizado e evolução gerada automaticamente.');
  };

  return (
    <div className="page" style={{ maxWidth: 1680 }}>
      {/* Botão Voltar */}
      <div className="row mb" style={{ marginBottom: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/pacientes')}>
          <ChevronLeft size={16} /> Voltar para Lista de Pacientes
        </button>
      </div>

      {/* Hero do Paciente — Layout Fiel à Referência Clínica (Image 2) */}
      <div className="patient-clinical-header-card mb">
        <div className="row" style={{ gap: 16 }}>
          <div
            className="patient-photo-circle"
            style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0d9488, #0284c7)',
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: 20,
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)',
              flexShrink: 0,
            }}
          >
            {patient.name.slice(0, 2).toUpperCase()}
          </div>

          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
              {patient.name}
            </h2>
            <div className="small faint" style={{ marginTop: 2, color: '#64748b' }}>
              {age(patient.birth)} anos, {patient.gender === 'F' ? 'Feminino' : 'Masculino'} • {fmtDate(patient.birth)} • Prontuário: #{patient.id.replace('pt', '100')}
            </div>
          </div>
        </div>

        {/* Coluna Contato */}
        <div className="header-info-col">
          <span className="info-col-label">Contato</span>
          <div className="info-col-val">{patient.phone}</div>
          <div className="info-col-sub">{patient.email}</div>
        </div>

        {/* Coluna Último Atendimento */}
        <div className="header-info-col">
          <span className="info-col-label">Último atendimento</span>
          <div className="info-col-val">{patientEvolutions[0]?.date ? fmtDate(patientEvolutions[0].date) : '12/05/2024'}</div>
          <div className="info-col-sub">Avaliação + Profilaxia</div>
        </div>

        {/* Coluna Plano Atual */}
        <div className="header-info-col">
          <span className="info-col-label">Plano atual</span>
          <div className="info-col-val">Plano de Tratamento</div>
          <span className="badge b-ok small" style={{ fontSize: 11, padding: '2px 8px', marginTop: 2, display: 'inline-flex' }}>
            Em andamento ▾
          </span>
        </div>

        {/* Botão de Ação Primária */}
        <div className="header-action-col">
          <button
            className="btn btn-primary"
            style={{
              background: '#0d9488',
              color: '#ffffff',
              borderRadius: 10,
              fontWeight: 700,
              padding: '0 18px',
              height: 40,
              boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)',
            }}
            onClick={() => navigate('/agenda')}
            id="btn-new-appointment-hero"
          >
            <Plus size={16} /> Novo Atendimento
          </button>
        </div>
      </div>

      {/* Barra de Abas Estilo Clínico da Imagem de Referência */}
      <div className="clinical-nav-tabs mb">
        <button
          className={`clinical-tab-item ${activeTab === 'ficha' ? 'active' : ''}`}
          onClick={() => setActiveTab('ficha')}
        >
          <User size={15} /> Ficha Clínica
        </button>

        <button
          className={`clinical-tab-item ${activeTab === 'anamnesis' ? 'active' : ''}`}
          onClick={() => setActiveTab('anamnesis')}
        >
          <HeartPulse size={15} /> Anamnese
        </button>

        <button
          className={`clinical-tab-item ${activeTab === 'odonto' ? 'active' : ''}`}
          onClick={() => setActiveTab('odonto')}
          id="tab-odonto-main"
        >
          <Layers size={15} /> Odontograma
        </button>

        <button
          className={`clinical-tab-item ${activeTab === 'evolution' ? 'active' : ''}`}
          onClick={() => setActiveTab('evolution')}
        >
          <Clock size={15} /> Evolução
        </button>

        <button
          className={`clinical-tab-item ${activeTab === 'docs' ? 'active' : ''}`}
          onClick={() => setActiveTab('docs')}
        >
          <FileSpreadsheet size={15} /> Documentos
        </button>

        <button
          className={`clinical-tab-item ${activeTab === 'imagens' ? 'active' : ''}`}
          onClick={() => setActiveTab('imagens')}
        >
          <ImageIcon size={15} /> Imagens & Raio-X
        </button>

        <button
          className={`clinical-tab-item ${activeTab === 'plans' ? 'active' : ''}`}
          onClick={() => setActiveTab('plans')}
        >
          <FileCheck size={15} /> Plano de Tratamento
        </button>

        <button
          className={`clinical-tab-item ${activeTab === '3d' ? 'active' : ''}`}
          onClick={() => setActiveTab('3d')}
          id="tab-3d-main"
        >
          <Box size={15} /> Escaneamento 3D (iTero)
        </button>
      </div>

      {/* 1. Odontograma 2D */}
      {activeTab === 'odonto' && (
        <Odontogram patientId={patient.id} onOpen3D={() => setActiveTab('3d')} />
      )}

      {/* 2. Visualizador 3D */}
      {activeTab === '3d' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-head" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 15 }}>
                <Sparkles size={18} color="var(--brand)" />
                Escaneamento Odontológico 3D (estilo iTero) — {patient.name}
              </h3>
              <span className="sub" style={{ fontSize: 12, color: 'var(--text-2)' }}>
                Modelo intraoral flutuante sem pedestal • Gire com botão esquerdo, translade com direito, zoom no scroll e clique para inspecionar
              </span>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => setActiveTab('odonto')}>
              <Layers size={14} /> Voltar ao Odontograma 2D
            </button>
          </div>

          <DentalViewer3D
            patientOdonto={patientOdonto}
            initialSelected={selectedTooth3D}
            onSelectTooth={(n) => setSelectedTooth3D(n)}
          />
        </div>
      )}

      {/* 3. Planos de Tratamento & Orçamentos */}
      {activeTab === 'plans' && (
        <div className="col" style={{ gap: 20 }}>
          {patientPlans.length === 0 ? (
            <div className="card empty">
              <FileSpreadsheet size={40} />
              <p>Nenhum plano de tratamento criado para este paciente ainda.</p>
              <button
                className="btn btn-primary btn-sm mt"
                onClick={() => setActiveTab('odonto')}
              >
                Abrir Odontograma para Adicionar Procedimentos
              </button>
            </div>
          ) : (
            patientPlans.map((plan) => {
              const prof = state.professionals.find((pr) => pr.id === plan.professionalId);
              const total = plan.items.reduce((s, i) => s + i.price, 0) * (1 - (plan.discount || 0) / 100);
              const doneCount = plan.items.filter((i) => i.status === 'realizado').length;
              const pct = Math.round((doneCount / plan.items.length) * 100) || 0;

              return (
                <div key={plan.id} className="card">
                  <div className="card-head">
                    <div>
                      <div className="row">
                        <h3>{plan.title}</h3>
                        <span className={`badge ${PLAN_STATUS[plan.status]?.cls}`}>
                          {PLAN_STATUS[plan.status]?.label}
                        </span>
                      </div>
                      <span className="sub">
                        Criado em {fmtDate(plan.createdAt)} · Responsável: {prof?.name}
                      </span>
                    </div>

                    <div className="row wrap">
                      {plan.status === 'aguardando' && (
                        <button
                          className="btn btn-ok btn-sm"
                          onClick={() => handleApprovePlan(plan.id)}
                          id={`btn-approve-plan-${plan.id}`}
                        >
                          <CheckCircle size={14} /> Aprovar Orçamento
                        </button>
                      )}
                      <button
                        className="btn btn-sm"
                        onClick={() => toast('Comprovante / Orçamento impresso com sucesso!')}
                      >
                        <Printer size={14} /> Imprimir Orçamento
                      </button>
                    </div>
                  </div>

                  {/* Barra de Progresso do Tratamento */}
                  <div className="mb">
                    <div className="row between small mb" style={{ marginBottom: 6 }}>
                      <span className="muted">Progresso Clínico</span>
                      <b>
                        {doneCount} de {plan.items.length} procedimentos realizados ({pct}%)
                      </b>
                    </div>
                    <div className="progress">
                      <div style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {/* Tabela de Itens / Procedimentos */}
                  <div className="table-wrap mb">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Procedimento</th>
                          <th>Dente / Faces</th>
                          <th>Valor</th>
                          <th>Status de Execução</th>
                          <th style={{ textAlign: 'right' }}>Ação Clínica</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plan.items.map((it) => (
                          <tr key={it.id}>
                            <td>
                              <b>{it.name}</b>
                            </td>
                            <td>
                              {it.tooth ? (
                                <span className="mono badge plain">
                                  Dente {it.tooth} {it.faces?.length > 0 ? `(${it.faces.join(', ')})` : ''}
                                </span>
                              ) : (
                                <span className="faint">—</span>
                              )}
                            </td>
                            <td>
                              <b>{BRL(it.price)}</b>
                            </td>
                            <td>
                              <span
                                className={`badge small ${
                                  it.status === 'realizado' ? 'b-ok' : 'b-warn'
                                }`}
                              >
                                {it.status === 'realizado' ? 'Realizado' : 'Pendente'}
                              </span>
                              {it.doneAt && (
                                <span className="small faint mono display-block">
                                  em {fmtDate(it.doneAt)}
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {it.status !== 'realizado' ? (
                                <button
                                  className="btn btn-ok btn-xs"
                                  onClick={() => handleExecuteItem(plan.id, it.id)}
                                  id={`btn-execute-${it.id}`}
                                >
                                  <CheckCircle size={12} /> Marcar como Realizado
                                </button>
                              ) : (
                                <span className="small faint">Concluído</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Resumo Financeiro do Orçamento */}
                  <div
                    className="row between wrap"
                    style={{
                      background: 'var(--surface-2)',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius)',
                    }}
                  >
                    <div className="row">
                      <span className="small muted">
                        Condição: <b>{plan.installments}x de {BRL(total / plan.installments)}</b> via{' '}
                        <b>{plan.method}</b>
                      </span>
                    </div>

                    <div className="row">
                      <span className="muted small">Total do Tratamento:</span>
                      <h4 style={{ fontSize: 18, color: 'var(--brand)' }}>{BRL(total)}</h4>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 4. Anamnese Completa */}
      {activeTab === 'anamnesis' && (
        <form onSubmit={handleSaveAnamnesis} className="card">
          <div className="card-head">
            <div>
              <h3>
                <HeartPulse size={18} color="var(--brand)" />
                Ficha de Anamnese & Histórico Geral
              </h3>
              <span className="sub">
                Última atualização: {fmtDate(patient.anamnesis?.updatedAt || todayISO())}
              </span>
            </div>
            <button type="submit" className="btn btn-primary btn-sm" id="btn-save-anamnesis">
              <ShieldCheck size={14} /> Salvar Anamnese
            </button>
          </div>

          <div className="grid g-2 mb">
            <div className="field">
              <label>Alergias a Medicamentos / Alimentos / Látex:</label>
              <input
                type="text"
                className="input"
                value={anamnesis.allergies || ''}
                onChange={(e) => setAnamnesis({ ...anamnesis, allergies: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Doenças Sistêmicas Crônicas:</label>
              <input
                type="text"
                className="input"
                value={anamnesis.conditions || ''}
                onChange={(e) => setAnamnesis({ ...anamnesis, conditions: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Medicamentos em Uso Contínuo:</label>
              <input
                type="text"
                className="input"
                value={anamnesis.medications || ''}
                onChange={(e) => setAnamnesis({ ...anamnesis, medications: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Queixa Principal / Desconforto Atual:</label>
              <input
                type="text"
                className="input"
                value={anamnesis.complaint || ''}
                onChange={(e) => setAnamnesis({ ...anamnesis, complaint: e.target.value })}
              />
            </div>
          </div>

          <div className="grid g-3">
            <div className="card" style={{ padding: 14 }}>
              <label className="row between" style={{ cursor: 'pointer' }}>
                <span>Fumante?</span>
                <input
                  type="checkbox"
                  checked={Boolean(anamnesis.smoker)}
                  onChange={(e) => setAnamnesis({ ...anamnesis, smoker: e.target.checked })}
                />
              </label>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <label className="row between" style={{ cursor: 'pointer' }}>
                <span>Tendência a Hemorragia / Sangramento?</span>
                <input
                  type="checkbox"
                  checked={Boolean(anamnesis.bleeding)}
                  onChange={(e) => setAnamnesis({ ...anamnesis, bleeding: e.target.checked })}
                />
              </label>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <label className="row between" style={{ cursor: 'pointer' }}>
                <span>Gestante / Lactante?</span>
                <input
                  type="checkbox"
                  checked={Boolean(anamnesis.pregnant)}
                  onChange={(e) => setAnamnesis({ ...anamnesis, pregnant: e.target.checked })}
                />
              </label>
            </div>
          </div>
        </form>
      )}

      {/* 5. Evolução Clínica */}
      {activeTab === 'evolution' && (
        <div className="grid g-main">
          {/* Timeline de Histórico */}
          <div className="card">
            <div className="card-head">
              <h3>
                <Clock size={18} color="var(--brand)" />
                Linha do Tempo das Sessões Clínicas
              </h3>
            </div>

            <div className="timeline">
              {patientEvolutions.map((evo) => {
                const prof = state.professionals.find((pr) => pr.id === evo.professionalId);
                return (
                  <div key={evo.id} className="tl-item">
                    <div className="row between mb" style={{ marginBottom: 4 }}>
                      <b style={{ fontSize: 13 }}>{prof?.name || 'Profissional'}</b>
                      <span className="mono small faint">{fmtDate(evo.date)}</span>
                    </div>
                    <p style={{ fontSize: 13.5, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                      {evo.text}
                    </p>
                    {evo.auto && (
                      <span className="badge b-brand small mt" style={{ marginTop: 6 }}>
                        Registro Automático de Procedimento
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Nova Evolução */}
          <form onSubmit={handleAddEvolution} className="card">
            <div className="card-head">
              <h3>Nova Evolução Clínica</h3>
            </div>

            <div className="field mb">
              <label>Dentista Atendente:</label>
              <select
                className="select"
                value={newEvoProf}
                onChange={(e) => setNewEvoProf(e.target.value)}
              >
                {state.professionals.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field mb">
              <label>Relato do Procedimento / Anotações:</label>
              <textarea
                className="textarea"
                rows={6}
                placeholder="Ex: Anestesia infiltrativa terminal. Preparo cavitário, aplicação de silano e restauração em resina composta no dente 16..."
                value={newEvoText}
                onChange={(e) => setNewEvoText(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              <Send size={15} /> Gravar no Prontuário
            </button>
          </form>
        </div>
      )}

      {/* 6. Documentos & Exames (com Radiografia Panorâmica em alta definição) */}
      {activeTab === 'docs' && (
        <div className="card">
          <div className="card-head">
            <div>
              <h3>
                <ImageIcon size={18} color="var(--brand)" />
                Exames Radiológicos & Documentação Digital
              </h3>
              <span className="sub">
                Radiografias panorâmicas, periapicais, atestados e termos de consentimento assinados
              </span>
            </div>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => toast('Funcionalidade de upload: selecione arquivos DICOM, JPG ou PDF.')}
            >
              <Plus size={14} /> Anexar Exame
            </button>
          </div>

          <div className="grid g-3">
            {patientDocs.map((doc) => (
              <div
                key={doc.id}
                className="card"
                style={{
                  background: 'var(--surface-solid)',
                  padding: 14,
                  cursor: doc.type === 'Imagem' ? 'pointer' : 'default',
                  transition: 'transform 0.2s',
                }}
                onClick={() => doc.type === 'Imagem' && setViewingXray(true)}
              >
                {doc.type === 'Imagem' ? (
                  <div
                    style={{
                      position: 'relative',
                      height: 140,
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      marginBottom: 10,
                      border: '1px solid var(--border)',
                    }}
                  >
                    <img
                      src="/images/panoramica.jpg"
                      alt={doc.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.3)',
                        display: 'grid',
                        placeItems: 'center',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                      }}
                      className="hover-show"
                    >
                      <Eye size={24} color="#fff" />
                    </span>
                  </div>
                ) : (
                  <div
                    style={{
                      height: 140,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--surface-2)',
                      display: 'grid',
                      placeItems: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <FileCheck size={36} color="var(--brand)" />
                  </div>
                )}

                <b style={{ fontSize: 13, display: 'block' }}>{doc.name}</b>
                <div className="row between mt" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  <span>{doc.type}</span>
                  <span>{fmtDate(doc.date)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Modal para Visualização em Tela Cheia do Raio-X */}
          {viewingXray && (
            <div className="modal-backdrop" onClick={() => setViewingXray(false)}>
              <div
                className="modal wide"
                style={{ maxWidth: 960, background: '#000' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-head" style={{ borderBottom: '1px solid #333' }}>
                  <h3 style={{ color: '#fff' }}>Radiografia Panorâmica — {patient.name}</h3>
                  <button className="btn btn-ghost btn-xs" onClick={() => setViewingXray(false)}>
                    <X size={18} color="#fff" />
                  </button>
                </div>
                <div style={{ padding: 14, textAlign: 'center' }}>
                  <img
                    src="/images/panoramica.jpg"
                    alt="Radiografia Panorâmica em alta definição"
                    style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }}
                  />
                  <div className="row between mt" style={{ color: '#aaa', fontSize: 12 }}>
                    <span>Imagem médica em tons de cinza com alta fidelidade diagnóstica.</span>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => toast('Baixando imagem médica em tamanho original...')}
                    >
                      Download DICOM / JPG
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. Financeiro do Paciente */}
      {activeTab === 'financial' && (
        <div className="card">
          <div className="card-head">
            <div>
              <h3>
                <DollarSign size={18} color="var(--brand)" />
                Histórico Financeiro do Paciente
              </h3>
              <span className="sub">
                Todas as faturas, parcelas de orçamentos e comprovantes emitidos
              </span>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Forma de Pagamento</th>
                  <th>Vencimento / Data</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {patientTx.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty">
                      Nenhum lançamento financeiro para este paciente.
                    </td>
                  </tr>
                ) : (
                  patientTx.map((tx) => (
                    <tr key={tx.id}>
                      <td>
                        <b>{tx.description}</b>
                      </td>
                      <td>{tx.method}</td>
                      <td className="mono">{fmtDate(tx.dueDate || tx.date)}</td>
                      <td>
                        <b>{BRL(tx.amount)}</b>
                      </td>
                      <td>
                        <span
                          className={`badge small ${tx.status === 'pago' ? 'b-ok' : 'b-warn'}`}
                        >
                          {tx.status === 'pago' ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {tx.status !== 'pago' ? (
                          <button
                            className="btn btn-ok btn-xs"
                            onClick={() => {
                              dispatch({ type: 'PAY_TX', id: tx.id });
                              toast('Pagamento registrado com sucesso!');
                            }}
                          >
                            Dar Baixa
                          </button>
                        ) : (
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => toast('Recibo odontológico gerado em PDF.')}
                          >
                            Emitir Recibo
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
