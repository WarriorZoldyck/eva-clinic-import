import { createClient } from '@supabase/supabase-js';

// ==============================================================================
// 1. BANCO DE DADOS EVA CLINIC (LOVABLE CLOUD / SUPABASE CLINIC)
// Guarda o estado clínico (clinic_state), pacientes, prontuários, finanças, etc.
// ==============================================================================
export const CLINIC_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://mjjojrwggtreomrxvfzu.supabase.co';
export const CLINIC_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_pxGErvf-kcN75AL9vwCmXA_WFOiKAmo';

export const clinicSupabase = createClient(CLINIC_URL, CLINIC_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Exportação padrão para compatibilidade
export const supabase = clinicSupabase;

// ==============================================================================
// 2. ECOSSISTEMA EVA OS (AUTENTICAÇÃO CENTRAL & ASSINATURAS DOS DENTISTAS)
// Validação de login com a conta mestre do Eva OS
// ==============================================================================
export const EVA_OS_URL = 'https://rrrnnrjefyffllnrwhkz.supabase.co';
export const EVA_OS_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJycm5ucmplZnlmZmxsbnJ3aGt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NjQ4NjksImV4cCI6MjA2NjU0MDg2OX0.1YgMkSGAvo-1zY9RtI7M9zau1mBGLksxRLHLD3vaaZA';

export const evaOsSupabase = createClient(EVA_OS_URL, EVA_OS_ANON, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storageKey: 'eva_os_session_token',
  },
});

// ==============================================================================
// LOGIN DIRETO COM CONTA EVA OS
// Permite que qualquer assinante do Eva OS (ex: spclean@hotmail.com) entre direto
// ==============================================================================
export async function loginWithEvaOS(email, password) {
  const cleanEmail = email.trim().toLowerCase();

  try {
    // 1. Autentica contra o Eva OS
    const authRes = await fetch(`${EVA_OS_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: EVA_OS_ANON,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ email: cleanEmail, password }),
    });

    if (!authRes.ok) {
      const errData = await authRes.json().catch(() => ({}));
      return {
        success: false,
        error:
          errData.error_description ||
          errData.msg ||
          'Email ou senha do Eva OS inválidos.',
      };
    }

    const session = await authRes.json();
    const user = session.user;

    // 2. Busca perfil e assinatura no Eva OS
    const h = { apikey: EVA_OS_ANON, Authorization: `Bearer ${session.access_token}` };
    const uid = encodeURIComponent(user.id);

    let fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
    let avatarUrl = user.user_metadata?.avatar_url || null;
    let planId = 'Eva OS';

    try {
      const [subsRes, profRes] = await Promise.all([
        fetch(
          `${EVA_OS_URL}/rest/v1/subscriptions?select=status,plan_id,current_period_end&user_id=eq.${uid}`,
          { headers: h }
        ),
        fetch(`${EVA_OS_URL}/rest/v1/profiles?select=full_name,avatar_url&id=eq.${uid}`, {
          headers: h,
        }),
      ]);

      if (profRes.ok) {
        const profData = await profRes.json();
        if (profData && profData[0]) {
          fullName = profData[0].full_name || fullName;
          avatarUrl = profData[0].avatar_url || avatarUrl;
        }
      }

      if (subsRes.ok) {
        const subsData = await subsRes.json();
        if (subsData && subsData[0]) {
          planId = subsData[0].plan_id || 'Eva OS';
        }
      }
    } catch (fetchErr) {
      console.warn('Aviso ao consultar perfil no Eva OS:', fetchErr);
    }

    const clinicUser = {
      id: user.id,
      email: user.email,
      name: fullName || user.email.split('@')[0],
      username: cleanEmail.split('@')[0],
      clinicName: user.user_metadata?.clinicName || 'Clínica Odontológica',
      role: 'Cirurgião-Dentista / Responsável Técnico',
      cro: user.user_metadata?.cro || '',
      phone: user.user_metadata?.phone || '',
      avatar: (fullName || user.email)
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase(),
      avatarUrl,
      isEvaSubscriber: true,
      isEvaSynced: true,
      evaPlan: planId,
      isDemo: false,
      accessToken: session.access_token,
    };

    return { success: true, user: clinicUser, session };
  } catch (err) {
    console.error('Erro de conexão com Eva OS:', err);
    return {
      success: false,
      error: 'Não foi possível conectar ao servidor Eva OS. Verifique sua conexão.',
    };
  }
}

// ==============================================================================
// VERIFICAÇÃO DE ASSINANTE EVA OS (APENAS LEITURA)
// ==============================================================================
export async function checkEvaSubscriber(email) {
  if (!email || !email.includes('@')) {
    return { isSubscriber: false, message: 'Informe um e-mail válido.' };
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const { data, error } = await evaOsSupabase.rpc('check_eva_subscriber_by_email', {
      _email: cleanEmail,
    });

    if (!error && data) {
      return {
        isSubscriber: Boolean(data.is_subscriber),
        name: data.name || '',
        plan: data.plan || 'Eva OS',
        status: data.status || 'unknown',
        message: data.message || '',
        userId: data.user_id || null,
      };
    }

    // Se o email existir no Eva OS ou fallback
    return {
      isSubscriber: true,
      name: cleanEmail.split('@')[0],
      plan: 'Eva OS Assinante',
      status: 'active',
    };
  } catch (err) {
    console.error('Erro ao verificar assinante Eva OS:', err);
    return {
      isSubscriber: false,
      message: 'Erro de comunicação ao verificar assinatura.',
    };
  }
}

// ==============================================================================
// UTILITÁRIO DE TESTE DE CONEXÃO
// ==============================================================================
export async function checkEvaConnection() {
  try {
    const { error } = await clinicSupabase.from('clinic_state').select('user_id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
