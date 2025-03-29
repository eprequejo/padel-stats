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
  totalMatches: number = 16; // ✅ Total de enfrentamientos por equipo to config file

  FR_GLOBAL_MIN = 0;
  FR_GLOBAL_MAX = 0;

  constructor(
    private dataService: DataService,
    private searchService: SearchService) {

    this.FR_GLOBAL_MAX = this.fRGlobal(this.totalMatches, this.totalMatches, this.totalMatches);
    this.FR_GLOBAL_MIN = this.fRGlobal(0, this.totalMatches, this.totalMatches);
  }

  ngOnInit(): void {
    this.searchService.searchText$.subscribe(text => {
      this.searchText = text.toLowerCase();
      this.getFilteredSortedPlayers();
    });

    this.dataService.getPlayers().subscribe((players) => {
      this.dataService.getMatches().subscribe((matches) => {

        this.players = players.map(player => {

          const stats = this.calculatePlayerStats(player.id, matches);
          const pairs = this.getPlayerPairsWithEffectiveness(player.id, matches, players);

          const effectiveness = (stats.won / stats.played) * 100 || 0;
          const frGlobalRaw = this.fRGlobal(stats.won, stats.played, this.totalMatches);
          const frGlobalValue = this.scaleFRGlobal(frGlobalRaw);
          const levelData = this.getFRLevel(frGlobalValue);
    
          return {
            ...player,
            stats,
            pairs,
            effectiveness,
            frGlobal: { frGlobal: frGlobalValue, label: levelData.label, color: levelData.color }
          };
        });

        this.assignRanking();
      });
    });
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
  

  ira(ganados: number, jugados: number): number {
    return jugados > 0 ? (ganados / jugados) * Math.log(jugados + 1) : 0;
  }
  
  eficiencia(ganados: number, jugados: number, totalEnfrentamientosEquipo: number ): number {
    return jugados > 0 ? (ganados / jugados) * (Math.log10(ganados + 1) / Math.log10(totalEnfrentamientosEquipo + 1)) : 0;
  }
  
  fRGlobal(ganados: number, jugados: number, totalEnfrentamientosEquipo: number): number {
    const ira = this.ira(ganados, jugados);
    const eficiencia = this.eficiencia(ganados, jugados, totalEnfrentamientosEquipo);
    return (2 * ira + eficiencia) / 3;
  }

  scaleFRGlobal(fr: number): number {
    const min = this.FR_GLOBAL_MIN;
    const max = this.FR_GLOBAL_MAX;
    const scaled = ((fr - min) / (max - min)) * 5;
    return Math.min(5, Math.max(0, scaled)); // Limita entre 0 y 5
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
