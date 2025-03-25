import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { DataService } from './data.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchService } from './search.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'padel-stats';
  menuOpen = false;
  searchText: string = '';

  constructor(private searchService: SearchService) {}

  ngOnInit() {
  }

  updateSearchText(event: any) {
    this.searchService.setSearchText(event.target.value);
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu() {
    this.menuOpen = false;
  }
}
