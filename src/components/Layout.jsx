import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileSpreadsheet,
  DollarSign,
  Boxes,
  Sparkles,
  Search,
  Bell,
  Sun,
  Moon,
  Menu,
  X,
  Plus,
  Stethoscope,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Clock,
  Layers,
  LogOut,
  ShieldCheck,
  Building,
  Target,
} from 'lucide-react';
import { BRL } from '../lib/utils';

export default function Layout({ children }) {
  const { state, theme, setTheme, toasts } = useApp();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { currentUser, logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Busca rápida global
  const searchResults = searchQuery.trim()
    ? state.patients.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.cpf.includes(searchQuery) ||
          p.phone.includes(searchQuery)
      )
    : [];

  // Alertas dinâmicos para a central de notificações
  const lowStock = state.inventory.filter((i) => i.qty <= i.min);
  const todayAppts = state.appointments.filter(
    (a) => a.date === new Date().toISOString().slice(0, 10)
  );

  return (
    <div className="app">
      {/* Sidebar de Navegação */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-logo">
            <Stethoscope size={22} color="#fff" />
          </div>
          <div>
            <div className="brand-name">
              Eva<span>Clinic</span>
            </div>
            <div className="brand-sub">Software Odontológico Pro</div>
          </div>
          <button
            className="btn btn-ghost btn-sm mobile-toggle"
            style={{ marginLeft: 'auto' }}
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="nav-section">Clínico</div>
        <NavLink
          to="/"
          end
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          onClick={() => setMobileOpen(false)}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/agenda"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          onClick={() => setMobileOpen(false)}
        >
          <Calendar size={18} />
          <span>Agenda</span>
          {todayAppts.length > 0 && <span className="nav-badge">{todayAppts.length}</span>}
        </NavLink>

        <NavLink
          to="/pacientes"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          onClick={() => setMobileOpen(false)}
        >
          <Users size={18} />
          <span>Pacientes & Prontuários</span>
        </NavLink>

        <NavLink
          to="/tratamentos"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          onClick={() => setMobileOpen(false)}
        >
          <FileSpreadsheet size={18} />
          <span>Planos & Orçamentos</span>
        </NavLink>

        <NavLink
          to="/guia-cirurgico"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          onClick={() => setMobileOpen(false)}
          style={({ isActive }) => isActive ? {} : {}}
        >
          <Target size={18} />
          <span>Guia Cirúrgico</span>
          <span style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, background: 'rgba(13,148,136,0.15)', color: '#0d9488', fontWeight: 700, letterSpacing: '0.03em', marginLeft: 'auto', flexShrink: 0 }}>3D</span>
        </NavLink>

        <div className="nav-section">Gestão</div>
        <NavLink
          to="/financeiro"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          onClick={() => setMobileOpen(false)}
        >
          <DollarSign size={18} />
          <span>Financeiro</span>
        </NavLink>

        <NavLink
          to="/estoque"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          onClick={() => setMobileOpen(false)}
        >
          <Boxes size={18} />
          <span>Estoque de Materiais</span>
          {lowStock.length > 0 && (
            <span
              className="nav-badge"
              style={{ background: 'var(--danger)', color: '#fff' }}
              title="Itens abaixo do estoque mínimo"
            >
              {lowStock.length}
            </span>
          )}
        </NavLink>

        <NavLink
          to="/assistente-eva"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          onClick={() => setMobileOpen(false)}
        >
          <Sparkles size={18} />
          <span>Assistente EVA AI</span>
        </NavLink>

        {/* Rodapé da Sidebar: Destaque IA */}
        <div className="sidebar-footer">
          <div
            className="eva-card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/assistente-eva')}
          >
            <h4>
              <Sparkles size={15} color="var(--brand)" />
              EVA Insights
            </h4>
            <p>
              {lowStock.length > 0
                ? `${lowStock.length} materiais com estoque crítico. Reposição sugerida.`
                : '3 orçamentos aguardando fechamento esta semana.'}
            </p>
            <span className="badge b-brand small" style={{ fontWeight: 800 }}>
              Ver Sugestões IA →
            </span>
          </div>
        </div>
      </aside>

      {/* Área Central */}
      <div className="main">
        {/* Topbar */}
        <header className="topbar">
          <button
            className="icon-btn mobile-toggle"
            onClick={() => setMobileOpen(true)}
            id="btn-mobile-menu"
          >
            <Menu size={20} />
          </button>

          {/* Busca Global */}
          <div className="search" onClick={() => setSearchOpen(true)}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar paciente por nome, CPF ou telefone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              id="global-search-input"
            />
            <span className="kbd">Ctrl+K</span>
          </div>

          <div className="topbar-actions">
            {/* Alternar Tema */}
            <button
              className="icon-btn"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={`Alternar para tema ${theme === 'dark' ? 'Claro' : 'Escuro'}`}
              id="btn-toggle-theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notificações */}
            <div style={{ position: 'relative' }}>
              <button
                className="icon-btn"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                id="btn-notifications"
              >
                <Bell size={18} />
                {(lowStock.length > 0 || todayAppts.length > 0) && <span className="dot" />}
              </button>

              {notificationsOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                    onClick={() => setNotificationsOpen(false)}
                  />
                  <div
                    className="card"
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 50,
                      width: 320,
                      zIndex: 999,
                      padding: 16,
                      background: 'var(--surface)',
                      boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.4), 0 0 15px rgba(0, 0, 0, 0.15)',
                    }}
                  >
                    <div className="card-head" style={{ marginBottom: 12 }}>
                      <h3>Notificações Clínicas</h3>
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => setNotificationsOpen(false)}
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="col" style={{ gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                      {lowStock.map((item) => (
                        <div
                          key={item.id}
                          className="list-item"
                          style={{ background: 'var(--surface-2)', padding: 8 }}
                        >
                          <AlertCircle size={16} color="var(--danger)" />
                          <div style={{ fontSize: 12 }}>
                            <b>Estoque Baixo:</b> {item.name} ({item.qty} {item.unit})
                          </div>
                        </div>
                      ))}

                      <div
                        className="list-item"
                        style={{ background: 'var(--surface-2)', padding: 8 }}
                      >
                        <Clock size={16} color="var(--brand)" />
                        <div style={{ fontSize: 12 }}>
                          <b>Hoje:</b> {todayAppts.length} consultas agendadas nas 4 cadeiras.
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Chip do Usuário Logado & Menu */}
            <div style={{ position: 'relative' }}>
              <div
                className="user-chip"
                style={{ cursor: 'pointer' }}
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                id="user-chip-menu"
              >
                <div
                  className="avatar"
                  style={{ background: 'linear-gradient(135deg,#2ee6c5,#7c5cff)' }}
                >
                  {currentUser?.avatar || 'EM'}
                </div>
                <div>
                  <b>{currentUser?.name || 'Dra. Eva Martins'}</b>
                  <small>{currentUser?.cro || 'CRO-SP 98.231'} · {currentUser?.clinicName ? currentUser.clinicName.slice(0, 18) + '...' : 'Gestora'}</small>
                </div>
              </div>

              {userMenuOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div
                    className="card"
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 52,
                      width: 290,
                      zIndex: 1000,
                      padding: 18,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.45), 0 0 20px rgba(0, 0, 0, 0.2)',
                    }}
                  >
                    <div style={{ marginBottom: 14, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                      <b style={{ fontSize: 14, display: 'block', color: 'var(--text)' }}>{currentUser?.name}</b>
                      <div className="small faint" style={{ marginTop: 2 }}>{currentUser?.email}</div>
                      <div className="small faint">{currentUser?.clinicName}</div>
                      <span className="badge b-ok small mt" style={{ marginTop: 8, display: 'inline-flex' }}>
                        <ShieldCheck size={12} /> Eva OS Sincronizado
                      </span>
                    </div>

                    <div className="col" style={{ gap: 6 }}>
                      <button
                        className="btn btn-sm btn-ghost row"
                        style={{
                          width: '100%',
                          justifyContent: 'flex-start',
                          color: 'var(--danger)',
                          padding: '10px 12px',
                          cursor: 'pointer',
                          borderRadius: 8,
                        }}
                        onClick={() => {
                          setUserMenuOpen(false);
                          handleLogout();
                        }}
                        id="btn-logout"
                      >
                        <LogOut size={15} /> Sair da Conta (Logout)
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Modal de Busca Rápida Aberta */}
        {searchOpen && searchQuery.trim() && (
          <div
            className="modal-backdrop"
            onClick={() => setSearchOpen(false)}
            style={{ zIndex: 120 }}
          >
            <div
              className="modal"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 600, padding: 20 }}
            >
              <div className="card-head">
                <h3>Resultados para "{searchQuery}"</h3>
                <button className="btn btn-ghost btn-xs" onClick={() => setSearchOpen(false)}>
                  <X size={16} />
                </button>
              </div>

              <div className="col" style={{ gap: 8, marginTop: 10 }}>
                {searchResults.length === 0 ? (
                  <p className="empty">Nenhum paciente encontrado com esse termo.</p>
                ) : (
                  searchResults.map((pt) => (
                    <div
                      key={pt.id}
                      className="list-item row between"
                      style={{ cursor: 'pointer', background: 'var(--surface-2)' }}
                      onClick={() => {
                        setSearchOpen(false);
                        setSearchQuery('');
                        navigate(`/pacientes/${pt.id}`);
                      }}
                    >
                      <div className="row">
                        <div className="avatar sm" style={{ background: pt.color }}>
                          {pt.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <b>{pt.name}</b>
                          <div className="small faint">
                            CPF: {pt.cpf} · Tel: {pt.phone} · Convênio: {pt.insurance}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={16} color="var(--brand)" />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo Principal com Scroll */}
        <main className="content">{children}</main>
      </div>

      {/* Botão Flutuante EVA Assistant */}
      <button
        className="fab-eva"
        onClick={() => navigate('/assistente-eva')}
        title="Conversar com a EVA AI"
        id="fab-eva-ai"
      >
        <Sparkles size={24} />
      </button>

      {/* Toasts Flutuantes */}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <div className="t-ic">
              <Sparkles size={16} />
            </div>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
