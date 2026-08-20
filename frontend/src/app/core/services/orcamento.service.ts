import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Orcamento, OrcamentoTipo } from '../models/orcamento.model';

@Injectable({ providedIn: 'root' })
export class OrcamentoService {
  private readonly baseUrl = `${environment.apiUrl}/orcamento`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<Orcamento[]> {
    return this.http.get<Orcamento[]>(this.baseUrl);
  }

  atualizar(tipo: OrcamentoTipo, valor: number): Observable<Orcamento> {
    return this.http.put<Orcamento>(`${this.baseUrl}/${tipo}`, { valor });
  }
}
