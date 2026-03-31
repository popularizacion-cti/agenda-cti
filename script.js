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

  const semanal = list
    .filter(
      a =>
        a._fechaFiltro &&
        a._fechaFiltro >= inicioVisible &&
        a._fechaFiltro <= domingo
    )
    .sort((a, b) => a._fechaFiltro - b._fechaFiltro);

  if (!semanal.length) {
    cont.innerHTML =
      `<div class="sin-actividades">No hay actividades para el resto de la semana.</div>`;
    return;
  }

  semanal.forEach(a => cont.appendChild(buildCard(a)));
}

/* =======================
   FILTROS
======================= */

// function buildFilters(list) {
//   const div = document.getElementById("filtros-cti");

//   const uniq = arr => [...new Set(arr)].filter(Boolean).sort();

//   const regiones = uniq(list.map(a => a["Región"]));
//   const modalidades = uniq(list.map(a => a["Modalidad"]));
//   const publicos = uniq(list.flatMap(a => a._publicos));

//   div.innerHTML = `
//     <select id="f-region">
//       <option value="">Región</option>
//       ${regiones.map(r => `<option>${r}</option>`).join("")}
//     </select>

//     <select id="f-modalidad">
//       <option value="">Modalidad</option>
//       ${modalidades.map(m => `<option>${m}</option>`).join("")}
//     </select>

//     <select id="f-publico">
//       <option value="">Público objetivo</option>
//       ${publicos.map(p => `<option>${p}</option>`).join("")}
//     </select>

//     Desde: <input type="date" id="f-desde">
//     Hasta: <input type="date" id="f-hasta">

//     <br><br>
//     <button onclick="applyFilters()">Filtrar</button>
//     <button onclick="clearFilters()">Limpiar</button>
//   `;
// }

function buildFilters(list) {
  const div = document.getElementById("filtros-cti");
  const uniq = arr => [...new Set(arr)].filter(Boolean).sort();
  const regiones = uniq(list.map(a => a["Región"]));
  const modalidades = uniq(list.map(a => a["Modalidad"]));
  const publicos = uniq(list.flatMap(a => a._publicos));

  // Generamos los 5 campos en una sola línea
  div.innerHTML = `
    <select id="f-region"><option value="">Región</option>${regiones.map(r => `<option>${r}</option>`).join("")}</select>
    <select id="f-modalidad"><option value="">Modalidad</option>${modalidades.map(m => `<option>${m}</option>`).join("")}</select>
    <select id="f-publico"><option value="">Público objetivo</option>${publicos.map(p => `<option>${p}</option>`).join("")}</select>
    <input type="date" id="f-desde" title="Desde">
    <input type="date" id="f-hasta" title="Hasta">
  `;

  // Creamos el contenedor de botones centrados debajo de los filtros
  const btnContainer = document.createElement("div");
  btnContainer.className = "btn-container-center";
  btnContainer.innerHTML = `
    <button class="btn-filter" onclick="applyFilters()">Filtrar</button>
    <button class="btn-filter" style="background:#64748b" onclick="clearFilters()">Limpiar</button>
  `;
  div.parentNode.insertBefore(btnContainer, div.nextSibling);
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

  renderFilterResults(res.sort((a, b) => a._fechaFiltro - b._fechaFiltro));
}

function clearFilters() {
  document
    .querySelectorAll("#filtros-cti select, #filtros-cti input")
    .forEach(e => (e.value = ""));
  document.getElementById("resultados-filtro").innerHTML = "";
}

function f(id) {
  return document.getElementById(id).value;
}

/* =======================
   RESULTADOS FILTRO
======================= */

function renderFilterResults(list) {
  const div = document.getElementById("resultados-filtro");
  div.innerHTML = "<h2>📋 Resultados del filtro</h2>";

  if (!list.length) {
    div.innerHTML +=
      `<div class="sin-actividades">No se encontraron actividades.</div>`;
    return;
  }

  list.forEach(a => div.appendChild(buildCard(a)));
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

    <p style="white-space: pre-line;">${a["Resumen de la actividad"]}</p>

    <div><strong>Público objetivo:</strong> ${a["Público objetivo"]}</div>
    <div><strong>Modalidad:</strong> ${a["Modalidad"]}</div>
  `;

  if (a["Modalidad"] === "Presencial") {
    html += `<div><strong>Lugar del evento:</strong> ${a["Lugar del evento"]}</div>`;
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

  if (a["Modalidad"] === "Híbrida (presencial con transmisión online)") {
    html += `
      <div><strong>Lugar del evento:</strong> ${a["Lugar del evento"]}</div>
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
    html += `
      <div><strong>Más información:</strong>
        <a href="${a["Enlace para más información"]}" target="_blank">
          ${a["Enlace para más información"]}
        </a>
      </div>`;
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
