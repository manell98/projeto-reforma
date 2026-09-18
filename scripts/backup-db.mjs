#!/usr/bin/env node
/**
 * Faz um backup lógico (pg_dump) do banco Postgres do container
 * reforma-postgres e salva em backups/reforma-<data>-<hora>.sql.
 *
 * Só executa pg_dump (leitura) — nunca escreve no banco. As credenciais são
 * lidas de backend/.env, nunca hardcoded aqui.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAMINHO_ENV = path.join(RAIZ, 'backend', '.env');
const DIR_BACKUPS = path.join(RAIZ, 'backups');
const CONTAINER = 'reforma-postgres';

// Limite de backups mantidos no disco: um por execução manual não deve
// crescer sem limite no disco do usuário. 30 dá margem para várias semanas
// de backups diários sem exigir poda manual.
const MAX_BACKUPS = 30;

/** Lê backend/.env e devolve um mapa chave -> valor (parser simples, só o suficiente para esse arquivo). */
function lerEnv(caminho) {
  const conteudo = readFileSync(caminho, 'utf8');
  const variaveis = {};
  for (const linha of conteudo.split('\n')) {
    const semComentario = linha.trim();
    if (!semComentario || semComentario.startsWith('#')) continue;
    const separador = semComentario.indexOf('=');
    if (separador < 0) continue;
    const chave = semComentario.slice(0, separador).trim();
    let valor = semComentario.slice(separador + 1).trim();
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }
    variaveis[chave] = valor;
  }
  return variaveis;
}

if (!existsSync(CAMINHO_ENV)) {
  console.error(
    'ERRO: backend/.env não encontrado.\n' +
      'Rode "cp backend/.env.example backend/.env" (ajustando as senhas se quiser) antes de fazer o backup.',
  );
  process.exit(1);
}

const env = lerEnv(CAMINHO_ENV);
const usuario = env.POSTGRES_USER;
const banco = env.POSTGRES_DB;

if (!usuario || !banco) {
  console.error(
    'ERRO: backend/.env existe mas não define POSTGRES_USER e/ou POSTGRES_DB.\n' +
      'Confira o arquivo contra backend/.env.example e preencha os valores faltantes.',
  );
  process.exit(1);
}

if (!existsSync(DIR_BACKUPS)) {
  mkdirSync(DIR_BACKUPS, { recursive: true });
}

const agora = new Date();
const pad = (n) => String(n).padStart(2, '0');
const data = `${agora.getFullYear()}-${pad(agora.getMonth() + 1)}-${pad(agora.getDate())}`;
const hora = `${pad(agora.getHours())}${pad(agora.getMinutes())}${pad(agora.getSeconds())}`;
const nomeArquivo = `reforma-${data}-${hora}.sql`;
const caminhoArquivo = path.join(DIR_BACKUPS, nomeArquivo);

console.log(`Gerando dump de "${banco}" (usuário "${usuario}") via docker exec ${CONTAINER}...`);

let saida;
try {
  saida = execFileSync('docker', ['exec', CONTAINER, 'pg_dump', '-U', usuario, '-d', banco], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 1024,
  });
} catch (erro) {
  console.error(
    `ERRO: falha ao executar pg_dump no container "${CONTAINER}".\n` +
      'Confirme que o Postgres está rodando ("docker ps" deve mostrar reforma-postgres healthy; ' +
      'se não estiver, rode "npm run db:up").\n' +
      `Detalhe: ${erro.message}`,
  );
  process.exit(1);
}

writeFileSync(caminhoArquivo, saida, 'utf8');

// Prova de que o dump não está vazio/corrompido antes de reportar sucesso.
const tamanho = statSync(caminhoArquivo).size;
if (tamanho === 0 || !saida.includes('PostgreSQL database dump')) {
  unlinkSync(caminhoArquivo);
  console.error(
    'ERRO: o dump gerado está vazio ou não contém o cabeçalho esperado do pg_dump ' +
      '("PostgreSQL database dump"). O arquivo parcial foi removido.',
  );
  process.exit(1);
}

console.log(`Backup criado: ${path.relative(RAIZ, caminhoArquivo)} (${tamanho} bytes)`);

// Poda: mantém só os MAX_BACKUPS mais recentes, apagando os mais antigos.
const backups = readdirSync(DIR_BACKUPS)
  .filter((nome) => /^reforma-\d{4}-\d{2}-\d{2}-\d{6}\.sql$/.test(nome))
  .sort();

const excedentes = backups.length - MAX_BACKUPS;
if (excedentes > 0) {
  const antigos = backups.slice(0, excedentes);
  for (const nome of antigos) {
    unlinkSync(path.join(DIR_BACKUPS, nome));
  }
  console.log(`Poda: removidos ${antigos.length} backup(s) além dos ${MAX_BACKUPS} mais recentes.`);
}
