const ENDPOINT = "https://script.google.com/macros/s/AKfycbzZ4xNNHyuizCzw36lovgsulD9_FCTr9PvlGiPakHQXybbgLXGIsm7bdn7aOIsrVg9qiw/exec";

let ALL_ACTIVITIES = [];

/* =======================
   UTILIDADES FECHA / HORA (TEXTO)
======================= */
function formatFechaTexto(value) {
  return value ? value : "";
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
    const fecha = act["Fecha de realización"];
    if (!fecha || !fecha.includes("/")) return false;

    const [d, m, y] = fecha.split("/").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj >= today && dateObj <= endOfWeek;
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
      if (!act["Fecha de realización"]) return false;
      const [d, m, y] = act["Fecha de realización"].split("/").map(Number);
      const fecha = new Date(y, m - 1, d);

      if (desde && fecha < new Date(desde)) return false;
      if (hasta && fecha > new Date(hasta)) return false;
    }

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

  const fechaTexto = formatFechaTexto(act["Fecha de realización"]);
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
