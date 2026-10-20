import React, { useMemo, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, KeyboardSensor, closestCorners,
  useSensor, useSensors, useDroppable,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Phone, Search, X, Trash2, UserPlus, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { BRL, todayISO, uid, colorFor, initials } from '../lib/utils';

export const STAGES = [
  { id: 'novo', label: 'Novo lead', color: 'var(--info)' },
  { id: 'contato', label: 'Contato feito', color: 'var(--brand)' },
  { id: 'avaliacao', label: 'Avaliação agendada', color: 'var(--warn)' },
  { id: 'orcamento', label: 'Orçamento enviado', color: '#a78bfa' },
  { id: 'ganho', label: 'Fechado (ganho)', color: 'var(--ok)' },
  { id: 'perdido', label: 'Perdido', color: 'var(--danger)' },
];
export const SOURCES = ['Instagram', 'Meta Ads', 'WhatsApp', 'Indicação', 'Site', 'Outro'];

const daysSince = (iso) => {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso + 'T12:00:00').getTime()) / 86400000));
};

function LeadCard({ lead, onOpen, overlay }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id, data: { type: 'lead', stage: lead.stage } });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging && !overlay ? 0.35 : 1 };
  const d = daysSince(lead.stageChangedAt);
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={`lead-card ${overlay ? 'overlay' : ''}`} onClick={() => onOpen?.(lead)}>
      <div className="lead-top">
        <span className="lead-avatar" style={{ background: colorFor(lead.name) }}>{initials(lead.name)}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="lead-name">{lead.name}</div>
          {lead.interest && <div className="lead-interest">{lead.interest}</div>}
        </div>
      </div>
      {lead.phone && <div className="lead-meta"><Phone size={12} /> {lead.phone}</div>}
      <div className="lead-foot">
        <span className="lead-source">{lead.source}</span>
        {lead.value > 0 && <strong className="lead-value">{BRL(lead.value)}</strong>}
      </div>
      <div className="lead-foot">
        <span className="lead-meta"><Clock size={12} /> {d === 0 ? 'hoje' : `${d}d na etapa`}</span>
        {(lead.tags || []).slice(0, 2).map((t) => <span key={t} className="lead-tag">{t}</span>)}
      </div>
    </div>
  );
}

function Column({ stage, leads, onOpen, onAdd }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${stage.id}`, data: { type: 'column', stage: stage.id } });
  const total = leads.reduce((s, l) => s + (Number(l.value) || 0), 0);
  return (
    <div className={`kanban-col ${isOver ? 'over' : ''}`}>
      <div className="kanban-col-head" style={{ borderTopColor: stage.color }}>
        <div>
          <strong>{stage.label}</strong> <span className="kanban-count">{leads.length}</span>
          <div className="kanban-sum">{BRL(total)}</div>
        </div>
        <button className="btn btn-sm" onClick={() => onAdd(stage.id)} aria-label={`Adicionar lead em ${stage.label}`}><Plus size={14} /></button>
      </div>
      <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="kanban-list">
          {leads.map((l) => <LeadCard key={l.id} lead={l} onOpen={onOpen} />)}
          {leads.length === 0 && <div className="kanban-empty">Arraste leads para cá</div>}
        </div>
      </SortableContext>
    </div>
  );
}

const emptyLead = (stage = 'novo') => ({ name: '', phone: '', email: '', source: 'Instagram', interest: '', value: '', tags: '', notes: '', campaignId: '', stage });

export default function Pipeline() {
  const { state, dispatch, toast } = useApp();
  const navigate = useNavigate();
  const leads = state.leads || [];
  const [q, setQ] = useState('');
  const [src, setSrc] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [editing, setEditing] = useState(null); // {id?, ...form}

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const visible = useMemo(() => leads.filter((l) =>
    (!src || l.source === src) &&
    (!q || `${l.name} ${l.phone} ${l.interest}`.toLowerCase().includes(q.toLowerCase()))
  ), [leads, q, src]);

  const byStage = (id) => visible.filter((l) => l.stage === id);
  const active = leads.find((l) => l.id === activeId);

  const handleDragEnd = ({ active: a, over }) => {
    setActiveId(null);
    if (!over) return;
    const moving = leads.find((l) => l.id === a.id);
    if (!moving) return;
    const targetStage = over.data.current?.type === 'column' ? over.data.current.stage : leads.find((l) => l.id === over.id)?.stage;
    if (!targetStage) return;
    let list = leads.map((l) => (l.id === moving.id && l.stage !== targetStage ? { ...l, stage: targetStage, stageChangedAt: todayISO() } : l));
    if (over.data.current?.type !== 'column' && over.id !== a.id) {
      const from = list.findIndex((l) => l.id === a.id);
      const to = list.findIndex((l) => l.id === over.id);
      list = arrayMove(list, from, to);
    }
    dispatch({ type: 'MOVE_LEAD', leads: list });
  };

  const save = () => {
    const f = editing;
    if (!f.name.trim()) return toast('Informe o nome do lead.');
    const data = {
      name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim(), source: f.source, interest: f.interest.trim(),
      value: Number(String(f.value).replace(',', '.')) || 0, notes: f.notes, campaignId: f.campaignId.trim(),
      tags: String(f.tags).split(',').map((t) => t.trim()).filter(Boolean),
    };
    if (f.id) {
      const prev = leads.find((l) => l.id === f.id);
      dispatch({ type: 'UPDATE_LEAD', id: f.id, patch: { ...data, stage: f.stage, stageChangedAt: prev.stage !== f.stage ? todayISO() : prev.stageChangedAt } });
      toast('Lead atualizado.');
    } else {
      dispatch({ type: 'ADD_LEAD', lead: { id: uid('ld'), ...data, stage: f.stage, createdAt: todayISO(), stageChangedAt: todayISO() } });
      toast('Lead criado.');
    }
    setEditing(null);
  };

  const convert = () => {
    const f = editing;
    const lead = leads.find((l) => l.id === f.id);
    if (!lead) return;
    if (lead.patientId) { navigate(`/pacientes/${lead.patientId}`); return; }
    const patient = {
      id: uid('pt'), name: lead.name, gender: 'F', birth: '', cpf: '', phone: lead.phone, email: lead.email,
      insurance: 'Particular', address: '', createdAt: todayISO(), color: colorFor(lead.name), tags: ['Origem: ' + lead.source],
      anamnesis: { allergies: 'Nenhuma', conditions: 'Nenhuma', medications: 'Nenhum', smoker: false, pregnant: false, bleeding: false, complaint: lead.interest || 'Avaliação clínica inicial', updatedAt: todayISO() },
    };
    dispatch({ type: 'CONVERT_LEAD', id: lead.id, patient });
    toast(`${lead.name} agora é paciente.`);
    setEditing(null);
    navigate(`/pacientes/${patient.id}`);
  };

  const open = (l) => setEditing({ ...emptyLead(), ...l, value: l.value || '', tags: (l.tags || []).join(', ') });
  const set = (k) => (e) => setEditing((s) => ({ ...s, [k]: e.target.value }));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Pipeline de Leads</h1>
          <p>Acompanhe contatos até virarem pacientes. Integração com Meta Ads e WhatsApp em breve.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing(emptyLead())}><Plus size={16} /> Novo lead</button>
      </div>

      <div className="pipeline-filters">
        <div className="pipeline-search"><Search size={15} /><input className="input" placeholder="Buscar por nome, telefone ou interesse" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="input" value={src} onChange={(e) => setSrc(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="">Todas as origens</option>
          {SOURCES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e) => setActiveId(e.active.id)} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
        <div className="kanban">
          {STAGES.map((s) => <Column key={s.id} stage={s} leads={byStage(s.id)} onOpen={open} onAdd={(id) => setEditing(emptyLead(id))} />)}
        </div>
        <DragOverlay>{active ? <LeadCard lead={active} overlay /> : null}</DragOverlay>
      </DndContext>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{editing.id ? 'Editar lead' : 'Novo lead'}</h3>
              <button className="btn btn-sm" onClick={() => setEditing(null)} aria-label="Fechar"><X size={16} /></button>
            </div>
            <div className="modal-body lead-form">
              <div className="field"><label>Nome *</label><input className="input" value={editing.name} onChange={set('name')} autoFocus /></div>
              <div className="field"><label>Telefone / WhatsApp</label><input className="input" value={editing.phone} onChange={set('phone')} /></div>
              <div className="field"><label>Email</label><input className="input" value={editing.email} onChange={set('email')} /></div>
              <div className="field"><label>Origem</label><select className="input" value={editing.source} onChange={set('source')}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select></div>
              <div className="field"><label>Interesse</label><input className="input" placeholder="Ex.: implante, ortodontia" value={editing.interest} onChange={set('interest')} /></div>
              <div className="field"><label>Valor estimado (R$)</label><input className="input" inputMode="decimal" value={editing.value} onChange={set('value')} /></div>
              <div className="field"><label>Etapa</label><select className="input" value={editing.stage} onChange={set('stage')}>{STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
              <div className="field"><label>Etiquetas (separe por vírgula)</label><input className="input" value={editing.tags} onChange={set('tags')} /></div>
              {editing.source === 'Meta Ads' && <div className="field"><label>ID da campanha</label><input className="input" value={editing.campaignId} onChange={set('campaignId')} /></div>}
              <div className="field" style={{ gridColumn: '1 / -1' }}><label>Observações</label><textarea className="input" rows={3} value={editing.notes} onChange={set('notes')} /></div>
            </div>
            <div className="modal-foot" style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap', padding: '0 20px 20px' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {editing.id && <button className="btn" onClick={() => { dispatch({ type: 'DELETE_LEAD', id: editing.id }); setEditing(null); toast('Lead removido.'); }}><Trash2 size={15} /> Excluir</button>}
                {editing.id && <button className="btn" onClick={convert}><UserPlus size={15} /> {leads.find((l) => l.id === editing.id)?.patientId ? 'Ver paciente' : 'Converter em paciente'}</button>}
              </div>
              <button className="btn btn-primary" onClick={save}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
