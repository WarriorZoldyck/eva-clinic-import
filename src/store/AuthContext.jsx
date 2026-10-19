import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, clinicSupabase, checkEvaSubscriber, loginWithEvaOS } from '../lib/supabase';

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

function formatSupabaseUser(user) {
  if (!user) return null;
  const meta = user.user_metadata || {};
  const name = meta.name || meta.full_name || user.email?.split('@')[0] || 'Cirurgião-Dentista';
  return {
    id: user.id,
    email: user.email,
    name,
    username: user.email?.split('@')[0] || 'usuario',
    clinicName: meta.clinicName || 'Eva Clinic',
    cro: meta.cro || '',
    phone: meta.phone || '',
    role: meta.role || 'Cirurgião-Dentista / Responsável Técnico',
    avatar: name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'DR',
    avatarUrl: meta.avatar_url || null,
    isEvaSubscriber: true,
    isEvaSynced: true,
    isDemo: false,
    evaPlan: meta.eva_plan || 'Eva OS',
  };
}

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

  // 1. Escuta sessão e reconecta usuário salvo no Supabase Auth
  useEffect(() => {
    clinicSupabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        const u = formatSupabaseUser(data.user);
        setCurrentUser(u);
      }
    });

    const { data: sub } = clinicSupabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = formatSupabaseUser(session.user);
        setCurrentUser(u);
      }
    });

    return () => sub?.subscription?.unsubscribe();
  }, []);

  // 2. Persistência da sessão local
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

  // Login direto com Eva OS (mesmas credenciais de assinante)
  const loginEva = async (email, password) => {
    const res = await loginWithEvaOS(email, password);
    if (!res.success) return res;

    setCurrentUser(res.user);

    // Tenta também autenticar no Supabase Clinic
    try {
      await clinicSupabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
    } catch {
      // ignore
    }

    return { success: true, user: res.user };
  };

  // Função de Login Geral (reconhece Eva OS, Supabase Auth, Contas Locais e Modo Demo)
  const login = async (identifier, password) => {
    const idClean = identifier.trim().toLowerCase();
    const passClean = password.trim();

    // 1. Verificação rápida da conta Demo/Admin (admin / 1234)
    if ((idClean === 'admin' || idClean === 'admin@evaclinic.com.br') && passClean === '1234') {
      setCurrentUser(ADMIN_USER);
      return { success: true, user: ADMIN_USER };
    }

    // 2. Tenta autenticação direta contra o Eva OS (para assinantes ativos como spclean@hotmail.com)
    if (idClean.includes('@')) {
      const evaRes = await loginWithEvaOS(idClean, passClean);
      if (evaRes.success) {
        setCurrentUser(evaRes.user);
        return { success: true, user: evaRes.user };
      }
    }

    // 3. Tenta autenticação no Supabase Auth do Eva Clinic
    try {
      const { data: authData, error: authErr } = await clinicSupabase.auth.signInWithPassword({
        email: idClean,
        password: passClean,
      });

      if (!authErr && authData?.user) {
        const u = formatSupabaseUser(authData.user);
        setCurrentUser(u);
        return { success: true, user: u };
      }
    } catch {
      // Ignora erro e continua para próximo método
    }

    // 4. Verificação em contas cadastradas localmente
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

    return {
      success: false,
      error:
        'Credenciais inválidas. Verifique seu e-mail e senha cadastrados no Eva OS ou Eva Clinic.',
    };
  };

  // Função de Criação/Ativação de Conta para Assinantes Eva OS
  const register = async ({ name, email, username, password, clinicName, cro, phone, forceBypass = false }) => {
    const emailClean = email.trim().toLowerCase();
    const usernameClean = (username || email.split('@')[0]).trim().toLowerCase();

    // 1. Tenta criar conta no Supabase Auth
    try {
      const { data: signData, error: signErr } = await clinicSupabase.auth.signUp({
        email: emailClean,
        password,
        options: {
          data: {
            name,
            full_name: name,
            clinicName,
            cro,
            phone,
          },
        },
      });

      if (!signErr && signData?.user) {
        const newUser = formatSupabaseUser(signData.user);
        setCurrentUser(newUser);
        return { success: true, user: newUser };
      }
    } catch (err) {
      console.warn('Registro no Supabase Auth:', err);
    }

    // 2. Fallback para criação local garantida
    const newUser = {
      id: `usr_${Date.now()}`,
      name,
      username: usernameClean,
      email: emailClean,
      clinicName: clinicName || 'Minha Clínica Odontológica',
      cro: cro || '',
      phone: phone || '',
      role: 'Responsável Técnico / Administrador',
      avatar: name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase() || 'DR',
      isEvaSubscriber: true,
      isEvaSynced: true,
      isDemo: false,
      createdAt: new Date().toISOString(),
      password,
    };

    setAccounts((prev) => [...prev, newUser]);
    const { password: _, ...userWithoutPass } = newUser;
    setCurrentUser(userWithoutPass);

    return {
      success: true,
      user: userWithoutPass,
      message: 'Conta criada e ativada com sucesso!',
    };
  };

  // Logout com limpeza no Supabase e local
  const logout = async () => {
    try {
      await clinicSupabase.auth.signOut();
    } catch {
      // ignore
    }
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setCurrentUser(null);
  };

  const value = useMemo(
    () => ({
      currentUser,
      setCurrentUser,
      isAuthenticated: Boolean(currentUser),
      login,
      loginEva,
      register,
      logout,
      verifyEvaSubscriber,
      accounts,
      ADMIN_USER,
    }),
    [currentUser, accounts, verifyEvaSubscriber]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
