const ENDPOINT = "https://script.google.com/macros/s/AKfycbzZ4xNNHyuizCzw36lovgsulD9_FCTr9PvlGiPakHQXybbgLXGIsm7bdn7aOIsrVg9qiw/exec";

let ALL_ACTIVITIES = [];

/* =======================
   FETCH DATA
======================= */
fetch(ENDPOINT)
  .then(res => res.json())
  .then(data => {
    const headers = data[0];
    const rows = data.slice(1);

    ALL_ACTIVITIES = rows.map(row => {
      let obj = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] || "";
      });
      return obj;
    }).filter(act => act["APROBADO"] === "SI");

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
  endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);

  const weeklyActivities = activities.filter(act => {
    const fechaStr = act["FECHA"];
    if (!fechaStr) return false;

    const [d, m, y] = fechaStr.split("/").map(Number);
    const fecha = new Date(y, m - 1, d);

    return fecha >= today && fecha <= endOfWeek;
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

  const unique = (key) =>
    [...new Set(activities.map(a => a[key]).filter(v => v))].sort();

  filtrosDiv.innerHTML = `
    <select id="f-tipo-inst">
      <option value="">Tipo institución</option>
      ${unique("TIPO INSTITUCION").map(v => `<option>${v}</option>`).join("")}
    </select>

    <select id="f-region">
      <option value="">Región</option>
      ${unique("REGION").map(v => `<option>${v}</option>`).join("")}
    </select>

    <select id="f-tipo-act">
      <option value="">Tipo actividad</option>
      ${unique("TIPO ACTIVIDAD").map(v => `<option>${v}</option>`).join("")}
    </select>

    <select id="f-modalidad">
      <option value="">Modalidad</option>
      ${unique("MODALIDAD").map(v => `<option>${v}</option>`).join("")}
    </select>

    <br>

    Desde:
    <input type="date" id="f-desde">
    Hasta:
    <input type="date" id="f-hasta">

    <br>

    <button onclick="applyFilters()">Filtrar</button>
    <button onclick="clearFilters()">Limpiar</button>
  `;
}

function applyFilters() {
  const tipoInst = document.getElementById("f-tipo-inst").value;
  const region = document.getElementById("f-region").value;
  const tipoAct = document.getElementById("f-tipo-act").value;
  const modalidad = document.getElementById("f-modalidad").value;
  const desde = document.getElementById("f-desde").value;
  const hasta = document.getElementById("f-hasta").value;

  let results = ALL_ACTIVITIES.filter(act => {

    if (tipoInst && act["TIPO INSTITUCION"] !== tipoInst) return false;
    if (region && act["REGION"] !== region) return false;
    if (tipoAct && act["TIPO ACTIVIDAD"] !== tipoAct) return false;
    if (modalidad && act["MODALIDAD"] !== modalidad) return false;

    if (desde || hasta) {
      const [d, m, y] = act["FECHA"].split("/").map(Number);
      const fecha = new Date(y, m - 1, d);

      if (desde && fecha < new Date(desde)) return false;
      if (hasta && fecha > new Date(hasta)) return false;
    }

    return true;
  });

  renderFilterResults(results);
}

function clearFilters() {
  document.getElementById("filtros-cti").querySelectorAll("select, input")
    .forEach(el => el.value = "");

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

  div.innerHTML = `
    <div class="fecha">${act["FECHA"]} – ${act["HORA"]}</div>
    <h3>${act["NOMBRE DE LA ACTIVIDAD"]}</h3>
    <div class="institucion">
      ${act["INSTITUCION"]} · ${act["REGION"]}
    </div>
    <p>${act["RESUMEN"]}</p>
    <div class="modalidad">
      <strong>Modalidad:</strong> ${act["MODALIDAD"]}
    </div>
    <a href="${act["LUGAR / LINK"]}" target="_blank">Ver evento</a>
  `;

  return div;
}
