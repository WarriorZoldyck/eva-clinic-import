import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { BRL, fmtDate, todayISO } from '../lib/utils';
import {
  Sparkles,
  Send,
  Bot,
  User,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Calendar,
  DollarSign,
  Boxes,
  Users,
  MessageCircle,
} from 'lucide-react';

export default function AssistantEVA() {
  const { state, toast } = useApp();
  const navigate = useNavigate();
  const logEndRef = useRef(null);

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: 'Olá, Dra. Eva! Sou a **EVA**, a inteligência clínica e de gestão da clínica. Analisei os prontuários, a agenda das 4 cadeiras e o fluxo de caixa de hoje. Como posso te apoiar agora?',
      time: 'Agora',
      suggestions: [
        'Quais pacientes faltaram e precisam de recall?',
        'Quais materiais de estoque precisam de reposição urgente?',
        'Como está o faturamento deste mês comparado à meta?',
        'Quais orçamentos estão aguardando aprovação?',
      ],
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Motor de Inteligência Baseado nos Dados Reais da Aplicação
  const processQuery = (query) => {
    const q = query.toLowerCase();

    // 1. Faltas e Recall
    if (q.includes('falta') || q.includes('recall') || q.includes('retorno')) {
      const misses = state.appointments.filter((a) => a.status === 'faltou');
      const uniquePatients = Array.from(new Set(misses.map((a) => a.patientId)))
        .map((id) => state.patients.find((p) => p.id === id))
        .filter(Boolean);

      return {
        text: `Identifiquei **${misses.length} faltas** recentes registradas no sistema. Recomendo o recall ativo destes pacientes via WhatsApp para recuperação de agenda:
\n${uniquePatients
          .slice(0, 4)
          .map(
            (p) =>
              `• **${p.name}** (${p.phone}) — Última falta registrada no histórico.`
          )
          .join('\n')}
\n*Dica da EVA:* Clínicas que acionam pacientes faltosos em até 48 horas recuperam 64% dos horários ociosos.`,
        action: {
          label: 'Disparar Mensagens de Recall WhatsApp',
          run: () => toast('Mensagens automáticas de recall enviadas para a fila do WhatsApp!'),
        },
      };
    }

    // 2. Estoque e Materiais
    if (q.includes('estoque') || q.includes('materiais') || q.includes('repor') || q.includes('reposi')) {
      const low = state.inventory.filter((i) => i.qty <= i.min);
      if (low.length === 0) {
        return {
          text: 'Excelente notícia! Todos os insumos do consultório estão acima do estoque mínimo de segurança.',
        };
      }
      return {
        text: `Atenção: Encontrei **${low.length} itens** abaixo do estoque mínimo que necessitam de pedido aos distribuidores:
\n${low
          .map(
            (i) =>
              `• **${i.name}**: saldo atual de ${i.qty} ${i.unit}s (mínimo exigido: ${i.min} ${i.unit}s) — Fornecedor: *${i.supplier}*`
          )
          .join('\n')}
\nO consumo desses itens foi registrado automaticamente pela realização de restaurações e cirurgias no prontuário.`,
        action: {
          label: 'Ir para Módulo de Estoque',
          run: () => navigate('/estoque'),
        },
      };
    }

    // 3. Faturamento e Metas
    if (q.includes('faturamento') || q.includes('meta') || q.includes('financeiro') || q.includes('receita')) {
      const thisMonth = todayISO().slice(0, 7);
      const totalRev = state.transactions
        .filter((t) => t.type === 'receita' && t.date.startsWith(thisMonth) && t.status === 'pago')
        .reduce((s, t) => s + t.amount, 0);

      const pending = state.transactions
        .filter((t) => t.type === 'receita' && t.status === 'pendente')
        .reduce((s, t) => s + t.amount, 0);

      return {
        text: `Aqui está o diagnóstico financeiro deste mês:
\n• **Receita Realizada (Paga):** ${BRL(totalRev)}
• **Previsão a Receber (Parcelas):** ${BRL(pending)}
• **Meta Mensal Sugerida:** R$ 60.000,00 (${Math.min(100, Math.round((totalRev / 60000) * 100))}% atingido)
\nO ticket médio por procedimento concluído está em **R$ 380,00**, com maior rentabilidade em *Implantodontia* e *Dentística Estética*.`,
        action: {
          label: 'Abrir Fluxo Financeiro',
          run: () => navigate('/financeiro'),
        },
      };
    }

    // 4. Orçamentos e Planos
    if (q.includes('orçamento') || q.includes('plano') || q.includes('aprova')) {
      const pendingPlans = state.plans.filter((p) => p.status === 'aguardando');
      const totalPending = pendingPlans.reduce(
        (s, p) => s + p.items.reduce((sum, i) => sum + i.price, 0) * (1 - (p.discount || 0) / 100),
        0
      );

      return {
        text: `Temos **${pendingPlans.length} orçamentos aguardando aprovação**, totalizando **${BRL(
          totalPending
        )}** em tratamentos planejados:
\n${pendingPlans
          .map((p) => {
            const pt = state.patients.find((pat) => pat.id === p.patientId);
            return `• **${pt?.name || 'Paciente'}**: ${p.title} (${BRL(
              p.items.reduce((s, i) => s + i.price, 0)
            )})`;
          })
          .join('\n')}
\n*Sugestão:* Enviar condição facilitada em até 6x sem juros para os orçamentos acima de R$ 1.500,00 costuma elevar a taxa de conversão em 40%.`,
        action: {
          label: 'Ver Planos de Tratamento',
          run: () => navigate('/tratamentos'),
        },
      };
    }

    // Resposta Padrão
    return {
      text: `Entendido! Como inteligência Eva Clinic, posso correlacionar dados do **Odontograma 2D/3D**, agendamentos de cadeiras, comissões médicas e estoque em tempo real. Você pode me perguntar sobre:
\n1. Pacientes faltosos para ações de retorno.
2. Insumos em falta ou regras de consumo automático.
3. Previsão de comissão por cirurgião-dentista.
4. Desempenho e ociosidade das cadeiras clínicas.`,
    };
  };

  const handleSend = (textToSend) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    const userMsg = { role: 'user', text, time: 'Agora' };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const response = processQuery(text);
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: response.text,
          time: 'Agora',
          action: response.action,
        },
      ]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Assistente Inteligente EVA</h1>
          <p>
            Inteligência analítica dedicada à gestão clínica odontológica, automações e rentabilidade.
          </p>
        </div>
      </div>

      <div className="card chat" style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Histórico do Chat */}
        <div className="chat-log">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`msg ${m.role}`}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                className="row small mb"
                style={{
                  marginBottom: 6,
                  color: m.role === 'user' ? '#061018' : 'var(--text-3)',
                }}
              >
                {m.role === 'bot' ? (
                  <>
                    <Sparkles size={14} color="var(--brand)" />
                    <b>EVA Clinic AI</b>
                  </>
                ) : (
                  <>
                    <User size={14} />
                    <b>Você</b>
                  </>
                )}
              </div>

              <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>{m.text}</div>

              {/* Botão de Ação Sugerida */}
              {m.action && (
                <div className="mt">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={m.action.run}
                    style={{
                      background: 'var(--brand-grad)',
                      color: '#061018',
                      fontWeight: 700,
                    }}
                  >
                    <CheckCircle size={14} /> {m.action.label}
                  </button>
                </div>
              )}

              {/* Sugestões de Perguntas Rápidas */}
              {m.suggestions && (
                <div className="chips mt">
                  {m.suggestions.map((s, sIdx) => (
                    <button
                      key={sIdx}
                      className="chip"
                      onClick={() => handleSend(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="msg bot typing">
              <Sparkles size={14} color="var(--brand)" /> Analisando prontuários e agenda...
              <span />
              <span />
              <span />
            </div>
          )}

          <div ref={logEndRef} />
        </div>

        {/* Campo de Entrada */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="row pt"
          style={{
            borderTop: '1px solid var(--border)',
            paddingTop: 14,
            gap: 10,
          }}
        >
          <input
            type="text"
            className="input grow"
            placeholder="Pergunte à EVA sobre pacientes, faturamento, agenda ou estoque..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            id="eva-input"
          />
          <button type="submit" className="btn btn-primary" id="btn-eva-send">
            <Send size={16} /> Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
