import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EvolucaoStoreService } from '../../../../core/state/evolucao-store.service';
import {
  ORIGEM_DATA_CAPTURA_LABELS,
  RegistroObra,
} from '../../../../core/models/registro-obra.model';

export interface VisualizadorDialogData {
  registro: RegistroObra;
}

@Component({
  selector: 'app-visualizador-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './visualizador-dialog.component.html',
  styleUrl: './visualizador-dialog.component.scss',
})
export class VisualizadorDialogComponent {
  private readonly store = inject(EvolucaoStoreService);
  readonly dialogRef = inject(MatDialogRef<VisualizadorDialogComponent>);
  readonly data = inject<VisualizadorDialogData>(MAT_DIALOG_DATA);

  readonly registro = this.data.registro;
  readonly url = computed(() => this.store.urlArquivo(this.registro));
  readonly origemLabel = ORIGEM_DATA_CAPTURA_LABELS[
    this.registro.origemDataCaptura
  ];
}
