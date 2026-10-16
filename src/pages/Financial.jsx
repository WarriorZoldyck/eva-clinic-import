import React, { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { BRL, fmtDate, todayISO, uid } from '../lib/utils';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle,
  Plus,
  Filter,
  UserCheck,
  CreditCard,
  PieChart as PieIcon,
  X,
} from 'lucide-react';

export default function Financial() {
  const { state, dispatch, toast } = useApp();
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' | 'commissions'
  const [filterType, setFilterType] = useState('all'); // 'all' | 'receita' | 'despesa'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'pago' | 'pendente'
  const [newTxModal, setNewTxModal] = useState(false);

  // Form de nova transação
  const [txType, setTxType] = useState('receita');
  const [txDesc, setTxDesc] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState('Procedimentos');
  const [txMethod, setTxMethod] = useState('Pix');
  const [txDate, setTxDate] = useState(todayISO());

  // Cálculos consolidados
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    let pendingIncome = 0;
    let pendingExpense = 0;

    state.transactions.forEach((t) => {
      if (t.type === 'receita') {
        if (t.status === 'pago') income += t.amount;
        else pendingIncome += t.amount;
      } else {
        if (t.status === 'pago') expense += t.amount;
        else pendingExpense += t.amount;
      }
    });

    return {
      income,
      expense,
      balance: income - expense,
      pendingIncome,
      pendingExpense,
    };
  }, [state.transactions]);

  // Cálculo de Comissões por Dentista
  const commissions = useMemo(() => {
    return state.professionals.map((prof) => {
      // Procedimentos realizados nos planos vinculados a esse dentista
      let gross = 0;
      state.plans
        .filter((p) => p.professionalId === prof.id)
        .forEach((plan) => {
          plan.items
            .filter((i) => i.status === 'realizado')
            .forEach((it) => {
              gross += it.price * (1 - (plan.discount || 0) / 100);
            });
        });

      const netCommission = gross * prof.commission;
      return {
        ...prof,
        gross,
        netCommission,
      };
    });
  }, [state.professionals, state.plans]);

  // Transações filtradas
  const filteredTx = useMemo(() => {
    return state.transactions.filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      return true;
    });
  }, [state.transactions, filterType, filterStatus]);

  const handleCreateTx = (e) => {
    e.preventDefault();
    if (!txDesc.trim() || !txAmount) {
      toast('Preencha a descrição e o valor.');
      return;
    }

    const tx = {
      id: uid('tx'),
      type: txType,
      description: txDesc.trim(),
      category: txCategory,
      amount: parseFloat(txAmount),
      date: txDate,
      dueDate: txDate,
      status: 'pago',
      method: txMethod,
    };

    dispatch({ type: 'ADD_TX', tx });
    setNewTxModal(false);
    setTxDesc('');
    setTxAmount('');
    toast('Lançamento financeiro registrado com sucesso!');
  };

  const handlePay = (txId) => {
    dispatch({ type: 'PAY_TX', id: txId });
    toast('Baixa efetuada com sucesso!');
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Gestão Financeira & Comissões</h1>
          <p>
            Controle de fluxo de caixa, conciliação de parcelas e repasse automático de profissionais.
          </p>
        </div>

        <div className="actions">
          <button className="btn btn-primary" onClick={() => setNewTxModal(true)} id="btn-new-tx">
            <Plus size={16} /> Novo Lançamento
          </button>
        </div>
      </div>

      {/* Cards de Resumo Financeiro */}
      <div className="grid g-4 mb">
        <div className="card kpi" style={{ '--glow': '#2ee6c5' }}>
          <span className="small faint" style={{ fontWeight: 700, textTransform: 'uppercase' }}>
            Receitas Pagas
          </span>
          <div className="kpi-value" style={{ color: 'var(--brand)' }}>
            {BRL(totals.income)}
          </div>
          <span className="small faint mt display-block">
            A receber previsto: {BRL(totals.pendingIncome)}
          </span>
        </div>

        <div className="card kpi" style={{ '--glow': '#fb7185' }}>
          <span className="small faint" style={{ fontWeight: 700, textTransform: 'uppercase' }}>
            Despesas Pagas
          </span>
          <div className="kpi-value" style={{ color: 'var(--danger)' }}>
            {BRL(totals.expense)}
          </div>
          <span className="small faint mt display-block">
            Contas a pagar: {BRL(totals.pendingExpense)}
          </span>
        </div>

        <div className="card kpi" style={{ '--glow': '#34d399' }}>
          <span className="small faint" style={{ fontWeight: 700, textTransform: 'uppercase' }}>
            Saldo Operacional Líquido
          </span>
          <div className="kpi-value">{BRL(totals.balance)}</div>
          <span className="badge b-ok small mt">Fluxo Positivo</span>
        </div>

        <div className="card kpi" style={{ '--glow': '#7c5cff' }}>
          <span className="small faint" style={{ fontWeight: 700, textTransform: 'uppercase' }}>
            Comissões Previstas
          </span>
          <div className="kpi-value">
            {BRL(commissions.reduce((s, c) => s + c.netCommission, 0))}
          </div>
          <span className="small faint mt display-block">4 cirurgiões-dentistas</span>
        </div>
      </div>

      {/* Abas: Lançamentos vs Comissões */}
      <div className="tabs mb">
        <button
          className={`tab ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          <DollarSign size={16} /> Extrato de Lançamentos
        </button>
        <button
          className={`tab ${activeTab === 'commissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('commissions')}
        >
          <UserCheck size={16} /> Fechamento de Comissões dos Dentistas
        </button>
      </div>

      {/* Aba 1: Lançamentos */}
      {activeTab === 'transactions' && (
        <div className="card">
          <div className="card-head">
            <div className="row wrap">
              <div className="seg">
                <button className={filterType === 'all' ? 'on' : ''} onClick={() => setFilterType('all')}>
                  Todos
                </button>
                <button className={filterType === 'receita' ? 'on' : ''} onClick={() => setFilterType('receita')}>
                  Receitas
                </button>
                <button className={filterType === 'despesa' ? 'on' : ''} onClick={() => setFilterType('despesa')}>
                  Despesas
                </button>
              </div>

              <div className="seg">
                <button className={filterStatus === 'all' ? 'on' : ''} onClick={() => setFilterStatus('all')}>
                  Todos Status
                </button>
                <button className={filterStatus === 'pago' ? 'on' : ''} onClick={() => setFilterStatus('pago')}>
                  Quitados
                </button>
                <button className={filterStatus === 'pendente' ? 'on' : ''} onClick={() => setFilterStatus('pendente')}>
                  Pendentes
                </button>
              </div>
            </div>

            <span className="small muted">
              <b>{filteredTx.length}</b> lançamentos listados
            </span>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Forma</th>
                  <th>Data / Vencimento</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {filteredTx.slice(0, 30).map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <span
                        className={`badge small ${tx.type === 'receita' ? 'b-ok' : 'b-danger'}`}
                      >
                        {tx.type === 'receita' ? '+ Receita' : '- Despesa'}
                      </span>
                    </td>
                    <td>
                      <b>{tx.description}</b>
                    </td>
                    <td className="small faint">{tx.category}</td>
                    <td className="small">{tx.method || 'Pix'}</td>
                    <td className="small mono">{fmtDate(tx.date || tx.dueDate)}</td>
                    <td>
                      <b
                        style={{
                          color: tx.type === 'receita' ? 'var(--brand)' : 'var(--danger)',
                        }}
                      >
                        {BRL(tx.amount)}
                      </b>
                    </td>
                    <td>
                      <span className={`badge small ${tx.status === 'pago' ? 'b-ok' : 'b-warn'}`}>
                        {tx.status === 'pago' ? 'Quitado' : 'Pendente'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {tx.status !== 'pago' ? (
                        <button className="btn btn-ok btn-xs" onClick={() => handlePay(tx.id)}>
                          Dar Baixa
                        </button>
                      ) : (
                        <span className="small faint">Confirmado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Aba 2: Comissões */}
      {activeTab === 'commissions' && (
        <div className="card">
          <div className="card-head">
            <div>
              <h3>
                <UserCheck size={18} color="var(--brand)" />
                Comissões & Repasses Odontológicos
              </h3>
              <span className="sub">
                Calculado com base na execução dos procedimentos dos planos de tratamento de cada profissional
              </span>
            </div>
            <button
              className="btn btn-sm"
              onClick={() => toast('Relatório de repasse exportado em PDF para os profissionais.')}
            >
              Exportar Relatório
            </button>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Cirurgião-Dentista</th>
                  <th>Especialidade</th>
                  <th>CRO</th>
                  <th>% Contratual</th>
                  <th>Produção Clínica Realizada</th>
                  <th>Repasse Líquido</th>
                  <th style={{ textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="row">
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: c.color,
                          }}
                        />
                        <b>{c.name}</b>
                      </div>
                    </td>
                    <td className="small">{c.specialty}</td>
                    <td className="small mono">{c.cro}</td>
                    <td>
                      <b>{(c.commission * 100).toFixed(0)}%</b>
                    </td>
                    <td>
                      <b>{BRL(c.gross)}</b>
                    </td>
                    <td>
                      <b style={{ color: 'var(--brand)', fontSize: 15 }}>
                        {BRL(c.netCommission)}
                      </b>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-primary btn-xs"
                        onClick={() =>
                          toast(`Comprovante de pagamento de repasse gerado para ${c.name}.`)
                        }
                      >
                        Pagar Repasse
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nova Transação */}
      {newTxModal && (
        <div className="modal-backdrop" onClick={() => setNewTxModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreateTx}>
              <div className="modal-head">
                <h3>Novo Lançamento Financeiro</h3>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => setNewTxModal(false)}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="modal-body">
                <div className="field">
                  <label>Tipo de Movimentação:</label>
                  <div className="seg" style={{ width: '100%' }}>
                    <button
                      type="button"
                      style={{ flex: 1 }}
                      className={txType === 'receita' ? 'on' : ''}
                      onClick={() => setTxType('receita')}
                    >
                      + Receita (Entrada)
                    </button>
                    <button
                      type="button"
                      style={{ flex: 1 }}
                      className={txType === 'despesa' ? 'on' : ''}
                      onClick={() => setTxType('despesa')}
                    >
                      - Despesa (Saída)
                    </button>
                  </div>
                </div>

                <div className="field">
                  <label>Descrição do Lançamento:</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: Pagamento de Prótese - Lab Arte Oral"
                    value={txDesc}
                    onChange={(e) => setTxDesc(e.target.value)}
                    required
                  />
                </div>

                <div className="grid g-2">
                  <div className="field">
                    <label>Valor (R$):</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      placeholder="0,00"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="field">
                    <label>Forma de Pagamento:</label>
                    <select
                      className="select"
                      value={txMethod}
                      onChange={(e) => setTxMethod(e.target.value)}
                    >
                      <option value="Pix">Pix</option>
                      <option value="Cartão de crédito">Cartão de Crédito</option>
                      <option value="Cartão de débito">Cartão de Débito</option>
                      <option value="Boleto">Boleto Bancário</option>
                      <option value="Dinheiro">Dinheiro</option>
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label>Categoria:</label>
                  <select
                    className="select"
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                  >
                    <option value="Procedimentos">Procedimentos Odontológicos</option>
                    <option value="Materiais">Materiais e Insumos</option>
                    <option value="Laboratório">Laboratório de Prótese</option>
                    <option value="Infraestrutura">Infraestrutura e Aluguel</option>
                    <option value="Pessoal">Pessoal / Folha</option>
                    <option value="Tecnologia">Software & Licenças</option>
                  </select>
                </div>
              </div>

              <div className="modal-foot">
                <button type="button" className="btn" onClick={() => setNewTxModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
