const ENDPOINT =
  "https://script.google.com/macros/s/AKfycbzZ4xNNHyuizCzw36lovgsulD9_FCTr9PvlGiPakHQXybbgLXGIsm7bdn7aOIsrVg9qiw/exec";

let ALL_ACTIVITIES = [];

/* =======================
   FECHAS
======================= */

// SOLO para filtros
function parseFechaFiltro(valor) {
  if (!valor) return null;

  if (typeof valor === "string" && valor.includes("/")) {
    const [d, m, y] = valor.split("/");
    return new Date(`${y}-${m}-${d}T00:00:00`);
  }

  const f = new Date(valor);
  return isNaN(f) ? null : f;
}

// SOLO para mostrar
function mostrarFecha(valor) {
  if (!valor) return "";
  if (typeof valor === "string" && valor.includes("/")) return valor;

  const d = new Date(valor);
  if (isNaN(d)) return "";

  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
}

/* =======================
   HORAS
======================= */

function limpiarHora(valor) {
  if (!valor) return "";

  if (typeof valor === "string" && valor.includes("T")) {
    const d = new Date(valor);
    if (isNaN(d)) return "";
    return d.toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  }

  return valor;
}

function mostrarHora(inicio, fin) {
  const h1 = limpiarHora(inicio);
  const h2 = limpiarHora(fin);

  if (h1 && h2) return `${h1} - ${h2}`;
  return h1 || h2 || "";
}

/* =======================
   FETCH
======================= */

fetch(ENDPOINT)
  .then(r => r.json())
  .then(data => {
    ALL_ACTIVITIES = data
      .filter(a => a["Aprobado"] === "Si" || a["Aprobado"] === "SI" || a["Aprobado"] === "si")
      .map(a => ({
        ...a,
        _fechaFiltro: parseFechaFiltro(a["Fecha de realización"]),
        _publicos: a["Público objetivo"]
          ? a["Público objetivo"].split(",").map(p => p.trim())
          : []
      }));

    renderWeeklyAgenda(ALL_ACTIVITIES);
    buildFilters(ALL_ACTIVITIES);
  })
  .catch(err => {
    console.error(err);
    document.getElementById("agenda").innerText =
      "Error cargando actividades";
  });

/* =======================
   AGENDA SEMANAL
======================= */
function ordenarPorFechaYHora(lista) {
  return lista.sort((a, b) => {
    // 1. Primero comparamos la fecha
    if (a._fechaFiltro.getTime() !== b._fechaFiltro.getTime()) {
      return a._fechaFiltro - b._fechaFiltro;
    }
    
    // 2. Si la fecha es igual, aplicamos el artificio decimal para la hora
    const obtenerDecimal = (h) => {
      if (!h) return 0;
      
      // ¡AQUÍ ESTÁ LA MAGIA! Pasamos el valor crudo por tu función limpiadora primero
      const horaLimpia = limpiarHora(h);
      if (!horaLimpia) return 0;

      // Ahora sí, horaLimpia es un formato amigable como "09:30".
      // Reemplazamos los dos puntos por un punto para volverlo decimal (ej. "09.30")
      const inicio = horaLimpia.split("-")[0].trim().replace(":", ".");
      return parseFloat(inicio) || 0;
    };

    const horaA = obtenerDecimal(a["Hora de INICIO"]);
    const horaB = obtenerDecimal(b["Hora de INICIO"]);

    // 3. Comparamos los números (ej. 9.30 vs 14.00)
    return horaA - horaB;
  });
}

function renderWeeklyAgenda(list) {
  const cont = document.getElementById("agenda");
  cont.innerHTML = "";

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // calcular lunes de la semana actual
  const dia = hoy.getDay(); // 0=domingo
  const diffLunes = dia === 0 ? -6 : 1 - dia;

  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diffLunes);
  lunes.setHours(0, 0, 0, 0);

  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  domingo.setHours(23, 59, 59, 999);

  // no mostrar días pasados
  const inicioVisible = hoy > lunes ? hoy : lunes;

  const semanal = list.filter(
      a =>
        a._fechaFiltro &&
        a._fechaFiltro >= inicioVisible &&
        a._fechaFiltro <= domingo
    );
  ordenarPorFechaYHora(semanal);

  if (!semanal.length) {
    cont.innerHTML =
      `<div class="sin-actividades">No hay actividades para el resto de la semana.</div>`;
    return;
  }

  semanal.forEach(a => cont.appendChild(buildCard(a)));
}

/* ======================
   FILTROS
======================= */

function buildFilters(list) {
  const div = document.getElementById("filtros-cti");
  const uniq = arr => [...new Set(arr)].filter(Boolean).sort();
  const regiones = uniq(list.map(a => a["Región"]));
  const modalidades = uniq(list.map(a => a["Modalidad"]));
  const publicos = uniq(list.flatMap(a => a._publicos));

  div.innerHTML = `
    <select id="f-region"><option value="">Región</option>${regiones.map(r => `<option>${r}</option>`).join("")}</select>
    <select id="f-modalidad"><option value="">Modalidad</option>${modalidades.map(m => `<option>${m}</option>`).join("")}</select>
    <select id="f-publico"><option value="">Público objetivo</option>${publicos.map(p => `<option>${p}</option>`).join("")}</select>
    <span class="label-inline">Desde:</span>
    <input type="date" id="f-desde">
    <span class="label-inline">Hasta:</span>
    <input type="date" id="f-hasta">
  `;

  // Insertar los botones centrados dentro del panel blanco
  let btnContainer = document.querySelector(".btn-container-center");
  if (!btnContainer) {
    btnContainer = document.createElement("div");
    btnContainer.className = "btn-container-center";
    div.parentNode.appendChild(btnContainer);
  }
  btnContainer.innerHTML = `
    <button class="btn-filter" onclick="applyFilters()">Filtrar</button>
    <button class="btn-filter" style="background:#64748b" onclick="clearFilters()">Limpiar</button>
  `;
}

function applyFilters() {
  const region = f("f-region");
  const modalidad = f("f-modalidad");
  const publico = f("f-publico");
  const desde = f("f-desde");
  const hasta = f("f-hasta");

  const dDesde = desde ? new Date(desde + "T00:00:00") : null;
  const dHasta = hasta ? new Date(hasta + "T23:59:59.999") : null;

  const res = ALL_ACTIVITIES.filter(a => {
    if (region && a["Región"] !== region) return false;
    if (modalidad && a["Modalidad"] !== modalidad) return false;
    if (publico && !a._publicos.includes(publico)) return false;
    if (!a._fechaFiltro) return false;
    if (dDesde && a._fechaFiltro < dDesde) return false;
    if (dHasta && a._fechaFiltro > dHasta) return false;
    return true;
  });

  document.getElementById("titulo-semana").style.display = "none";
  document.getElementById("agenda").style.display = "none";

  renderFilterResults(ordenarPorFechaYHora(res));
}

function clearFilters() {
  document
    .querySelectorAll("#filtros-cti select, #filtros-cti input")
    .forEach(e => (e.value = ""));
  document.getElementById("resultados-filtro").innerHTML = "";
  document.getElementById("titulo-semana").style.display = "block";
  document.getElementById("agenda").style.display = "block";
}

function f(id) {
  return document.getElementById(id).value;
}

function renderFilterResults(list) {
  const div = document.getElementById("resultados-filtro");
  
  // Si no hay lista (limpieza), vaciamos y salimos
  if (!list) {
    div.innerHTML = "";
    return;
  }

  div.innerHTML = "<h2 class='section-label' style='margin-top:30px;'>📋 Resultados del filtro</h2>";

  if (!list.length) {
    div.innerHTML += `<div class="actividad" style="border-left-color: #ffc107;">No se encontraron actividades para los criterios seleccionados.</div>`;
    return;
  }

  list.forEach(a => div.appendChild(buildCard(a)));
  
  // Opcional: Hacer scroll automático hacia los resultados
  // div.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* =======================
   CARD
======================= */

function buildCard(a) {
  const div = document.createElement("div");
  div.className = "actividad";

  const fecha = mostrarFecha(a["Fecha de realización"]);
  const hora = mostrarHora(
    a["Hora de INICIO"],
    a["Hora de FINALIZACIÓN"]
  );

  let html = `
    <div class="fecha">${fecha}${hora ? " | " + hora : ""}</div>
    <h3>${a["Nombre de la actividad"].toUpperCase()}</h3>

    <div class="institucion">
      ${a["Nombre de la entidad"].toUpperCase()} | ${a["Región"].toUpperCase()}
    </div>

    <p style="white-space: pre-line;">${a["Descripción mejorada"]}</p>

    <div><strong>Público objetivo:</strong> ${a["Público objetivo"]}</div>
    <div><strong>Modalidad:</strong> ${a["Modalidad"]}</div>
  `;

  if (a["Modalidad"] === "Presencial - abierta al público") {
    html += `<div><strong>Lugar del evento:</strong> ${a["Lugar del evento (dirección, distrito, provincia, nombre de auditorio, facultad, etc.)"]}</div>`;
  }

  if (
    a["Modalidad"] === "Virtual" ||
    a["Modalidad"] === "Publicaciones (Infografias, videos, podcast, etc)"
  ) {
    html += `
      <div><strong>Enlace del evento:</strong>
        <a href="${a["Enlace del evento"]}" target="_blank">
          ${a["Enlace del evento"]}
        </a>
      </div>`;
  }

  if (a["Modalidad"] === "Híbrida (público asisten presencial y hay transmisión online)") {
    html += `
      <div><strong>Lugar del evento:</strong> ${a["Lugar del evento (dirección, distrito, provincia, nombre de auditorio, facultad, etc.)"]}</div>
      <div><strong>Enlace del evento:</strong>
        <a href="${a["Enlace del evento"]}" target="_blank">
          ${a["Enlace del evento"]}
        </a>
      </div>`;
  }

  if (
    a["Inscripción: ¿El evento requiere inscripción previa?"] ===
    "El evento requiere inscripción previa"
  ) {
    html += `
      <div><strong>Enlace de inscripción:</strong>
        <a href="${a["Enlace a inscripción (solo si se necesita)"]}" target="_blank">
          ${a["Enlace a inscripción (solo si se necesita)"]}
        </a>
      </div>`;
  }

  if (a["Enlace para más información"]) {
    const links = a["Enlace para más información"].split(/\r?\n/).map(l => l.trim()).filter(l => l !== "");

    if (links.length === 1) {
      html += `
        <div><strong>Más información:</strong> 
          <a href="${links[0]}" target="_blank" style="word-break: break-all;">
            ${links[0]}
          </a>
        </div>`;
    } else if (links.length > 1) {
      html += `<div><strong>Más información:</strong>`;
      
      links.forEach(link => {
        html += `
          <div style="margin-top: 5px; margin-left: 15px;">
            <a href="${link}" target="_blank" style="word-break: break-all;">
              ${link}
            </a>
          </div>`;
      });

      html += `</div>`;
    }
  }

  if (a["Información adicional que se debe detallar en la agenda"]) {
    html += `
      <div><strong>Información adicional:</strong>
        ${a["Información adicional que se debe detallar en la agenda"]}
      </div>`;
  }

  div.innerHTML = html;
  return div;
}
