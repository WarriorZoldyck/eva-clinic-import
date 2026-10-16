import React, { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { BRL, uid } from '../lib/utils';
import {
  Boxes,
  AlertTriangle,
  Plus,
  Minus,
  Sparkles,
  Search,
  CheckCircle,
  Truck,
  ArrowDownRight,
  X,
  Layers,
} from 'lucide-react';

export default function Inventory() {
  const { state, dispatch, toast } = useApp();
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);

  // Form novo item
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Dentística');
  const [qty, setQty] = useState(10);
  const [min, setMin] = useState(5);
  const [unit, setUnit] = useState('unidade');
  const [cost, setCost] = useState(50);
  const [supplier, setSupplier] = useState('Dental Cremer');

  // Cálculos de estoque
  const stats = useMemo(() => {
    let totalValue = 0;
    let criticalCount = 0;
    const categories = new Set();

    state.inventory.forEach((i) => {
      totalValue += i.qty * i.cost;
      if (i.qty <= i.min) criticalCount++;
      categories.add(i.category);
    });

    return { totalValue, criticalCount, categories: Array.from(categories) };
  }, [state.inventory]);

  const filteredItems = useMemo(() => {
    return state.inventory.filter((i) => {
      const matchQ =
        !query.trim() ||
        i.name.toLowerCase().includes(query.toLowerCase()) ||
        i.supplier.toLowerCase().includes(query.toLowerCase());

      const matchCat = catFilter === 'all' || i.category === catFilter;
      return matchQ && matchCat;
    });
  }, [state.inventory, query, catFilter]);

  const handleAdjust = (id, delta) => {
    dispatch({ type: 'INV_ADJUST', id, delta });
    toast(delta > 0 ? 'Entrada no estoque adicionada.' : 'Baixa de material registrada.');
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const item = {
      id: uid('i'),
      name: name.trim(),
      category,
      qty: Number(qty),
      min: Number(min),
      unit,
      cost: Number(cost),
      supplier,
    };

    dispatch({ type: 'INV_ADD', item });
    setModalOpen(false);
    setName('');
    toast(`Item ${item.name} cadastrado no estoque!`);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Estoque de Materiais & Insumos Clínicos</h1>
          <p>
            Controle de consumo automatizado: a execução de procedimentos no prontuário dá baixa automática nos materiais utilizados.
          </p>
        </div>

        <div className="actions">
          <button className="btn btn-primary" onClick={() => setModalOpen(true)} id="btn-new-item">
            <Plus size={16} /> Novo Insumo
          </button>
        </div>
      </div>

      {/* Alerta de Automação Odontológica Integrada */}
      <div
        className="card row between wrap mb"
        style={{
          background: 'linear-gradient(135deg, rgba(46,230,197,0.1), rgba(124,92,255,0.15))',
          border: '1px solid rgba(46,230,197,0.3)',
          padding: '14px 20px',
        }}
      >
        <div className="row">
          <Sparkles size={20} color="var(--brand)" />
          <div>
            <b>Baixa Automática Vinculada ao Odontograma</b>
            <div className="small faint">
              Ao concluir uma restauração, profilaxia ou canal no prontuário, anestésicos, resinas e luvas são descontados sem digitação manual.
            </div>
          </div>
        </div>

        <button
          className="btn btn-sm btn-ghost"
          onClick={() => toast('Regras de consumo mapeadas para todos os 16 procedimentos do catálogo.')}
        >
          Ver Regras de Consumo
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid g-3 mb">
        <div className="card kpi" style={{ '--glow': '#fb7185' }}>
          <span className="small faint" style={{ fontWeight: 700, textTransform: 'uppercase' }}>
            Itens em Nível Crítico
          </span>
          <div className="kpi-value" style={{ color: stats.criticalCount > 0 ? 'var(--danger)' : 'var(--text)' }}>
            {stats.criticalCount}
          </div>
          <span className="small faint mt display-block">Abaixo do estoque mínimo configurado</span>
        </div>

        <div className="card kpi" style={{ '--glow': '#2ee6c5' }}>
          <span className="small faint" style={{ fontWeight: 700, textTransform: 'uppercase' }}>
            Patrimônio em Estoque
          </span>
          <div className="kpi-value">{BRL(stats.totalValue)}</div>
          <span className="small faint mt display-block">Custo total imobilizado</span>
        </div>

        <div className="card kpi" style={{ '--glow': '#7c5cff' }}>
          <span className="small faint" style={{ fontWeight: 700, textTransform: 'uppercase' }}>
            Total de Itens Cadastrados
          </span>
          <div className="kpi-value">{state.inventory.length}</div>
          <span className="small faint mt display-block">Distribuídos em {stats.categories.length} categorias</span>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="card row between wrap mb" style={{ padding: '12px 18px' }}>
        <div className="row wrap">
          <div className="search" style={{ width: 280 }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar insumo ou fornecedor..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <select
            className="select"
            style={{ width: 170 }}
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
          >
            <option value="all">Todas as Categorias</option>
            {stats.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <span className="small muted">
          Mostrando <b>{filteredItems.length}</b> insumos
        </span>
      </div>

      {/* Tabela de Insumos */}
      <div className="card table-wrap" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Material / Insumo</th>
              <th>Categoria</th>
              <th>Saldo em Estoque</th>
              <th>Nível vs Mínimo</th>
              <th>Custo Unit.</th>
              <th>Fornecedor</th>
              <th style={{ textAlign: 'right' }}>Ajuste Rápido</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => {
              const isLow = item.qty <= item.min;
              const pct = Math.min(100, Math.round((item.qty / (item.min * 2)) * 100));

              return (
                <tr key={item.id}>
                  <td>
                    <b>{item.name}</b>
                  </td>
                  <td>
                    <span className="badge small">{item.category}</span>
                  </td>
                  <td>
                    <b style={{ fontSize: 14, color: isLow ? 'var(--danger)' : 'var(--text)' }}>
                      {item.qty} {item.unit}s
                    </b>
                  </td>
                  <td style={{ minWidth: 140 }}>
                    <div className="row between small faint" style={{ marginBottom: 4 }}>
                      <span>Mínimo: {item.min}</span>
                      {isLow && (
                        <span className="badge b-danger small" style={{ padding: '1px 5px', fontSize: 10 }}>
                          Repor
                        </span>
                      )}
                    </div>
                    <div className="progress">
                      <div
                        style={{
                          width: `${pct}%`,
                          background: isLow ? 'var(--danger)' : 'var(--brand-grad)',
                        }}
                      />
                    </div>
                  </td>
                  <td className="small">{BRL(item.cost)}</td>
                  <td>
                    <span className="small faint">{item.supplier}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="row" style={{ justifyContent: 'flex-end', gap: 4 }}>
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => handleAdjust(item.id, -1)}
                        title="Registrar consumo (-1)"
                      >
                        <Minus size={13} />
                      </button>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => handleAdjust(item.id, 1)}
                        title="Adicionar entrada (+1)"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Novo Insumo */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreate}>
              <div className="modal-head">
                <h3>Cadastrar Novo Material Clínico</h3>
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => setModalOpen(false)}>
                  <X size={16} />
                </button>
              </div>

              <div className="modal-body">
                <div className="field">
                  <label>Nome do Material / Marca:</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: Resina Composta Empress Direct A1"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid g-2">
                  <div className="field">
                    <label>Categoria:</label>
                    <select
                      className="select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="Dentística">Dentística & Resinas</option>
                      <option value="Anestésicos">Anestésicos</option>
                      <option value="Endodontia">Endodontia</option>
                      <option value="Implantodontia">Implantodontia</option>
                      <option value="Cirurgia">Cirurgia & Sutura</option>
                      <option value="Prevenção">Prevenção & Profilaxia</option>
                      <option value="Descartáveis">Descartáveis / EPI</option>
                    </select>
                  </div>

                  <div className="field">
                    <label>Unidade de Medida:</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Ex: seringa, par, frasco, caixa"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid g-3">
                  <div className="field">
                    <label>Qtd Inicial:</label>
                    <input
                      type="number"
                      className="input"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label>Estoque Mínimo:</label>
                    <input
                      type="number"
                      className="input"
                      value={min}
                      onChange={(e) => setMin(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label>Custo Unit. (R$):</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label>Fornecedor Preferencial:</label>
                  <input
                    type="text"
                    className="input"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-foot">
                <button type="button" className="btn" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Salvar no Estoque
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
