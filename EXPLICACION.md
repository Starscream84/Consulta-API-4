# TP4 – Gráficos de Control

**Estadística y Probabilidades – Tecnicatura Superior en Desarrollo de Software (IDRA)**

Página web que consume una API con JavaScript, dibuja un **gráfico de control** de una variable y avisa cuando el proceso está **fuera de control** o tiene una **tendencia** que puede terminar sacándolo de control.

---

## 1. Estructura del proyecto

```text
Consulta a API 4/
├── index.html          → Estructura de la página (HTML5)
├── main.js             → Lógica: consumo de la API, análisis y dibujo
├── EXPLICACION.md      → Este documento
└── assets/
    ├── variable.css    → Variables CSS (tipografías)
    ├── styles.css      → Estilos de la página
    └── styles2.css     → (no se usa en este TP)
```

Para verlo, alcanza con abrir `index.html` en el navegador (requiere conexión a internet para la API y para Chart.js).

---

## 2. Conceptos estadísticos

### 2.1 ¿Qué es un gráfico de control?

Es un gráfico que muestra cómo varía una medición a lo largo del tiempo (muestreos) respecto de tres líneas de referencia:

| Línea | Nombre | Significado |
|---|---|---|
| **LC** | Línea central | Valor medio del proceso (`media`) |
| **LSC** | Límite superior de control | `media + 3σ` |
| **LIC** | Límite inferior de control | `media − 3σ` |

Si el proceso es estable, casi todos los puntos (≈ 99,73 % en una distribución normal) caen entre LIC y LSC.

### 2.2 Cálculo de sigma (σ)

La API no manda σ, pero se puede despejar de los límites:

```text
LSC = media + 3σ
LIC = media − 3σ

LSC − LIC = 6σ   ⟹   σ = (LSC − LIC) / 6
```

Con los datos de la API: `σ = (99 − 81) / 6 = 3`.

### 2.3 Zonas del gráfico

Con σ se arman las zonas que usan las reglas de detección:

| Zona | Fórmula | Con media = 90 y σ = 3 |
|---|---|---|
| ±1σ | `media ± σ` | 87 / 93 |
| ±2σ | `media ± 2σ` | 84 / 96 |
| ±3σ (LIC / LSC) | `media ± 3σ` | 81 / 99 |

### 2.4 Reglas de detección (Western Electric)

| Regla | Caso de la API | Condición | Tipo |
|---|---|---|---|
| 1 | Caso 1 | Un punto por encima de LSC o por debajo de LIC | **Fuera de control** |
| 2 | Caso 3 | 2 de 3 puntos consecutivos más allá de 2σ, **del mismo lado** | Tendencia |
| 3 | Caso 4 | 4 de 5 puntos consecutivos más allá de 1σ, **del mismo lado** | Tendencia |
| 4 | Caso 5 | 8 puntos consecutivos del mismo lado de la línea central | Tendencia |

El caso 2 es el proceso **normal**: no se cumple ninguna regla.

Las reglas 2, 3 y 4 no significan que el proceso ya esté fuera de control, sino que es **poco probable que ese patrón aparezca por azar**. Por eso sirven para anticipar un problema.

---

## 3. `index.html`

Tiene cuatro partes dentro de `<main>`:

1. **`.controls`**: un `<select id="caso">` con los 5 casos y un botón `#btnCargar`.
2. **`.chart-container`**: el `<canvas id="graficoControl">` donde Chart.js dibuja el gráfico.
3. **`#alertas`**: contenedor vacío que JavaScript llena con los mensajes. Tiene `aria-live="polite"` para que los lectores de pantalla anuncien los cambios.
4. **`#tablaDatos`**: tabla con X, Y y el estado de cada muestra. El `<tbody>` se llena desde JavaScript.

En el `<head>` se cargan los CSS y **Chart.js 4.4.1** desde jsDelivr. `main.js` se carga al final del `<body>` para que los elementos ya existan cuando se ejecuta.

---

## 4. `main.js`, paso a paso

### 4.1 Flujo general

```text
Usuario elige un caso
        │
        ▼
cargarCaso(caso) ──fetch──▶ API
        │
        ├─ calcula σ = (LSC − LIC) / 6
        ├─ analizarDatos()  → lista de anomalías
        ├─ dibujarGrafico() → Chart.js
        ├─ mostrarAlertas() → mensajes de texto
        └─ llenarTabla()    → tabla de valores
```

### 4.2 Constantes y estado

- `API_BASE`: URL base de la API. Se le agrega `/1` … `/5` según el caso.
- `COLORES`: colores de cada línea y de los puntos con anomalía.
- `chart`: guarda el gráfico actual para destruirlo antes de dibujar otro. Si no se destruye, Chart.js superpone gráficos en el mismo canvas.

### 4.3 Eventos

- Click en **Cargar** → `cargarCaso(valor del select)`.
- Cambio del **select** → recarga automáticamente.
- `DOMContentLoaded` → carga el caso seleccionado al abrir la página.

### 4.4 `cargarCaso(caso)`

Es una función `async` que:

1. Hace `fetch` (GET) a `API_BASE/caso`.
2. Verifica `res.ok`. Si la API responde con un error HTTP, lanza una excepción.
3. Convierte la respuesta a JSON y verifica `success` y que `data` tenga contenido.
4. Desestructura `media`, `lsc`, `lic` y `valores` de `json.data[0]`.
5. Calcula `sigma = (lsc - lic) / 6`.
6. Llama a `analizarDatos`, `dibujarGrafico`, `mostrarAlertas` y `llenarTabla`.

Todo está dentro de un `try/catch`: si falla la red o el JSON, se muestra una alerta de error y el detalle queda en la consola.

### 4.5 `dibujarGrafico(valores, media, lsc, lic, sigma, anomalias)`

- `labels`: los valores de X (número de muestreo).
- `datos`: los valores de Y.
- `lineaConstante(valor, n)`: arma un array con el mismo valor repetido `n` veces. Así se dibujan las líneas horizontales (media, límites y zonas σ), porque Chart.js necesita un valor por cada punto del eje X.
- `estadoPorPunto()` indica qué puntos tienen anomalía. Con eso se arman `coloresPuntos` y `radiosPuntos`:
  - rojo y más grande → fuera de control;
  - naranja y más grande → tendencia;
  - azul → normal.
- `referencia(label, valor, color, dash)` es una función auxiliar que devuelve la configuración de una línea punteada sin puntos.
- `suggestedMin` y `suggestedMax` dejan un margen de 1σ por fuera de LIC y LSC para que las líneas no queden pegadas al borde.

Líneas que se dibujan: Variable, Media (LC), LSC, LIC, ±2σ y ±1σ.

### 4.6 `analizarDatos(valores, media, lsc, lic, sigma)`

Devuelve un array de **anomalías**. Cada una tiene esta forma:

```js
{
    regla: 1,              // número de regla (1 a 4)
    tipo: "fuera",         // "fuera" o "tendencia"
    puntos: [7],           // índices de los puntos involucrados
    mensaje: "Fuera de control: ..."
}
```

**Regla 1 – Fuera de límites.** Recorre todos los valores con `forEach` y registra cada uno que cumpla `valor > lsc || valor < lic`.

**Regla 2 – 2 de 3 más allá de 2σ.** Calcula `lim2Sup = media + 2σ` y `lim2Inf = media − 2σ` y llama a `buscarVentana(y, 3, 2, lim2Sup, lim2Inf)`.

**Regla 3 – 4 de 5 más allá de 1σ.** Igual que la anterior, con `media ± σ` y `buscarVentana(y, 5, 4, ...)`.

**Regla 4 – 8 del mismo lado.** Recorre los valores llevando una **racha**:

- `lado(valor, media)` devuelve `1` (arriba), `-1` (abajo) o `0` (sobre la media).
- Si el punto está del mismo lado que la racha, la racha suma 1.
- Si cambia de lado, la racha vuelve a 1.
- Si el punto está **exactamente sobre la media** (`0`), no pertenece a ningún lado y la racha vuelve a 0.
- Cuando la racha llega a 8, registra la anomalía con los 8 puntos (`rango(i − 7, i)`).

Las reglas 2, 3 y 4 informan solo la **primera** ocurrencia, para no repetir el mismo aviso.

### 4.7 `buscarVentana(y, tamanio, minimo, limSup, limInf)`

Implementa la **ventana deslizante**: toma `tamanio` puntos consecutivos, cuenta cuántos superan `limSup` y cuántos están por debajo de `limInf`, y si alguno de los dos llega a `minimo`, devuelve esa ventana. Si no, avanza un lugar y repite.

Ejemplo con la regla 2 (`tamanio = 3`, `minimo = 2`, límites 96 / 84):

```text
Valores:   87  97  97  98
Ventana 1: [87, 97, 97] → 2 puntos > 96 → ¡se cumple!
```

Los puntos se cuentan por separado arriba y abajo porque la regla exige que estén **del mismo lado**. Un punto a +2σ y otro a −2σ no cuentan como tendencia.

### 4.8 Funciones auxiliares

- `rango(desde, hasta)`: devuelve `[desde, desde+1, ..., hasta]`.
- `lado(valor, media)`: `1`, `-1` o `0`, como se explicó arriba.
- `estadoPorPunto(cantidad, anomalias)`: arma un array con `"normal"`, `"tendencia"` o `"fuera"` para cada punto. `"fuera"` tiene prioridad si un punto cumple más de una regla.

### 4.9 Salida en pantalla

- `mostrarAlertas(anomalias, errorTexto)`: limpia `#alertas` y muestra:
  - el error, si lo hay (rojo);
  - "El proceso se encuentra bajo control" si no hay anomalías (verde);
  - una alerta por anomalía: roja para "fuera", amarilla para "tendencia".
- `agregarAlerta(tipo, texto)`: crea un `<div class="alerta alerta-tipo">`. Usa `textContent` en lugar de `innerHTML` para no interpretar HTML que venga de afuera.
- `llenarTabla(valores, anomalias)`: una fila por muestra con X, Y y el estado. Las filas se colorean con `.fila-alerta` (rojo) o `.fila-tendencia` (amarillo).

---

## 5. CSS

### `variable.css`

Importa las fuentes **Roboto** y **Lato** de Google Fonts y define las variables `--font-primary` y `--font-secondary`. El respaldo es `sans-serif` (sin comillas, porque es una familia genérica).

### `styles.css`

- **Layout:** `main` centrado con `max-width: 900px`; `.controls` con `flex` y `flex-wrap` para que se acomode en pantallas chicas.
- **Gráfico:** `.chart-container` con altura fija (420 px; 320 px en celulares, mediante `@media`). Chart.js necesita esa altura porque se usa `maintainAspectRatio: false`.
- **Alertas:** `.alerta-ok` (verde), `.alerta-warning` (amarillo) y `.alerta-error` (rojo).
- **Tabla:** encabezado azul, filas separadas por un borde fino, y las clases `.fila-alerta` y `.fila-tendencia`.

---

## 6. Resultados esperados por caso

Probado con los datos que devolvía la API (media 90, LSC 99, LIC 81, σ 3):

| Caso | Datos relevantes | Alerta que muestra |
|---|---|---|
| 1 | Muestra 8 = 100 | Fuera de control (supera LSC 99) |
| 2 | Todo entre 87 y 93 | Proceso bajo control |
| 3 | 97, 97, 98 | 2 de 3 puntos más allá de 2σ |
| 4 | 95, 89, 94, 95, 98 | 4 de 5 puntos más allá de 1σ |
| 5 | 91, 92, 93, 91, 92, 93, 91, 94 | 8 puntos por encima de la línea central |

> Los valores exactos pueden cambiar entre consultas; la lógica no depende de ellos.
