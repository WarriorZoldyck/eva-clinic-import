import { createClient } from '@supabase/supabase-js';

// Configuração sincronizada com o Eva OS
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rrrnnrjefyffllnrwhkz.supabase.co';
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJycm5ucmplZnlmZmxsbnJ3aGt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NjQ4NjksImV4cCI6MjA2NjU0MDg2OX0.1YgMkSGAvo-1zY9RtI7M9zau1mBGLksxRLHLD3vaaZA';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Utilitário para verificar conexão com o ecossistema Eva OS
export async function checkEvaConnection() {
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
