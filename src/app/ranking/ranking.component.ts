import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { DataService } from '../data.service';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Match, Pair, Player, Stats } from '../models';
import { SearchService } from '../search.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-ranking',
  standalone: true,
  templateUrl: './ranking.component.html',
  imports: [CommonModule, HttpClientModule, FormsModule],
  styleUrls: ['./ranking.component.css'],
})
export class RankingComponent implements OnInit, OnChanges {

  @Input() season: string = '25-26';

  players: Array<Player> = [];
  searchText: string = "";
  sortColumn: string = 'factorRendimiento';
  sortAsc: boolean = false;
  totalMatches: number = 0;
  teamWinRate: number = 0;
  hasData: boolean = false;

  constructor(
    private dataService: DataService,
    private searchService: SearchService) { }

  ngOnInit(): void {
    this.searchService.searchText$.subscribe(text => {
      this.searchText = text.toLowerCase();
      this.getFilteredSortedPlayers();
    });

    this.loadSeasonData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['season'] && !changes['season'].firstChange) {
      this.loadSeasonData();
    }
  }

  loadSeasonData(): void {
    forkJoin({
      config: this.dataService.loadConfig(this.season),
      players: this.dataService.getPlayers(this.season),
      matches: this.dataService.getMatches(this.season)
    }).subscribe(({ config, players, matches }) => {
      this.totalMatches = config.totalMatches;
      this.dataService.totalMatches = this.totalMatches;

      if (players.length === 0 && matches.length === 0) {
        this.hasData = false;
        this.players = [];
        this.teamWinRate = 0;
        return;
      }

      this.hasData = true;
      this.players = this.calculateMetrics(matches, players);
      this.assignRanking();
      this.calculateTeamWinRate(matches);
    });
  }

  get seasonLabel(): string {
    return this.season.replace('-', '/');
  }

  calculateMetrics(matches: Array<Match>, players: Array<Player>): Array<Player> {
    return players.map(player => {
      const playerMatches = matches.filter(
        match => match.jugador_1 === player.id || match.jugador_2 === player.id
      );

      let wonWeight = 0;
      let won = 0;
      let lost = 0;

      playerMatches.forEach(match => {
        if (match.resultado) {
          won += 1;
          wonWeight += this.getPonderation(match.numero_partido);
        } else {
          lost += 1;
        }
      });

      const stats: Stats = {
        played: playerMatches.length,
        won,
        lost
      };

      // Victoria Ponderada (VP): victorias ponderadas por dificultad [0, 1]
      const maxPossibleWeight = stats.played * 3;
      const vp = maxPossibleWeight > 0 ? wonWeight / maxPossibleWeight : 0;

      // Participación (P): frecuencia de juego [0, 1]
      const p = this.totalMatches > 0 ? stats.played / this.totalMatches : 0;

      // Factor de confianza: mínimo 4 partidos para FR completo
      const confidence = Math.min(1, stats.played / 4);

      // FR = (VP × 0.60 + P × 0.40) × 5 × confianza
      const fr = (vp * 0.60 + p * 0.40) * 5 * confidence;

      const levelData = this.getFRLevel(fr);
      const pairs = this.getPlayerPairsWithEffectiveness(player.id, matches, players);
      const effectiveness = stats.played > 0 ? (stats.won / stats.played) * 100 : 0;

      return {
        ...player,
        stats,
        pairs,
        effectiveness,
        frGlobal: {
          frGlobal: fr,
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
  // Pista 1-2 = 3 puntos, Pista 3 = 2 puntos, Pista 4-5 = 1 punto
  getPonderation(level: number): number {
    if (level <= 2) return 3;
    if (level === 3) return 2;
    return 1;
  }

  getFRLevel(fr: number): { label: string; color: string } {
    if (fr >= 3.5) {
      return { label: 'Muy Alto', color: '#FFD700' }; // Dorado
    } else if (fr >= 2.5) {
      return { label: 'Alto', color: '#28a745' };     // Verde
    } else if (fr >= 1.5) {
      return { label: 'Medio', color: '#ffc107' };    // Amarillo
    } else {
      return { label: 'Medio-Bajo', color: '#fd7e14' }; // Naranja
    }
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
