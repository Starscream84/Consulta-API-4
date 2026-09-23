# TP4 – Gráficos de Control

Trabajo Práctico Nº 4 de **Estadística y Probabilidades**
Tecnicatura Superior en Desarrollo de Software – Instituto IDRA, Mar del Plata (2026)

Página web que consume una API con JavaScript y muestra un **gráfico de control** de una variable. Detecta si el proceso está **fuera de control** o si tiene una **tendencia** que puede sacarlo de control, y lo avisa con una alerta de texto.

---

## Integrantes

- Matias Rosa
- Camila Larsen
- Ayelen Aguero
- Matias Nerli

---

## Funcionalidades

- Selector para elegir uno de los 5 casos de la API. El gráfico se actualiza al cambiar la opción o al tocar **Cargar**.
- Gráfico de control con Chart.js:
    - la variable medida en cada muestreo;
    - la línea central (media), el LSC y el LIC;
    - las zonas de ±1σ y ±2σ;
    - etiquetas al costado de cada línea con su valor.
- Los puntos con anomalías se resaltan en el gráfico: en **rojo** si están fuera de control y en **naranja** si forman parte de una tendencia.
- Alertas de texto que explican qué regla se cumplió y en qué muestras.
- Tabla con cada muestra (X, Y) y su estado: _Normal_, _Tendencia_ o _Fuera de control_.
- Manejo de errores si la API no responde o devuelve datos inválidos.

---

## Casos de la API

Los datos se piden por GET a:

```text
https://apidemo.geoeducacion.com.ar/api/testing/control/{caso}
```

| Caso | Situación        | Regla que se detecta                                     |
| ---- | ---------------- | -------------------------------------------------------- |
| 1    | Fuera de control | Un punto por encima del LSC o por debajo del LIC         |
| 2    | Normal           | Ninguna: el proceso está bajo control                    |
| 3    | Tendencia        | 2 de 3 puntos consecutivos más allá de 2σ (mismo lado)   |
| 4    | Tendencia        | 4 de 5 puntos consecutivos más allá de 1σ (mismo lado)   |
| 5    | Tendencia        | 8 puntos consecutivos del mismo lado de la línea central |

La API devuelve la `media`, el `lsc`, el `lic` y la lista de `valores` (`x` = muestreo, `y` = valor medido). Sigma se calcula a partir de los límites:

```text
σ = (LSC − LIC) / 6
```

---

## Tecnologías

- **HTML5**: estructura de la página.
- **CSS3**: diseño del gráfico, las alertas y la tabla, con variables CSS y un diseño adaptable a celulares.
- **JavaScript**: `fetch` con `async/await` para consumir la API y manipulación del DOM.
- **[Chart.js 4](https://www.chartjs.org/)**: gráfico de líneas.
- **[chartjs-plugin-annotation](https://www.chartjs.org/chartjs-plugin-annotation/)**: etiquetas al costado de las líneas de control.

---

## Estructura

```text
├── index.html          → Estructura de la página
├── main.js             → Consumo de la API, análisis de reglas y dibujo del gráfico
├── README.md           → Este archivo
├── EXPLICACION.md      → Explicación detallada del código y de las fórmulas
└── assets/
    ├── styles.css      → Estilos
    └── variable.css    → Variables CSS (tipografías)
```

---

## Cómo usarlo

1. Clonar el repositorio:

    ```bash
    git clone https://github.com/Starscream84/Consulta-API-4.git
    ```

2. Abrir `index.html` en el navegador. También se puede usar la extensión **Live Server** de VS Code.
3. Elegir un caso en el selector.

Hace falta conexión a internet para consultar la API y cargar Chart.js desde el CDN.

---
