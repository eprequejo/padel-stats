import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Match, Player, Stats } from './models';

@Injectable({
  providedIn: 'root',
})
export class DataService {

  totalMatches: number = 16; // fallback

  constructor(private http: HttpClient) {}

  getPlayers(season: string): Observable<Array<Player>> {
    return this.http.get<Array<Player>>(`assets/${season}/players.json`);
  }

  getMatches(season: string): Observable<Array<Match>> {
    return this.http.get<Array<Match>>(`assets/${season}/matches.json`);
  }

  loadConfig(season: string): Observable<any> {
    return this.http.get<any>(`assets/${season}/config.json`);
  }

}
