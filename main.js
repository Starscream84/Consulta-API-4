/*
 * TP4 - Estadística y Probabilidades - Gráficos de Control
 * ---------------------------------------------------------
 * Este script:
 *   1. Consulta la API del caso elegido (1 a 5) con fetch (GET).
 *   2. Calcula sigma (σ) a partir de los límites de control que manda la API.
 *   3. Dibuja el gráfico de control con Chart.js: variable, línea central,
 *      LSC/LIC y las zonas de ±1σ y ±2σ.
 *   4. Aplica las reglas de Western Electric para detectar anomalías.
 *   5. Muestra alertas de texto y una tabla con el estado de cada muestra.
 */

const API_BASE = "https://apidemo.geoeducacion.com.ar/api/testing/control";

// Colores usados en el gráfico y en los puntos marcados
const COLORES = {
    variable: "#4e79a7",
    media: "#59a14f",
    limites: "#e15759",
    sigma2: "#f28e2b",
    sigma1: "#edc948",
    fueraControl: "#e15759",
    tendencia: "#f28e2b",
};

// Guarda la instancia del gráfico para poder destruirla al cambiar de caso
let chart = null;

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------

// Botón "Cargar": consulta el caso seleccionado
document.getElementById("btnCargar").addEventListener("click", () => {
    cargarCaso(document.getElementById("caso").value);
});

// Cambiar el selector también recarga el gráfico automáticamente
document.getElementById("caso").addEventListener("change", (e) => {
    cargarCaso(e.target.value);
});

// Al abrir la página se carga el caso que esté seleccionado (por defecto, el 1)
document.addEventListener("DOMContentLoaded", () => {
    cargarCaso(document.getElementById("caso").value);
});

// ---------------------------------------------------------------------------
// Consumo de la API
// ---------------------------------------------------------------------------

/**
 * Pide los datos del caso a la API y dispara el dibujo, el análisis y la tabla.
 * @param {number|string} caso - Número de caso (1 a 5).
 */
async function cargarCaso(caso) {
    try {
        const res = await fetch(`${API_BASE}/${caso}`);

        // res.ok es false si la API responde con un error HTTP (404, 500, etc.)
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();

        if (!json.success || !json.data || json.data.length === 0) {
            mostrarAlertas([], "La API no devolvió datos válidos.");
            return;
        }

        // La API devuelve un array "data" con un solo objeto
        const { media, lsc, lic, valores } = json.data[0];

        /*
         * Cálculo de sigma (σ):
         * En un gráfico de control los límites están a 3 desviaciones estándar
         * de la línea central:
         *      LSC = media + 3σ
         *      LIC = media - 3σ
         * Restando ambas ecuaciones:
         *      LSC - LIC = 6σ   =>   σ = (LSC - LIC) / 6
         * Ejemplo con la API: (99 - 81) / 6 = 3
         */
        const sigma = (lsc - lic) / 6;

        const anomalias = analizarDatos(valores, media, lsc, lic, sigma);

        dibujarGrafico(valores, media, lsc, lic, sigma, anomalias);
        mostrarAlertas(anomalias);
        llenarTabla(valores, anomalias);
    } catch (error) {
        console.error(error);
        mostrarAlertas([], "Error al consultar la API. Revisá la conexión e intentá de nuevo.");
    }
}

// ---------------------------------------------------------------------------
// Gráfico
// ---------------------------------------------------------------------------

/**
 * Crea una serie horizontal (el mismo valor repetido n veces).
 * Chart.js necesita un valor por cada punto del eje X para trazar la línea.
 */
function lineaConstante(valor, n) {
    return new Array(n).fill(valor);
}

/**
 * Dibuja el gráfico de control.
 * Líneas: variable, media (LC), LSC, LIC y las zonas de ±1σ y ±2σ.
 * Los puntos con anomalía se pintan de rojo (fuera de control) o naranja (tendencia).
 */
function dibujarGrafico(valores, media, lsc, lic, sigma, anomalias) {
    const labels = valores.map((v) => v.x);
    const datos = valores.map((v) => v.y);
    const n = labels.length;

    // Estado de cada punto según las anomalías detectadas
    const estados = estadoPorPunto(valores.length, anomalias);
    const coloresPuntos = estados.map((estado) => {
        if (estado === "fuera") return COLORES.fueraControl;
        if (estado === "tendencia") return COLORES.tendencia;
        return COLORES.variable;
    });
    // Los puntos con anomalía se dibujan más grandes para que se vean mejor
    const radiosPuntos = estados.map((estado) => (estado === "normal" ? 4 : 7));

    const ctx = document.getElementById("graficoControl");

    // Si ya había un gráfico (de otro caso), se destruye antes de crear el nuevo
    if (chart) chart.destroy();

    // Configuración común para las líneas de referencia (sin puntos, punteadas)
    const referencia = (label, valor, color, dash) => ({
        label,
        data: lineaConstante(valor, n),
        borderColor: color,
        borderDash: dash,
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: false,
    });

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Variable",
                    data: datos,
                    borderColor: COLORES.variable,
                    backgroundColor: coloresPuntos,
                    pointBackgroundColor: coloresPuntos,
                    pointBorderColor: coloresPuntos,
                    pointRadius: radiosPuntos,
                    tension: 0.2,
                    borderWidth: 2,
                },
                referencia("Media (LC)", media, COLORES.media, [6, 4]),
                referencia("LSC (+3σ)", lsc, COLORES.limites, [4, 4]),
                referencia("LIC (-3σ)", lic, COLORES.limites, [4, 4]),
                referencia("+2σ", media + 2 * sigma, COLORES.sigma2, [2, 4]),
                referencia("-2σ", media - 2 * sigma, COLORES.sigma2, [2, 4]),
                referencia("+1σ", media + sigma, COLORES.sigma1, [2, 6]),
                referencia("-1σ", media - sigma, COLORES.sigma1, [2, 6]),
            ],
        },
        options: {
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: "Gráfico de control" },
                legend: { labels: { boxWidth: 20, font: { size: 11 } } },
            },
            scales: {
                x: { title: { display: true, text: "Muestreo (X)" } },
                y: {
                    title: { display: true, text: "Variable (Y)" },
                    // Margen para que LSC/LIC y los puntos extremos no queden pegados al borde
                    suggestedMin: lic - sigma,
                    suggestedMax: lsc + sigma,
                },
            },
        },
    });
}

// Análisis estadístico

/**
 * Devuelve de qué lado de la línea central está un valor:
 *    1 = arriba, -1 = abajo, 0 = exactamente sobre la media.
 */
function lado(valor, media) {
    if (valor > media) return 1;
    if (valor < media) return -1;
    return 0;
}

/**
 * Recorre los datos y aplica las 4 reglas de la consigna.
 * Cada anomalía guarda: número de regla, tipo, índices de los puntos
 * involucrados y el mensaje que se muestra en pantalla.
 *
 * Límites usados (con media = 90 y σ = 3):
 *    ±1σ -> 87 / 93
 *    ±2σ -> 84 / 96
 *    ±3σ -> 81 / 99 (LIC / LSC)
 */
function analizarDatos(valores, media, lsc, lic, sigma) {
    const y = valores.map((v) => v.y);
    const anomalias = [];

    // --- Regla 1 (caso 1): un punto fuera de los límites de control ---
    // Un valor mayor a LSC o menor a LIC indica que el proceso está fuera de control.
    y.forEach((valor, i) => {
        if (valor > lsc || valor < lic) {
            anomalias.push({
                regla: 1,
                tipo: "fuera",
                puntos: [i],
                mensaje: `Fuera de control: la muestra ${valores[i].x} (valor ${valor}) superó el límite de control (LSC ${lsc} / LIC ${lic}).`,
            });
        }
    });

    // --- Regla 2 (caso 3): 2 de 3 puntos consecutivos más allá de 2σ, del mismo lado ---
    // Límites: media ± 2σ. Se usa una "ventana deslizante" de 3 puntos.
    const lim2Sup = media + 2 * sigma;
    const lim2Inf = media - 2 * sigma;
    const r2 = buscarVentana(y, 3, 2, lim2Sup, lim2Inf);
    if (r2) {
        anomalias.push({
            regla: 2,
            tipo: "tendencia",
            puntos: r2.puntos,
            mensaje: `Tendencia: 2 de 3 puntos consecutivos más allá de 2σ (${lim2Inf} / ${lim2Sup}) en las muestras ${valores[r2.inicio].x} a ${valores[r2.inicio + 2].x}.`,
        });
    }

    // --- Regla 3 (caso 4): 4 de 5 puntos consecutivos más allá de 1σ, del mismo lado ---
    // Límites: media ± 1σ. Ventana deslizante de 5 puntos.
    const lim1Sup = media + sigma;
    const lim1Inf = media - sigma;
    const r3 = buscarVentana(y, 5, 4, lim1Sup, lim1Inf);
    if (r3) {
        anomalias.push({
            regla: 3,
            tipo: "tendencia",
            puntos: r3.puntos,
            mensaje: `Tendencia: 4 de 5 puntos consecutivos más allá de 1σ (${lim1Inf} / ${lim1Sup}) en las muestras ${valores[r3.inicio].x} a ${valores[r3.inicio + 4].x}.`,
        });
    }

    // --- Regla 4 (caso 5): 8 puntos consecutivos del mismo lado de la línea central ---
    // Se cuenta una "racha": si el punto está del mismo lado que el anterior, suma 1;
    // si cambia de lado, arranca de nuevo. Un punto exactamente sobre la media
    // (lado 0) no pertenece a ningún lado y corta la racha.
    let racha = 0;
    let ladoRacha = 0;
    for (let i = 0; i < y.length; i++) {
        const ladoActual = lado(y[i], media);

        if (ladoActual !== 0 && ladoActual === ladoRacha) {
            racha++;
        } else {
            ladoRacha = ladoActual;
            racha = ladoActual === 0 ? 0 : 1;
        }

        if (racha >= 8) {
            const inicio = i - 7;
            anomalias.push({
                regla: 4,
                tipo: "tendencia",
                puntos: rango(inicio, i),
                mensaje: `Tendencia: 8 puntos consecutivos ${ladoRacha === 1 ? "por encima" : "por debajo"} de la línea central (muestras ${valores[inicio].x} a ${valores[i].x}).`,
            });
            break; // Se informa la primera racha encontrada
        }
    }

    return anomalias;
}

/**
 * Ventana deslizante: recorre los datos de a "tamanio" puntos consecutivos y
 * busca si al menos "minimo" de ellos están por encima de limSup o por debajo
 * de limInf (siempre del MISMO lado).
 * Devuelve la primera ventana que cumple la condición, o null.
 *
 * Ejemplo regla 2: tamanio = 3, minimo = 2 -> "2 de 3 puntos".
 */
function buscarVentana(y, tamanio, minimo, limSup, limInf) {
    for (let i = 0; i <= y.length - tamanio; i++) {
        const indices = rango(i, i + tamanio - 1);
        const arriba = indices.filter((j) => y[j] > limSup);
        const abajo = indices.filter((j) => y[j] < limInf);

        if (arriba.length >= minimo) return { inicio: i, puntos: arriba };
        if (abajo.length >= minimo) return { inicio: i, puntos: abajo };
    }
    return null;
}

/** Devuelve un array con los enteros desde "desde" hasta "hasta" (inclusive). */
function rango(desde, hasta) {
    const r = [];
    for (let i = desde; i <= hasta; i++) r.push(i);
    return r;
}

/**
 * Traduce la lista de anomalías a un estado por punto:
 * "fuera" (regla 1), "tendencia" (reglas 2 a 4) o "normal".
 * "fuera" tiene prioridad sobre "tendencia".
 */
function estadoPorPunto(cantidad, anomalias) {
    const estados = new Array(cantidad).fill("normal");
    anomalias.forEach((a) => {
        a.puntos.forEach((i) => {
            if (a.tipo === "fuera") estados[i] = "fuera";
            else if (estados[i] !== "fuera") estados[i] = "tendencia";
        });
    });
    return estados;
}

// ---------------------------------------------------------------------------
// Salida en pantalla (DOM)
// ---------------------------------------------------------------------------

/**
 * Muestra las alertas de texto debajo del gráfico.
 * - Si hay un error de la API, muestra solo el error.
 * - Si no hay anomalías, informa que el proceso está bajo control.
 * - Si hay anomalías, muestra una alerta por cada una.
 */
function mostrarAlertas(anomalias, errorTexto) {
    const cont = document.getElementById("alertas");
    cont.innerHTML = "";

    if (errorTexto) {
        agregarAlerta("error", errorTexto);
        return;
    }

    if (anomalias.length === 0) {
        agregarAlerta("ok", "El proceso se encuentra bajo control. No se detectaron anomalías.");
        return;
    }

    anomalias.forEach((a) => {
        agregarAlerta(a.tipo === "fuera" ? "error" : "warning", a.mensaje);
    });
}

/** Crea un div de alerta con la clase CSS correspondiente al tipo. */
function agregarAlerta(tipo, texto) {
    const cont = document.getElementById("alertas");
    const div = document.createElement("div");
    div.className = `alerta alerta-${tipo}`;
    div.textContent = texto;
    cont.appendChild(div);
}

/**
 * Llena la tabla con cada muestra y su estado.
 * Las filas con anomalía se colorean según el tipo.
 */
function llenarTabla(valores, anomalias) {
    const tbody = document.querySelector("#tablaDatos tbody");
    tbody.innerHTML = "";

    const estados = estadoPorPunto(valores.length, anomalias);
    const textos = { normal: "Normal", tendencia: "Tendencia", fuera: "Fuera de control" };

    valores.forEach((v, i) => {
        const tr = document.createElement("tr");
        if (estados[i] === "fuera") tr.classList.add("fila-alerta");
        if (estados[i] === "tendencia") tr.classList.add("fila-tendencia");

        [v.x, v.y, textos[estados[i]]].forEach((contenido) => {
            const td = document.createElement("td");
            td.textContent = contenido;
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
}
