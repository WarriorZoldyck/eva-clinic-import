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
  Database,
  CheckCircle,
} from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { toast } = useApp();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('(11) 9');
  const [clinicName, setClinicName] = useState('');
  const [cro, setCro] = useState('CRO-SP ');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [syncEva, setSyncEva] = useState(true);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
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

    const res = register({
      name,
      username,
      email,
      phone,
      clinicName,
      cro,
      password,
    });

    if (res.success) {
      toast(`Conta da clínica criada com sucesso! Bem-vindo(a), ${res.user.name}.`);
      navigate('/');
    } else {
      setError(res.error);
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
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 580,
          padding: 36,
          background: 'rgba(15, 21, 40, 0.75)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 30px rgba(124, 92, 255, 0.15)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: 'var(--brand-grad)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 14px',
            }}
          >
            <Stethoscope size={26} color="#061018" />
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800 }}>Cadastrar Clínica & Profissional</h2>
          <p className="small faint">Crie seu acesso e configure seu consultório na Eva Clinic</p>
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

        <form onSubmit={handleSubmit} className="col" style={{ gap: 14 }}>
          <div className="grid g-2">
            <div className="field">
              <label>Nome Completo do Dentista / Gestor:</label>
              <input
                type="text"
                className="input"
                placeholder="Ex: Dr. Marcelo Pires"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                id="register-name"
              />
            </div>

            <div className="field">
              <label>Nome de Usuário (Login):</label>
              <input
                type="text"
                className="input"
                placeholder="Ex: marcelo.pires"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                id="register-username"
              />
            </div>
          </div>

          <div className="grid g-2">
            <div className="field">
              <label>Nome da Clínica / Consultório:</label>
              <input
                type="text"
                className="input"
                placeholder="Ex: Clínica Odonto Prime"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                required
                id="register-clinic"
              />
            </div>

            <div className="field">
              <label>Número do CRO:</label>
              <input
                type="text"
                className="input"
                placeholder="Ex: CRO-SP 123.456"
                value={cro}
                onChange={(e) => setCro(e.target.value)}
                required
                id="register-cro"
              />
            </div>
          </div>

          <div className="grid g-2">
            <div className="field">
              <label>E-mail Profissional:</label>
              <input
                type="email"
                className="input"
                placeholder="contato@clinicaprime.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                id="register-email"
              />
            </div>

            <div className="field">
              <label>WhatsApp / Celular:</label>
              <input
                type="text"
                className="input"
                placeholder="(11) 98888-7777"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                id="register-phone"
              />
            </div>
          </div>

          <div className="grid g-2">
            <div className="field">
              <label>Senha:</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                id="register-password"
              />
            </div>

            <div className="field">
              <label>Confirmar Senha:</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                id="register-confirm-password"
              />
            </div>
          </div>

          <label
            className="row"
            style={{
              cursor: 'pointer',
              background: 'var(--surface)',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid var(--border)',
            }}
          >
            <input
              type="checkbox"
              checked={syncEva}
              onChange={(e) => setSyncEva(e.target.checked)}
            />
            <div style={{ fontSize: 12.5 }}>
              <b>Sincronizar com Ecossistema Eva OS</b>
              <div className="faint">
                Habilita troca de dados em tempo real com o banco de dados Supabase da clínica.
              </div>
            </div>
          </label>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', height: 44, marginTop: 6 }}
            id="btn-register-submit"
          >
            Cadastrar Clínica & Entrar <ArrowRight size={16} />
          </button>
        </form>

        <div
          style={{
            borderTop: '1px solid var(--border)',
            paddingTop: 16,
            marginTop: 20,
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--text-2)',
          }}
        >
          Já possui conta?{' '}
          <Link
            to="/login"
            style={{ color: 'var(--brand)', fontWeight: 700, textDecoration: 'underline' }}
          >
            Fazer login
          </Link>
        </div>
      </div>
    </div>
  );
}
