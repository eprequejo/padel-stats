import { Component, OnInit } from '@angular/core';
import { DataService } from '../data.service';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Player } from '../models';
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

    this.dataService.getPlayers().subscribe((data) => {
      this.players = data.map(player => {
        const stats = this.dataService.calculatePlayerStats(player.id);
        const effectiveness = (stats.won / stats.played) * 100 || 0;
        const frGlobalRaw = this.fRGlobal(stats.won, stats.played, this.totalMatches);
        const frGlobal = this.scaleFRGlobal(frGlobalRaw);
  
        return {
          ...player,
          stats,
          pairs: this.dataService.getPlayerPairsWithEffectiveness(player.id),
          effectiveness,
          frGlobal
        };
      });
  
      this.assignRanking();
    });
  }

  assignRanking() {
    let rank = 1;
    let lastFR: number | null = null;
  
    this.players
      .sort((a, b) => b.frGlobal - a.frGlobal) // Asegura orden por FR
      .forEach((player, index) => {
        if (lastFR !== player.frGlobal) {
          rank = index + 1;
        }
        player.rankingOHUPadel = rank;
        lastFR = player.frGlobal;
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
