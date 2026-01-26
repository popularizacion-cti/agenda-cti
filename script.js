const ENDPOINT =
  "https://script.google.com/macros/s/AKfycbzZ4xNNHyuizCzw36lovgsulD9_FCTr9PvlGiPakHQXybbgLXGIsm7bdn7aOIsrVg9qiw/exec";

let ALL_ACTIVITIES = [];

/* =======================
   FECHAS
======================= */

// Para filtros (Date real)
function parseFechaDMY(valor) {
  if (!valor) return null;

  if (typeof valor === "string" && valor.includes("/")) {
    const [d, m, y] = valor.split("/");
    return new Date(`${y}-${m}-${d}T00:00:00`);
  }

  const f = new Date(valor);
  return isNaN(f) ? null : f;
}

// Para mostrar (SIEMPRE dd/mm/yyyy)
function formatearFechaDMY(valor) {
  if (!valor) return "";

  if (typeof valor === "string" && valor.includes("/")) {
    return valor;
  }

  const d = new Date(valor);
  if (isNaN(d)) return "";

  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const anio = d.getFullYear();

  return `${dia}/${mes}/${anio}`;
}

// Hora SOLO como texto
function formatearHora(inicio, fin) {
  if (!inicio && !fin) return "";
  if (inicio && fin) return `${inicio} - ${fin}`;
  return inicio || fin;
}

/* =======================
   FETCH
======================= */
fetch(ENDPOINT)
  .then(r => r.json())
  .then(data => {
    ALL_ACTIVITIES = data
      .filter(a => a["Aprobado"] === "Si" || a["Aprobado"] === "SI")
      .map(a => ({
        ...a,
        _fechaObj: parseFechaDMY(a["Fecha de realización"]),
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
function renderWeeklyAgenda(activities) {
  const container = document.getElementById("agenda");
  container.innerHTML = "";

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const finSemana = new Date(hoy);
  finSemana.setDate(hoy.getDate() + 7);
  finSemana.setHours(23, 59, 59, 999);

  const semanal = activities
    .filter(a => a._fechaObj && a._fechaObj >= hoy && a._fechaObj <= finSemana)
    .sort((a, b) => a._fechaObj - b._fechaObj);

  if (semanal.length === 0) {
    container.innerHTML =
      `<div class="sin-actividades">No hay actividades esta semana.</div>`;
    return;
  }

  semanal.forEach(a => container.appendChild(buildActivityCard(a)));
}

/* =======================
   FILTROS
======================= */
function buildFilters(activities) {
  const div = document.getElementById("filtros-cti");

  const unique = arr =>
    [...new Set(arr)].filter(v => v).sort();

  const regiones = unique(activities.map(a => a["Región"]));
  const modalidades = unique(activities.map(a => a["Modalidad"]));
  const publicos = unique(
    activities.flatMap(a => a._publicos)
  );

  div.innerHTML = `
    <select id="f-region">
      <option value="">Región</option>
      ${regiones.map(r => `<option>${r}</option>`).join("")}
    </select>

    <select id="f-modalidad">
      <option value="">Modalidad</option>
      ${modalidades.map(m => `<option>${m}</option>`).join("")}
    </select>

    <select id="f-publico">
      <option value="">Público objetivo</option>
      ${publicos.map(p => `<option>${p}</option>`).join("")}
    </select>

    Desde:
    <input type="date" id="f-desde">
    Hasta:
    <input type="date" id="f-hasta">

    <br><br>

    <button onclick="applyFilters()">Filtrar</button>
    <button onclick="clearFilters()">Limpiar</button>
  `;
}

function applyFilters() {
  const region = document.getElementById("f-region").value;
  const modalidad = document.getElementById("f-modalidad").value;
  const publico = document.getElementById("f-publico").value;
  const desde = document.getElementById("f-desde").value;
  const hasta = document.getElementById("f-hasta").value;

  const desdeD = desde ? new Date(desde) : null;
  const hastaD = hasta ? new Date(hasta) : null;

  const results = ALL_ACTIVITIES.filter(a => {
    if (region && a["Región"] !== region) return false;
    if (modalidad && a["Modalidad"] !== modalidad) return false;
    if (publico && !a._publicos.includes(publico)) return false;

    if (!a._fechaObj) return false;
    if (desdeD && a._fechaObj < desdeD) return false;
    if (hastaD && a._fechaObj > hastaD) return false;

    return true;
  }).sort((a, b) => a._fechaObj - b._fechaObj);

  renderFilterResults(results);
}

function clearFilters() {
  document
    .querySelectorAll("#filtros-cti select, #filtros-cti input")
    .forEach(e => (e.value = ""));
  document.getElementById("resultados-filtro").innerHTML = "";
}

/* =======================
   RESULTADOS
======================= */
function renderFilterResults(list) {
  const div = document.getElementById("resultados-filtro");
  div.innerHTML = "<h2>📋 Resultados del filtro</h2>";

  if (list.length === 0) {
    div.innerHTML +=
      `<div class="sin-actividades">No se encontraron actividades.</div>`;
    return;
  }

  list.forEach(a => div.appendChild(buildActivityCard(a)));
}

/* =======================
   CARD
======================= */
function buildActivityCard(a) {
  const div = document.createElement("div");
  div.className = "actividad";

  const fecha = formatearFechaDMY(a["Fecha de realización"]);
  const hora = formatearHora(
    a["Hora de INICIO"],
    a["Hora de FINALIZACIÓN"]
  );

  let bloques = `
    <div class="fecha">${fecha}${hora ? " | " + hora : ""}</div>
    <h3>${a["Nombre de la actividad"]}</h3>

    <div class="institucion">
      ${a["Nombre de la entidad"]} · ${a["Región"]}
    </div>

    <p>${a["Resumen de la actividad"]}</p>

    <div><strong>Público objetivo:</strong> ${a["Público objetivo"]}</div>
    <div><strong>Modalidad:</strong> ${a["Modalidad"]}</div>
  `;

  // Modalidad
  if (a["Modalidad"] === "Presencial") {
    bloques += `<div><strong>Lugar del evento:</strong> ${a["Lugar del evento"]}</div>`;
  }

  if (a["Modalidad"] === "Virtual" ||
      a["Modalidad"] === "Publicaciones (Infografias, videos, podcast, etc)") {
    bloques += `
      <div><strong>Enlace del evento:</strong>
        <a href="${a["Enlace del evento"]}" target="_blank">${a["Enlace del evento"]}</a>
      </div>`;
  }

  if (a["Modalidad"] === "Híbrida (presencial con transmisión online)") {
    bloques += `
      <div><strong>Lugar del evento:</strong> ${a["Lugar del evento"]}</div>
      <div><strong>Enlace del evento:</strong>
        <a href="${a["Enlace del evento"]}" target="_blank">${a["Enlace del evento"]}</a>
      </div>`;
  }

  // Inscripción
  if (a["Inscripción: ¿El evento requiere inscripción previa?"] ===
      "El evento requiere inscripción previa") {
    bloques += `
      <div><strong>Enlace de inscripción:</strong>
        <a href="${a["Enlace a inscripción (solo si se necesita)"]}" target="_blank">
          ${a["Enlace a inscripción (solo si se necesita)"]}
        </a>
      </div>`;
  }

  if (a["Enlace para más información"]) {
    bloques += `
      <div><strong>Más información:</strong>
        <a href="${a["Enlace para más información"]}" target="_blank">
          ${a["Enlace para más información"]}
        </a>
      </div>`;
  }

  if (a["Información adicional que se debe detallar en la agenda"]) {
    bloques += `
      <div><strong>Información adicional:</strong>
        ${a["Información adicional que se debe detallar en la agenda"]}
      </div>`;
  }

  bloques += `
    <div><strong>Contacto:</strong>
      ${a["Nombres"]} ${a["Apellidos"]} – ${a["Correo electrónico"]}
    </div>
  `;

  div.innerHTML = bloques;
  return div;
}
