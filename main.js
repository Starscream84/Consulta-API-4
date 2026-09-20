const API_BASE = "https://apidemo.geoeducacion.com.ar/api/testing/control";
 
let chart = null;
 
document.getElementById("btnCargar").addEventListener("click", () => {
    const caso = document.getElementById("caso").value;
    cargarCaso(caso);
});
 
// Carga el caso 1 apenas se abre la página
document.addEventListener("DOMContentLoaded", () => cargarCaso(1));
 
async function cargarCaso(caso) {
    try {
        const res = await fetch(`${API_BASE}/${caso}`);
        const json = await res.json();
 
        if (!json.success) {
            mostrarAlertas([], "La API no devolvió datos válidos.");
            return;
        }
 
        const { media, lsc, lic, valores } = json.data[0];
        const sigma = (lsc - media) / 3; // 3 sigma = distancia hasta LSC/LIC

        // calculo de los sigmas
        const lim1Sup = media + sigma;
        const lim2Sup = media + 2 * sigma;
        const lim1Inf = media - sigma;
        const lim2Inf = media - 2 * sigma;
 
        dibujarGrafico(valores, media, lsc, lic, lim1Sup, lim2Sup, lim1Inf, lim2Inf);
        const anomalias = analizarDatos(valores, media, lsc, lic, sigma);
        mostrarAlertas(anomalias);
        llenarTabla(valores, anomalias);
    } catch (error) {
        console.error(error);
        mostrarAlertas([], "Error al consultar la API.");
    }
}
 
function dibujarGrafico(valores, media, lsc, lic, lim1Sup, lim2Sup, lim1Inf, lim2Inf) {
    const labels = valores.map((v) => v.x);
    const datos = valores.map((v) => v.y);
    const n = labels.length;
 
    const ctx = document.getElementById("graficoControl");
    if (chart) chart.destroy();
 
    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Variable",
                    data: datos,
                    borderColor: "#4e79a7",
                    backgroundColor: "#4e79a7",
                    tension: 0.2,
                    pointRadius: 4,
                },
                {
                    label: "Media (LC)",
                    data: new Array(n).fill(media),
                    borderColor: "#59a14f",
                    borderDash: [6, 4],
                    pointRadius: 0,
                    fill: false,
                },
                {
                    label: "LSC (+3σ)",
                    data: new Array(n).fill(lsc),
                    borderColor: "#e15759",
                    borderDash: [4, 4],
                    pointRadius: 0,
                    fill: false,
                },
                {
                    label: "+2σ",
                    data: new Array(n).fill(lim2Sup),
                    borderColor: "#f28e2b", // Tono naranja
                    borderDash: [2, 4],
                    borderWidth: 1.5,
                    pointRadius: 0,
                    fill: false,
                },
                {
                    label: "+1σ",
                    data: new Array(n).fill(lim1Sup),
                    borderColor: "#edc949", // Tono amarillo suave
                    borderDash: [2, 4],
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: false,
                },
                {
                    label: "-1σ",
                    data: new Array(n).fill(lim1Inf),
                    borderColor: "#edc949",
                    borderDash: [2, 4],
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: false,
                },
                {
                    label: "-2σ",
                    data: new Array(n).fill(lim2Inf),
                    borderColor: "#f28e2b",
                    borderDash: [2, 4],
                    borderWidth: 1.5,
                    pointRadius: 0,
                    fill: false,
                },
                {
                    label: "LIC (-3σ)",
                    data: new Array(n).fill(lic),
                    borderColor: "#e15759",
                    borderDash: [4, 4],
                    pointRadius: 0,
                    fill: false,
                },
            ],
        },
        options: {
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: "Gráfico de control con zona de sigma" },
            },
            scales: {
                x: { title: { display: true, text: "Muestreo (X)" } },
                y: { title: { display: true, text: "Variable (Y)" } },
            },
        },
    });
}
 
// Detecta las 4 situaciones descriptas en la consigna
function analizarDatos(valores, media, lsc, lic, sigma) {
    const y = valores.map((v) => v.y);
    const anomalias = [];
 
    // Caso 1: punto(s) fuera de LSC/LIC
    y.forEach((valor, i) => {
        if (valor > lsc || valor < lic) {
            anomalias.push({
                regla: 1,
                indice: i,
                mensaje: `Fuera de control: la muestra ${valores[i].x} (valor ${valor}) superó el límite de control (LSC ${lsc} / LIC ${lic}).`,
            });
        }
    });
 
    // Caso 3: 2 de 3 puntos consecutivos más allá de 2 sigma (mismo lado)
    const lim2Sup = media + 2 * sigma;
    const lim2Inf = media - 2 * sigma;
    for (let i = 0; i <= y.length - 3; i++) {
        const ventana = y.slice(i, i + 3);
        const arriba = ventana.filter((v) => v > lim2Sup).length;
        const abajo = ventana.filter((v) => v < lim2Inf).length;
        if (arriba >= 2 || abajo >= 2) {
            anomalias.push({
                regla: 2,
                indice: i + 2,
                mensaje: `Tendencia: 2 de 3 puntos consecutivos más allá de 2σ (muestras ${valores[i].x} a ${valores[i + 2].x}).`,
            });
            break;
        }
    }
 
    // Caso 4: 4 de 5 puntos consecutivos más allá de 1 sigma (mismo lado)
    const lim1Sup = media + sigma;
    const lim1Inf = media - sigma;
    for (let i = 0; i <= y.length - 5; i++) {
        const ventana = y.slice(i, i + 5);
        const arriba = ventana.filter((v) => v > lim1Sup).length;
        const abajo = ventana.filter((v) => v < lim1Inf).length;
        if (arriba >= 4 || abajo >= 4) {
            anomalias.push({
                regla: 3,
                indice: i + 4,
                mensaje: `Tendencia: 4 de 5 puntos consecutivos más allá de 1σ (muestras ${valores[i].x} a ${valores[i + 4].x}).`,
            });
            break;
        }
    }
 
    // Caso 5: 8 puntos consecutivos del mismo lado de la línea central
    let contador = 1;
    let ladoAnterior = y[0] > media ? "arriba" : "abajo";
    for (let i = 1; i < y.length; i++) {
        const ladoActual = y[i] > media ? "arriba" : "abajo";
        if (ladoActual === ladoAnterior) {
            contador++;
        } else {
            contador = 1;
            ladoAnterior = ladoActual;
        }
        if (contador >= 8) {
            anomalias.push({
                regla: 4,
                indice: i,
                mensaje: `Tendencia: 8 puntos consecutivos del mismo lado (${ladoActual}) de la línea central (hasta la muestra ${valores[i].x}).`,
            });
            break;
        }
    }
 
    return anomalias;
}
 
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
 
    anomalias.forEach((a) => agregarAlerta("warning", a.mensaje));
}
 
function agregarAlerta(tipo, texto) {
    const cont = document.getElementById("alertas");
    const div = document.createElement("div");
    div.className = `alerta alerta-${tipo}`;
    div.textContent = texto;
    cont.appendChild(div);
}
 
function llenarTabla(valores, anomalias) {
    const tbody = document.querySelector("#tablaDatos tbody");
    tbody.innerHTML = "";
 
    const indicesFueraControl = new Set(
        anomalias.filter((a) => a.regla === 1).map((a) => a.indice)
    );
 
    valores.forEach((v, i) => {
        const tr = document.createElement("tr");
        const estado = indicesFueraControl.has(i) ? "Fuera de control" : "Normal";
        if (estado === "Fuera de control") tr.classList.add("fila-alerta");
 
        tr.innerHTML = `<td>${v.x}</td><td>${v.y}</td><td>${estado}</td>`;
        tbody.appendChild(tr);
    });
}