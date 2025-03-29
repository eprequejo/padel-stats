import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Match, Player, Stats } from './models';

@Injectable({
  providedIn: 'root',
})
export class DataService {

  private matches: Array<Match> = []; // Almacenamos los partidos localmente
  private players: Array<Player> = []; // Almacenamos los jugadores

  constructor(private http: HttpClient) {
    this.loadMatches();
    this.loadPlayers();
  }

  getPlayers(): Observable<Array<Player>> {
    return this.http.get<Array<Player>>(`assets/players.json`);
  }

  getMatches(): Observable<Array<Match>> {
    return this.http.get<Array<Match>>('assets/matches.json');
  }

  loadMatches(): void {
    this.getMatches().subscribe((data) => {
      this.matches = data;
    });
  }

  loadPlayers(): void {
    this.getPlayers().subscribe((data) => {
      this.players = data;
      this.players = this.players.map(player => ({
        ...player,
        ganados: 0,
        perdidos: 0,
        jugados: 0,
        frGlobal: { frGlobal: 0, label: "", color: "" },
        rankingOHUPadel: 0,
        effectiveness: 0,
        pairs: []
      }));
    });
  }

  getPairsForPlayer(playerId: number): string[] {
    if (this.matches.length === 0) return []; // Si aún no cargaron los partidos, retorna vacío
    const pairs = new Set<string>(); // Usamos un Set para evitar duplicados
    this.matches.forEach(match => {
      if (match.jugador_1 === playerId) {
        pairs.add(this.getPlayerNameById(match.jugador_2));
      } else if (match.jugador_2 === playerId) {
        pairs.add(this.getPlayerNameById(match.jugador_1));
      }
    });
    return Array.from(pairs);
  }

  getPlayerNameById(playerId: number): string {
    const player = this.players.find(p => p.id === playerId);
    return player ? `${player.nombre} ${player.apellidos}` : "Desconocido";
  }

}
