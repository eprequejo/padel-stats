export interface Player {
    id: number;
    nombre: string;
    apellidos: string;
    puntos: number;
    stats: Stats;
    ranking_malaga: number;
    frGlobal: number;
    rankingOHUPadel: number;
    effectiveness: number;
    pairs: Array<Pair>;
  }
  
  export interface Stats {
    won: number;
    lost: number;
    played: number;
  }

  export interface Pair { 
    name: string; 
    effectiveness: number;
    played: number;
  }

  export interface Match {
    id: number;
    jugador_1: number;
    jugador_2: number;
    sets_ganados: number;
    sets_perdidos: number;
    numero_partido: number;
    resultado: boolean; // ✅ True for victory, False for defeat
  }
  