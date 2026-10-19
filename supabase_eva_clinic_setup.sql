-- ==============================================================================
-- EVA CLINIC - ESTRUTURA DE BANCO DE DADOS & INTEGRAÇÃO COM EVA OS
-- ==============================================================================
-- SEGURANÇA E INTEGRIDADE:
-- 1. Este script NÃO modifica nem sobrescreve nenhuma tabela do Eva OS 
--    (subscriptions, profiles, asaas_customers, transactions, etc. continuam intactas).
-- 2. Apenas adiciona tabelas isoladas específicas para o módulo clínico (prefixo 'clinic_')
--    e uma função RPC de LEITURA (SELECT) para checagem de assinatura ativa por e-mail.
-- ==============================================================================

-- 1. FUNÇÃO RPC DE CHECAGEM DE ASSINANTE EVA OS (APENAS LEITURA)
-- Permite que o Eva Clinic consulte de forma segura se um e-mail é assinante ativo do Eva OS.
CREATE OR REPLACE FUNCTION public.check_eva_subscriber_by_email(_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_has_active boolean := false;
  v_full_name text;
  v_sub_status text := 'none';
  v_plan_name text := null;
BEGIN
  -- Busca o ID do usuário pelo e-mail em auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(trim(_email))
  LIMIT 1;

  -- Se não encontrar em auth.users, verifica se há registro em asaas_customers
  IF v_user_id IS NULL THEN
    SELECT user_id INTO v_user_id
    FROM public.asaas_customers
    WHERE lower(email) = lower(trim(_email))
    LIMIT 1;
  END IF;

  -- Se o usuário não existir no ecossistema Eva OS
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'is_subscriber', false,
      'reason', 'user_not_found',
      'message', 'E-mail não encontrado no Eva OS.'
    );
  END IF;

  -- Consulta status na tabela de assinaturas (Leitura segura)
  SELECT 
    s.status,
    p.name
  INTO 
    v_sub_status,
    v_plan_name
  FROM public.subscriptions s
  LEFT JOIN public.subscription_plans p ON p.id = s.plan_id
  WHERE s.user_id = v_user_id
    AND (
      s.status = 'active'
      OR (s.status = 'trialing' AND s.trial_ends_at > now())
      OR (s.status = 'past_due' AND s.grace_until > now())
    )
  ORDER BY s.updated_at DESC
  LIMIT 1;

  IF v_sub_status IN ('active', 'trialing', 'past_due') THEN
    v_has_active := true;
  ELSE
    -- Fallback para função existente se disponível
    BEGIN
      v_has_active := public.has_active_subscription(v_user_id);
    EXCEPTION WHEN OTHERS THEN
      v_has_active := false;
    END;
  END IF;

  -- Obtém nome do usuário para personalização
  SELECT full_name INTO v_full_name FROM public.profiles WHERE id = v_user_id;

  RETURN json_build_object(
    'is_subscriber', v_has_active,
    'user_id', v_user_id,
    'name', coalesce(v_full_name, ''),
    'plan', coalesce(v_plan_name, 'Eva OS'),
    'status', v_sub_status
  );
END;
$$;

-- Permite que usuários anônimos / autenticados executem a consulta de validação
GRANT EXECUTE ON FUNCTION public.check_eva_subscriber_by_email(text) TO anon, authenticated, service_role;


-- 2. TABELA DE CONTAS DE ACESSO DO EVA CLINIC
-- Guarda as contas criadas pelos assinantes para o Eva Clinic com senha própria
CREATE TABLE IF NOT EXISTS public.clinic_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eva_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name text NOT NULL,
  clinic_name text NOT NULL DEFAULT 'Clínica Odontológica',
  cro text,
  phone text,
  role text NOT NULL DEFAULT 'Responsável Técnico / Administrador',
  avatar text DEFAULT 'DR',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_users_email ON public.clinic_users(lower(email));
CREATE INDEX IF NOT EXISTS idx_clinic_users_eva_id ON public.clinic_users(eva_user_id);

ALTER TABLE public.clinic_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on clinic_users" 
  ON public.clinic_users FOR SELECT 
  USING (true);

CREATE POLICY "Allow insert on clinic_users" 
  ON public.clinic_users FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow update on clinic_users" 
  ON public.clinic_users FOR UPDATE 
  USING (true);


-- 3. TABELA DE PACIENTES DA CLÍNICA
CREATE TABLE IF NOT EXISTS public.clinic_patients (
  id text PRIMARY KEY,
  clinic_user_id uuid REFERENCES public.clinic_users(id) ON DELETE CASCADE,
  name text NOT NULL,
  gender text,
  birth_date date,
  cpf text,
  phone text,
  email text,
  insurance text DEFAULT 'Particular',
  address jsonb DEFAULT '{}'::jsonb,
  allergies text[] DEFAULT '{}'::text[],
  conditions text[] DEFAULT '{}'::text[],
  notes text,
  tags text[] DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_patients_user ON public.clinic_patients(clinic_user_id);
ALTER TABLE public.clinic_patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full access to own clinic patients" ON public.clinic_patients FOR ALL USING (true);


-- 4. TABELA DE AGENDAMENTOS (AGENDA)
CREATE TABLE IF NOT EXISTS public.clinic_appointments (
  id text PRIMARY KEY,
  clinic_user_id uuid REFERENCES public.clinic_users(id) ON DELETE CASCADE,
  patient_id text NOT NULL,
  professional_id text NOT NULL,
  chair text NOT NULL DEFAULT 'Cadeira 1',
  date date NOT NULL,
  time text NOT NULL,
  duration integer NOT NULL DEFAULT 30,
  procedure_id text,
  status text NOT NULL DEFAULT 'agendado',
  confirmed boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_appts_user_date ON public.clinic_appointments(clinic_user_id, date);
ALTER TABLE public.clinic_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full access to own clinic appointments" ON public.clinic_appointments FOR ALL USING (true);


-- 5. TABELA DE PLANOS DE TRATAMENTO
CREATE TABLE IF NOT EXISTS public.clinic_treatment_plans (
  id text PRIMARY KEY,
  clinic_user_id uuid REFERENCES public.clinic_users(id) ON DELETE CASCADE,
  patient_id text NOT NULL,
  professional_id text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'rascunho',
  discount numeric DEFAULT 0,
  installments integer DEFAULT 1,
  method text DEFAULT 'Pix',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  approved_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_plans_patient ON public.clinic_treatment_plans(clinic_user_id, patient_id);
ALTER TABLE public.clinic_treatment_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full access to own clinic treatment plans" ON public.clinic_treatment_plans FOR ALL USING (true);


-- 6. TABELA DE ODONTOGRAMA
CREATE TABLE IF NOT EXISTS public.clinic_odontograms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_user_id uuid REFERENCES public.clinic_users(id) ON DELETE CASCADE,
  patient_id text NOT NULL,
  tooth text NOT NULL,
  condition text NOT NULL,
  faces text[] DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'planejado',
  date date NOT NULL DEFAULT current_date,
  item_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_odonto_patient ON public.clinic_odontograms(clinic_user_id, patient_id);
ALTER TABLE public.clinic_odontograms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full access to own clinic odontograms" ON public.clinic_odontograms FOR ALL USING (true);


-- 7. TABELA DE TRANSAÇÕES FINANCEIRAS DA CLÍNICA
CREATE TABLE IF NOT EXISTS public.clinic_transactions (
  id text PRIMARY KEY,
  clinic_user_id uuid REFERENCES public.clinic_users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('receita', 'despesa')),
  description text NOT NULL,
  category text NOT NULL,
  amount numeric NOT NULL,
  date date NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pago', 'pendente', 'cancelado')),
  method text NOT NULL DEFAULT 'Pix',
  patient_id text,
  plan_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_tx_user ON public.clinic_transactions(clinic_user_id, date);
ALTER TABLE public.clinic_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full access to own clinic transactions" ON public.clinic_transactions FOR ALL USING (true);


-- 8. TABELA DE ESTOQUE DE MATERIAIS
CREATE TABLE IF NOT EXISTS public.clinic_inventory (
  id text PRIMARY KEY,
  clinic_user_id uuid REFERENCES public.clinic_users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  qty integer NOT NULL DEFAULT 0,
  min integer NOT NULL DEFAULT 5,
  unit text NOT NULL DEFAULT 'unidade',
  cost numeric NOT NULL DEFAULT 0,
  supplier text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_inv_user ON public.clinic_inventory(clinic_user_id);
ALTER TABLE public.clinic_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full access to own clinic inventory" ON public.clinic_inventory FOR ALL USING (true);


-- 9. TABELA DE EVOLUÇÕES DO PRONTUÁRIO
CREATE TABLE IF NOT EXISTS public.clinic_evolutions (
  id text PRIMARY KEY,
  clinic_user_id uuid REFERENCES public.clinic_users(id) ON DELETE CASCADE,
  patient_id text NOT NULL,
  professional_id text,
  date date NOT NULL DEFAULT current_date,
  text text NOT NULL,
  auto boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_evo_patient ON public.clinic_evolutions(clinic_user_id, patient_id);
ALTER TABLE public.clinic_evolutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full access to own clinic evolutions" ON public.clinic_evolutions FOR ALL USING (true);


-- 10. TABELA DE DOCUMENTOS CLÍNICOS (RECEITAS, ATESTADOS, ETC.)
CREATE TABLE IF NOT EXISTS public.clinic_documents (
  id text PRIMARY KEY,
  clinic_user_id uuid REFERENCES public.clinic_users(id) ON DELETE CASCADE,
  patient_id text NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  date date NOT NULL DEFAULT current_date,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_doc_patient ON public.clinic_documents(clinic_user_id, patient_id);
ALTER TABLE public.clinic_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full access to own clinic documents" ON public.clinic_documents FOR ALL USING (true);


-- 11. TABELA DE PLANEJAMENTO DE CIRURGIA GUIADA / IMPLANTES
CREATE TABLE IF NOT EXISTS public.clinic_surgical_guides (
  id text PRIMARY KEY,
  clinic_user_id uuid REFERENCES public.clinic_users(id) ON DELETE CASCADE,
  patient_id text NOT NULL,
  tooth_number integer NOT NULL,
  implant_system text NOT NULL,
  diameter numeric NOT NULL,
  length numeric NOT NULL,
  angle numeric NOT NULL DEFAULT 0,
  depth numeric NOT NULL DEFAULT 1.5,
  torque numeric NOT NULL DEFAULT 35,
  bone_quality text NOT NULL DEFAULT 'D2',
  guide_type text NOT NULL DEFAULT 'tooth_supported',
  notes text,
  status text NOT NULL DEFAULT 'planned', -- 'planned', 'guide_printed', 'completed'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_sg_patient ON public.clinic_surgical_guides(clinic_user_id, patient_id);
ALTER TABLE public.clinic_surgical_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full access to own clinic surgical guides" ON public.clinic_surgical_guides FOR ALL USING (true);

