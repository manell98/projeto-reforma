import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Obra, ObraPayload } from '../models/obra.model';

@Injectable({ providedIn: 'root' })
export class ObraService {
  private readonly baseUrl = `${environment.apiUrl}/obra`;

  constructor(private readonly http: HttpClient) {}

  obter(): Observable<Obra> {
    return this.http.get<Obra>(this.baseUrl);
  }

  atualizar(payload: ObraPayload): Observable<Obra> {
    return this.http.put<Obra>(this.baseUrl, payload);
  }
}
