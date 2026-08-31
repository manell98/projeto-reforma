import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
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

  novoRegistro(): void {
    this.abrirFormulario(null, 'Registro adicionado à evolução da obra.');
  }

  editar(registro: RegistroObra): void {
    this.abrirFormulario(registro, 'Registro atualizado com sucesso.');
  }

  abrir(registro: RegistroObra): void {
    this.dialog.open<VisualizadorDialogComponent, VisualizadorDialogData>(
      VisualizadorDialogComponent,
      {
        data: { registro },
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

  private abrirFormulario(
    registro: RegistroObra | null,
    mensagemSucesso: string,
  ): void {
    const ref = this.dialog.open<
      RegistroFormDialogComponent,
      RegistroFormDialogData,
      RegistroObra
    >(RegistroFormDialogComponent, { data: { registro } });

    ref.afterClosed().subscribe((salvo) => {
      if (!salvo) return;
      // A criação já entra na lista dentro da store (durante o upload); a
      // edição atualiza o item existente aqui.
      if (registro) {
        this.store.atualizarLocal(salvo);
      }
      this.snackBar.open(mensagemSucesso, 'Fechar', { duration: 3000 });
    });
  }
}
