<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Brazilian in Action

Aplicativo React + Vite + TypeScript com API Node/Express, publicado em GitHub Pages e Render.

## Publicacao automatica

- Cada push em `main` executa `.github/workflows/deploy-pages.yml`: instala dependencias, verifica TypeScript, executa os testes e publica o frontend no GitHub Pages.
- O `render.yaml` configura o servico `brazilian-in-action` para atualizar a API no Render depois que as verificacoes do commit passarem.
- Para manter a publicacao automatica, o servico Render deve permanecer conectado ao repositorio `imandreaugusto/quaseoficial`, branch `main`, e o GitHub Pages deve continuar habilitado para o workflow.
- As chaves do GitHub Actions ficam nos Secrets do repositorio; as credenciais da API ficam nas variaveis de ambiente do Render. Nunca versione arquivos `.env`.

Se um deploy falhar, consulte a execucao mais recente na aba **Actions** do GitHub e os eventos do servico no Render antes de tentar novamente.

## Salvamento automatico entre dispositivos

Para habilitar a sincronizacao global de aulas, biblioteca do Read Club/Brazilian Music e progresso individual dos alunos, execute uma vez o script [`supabase/enable_platform_autosave.sql`](./supabase/enable_platform_autosave.sql) no SQL Editor do projeto Supabase. O script permite leitura para usuarios autenticados e restringe alteracoes do conteudo compartilhado aos e-mails administrativos autorizados.

Para receber feedback dos alunos, execute tambem [`supabase/enable_student_feedback.sql`](./supabase/enable_student_feedback.sql) no SQL Editor. Cada aluno pode ver apenas seus proprios envios; a leitura geral e as respostas ficam restritas aos administradores autorizados.

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
