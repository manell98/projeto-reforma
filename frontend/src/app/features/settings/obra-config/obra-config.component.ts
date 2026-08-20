import { Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { ExpenseStoreService } from '../../../core/state/expense-store.service';

function paraIso(data: Date | null): string | null {
  if (!data) return null;
  return [
    data.getFullYear(),
    String(data.getMonth() + 1).padStart(2, '0'),
    String(data.getDate()).padStart(2, '0'),
  ].join('-');
}

@Component({
  selector: 'app-obra-config',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './obra-config.component.html',
  styleUrl: './obra-config.component.scss',
})
export class ObraConfigComponent {
  readonly store = inject(ExpenseStoreService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly salvando = signal(false);

  readonly form = this.fb.nonNullable.group({
    dataInicio: null as Date | null,
    dataTermino: null as Date | null,
  });

  private jaPreenchido = false;

  constructor() {
    effect(() => {
      if (this.store.pronto() && !this.jaPreenchido) {
        this.jaPreenchido = true;
        const obra = this.store.obra();
        this.form.patchValue({
          dataInicio: obra.dataInicio
            ? new Date(`${obra.dataInicio.slice(0, 10)}T00:00:00`)
            : null,
          dataTermino: obra.dataTermino
            ? new Date(`${obra.dataTermino.slice(0, 10)}T00:00:00`)
            : null,
        });
      }
    });
  }

  salvar(): void {
    const valores = this.form.getRawValue();
    const payload = {
      dataInicio: paraIso(valores.dataInicio),
      dataTermino: paraIso(valores.dataTermino),
    };

    this.salvando.set(true);
    this.store
      .atualizarObra(payload)
      .pipe(finalize(() => this.salvando.set(false)))
      .subscribe({
        next: (obra) => {
          this.store.definirObraLocal(obra);
          this.snackBar.open(
            'Datas da obra atualizadas com sucesso.',
            'Fechar',
            { duration: 3000 },
          );
        },
        error: () =>
          this.snackBar.open(
            'Não foi possível atualizar as datas da obra.',
            'Fechar',
            { duration: 4000 },
          ),
      });
  }
}
