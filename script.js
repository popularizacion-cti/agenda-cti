const DATA_URL = "https://script.google.com/macros/s/AKfycbzZ4xNNHyuizCzw36lovgsulD9_FCTr9PvlGiPakHQXybbgLXGIsm7bdn7aOIsrVg9qiw/exec";

/* ===============================
   UTILIDADES
================================ */

function parseFechaDMY(fechaStr) {
  if (!fechaStr) return null;
  const [d, m, y] = fechaStr.split("/");
  return new Date(`${y}-${m}-${d}T00:00:00`);
}

function formatearFechaDMY(fechaStr) {
  if (!fechaStr) return "";
  return fechaStr; // viene bien desde Sheets
}

function extraerHora(valor) {
  if (!valor) return "";

  // Si viene como fecha ISO (1899-12-30T21:08:36.000Z)
  if (typeof valor === "string" && valor.includes("T")) {
    return valor.substring(11, 16); // HH:MM
  }

  // Si ya viene como texto (01:00, 1:00, etc.)
  return valor;
}

/* ===============================
   FORMATEO DE ACTIVIDAD
================================ */

function formatearActividad(item) {
  const fecha = formatearFechaDMY(item["Fecha de realización"]);

  const horaInicio = extraerHora(item["Hora de INICIO"]);
  const horaFin = extraerHora(item["Hora de FINALIZACIÓN"]);
  const horaTexto = (horaInicio || horaFin) ? `${horaInicio} - ${horaFin}` : "";

  let html = `<div class="actividad">`;

  // Fecha y hora
  html += `<div class="fecha">${fecha}${horaTexto ? " | " + horaTexto : ""}</div>`;

  // Título
  html += `<h3>${item["Nombre de la actividad"] || ""}</h3>`;

  // Institución y región
  html += `
    <div class="institucion">
      ${item["Nombre de la entidad"] || ""} – ${item["Región"] || ""}
    </div>
  `;

  // Público objetivo y modalidad
  html += `<div><strong>Público objetivo:</strong> ${item["Público objetivo"] || ""}</div>`;
  html += `<div><strong>Modalidad:</strong> ${item["Modalidad"] || ""}</div>`;

  // Resumen
  if (item["Resumen de la actividad"]) {
    html += `<p>${item["Resumen de la actividad"]}</p>`;
  }

  // Lógica por modalidad
  const modalidad = item["Modalidad"] || "";

  if (modalidad === "Presencial") {
    if (item["Lugar del evento"]) {
      html += `<div><strong>Lugar del evento:</strong> ${item["Lugar del evento"]}</div>`;
    }
  }

  if (modalidad === "Virtual" || modalidad === "Publicaciones (Infografias, videos, podcast, etc)") {
    if (item["Enlace del evento"]) {
      html += `<div><strong>Enlace del evento:</strong> <a href="${item["Enlace del evento"]}" target="_blank">${item["Enlace del evento"]}</a></div>`;
    }
  }

  if (modalidad === "Híbrida (presencial con transmisión online)") {
    if (item["Lugar del evento"]) {
      html += `<div><strong>Lugar del evento:</strong> ${item["Lugar del evento"]}</div>`;
    }
    if (item["Enlace del evento"]) {
      html += `<div><strong>Enlace del evento:</strong> <a href="${item["Enlace del evento"]}" target="_blank">${item["Enlace del evento"]}</a></div>`;
    }
  }

  // Inscripción
  if (item["Inscripción: ¿El evento requiere inscripción previa?"] === "El evento requiere inscripción previa") {
    if (item["Enlace a inscripción (solo si se necesita)"]) {
      html += `<div><strong>Enlace de inscripción:</strong> <a href="${item["Enlace a inscripción (solo si se necesita)"]}" target="_blank">${item["Enlace a inscripción (solo si se necesita)"]}</a></div>`;
    }
  }

  // Más información
  if (item["Enlace para más información"]) {
    html += `<div><strong>Más información:</strong> <a href="${item["Enlace para más información"]}" target="_blank">${item["Enlace para más información"]}</a></div>`;
  }

  // Información adicional
  if (item["Información adicional que se debe detallar en la agenda"]) {
    html += `<div><strong>Información adicional:</strong> ${item["Información adicional que se debe detallar en la agenda"]}</div>`;
  }

  // Contacto
  html += `
    <div>
      <strong>Contacto:</strong>
      ${item["Nombres"] || ""} ${item["Apellidos"] || ""} – ${item["Correo electrónico"] || ""}
    </div>
  `;

  html += `</div>`;
  return html;
}

/* ===============================
   CARGA DE DATOS
================================ */

let DATA = [];

fetch(DATA_URL)
  .then(r => r.json())
  .then(json => {
    DATA = json;
    cargarAgendaSemana();
    crearFiltros();
  })
  .catch(() => {
    document.getElementById("agenda").innerHTML = "Error al cargar los datos.";
  });

/* ===============================
   AGENDA SEMANAL
================================ */

function cargarAgendaSemana() {
  const cont = document.getElementById("agenda");
  cont.innerHTML = "";

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const finSemana = new Date(hoy);
  finSemana.setDate(hoy.getDate() + 7);

  const actividades = DATA.filter(item => {
    const f = parseFechaDMY(item["Fecha de realización"]);
    return f && f >= hoy && f <= finSemana;
  });

  if (!actividades.length) {
    cont.innerHTML = `<div class="sin-actividades">No hay actividades esta semana.</div>`;
    return;
  }

  actividades
    .sort((a, b) =>
      parseFechaDMY(a["Fecha de realización"]) -
      parseFechaDMY(b["Fecha de realización"])
    )
    .forEach(item => {
      cont.innerHTML += formatearActividad(item);
    });
}

/* ===============================
   FILTROS
================================ */

function crearFiltros() {
  const cont = document.getElementById("filtros-cti");

  const regiones = [...new Set(DATA.map(d => d["Región"]).filter(Boolean))].sort();
  const modalidades = [...new Set(DATA.map(d => d["Modalidad"]).filter(Boolean))].sort();

  // Público objetivo (separado por coma)
  const publicos = new Set();
  DATA.forEach(d => {
    if (d["Público objetivo"]) {
      d["Público objetivo"].split(", ").forEach(p => publicos.add(p));
    }
  });

  cont.innerHTML = `
    <select id="f-region">
      <option value="">Región</option>
      ${regiones.map(r => `<option value="${r}">${r}</option>`).join("")}
    </select>

    <select id="f-modalidad">
      <option value="">Modalidad</option>
      ${modalidades.map(m => `<option value="${m}">${m}</option>`).join("")}
    </select>

    <select id="f-publico">
      <option value="">Público objetivo</option>
      ${[...publicos].sort().map(p => `<option value="${p}">${p}</option>`).join("")}
    </select>

    <input type="date" id="f-desde">
    <input type="date" id="f-hasta">

    <button onclick="aplicarFiltros()">Filtrar</button>
    <button onclick="limpiarFiltros()">Limpiar</button>
  `;
}

function aplicarFiltros() {
  const region = document.getElementById("f-region").value;
  const modalidad = document.getElementById("f-modalidad").value;
  const publico = document.getElementById("f-publico").value;
  const desde = document.getElementById("f-desde").value ? new Date(document.getElementById("f-desde").value) : null;
  const hasta = document.getElementById("f-hasta").value ? new Date(document.getElementById("f-hasta").value) : null;

  const cont = document.getElementById("resultados-filtro");
  cont.innerHTML = "";

  const filtradas = DATA.filter(item => {
    if (region && item["Región"] !== region) return false;
    if (modalidad && item["Modalidad"] !== modalidad) return false;

    if (publico) {
      const pubs = item["Público objetivo"] ? item["Público objetivo"].split(", ") : [];
      if (!pubs.includes(publico)) return false;
    }

    const f = parseFechaDMY(item["Fecha de realización"]);
    if (desde && f < desde) return false;
    if (hasta && f > hasta) return false;

    return true;
  });

  if (!filtradas.length) {
    cont.innerHTML = `<div class="sin-actividades">No hay actividades con esos filtros.</div>`;
    return;
  }

  filtradas
    .sort((a, b) =>
      parseFechaDMY(a["Fecha de realización"]) -
      parseFechaDMY(b["Fecha de realización"])
    )
    .forEach(item => {
      cont.innerHTML += formatearActividad(item);
    });
}

function limpiarFiltros() {
  document.getElementById("resultados-filtro").innerHTML = "";
  document.getElementById("f-region").value = "";
  document.getElementById("f-modalidad").value = "";
  document.getElementById("f-publico").value = "";
  document.getElementById("f-desde").value = "";
  document.getElementById("f-hasta").value = "";
}
