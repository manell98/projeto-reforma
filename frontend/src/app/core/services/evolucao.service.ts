import { HttpClient, HttpEvent } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AtualizacaoRegistroObra,
  NovoRegistroObra,
  RegistroObra,
} from '../models/registro-obra.model';

@Injectable({ providedIn: 'root' })
export class EvolucaoService {
  private readonly baseUrl = `${environment.apiUrl}/evolucao/registros`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<RegistroObra[]> {
    return this.http.get<RegistroObra[]>(this.baseUrl);
  }

  /**
   * Upload multipart com acompanhamento de progresso. O Content-Type não é
   * definido aqui de propósito: o navegador precisa montá-lo junto com o
   * boundary do FormData.
   */
  criar(novo: NovoRegistroObra): Observable<HttpEvent<RegistroObra>> {
    const formData = new FormData();
    formData.append('arquivo', novo.arquivo, novo.arquivo.name);
    formData.append('dataCaptura', novo.dataCaptura);
    formData.append('origemDataCaptura', novo.origemDataCaptura);
    if (novo.titulo) {
      formData.append('titulo', novo.titulo);
    }
    if (novo.descricao) {
      formData.append('descricao', novo.descricao);
    }

    return this.http.post<RegistroObra>(this.baseUrl, formData, {
      reportProgress: true,
      observe: 'events',
    });
  }

  atualizar(
    id: string,
    dados: AtualizacaoRegistroObra,
  ): Observable<RegistroObra> {
    return this.http.patch<RegistroObra>(`${this.baseUrl}/${id}`, dados);
  }

  remover(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  urlArquivo(registro: RegistroObra): string {
    return `${environment.apiUrl}${registro.url}`;
  }
}
