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
  formula: string = 'v2';

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
      this.formula = config.formula || 'v2';
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
    // Para v1: calcular FR_GLOBAL_MAX y MIN
    const frGlobalMax = this.formula === 'v1' ? this.fRGlobalV1(this.totalMatches, this.totalMatches, this.totalMatches) : 0;
    const frGlobalMin = this.formula === 'v1' ? this.fRGlobalV1(0, this.totalMatches, this.totalMatches) : 0;

    return players.map(player => {
      const playerMatches = matches.filter(
        match => match.jugador_1 === player.id || match.jugador_2 === player.id
      );

      let won = 0;
      let lost = 0;

      playerMatches.forEach(match => {
        if (match.resultado) {
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

      let fr: number;

      if (this.formula === 'v1') {
        // Fórmula v1 (24/25): IRA + Eficiencia, escalado a 0-5
        const frRaw = this.fRGlobalV1(stats.won, stats.played, this.totalMatches);
        fr = this.scaleFRGlobal(frRaw, frGlobalMin, frGlobalMax);
      } else {
        // Fórmula v2 (25/26): VP + P con pesos por pista
        let wonWeight = 0;
        playerMatches.forEach(match => {
          if (match.resultado) {
            wonWeight += this.getPonderation(match.numero_partido);
          }
        });

        const maxPossibleWeight = stats.played * 3;
        const vp = maxPossibleWeight > 0 ? wonWeight / maxPossibleWeight : 0;
        const p = this.totalMatches > 0 ? stats.played / this.totalMatches : 0;
        const confidence = Math.min(1, stats.played / 4);
        fr = (vp * 0.65 + p * 0.35) * 5 * confidence;
      }

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

  // === Fórmula v1 (temporada 24/25) ===
  private iraV1(ganados: number, jugados: number): number {
    return jugados > 0 ? (ganados / jugados) * Math.log(jugados + 1) : 0;
  }

  private eficienciaV1(ganados: number, jugados: number, totalEnfrentamientos: number): number {
    return jugados > 0 ? (ganados / jugados) * (Math.log10(ganados + 1) / Math.log10(totalEnfrentamientos + 1)) : 0;
  }

  private fRGlobalV1(ganados: number, jugados: number, totalEnfrentamientos: number): number {
    const ira = this.iraV1(ganados, jugados);
    const eficiencia = this.eficienciaV1(ganados, jugados, totalEnfrentamientos);
    return (2 * ira + eficiencia) / 3;
  }

  private scaleFRGlobal(fr: number, min: number, max: number): number {
    const scaled = ((fr - min) / (max - min)) * 5;
    return Math.min(5, Math.max(0, scaled));
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
    if (fr >= 3.0) return { label: 'Muy Alto', color: '#FFD700' };
    if (fr >= 2.5) return { label: 'Alto', color: '#28a745' };
    if (fr >= 1.75) return { label: 'Medio', color: '#ffc107' };
    return { label: 'Medio-Bajo', color: '#fd7e14' };
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
