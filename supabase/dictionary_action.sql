-- Dictionary Action: public curated content and private, user-owned highlights.
create table if not exists public.cultural_dictionary (
  word_key text primary key,
  word text not null,
  scenario_tag text not null default '',
  grammatical_roles jsonb not null default '[]'::jsonb,
  phonetic_tips text not null default '',
  connected_speech jsonb not null default '{}'::jsonb,
  false_twin_comparison jsonb not null default '{}'::jsonb,
  cultural_usage text not null default '',
  brazilian_pitfalls text not null default '',
  social_temp text not null default 'neutral'
    check (social_temp in ('corporate', 'neutral', 'informal', 'risk')),
  examples_json jsonb not null default '[]'::jsonb
);

alter table public.cultural_dictionary enable row level security;
drop policy if exists "Dictionary content is readable by everyone" on public.cultural_dictionary;
create policy "Dictionary content is readable by everyone"
  on public.cultural_dictionary for select
  using (true);
grant select on public.cultural_dictionary to anon, authenticated;

create table if not exists public.user_text_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word_key text not null,
  highlighted_text text not null check (length(btrim(highlighted_text)) > 0),
  color_tag text not null check (color_tag in ('cyan', 'amber', 'emerald')),
  created_at timestamptz not null default now(),
  unique (user_id, word_key, highlighted_text)
);

create index if not exists user_text_highlights_user_created_idx
  on public.user_text_highlights (user_id, created_at desc);

alter table public.user_text_highlights enable row level security;
drop policy if exists "Users can read their own highlights" on public.user_text_highlights;
create policy "Users can read their own highlights"
  on public.user_text_highlights for select
  to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Users can add their own highlights" on public.user_text_highlights;
create policy "Users can add their own highlights"
  on public.user_text_highlights for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update their own highlights" on public.user_text_highlights;
create policy "Users can update their own highlights"
  on public.user_text_highlights for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete their own highlights" on public.user_text_highlights;
create policy "Users can delete their own highlights"
  on public.user_text_highlights for delete
  to authenticated
  using ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.user_text_highlights to authenticated;

insert into public.cultural_dictionary (
  word_key, word, scenario_tag, grammatical_roles, phonetic_tips, connected_speech,
  false_twin_comparison, cultural_usage, brazilian_pitfalls, social_temp, examples_json
) values
(
  'close', 'close', 'meeting,friends,travel',
  '[{"label":"Verbo","meaning":"fechar ou encerrar","ipa":"/kloʊz/","pronunciationTip":"No verbo, o s ganha som de z: /z/."},{"label":"Adjetivo","meaning":"perto, próximo ou íntimo","ipa":"/kloʊs/","pronunciationTip":"No adjetivo, o s mantém o som de /s/."}]'::jsonb,
  'A grafia é igual, mas o som final muda com a classe e o sentido: close /kloʊz/ = fechar; close /kloʊs/ = perto. Ouça o áudio antes de repetir.',
  '{"formal":"Close the window.","natural":"Close the window.","meaning":"A consoante final de close pode se ligar à palavra seguinte: close_the. O som continua sendo /z/ no verbo."}'::jsonb,
  '{"otherWord":"shut","searchedWordUsage":"Close é a opção neutra e comum para portas, janelas, lojas e abas de aplicativos.","otherWordUsage":"Shut também significa fechar, mas pode soar mais brusco em ordens. Shut up significa cale a boca, não feche para cima."}'::jsonb,
  'Close é um verbo cotidiano e neutro. Em lojas e conversas profissionais, We close at six informa o horário de encerramento; close friends descreve intimidade, não proximidade física.',
  'Não use o som de /s/ em todos os casos. Em Please close the door, close é verbo e termina em /z/. Em the store is close, a pronúncia é /s/, embora a frase normalmente peça close to para dizer perto de.',
  'neutral',
  '[{"sentence":"Could you close the tab before we start?","translation":"Você pode fechar a aba antes de começarmos?"},{"sentence":"The hotel is close to the station.","translation":"O hotel fica perto da estação."}]'::jsonb
),
(
  'awkward', 'awkward', 'friends,interview',
  '[{"label":"Adjetivo","meaning":"constrangedor, desconfortável ou pouco natural","ipa":"/ˈɔːkwərd/"},{"label":"Adjetivo","meaning":"desajeitado ou difícil de manejar","ipa":"/ˈɔːkwərd/"}]'::jsonb,
  'O início soa como ó-kwerd, em duas sílabas. Não pronuncie o w separadamente como em português; ele participa do encontro /kw/.',
  '{"formal":"That was an awkward moment.","natural":"That was kinda awkward.","meaning":"Kinda é a redução informal de kind of e suaviza a avaliação: foi meio constrangedor."}'::jsonb,
  '{"otherWord":"embarrassed","searchedWordUsage":"Awkward descreve a situação, o silêncio ou a interação social.","otherWordUsage":"Embarrassed descreve como uma pessoa se sente: I felt embarrassed."}'::jsonb,
  'Nativos usam awkward para reconhecer um silêncio, uma situação delicada ou uma interação que não fluiu. A little awkward costuma suavizar o comentário e evita transformar um momento pequeno em drama.',
  'Awkward não quer dizer acordado nem necessariamente que alguém está com vergonha. Para estou com vergonha, use I’m embarrassed; para que situação constrangedora, That was awkward.',
  'informal',
  '[{"sentence":"It got a little awkward when nobody answered.","translation":"Ficou meio constrangedor quando ninguém respondeu."},{"sentence":"I felt awkward asking for a second interview.","translation":"Fiquei desconfortável ao pedir uma segunda entrevista."}]'::jsonb
),
(
  'actually', 'actually', 'interview,meeting,friends',
  '[{"label":"Advérbio","meaning":"na verdade; de fato","ipa":"/ˈæktʃuəli/"},{"label":"Advérbio","meaning":"surpreendentemente, contrariando uma expectativa","ipa":"/ˈæktʃuəli/"}]'::jsonb,
  'O começo é /æk/ e o grupo “tually” costuma soar como /tʃuəli/ ou /tʃəli/. O ritmo natural é ACT-u-al-ly, sem separar cada letra.',
  '{"formal":"Actually, I work remotely.","natural":"Actually, I work remotely.","meaning":"Em fala rápida, a vogal final pode enfraquecer e a palavra se ligar ao trecho seguinte. A forma continua sendo actually; não há uma redução escrita padrão."}'::jsonb,
  '{"otherWord":"currently","searchedWordUsage":"Actually corrige uma impressão ou acrescenta um fato: na verdade.","otherWordUsage":"Currently marca o momento presente: atualmente."}'::jsonb,
  'No começo da frase, actually pode corrigir com delicadeza, mas também pode soar como uma discordância. Em entrevista, combine com um tom cordial: Actually, I’ve worked with that team before.',
  'Actually não significa atualmente. Para isso, use currently ou these days. Actually, I live in Brazil quer dizer na verdade, moro no Brasil, muitas vezes corrigindo uma suposição.',
  'neutral',
  '[{"sentence":"I actually enjoyed the online meeting.","translation":"Na verdade, eu gostei da reunião online."},{"sentence":"Actually, could we move the interview to Friday?","translation":"Na verdade, podemos passar a entrevista para sexta?"}]'::jsonb
),
(
  'pretend', 'pretend', 'friends',
  '[{"label":"Verbo","meaning":"fingir, fazer de conta","ipa":"/prɪˈtend/"}]'::jsonb,
  'A sílaba forte é a segunda: pri-TEND. O primeiro i tem som curto /ɪ/, como em sit.',
  '{"formal":"Let’s pretend we are on vacation.","natural":"Let’s pretend we’re on vacation.","meaning":"We are frequentemente se contrai para we’re /wɪr/: vamos fingir que estamos de férias."}'::jsonb,
  '{"otherWord":"intend","searchedWordUsage":"Pretend é fingir ou imaginar uma situação que não é real.","otherWordUsage":"Intend é ter a intenção de fazer algo. I intend to call = pretendo ligar."}'::jsonb,
  'Pretend aparece em brincadeiras (pretend you’re a chef) e também ao falar de comportamento não genuíno (He pretended not to notice). O contexto deixa claro se é lúdico ou enganoso.',
  'Pretend não significa pretender. Para planos e intenções, use intend ou plan to. I pretend to travel significa finjo viajar, não pretendo viajar.',
  'informal',
  '[{"sentence":"Let’s pretend we’re meeting for the first time.","translation":"Vamos fingir que estamos nos conhecendo pela primeira vez."},{"sentence":"She pretended not to see the message.","translation":"Ela fingiu não ter visto a mensagem."}]'::jsonb
),
(
  'eventually', 'eventually', 'travel,interview',
  '[{"label":"Advérbio","meaning":"por fim, depois de algum tempo","ipa":"/ɪˈventʃuəli/"}]'::jsonb,
  'A sílaba forte é VEN: ih-VEN-chu-uh-lee. O começo não tem o som de evento; mantenha o i curto de /ɪ/.',
  '{"formal":"We eventually found the hotel.","natural":"We eventually found the hotel.","meaning":"A palavra não costuma virar uma forma reduzida escrita. Na fala rápida, as vogais fracas ficam mais curtas; o sentido de depois de um tempo permanece."}'::jsonb,
  '{"otherWord":"possibly","searchedWordUsage":"Eventually fala de algo que aconteceu ou acontecerá depois de um período ou de tentativas.","otherWordUsage":"Possibly indica possibilidade, sem garantir que o evento vai acontecer."}'::jsonb,
  'Eventually é útil para contar uma sequência: houve espera, dificuldade ou tempo decorrido e, por fim, algo aconteceu. Em conversa profissional, ajuda a resumir um processo sem listar cada etapa.',
  'Eventually não significa eventualmente no sentido de às vezes. Para às vezes, use sometimes ou occasionally. Eventually costuma significar por fim ou com o tempo.',
  'neutral',
  '[{"sentence":"We missed one train but eventually got to the airport.","translation":"Perdemos um trem, mas por fim chegamos ao aeroporto."},{"sentence":"She eventually became the team lead.","translation":"Com o tempo, ela se tornou líder da equipe."}]'::jsonb
)
on conflict (word_key) do update set
  word = excluded.word,
  scenario_tag = excluded.scenario_tag,
  grammatical_roles = excluded.grammatical_roles,
  phonetic_tips = excluded.phonetic_tips,
  connected_speech = excluded.connected_speech,
  false_twin_comparison = excluded.false_twin_comparison,
  cultural_usage = excluded.cultural_usage,
  brazilian_pitfalls = excluded.brazilian_pitfalls,
  social_temp = excluded.social_temp,
  examples_json = excluded.examples_json;
