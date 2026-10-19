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
  Database,
  KeyRound,
  ExternalLink,
} from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useApp();

  const [identifier, setIdentifier] = useState('admin');
  const [password, setPassword] = useState('1234');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await login(identifier, password);
      setIsLoading(false);

      if (res.success) {
        toast(`Bem-vindo(a) de volta, ${res.user.name}!`);
        navigate('/');
      } else {
        setError(res.error || 'Credenciais inválidas.');
      }
    } catch {
      setIsLoading(false);
      setError('Erro ao processar login. Tente novamente.');
    }
  };

  const handleQuickAdmin = async () => {
    setIdentifier('admin');
    setPassword('1234');
    setIsLoading(true);
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
          maxWidth: 460,
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
            Gestão odontológica avançada & ecossistema Eva OS
          </p>
        </div>

        {/* Banner Assinante Eva OS */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(124, 92, 255, 0.18) 0%, rgba(46, 230, 197, 0.12) 100%)',
            border: '1px solid rgba(124, 92, 255, 0.35)',
            borderRadius: 12,
            padding: '14px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={20} color="#a78bfa" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>
                Já é assinante do Eva OS?
              </div>
              <div style={{ fontSize: 11, color: '#cbd5e1' }}>
                Seu acesso ao Eva Clinic é 100% incluso.
              </div>
            </div>
          </div>
          <Link
            to="/cadastro"
            className="btn btn-secondary"
            style={{
              fontSize: 11,
              padding: '7px 13px',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            Ativar Grátis <ArrowRight size={12} />
          </Link>
        </div>

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
            <ShieldCheck size={18} color="#f87171" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>
              E-mail ou Usuário do Eva Clinic
            </label>
            <div style={{ position: 'relative' }}>
              <User
                size={16}
                color="#94a3b8"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="ex: admin ou seu@email.com"
                style={inputStyle}
                required
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={labelStyle}>
                Senha do Eva Clinic
              </label>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                color="#94a3b8"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                style={{ ...inputStyle, paddingRight: 40 }}
                required
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
              marginTop: 6,
              background: 'linear-gradient(135deg, #2ee6c5 0%, #7c5cff 100%)',
              color: '#070b16',
              border: 'none',
              boxShadow: '0 6px 20px rgba(46, 230, 197, 0.35)',
            }}
          >
            {isLoading ? 'Entrando...' : 'Acessar Eva Clinic'}
            <ArrowRight size={16} strokeWidth={2.4} />
          </button>
        </form>

        {/* Separador */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: '22px 0 16px',
            gap: 12,
            color: '#94a3b8',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
          <span>ou teste rápido</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
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
            background: 'rgba(255, 255, 255, 0.07)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 600,
            padding: '11px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <KeyRound size={16} color="#2ee6c5" />
          Acesso Rápido Admin Demo (1234)
        </button>

        {/* Rodapé e status do Supabase */}
        <div
          style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: '1px solid rgba(255,255,255,0.1)',
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
            <span style={{ color: '#cbd5e1' }}>Supabase Eva OS Conectado</span>
          </div>

          <Link to="/cadastro" style={{ color: '#2ee6c5', textDecoration: 'none', fontWeight: 700 }}>
            Criar conta →
          </Link>
        </div>
      </div>
    </div>
  );
}
