# Eva Clinic — Plataforma Odontológica Inteligente

> Software odontológico moderno de alta performance, concorrente direto do Simples Dental e Clinicorp, integrando prontuário eletrônico, odontograma interativo 2D/3D, agenda multi-cadeiras, orçamentos inteligentes, financeiro com comissões automáticas, controle de estoque com baixa vinculada a procedimentos e assistente com IA clínica (EVA).

---

## 🌟 Diferenciais e Funcionalidades Implementadas

### 1. Odontograma Interativo FDI 2D e 3D
- **Sistema FDI completo:** Dentes permanentes (11 a 48) e decíduos/infantis (51 a 85).
- **Mapeamento anatômico de 5 faces:** Vestibular (V), Lingual/Palatina (L), Mesial (M), Distal (D) e Oclusal/Incisal (O).
- **Condições clínicas padronizadas:** Cárie, Restauração, Selante, Canal endodôntico, Coroa protética, Implante com pino, Fratura e Dente ausente.
- **Visualizador 3D Interativo (Three.js):**
  - Arcada maxilar e mandibular anatômica em curva parabólica real.
  - Modos de visualização: **Clínico** (cores do odontograma nos dentes), **Natural** (esmaltes e gengivas) e **Raio-X** (translucidez revelando raízes e canais obturados).
  - Controle de rotação livre 360°, zoom, filtro de arcada e slider de abertura interincisal (oclusão).
  - Clique direto no dente 3D para inspeção e sincronização com o prontuário.

### 2. Fluxo Clínico Unificado (O Grande Diferencial)
O sistema resolve a maior dor dos dentistas: ter que redigitar informações.
1. O dentista aponta um diagnóstico no **Odontograma**.
2. Clica em **"Adicionar ao Plano de Tratamento"**.
3. O orçamento é gerado com cálculo de descontos e parcelas.
4. Ao clicar em **"Aprovar Orçamento"**, as parcelas entram automaticamente no **Contas a Receber** do Financeiro.
5. Ao clicar em **"Marcar como Realizado"**:
   - O dente muda de status no Odontograma para "Realizado".
   - Os insumos utilizados (anestésicos, resinas, luvas, fios de sutura) recebem **baixa automática no Estoque**.
   - Uma **Evolução Clínica** é registrada na timeline do paciente automaticamente.

### 3. Agenda Multi-Cadeiras e Multi-Profissionais
- Visão diária em grade temporal (08:00 às 19:00).
- Alternância instantânea entre **Por Cadeiras (1 a 4)** ou **Por Dentistas**.
- Status dinâmicos: *Agendado, Confirmado, Em atendimento, Concluído, Faltou*.
- Envio de lembrete e confirmação via WhatsApp em 1 clique.
- Clique em horários livres abre modal de agendamento rápido pré-preenchido.

### 4. Prontuário Eletrônico (EMR)
- **Ficha Cadastral:** Dados demográficos, CPF, telefone, convênio, idade calculada.
- **Alertas Médicos Chamativos:** Alergias graves (penicilina, látex, etc.) e condições sistêmicas (hipertensão, diabetes) com destaque visual imediato.
- **Anamnese Completa:** Questionário clínico e histórico de hábitos.
- **Evolução Clínica:** Linha do tempo de todas as consultas com opção de anotações manuais e registros automáticos.
- **Exames Radiológicos & Documentos:** Galeria de exames incluindo **Radiografia Panorâmica em alta definição** com visualizador modal em tela cheia.

### 5. Gestão Financeira & Comissões
- Fluxo de caixa com entradas pagas e a receber.
- Contas a pagar operacionais (aluguel, laboratório protético, folha).
- **Cálculo Automático de Comissões:** Calcula o faturamento gerado por cada dentista (Dra. Eva, Dr. Rafael, Dra. Camila, Dr. Bruno) e aplica o percentual contratual individual para gerar o repasse líquido.

### 6. Estoque com Baixa Automatizada
- Monitoramento de saldo vs estoque mínimo de segurança.
- Alertas visuais para compras urgentes.
- Ajustes manuais rápidos (+/-) e cadastro de novos insumos por fornecedor.

### 7. Assistente Inteligente EVA (AI Assistant)
- Diagnóstico inteligente com base nos dados reais do sistema.
- Sugestões clínicas e de gestão com 1 clique:
  - Recuperação ativa de pacientes faltosos (Recall).
  - Alerta de insumos em nível crítico com sugestão de fornecedores.
  - Acompanhamento de metas de faturamento e ticket médio por procedimento.
  - Oportunidades de conversão de orçamentos pendentes.

---

## 🚀 Como Executar o Projeto

Dentro do diretório do projeto:

```bash
cd C:\Users\gurim\.gemini\antigravity-ide\scratch\eva-clinic
npm.cmd run dev
```

Acesse no seu navegador: **`http://localhost:5173`**

---

## 🛠️ Tecnologias Utilizadas

- **React 19** + **Vite 8**
- **Three.js** (WebGL 3D interativo de alta performance)
- **React Router Dom 7** (Navegação SPA fluida)
- **Recharts** (Gráficos financeiros e clínicos)
- **Lucide React** (Ícones modernos)
- **Design System Vanilla CSS** com Glassmorphism, temas Dark & Light, variáveis HSL e tipografia Plus Jakarta Sans.

---

## 📋 Próximos Passos para Produto Comercial

1. **Persistência em Banco de Dados:**
   - Modelagem relacional no PostgreSQL (Supabase / Prisma).
   - Migração do schema atual de dados para tabelas relacionais com chaves estrangeiras.
2. **Autenticação & Multi-Tenancy:**
   - Login seguro de dentistas, recepcionistas e administradores com níveis de permissão (RBAC).
   - Isolamento de dados por clínica (multi-tenant).
3. **Integrações Externas:**
   - API do WhatsApp Oficial (Z-API / Gupshup) para lembretes e confirmações automáticas de consultas.
   - Gateway de pagamento (Pix dinâmico com QR Code e cartão de crédito).
   - Assinatura digital de termos de consentimento e prontuário com certificado ICP-Brasil.
4. **Conformidade LGPD:**
   - Criptografia de dados de saúde em repouso e em trânsito.
   - Trilha de auditoria (audit logs) para qualquer visualização ou edição de prontuário.
