import { Routes } from '@angular/router';
import { RankingComponent } from './ranking/ranking.component';
import { RankingParejasComponent } from './ranking-parejas/ranking-parejas.component';

export const routes: Routes = [
  { path: '', redirectTo: 'ranking-individual', pathMatch: 'full' },
  { path: 'ranking-individual', component: RankingComponent },
  { path: 'ranking-parejas', component: RankingParejasComponent }
];
