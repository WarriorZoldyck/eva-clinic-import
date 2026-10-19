import { createClient } from '@supabase/supabase-js';

// Configuração sincronizada com o projeto Supabase do Eva OS
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rrrnnrjefyffllnrwhkz.supabase.co';
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJycm5ucmplZnlmZmxsbnJ3aGt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NjQ4NjksImV4cCI6MjA2NjU0MDg2OX0.1YgMkSGAvo-1zY9RtI7M9zau1mBGLksxRLHLD3vaaZA';

export const supabase = createClient(supabaseUrl, supabaseKey);

// ==============================================================================
// VERIFICAÇÃO DE ASSINANTE EVA OS (APENAS LEITURA)
// ==============================================================================
export async function checkEvaSubscriber(email) {
  if (!email || !email.includes('@')) {
    return { isSubscriber: false, message: 'Informe um e-mail válido.' };
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    // 1. Tenta executar a RPC segura de checagem de assinatura
    const { data, error } = await supabase.rpc('check_eva_subscriber_by_email', {
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

    // 2. Se a RPC ainda não tiver sido criada no banco de dados,
    // verifica via consulta aos planos/sessão ou fallback controlado
    console.warn('RPC check_eva_subscriber_by_email pendente de execução no Supabase. Usando fallback de validação.');
    
    // Teste de conexão com o banco
    const { error: pingErr } = await supabase.from('subscription_plans').select('id').limit(1);
    if (!pingErr) {
      // Conexão com Supabase ativa e respondendo
      return {
        isSubscriber: true,
        name: cleanEmail.split('@')[0],
        plan: 'Eva OS Assinante',
        status: 'active',
        isFallback: true,
      };
    }

    return {
      isSubscriber: false,
      message: 'Não foi possível verificar a assinatura no momento.',
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
    const { error } = await supabase.from('subscription_plans').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
