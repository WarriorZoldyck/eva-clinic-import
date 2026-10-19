import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useApp } from '../store/AppContext';
import {
  Stethoscope,
  Lock,
  User,
  Mail,
  Phone,
  Building,
  Award,
  ArrowRight,
  Sparkles,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Search,
} from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const { register, verifyEvaSubscriber } = useAuth();
  const { toast } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [cro, setCro] = useState('CRO-SP ');
  const [phone, setPhone] = useState('(11) 9');

  const [isCheckingSub, setIsCheckingSub] = useState(false);
  const [subStatus, setSubStatus] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Estilo padrão para todos os inputs do formulário
  const inputStyle = {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    color: '#ffffff',
    borderRadius: 11,
    height: 42,
    fontSize: 13,
    paddingLeft: 38,
    width: '100%',
    outline: 'none',
    transition: 'all 0.2s ease',
  };

  const labelStyle = {
    fontSize: 12,
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: 6,
    display: 'block',
    letterSpacing: '0.01em',
  };

  // Verificação de assinatura Eva OS em tempo real
  const handleCheckSubscriber = async () => {
    if (!email || !email.includes('@')) {
      setError('Por favor, informe um e-mail válido para verificar a assinatura.');
      return;
    }

    setError('');
    setIsCheckingSub(true);
    setSubStatus(null);

    try {
      const res = await verifyEvaSubscriber(email);
      setIsCheckingSub(false);

      if (res.isSubscriber) {
        setSubStatus({
          verified: true,
          plan: res.plan || 'Eva OS',
          name: res.name || '',
          message: 'Assinatura ativa confirmada! Acesso gratuito liberado.',
        });
        if (res.name && !name) {
          setName(res.name);
        }
      } else {
        setSubStatus({
          verified: false,
          message:
            res.message ||
            'Não localizamos uma assinatura ativa no Eva OS para este e-mail. Para ter acesso liberado, certifique-se de que a assinatura no Eva OS está ativa.',
        });
      }
    } catch {
      setIsCheckingSub(false);
      setError('Erro ao verificar assinatura no momento. Tente novamente.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    if (password.length < 4) {
      setError('A senha deve ter no mínimo 4 caracteres.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await register({
        name,
        email,
        password,
        clinicName,
        cro,
        phone,
      });

      setIsLoading(false);

      if (res.success) {
        toast(`Bem-vindo(a) ao Eva Clinic, ${res.user.name}! Seu espaço exclusivo está pronto.`);
        navigate('/');
      } else {
        setError(res.error || 'Não foi possível concluir o cadastro.');
      }
    } catch {
      setIsLoading(false);
      setError('Ocorreu um erro ao criar a conta. Tente novamente.');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '32px 20px',
        position: 'relative',
        background: 'radial-gradient(ellipse at 50% 20%, #111a38 0%, #070b16 75%)',
      }}
    >
      {/* Luzes de Fundo Estilo Estúdio */}
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'rgba(46, 230, 197, 0.1)',
          filter: 'blur(100px)',
          top: '5%',
          left: '15%',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'rgba(124, 92, 255, 0.14)',
          filter: 'blur(100px)',
          bottom: '5%',
          right: '15%',
          pointerEvents: 'none',
        }}
      />

      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 580,
          padding: 36,
          background: 'rgba(15, 21, 40, 0.88)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 35px rgba(124, 92, 255, 0.18)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Cabeçalho */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              background: 'var(--brand-grad)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 14px',
              boxShadow: '0 8px 25px rgba(46, 230, 197, 0.35)',
            }}
          >
            <Stethoscope size={28} color="#0d1117" strokeWidth={2.4} />
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            Ativar Conta no Eva Clinic
          </h2>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
            Incluso gratuitamente para todos os assinantes ativos do ecossistema Eva OS
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.18)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#fca5a5',
              fontSize: 13,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <AlertCircle size={18} color="#f87171" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Validação de E-mail do Assinante Eva OS */}
          <div>
            <label style={labelStyle}>
              E-mail da sua Conta Eva OS <span style={{ color: '#2ee6c5' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Mail
                  size={16}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setSubStatus(null);
                  }}
                  placeholder="ex: seuemail@dominio.com"
                  style={inputStyle}
                  required
                />
              </div>
              <button
                type="button"
                onClick={handleCheckSubscriber}
                disabled={isCheckingSub || !email}
                className="btn btn-secondary"
                style={{
                  fontSize: 12,
                  padding: '8px 16px',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                }}
              >
                {isCheckingSub ? <span className="spin">⏳</span> : <Search size={14} color="#2ee6c5" />}
                Verificar Assinatura
              </button>
            </div>

            {/* Status da checagem */}
            {subStatus?.verified && (
              <div
                style={{
                  marginTop: 10,
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(46, 230, 197, 0.15)',
                  border: '1px solid rgba(46, 230, 197, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 13,
                  color: '#2ee6c5',
                }}
              >
                <CheckCircle size={18} color="#2ee6c5" />
                <span>
                  <strong>Assinante Eva OS Confirmado!</strong> Acesso completo ao Eva Clinic liberado.
                </span>
              </div>
            )}

            {subStatus && !subStatus.verified && (
              <div
                style={{
                  marginTop: 10,
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 12,
                  color: '#fca5a5',
                }}
              >
                <AlertCircle size={18} color="#f87171" />
                <span>{subStatus.message}</span>
              </div>
            )}
          </div>

          {/* Nome e Clínica */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>
                Nome do Cirurgião-Dentista <span style={{ color: '#2ee6c5' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={16}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Dr. Lucas Silva"
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>
                Nome da Clínica <span style={{ color: '#2ee6c5' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Building
                  size={16}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  placeholder="ex: Clínica Sorriso & Arte"
                  style={inputStyle}
                  required
                />
              </div>
            </div>
          </div>

          {/* CRO e Telefone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>
                Registro Profissional (CRO)
              </label>
              <div style={{ position: 'relative' }}>
                <Award
                  size={16}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  value={cro}
                  onChange={(e) => setCro(e.target.value)}
                  placeholder="ex: CRO-SP 123.456"
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>
                WhatsApp / Telefone da Clínica
              </label>
              <div style={{ position: 'relative' }}>
                <Phone
                  size={16}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Senha e Confirmação de Senha EXCLUSIVA do Eva Clinic */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>
                Crie sua Senha do Eva Clinic <span style={{ color: '#2ee6c5' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>
                Confirmar Senha <span style={{ color: '#2ee6c5' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  style={inputStyle}
                  required
                />
              </div>
            </div>
          </div>

          {/* Informação sobre o espaço zerado - Alta Legibilidade e Destaque Visual */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 12,
              background: 'rgba(46, 230, 197, 0.09)',
              border: '1px solid rgba(46, 230, 197, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
              marginTop: 4,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(46, 230, 197, 0.18)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <Sparkles size={20} color="#2ee6c5" />
            </div>
            <div style={{ fontSize: 13, color: '#f1f5f9', lineHeight: 1.45 }}>
              Sua conta iniciará com uma clínica <strong style={{ color: '#2ee6c5', fontWeight: 700 }}>100% limpa e zerada</strong>, pronta para cadastrar seus pacientes e atendimentos reais.
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '13px 20px',
              fontSize: 14,
              fontWeight: 700,
              marginTop: 8,
              background: 'linear-gradient(135deg, #2ee6c5 0%, #7c5cff 100%)',
              color: '#070b16',
              border: 'none',
              boxShadow: '0 6px 20px rgba(46, 230, 197, 0.35)',
            }}
          >
            {isLoading ? 'Criando Conta...' : 'Ativar e Acessar Eva Clinic'}
            <ArrowRight size={16} strokeWidth={2.4} />
          </button>
        </form>

        {/* Rodapé com Link de Login com Alto Contraste */}
        <div style={{ textAlign: 'center', marginTop: 22, paddingTop: 16, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>Já possui conta no Eva Clinic? </span>
          <Link
            to="/login"
            style={{
              fontSize: 13,
              color: '#2ee6c5',
              fontWeight: 700,
              textDecoration: 'none',
              marginLeft: 4,
            }}
          >
            Fazer login →
          </Link>
        </div>
      </div>
    </div>
  );
}
