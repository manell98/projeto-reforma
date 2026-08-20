import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CategoriaOption,
  Expense,
  ExpensePayload,
} from '../models/expense.model';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly baseUrl = `${environment.apiUrl}/expenses`;

  constructor(private readonly http: HttpClient) {}

  getCategorias(): Observable<CategoriaOption[]> {
    return this.http.get<CategoriaOption[]>(`${this.baseUrl}/categorias`);
  }

  getAll(): Observable<Expense[]> {
    return this.http.get<Expense[]>(this.baseUrl);
  }

  create(payload: ExpensePayload): Observable<Expense> {
    return this.http.post<Expense>(this.baseUrl, payload);
  }

  update(id: string, payload: ExpensePayload): Observable<Expense> {
    return this.http.patch<Expense>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
