# Mística Agenda — Funcionalidades do Sistema

> **Stack:** Next.js · Prisma · Supabase (PostgreSQL) · NextAuth · Mercado Pago · Evolution API (WhatsApp) · Vercel  
> **Modelo:** SaaS multi-tenant, freemium — planos Grátis / Pró / Premium

---

## ✅ Funcionalidades Implementadas

### 🔐 Autenticação
- Cadastro de nova conta (nome, e-mail, senha)
- Login com e-mail e senha (NextAuth / Auth.js v5)
- Sessão persistente por JWT
- Proteção de rotas — dashboard só acessível autenticado
- Cada usuária vê **somente seus próprios dados** (multi-tenant)

---

### 📊 Painel (Dashboard)
- Card de **total de clientes** cadastrados
- Card de **atendimentos realizados no mês**
- Card de **faturamento do mês** (soma dos valores pagos)
- Card de **agendamentos de hoje**
- **Agenda do dia** — lista os próximos atendimentos do dia com horário, nome e status
- **Aniversariantes** — clientes que fazem aniversário hoje, nesta semana e neste mês, com link direto para WhatsApp com mensagem personalizada

---

### 📅 Agenda
- Calendário visual mensal com navegação de mês
- Pontos coloridos nos dias com agendamentos (por status)
- Seleção de dia para ver a lista de atendimentos
- **Criar agendamento** (modal):
  - Selecionar cliente existente ou cadastrar nova cliente no ato
  - Selecionar serviço (preenche duração e valor automaticamente)
  - Título personalizado
  - Data, horário de início e fim
  - Valor pago
  - Link de chamada (Google Meet, Zoom etc.)
  - Observações
- **Editar agendamento** — botão no painel lateral abre o mesmo formulário pré-preenchido com todos os dados
- **Painel lateral de detalhes** ao clicar num agendamento:
  - Dados completos (cliente, horário, serviço, valor, link, notas)
  - Ações de status: Confirmado · Realizado · Faltou · Cancelado (com campo de motivo)
  - Botão de editar
  - Botão de remover
- **Gestão de status:** Agendado → Confirmado → Realizado / Faltou / Cancelado

---

### 👩‍💼 Clientes
- Lista de todas as clientes com busca por nome
- **Criar cliente** (nome, telefone, e-mail, data de nascimento, notas)
- **Editar cliente** — modal com todos os campos
- **Excluir cliente**
- **Perfil detalhado da cliente** (`/clientes/[id]`):
  - Informações de contato (telefone, e-mail, aniversário)
  - Estatísticas: total de sessões, total investido, data da última sessão
  - Histórico de atendimentos com status e valores
  - Notas/observações por cliente
  - Acesso rápido às fichas de atendimento
- **Importar clientes via CSV** *(Pró/Premium)*
- **Exportar clientes para CSV** *(Pró/Premium)*
- Limite de clientes por plano: 30 (Grátis) · 80 (Pró) · Ilimitado (Premium)

---

### 📦 Serviços
- Lista de serviços com visualização em **grade** ou **lista**
- **Criar serviço** (nome, descrição, preço, duração, categoria, foto)
- **Editar serviço**
- **Ativar / desativar** serviço (serviços inativos não aparecem no agendamento público)
- **Categorias de serviços** — criar e organizar serviços por categoria *(Pró/Premium)*
- Filtro por categoria
- Foto do serviço *(Pró/Premium)*
- Limite de serviços: 5 (Grátis) · Ilimitado (Pró/Premium)

---

### 📋 Fichas de Atendimento *(Pró/Premium)*
- Criar fichas de atendimento por cliente
- Registro estruturado de sessão (histórico, observações, evoluções)
- Acesso direto pelo perfil da cliente
- Visualização e edição de fichas existentes

---

### 💬 Mensagens WhatsApp
- Configuração de **templates de mensagens automáticas**:
  - Lembrete **48 horas antes** da sessão
  - Lembrete **24 horas antes** da sessão
  - Mensagem de **confirmação de agendamento**
  - Mensagem pós-sessão / de acompanhamento
- Variáveis dinâmicas nos templates: `{{nome}}`, `{{data}}`, `{{hora}}`, `{{link}}`
- Preview da mensagem em tempo real
- Ativar/desativar cada template individualmente
- Integração com **Evolution API** para disparo via WhatsApp

---

### 🔗 Link Público de Agendamento
- Cada taróloga tem um link único: `misticagenda.com.br/agendar/[id]`
- Página pública (sem login) para a **cliente agendar sozinha**:
  1. Escolhe o serviço
  2. Seleciona o dia disponível no calendário
  3. Seleciona o horário disponível
  4. Informa nome e WhatsApp
  5. Agendamento criado automaticamente na agenda da taróloga
- Horários exibidos respeitam a **disponibilidade configurada**
- Slots gerados automaticamente com base na duração do serviço
- Página do link público com instrução de como compartilhar

---

### 📈 Relatórios *(Pró/Premium)*
- **Faturamento mensal** — gráfico dos últimos meses
- **Clientes mais ativas** — ranking por número de sessões e valor investido
- **Motivos de cancelamento** — agrupamento e contagem
- **Status dos atendimentos** — distribuição percentual (realizados, cancelados, faltas etc.)
- Relatório sem marca d'água *(Premium)*

---

### ⚙️ Configurações
- **Perfil:** nome, e-mail, foto de perfil
- **Horários disponíveis:** configurar para cada dia da semana (Dom–Sáb) horário de início e fim, e quais dias estão ativos — usado pelo link público para mostrar slots
- Upload de imagem de perfil

---

### 💳 Assinatura / Planos
- Três planos disponíveis:
  | Plano | Clientes | Serviços | Fichas | Relatórios | Import/Export | Categorias | Fotos |
  |---|---|---|---|---|---|---|---|
  | **Grátis** | 30 | 5 | ✗ | ✗ | ✗ | ✗ | ✗ |
  | **Pró** | 80 | ∞ | ✓ | ✓ | ✓ | ✓ | ✓ |
  | **Premium** | ∞ | ∞ | ✓ | ✓ | ✓ | ✓ | ✓ |
- Pagamento via **Mercado Pago** (assinatura recorrente)
- Webhook para atualização automática do plano ao pagar/cancelar
- Cancelamento de assinatura
- Bloqueio elegante de funcionalidades fora do plano com tela de upgrade

---

### 🎨 Interface / UX
- **Tema Lucent** — design system inspirado no UI kit Lucent:
  - Fundo gradiente lavanda suave (`#fdf9ff → #ede8fd`)
  - Blob roxo decorativo no canto superior direito
  - Blob rosa decorativo no canto inferior esquerdo
  - Cards brancos flutuando com sombra difusa (sem bordas visíveis)
  - Fonte **Plus Jakarta Sans** (moderna e arredondada)
- **Dark mode / Light mode / Sistema** — alternância via toggle com 3 opções
- Dark mode com paleta neon roxa (`#aa55f9`) e fundo `#0a0a0f`
- Sidebar com logo em pill gradiente, navegação com ícones + texto, indicador de rota ativa
- Design totalmente responsivo e multi-tenant
- Feedback visual em todas as ações (loading states, erros, sucesso)

---

## 🔜 Funcionalidades Previstas (Escopo Definido)

### 📲 Disparos automáticos de WhatsApp
- Envio automático dos lembretes configurados nos templates
- Trigger automático por cron job ou webhook quando se aproxima a data/hora da sessão
- Log de mensagens enviadas por agendamento

### 🧩 Ficha de Atendimento avançada
- Campos estruturados personalizáveis por tipo de leitura (tarot, astrologia etc.)
- Exportar ficha em PDF

### 📊 Relatórios avançados
- Exportar relatório em PDF
- Filtro por período personalizado
- Comparativo mês a mês

### 🌐 Página pública personalizada
- Taróloga configura foto, bio e redes sociais
- Mini landing page para além do formulário de agendamento

### 🔔 Notificações internas
- Aviso no dashboard quando uma cliente agenda pelo link público
- Aviso de aniversário do dia na hora do login

### 📱 Melhorias no agendamento público
- Confirmação por WhatsApp para a cliente após o agendamento
- Bloqueio de horários já ocupados em tempo real

---

## 🗂️ Estrutura de Rotas

```
/ → Redireciona para login ou dashboard
/login → Tela de login
/cadastro → Tela de cadastro
/agendar/[userId] → Página pública de agendamento (sem login)

/dashboard → Painel principal
/dashboard/agenda → Agenda mensal
/dashboard/clientes → Lista de clientes
/dashboard/clientes/[id] → Perfil da cliente
/dashboard/servicos → Gestão de serviços
/dashboard/fichas → Fichas de atendimento
/dashboard/mensagens → Templates de WhatsApp
/dashboard/link → Link público
/dashboard/relatorios → Relatórios
/dashboard/configuracoes → Configurações e horários
/dashboard/assinatura → Planos e cobrança
```

---

*Última atualização: Maio 2026*
