# OHU Padel Stats

Aplicacion Angular para el seguimiento de rankings y estadisticas del equipo femenino de OHU Padel.

## Factor de Rendimiento (FR)

El FR mide quien es la mejor jugadora considerando tres cosas: **ganar partidos dificiles**, **jugar muchos partidos** y **ser constante**.

### Que premia

- **Ganar partidos dificiles**: ganar en pista 1 vale mucho mas que ganar en pista 5. Una victoria arriba demuestra que puedes competir al maximo nivel.
- **Jugar muchos partidos**: cuantos mas partidos juegues, mayor bonus recibes (hasta ×1.75). Se valora el compromiso y la disponibilidad.
- **Participacion con buen rendimiento**: jugar mucho solo suma al FR si ademas tienes buenos resultados. Jugar mucho y perder mucho no te ayuda.

### Que NO penaliza

- **Perder no resta puntos**. Las derrotas simplemente no suman, pero no te quitan nada. Es mejor jugar y perder que no jugar.
- **Jugar partidos dificiles nunca te perjudica**. Si juegas en pista 1, tus victorias valen mas y tus derrotas no te penalizan extra.

### Que te baja el FR

- **Ganar solo partidos faciles**: si todas tus victorias son en pista 5, cada una vale poco (peso 1 vs peso 5 en pista 1).
- **Jugar pocos partidos**: con menos de 3 partidos tu FR se reduce proporcionalmente (factor de confianza). Ademas no recibes bonus de participacion.
- **Jugar mucho pero ganar poco**: la participacion ajustada se reduce si tu ratio de victorias ponderadas es bajo (por debajo de 0.4).

### Formula

```
FR = (VP × 0.70 + P_adj × 0.30) × 5 × confianza × bonusParticipacion
```

Escala final: **0 a ~5**.

### Componentes

#### Victoria Ponderada (VP) — 70%

Solo cuentan las victorias, ponderadas por dificultad del partido.

```
VP = wonWeight / (partidos_jugados × 5)
```

Donde `wonWeight` = suma de `6 - pista` por cada victoria.

| Pista | Peso victoria |
|-------|--------------|
| 1 (mas dificil) | 5 |
| 2 | 4 |
| 3 | 3 |
| 4 | 2 |
| 5 (mas facil) | 1 |

- Rango: [0, 1]
- Se normaliza por el maximo teorico (`partidos × 5`) para que jugar en pistas dificiles no te perjudique

#### Participacion ajustada (P_adj) — 30%

```
P_adj = (partidos_jugados / total_jornadas) × min(1, VP / 0.4)
```

- Solo cuenta al 100% si VP >= 0.4
- Premia compromiso y disponibilidad, pero solo si rindes

#### Factor de confianza

```
confianza = min(1, partidos_jugados / 3)
```

- 1 partido: FR × 0.33
- 2 partidos: FR × 0.67
- 3+ partidos: FR × 1.00

#### Bonus de participacion

```
bonusParticipacion = 1 + max(0, (jugados - 2) / (total - 2)) × 0.75
```

- 2 partidos o menos: ×1.00
- 4 partidos (de 10): ×1.19
- 6 partidos: ×1.38
- 8 partidos: ×1.56
- 10 partidos: ×1.75

### Niveles

| Nivel      | Rango FR | Color    |
|------------|----------|----------|
| Muy Alto   | >= 3.5   | Dorado   |
| Alto       | >= 2.5   | Verde    |
| Medio      | >= 1.5   | Amarillo |
| Medio-Bajo | < 1.5    | Naranja  |

### Ejemplo

Una jugadora que ha ganado 3 de 4 partidos en pistas 1 y 2, con 10 jornadas totales:

- Victorias en pistas 1, 2, 1 → wonWeight = 5 + 4 + 5 = 14
- VP = 14 / (4 × 5) = 0.70
- P = 4/10 = 0.40
- P_adj = 0.40 × min(1, 0.70/0.4) = 0.40
- Confianza = min(1, 4/3) = 1.00
- Bonus = 1 + (2/8) × 0.75 = 1.19
- **FR = (0.70 × 0.70 + 0.40 × 0.30) × 5 × 1.00 × 1.19 = 3.66** (Muy Alto)

## Desarrollo

```bash
npm start       # servidor en http://localhost:4200
npm run build   # build de produccion (output en docs/)
npm test        # tests unitarios con Karma/Jasmine
```
