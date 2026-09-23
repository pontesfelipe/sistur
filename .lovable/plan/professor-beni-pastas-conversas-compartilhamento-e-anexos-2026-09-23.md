# Professor Beni: pastas, conversas, compartilhamento e anexos

Hoje o chat guarda uma única conversa por usuário (todas as mensagens juntas). O plano transforma isso em várias conversas organizadas em pastas/projetos, no estilo do Claude.

## 1. Campo de pergunta maior
- Caixa de texto começa com 3 linhas e cresce automaticamente até cerca de 10 linhas.
- Botões (microfone, anexo, enviar) ficam numa barra abaixo do texto, sem apertar a digitação.
- Enter envia, Shift+Enter quebra linha (hoje é o contrário, o que confunde).

## 2. Pastas (projetos) e conversas
- Barra lateral à esquerda na página do Beni com:
  - "Nova conversa"
  - Lista de pastas (criar, renomear, excluir) e conversas dentro de cada uma
  - Conversas soltas em "Sem pasta"
  - Busca por título
- Cada conversa tem seu próprio endereço (ex.: /professor-beni/c/abc), então recarregar volta para a mesma conversa.
- Título gerado automaticamente a partir da primeira pergunta; pode ser renomeado.
- Mover conversa entre pastas pelo menu "...".
- Pasta pode ter uma instrução opcional (ex.: "Foco no destino Barretos") que o Beni usa em todas as conversas dela.
- As mensagens atuais de cada usuário viram automaticamente uma conversa chamada "Conversa anterior", sem perda.
- No celular, a barra lateral abre como gaveta.
- Os cartões da direita (Sobre, Tópicos) continuam, mas recolhíveis para dar espaço.

## 3. Compartilhar conversa
Menu "Compartilhar" no topo da conversa:
- **Link:** gera um link somente leitura (página pública sem login), com opção de desativar o link depois.
- **Word:** baixa a conversa em .docx com cabeçalho SISTUR, data e perguntas/respostas.
- **E-mail:** envia a conversa para até 5 endereços, com mensagem opcional, pelo e-mail do SISTUR já existente.

## 4. Anexar arquivo para avaliação
- Botão de clipe aceita PDF, Word, Excel/CSV, TXT e imagens (até 10 MB, 1 arquivo por mensagem).
- Antes de responder, o Beni faz uma triagem de relevância (turismo, destino, gestão pública, planejamento, sustentabilidade, dados municipais etc.).
  - **Relevante:** analisa o documento à luz dos pilares RA/OE/AO e responde a pergunta.
  - **Irrelevante:** resposta educada no mesmo tom do guardrail atual, ex.: "Agradeço o envio, mas este documento não trata de turismo ou da metodologia SISTUR, então não posso avaliá-lo. Se tiver um material sobre o seu destino, terei prazer em analisar."
- A triagem negativa não consome crédito do Beni.
- O anexo aparece como um "chip" na mensagem e fica guardado na conversa.
- Respostas continuam em texto simples, sem markdown (regra do Beni mantida).

## Detalhes técnicos
- Novas tabelas (com GRANTs + RLS por `user_id`): `beni_folders` (id, user_id, name, instructions, created_at), `beni_conversations` (id, user_id, folder_id, title, share_token, share_enabled, updated_at), `beni_attachments` (id, conversation_id, user_id, file_path, mime, size, relevance, extracted_text).
- `beni_chat_messages` ganha `conversation_id` e `attachment_id`; migração cria uma conversa por usuário e associa as mensagens existentes.
- Bucket privado `beni-attachments` com políticas por pasta do usuário.
- Rotas: `/professor-beni` e `/professor-beni/c/:conversationId`; página pública `/beni/compartilhado/:token` lendo via RPC security definer que só retorna conversas com `share_enabled`.
- `beni-chat`: recebe `conversationId` e `attachmentId`, valida dono, injeta instruções da pasta; para anexo, extrai texto (PDF/DOCX/planilha) ou envia a imagem ao modelo, e roda uma triagem estruturada (relevante sim/não + motivo) com o modelo configurado antes da resposta; se irrelevante, devolve a recusa sem chamar `consume_beni_token`.
- Export Word com `docx` (já instalado); e-mail via nova função `share-beni-conversation` usando o template transacional existente.
- Versão 2.10.0 (MINOR) no `version.ts` + memória da feature.
