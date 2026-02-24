# OHU Padel Stats

Aplicacion Angular para el seguimiento de rankings y estadisticas del equipo femenino de OHU Padel.

## Factor de Rendimiento (FR)

### Que premia

- **Ganar partidos** — es lo que mas cuenta (60% del FR)
- **Ganar en pistas altas** — ganar en pista 1 o 2 vale el triple que ganar en pista 4 o 5
- **Jugar muchos partidos** — cuantos mas juegues, mas sube (40% del FR)

### Que NO penaliza

- **Perder no resta puntos**. Simplemente no suma victorias, pero haber jugado si cuenta.
- **Jugar en pistas dificiles nunca te perjudica**. Si te toca pista 1 y pierdes, no pierdes puntos extra.

### Que te baja el FR

- **Ganar solo partidos faciles** — victorias en pista 4 o 5 valen poco (1 punto vs 3 en pista 1-2)
- **Jugar pocos partidos** — necesitas al menos 4 para FR completo. Con menos, se reduce proporcionalmente.

**En resumen: gana, gana arriba, y juega todo lo que puedas.**

### Formula

```
FR = (VP × 0.60 + P × 0.40) × 5 × confianza
```

### Componentes

#### Victoria Ponderada (VP) — 60%

Solo cuentan las victorias, ponderadas por dificultad del partido.

```
VP = wonWeight / (partidos_jugados × 3)
```

Donde `wonWeight` = suma de puntos por cada victoria.

| Pista | Puntos |
|-------|--------|
| 1 (mas dificil) | 3 |
| 2 | 3 |
| 3 | 2 |
| 4 | 1 |
| 5 (mas facil) | 1 |

#### Participacion (P) — 40%

```
P = partidos_jugados / total_jornadas
```

Premia compromiso y disponibilidad.

#### Factor de confianza

```
confianza = min(1, partidos_jugados / 4)
```

- 1 partido: FR × 0.25
- 2 partidos: FR × 0.50
- 3 partidos: FR × 0.75
- 4+ partidos: FR × 1.00

### Niveles

| Nivel      | Rango FR | Color    |
|------------|----------|----------|
| Muy Alto   | >= 3.5   | Dorado   |
| Alto       | >= 2.5   | Verde    |
| Medio      | >= 1.5   | Amarillo |
| Medio-Bajo | < 1.5    | Naranja  |

### Ejemplo

Una jugadora que ha ganado 3 de 4 partidos en pistas 1 y 2, con 10 jornadas totales:

- Victorias en pistas 1, 2, 1 → wonWeight = 3 + 3 + 3 = 9
- VP = 9 / (4 × 3) = 0.75
- P = 4/10 = 0.40
- Confianza = min(1, 4/4) = 1.00
- **FR = (0.75 × 0.60 + 0.40 × 0.40) × 5 × 1.00 = 3.05** (Alto)

## Desarrollo

```bash
npm start       # servidor en http://localhost:4200
npm run build   # build de produccion (output en docs/)
npm test        # tests unitarios con Karma/Jasmine
```
