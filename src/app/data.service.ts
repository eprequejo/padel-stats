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
    return this.http.get<Array<Match>>('/assets/matches.json');
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
        frGlobal: 0,
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

  getPlayerPairsWithEffectiveness(playerId: number): Array<{ name: string; effectiveness: number, played: number }> {
    if (this.matches.length === 0) return [];
  
    const pairsMap: { [key: number]: { won: number; played: number } } = {};
  
    this.matches.forEach(match => {
      if (match.jugador_1 === playerId || match.jugador_2 === playerId) {
        const partnerId = match.jugador_1 === playerId ? match.jugador_2 : match.jugador_1;
  
        // Initialize the partner if not present
        if (!pairsMap[partnerId]) {
          pairsMap[partnerId] = { won: 0, played: 0 };
        }
  
        // Count matches played together
        pairsMap[partnerId].played++;
  
        // If the match was won by the team, increase win count
        if (match.resultado) {
          pairsMap[partnerId].won++;
        }
      }
    });
  
    return Object.entries(pairsMap).map(([partnerId, stats]) => {
      const partnerName = this.players.find(player => player.id === Number(partnerId))?.nombre || "Desconocido";
      const effectiveness = stats.played > 0 ? (stats.won / stats.played) * 100 : 0;
  
      return {
        name: partnerName,
        effectiveness: effectiveness,
        played: stats.played
      };
    });
  }

  calculatePlayerStats(playerId: number): Stats {
    let stats: Stats = { won: 0, lost: 0, played: 0 };
  
    this.matches.forEach((match: Match) => {
      const isPlayerInMatch = match.jugador_1 === playerId || match.jugador_2 === playerId;
  
      if (isPlayerInMatch) {
        stats.played++;
  
        // Si ganó el equipo y el jugador estaba en él
        if (match.resultado && (match.jugador_1 === playerId || match.jugador_2 === playerId)) {
          stats.won++;
        } else if (!match.resultado && (match.jugador_1 === playerId || match.jugador_2 === playerId)) {
          stats.lost++;
        }
      }
    });
  
    return stats;
  }
  
}
