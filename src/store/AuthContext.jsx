import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const AUTH_STORAGE_KEY = 'eva_clinic_auth_v1';
const ACCOUNTS_STORAGE_KEY = 'eva_clinic_accounts_v1';

const ADMIN_USER = {
  id: 'usr_admin',
  name: 'Dra. Eva Martins',
  username: 'admin',
  email: 'admin@evaclinic.com.br',
  role: 'Diretora Clínica & Cirurgiã-Dentista',
  cro: 'CRO-SP 98.231',
  clinicName: 'Eva Clinic Odontologia Especializada',
  phone: '(11) 98765-4321',
  avatar: 'EM',
  isEvaSynced: true,
  createdAt: '2026-01-01',
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Usuário autenticado ativo
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    // Por padrão começa logado como Admin se já tinha sessão ou pode começar como admin pré-carregado
    return ADMIN_USER;
  });

  // Base de contas cadastradas localmente
  const [accounts, setAccounts] = useState(() => {
    try {
      const stored = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [
      {
        ...ADMIN_USER,
        password: '1234',
      },
    ];
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  }, [accounts]);

  // Função de Login (suporta admin / 1234 ou novas contas)
  const login = (identifier, password) => {
    const idClean = identifier.trim().toLowerCase();
    const passClean = password.trim();

    // 1. Verificação direta do Admin solicitado pelo usuário (admin / 1234)
    if ((idClean === 'admin' || idClean === 'admin@evaclinic.com.br') && passClean === '1234') {
      setCurrentUser(ADMIN_USER);
      return { success: true, user: ADMIN_USER };
    }

    // 2. Verificação em contas adicionais criadas
    const found = accounts.find(
      (acc) =>
        (acc.username?.toLowerCase() === idClean || acc.email?.toLowerCase() === idClean) &&
        acc.password === passClean
    );

    if (found) {
      const { password: _, ...userWithoutPass } = found;
      setCurrentUser(userWithoutPass);
      return { success: true, user: userWithoutPass };
    }

    return { success: false, error: 'Credenciais inválidas. Use "admin" e senha "1234".' };
  };

  // Função de Criação de Conta
  const register = ({ name, email, username, password, clinicName, cro, phone }) => {
    const emailClean = email.trim().toLowerCase();
    const usernameClean = (username || email.split('@')[0]).trim().toLowerCase();

    // Verifica se já existe
    if (accounts.some((a) => a.email.toLowerCase() === emailClean || a.username.toLowerCase() === usernameClean)) {
      return { success: false, error: 'Este e-mail ou nome de usuário já está cadastrado.' };
    }

    const initials = name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');

    const newAccount = {
      id: `usr_${Date.now().toString(36)}`,
      name: name.trim(),
      email: emailClean,
      username: usernameClean,
      password: password.trim(),
      clinicName: clinicName?.trim() || 'Clínica Odontológica',
      cro: cro?.trim() || 'CRO-SP 000.000',
      phone: phone?.trim() || '(11) 90000-0000',
      role: 'Responsável Técnico / Administrador',
      avatar: initials || 'DR',
      isEvaSynced: true,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setAccounts((prev) => [...prev, newAccount]);

    const { password: _, ...userWithoutPass } = newAccount;
    setCurrentUser(userWithoutPass);
    return { success: true, user: userWithoutPass };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated: Boolean(currentUser),
      login,
      register,
      logout,
      adminCredentials: { username: 'admin', password: '1234' },
    }),
    [currentUser, accounts]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
