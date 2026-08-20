import { Directive, ElementRef, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Extrai a parte inteira e decimal (no máximo 2 dígitos) de um texto digitado
 * livremente, ignorando qualquer caractere que não seja dígito ou a primeira
 * vírgula encontrada.
 */
function tokenizar(bruto: string): {
  inteiro: string;
  decimal: string;
  temVirgula: boolean;
} {
  let inteiro = '';
  let decimal = '';
  let temVirgula = false;
  for (const ch of bruto) {
    if (ch >= '0' && ch <= '9') {
      if (temVirgula) {
        if (decimal.length < 2) decimal += ch;
      } else {
        inteiro += ch;
      }
    } else if (ch === ',' && !temVirgula) {
      temVirgula = true;
    }
  }
  inteiro = inteiro.replace(/^0+(?=\d)/, '');
  return { inteiro, decimal, temVirgula };
}

function paraNumero(bruto: string): number {
  const { inteiro, decimal } = tokenizar(bruto);
  if (!inteiro && !decimal) return 0;
  return Number(`${inteiro || '0'}.${decimal.padEnd(2, '0')}`);
}

function formatarParcial(bruto: string): string {
  const { inteiro, decimal, temVirgula } = tokenizar(bruto);
  const inteiroFormatado = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return temVirgula ? `${inteiroFormatado || '0'},${decimal}` : inteiroFormatado;
}

function formatarCompleto(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Máscara de moeda (padrão brasileiro, ex: "1.500,50") para inputs de texto.
 * O FormControl associado guarda o valor NUMÉRICO real (reais, não centavos,
 * sem formatação) — só a exibição no input é mascarada. Uso:
 *   <input matInput type="text" inputmode="decimal" appMoedaInput formControlName="valor" />
 */
@Directive({
  selector: 'input[appMoedaInput]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MoedaInputDirective),
      multi: true,
    },
  ],
  host: {
    '(input)': 'onInput($event)',
    '(blur)': 'onBlur()',
  },
})
export class MoedaInputDirective implements ControlValueAccessor {
  private readonly el = inject(ElementRef<HTMLInputElement>);
  private onChange: (valor: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(valor: number | null): void {
    this.el.nativeElement.value =
      valor === null || valor === undefined ? '' : formatarCompleto(valor);
  }

  registerOnChange(fn: (valor: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.el.nativeElement.disabled = isDisabled;
  }

  onInput(event: Event): void {
    const bruto = (event.target as HTMLInputElement).value;
    this.el.nativeElement.value = formatarParcial(bruto);
    this.onChange(bruto.trim() ? paraNumero(bruto) : null);
  }

  onBlur(): void {
    this.onTouched();
    const bruto = this.el.nativeElement.value;
    if (!bruto.trim()) return;
    const numero = paraNumero(bruto);
    this.el.nativeElement.value = formatarCompleto(numero);
    this.onChange(numero);
  }
}
