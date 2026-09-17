# Prompt para configurar o Brazilian in Action em outro computador

Estou abrindo o projeto Brazilian in Action em um novo computador.

## Objetivo

Configure e valide este projeto sem recriar funcionalidades e sem apagar alterações existentes.

## Procedimento

1. Inspecione a estrutura do projeto antes de alterar qualquer arquivo.
2. Confirme que é um projeto React + Vite + TypeScript com servidor Node/Express.
3. Instale as dependências com `npm install`.
4. Verifique o TypeScript com `npm run lint`.
5. Gere a versão de produção com `npm run build`.
6. Inicie o ambiente local com `npm run dev`.
7. Valide o endpoint `http://localhost:3000/api/health`.
8. Abra o app no navegador e teste login, cadastro, criação de cobrança Pix e consulta de status.
9. Não apague dados do Supabase, não recrie tabelas sem necessidade e não altere o preço da assinatura.
10. Não faça commit, push, deploy ou rotação de credenciais sem minha confirmação explícita.

## Variáveis de ambiente

Crie um arquivo `.env` local usando minha cópia segura das credenciais. Nunca mostre os valores das chaves na conversa, nunca os coloque no código-fonte e nunca faça commit do `.env`.

As variáveis esperadas são:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MERCADO_PAGO_TOKEN`
- `PUBLIC_APP_URL`

Para ambiente local, use `PUBLIC_APP_URL=http://localhost:3000` somente para testes. Para produção, use a URL pública do Render.

## Regras de segurança

- O `SUPABASE_SERVICE_ROLE_KEY` e o `MERCADO_PAGO_TOKEN` só podem ser usados no backend.
- Nunca cole segredos em issues, README, GitHub público, screenshots ou mensagens.
- Se encontrar credenciais expostas, pare e peça para eu rotacioná-las.
- Preserve as tabelas e dados existentes do Supabase.

## Contexto de produção

- Repositório GitHub: `imandreaugusto/code`
- Serviço Render: `brazilian-in-action`
- O webhook de pagamento é `/api/webhook/payment`.
- O endpoint de criação de Pix é `/api/payments/create-pix`.
- O endpoint de consulta de pagamento é `/api/payments/status/:id`.
- O schema do banco está em `supabase/schema.sql`.

Ao terminar, informe os comandos executados, os testes que passaram e qualquer bloqueio restante. Não declare sucesso sem mostrar evidência da validação.
