# Aba "Pipeline" (CRM em Kanban)

## O que você vai ver
- Novo item **Pipeline** no menu lateral, abrindo um quadro Kanban de leads/contatos.
- Colunas padrão: **Novo lead → Contato feito → Avaliação agendada → Orçamento enviado → Fechado (ganho) → Perdido**.
- Arrastar e soltar cards entre colunas (e reordenar dentro da coluna), funcionando com mouse e toque no celular.
- Cada card mostra resumido: nome, telefone/WhatsApp, origem (Instagram, Meta Ads, WhatsApp, Indicação, Site, Outro), interesse (ex.: implante, ortodontia), valor estimado, dias na etapa e etiquetas.
- Topo de cada coluna: quantidade de cards e soma dos valores.
- Botão **Novo lead**; clicar num card abre um painel para editar dados, adicionar observações e **Converter em paciente** (cria o paciente na aba Pacientes já com nome e contato).
- Busca e filtro por origem.
- Mesmo visual atual do app (claro/escuro).

## Dados
- Leads salvos junto com os demais dados da clínica, privados por conta (mesmo armazenamento atual na nuvem). Nada de dados fictícios em contas reais.
- Campos já preparados para Meta Ads e WhatsApp no futuro (origem, id de campanha, telefone), sem integração ativa agora.

## Detalhes técnicos
- Nova página `src/pages/Pipeline.jsx`, rota `/pipeline` em `App.jsx`, link em `Layout.jsx`.
- Biblioteca `@dnd-kit/core` + `@dnd-kit/sortable` para o arraste.
- `AppContext`: novo array `leads` no estado (default `[]`) e ações `ADD_LEAD`, `UPDATE_LEAD`, `MOVE_LEAD` (etapa + ordem, grava `stageChangedAt`), `DELETE_LEAD`, `CONVERT_LEAD` (cria paciente e marca lead como ganho).
- Estilos no `index.css` seguindo as variáveis de tema existentes.
- Verificação: criar lead, arrastar entre colunas, recarregar e confirmar que persistiu, converter em paciente.
