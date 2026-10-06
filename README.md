<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Brazilian in Action

Aplicativo React + Vite + TypeScript com API Node/Express, publicado no Render. O codigo-fonte e mantido no GitHub.

## Publicacao automatica

- Cada push em `main` executa `.github/workflows/deploy-pages.yml` para validar TypeScript, testes e build; esse workflow nao publica no GitHub Pages.
- O `render.yaml` configura o servico `brazilian-in-action` para publicar cada commit da branch `main`, sem aguardar verificacoes do GitHub Actions.
- O endereco oficial do aplicativo e https://brazilian-in-action-i036.onrender.com/.
- O servico Render precisa permanecer conectado ao repositorio `imandreaugusto/quaseoficial`, branch `main`, e sincronizado com o `render.yaml`. As credenciais da API ficam nas variaveis de ambiente do Render. Nunca versione arquivos `.env`.

Se um deploy falhar, consulte os eventos e logs do servico no Render. As verificacoes do GitHub Actions sao independentes e nao bloqueiam a publicacao no Render.

## Salvamento automatico entre dispositivos

Para habilitar a sincronizacao global de aulas, biblioteca do Read Club/Brazilian Music e progresso individual dos alunos, execute uma vez o script [`supabase/enable_platform_autosave.sql`](./supabase/enable_platform_autosave.sql) no SQL Editor do projeto Supabase. O script permite leitura para usuarios autenticados e restringe alteracoes do conteudo compartilhado aos e-mails administrativos autorizados.

As bibliotecas do Read Club e Brazilian Music atualizam os usuarios conectados em tempo real. Para habilitar os eventos instantaneos do Supabase, execute tambem [`supabase/shared_content_realtime.sql`](./supabase/shared_content_realtime.sql) no SQL Editor. Se a publicacao Realtime ainda nao estiver habilitada, o aplicativo verifica atualizacoes periodicamente como alternativa.

Para receber feedback dos alunos, execute tambem [`supabase/enable_student_feedback.sql`](./supabase/enable_student_feedback.sql) no SQL Editor. Cada aluno pode ver apenas seus proprios envios; a leitura geral e as respostas ficam restritas aos administradores autorizados. O mesmo script habilita notificacoes individuais, sem som, quando uma resposta e enviada ou atualizada.

Para atualizar os cupons de degustacao para dois dias e limitar cada conta a um unico resgate, execute [`supabase/trial_coupon_two_day_single_use.sql`](./supabase/trial_coupon_two_day_single_use.sql) no SQL Editor.

Para habilitar o perfil persistente solicitado aos assinantes, execute uma vez [`supabase/student_onboarding_profile.sql`](./supabase/student_onboarding_profile.sql) no SQL Editor do Supabase.

Para habilitar as notificacoes push, execute [`supabase/brazilian_friends_push_notifications.sql`](./supabase/brazilian_friends_push_notifications.sql) e configure `WEB_PUSH_PUBLIC_KEY` e `WEB_PUSH_PRIVATE_KEY` nas variaveis do Render. Gere o par uma vez com `npx web-push generate-vapid-keys`; mantenha a chave privada somente no Render. Cada usuario precisa permitir as notificacoes pelo botao global da plataforma. As mensagens privadas e os avisos publicados pelo CEO sao enviados aos dispositivos inscritos. No iPhone/iPad, Web Push requer adicionar o site a Tela de Inicio e permitir notificacoes; o som e a vibracao dependem das configuracoes do sistema. A presenca do Brazilian Friends permanece ativa enquanto a conta estiver usando qualquer modulo da plataforma.

Para convites individuais de videochamada, execute [`supabase/brazilian_friends_video_calls.sql`](./supabase/brazilian_friends_video_calls.sql). As chamadas sao incorporadas pelo Jitsi Meet publico (`meet.jit.si`); o aplicativo guarda somente convites temporarios, nao armazena nem grava audio/video. O uso do servico publico depende dos termos, capacidade e disponibilidade do Jitsi, e os participantes continuam usando sua propria conexao de internet. Nao inclua informacoes sensiveis em chamadas publicas.

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/59b8462e-dee5-415b-8b64-f1b0b5b36b78

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
