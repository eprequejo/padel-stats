import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataService {

  constructor(private http: HttpClient) {}

  getPlayers(): Observable<any> {
    return this.http.get<any>(`assets/players.json`); // ✅ Uses correct path
  }

  getMatches(): Observable<any> {
    return this.http.get('/assets/matches.json');
  }
}
