import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, clinicSupabase, evaOsSupabase, checkEvaSubscriber, loginWithEvaOS } from '../lib/supabase';

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
  // Usuário autenticado ativo: em máquinas novas inicia estritamente como NULL para exigir login!
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return null;
  });

  // Base local de contas cadastradas para fallback offline
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

  // 1. Escuta sessão do Supabase Auth caso o usuário tenha efetuado login externo
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

    // Garante que o assinante Eva OS tenha seu registro criado/atualizado na tabela clinic_users
    try {
      await evaOsSupabase.from('clinic_users').upsert({
        id: res.user.id,
        eva_user_id: res.user.id,
        email: res.user.email,
        name: res.user.name,
        clinic_name: res.user.clinicName,
        cro: res.user.cro || null,
        phone: res.user.phone || null,
        role: res.user.role,
        avatar: res.user.avatar,
        password_hash: 'eva_os_synced',
        is_active: true,
        updated_at: new Date().toISOString(),
      });
    } catch (upsertErr) {
      console.warn('Aviso ao sincronizar clinic_users para assinante Eva OS:', upsertErr);
    }

    setCurrentUser(res.user);
    return { success: true, user: res.user };
  };

  // Função de Login Geral (reconhece Nuvem Eva OS, Supabase clinic_users, Modo Demo e Contas Locais)
  const login = async (identifier, password) => {
    const idClean = identifier.trim().toLowerCase();
    const passClean = password.trim();

    // 1. Verificação explícita da conta Demo/Admin (admin / 1234)
    if ((idClean === 'admin' || idClean === 'admin@evaclinic.com.br') && passClean === '1234') {
      setCurrentUser(ADMIN_USER);
      return { success: true, user: ADMIN_USER };
    }

    // 2. Tenta autenticação direta contra o Eva OS (para assinantes ativos)
    if (idClean.includes('@')) {
      const evaRes = await loginWithEvaOS(idClean, passClean);
      if (evaRes.success) {
        // Assegura registro em clinic_users para integridade relacional
        try {
          await evaOsSupabase.from('clinic_users').upsert({
            id: evaRes.user.id,
            eva_user_id: evaRes.user.id,
            email: evaRes.user.email,
            name: evaRes.user.name,
            clinic_name: evaRes.user.clinicName,
            cro: evaRes.user.cro || null,
            phone: evaRes.user.phone || null,
            role: evaRes.user.role,
            avatar: evaRes.user.avatar,
            password_hash: 'eva_os_synced',
            is_active: true,
            updated_at: new Date().toISOString(),
          });
        } catch {
          // ignore
        }
        setCurrentUser(evaRes.user);
        return { success: true, user: evaRes.user };
      }
    }

    // 3. Tenta autenticação na tabela central de usuários clínicos em nuvem (clinic_users)
    try {
      const { data: clinicRow, error: clinicErr } = await evaOsSupabase
        .from('clinic_users')
        .select('*')
        .ilike('email', idClean)
        .eq('password_hash', passClean)
        .maybeSingle();

      if (!clinicErr && clinicRow) {
        const u = {
          id: clinicRow.id,
          email: clinicRow.email,
          name: clinicRow.name,
          username: clinicRow.email.split('@')[0],
          clinicName: clinicRow.clinic_name || 'Minha Clínica Odontológica',
          cro: clinicRow.cro || '',
          phone: clinicRow.phone || '',
          role: clinicRow.role || 'Cirurgião-Dentista / Responsável Técnico',
          avatar: clinicRow.avatar || 'DR',
          isEvaSubscriber: true,
          isEvaSynced: true,
          isDemo: false,
          createdAt: clinicRow.created_at,
        };
        setCurrentUser(u);
        return { success: true, user: u };
      }
    } catch (err) {
      console.warn('Consulta clinic_users em nuvem:', err);
    }

    // 4. Fallback de verificação em contas salvas localmente
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

  // Função de Criação de Conta (persiste diretamente na Nuvem central para acesso de qualquer máquina)
  const register = async ({ name, email, username, password, clinicName, cro, phone }) => {
    const emailClean = email.trim().toLowerCase();
    const usernameClean = (username || email.split('@')[0]).trim().toLowerCase();

    // 1. Verifica se já existe conta em nuvem com este e-mail
    try {
      const { data: existing } = await evaOsSupabase
        .from('clinic_users')
        .select('id, email')
        .ilike('email', emailClean)
        .maybeSingle();

      if (existing) {
        return {
          success: false,
          error: 'Este e-mail já está cadastrado no Eva Clinic. Por favor, faça login com sua senha.',
        };
      }
    } catch {
      // continua para criação
    }

    // 2. Criação em nuvem na tabela clinic_users (com UUID válido para qualquer máquina)
    const newUserId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : '00000000-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0');

    const avatar = name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'DR';

    try {
      const { data: inserted, error: insErr } = await evaOsSupabase
        .from('clinic_users')
        .insert({
          id: newUserId,
          email: emailClean,
          password_hash: password,
          name,
          clinic_name: clinicName || 'Minha Clínica Odontológica',
          cro: cro || '',
          phone: phone || '',
          role: 'Responsável Técnico / Administrador',
          avatar,
          is_active: true,
        })
        .select()
        .single();

      if (!insErr && inserted) {
        const newUser = {
          id: inserted.id,
          name: inserted.name,
          username: usernameClean,
          email: inserted.email,
          clinicName: inserted.clinic_name,
          cro: inserted.cro || '',
          phone: inserted.phone || '',
          role: inserted.role,
          avatar: inserted.avatar || 'DR',
          isEvaSubscriber: true,
          isEvaSynced: true,
          isDemo: false,
          createdAt: inserted.created_at,
        };

        setAccounts((prev) => [...prev, { ...newUser, password }]);
        setCurrentUser(newUser);

        return {
          success: true,
          user: newUser,
          message: 'Conta criada e sincronizada na nuvem com sucesso!',
        };
      }
    } catch (cloudErr) {
      console.warn('Erro ao registrar na nuvem central:', cloudErr);
    }

    // 3. Fallback de contingência local se a nuvem estiver inacessível
    const fallbackUser = {
      id: newUserId,
      name,
      username: usernameClean,
      email: emailClean,
      clinicName: clinicName || 'Minha Clínica Odontológica',
      cro: cro || '',
      phone: phone || '',
      role: 'Responsável Técnico / Administrador',
      avatar,
      isEvaSubscriber: true,
      isEvaSynced: false,
      isDemo: false,
      createdAt: new Date().toISOString(),
    };

    setAccounts((prev) => [...prev, { ...fallbackUser, password }]);
    setCurrentUser(fallbackUser);

    return {
      success: true,
      user: fallbackUser,
      message: 'Conta criada localmente com sucesso!',
    };
  };

  // Logout com limpeza completa da sessão
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
