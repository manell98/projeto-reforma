import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EvolucaoStoreService } from '../../core/state/evolucao-store.service';
import { RegistroObra } from '../../core/models/registro-obra.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { RegistroCardComponent } from './components/registro-card/registro-card.component';
import {
  RegistroFormDialogComponent,
  RegistroFormDialogData,
  ResultadoLoteEnvio,
} from './components/registro-form-dialog/registro-form-dialog.component';
import {
  VisualizadorDialogComponent,
  VisualizadorDialogData,
} from './components/visualizador-dialog/visualizador-dialog.component';

@Component({
  selector: 'app-evolucao',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RegistroCardComponent,
  ],
  templateUrl: './evolucao.component.html',
  styleUrl: './evolucao.component.scss',
})
export class EvolucaoComponent implements OnInit {
  readonly store = inject(EvolucaoStoreService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  // A carga acontece aqui, e não no AppComponent: a lista de mídias só
  // interessa a esta tela e não deve pesar no boot das demais.
  ngOnInit(): void {
    this.store.carregar();
  }

  // --- Álbuns por dia -----------------------------------------------------
  // Cada dia da timeline começa recolhido (visual de álbum); clicar no
  // cabeçalho expande/recolhe. Estado puramente de UI, não vem da store.
  private readonly _diasExpandidos = signal<ReadonlySet<string>>(new Set());

  estaExpandido(data: string): boolean {
    return this._diasExpandidos().has(data);
  }

  alternarDia(data: string): void {
    this._diasExpandidos.update((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(data)) {
        proximo.delete(data);
      } else {
        proximo.add(data);
      }
      return proximo;
    });
  }

  novoRegistro(): void {
    this.abrirFormulario(null);
  }

  editar(registro: RegistroObra): void {
    this.abrirFormulario(registro);
  }

  // `registros` é a lista do mesmo álbum/dia do item clicado (na ordem
  // exibida em tela) — permite ao visualizador navegar entre eles com as
  // setas do teclado, sem precisar recarregar nada.
  abrir(registro: RegistroObra, registros: RegistroObra[]): void {
    const indiceInicial = registros.findIndex((item) => item.id === registro.id);
    this.dialog.open<VisualizadorDialogComponent, VisualizadorDialogData>(
      VisualizadorDialogComponent,
      {
        data: { registros, indiceInicial: Math.max(0, indiceInicial) },
        panelClass: 'visualizador-panel',
        backdropClass: 'visualizador-backdrop',
        maxWidth: '92vw',
      },
    );
  }

  excluir(registro: RegistroObra): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        titulo: 'Excluir registro',
        mensagem: `Tem certeza que deseja excluir "${
          registro.titulo || registro.arquivoNome
        }"? O arquivo também será removido e essa ação não pode ser desfeita.`,
        textoConfirmar: 'Excluir',
      },
    });

    ref.afterClosed().subscribe((confirmado) => {
      if (!confirmado) return;
      this.store.remover(registro.id).subscribe({
        next: () => {
          this.store.removerLocal(registro.id);
          this.snackBar.open('Registro excluído.', 'Fechar', {
            duration: 3000,
          });
        },
        error: () =>
          this.snackBar.open('Não foi possível excluir o registro.', 'Fechar', {
            duration: 4000,
          }),
      });
    });
  }

  private abrirFormulario(registro: RegistroObra | null): void {
    const ref = this.dialog.open<
      RegistroFormDialogComponent,
      RegistroFormDialogData,
      RegistroObra | ResultadoLoteEnvio
    >(RegistroFormDialogComponent, { data: { registro } });

    ref.afterClosed().subscribe((salvo) => {
      if (!salvo) return;

      if (registro) {
        // Edição: sempre um único registro, os arquivos não mudam.
        this.store.atualizarLocal(salvo as RegistroObra);
        this.snackBar.open('Registro atualizado com sucesso.', 'Fechar', {
          duration: 3000,
        });
        return;
      }

      // Criação: pode ter sido um ou vários arquivos, e o lote pode ter
      // falhado parcialmente — cada sucesso já entrou na store durante o
      // próprio upload, então só resta relatar o resultado ao usuário.
      const { enviados, falhas } = salvo as ResultadoLoteEnvio;
      if (enviados.length > 0) {
        const mensagem =
          enviados.length === 1
            ? 'Registro adicionado à evolução da obra.'
            : `${enviados.length} registros adicionados à evolução da obra.`;
        this.snackBar.open(mensagem, 'Fechar', { duration: 3000 });
      }
      if (falhas.length > 0) {
        this.snackBar.open(
          `Falha ao enviar: ${falhas.join(', ')}.`,
          'Fechar',
          { duration: 6000 },
        );
      }
    });
  }
}
