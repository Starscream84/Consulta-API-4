const API_BASE = "https://apidemo.geoeducacion.com.ar/api/testing/control";

let chart = null; //variable donde guardamos el gráfico

//BOTON "CARGAR" 
//cuando el usuario hace clic en btn guardar, obtenemos el caso seleccionado 
//y llamamos a cargarCaso()
document.getElementById("btnCargar").addEventListener("click", () => {
    const caso = document.getElementById("caso").value;
    cargarCaso(caso);
});

//CARGA INICIAL
// Carga el caso 1 apenas se abre la página
document.addEventListener("DOMContentLoaded", () => cargarCaso(1));


//CONSULTAR LA API
async function cargarCaso(caso) {
    try { //Consulta a la API
        const res = await fetch(`${API_BASE}/${caso}`, {cache: "no-store"});
        if (!res.ok) { //si la respuesta no es correcta = error
        mostrarAlertas([], `Error ${res.status} al consultar la API.`);
        return;
        }
        const json = await res.json(); //convertimos la resp a formato JSON


    console.log("CASO:", caso);
    console.log("RESPUESTA DE LA API:", json);

        if (!json.success) { //verificamos que devuelva datos correctos
            mostrarAlertas([], "La API no devolvió datos válidos.");
            return;
        }

        // CALCULO DE SIGMA
        //la distancia entre la Media y el Limite superior de control (LSC) equivale a 3 sigmas
        const { media, lsc, lic, valores } = json.data[0]; //lo que obtenemos de la resp de la API  
        const sigma = (lsc - media) / 3; 


        //Calculo de los limites de sigma   
        const lim1Sup = media + sigma;
        const lim2Sup = media + 2 * sigma;
        const lim1Inf = media - sigma;
        const lim2Inf = media - 2 * sigma;

        dibujarGrafico(valores, media, lsc, lic, lim1Sup, lim2Sup, lim1Inf, lim2Inf);

        //ANALIZAR DATOS
        // Buscamos si existen anomalías según las reglas de los gráficos de control.
        const anomalias = analizarDatos(valores, media, lsc, lic, sigma);

        mostrarAlertas(anomalias);
        llenarTabla(valores, anomalias); //cargamos los datos a la tabla

    } catch (error) {
        console.error(error);
        mostrarAlertas([], "Error al consultar la API.");
    }
}

//CREAR GRAFICO
function dibujarGrafico(valores, media, lsc, lic, lim1Sup, lim2Sup, lim1Inf, lim2Inf) {
    //obtenemos los valore X, Y de cada muestra
    const labels = valores.map((v) => v.x);
    const datos = valores.map((v) => v.y);
    const n = labels.length; //cantidad de muestras 

    const ctx = document.getElementById("graficoControl");
    if (chart) chart.destroy();

    //funcion para crear las lineas de referencia   
    const crearLineaConEtiqueta = (valor, texto, color, dash = [2, 4]) => ({
        type: 'line',
        yMin: valor,
        yMax: valor,
        borderColor: color,
        borderWidth: 1.5,
        borderDash: dash,
        label: {
            display: true,
            content: texto,
            position: 'end', 
            backgroundColor: 'transparent',
            color: color,
            font: { size: 10, weight: 'bold' },
            xAdjust: 50 
        }
    });

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
                    label: "Sigma 2",
                    data: new Array(n).fill(lim2Sup),
                    borderColor: "#f28e2b", // Tono naranja
                    borderDash: [2, 4],
                    borderWidth: 1.5,
                    pointRadius: 0,
                    fill: false,
                },
                {
                    label: "Sigma 1",
                    data: new Array(n).fill(lim1Sup),
                    borderColor: "#edc949", // Tono amarillo suave
                    borderDash: [2, 4],
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: false,
                },
                {
                    label: "Sigma -1",
                    data: new Array(n).fill(lim1Inf),
                    borderColor: "#edc949",
                    borderDash: [2, 4],
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: false,
                },
                {
                    label: "Sigma -2",
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
            layout: {
                padding: {
                    right: 85
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: { display: true, text: "Gráfico de control con zona de sigma" },

                annotation: {
                    clip:false,
                    annotations: {
                        lineaLSC: crearLineaConEtiqueta(lsc, `LSC (+3σ): ${lsc.toFixed(2)}`, "#e15759", [4, 4]),
                        linea2Sup: crearLineaConEtiqueta(lim2Sup, "Sigma 2", "#f28e2b"),
                        linea1Sup: crearLineaConEtiqueta(lim1Sup, "Sigma 1", "#edc949"),
                        lineaMedia: crearLineaConEtiqueta(media, "Media (LC)", "#59a14f", [6, 4]),
                        linea1Inf: crearLineaConEtiqueta(lim1Inf, "Sigma -1", "#edc949"),
                        linea2Inf: crearLineaConEtiqueta(lim2Inf, "Sigma -2", "#f28e2b"),
                        lineaLIC: crearLineaConEtiqueta(lic, `LIC (-3σ): ${lic.toFixed(2)}`, "#e15759", [4, 4]),
                    }
                }
            },
            scales: {
                x: { title: { display: true, text: "Muestreo (X)" } },
                y: { title: { display: true, text: "Variable (Y)" } },
            },
        },
    });
}

// Analiza los valores obtenidos de la API y busca  dif situaciones que pueden indicar 
//que el proceso está fuera de control 
function analizarDatos(valores, media, lsc, lic, sigma) {
    const y = valores.map((v) => v.y);
    const anomalias = [];

    // Caso 1: Un punto está fuera de control cuando supera el LSC (+3σ) o queda por debajo del LIC (-3σ).
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

    // Caso 4: 4 de 5 puntos consecutivos más allá de 1 sigma (mismo lado) Oo
    //más allá de -1σ = señal de alerta
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

function mostrarAlertas(anomalias, errorTexto) { //buscamos el contenedor de alertas 
    const cont = document.getElementById("alertas");
    cont.innerHTML = ""; //limpiamos alertas anteriores 

    if (errorTexto) { //si existe un error lo mostramos
        agregarAlerta("error", errorTexto);
        return;
    }

    if (anomalias.length === 0) { //si no hay anomalias
        agregarAlerta("ok", "El proceso se encuentra bajo control. No se detectaron anomalías.");
        return;
    }

    anomalias.forEach((a) => agregarAlerta("warning", a.mensaje)); //si hay, mostramos advertencia
}


//CREAR UNA ALERTA
function agregarAlerta(tipo, texto) {
    const cont = document.getElementById("alertas"); //obtenemos el contenedor 
    const div = document.createElement("div"); //creamos nuevo contenedor div
    div.className = `alerta alerta-${tipo}`; //le asginamos una clase segun el tipo de alerta
    div.textContent = texto; //texto dentro del div
    cont.appendChild(div);
}

//LLENAR TABLA
function llenarTabla(valores, anomalias) {
    const tbody = document.querySelector("#tablaDatos tbody"); //buscamos el cuerpo de la tabla 
    tbody.innerHTML = "";

    const indicesFueraControl = new Set( // Creamos un Set con los índices de los puntos que están fuera de los límites de control.
        anomalias.filter((a) => a.regla === 1).map((a) => a.indice)
    );

    valores.forEach((v, i) => { //recorremos todos los valores obtenidos de la API 
        const tr = document.createElement("tr"); //creamos una fila nueva 
        const estado = indicesFueraControl.has(i) ? "Fuera de control" : "Normal"; //determinamos el estado del punto 
        if (estado === "Fuera de control") tr.classList.add("fila-alerta");

        tr.innerHTML = `<td>${v.x}</td><td>${v.y}</td><td>${estado}</td>`;
        tbody.appendChild(tr);
    });
}
