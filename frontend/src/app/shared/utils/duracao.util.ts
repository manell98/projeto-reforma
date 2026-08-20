const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Converte uma data-string ISO (ex: "2026-04-15T00:00:00.000Z") em um Date
 * local à meia-noite, usando só a parte "YYYY-MM-DD". Evita o mesmo problema
 * de fuso horário do `Expense.data`: interpretar o instante UTC diretamente
 * pode jogar a data um dia para trás/frente dependendo do fuso do navegador.
 */
export function paraDataLocal(dataIso: string): Date {
  const [ano, mes, dia] = dataIso.slice(0, 10).split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

export function hojeLocal(): Date {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
}

export function calcularDias(inicio: Date, fim: Date): number {
  return Math.max(0, Math.round((fim.getTime() - inicio.getTime()) / MS_POR_DIA));
}

export function formatarDuracaoAmigavel(dias: number): string {
  if (dias < 30) {
    return `${dias} dia${dias === 1 ? '' : 's'}`;
  }
  const meses = Math.floor(dias / 30);
  const diasRestantes = dias % 30;
  const partes = [`${meses} ${meses === 1 ? 'mês' : 'meses'}`];
  if (diasRestantes > 0) {
    partes.push(`${diasRestantes} dia${diasRestantes === 1 ? '' : 's'}`);
  }
  return partes.join(' e ');
}
