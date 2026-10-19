import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useApp } from '../store/AppContext';
import {
  Stethoscope,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  Mail,
  Loader2,
} from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login, loginEva } = useAuth();
  const { toast } = useApp();

  // 'evaos' | 'clinic' | 'demo'
  const [activeTab, setActiveTab] = useState('evaos');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const inputStyle = {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    color: '#ffffff',
    borderRadius: 11,
    height: 44,
    fontSize: 13,
    paddingLeft: 40,
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      let res;
      if (activeTab === 'evaos' && loginEva) {
        res = await loginEva(identifier, password);
      } else {
        res = await login(identifier, password);
      }

      setIsLoading(false);

      if (res.success) {
        toast(`Bem-vindo(a) de volta, ${res.user.name}!`);
        navigate('/');
      } else {
        setError(res.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
      }
    } catch (err) {
      setIsLoading(false);
      console.error('Erro no login:', err);
      setError('Erro ao processar login. Tente novamente.');
    }
  };

  const handleQuickAdmin = async () => {
    setIsLoading(true);
    setError('');
    const res = await login('admin', '1234');
    setIsLoading(false);
    if (res.success) {
      toast('Acesso concedido como Administrador da Clínica (Modo Demonstração)!');
      navigate('/');
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
          background: 'rgba(46, 230, 197, 0.12)',
          filter: 'blur(100px)',
          top: '10%',
          left: '20%',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'rgba(124, 92, 255, 0.15)',
          filter: 'blur(100px)',
          top: '40%',
          right: '20%',
          pointerEvents: 'none',
        }}
      />

      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 480,
          padding: 36,
          background: 'rgba(15, 21, 40, 0.88)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 35px rgba(46, 230, 197, 0.18)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Topo / Logo */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              background: 'var(--brand-grad)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 12px',
              boxShadow: '0 8px 25px rgba(46, 230, 197, 0.35)',
            }}
          >
            <Stethoscope size={28} color="#0d1117" strokeWidth={2.4} />
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>
              Eva Clinic
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                background: 'rgba(46, 230, 197, 0.18)',
                color: '#2ee6c5',
                padding: '2px 8px',
                borderRadius: 99,
                border: '1px solid rgba(46, 230, 197, 0.35)',
                letterSpacing: '0.04em',
              }}
            >
              PRO
            </span>
          </div>

          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
            Gestão Odontológica Integrada ao Ecossistema Eva OS
          </p>
        </div>

        {/* Abas de Tipo de Acesso */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 12,
            padding: 4,
            marginBottom: 20,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            gap: 4,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('evaos');
              setError('');
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '9px 12px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              transition: 'all 0.15s ease',
              background: activeTab === 'evaos' ? 'linear-gradient(135deg, #2ee6c5, #7c5cff)' : 'transparent',
              color: activeTab === 'evaos' ? '#070b16' : '#94a3b8',
              boxShadow: activeTab === 'evaos' ? '0 4px 12px rgba(46, 230, 197, 0.25)' : 'none',
            }}
          >
            <ShieldCheck size={15} />
            Entrar com Eva OS
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('clinic');
              setError('');
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '9px 12px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              transition: 'all 0.15s ease',
              background: activeTab === 'clinic' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              color: activeTab === 'clinic' ? '#ffffff' : '#94a3b8',
            }}
          >
            <User size={14} />
            Conta Clinic
          </button>
        </div>

        {/* Informativo para Assinantes Eva OS */}
        {activeTab === 'evaos' && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(124, 92, 255, 0.16) 0%, rgba(46, 230, 197, 0.1) 100%)',
              border: '1px solid rgba(124, 92, 255, 0.3)',
              borderRadius: 10,
              padding: '11px 14px',
              marginBottom: 18,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <Sparkles size={18} color="#2ee6c5" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.45 }}>
              Use seu <strong>e-mail e senha do Eva OS</strong> (ex: <code style={{ color: '#2ee6c5' }}>spclean@hotmail.com</code>).
              Assinantes entram direto e seus pacientes, prontuários e planejamentos sincronizam com o Supabase.
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.18)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#fca5a5',
              fontSize: 13,
              marginBottom: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <ShieldCheck size={18} color="#f87171" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>
              {activeTab === 'evaos' ? 'E-mail do Eva OS' : 'E-mail ou Usuário'}
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                color="#94a3b8"
                style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type={activeTab === 'evaos' ? 'email' : 'text'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={activeTab === 'evaos' ? 'seu-email@exemplo.com' : 'ex: admin ou seu@email.com'}
                style={inputStyle}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={labelStyle}>
                Senha
              </label>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                color="#94a3b8"
                style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                style={{ ...inputStyle, paddingRight: 40 }}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
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
              marginTop: 4,
              background: 'linear-gradient(135deg, #2ee6c5 0%, #7c5cff 100%)',
              color: '#070b16',
              border: 'none',
              boxShadow: '0 6px 20px rgba(46, 230, 197, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Autenticando...</span>
              </>
            ) : (
              <>
                <span>{activeTab === 'evaos' ? 'Entrar com Eva OS' : 'Acessar Eva Clinic'}</span>
                <ArrowRight size={16} strokeWidth={2.4} />
              </>
            )}
          </button>
        </form>

        {/* Separador */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: '20px 0 14px',
            gap: 12,
            color: '#64748b',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          <span>ou teste rápido</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
        </div>

        {/* Botão Acesso Rápido Admin Demo */}
        <button
          type="button"
          onClick={handleQuickAdmin}
          disabled={isLoading}
          className="btn"
          style={{
            width: '100%',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#cbd5e1',
            fontSize: 12,
            fontWeight: 600,
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            borderRadius: 10,
          }}
        >
          <KeyRound size={15} color="#2ee6c5" />
          Acesso Demonstração (Dra. Eva Martins)
        </button>

        {/* Rodapé e status da sincronização */}
        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
            color: '#94a3b8',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#2ee6c5',
                boxShadow: '0 0 8px #2ee6c5',
                display: 'inline-block',
              }}
            />
            <span style={{ color: '#94a3b8', fontSize: 11 }}>Nuvem Eva OS & Supabase Ativos</span>
          </div>

          <Link to="/cadastro" style={{ color: '#2ee6c5', textDecoration: 'none', fontWeight: 600, fontSize: 12 }}>
            Criar conta →
          </Link>
        </div>
      </div>
    </div>
  );
}
