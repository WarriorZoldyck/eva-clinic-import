import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, checkEvaSubscriber } from '../lib/supabase';

const AUTH_STORAGE_KEY = 'eva_clinic_auth_v1';
const ACCOUNTS_STORAGE_KEY = 'eva_clinic_accounts_v1';

export const ADMIN_USER = {
  id: 'usr_admin',
  name: 'Dra. Eva Martins',
  username: 'admin',
  email: 'admin@evaclinic.com.br',
  role: 'Diretora Clínica & Cirurgiã-Dentista',
  cro: 'CRO-SP 98.231',
  clinicName: 'Eva Clinic Odontologia Especializada',
  phone: '(11) 98765-4321',
  avatar: 'EM',
  isEvaSubscriber: true,
  isEvaSynced: true,
  isDemo: true,
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
    // Começa logado como Admin de demonstração
    return ADMIN_USER;
  });

  // Base local de contas cadastradas para o Eva Clinic
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

  // Função para verificar se um e-mail é assinante do Eva OS
  const verifyEvaSubscriber = useCallback(async (email) => {
    return await checkEvaSubscriber(email);
  }, []);

  // Função de Login no Eva Clinic
  const login = async (identifier, password) => {
    const idClean = identifier.trim().toLowerCase();
    const passClean = password.trim();

    // 1. Verificação rápida da conta Demo/Admin (admin / 1234)
    if ((idClean === 'admin' || idClean === 'admin@evaclinic.com.br') && passClean === '1234') {
      setCurrentUser(ADMIN_USER);
      return { success: true, user: ADMIN_USER };
    }

    // 2. Verificação em contas cadastradas localmente
    const localMatch = accounts.find(
      (acc) =>
        (acc.username?.toLowerCase() === idClean || acc.email?.toLowerCase() === idClean) &&
        acc.password === passClean
    );

    if (localMatch) {
      const { password: _, ...userWithoutPass } = localMatch;
      setCurrentUser(userWithoutPass);
      return { success: true, user: userWithoutPass };
    }

    // 3. Verificação no Supabase (tabela clinic_users se disponível)
    try {
      const { data, error } = await supabase
        .from('clinic_users')
        .select('*')
        .or(`email.ilike.${idClean}`)
        .eq('password_hash', passClean) // em produção utilizar hash
        .limit(1);

      if (!error && data && data.length > 0) {
        const row = data[0];
        const remoteUser = {
          id: row.id,
          name: row.name,
          email: row.email,
          username: row.email.split('@')[0],
          clinicName: row.clinic_name,
          cro: row.cro,
          phone: row.phone,
          role: row.role || 'Responsável Técnico / Administrador',
          avatar: row.avatar || 'DR',
          isEvaSubscriber: true,
          isEvaSynced: true,
          isDemo: false,
          createdAt: row.created_at,
        };

        // Salva na lista local para cache offline
        setAccounts((prev) => {
          if (prev.some((a) => a.email.toLowerCase() === remoteUser.email.toLowerCase())) {
            return prev;
          }
          return [...prev, { ...remoteUser, password: passClean }];
        });

        setCurrentUser(remoteUser);
        return { success: true, user: remoteUser };
      }
    } catch {
      // Ignora erro e prossegue com mensagem padrão
    }

    return {
      success: false,
      error: 'Credenciais inválidas. Verifique seu e-mail e senha cadastrados no Eva Clinic.',
    };
  };

  // Função de Criação/Ativação de Conta para Assinantes Eva OS
  const register = async ({ name, email, username, password, clinicName, cro, phone, forceBypass = false }) => {
    const emailClean = email.trim().toLowerCase();
    const usernameClean = (username || email.split('@')[0]).trim().toLowerCase();

    // 1. Verifica se já existe localmente
    if (accounts.some((a) => a.email.toLowerCase() === emailClean || a.username?.toLowerCase() === usernameClean)) {
      return { success: false, error: 'Este e-mail ou nome de usuário já está cadastrado no Eva Clinic.' };
    }

    // 2. Valida se o usuário é assinante ativo do Eva OS (Apenas leitura)
    let isSubscriber = true;
    let subPlan = 'Eva OS';

    if (!forceBypass) {
      const subCheck = await checkEvaSubscriber(emailClean);
      if (!subCheck.isSubscriber) {
        return {
          success: false,
          error:
            subCheck.message ||
            'Não identificamos uma assinatura ativa do Eva OS para este e-mail. Para utilizar o Eva Clinic gratuitamente, é necessário ser assinante do Eva OS.',
        };
      }
      subPlan = subCheck.plan || 'Eva OS';
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
      clinicName: clinicName?.trim() || 'Minha Clínica Odontológica',
      cro: cro?.trim() || 'CRO-SP 000.000',
      phone: phone?.trim() || '(11) 90000-0000',
      role: 'Responsável Técnico / Administrador',
      avatar: initials || 'DR',
      isEvaSubscriber: true,
      evaPlan: subPlan,
      isEvaSynced: true,
      isDemo: false, // Usuário real começa com espaço limpo/zerado!
      createdAt: new Date().toISOString().slice(0, 10),
    };

    // Tenta registrar na tabela clinic_users do Supabase se ela já existir
    try {
      await supabase.from('clinic_users').insert({
        email: newAccount.email,
        password_hash: newAccount.password,
        name: newAccount.name,
        clinic_name: newAccount.clinicName,
        cro: newAccount.cro,
        phone: newAccount.phone,
        role: newAccount.role,
        avatar: newAccount.avatar,
      });
    } catch {
      // Não bloqueia caso a tabela ainda não tenha sido criada no Supabase
    }

    setAccounts((prev) => [...prev, newAccount]);

    const { password: _, ...userWithoutPass } = newAccount;
    setCurrentUser(userWithoutPass);
    return { success: true, user: userWithoutPass };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  // Alternar rapidamente para o modo Demo Admin
  const setDemoAdmin = () => {
    setCurrentUser(ADMIN_USER);
  };

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated: Boolean(currentUser),
      login,
      register,
      logout,
      setDemoAdmin,
      verifyEvaSubscriber,
      adminCredentials: { username: 'admin', password: '1234' },
    }),
    [currentUser, accounts, verifyEvaSubscriber]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
