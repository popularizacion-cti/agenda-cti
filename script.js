const ENDPOINT = "https://script.google.com/macros/s/AKfycbzZ4xNNHyuizCzw36lovgsulD9_FCTr9PvlGiPakHQXybbgLXGIsm7bdn7aOIsrVg9qiw/exec";

let ALL_ACTIVITIES = [];

/* =======================
   UTILIDADES FECHA / HORA
======================= */
function parseDate(value) {
  if (!value) return null;

  if (value instanceof Date) return new Date(value);

  if (typeof value === "string" && value.includes("/")) {
    const [d, m, y] = value.split("/").map(Number);
    return new Date(y, m - 1, d);
  }

  return new Date(value);
}

function formatDate(date) {
  if (!date) return "";
  return date.toLocaleDateString("es-PE");
}

function formatTime(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* =======================
   FETCH DATA
======================= */
fetch(ENDPOINT)
  .then(res => res.json())
  .then(data => {
    ALL_ACTIVITIES = data.filter(
      act => act["Aprobado"] === "SI" || act["Aprobado"] === "Si"
    );

    renderWeeklyAgenda(ALL_ACTIVITIES);
    buildFilters(ALL_ACTIVITIES);
  })
  .catch(err => {
    document.getElementById("agenda").innerText =
      "Error cargando actividades";
    console.error(err);
  });

/* =======================
   AGENDA SEMANAL
======================= */
function renderWeeklyAgenda(activities) {
  const container = document.getElementById("agenda");
  container.innerHTML = "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + 7);
  endOfWeek.setHours(23, 59, 59, 999);

  const weeklyActivities = activities.filter(act => {
    const fecha = parseDate(act["Fecha de realización"]);
    return fecha && fecha >= today && fecha <= endOfWeek;
  });

  if (weeklyActivities.length === 0) {
    container.innerHTML = `
      <div class="sin-actividades">
        No hay actividades programadas para esta semana.
      </div>
    `;
    return;
  }

  weeklyActivities.forEach(act => {
    container.appendChild(buildActivityCard(act));
  });
}

/* =======================
   FILTROS
======================= */
function buildFilters(activities) {
  const filtrosDiv = document.getElementById("filtros-cti");

  const unique = key =>
    [...new Set(activities.map(a => a[key]).filter(v => v))].sort();

  filtrosDiv.innerHTML = `
    <select id="f-tipo-entidad">
      <option value="">Tipo de entidad</option>
      ${unique("Tipo de entidad").map(v => `<option>${v}</option>`).join("")}
    </select>

    <select id="f-region">
      <option value="">Región</option>
      ${unique("Región").map(v => `<option>${v}</option>`).join("")}
    </select>

    <select id="f-modalidad">
      <option value="">Modalidad</option>
      ${unique("Modalidad").map(v => `<option>${v}</option>`).join("")}
    </select>

    <select id="f-publico">
      <option value="">Público objetivo</option>
      ${unique("Público objetivo").map(v => `<option>${v}</option>`).join("")}
    </select>

    <br><br>

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
  const tipoEntidad = document.getElementById("f-tipo-entidad").value;
  const region = document.getElementById("f-region").value;
  const modalidad = document.getElementById("f-modalidad").value;
  const publico = document.getElementById("f-publico").value;
  const desde = document.getElementById("f-desde").value;
  const hasta = document.getElementById("f-hasta").value;

  const results = ALL_ACTIVITIES.filter(act => {
    if (tipoEntidad && act["Tipo de entidad"] !== tipoEntidad) return false;
    if (region && act["Región"] !== region) return false;
    if (modalidad && act["Modalidad"] !== modalidad) return false;
    if (publico && act["Público objetivo"] !== publico) return false;

    if (desde || hasta) {
      const fecha = parseDate(act["Fecha de realización"]);
      if (!fecha) return false;
      if (desde && fecha < new Date(desde)) return false;
      if (hasta && fecha > new Date(hasta)) return false;
    }

    return true;
  });

  renderFilterResults(results);
}

function clearFilters() {
  document
    .getElementById("filtros-cti")
    .querySelectorAll("select, input")
    .forEach(el => (el.value = ""));

  document.getElementById("resultados-filtro").innerHTML = "";
}

/* =======================
   RESULTADOS FILTRO
======================= */
function renderFilterResults(activities) {
  const container = document.getElementById("resultados-filtro");
  container.innerHTML = "<h2>📋 Resultados del filtro</h2>";

  if (activities.length === 0) {
    container.innerHTML += `
      <div class="sin-actividades">
        No se encontraron actividades.
      </div>
    `;
    return;
  }

  activities.forEach(act => {
    container.appendChild(buildActivityCard(act));
  });
}

/* =======================
   CARD REUTILIZABLE
======================= */
function buildActivityCard(act) {
  const div = document.createElement("div");
  div.className = "actividad";

  const fecha = parseDate(act["Fecha de realización"]);

  let extraInfo = "";

  if (act["Modalidad"] && act["Modalidad"] !== "Virtual") {
    extraInfo += `<div><strong>Lugar del evento:</strong> ${act["Lugar del evento"]}</div>`;
  }

  if (act["Modalidad"] && act["Modalidad"] !== "Física Presencial") {
    extraInfo += `<div><strong>Enlace del evento:</strong> <a href="${act["Enlace del evento"]}" target="_blank">Acceder</a></div>`;
  }

  if (act["¿El evento necesita inscripción previa?"] === "Si") {
    extraInfo += `<div><strong>Inscripción:</strong> <a href="${act["Enlace a inscripción (solo si se necesita)"]}" target="_blank">Formulario</a></div>`;
  }

  div.innerHTML = `
    <div class="fecha">
      ${formatDate(fecha)} – ${formatTime(act["Hora de realización"])}
    </div>

    <h3>${act["Nombre de la actividad"]}</h3>

    <div class="institucion">
      ${act["Nombre de la entidad que organiza"]} · ${act["Región"]}
    </div>

    <p>${act["Resumen de la actividad"]}</p>

    <div><strong>Público objetivo:</strong> ${act["Público objetivo"]}</div>
    <div><strong>Modalidad:</strong> ${act["Modalidad"]}</div>

    ${extraInfo}

    <div>
      <strong>Mayor información:</strong>
      <a href="${act["Enlace para más información"]}" target="_blank">Ver</a>
    </div>

    <div><strong>Información adicional:</strong> ${act["Información adicional que se debe detallar en la AGENDA"]}</div>

    <div>
      <strong>Contacto:</strong>
      ${act["Nombres y Apellidos"]} – ${act["Correo electrónico"]}
    </div>
  `;

  return div;
}
