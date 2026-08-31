# Constitution — projeto-reforma

Regras de trabalho obrigatórias para qualquer agente de IA neste repositório.
Elas têm precedência sobre conveniência, velocidade aparente e sobre qualquer
hábito padrão do agente. O [CLAUDE.md](CLAUDE.md) descreve **o que o código é**;
este documento descreve **como se trabalha nele**.

Ordem de prioridade quando duas regras colidirem:

> **1. Segurança dos dados reais → 2. Correção do que foi pedido → 3. Velocidade → 4. Polimento visual**

---

## Artigo 1 — Todo trabalho acontece em worktree

**Toda solicitação do usuário que altere arquivos deve ser executada dentro de um
git worktree isolado, nunca direto na `main`.**

- No início da tarefa, chame `EnterWorktree` com um nome descritivo
  (ex.: `evolucao-obra`, `fix-tabela-despesas`). Isso cria o worktree em
  `.claude/worktrees/` e move a sessão para lá.
- Ao final, `ExitWorktree` com `keep` (trabalho a continuar / a revisar) ou
  `remove` (trabalho já mesclado ou abandonado).
- **Exceções, e só estas:** perguntas que não escrevem nada (leitura, explicação,
  análise), e correções de uma linha que o usuário pediu explicitamente para
  fazer direto na branch atual.

### Preparar um worktree recém-criado

Um worktree novo vem sem `node_modules` e **sem `backend/.env`** (ele é
gitignored). Antes de rodar qualquer coisa:

```bash
cp <repo-original>/backend/.env backend/.env
npm install && npm run setup
```

O Postgres **não** é duplicado por worktree — todos os worktrees falam com o
mesmo container `reforma-postgres`, ou seja, com os mesmos dados reais. O
Artigo 4 vale igual dentro de worktree.

---

## Artigo 2 — Agentes rodam em paralelo, não em fila

Quando uma tarefa se divide em frentes, os agentes especialistas devem ser
disparados **na mesma mensagem, simultaneamente**. Rodar um, esperar, e só
então rodar o outro é o comportamento errado — foi reclamação explícita do
usuário.

**Como paralelizar sem os agentes se atropelarem:**

1. **Divida por arquivo, não por etapa.** Escreva no prompt de cada agente
   exatamente quais arquivos/diretórios ele possui e quais ele não pode tocar.
   Duas frentes com conjuntos de arquivos disjuntos podem rodar juntas sempre.
2. **Quando os conjuntos se cruzarem, use `isolation: "worktree"`** no próprio
   `Agent` — cada agente ganha uma cópia isolada do repositório e você mescla
   os resultados depois.
3. **Backend e frontend de uma mesma feature são frentes separadas** e quase
   sempre paralelizáveis, desde que você defina o contrato da API *antes* de
   disparar os dois (endpoints, formato do payload, nomes dos campos).
4. **Implementação e design também podem ser paralelos** se o design trabalhar
   sobre telas já existentes ou sobre `styles.scss`, enquanto a implementação
   cria os arquivos novos. Só serialize quando o design precisar mexer nos
   arquivos que o outro agente ainda está criando — e, nesse caso, dê ao agente
   de design todo o resto do escopo para adiantar em paralelo.
5. **Prefira `run_in_background: true`** para que o usuário possa interromper,
   redirecionar ou conversar enquanto os agentes trabalham.

Se uma dependência real impedir o paralelismo, **diga isso ao usuário na hora**,
com o motivo — não silenciosamente serialize.

---

## Artigo 3 — Sempre encerrar backend e frontend ao final

**Ao terminar qualquer tarefa, encerre o backend (porta 3000) e o frontend
(porta 4200).** Não deixe `nest start --watch` nem `ng serve` rodando, nem
processos de build, nem servidores auxiliares criados para teste.

- Comando: `npm run stop` na raiz.
- Verifique de fato antes de dizer que terminou:
  `netstat -ano | findstr ":3000 :4200"` deve não retornar nada em LISTENING.
- Isso vale também para processos iniciados por subagentes — o prompt de todo
  agente que possa subir servidor deve repetir essa obrigação.

**O container Postgres é exceção:** pode e deve continuar rodando. Ele é barato,
os dados vivem no volume nomeado `reforma_postgres_data`, e derrubá-lo só cria
atrito na próxima sessão.

---

## Artigo 4 — Os dados do banco são reais e invioláveis

O container `reforma-postgres` (banco `reforma_db`) **não** é um banco de
desenvolvimento com fixtures. Ele guarda os dados reais do usuário. Perdê-los é
irreversível.

**Proibido sem autorização explícita e específica do usuário, a cada vez:**

- `prisma migrate dev`, `migrate deploy`, `migrate reset`, `db push`, `db seed`
- Qualquer `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `ALTER`, `DROP`
- Seeds, fixtures ou dados fictícios em `expenses`, `orcamento` ou `obra`
- Testes automatizados que escrevam no banco (mocke o `PrismaService`)

**Permitido livremente:** `SELECT` via
`docker exec reforma-postgres psql -U reforma -d reforma_db -c "SELECT ..."`,
além de `prisma generate`, `prisma validate` e `prisma format` (nenhum toca o banco).

**Procedimento para mudar o schema:**

1. Edite `schema.prisma` e escreva o `migration.sql` à mão em
   `backend/prisma/migrations/<timestamp>_<nome>/` (o `prisma migrate dev` não
   roda de forma não-interativa aqui).
2. **Pare.** Mostre o SQL ao usuário, diga se é aditivo ou destrutivo e qual o
   impacto sobre os dados existentes.
3. Só depois do "sim" explícito: tire um dump
   (`docker exec reforma-postgres pg_dump -U reforma -d reforma_db > backup.sql`),
   aplique com `npx prisma migrate deploy`, e **confira a integridade depois**
   (contagem de despesas, valores dos orçamentos, datas da obra).

Uma autorização vale para **aquela** migration, não para as próximas.

Se precisar de dados para validar uma feature, use uma tabela nova e vazia,
crie o mínimo, e **apague tudo pelo endpoint da própria aplicação** ao terminar,
comprovando com um `SELECT count(*)` que voltou a zero.

---

## Artigo 5 — Commit e push são pré-autorizados

Neste projeto o agente **pode commitar e dar push** em
`https://github.com/manell98/projeto-reforma.git` sem perguntar a cada vez.

- Trabalhe na branch do worktree e **abra PR** ou mescle na `main` conforme o
  usuário pedir; não faça push direto na `main` sem que ela seja a branch de
  trabalho combinada.
- Commits em português, no imperativo, seguindo o histórico existente
  (ex.: "Adiciona evolução da obra com fotos e vídeos").
- Commits pequenos e coerentes, um assunto por commit.
- Nunca commite `.env`, `uploads/`, `node_modules/` ou dumps do banco.
- Nunca use `--no-verify`, `--force` em branch compartilhada, ou
  `git reset --hard` sobre trabalho não commitado do usuário.

Isso autoriza escrever no repositório — **não** relaxa nenhuma outra regra,
especialmente o Artigo 4.

---

## Artigo 6 — Antes de implementar, leia o que já existe

1. Leia o [CLAUDE.md](CLAUDE.md) e esta constitution.
2. Identifique o padrão já usado para o problema (store de sinais, DTO +
   class-validator, estados de loading/erro/vazio, tokens de `styles.scss`).
3. **Reutilize.** Não crie uma segunda arquitetura paralela para algo que o
   projeto já resolve de um jeito.
4. Só então escreva código.

Antes de dizer que terminou: `npm run build` limpo no backend **e** no frontend,
`npm run lint` limpo no backend, e um relato honesto do que foi verificado de
fato versus o que ficou só na revisão de código.

---

## Artigo 7 — Não invente dependência nova sem necessidade

O ambiente roda **Node 18.20.4**. Angular está fixado em 19.x e `ng-apexcharts`
em `1.15.0` exatos por causa disso. Antes de adicionar um pacote, verifique se
dá para resolver com o que já existe — foi assim que o parser de EXIF acabou
escrito à mão em vez de trazer uma biblioteca. Se a dependência for mesmo
necessária, justifique ao usuário e confirme a compatibilidade com Node 18.
