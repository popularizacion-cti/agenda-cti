const ENDPOINT = "https://script.google.com/macros/s/AKfycbzZ4xNNHyuizCzw36lovgsulD9_FCTr9PvlGiPakHQXybbgLXGIsm7bdn7aOIsrVg9qiw/exec";

let ALL_ACTIVITIES = [];

/* =======================
   FECHA / HORA
======================= */
function parseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date) ? null : date;
}

function formatDate(date) {
  if (!date) return "";
  return date.toLocaleDateString("es-PE");
}

function formatTime(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date)) return "";
  return date.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
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
    document.getElementById("agenda").innerText = "Error cargando actividades";
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

  const weekly = activities.filter(act => {
    const fecha = parseDate(act["Fecha de realización"]);
    return fecha && fecha >= today && fecha <= endOfWeek;
  });

  if (weekly.length === 0) {
    container.innerHTML = `<div class="sin-actividades">No hay actividades esta semana.</div>`;
    return;
  }

  weekly.forEach(act => container.appendChild(buildActivityCard(act)));
}

/* =======================
   FILTROS (SIN PÚBLICO)
======================= */
function buildFilters(activities) {
  const filtrosDiv = document.getElementById("filtros-cti");

  const unique = key =>
    [...new Set(activities.map(a => a[key]).filter(v => v))].sort();

  filtrosDiv.innerHTML = `
    <select id="f-region">
      <option value="">Región</option>
      ${unique("Región").map(v => `<option>${v}</option>`).join("")}
    </select>

    <select id="f-modalidad">
      <option value="">Modalidad</option>
      ${unique("Modalidad").map(v => `<option>${v}</option>`).join("")}
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
  const desde = document.getElementById("f-desde").value;
  const hasta = document.getElementById("f-hasta").value;

  const results = ALL_ACTIVITIES.filter(act => {
    if (region && act["Región"] !== region) return false;
    if (modalidad && act["Modalidad"] !== modalidad) return false;

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
  document.querySelectorAll("#filtros-cti select, #filtros-cti input")
    .forEach(el => el.value = "");
  document.getElementById("resultados-filtro").innerHTML = "";
}

/* =======================
   RESULTADOS
======================= */
function renderFilterResults(activities) {
  const container = document.getElementById("resultados-filtro");
  container.innerHTML = "<h2>📋 Resultados del filtro</h2>";

  if (activities.length === 0) {
    container.innerHTML += `<div class="sin-actividades">No se encontraron actividades.</div>`;
    return;
  }

  activities.forEach(act => container.appendChild(buildActivityCard(act)));
}

/* =======================
   CARD
======================= */
function buildActivityCard(act) {
  const div = document.createElement("div");
  div.className = "actividad";

  const fecha = parseDate(act["Fecha de realización"]);

  let extra = "";

  if (act["Lugar del evento"]) {
    extra += `<div><strong>Lugar del evento:</strong> ${act["Lugar del evento"]}</div>`;
  }

  if (act["Enlace del evento"]) {
    extra += `
      <div><strong>Enlace del evento:</strong>
        <a href="${act["Enlace del evento"]}" target="_blank">
          ${act["Enlace del evento"]}
        </a>
      </div>`;
  }

  if (act["¿El evento necesita inscripción previa?"] === "Si") {
    extra += `
      <div><strong>Inscripción:</strong>
        <a href="${act["Enlace a inscripción (solo si se necesita)"]}" target="_blank">
          ${act["Enlace a inscripción (solo si se necesita)"]}
        </a>
      </div>`;
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

    <div><strong>Modalidad:</strong> ${act["Modalidad"]}</div>

    ${extra}

    <div><strong>Mayor información:</strong>
      <a href="${act["Enlace para más información"]}" target="_blank">
        ${act["Enlace para más información"]}
      </a>
    </div>

    <div><strong>Información adicional:</strong>
      ${act["Información adicional que se debe detallar en la AGENDA"]}
    </div>

    <div><strong>Contacto:</strong>
      ${act["Nombres y Apellidos"]} – ${act["Correo electrónico"]}
    </div>
  `;

  return div;
}
