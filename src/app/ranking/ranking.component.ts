import { Component, OnInit } from '@angular/core';
import { DataService } from '../data.service';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ranking',
  standalone: true,
  templateUrl: './ranking.component.html',
  imports: [CommonModule, HttpClientModule, FormsModule],
  styleUrls: ['./ranking.component.css'],
})
export class RankingComponent implements OnInit {

  players: any[] = [];
  searchText: string = "";
  sortColumn: string = 'factorRendimiento'; // ✅ Ordenar por efectividad por defecto
  sortAsc: boolean = false; // ✅ Orden descendente

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    this.dataService.getPlayers().subscribe((data) => {
      this.players = data;
      this.calculateMetrics();
    });
  }

  calculateMetrics() {
    this.players.forEach((player) => {
      player.efectividad = (player.ganados / player.jugados) * 100 || 0;
      player.factorRendimiento = (player.ganados / player.jugados) * Math.log(player.jugados + 1) || 0;
      player.eficiencia = (player.ganados / player.jugados) * Math.log(player.jugados + 1) || 0;
    });
  }

  getFilteredSortedPlayers() {
    let filteredPlayers = this.players.filter(player =>
      `${player.nombre} ${player.apellidos}`
        .toLowerCase()
        .includes(this.searchText.toLowerCase())
    );

    // 🔽 Ordenar según columna seleccionada
    return filteredPlayers.sort((a, b) => {
      const valueA = a[this.sortColumn];
      const valueB = b[this.sortColumn];

      return this.sortAsc ? valueA - valueB : valueB - valueA;
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
      const valueA = a[column];
      const valueB = b[column];
  
      return this.sortAsc ? valueA - valueB : valueB - valueA;
    });
  }

}
