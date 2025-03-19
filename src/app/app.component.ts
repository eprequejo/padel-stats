import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DataService } from './data.service';
import { RankingComponent } from './ranking/ranking.component';

@Component({
  selector: 'app-root',
  imports: [RankingComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'padel-stats';
}
