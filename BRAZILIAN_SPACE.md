# Brazilian Space

## Especificacao da arquitetura de dados

Instale `supabase/brazilian_space.sql` no SQL Editor do Supabase. Esta migracao e
aditiva: nao altera as tabelas nem a logica dos apps atuais.

| Tabela | Responsabilidade |
| --- | --- |
| `space_users` | Perfil publico do Space, com apelido unico, nome e avatar sincronizados do perfil existente. |
| `space_posts` | Publicacoes de estudo e duvidas; registra o resultado da verificacao JEV. |
| `space_comments` | Respostas ligadas a publicacao, tambem verificadas pela JEV. |
| `space_mentions` | Liga autor, aluno mencionado e resposta valida; cada mencao recompensa uma unica resposta. |
| `space_badges_acquired` | Historico permanente de emblemas obtidos, incluindo `break_the_ice`. |
| `season_points` | Pontos de ajuda, XP e moedas, particionados por chave mensal `YYYY-MM-01`. A temporada nova comeca zerada sem apagar historico. |
| `space_reward_settings` | Valores ajustaveis pelo CEO para pontos, XP e moedas concedidos por interacao valida. |
| `space_season_awards` | Historico imutavel de top 3 por temporada e titulo Space Helper do mes seguinte. |

As funcoes SQL `space_create_post`, `space_create_comment_and_reward` e
`space_award_previous_season` encapsulam escritas relacionadas. A resposta que
ativa recompensa precisa ser aceita pela JEV; a funcao SQL marca a mencao como
recompensada e credita ambos os participantes na mesma transacao. O cliente usa
somente a API autenticada do servidor; tabelas e funcoes nao ficam abertas ao
papel anonimo.

## API

- `GET /api/space/feed`: posts, respostas, placar mensal, Space Helpers e emblemas do usuario.
- `GET /api/space/users?q=...`: pesquisa de apelidos publicos para mencoes.
- `POST /api/space/posts`: verifica com JEV e cria post com as mencoes selecionadas.
- `POST /api/space/posts/:id/comments`: verifica a resposta com JEV e concede recompensas transacionalmente quando aplicavel.
- `GET /api/space/rewards` (via feed) e `POST /api/space/rewards`: leitura e ajuste restritos ao CEO.

Os endpoints usam a sessao Supabase autenticada e a verificacao de assinatura ja
aplicada pelo servidor. A verificacao das contribuicoes e feita pelo modelo
`jev-latest` via TypeSafe AI, usando `TYPESAFE_API_KEY`. Se a chave estiver
ausente ou o provedor falhar, o servidor reporta a indisponibilidade e nao
considera a contribuicao validada. `GEMINI_API_KEY` continua sendo usada por
outros recursos de IA existentes, mas nao pela validacao do Brazilian Space.

## Componentes isolados e gatilho de saida

- `src/components/BrazilianSpace.tsx` implementa feed, respostas, mencoes, painel de temporada, recompensas e controles do CEO.
- `src/components/BrazilianSpace.css` contem estilos Glassmorphism escopados ao modulo.
- `src/lib/brazilianSpaceEvents.ts` expõe `requestSpaceMomentInsight()` para aplicativos anfitrioes.
- `src/components/BrazilianSpaceMomentInsight.tsx` exibe o popup padrao e encaminha para o compositor com foco.

O Brazilian Games chama `requestSpaceMomentInsight()` ao concluir uma partida
local, sem alterar a pontuacao ou as regras do jogo. Outros apps que possuam um
evento proprio de conclusao podem importar e chamar a mesma funcao, por exemplo:

```ts
requestSpaceMomentInsight({ draft: 'Meu insight desta atividade foi...' });
```

O shell instala o ouvinte globalmente. Portais de conversacao de terceiros
abertos pelo Brazilian Practice nao fornecem um evento de conclusao ao app; por
isso, o popup nao pode ser acionado automaticamente ao encerrar uma atividade
nesses sites.
