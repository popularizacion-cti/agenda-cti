const ENDPOINT = "https://script.google.com/macros/s/AKfycbzZ4xNNHyuizCzw36lovgsulD9_FCTr9PvlGiPakHQXybbgLXGIsm7bdn7aOIsrVg9qiw/exec";

let ALL_ACTIVITIES = [];

/* =======================
   FECHAS (NORMALIZACIÓN)
======================= */
function parseFecha(value) {
  if (!value) return null;

  if (typeof value === "string" && value.includes("T")) {
    const d = new Date(value);
    return isNaN(d) ? null : d;
  }

  if (typeof value === "string" && value.includes("/")) {
    const [d, m, y] = value.split("/").map(Number);
    return new Date(y, m - 1, d);
  }

  const d = new Date(value);
  return isNaN(d) ? null : d;
}

function formatFecha(date) {
  if (!date) return "";
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function formatHoraTexto(value) {
  return value ? value : "";
}

/* =======================
   FETCH DATA
======================= */
fetch(ENDPOINT)
  .then(res => res.json())
  .then(data => {
    ALL_ACTIVITIES = data
      .filter(act => act["Aprobado"] === "SI" || act["Aprobado"] === "Si")
      .map(act => ({
        ...act,
        _fechaObj: parseFecha(act["Fecha de realización"])
      }));

    renderWeeklyAgenda(ALL_ACTIVITIES);
    buildFilters(ALL_ACTIVITIES);
  })
  .catch(err => {
    document.getElementById("agenda").innerText = "Error cargando actividades";
    console.error(err);
  });

/* =======================
   AGENDA SEMANAL (MISMO FORMATO QUE FILTROS)
======================= */
function renderWeeklyAgenda(activities) {
  const container = document.getElementById("resultados-filtro");
  container.innerHTML = "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + 7);
  endOfWeek.setHours(23, 59, 59, 999);

  const weekly = activities.filter(act => {
    const f = act._fechaObj;
    return f && f >= today && f <= endOfWeek;
  });

  if (weekly.length === 0) {
    container.innerHTML =
      `<div class="sin-actividades">No hay actividades esta semana.</div>`;
    return;
  }

  weekly.forEach(act => container.appendChild(buildActivityCard(act)));
}

/* =======================
   FILTROS
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

  const desdeDate = desde ? new Date(desde) : null;
  const hastaDate = hasta ? new Date(hasta) : null;

  const results = ALL_ACTIVITIES.filter(act => {
    if (region && act["Región"] !== region) return false;
    if (modalidad && act["Modalidad"] !== modalidad) return false;

    const f = act._fechaObj;
    if (!f) return false;

    if (desdeDate && f < desdeDate) return false;
    if (hastaDate && f > hastaDate) return false;

    return true;
  });

  renderFilterResults(results);
}

function clearFilters() {
  document
    .querySelectorAll("#filtros-cti select, #filtros-cti input")
    .forEach(el => (el.value = ""));
  document.getElementById("resultados-filtro").innerHTML = "";
}

/* =======================
   RESULTADOS
======================= */
function renderFilterResults(activities) {
  const container = document.getElementById("resultados-filtro");
  container.innerHTML = "<h2>📋 Resultados del filtro</h2>";

  if (activities.length === 0) {
    container.innerHTML +=
      `<div class="sin-actividades">No se encontraron actividades.</div>`;
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

  let infoAdicional = "";
  if (
    act["Información adicional que se debe detallar en la AGENDA"] &&
    act["Información adicional que se debe detallar en la AGENDA"].trim() !== ""
  ) {
    infoAdicional = `
      <div><strong>Información adicional:</strong>
        ${act["Información adicional que se debe detallar en la AGENDA"]}
      </div>`;
  }

  const fechaTexto = formatFecha(act._fechaObj);
  const horaTexto = formatHoraTexto(act["Hora de realización"]);

  div.innerHTML = `
    <div class="fecha">
      ${fechaTexto}${horaTexto ? " – " + horaTexto : ""}
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

    ${infoAdicional}

    <div><strong>Contacto:</strong>
      ${act["Nombres y Apellidos"]} – ${act["Correo electrónico"]}
    </div>
  `;

  return div;
}
