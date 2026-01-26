const API_URL = "https://script.google.com/macros/s/AKfycbzZ4xNNHyuizCzw36lovgsulD9_FCTr9PvlGiPakHQXybbgLXGIsm7bdn7aOIsrVg9qiw/exec";

let dataGlobal = [];

/* =========================
   UTILIDADES
========================= */

function parseFecha(fecha) {
  if (!fecha) return null;
  const [d, m, y] = fecha.split("/");
  return new Date(`${y}-${m}-${d}`);
}

function estaEnSemanaActual(fecha) {
  const hoy = new Date();
  const inicio = new Date(hoy);
  inicio.setDate(hoy.getDate() - hoy.getDay() + 1);
  inicio.setHours(0, 0, 0, 0);

  const fin = new Date(inicio);
  fin.setDate(inicio.getDate() + 6);
  fin.setHours(23, 59, 59, 999);

  return fecha >= inicio && fecha <= fin;
}

function formatearActividad(item) {
  let html = `
    <div class="actividad">
      <div class="fecha">
        ${item["Fecha de realización"]} | ${item["Hora de INICIO"]} - ${item["Hora de FINALIZACIÓN"]}
      </div>

      <div class="institucion">
        ${item["Nombre de la entidad"]} – ${item["Región"]} / ${item["Provincia"]}
      </div>

      <strong>${item["Nombre de la actividad"]}</strong><br>
      ${item["Resumen de la actividad"]}<br><br>
  `;

  const modalidad = item["Modalidad"];

  if (modalidad === "Presencial") {
    html += `<strong>Lugar del evento:</strong> ${item["Lugar del evento"]}<br>`;
  }

  if (modalidad === "Virtual" || modalidad === "Publicaciones (Infografias, videos, podcast, etc)") {
    html += `<strong>Enlace del evento:</strong> <a href="${item["Enlace del evento"]}" target="_blank">${item["Enlace del evento"]}</a><br>`;
  }

  if (modalidad === "Híbrida (presencial con transmisión online)") {
    html += `
      <strong>Lugar del evento:</strong> ${item["Lugar del evento"]}<br>
      <strong>Enlace del evento:</strong> <a href="${item["Enlace del evento"]}" target="_blank">${item["Enlace del evento"]}</a><br>
    `;
  }

  if (item["Inscripción: ¿El evento requiere inscripción previa?"] === "El evento requiere inscripción previa") {
    html += `<strong>Enlace de inscripción:</strong> <a href="${item["Enlace a inscripción (solo si se necesita)"]}" target="_blank">${item["Enlace a inscripción (solo si se necesita)"]}</a><br>`;
  }

  if (item["Enlace para más información"]) {
    html += `<strong>Más información:</strong> <a href="${item["Enlace para más información"]}" target="_blank">${item["Enlace para más información"]}</a><br>`;
  }

  if (item["Información adicional que se debe detallar en la agenda"]) {
    html += `<strong>Información adicional:</strong> ${item["Información adicional que se debe detallar en la agenda"]}<br>`;
  }

  html += `
    <strong>Contacto:</strong>
    ${item["Nombres"]} ${item["Apellidos"]} – ${item["Correo electrónico"]}
  </div>`;

  return html;
}

/* =========================
   FILTROS
========================= */

function crearFiltros(data) {
  const cont = document.getElementById("filtros-cti");

  const regiones = [...new Set(data.map(d => d["Región"]).filter(Boolean))];
  const modalidades = [...new Set(data.map(d => d["Modalidad"]).filter(Boolean))];

  const publicos = new Set();
  data.forEach(d => {
    if (d["Público objetivo"]) {
      d["Público objetivo"].split(", ").forEach(p => publicos.add(p));
    }
  });

  cont.innerHTML = `
    <select id="filtro-region">
      <option value="">Región</option>
      ${regiones.map(r => `<option>${r}</option>`).join("")}
    </select>

    <select id="filtro-modalidad">
      <option value="">Modalidad</option>
      ${modalidades.map(m => `<option>${m}</option>`).join("")}
    </select>

    <select id="filtro-publico">
      <option value="">Público objetivo</option>
      ${[...publicos].map(p => `<option>${p}</option>`).join("")}
    </select>

    <input type="date" id="filtro-desde">
    <input type="date" id="filtro-hasta">

    <button onclick="aplicarFiltros()">Filtrar</button>
    <button onclick="limpiarFiltros()">Limpiar</button>
  `;
}

function aplicarFiltros() {
  const region = document.getElementById("filtro-region").value;
  const modalidad = document.getElementById("filtro-modalidad").value;
  const publico = document.getElementById("filtro-publico").value;
  const desde = document.getElementById("filtro-desde").value;
  const hasta = document.getElementById("filtro-hasta").value;

  let filtrado = dataGlobal;

  if (region) filtrado = filtrado.filter(d => d["Región"] === region);
  if (modalidad) filtrado = filtrado.filter(d => d["Modalidad"] === modalidad);

  if (publico) {
    filtrado = filtrado.filter(d =>
      d["Público objetivo"]?.split(", ").includes(publico)
    );
  }

  if (desde) {
    const fDesde = new Date(desde);
    filtrado = filtrado.filter(d => parseFecha(d["Fecha de realización"]) >= fDesde);
  }

  if (hasta) {
    const fHasta = new Date(hasta);
    filtrado = filtrado.filter(d => parseFecha(d["Fecha de realización"]) <= fHasta);
  }

  const cont = document.getElementById("resultados-filtro");
  cont.innerHTML = filtrado.length
    ? filtrado.map(formatearActividad).join("")
    : `<div class="sin-actividades">No hay resultados</div>`;
}

function limpiarFiltros() {
  document.getElementById("resultados-filtro").innerHTML = "";
}

/* =========================
   CARGA INICIAL
========================= */

fetch(API_URL)
  .then(r => r.json())
  .then(data => {
    dataGlobal = data.filter(d => d["Aprobado"] === "Si");

    crearFiltros(dataGlobal);

    const semana = dataGlobal.filter(d =>
      estaEnSemanaActual(parseFecha(d["Fecha de realización"]))
    );

    const agenda = document.getElementById("agenda");
    agenda.classList.remove("loading");

    agenda.innerHTML = semana.length
      ? semana.map(formatearActividad).join("")
      : `<div class="sin-actividades">No hay actividades esta semana</div>`;
  });
