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

Para receber feedback dos alunos, execute tambem [`supabase/enable_student_feedback.sql`](./supabase/enable_student_feedback.sql) no SQL Editor. Cada aluno pode ver apenas seus proprios envios; a leitura geral e as respostas ficam restritas aos administradores autorizados.

Para atualizar os cupons de degustacao para dois dias e limitar cada conta a um unico resgate, execute [`supabase/trial_coupon_two_day_single_use.sql`](./supabase/trial_coupon_two_day_single_use.sql) no SQL Editor.

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
