# Brazilian Anki: roadmap de evolução

## Direção do produto

Criar uma experiência de estudo agradável e recompensadora, que ajude o aluno a perceber progresso real. Evitar urgência artificial, punições por faltar, culpa ou mecânicas que pressionem o aluno a continuar.

## Escopo aprovado

- [ ] Trocar a heurística atual pelo algoritmo FSRS real usando `ts-fsrs` no navegador. Manter cálculo e cache locais; sincronizar apenas os metadados de progresso com o Supabase.
- [ ] Expandir o catálogo inicial de oito cartas com conteúdo revisado e organizado por nível e tema. As frases ficam no catálogo compartilhado, fora da tabela de progresso.
- [ ] Adicionar uma visão clara de progresso: cartas para hoje, aprendidas e dominadas, próxima revisão, duração estimada, meta diária e posição na sessão.
- [ ] Mostrar após cada avaliação quando a carta voltará e explicar o efeito da resposta.
- [ ] Criar um encerramento de sessão com resumo de cartas, expressões aprendidas, melhor sequência, prática de fala e próximo passo.
- [ ] Oferecer missões diárias pequenas e opcionais, sem penalidades quando não forem concluídas.
- [ ] Adicionar um calendário semanal de consistência sem reiniciar sequências nem usar mensagens de culpa.
- [ ] Enviar um convite diário de almoço às 12:00 de São Paulo para assinantes que ativaram notificações e mantêm os lembretes habilitados. Substituir a campanha diária anterior por uma rotação de 15 mensagens escritas previamente, sem geração por IA.

## Ideias adicionais para priorizar

- [ ] Criar uma progressão visual por coleções temáticas e marcos cosméticos não pagos.
- [ ] Oferecer modos distintos de recordação, escuta e shadowing, sempre respeitando a disponibilidade de recursos locais do navegador.
- [ ] Recolocar cartas marcadas como “De novo” na fila após algumas outras cartas, para permitir uma nova tentativa na mesma sessão.
- [ ] Acrescentar desafios estáticos de contexto, como completar uma frase ou escolher a expressão adequada, sem geração por IA.
- [ ] Permitir escolher a duração da sessão e a meta diária.

## Sequência sugerida

1. Implementar FSRS no cliente e ampliar o conteúdo inicial.
2. Construir indicadores de progresso e orientação durante a sessão.
3. Adicionar feedback de próxima revisão e reforço das cartas difíceis.
4. Implementar resumo, calendário e missões opcionais.
5. Explorar coleções temáticas e modos de estudo adicionais.

## Critérios permanentes

- Áudio, fala e cálculo do agendamento não dependem de APIs pagas ou tokens de IA.
- Reconhecimento de fala só é iniciado quando o navegador permite solicitar processamento local; caso contrário, oferecer uma alternativa sem gravação.
- Texto das cartas permanece no catálogo estático compartilhado; o Supabase armazena somente progresso individual.
- Preservar acessibilidade, atalhos de teclado, opção de reduzir animações e feedback sem emojis.
