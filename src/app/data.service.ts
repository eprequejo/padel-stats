import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Match, Player, Stats } from './models';

@Injectable({
  providedIn: 'root',
})
export class DataService {

  totalMatches: number = 16; // fallback

  constructor(private http: HttpClient) {
    this.loadConfig();
  }

  getPlayers(): Observable<Array<Player>> {
    return this.http.get<Array<Player>>(`assets/players.json`);
  }

  getMatches(): Observable<Array<Match>> {
    return this.http.get<Array<Match>>('assets/matches.json');
  }

  loadConfig(): void {
    this.http.get<any>('assets/config.json').subscribe(config => {
      this.totalMatches = config.totalMatches;
    });
  }

}
