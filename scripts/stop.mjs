#!/usr/bin/env node
/**
 * Encerra o backend e o frontend de dev deste repositório.
 *
 * Matar só quem está escutando nas portas 3000/4200 não basta: `nest start
 * --watch` e `ng serve` rodam como processo pai + filho, e o pai sobrevive ao
 * kill da porta — voltando a subir o servidor na próxima alteração de arquivo.
 * Por isso, além das portas, este script mata todo processo node cuja linha de
 * comando aponta para ESTE diretório do repositório.
 *
 * O filtro pelo caminho do repositório é proposital: processos node do usuário
 * que não têm nada a ver com o projeto nunca são tocados.
 *
 * O container do Postgres NÃO é encerrado — ver Artigo 3 da CONSTITUTION.md.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORTAS = [3000, 4200];
const ehWindows = process.platform === 'win32';

function rodar(comando, args) {
  try {
    return execFileSync(comando, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

/** PIDs escutando nas portas de dev. */
function pidsPorPorta() {
  const pids = new Set();
  for (const porta of PORTAS) {
    if (ehWindows) {
      for (const linha of rodar('netstat', ['-ano']).split('\n')) {
        if (!linha.includes('LISTENING') || !linha.includes(`:${porta} `)) continue;
        const pid = linha.trim().split(/\s+/).pop();
        if (pid && pid !== '0') pids.add(pid);
      }
    } else {
      for (const pid of rodar('lsof', ['-ti', `tcp:${porta}`]).split('\n')) {
        if (pid.trim()) pids.add(pid.trim());
      }
    }
  }
  return pids;
}

/** PIDs de processos node cuja linha de comando cita este repositório. */
function pidsDoRepositorio() {
  const pids = new Set();
  const alvo = RAIZ.toLowerCase();

  if (ehWindows) {
    const saida = rodar('powershell', [
      '-NoProfile',
      '-Command',
      "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | ForEach-Object { \"$($_.ProcessId)|$($_.CommandLine)\" }",
    ]);
    for (const linha of saida.split('\n')) {
      const separador = linha.indexOf('|');
      if (separador < 0) continue;
      const pid = linha.slice(0, separador).trim();
      const cmd = linha.slice(separador + 1).toLowerCase();
      // O próprio script roda sob node — não se auto-mate.
      if (pid && pid !== String(process.pid) && cmd.includes(alvo) && !cmd.includes('stop.mjs')) {
        pids.add(pid);
      }
    }
  } else {
    for (const pid of rodar('pgrep', ['-f', RAIZ]).split('\n')) {
      const limpo = pid.trim();
      if (limpo && limpo !== String(process.pid)) pids.add(limpo);
    }
  }
  return pids;
}

function matar(pid) {
  if (ehWindows) rodar('taskkill', ['/PID', pid, '/T', '/F']);
  else rodar('kill', ['-9', pid]);
}

const alvos = new Set([...pidsPorPorta(), ...pidsDoRepositorio()]);

if (alvos.size === 0) {
  console.log('Nada rodando — portas 3000/4200 livres e nenhum processo do repositório ativo.');
} else {
  for (const pid of alvos) matar(pid);
  console.log(`Encerrados ${alvos.size} processo(s): ${[...alvos].join(', ')}`);
}

// Conferência final: se algo ainda estiver escutando, falhe de forma visível em
// vez de deixar o usuário achar que parou tudo.
const restantes = pidsPorPorta();
if (restantes.size > 0) {
  console.error(`ATENÇÃO: ainda há processo escutando em 3000/4200: ${[...restantes].join(', ')}`);
  process.exit(1);
}
console.log('Postgres continua rodando (proposital — os dados vivem no volume reforma_postgres_data).');
