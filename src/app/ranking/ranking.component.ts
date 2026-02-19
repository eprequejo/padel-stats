import { Component, OnInit } from '@angular/core';
import { DataService } from '../data.service';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Match, Pair, Player, Stats } from '../models';
import { SearchService } from '../search.service';

@Component({
  selector: 'app-ranking',
  standalone: true,
  templateUrl: './ranking.component.html',
  imports: [CommonModule, HttpClientModule, FormsModule],
  styleUrls: ['./ranking.component.css'],
})
export class RankingComponent implements OnInit {

  players: Array<Player> = [];
  searchText: string = "";
  sortColumn: string = 'factorRendimiento'; // ✅ Ordenar por efectividad por defecto
  sortAsc: boolean = false; // ✅ Orden descendente
  totalMatches: number = 0; // ✅ Total de enfrentamientos por equipo to config file
  teamWinRate: number = 0; // ✅ Tasa de victorias del equipo

  FR_GLOBAL_MIN = 0;
  FR_GLOBAL_MAX = 0;

  ln = Math.log;
  log10 = Math.log10;

  constructor(
    private dataService: DataService,
    private searchService: SearchService) { }

  ngOnInit(): void {

    this.totalMatches = this.dataService.totalMatches;
    this.FR_GLOBAL_MAX = this.fRGlobal(this.totalMatches, this.totalMatches, this.totalMatches);
    this.FR_GLOBAL_MIN = this.fRGlobal(0, this.totalMatches, this.totalMatches);

    this.searchService.searchText$.subscribe(text => {
      this.searchText = text.toLowerCase();
      this.getFilteredSortedPlayers();
    });

    this.dataService.getPlayers().subscribe((players) => {
      this.dataService.getMatches().subscribe((matches) => {
        this.players = this.calculateMetrics(matches, players);
        this.assignRanking();
        this.calculateTeamWinRate(matches);
      });
    });
  }

  calculateMetrics(matches: Array<Match>, players: Array<Player>): Array<Player> {

    return players.map(player => {
      const playerMatches = matches.filter(
        match => match.jugador_1 === player.id || match.jugador_2 === player.id
      );
      console.log(player)
      console.log(playerMatches);
  
      let wonWeighted = 0;
      let playedWeighted = 0;
      let won = 0;
      let lost = 0;
  
      playerMatches.forEach(match => {
        const level = match.numero_partido;
        const ponderation = this.getPonderation(level);
        console.log(ponderation);
        playedWeighted += ponderation;

        const isWinner =
          (match.jugador_1 === player.id || match.jugador_2 === player.id) && match.resultado;

        if (isWinner) {
          wonWeighted += ponderation;
          won += 1;
        } else {
          lost += 1;
        }
      });

      const stats: Stats = {
        played: playerMatches.length,
        won,
        lost
      };

      const frRaw = this.fRGlobal(wonWeighted, playedWeighted, stats.played);
      const frScaled = this.scaleFRGlobal(frRaw, stats.played, 5);
      const levelData = this.getFRLevel(frScaled);
      const pairs = this.getPlayerPairsWithEffectiveness(player.id, matches, players);
      const effectiveness = (stats.won / stats.played) * 100 || 0;

      return {
        ...player,
        stats,
        pairs,
        effectiveness,
        frGlobal: {
          frGlobal: frScaled,
          label: levelData.label,
          color: levelData.color
        }
      };
    });
  }

  calculateTeamWinRate(matches: Array<Match>) {
    const totalMatches = matches.length;
    const matchesWon = matches.filter(match => match.resultado).length;
    this.teamWinRate = totalMatches > 0 ? (matchesWon / totalMatches) * 100 : 0;
  }

  calculatePlayerStats(playerId: number, matches: Array<Match>): Stats {
    let stats: Stats = { won: 0, lost: 0, played: 0 };
  
    matches.forEach((match: Match) => {
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

  getPlayerPairsWithEffectiveness(
    playerId: number, 
    allMatches: Array<Match>,
    allPlayers: Array<Player>): Array<Pair> {

    if (allMatches.length === 0) return [];
  
    const pairsMap: { [key: number]: { won: number; played: number } } = {};
  
    allMatches.forEach(match => {
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
      const partnerName = allPlayers.find(player => player.id === Number(partnerId))?.nombre || "Desconocido";
      const effectiveness = stats.played > 0 ? (stats.won / stats.played) * 100 : 0;
  
      return {
        name: partnerName,
        effectiveness: effectiveness,
        played: stats.played
      };
    });
  }

  assignRanking() {
    let rank = 1;
    let lastFR: number | null = null;
  
    this.players
      .sort((a, b) => b.frGlobal.frGlobal - a.frGlobal.frGlobal) // Asegura orden por FR
      .forEach((player, index) => {
        if (lastFR !== player.frGlobal.frGlobal) {
          rank = index + 1;
        }
        player.rankingOHUPadel = rank;
        lastFR = player.frGlobal.frGlobal;
      });
  }

  // Get ponderation based on difficulty level (1 to 5)
  // Level 1 = most difficult = weight 5, Level 5 = easiest = weight 1
  getPonderation(level: number): number {
    return 6 - level;
  }

  ira(winsWeighted: number, playedWeighted: number): number {
    return playedWeighted > 0 ? (winsWeighted / playedWeighted) * this.ln(playedWeighted + 1) : 0;
  }
  
  eficiencia( winsWeighted: number, playedWeighted: number, totalTeamMatches: number): number {
    if (playedWeighted === 0 || winsWeighted === 0) return 0;
    return (
      (winsWeighted / playedWeighted) * (this.log10(winsWeighted + 1) / this.log10(totalTeamMatches + 1))
    );
  }
  
  fRGlobal(ganados: number, jugados: number, totalEnfrentamientosEquipo: number): number {
    const ira = this.ira(ganados, jugados);
    const eficiencia = this.eficiencia(ganados, jugados, totalEnfrentamientosEquipo);
    return (2 * ira + eficiencia) / 3;
  }

  // Scale the FR to a 0–5 range based on the max possible FR
  scaleFRGlobal(fr: number, totalTeamMatches: number, maxPonderation: number): number {
    const frMax = this.calculateMaxFR(totalTeamMatches, maxPonderation);
    return (fr / frMax) * 5;
  }

  getFRLevel(fr: number): { label: string; color: string } {
    if (fr >= 3.0) {
      return { label: 'Muy Alto', color: '#FFD700' }; // Dorado
    } else if (fr >= 2.5) {
      return { label: 'Alto', color: '#28a745' };     // Verde
    } else if (fr >= 1.75) {
      return { label: 'Medio', color: '#ffc107' };    // Amarillo
    } else {
      return { label: 'Medio-Bajo', color: '#fd7e14' }; // Naranja
    }
  }

  // Compute the theoretical max FR with perfect performance
  calculateMaxFR(possibleMatches: number, maxPonderation: number): number {
    const matchesWeighted = possibleMatches * maxPonderation;
    const winsWeighted = matchesWeighted; // all wins
    return this.fRGlobal(winsWeighted, matchesWeighted, possibleMatches);
  }

  getFilteredSortedPlayers(): Player[] {
    const text = this.searchText.toLowerCase();

    let filteredPlayers = this.players.filter(player =>
      `${player.nombre} ${player.apellidos}`.toLowerCase().includes(text)
    );

    return filteredPlayers.sort((a, b) => {
      const valueA = a[this.sortColumn as keyof Player];
      const valueB = b[this.sortColumn as keyof Player];

      return this.sortAsc ? Number(valueA) - Number(valueB) : Number(valueB) - Number(valueA);
    });
  }

  sortBy(column: string) {
    if (this.sortColumn === column) {
      this.sortAsc = !this.sortAsc; // Alternar orden ascendente/descendente
    } else {
      this.sortColumn = column;
      this.sortAsc = true; // Por defecto, ascendente
    }
    
    this.players.sort((a, b) => {
      const valueA = a[column as keyof Player];
      const valueB = b[column as keyof Player];
  
      return this.sortAsc ? Number(valueA) - Number(valueB) : Number(valueB) - Number(valueA);
    });
  }

}
