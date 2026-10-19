import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { age, fmtDate, uid, todayISO, colorFor } from '../lib/utils';
import {
  Users,
  Search,
  Plus,
  Filter,
  ChevronRight,
  ShieldAlert,
  Phone,
  Mail,
  Calendar,
  X,
  HeartPulse,
} from 'lucide-react';

export default function Patients() {
  const { state, dispatch, toast } = useApp();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [filterInsurance, setFilterInsurance] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [newModalOpen, setNewModalOpen] = useState(false);

  // Form novo paciente (limpo sem valores fantasmas)
  const [name, setName] = useState('');
  const [gender, setGender] = useState('F');
  const [birth, setBirth] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [insurance, setInsurance] = useState('Particular');
  const [allergies, setAllergies] = useState('');
  const [conditions, setConditions] = useState('');
  const [complaint, setComplaint] = useState('');

  // Máscara dinâmica de telefone / WhatsApp
  const formatPhone = (val) => {
    if (!val) return '';
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length === 0) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  // Máscara de CPF
  const formatCpf = (val) => {
    if (!val) return '';
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  };

  // Limpeza completa de todos os campos do formulário (evita "ghosts"/resquícios ao reabrir)
  const resetForm = () => {
    setName('');
    setGender('F');
    setBirth('');
    setCpf('');
    setPhone('');
    setEmail('');
    setInsurance('Particular');
    setAllergies('');
    setConditions('');
    setComplaint('');
  };

  const handleOpenModal = () => {
    resetForm();
    setNewModalOpen(true);
  };

  const handleCloseModal = () => {
    resetForm();
    setNewModalOpen(false);
  };

  // Filtragem
  const filteredPatients = useMemo(() => {
    return state.patients.filter((p) => {
      const matchQuery =
        !query.trim() ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.cpf.includes(query) ||
        p.phone.includes(query);

      const matchInsurance = filterInsurance === 'all' || p.insurance === filterInsurance;
      const matchTag = filterTag === 'all' || (p.tags && p.tags.includes(filterTag));

      return matchQuery && matchInsurance && matchTag;
    });
  }, [state.patients, query, filterInsurance, filterTag]);

  const handleCreatePatient = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast('Informe o nome do paciente.');
      return;
    }

    const newPatient = {
      id: uid('pt'),
      name: name.trim(),
      gender,
      birth: birth || '1995-01-01',
      cpf: cpf.trim() || '000.000.000-00',
      phone: phone.trim() || '(11) 90000-0000',
      email: email.trim() || `${name.toLowerCase().split(' ')[0]}@email.com`,
      insurance,
      address: 'São Paulo/SP',
      createdAt: todayISO(),
      color: colorFor(name),
      tags: [],
      anamnesis: {
        allergies: allergies.trim() || 'Nenhuma',
        conditions: conditions.trim() || 'Nenhuma',
        medications: 'Nenhum',
        smoker: false,
        pregnant: false,
        bleeding: false,
        complaint: complaint.trim() || 'Avaliação clínica inicial',
        updatedAt: todayISO(),
      },
    };

    dispatch({ type: 'ADD_PATIENT', patient: newPatient });
    resetForm();
    setNewModalOpen(false);
    toast(`Paciente ${newPatient.name} cadastrado com sucesso!`);
    navigate(`/pacientes/${newPatient.id}`);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Base de Pacientes & Prontuários</h1>
          <p>
            {state.patients.length} pacientes cadastrados na clínica. Histórico clínico, anamnese e odontograma centralizados.
          </p>
        </div>

        <div className="actions">
          <button
            className="btn btn-primary"
            onClick={handleOpenModal}
            id="btn-open-new-patient-modal"
          >
            <Plus size={16} />
            Cadastrar Novo Paciente
          </button>
        </div>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="card row between wrap mb" style={{ padding: '14px 18px' }}>
        <div className="row wrap grow" style={{ maxWidth: 700 }}>
          <div className="search grow" style={{ maxWidth: 360 }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Filtrar por nome, CPF ou telefone..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              id="patients-search-input"
            />
          </div>

          <select
            className="select"
            style={{ width: 170 }}
            value={filterInsurance}
            onChange={(e) => setFilterInsurance(e.target.value)}
          >
            <option value="all">Todos os Convênios</option>
            <option value="Particular">Particular</option>
            <option value="OdontoPrev">OdontoPrev</option>
            <option value="Amil Dental">Amil Dental</option>
            <option value="SulAmérica Odonto">SulAmérica</option>
            <option value="Bradesco Dental">Bradesco Dental</option>
          </select>

          <div className="seg">
            <button
              className={filterTag === 'all' ? 'on' : ''}
              onClick={() => setFilterTag('all')}
            >
              Todos
            </button>
            <button
              className={filterTag === 'VIP' ? 'on' : ''}
              onClick={() => setFilterTag('VIP')}
            >
              VIP
            </button>
            <button
              className={filterTag === 'Ortodontia' ? 'on' : ''}
              onClick={() => setFilterTag('Ortodontia')}
            >
              Orto
            </button>
          </div>
        </div>

        <span className="small muted">
          Mostrando <b>{filteredPatients.length}</b> pacientes
        </span>
      </div>

      {/* Tabela de Pacientes */}
      <div className="card table-wrap" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Contato</th>
              <th>Convênio</th>
              <th>Idade / Nascimento</th>
              <th>Alertas Clínicos</th>
              <th style={{ textAlign: 'right' }}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty">
                  Nenhum paciente encontrado com esses filtros.
                </td>
              </tr>
            ) : (
              filteredPatients.map((pt) => {
                const hasAllergy =
                  pt.anamnesis?.allergies && pt.anamnesis.allergies !== 'Nenhuma';
                const hasCondition =
                  pt.anamnesis?.conditions && pt.anamnesis.conditions !== 'Nenhuma';

                return (
                  <tr
                    key={pt.id}
                    className="clickable"
                    onClick={() => navigate(`/pacientes/${pt.id}`)}
                  >
                    <td>
                      <div className="row">
                        <div className="avatar" style={{ background: pt.color }}>
                          {pt.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <b style={{ fontSize: 13.5 }}>{pt.name}</b>
                          {pt.tags?.length > 0 && (
                            <span
                              className="badge b-violet small"
                              style={{ marginLeft: 6, padding: '1px 6px', fontSize: 10 }}
                            >
                              {pt.tags[0]}
                            </span>
                          )}
                          <div className="small faint">CPF: {pt.cpf}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="small">
                        <div className="row" style={{ gap: 4 }}>
                          <Phone size={12} color="var(--brand)" />
                          <span>{pt.phone}</span>
                        </div>
                        <div className="faint">{pt.email}</div>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`badge small ${
                          pt.insurance === 'Particular' ? 'b-brand' : 'b-info'
                        }`}
                      >
                        {pt.insurance}
                      </span>
                    </td>

                    <td>
                      <div className="small">
                        <b>{age(pt.birth)} anos</b>
                        <div className="faint">{fmtDate(pt.birth)}</div>
                      </div>
                    </td>

                    <td>
                      {hasAllergy || hasCondition ? (
                        <div className="row wrap" style={{ gap: 4 }}>
                          {hasAllergy && (
                            <span className="badge b-danger small" title="Alergia grave">
                              <ShieldAlert size={12} />
                              {pt.anamnesis.allergies}
                            </span>
                          )}
                          {hasCondition && (
                            <span className="badge b-warn small">
                              <HeartPulse size={12} />
                              {pt.anamnesis.conditions}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="small faint">Sem restrições</span>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/pacientes/${pt.id}`);
                        }}
                      >
                        Prontuário <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Cadastro de Paciente */}
      {newModalOpen && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal wide" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreatePatient}>
              <div className="modal-head">
                <h3>Cadastrar Novo Paciente</h3>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={handleCloseModal}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="modal-body">
                <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--brand)', letterSpacing: '0.08em' }}>
                  1. Dados Pessoais & Contato
                </h4>

                <div className="grid g-2">
                  <div className="field">
                    <label>Nome Completo:</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Ex: Beatriz Lima e Silva"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid g-2">
                    <div className="field">
                      <label>Gênero:</label>
                      <select
                        className="select"
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                      >
                        <option value="F">Feminino</option>
                        <option value="M">Masculino</option>
                        <option value="O">Outro</option>
                      </select>
                    </div>

                    <div className="field">
                      <label>Data de Nascimento:</label>
                      <input
                        type="date"
                        className="input"
                        value={birth}
                        onChange={(e) => setBirth(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid g-3">
                  <div className="field">
                    <label>CPF:</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => setCpf(formatCpf(e.target.value))}
                      maxLength={14}
                    />
                  </div>

                  <div className="field">
                    <label>WhatsApp / Celular:</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="(00) 00000-0000"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      maxLength={15}
                      required
                    />
                  </div>

                  <div className="field">
                    <label>Convênio / Plano:</label>
                    <select
                      className="select"
                      value={insurance}
                      onChange={(e) => setInsurance(e.target.value)}
                    >
                      <option value="Particular">Particular</option>
                      <option value="OdontoPrev">OdontoPrev</option>
                      <option value="Amil Dental">Amil Dental</option>
                      <option value="SulAmérica Odonto">SulAmérica Odonto</option>
                      <option value="Bradesco Dental">Bradesco Dental</option>
                    </select>
                  </div>
                </div>

                <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--brand)', letterSpacing: '0.08em', marginTop: 10 }}>
                  2. Anamnese Inicial & Alertas Médicos
                </h4>

                <div className="grid g-2">
                  <div className="field">
                    <label>Alergias a Medicamentos / Materiais:</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Ex: Penicilina, Dipirona, Látex (ou Nenhuma)"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label>Condições Sistêmicas (Hipertensão, Diabetes, etc.):</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Ex: Hipertensão, Diabetes ou Nenhuma"
                      value={conditions}
                      onChange={(e) => setConditions(e.target.value)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label>Queixa Principal / Motivo da Consulta:</label>
                  <textarea
                    className="textarea"
                    placeholder="Descreva a queixa trazida pelo paciente..."
                    value={complaint}
                    onChange={(e) => setComplaint(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-foot">
                <button
                  type="button"
                  className="btn"
                  onClick={handleCloseModal}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" id="btn-save-patient">
                  Cadastrar e Abrir Prontuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
