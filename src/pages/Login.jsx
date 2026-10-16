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
} from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login, adminCredentials } = useAuth();
  const { toast } = useApp();

  const [identifier, setIdentifier] = useState('admin');
  const [password, setPassword] = useState('1234');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      const res = login(identifier, password);
      setIsLoading(false);

      if (res.success) {
        toast(`Bem-vinda de volta, ${res.user.name}!`);
        navigate('/');
      } else {
        setError(res.error);
      }
    }, 400);
  };

  const handleQuickAdmin = () => {
    setIdentifier('admin');
    setPassword('1234');
    const res = login('admin', '1234');
    if (res.success) {
      toast('Acesso concedido como Administrador da Clínica!');
      navigate('/');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        position: 'relative',
        background: 'radial-gradient(ellipse at 50% 20%, #111a38 0%, #070b16 70%)',
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
          bottom: '10%',
          right: '20%',
          pointerEvents: 'none',
        }}
      />

      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 440,
          padding: 36,
          background: 'rgba(15, 21, 40, 0.75)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 30px rgba(46, 230, 197, 0.15)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Marca Eva Clinic */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              background: 'var(--brand-grad)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 10px 30px -6px rgba(46, 230, 197, 0.5)',
            }}
          >
            <Stethoscope size={28} color="#061018" />
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em' }}>
            Eva<span style={{ color: 'var(--brand)' }}>Clinic</span> Pro
          </h2>
          <p className="small faint" style={{ marginTop: 4 }}>
            Software de Gestão Odontológica & Prontuário 3D
          </p>
        </div>

        {/* Badge de Sincronização Eva OS */}
        <div
          className="row between mb"
          style={{
            background: 'rgba(46, 230, 197, 0.08)',
            border: '1px solid rgba(46, 230, 197, 0.25)',
            padding: '8px 12px',
            borderRadius: 10,
            fontSize: 12,
          }}
        >
          <div className="row" style={{ gap: 6 }}>
            <Database size={14} color="var(--brand)" />
            <span style={{ color: 'var(--text-2)' }}>Ecossistema Eva OS & Supabase</span>
          </div>
          <span className="badge b-ok small" style={{ fontSize: 10, padding: '2px 6px' }}>
            Sincronizado
          </span>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              background: 'var(--danger-soft)',
              color: 'var(--danger)',
              borderRadius: 10,
              fontSize: 12.5,
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="col" style={{ gap: 16 }}>
          <div className="field">
            <label>Usuário ou E-mail</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input"
                style={{ paddingLeft: 38 }}
                placeholder="Ex: admin"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                id="login-username"
              />
              <User
                size={16}
                color="var(--text-3)"
                style={{ position: 'absolute', left: 12, top: 12 }}
              />
            </div>
          </div>

          <div className="field">
            <div className="row between">
              <label>Senha de Acesso</label>
              <span className="small faint mono">Padrão: 1234</span>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input"
                style={{ paddingLeft: 38, paddingRight: 38 }}
                placeholder="••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                id="login-password"
              />
              <Lock
                size={16}
                color="var(--text-3)"
                style={{ position: 'absolute', left: 12, top: 12 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: 11,
                  color: 'var(--text-3)',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', height: 44, marginTop: 6 }}
            disabled={isLoading}
            id="btn-login-submit"
          >
            {isLoading ? 'Autenticando...' : 'Acessar Plataforma'}
            <ArrowRight size={16} />
          </button>

          {/* Atalho de 1 Clique para Admin */}
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            style={{
              width: '100%',
              border: '1px dashed var(--border-strong)',
              background: 'var(--surface)',
            }}
            onClick={handleQuickAdmin}
            id="btn-quick-admin-login"
          >
            <Sparkles size={14} color="var(--brand)" />
            Acesso Rápido Admin (admin / 1234)
          </button>
        </form>

        <div
          style={{
            borderTop: '1px solid var(--border)',
            paddingTop: 18,
            marginTop: 22,
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--text-2)',
          }}
        >
          Ainda não tem conta para sua clínica?{' '}
          <Link
            to="/cadastro"
            style={{ color: 'var(--brand)', fontWeight: 700, textDecoration: 'underline' }}
            id="link-go-to-register"
          >
            Criar conta
          </Link>
        </div>
      </div>
    </div>
  );
}
