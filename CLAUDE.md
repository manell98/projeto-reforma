# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Read [CONSTITUTION.md](CONSTITUTION.md) before doing anything in this repo.** It holds the non-negotiable working rules (worktrees, parallel agents, production-data safety, shutting servers down, commit/push policy). This file describes *what the code is*; the constitution describes *how you must work on it*.

## Project overview

Reforma is a system for tracking and analyzing home-renovation expenses: expense entry (value, description, category, date, payment method, installments, optional note) with edit/delete, a dashboard with cards/charts, a payment-method breakdown, and a photo/video log of the renovation's progress over time. All figures are driven by real persisted data (no mocked values). It is a monorepo with two independent apps:

- `backend/` — NestJS + TypeScript + Prisma + PostgreSQL + Swagger (REST API)
- `frontend/` — Angular 19 (standalone components, signals) + Angular Material + ApexCharts (`ng-apexcharts`)

This **is** a git repository, with remote `origin` at `https://github.com/manell98/projeto-reforma.git`. Committing and pushing are pre-authorized — see the constitution.

Source comments and commit-worthy docs in this repo are written in Portuguese (matching the user's language); keep that convention when editing existing files.

**Frontend Angular version is pinned to 19.x, not the latest major.** Angular 22's CLI hard-requires Node >= 22.22, but this environment runs Node 18.20.4 — Angular 19 is the newest major still compatible with Node 18. Don't bump `@angular/*`, `@angular-devkit/*`, `ng-apexcharts`, or `zone.js` past what Node 18 supports without confirming the target Node version first. `ng-apexcharts` is pinned to the exact version `1.15.0` (no caret) because `^1.15.0` resolves to `1.17.x`, which requires Angular >= 20.

## Commands

### Whole stack (repo root)

The root `package.json` exists only to orchestrate the two apps plus Docker — it is not a workspace and holds no application code.

```bash
npm install          # once, installs concurrently at the root
npm run setup        # first time: installs backend + frontend deps and generates the Prisma client
npm run dev          # Postgres (waits for healthy) + backend + frontend, all in one terminal
npm run stop         # kills anything left on ports 3000/4200 (does NOT stop Postgres)
npm run db:up        # just Postgres
npm run db:down      # stops the Postgres container (data survives — named volume)
```

`npm run dev` streams both apps' logs prefixed with `backend`/`frontend`, and `concurrently -k` takes one down if the other dies. Ctrl+C in a real terminal should stop both — but on Windows a signal that doesn't reach the whole console group can leave `nest`/`ng` orphans holding the ports, so **finish with `npm run stop`** (it kills port holders *and* orphaned parents, then verifies). Postgres is left running on purpose, since the container is cheap and the data lives in the `reforma_postgres_data` named volume.

Do **not** add a short-lived job (an `echo`, a one-shot check) to that `concurrently` list: `-k` kills every process as soon as *any* of them exits, so a job that returns immediately takes the whole stack down with it. This was a real bug in the first version of the script.

### Backend (`backend/`)

```bash
npm install
npx prisma generate                      # regenerate Prisma client after schema.prisma changes
npm run start:dev                        # dev server w/ watch — http://localhost:3000 (Swagger at /docs)
npm run build                            # nest build
npm run lint                             # eslint --fix on src/ and test/
npm run format                           # prettier --write on src/ and prisma/
npm test                                 # jest unit tests
npm run test:watch
npm run test:cov
npm run test:e2e                         # jest -c test/jest-e2e.json
```

Run a single backend test file: `npx jest path/to/file.spec.ts` (or `npx jest -t "test name"` to filter by name).

**Never run `prisma migrate dev`, `migrate deploy`, `db push`, `db seed`, or `migrate reset` on your own** — the local database holds the user's real data. Write the migration SQL by hand and get explicit approval. See the constitution.

The backend needs Postgres running first (or just use `npm run dev` from the root):

```bash
cd backend
cp .env.example .env   # already has working local defaults
docker compose up -d   # Postgres 16 in Docker, named volume reforma_postgres_data
```

### Frontend (`frontend/`)

```bash
npm install
npm start        # ng serve — http://localhost:4200
npm run build     # ng build
npm run watch     # ng build --watch --configuration development
npm test          # ng test (Karma/Jasmine)
```

There is no `lint` script in the frontend — `npm run build` is the compile gate.

## Architecture

### Backend

- Entry point [backend/src/main.ts](backend/src/main.ts): creates the Nest app, enables CORS (origin from `cors.origin` config, sourced from `CORS_ORIGIN` env var), applies a global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`, implicit conversion), registers the global `AllExceptionsFilter`, and mounts Swagger at `/docs`.
- Config is centralized via `@nestjs/config`: [backend/src/config/configuration.ts](backend/src/config/configuration.ts) defines the shape (`nodeEnv`, `port`, `database.url`, `cors.origin`, `upload.dir`) and [backend/src/config/env.validation.ts](backend/src/config/env.validation.ts) fails fast at boot if required env vars (currently only `DATABASE_URL`) are missing. Add new env vars to `configuration.ts` plus `.env.example`; add them to `env.validation.ts` **only if they have no default** (`UPLOAD_DIR` defaults to `./uploads`, so it is deliberately not in the required list).
- [backend/src/common/filters/all-exceptions.filter.ts](backend/src/common/filters/all-exceptions.filter.ts) is the single global error handler — it normalizes every thrown error (Nest `HttpException` or unexpected) into `{ statusCode, timestamp, path, method, message }` and logs 5xx as `error` / others as `warn`. Don't add per-controller try/catch for HTTP error formatting; let this filter handle it.
- `PrismaModule`/`PrismaService` ([backend/src/prisma/](backend/src/prisma/)) is `@Global()` — any feature module can inject `PrismaService` without importing the module.
- `ExpensesModule` ([backend/src/expenses/](backend/src/expenses/)) exposes `GET/POST /expenses`, `GET/PATCH/DELETE /expenses/:id`, and `GET /expenses/categorias` (must stay registered before the `:id` route). `expenses.service.ts` does the Prisma queries and converts the `Decimal` `valor` field to a plain `number` before returning (`SerializedExpense`), since Prisma's `Decimal` type doesn't serialize cleanly to JSON. Filtering (`FilterExpensesDto`: `dataInicio`, `dataFim`, `categoria`, `descricao`) is a server-side capability (Prisma `where` clause) — the frontend currently does its own client-side filtering instead (see below) and doesn't call it with query params, but the endpoint itself stays fully functional for direct API use.
- `OrcamentoModule` ([backend/src/orcamento/](backend/src/orcamento/)) holds six budgets — `Orcamento` model, primary key is the `OrcamentoTipo` enum (`GERAL | PEDREIRO | ELETRICISTA | TIO_NEGUINHO | MARCENEIRO | MARMOREIRO`), one row per type, upserted. `GET /orcamento` returns all of them (missing rows default to `{ valor: 0 }` in the response, not stored as a row); `PUT /orcamento/:tipo` upserts one. There is intentionally no "budget not configured" sentinel beyond `valor: 0` — the frontend treats `orcamento > 0` as "configured". **There is deliberately no separate CRUD/table for the five specific budgets' spending** — a prior iteration had one (`GastoOrcamento`/`gastos_orcamento`), and it was removed by explicit user request: their "gasto" is derived by filtering `Expense` on `categoria`, since those five names are also `Categoria` enum values. Don't reintroduce a parallel gasto table — it would let the same spending be entered in two places. If a future request needs that table back, migrate any existing rows into `Expense` first (see the recreate-and-swap migration note below) rather than dropping the data.
- `ObraModule` ([backend/src/obra/](backend/src/obra/)) holds the renovation's start/end dates as a **singleton row** (`Obra`, fixed `id = 1`). `dataTermino` is nullable — null means the work is still in progress. `PUT /obra` does a partial merge (only overwrites fields present in the body; `null` explicitly clears a field, `undefined`/omitted leaves the stored value untouched) — see `ObraService.atualizar`.
- `EvolucaoModule` ([backend/src/evolucao/](backend/src/evolucao/)) is the photo/video log of the renovation — see the dedicated section below.
- Categories are a fixed Prisma **enum** (`Categoria` in `schema.prisma`: `ELETRODOMESTICOS`, `MATERIAIS`, `PEDREIRO`, `ELETRICISTA`, `MARCENEIRO`, `MARMOREIRO`, `SERRALHEIRO`, `VIDRACEIRO`, `LADRILHEIRO`, `INSTALADOR_PORTA`, `TIO_NEGUINHO`, `ALUGUEL_MATERIAIS`, `REMOCAO_ENTULHO`, `ARQUITETO`, `OUTROS`), not a database table — this is a closed product-defined domain, not user-managed data. [backend/src/expenses/categoria.constants.ts](backend/src/expenses/categoria.constants.ts) is the single source of truth mapping each enum value to its Portuguese display label; the frontend never hardcodes this list, it fetches it from `GET /expenses/categorias`. When the category list changes again: if it's purely additive, a migration with a few `ALTER TYPE "Categoria" ADD VALUE 'X';` statements is enough (see `prisma/migrations/20260819192759_orcamentos_especificos_e_obra/migration.sql`); if any value is renamed/removed, write the full recreate-and-swap migration instead (see `prisma/migrations/20260819183501_categorias_e_orcamento/migration.sql` for that pattern) that maps old enum values to new ones via `ALTER TABLE ... USING (CASE ...)` before swapping the Postgres enum type. Either way, write the migration file by hand and hand it to the user for approval — **`prisma migrate dev` can't run non-interactively here, and applying anything yourself is forbidden.** **Always check existing row data first** (`docker exec reforma-postgres psql -U reforma -d reforma_db -c "SELECT ..."`) — this project has real user data in it, not just test fixtures.
- **Payment method is structured, not parsed from free text.** `Expense.formaPagamento` is the `FormaPagamento` enum (`PIX | CARTAO_CREDITO`) and `Expense.parcelas` is a nullable `Int`. Both are nullable because expenses created before the field existed don't have the information — those must render as "não informado" and must **never** be inferred from the free-text `observacao` (a prior iteration did that; it was replaced on purpose). In the real data, `PIX` rows always have `parcelas = NULL`.
- `Expense.data`, `Obra.dataInicio`/`dataTermino` and `RegistroObra.dataCaptura` are all stored as `@db.Date` (calendar date, no time/timezone). They're always read/written as UTC midnight of the intended date — see the frontend note below about why every date display must force `'UTC'` in Angular's `date` pipe, and why the frontend reconstructs dates as local midnight from the `YYYY-MM-DD` slice rather than `new Date(isoString)` when doing date arithmetic (`shared/utils/duracao.util.ts`).

### Backend — evolução da obra (file uploads)

This is the **only** part of the system that touches the filesystem. Before adding any other upload feature, reuse this design rather than inventing a second one.

- `EvolucaoModule` ([backend/src/evolucao/](backend/src/evolucao/)) exposes `GET/POST /evolucao/registros`, `GET/PATCH/DELETE /evolucao/registros/:id`, and `GET /evolucao/registros/:id/arquivo`.
- **Uploads use `FileInterceptor` from `@nestjs/platform-express`** (multer, already a transitive dependency — `@types/multer` is a devDependency). There is no `@nestjs/serve-static`, no `sharp`, no `ffmpeg`, and no server-side thumbnail generation; the frontend renders a video's first frame with `<video preload="metadata">` instead.
- **Files live on disk, not in the database**: `UPLOAD_DIR` (default `./uploads`) + the `evolucao/` subdirectory, created at runtime. `uploads/` is gitignored.
- **The stored filename is always generated by the server** (uuid + an extension derived from the *mimetype*), never from the user's filename — that one is kept only as the `arquivoNome` display metadata. On read and delete the path is rebuilt as `path.join(uploadDir, 'evolucao', basename(arquivoPath))`, which makes path traversal structurally impossible. There is a test covering `../../fora/abc.jpg`. Keep that property if you refactor.
- Accepted mimetypes and per-type size limits live in [backend/src/evolucao/midia.constants.ts](backend/src/evolucao/midia.constants.ts) (`MIDIAS_SUPORTADAS`: jpeg/png/webp/heic at 25 MB, mp4/quicktime/webm at 200 MB). The multer `fileFilter` rejects unsupported types with a Portuguese `BadRequestException` *before* writing anything to disk; the per-type limit is re-checked in the service, which deletes the file before throwing.
- **Serving uses `res.sendFile()` from Express**, specifically because Express implements HTTP Range — without it, video seeking doesn't work.
- `arquivoPath` is never exposed in API responses. Clients get only `url` (`/evolucao/registros/:id/arquivo`), which the frontend concatenates with `environment.apiUrl`.
- **`dataCaptura` (when the photo was taken) is a different field from `createdAt` (when it was uploaded)**, and `origemDataCaptura` (`EXIF | ARQUIVO | MANUAL`) records where the capture date came from so the UI can say how trustworthy it is. `PATCH` flips the origin to `MANUAL` whenever `dataCaptura` changes — otherwise a hand-corrected date would still claim to have come from the photo's EXIF.
- Known trade-offs, left in deliberately: an upload that passes the mimetype filter but fails body validation (or the insert) leaves an orphan file in `uploads/evolucao`; and a file over the global 200 MB multer cap surfaces as a 500 `MulterError` rather than a Portuguese 400.

### Frontend

- Standalone-component Angular app (no `NgModule`s) bootstrapped from [frontend/src/main.ts](frontend/src/main.ts) using [frontend/src/app/app.config.ts](frontend/src/app/app.config.ts), which wires `provideRouter`, `provideHttpClient`, `provideAnimationsAsync`, `provideNativeDateAdapter()`, and pins `LOCALE_ID`/`MAT_DATE_LOCALE` to `pt-BR` (with `registerLocaleData` for the `pt-BR` currency/date pipes).
- **[AppComponent](frontend/src/app/app.component.ts) is the AdminLTE-style shell**: a `mat-sidenav-container` with the nav menu in the sidenav and `<router-outlet>` inside `mat-sidenav-content`. It's the only place that triggers `ExpenseStoreService.carregarInicial()` (in `ngOnInit`), so every route can assume that store is already loading/loaded — feature pages don't re-trigger the initial fetch. The sidenav switches between `mode="side"` (desktop, always open) and `mode="over"` (mobile, closed by default) via `BreakpointObserver` on `Breakpoints.Handset`.
- Six routes, all lazy (`loadComponent`) via [app.routes.ts](frontend/src/app/app.routes.ts):
  - `/dashboard` ([DashboardComponent](frontend/src/app/features/dashboard/dashboard.component.ts)) — read-only overview: general budget indicator, specific-budget panels in read-only mode, obra duration card, summary cards, charts. **No** expense form.
  - `/despesas` ([ExpensesListComponent](frontend/src/app/features/expenses/expenses-list.component.ts)) — the only sidebar entry for expenses: filters, the "Adicionar despesa" button/dialog, and the table all live here. There is deliberately no separate "add expense" menu item, and no separate way to log a specific budget's spending — a despesa with that categoria *is* the spending.
  - `/formas-pagamento` ([PaymentMethodsComponent](frontend/src/app/features/payment-methods/payment-methods.component.ts)) — Pix vs. credit breakdown and installment distribution, all derived client-side from the same expense list.
  - `/evolucao` ([EvolucaoComponent](frontend/src/app/features/evolucao/evolucao.component.ts)) — the photo/video timeline; see below.
  - `/configuracoes/orcamento` ([OrcamentoConfigComponent](frontend/src/app/features/settings/orcamento-config/orcamento-config.component.ts)) — general budget form plus one `OrcamentoEspecificoPanelComponent` per specific budget in editable mode. These only set the *limit*, never the spending.
  - `/configuracoes/obra` ([ObraConfigComponent](frontend/src/app/features/settings/obra-config/obra-config.component.ts)) — start/end date form.
- **One signal store for expenses/budgets/obra**, [ExpenseStoreService](frontend/src/app/core/state/expense-store.service.ts) (`providedIn: 'root'`) — `Expense`s, all `Orcamento` values, categories, and obra dates. `store.expenses` is **always the full, unfiltered list**, the single source of truth for the dashboard (no filters), the payment-method page, the general budget math, *and* the specific budgets' spending. `ExpensesListComponent` keeps its own local `filtros` signal and a `computed()` that filters `store.expenses()` client-side; it doesn't call the backend's filter query params or mutate the store's list. There used to be a second store for Pedreiro/Tio Neguinho with their own gasto lists — it was merged into this one specifically to avoid a circular dependency (the general budget needs to sum the specific budgets' *allocations*, and the specific budgets need to filter the general expense list for their *spending* — two directions of the same store, so it has to be one service). Don't split them apart again.
- **`EvolucaoStoreService` is a separate store, and that is not a contradiction of the rule above.** The reason `ExpenseStoreService` had to be unified was a circular dependency; media has no such relationship with expenses or budgets. It is also too heavy for the boot-time `forkJoin` that every page pays for, so `/evolucao` loads it in its own `ngOnInit`. Keep new stores separate unless there's a genuine two-way dependency.
- **Specific-budget spending is derived, never stored separately.** `PEDREIRO`, `ELETRICISTA`, `TIO_NEGUINHO`, `MARCENEIRO` and `MARMOREIRO` are simultaneously values of `Categoria` (on `Expense`) and of `OrcamentoTipo`/`TipoOrcamentoEspecifico` (on `Orcamento`) — same string, on purpose. `ExpenseStoreService.totalGastoEspecifico(tipo)` filters `expenses()` by `categoria === tipo` and sums. This is the direct consequence of an explicit user requirement: cadastrar uma despesa com essa categoria já deve refletir automaticamente no orçamento específico, sem CRUD duplicado.
- **General vs. specific budget math is *not* symmetric — read this before changing either.** A specific budget works like a simple budget: `saldoEspecifico = orcamentoEspecifico - totalGastoEspecifico`, `percentualEspecificoConsumido = totalGastoEspecifico / orcamentoEspecifico * 100`. The **general** budget additionally has to account for money *earmarked* to the specific budgets, separately from money actually *spent*: `totalComprometido` is the sum of every specific budget's allocation (regardless of whether it's been spent yet), and `saldo = orcamento(GERAL) - totalComprometido - totalGasto` where `totalGasto` is the sum of **every** expense regardless of category. This means a Pedreiro expense is counted twice by design: once inside `totalComprometido` (as part of the allocation) and once inside `totalGasto` (as an expense) — that's intentional and matches the user's explicit worked example (allocating R$2.000 to Pedreiro then spending R$500 of it drops the general saldo by R$2.500, not R$500), not a bug to "fix" by netting them against each other.
- [BudgetIndicatorComponent](frontend/src/app/features/dashboard/components/budget-indicator/budget-indicator.component.ts) (dashboard, GERAL only, read-only) and [OrcamentoEspecificoPanelComponent](frontend/src/app/features/settings/orcamento-config/components/orcamento-especifico-panel/orcamento-especifico-panel.component.ts) (reused on the dashboard in read-only mode via `[editavel]="false"` and on the settings page in editable mode) both toggle an `.excedido`/`.budget-exceeded` class (border/text turn red) plus an "Orçamento excedido" banner on the same `saldo < 0` rule.
- **Currency inputs use [MoedaInputDirective](frontend/src/app/shared/directives/moeda-input.directive.ts)** (`appMoedaInput`, a full `ControlValueAccessor`), not `type="number"`. The bound FormControl's value is always a plain `number` (reais) — the directive only touches the `<input type="text">`'s displayed string ("1.500,50"). Live-formats while typing and pads to 2 decimals on blur. Every money field in the app uses this — don't add a plain `type="number"` money input again.
- **Obra duration is computed off calendar-date arithmetic, not raw `Date` instants** — see `shared/utils/duracao.util.ts` (`paraDataLocal`, `paraIsoLocal`, `hojeLocal`, `calcularDias`, `formatarDuracaoAmigavel`). Both endpoints of the diff are normalized to local midnight from their `YYYY-MM-DD` slice before subtracting, for the same reason as the `date` pipe UTC note below. New date helpers belong in this file, not in a new util.
- **`ExpenseStoreService.pronto` signal gates chart mounting** (`ExpenseChartsComponent` doesn't render any `<apx-chart>` until `pronto()` is true). This works around a real `ng-apexcharts`/Vite-dev-server race: `ng-apexcharts`'s `ChartComponent` reloads itself via a dynamic `import('apexcharts')` on every `ngOnChanges`, and if two chart-affecting signal updates land close together, overlapping create/destroy cycles can throw `"Element not found"`. `carregarInicial()` combines the requests into a single `forkJoin` so the charts mount exactly once, with final data, in one shot. [expense-charts.component.ts](frontend/src/app/features/dashboard/components/expense-charts/expense-charts.component.ts) also has an eager `import 'apexcharts'` side-effect import for the same reason, and keeps every `apx-chart` binding (`xaxis`, `legend`, etc.) as a memoized `computed()`/class field rather than an inline object literal or method call in the template — a fresh object reference on every change-detection pass would re-trigger the same race on an otherwise-idle page. If you touch this component, keep those bindings referentially stable.
- **Every ApexCharts text color is set explicitly** (`TEXTO_COR = '#1f2733'`, applied to `chart.foreColor`, `legend.labels.colors`, `xaxis`/`yaxis` `labels.style.colors`, `dataLabels.style.colors`, plus `tooltip.theme: 'light'`). This was a real bug — ApexCharts' own defaults picked low-contrast text against the white card backgrounds. Any new chart must set these the same way; don't rely on library defaults for text color.
- Any place that renders a `@db.Date` value (`Expense.data`, obra dates, `RegistroObra.dataCaptura`) with Angular's `date` pipe **must** pass `'UTC'` as the timezone argument (e.g. `despesa.data | date:'dd/MM/yyyy':'UTC':'pt-BR'`). The API returns those as UTC-midnight ISO strings; without forcing UTC, the pipe reinterprets that instant in the browser's local timezone and can display the wrong calendar day (this was a real bug). **The opposite holds for real timestamps** like `RegistroObra.createdAt` (the upload instant) — those must *not* force UTC, since local time is the correct display.
- `index.html` has `<base href="/" />` — required for the lazy routes to resolve their asset URLs correctly on a hard reload/deep link. Don't remove it.
- `environment.ts` / `environment.development.ts` both point `apiUrl` at `http://localhost:3000` (the Nest backend); production build swaps in `environment.ts` via the `fileReplacements` config in `angular.json`.

### Frontend — evolução da obra

- Files: [frontend/src/app/features/evolucao/](frontend/src/app/features/evolucao/) (page + `registro-card`, `registro-form-dialog`, `visualizador-dialog`), plus `core/models/registro-obra.model.ts`, `core/services/evolucao.service.ts`, `core/state/evolucao-store.service.ts`, `shared/utils/exif.util.ts`.
- **EXIF is parsed in the browser, by hand, with no library** ([shared/utils/exif.util.ts](frontend/src/app/shared/utils/exif.util.ts)). It reads only the first 256 KB of the `File`, locates the APP1 marker, respects the TIFF header's `II`/`MM` endianness, walks IFD0 and the Exif SubIFD (tag `0x8769`), and returns `DateTimeOriginal` (`0x9003`, falling back to `0x9004` then `0x0132`) as `YYYY-MM-DD`. It is fully defensive: any unexpected format returns `null` and it never throws. A library was deliberately not added because of the pinned Node 18 / Angular 19 constraint.
- Capture-date fallback chain: **EXIF -> `file.lastModified` -> today**, and the user can always override it in the form. Overriding sets `origemDataCaptura` to `MANUAL`. The UI shows the origin in plain language ("data detectada na foto" / "data do arquivo" / "data informada por você") — never the raw enum string.
- Uploads use `HttpClient.post(..., { reportProgress: true, observe: 'events' })` for a real determinate progress bar. Never set `Content-Type` manually on the `FormData` request — the browser must generate the multipart boundary.
- The timeline groups records by capture day; the lightbox/`visualizador-dialog` receives a single record (it has no prev/next navigation — adding it would change the dialog's data contract).

### Shared UI conventions

- Component style files default to `.scss` (set in `angular.json` schematics). Global Material theming lives in [frontend/src/styles.scss](frontend/src/styles.scss) using the M3 `mat.theme(...)` mixin (azure primary / orange tertiary).
- `styles.scss` is also the **design-token and shared-class source of truth**. Tokens: `--radius-sm/md/lg`, `--shadow-xs/sm/md`, `--color-text-primary/secondary/muted`, `--color-border`, `--color-hover`, `--color-success/danger/info/accent` (each with `-bg`, some with `-border`). Shared classes: `.page-header`, `.page-header-title`, `.page-header-icon`, `.page-subtitle`, `.cards-grid`, `.summary-card`, `.card-body/-label/-value/-hint`, `.icon-badge` (+ `.success/.danger/.accent`), `.status-pill` (+ `.ok/.danger/.info`), `.section-label`, `.category-chip`, `.empty-state`, `.metrics-grid`, `.metric-label/-value`, `.acoes-linha`, `.visualizador-panel`. Reuse these instead of inventing new ones; only promote a style to `styles.scss` when more than one component genuinely needs it.
- **Row actions (edit/delete icons) use `.acoes-linha`** — a flex row with `gap: 4px`, right-aligned and `white-space: nowrap`. Without it the two `mat-icon-button`s stack vertically once the table gets crowded (this was a real bug). Any new list with icon actions must use it. Keep `color="warn"` on delete and a `matTooltip` on both.
- **The expenses table is responsive via a container query, not a media query** ([expense-table.component.scss](frontend/src/app/features/expenses/components/expense-table/expense-table.component.scss)). The card declares `container-type: inline-size` because the available width depends on the sidenav, not the viewport — at a 768px viewport the content area is only ~470px, so a `@media` rule would fire at the wrong moment. Below 1000px of *card* width the table scrolls horizontally with edge shadows and a "deslize a tabela" hint; below 700px each expense becomes a card, with column labels supplied by `[attr.data-label]` in the template (no component logic involved). `thead`/`tbody` are created at runtime by `mat-table` and don't carry the style-encapsulation attribute, which is why those rules need `:host ::ng-deep`.
- Table columns for despesas: Data, Descrição (+ observação), Categoria, Valor, Forma de pagamento, Parcelas, Ações. The payment-method chip is an *outlined* variant (white background, tinted icon only) so it doesn't compete visually with the filled blue `.category-chip` next to it. Pix rows show an em-dash for parcelas in `--color-text-muted`; credit shows `3x`.
- Dialogs use `MatDialog`; destructive actions go through [shared/components/confirm-dialog](frontend/src/app/shared/components/confirm-dialog/confirm-dialog.component.ts); feedback is a `MatSnackBar`.
- Every list screen implements four states in the same shape (see `expense-table.component.html` as the reference): loading spinner, error with a "Tentar novamente" button, empty via `.empty-state`, and content. When applying these to a `mat-card-content`, wrap them in an inner `<div>` — `.mat-mdc-card-content { display: block }` beats the cascade and would kill a `display: flex` applied directly to it.

### Cross-cutting

- Backend and frontend are deployed/run independently; the only coupling is the REST API surface at `http://localhost:3000` (documented live via Swagger at `/docs`), CORS trusting `http://localhost:4200`, and the media files the backend streams from `uploads/`.
- Currency values cross the API boundary as plain JSON numbers (reais, not cents) — see the `SerializedExpense` note above. The frontend formats them with Angular's `currency` pipe (`'BRL':'symbol':'1.2-2':'pt-BR'`).
