const API_URL = "https://script.google.com/macros/s/AKfycbzZ4xNNHyuizCzw36lovgsulD9_FCTr9PvlGiPakHQXybbgLXGIsm7bdn7aOIsrVg9qiw/exec";

let dataGlobal = [];

/* =========================
   UTILIDADES
========================= */

function parseFecha(fecha) {
  if (!fecha) return null;

  // Si viene ISO
  if (typeof fecha === "string" && fecha.includes("T")) {
    const d = new Date(fecha);
    return isNaN(d) ? null : d;
  }

  // DD/MM/YYYY
  if (fecha.includes("/")) {
    const [d, m, y] = fecha.split("/");
    return new Date(y, m - 1, d);
  }

  const d = new Date(fecha);
  return isNaN(d) ? null : d;
}

function formatFecha(date) {
  if (!date) return "";
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function estaEnSemanaActual(fecha) {
  if (!fecha) return false;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const inicio = new Date(hoy);
  inicio.setDate(hoy.getDate() - hoy.getDay() + 1);

  const fin = new Date(inicio);
  fin.setDate(inicio.getDate() + 6);
  fin.setHours(23, 59, 59, 999);

  return fecha >= inicio && fecha <= fin;
}

/* =========================
   RENDER CARD
========================= */

function formatearActividad(item) {
  const fechaObj = parseFecha(item["Fecha de realización"]);
  const fechaTexto = formatFecha(fechaObj);

  const horaInicio = item["Hora de INICIO"] || "";
  const horaFin = item["Hora de FINALIZACIÓN"] || "";
  const horaTexto = horaInicio || horaFin ? `${horaInicio} - ${horaFin}` : "";

  let html = `
    <div class="actividad">

      <div class="fecha">
        ${fechaTexto}${horaTexto ? " | " + horaTexto : ""}
      </div>

      <div class="institucion">
        ${item["Nombre de la entidad"]} – ${item["Región"]}
      </div>

      <strong>${item["Nombre de la actividad"]}</strong><br>
      <p>${item["Resumen de la actividad"]}</p>

      <div><strong>Público objetivo:</strong> ${item["Público objetivo"] || ""}</div>
      <div><strong>Modalidad:</strong> ${item["Modalidad"]}</div>
  `;

  const modalidad = item["Modalidad"];

  // PRESENCIAL
  if (modalidad === "Presencial") {
    html += `<div><strong>Lugar del evento:</strong> ${item["Lugar del evento"]}</div>`;
  }

  // VIRTUAL o PUBLICACIONES
  if (
    modalidad === "Virtual" ||
    modalidad === "Publicaciones (Infografias, videos, podcast, etc)"
  ) {
    html += `
      <div><strong>Enlace del evento:</strong>
        <a href="${item["Enlace del evento"]}" target="_blank">
          ${item["Enlace del evento"]}
        </a>
      </div>`;
  }

  // HÍBRIDO
  if (modalidad === "Híbrida (presencial con transmisión online)") {
    html += `
      <div><strong>Lugar del evento:</strong> ${item["Lugar del evento"]}</div>
      <div><strong>Enlace del evento:</strong>
        <a href="${item["Enlace del evento"]}" target="_blank">
          ${item["Enlace del evento"]}
        </a>
      </div>`;
  }

  // INSCRIPCIÓN
  if (item["Inscripción: ¿El evento requiere inscripción previa?"] === "El evento requiere inscripción previa") {
    html += `
      <div><strong>Enlace de inscripción:</strong>
        <a href="${item["Enlace a inscripción (solo si se necesita)"]}" target="_blank">
          ${item["Enlace a inscripción (solo si se necesita)"]}
        </a>
      </div>`;
  }

  // MÁS INFO
  if (item["Enlace para más información"]) {
    html += `
      <div><strong>Más información:</strong>
        <a href="${item["Enlace para más información"]}" target="_blank">
          ${item["Enlace para más información"]}
        </a>
      </div>`;
  }

  // INFO ADICIONAL
  if (item["Información adicional que se debe detallar en la agenda"]) {
    html += `
      <div><strong>Información adicional:</strong>
        ${item["Información adicional que se debe detallar en la agenda"]}
      </div>`;
  }

  // CONTACTO
  html += `
      <div><strong>Contacto:</strong>
        ${item["Nombres"]} ${item["Apellidos"]} – ${item["Correo electrónico"]}
      </div>

    </div>
  `;

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

  filtrado.sort((a, b) =>
    parseFecha(a["Fecha de realización"]) - parseFecha(b["Fecha de realización"])
  );

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

    const semana = dataGlobal
      .filter(d => estaEnSemanaActual(parseFecha(d["Fecha de realización"])))
      .sort((a, b) =>
        parseFecha(a["Fecha de realización"]) - parseFecha(b["Fecha de realización"])
      );

    const agenda = document.getElementById("agenda");
    agenda.classList.remove("loading");

    agenda.innerHTML = semana.length
      ? semana.map(formatearActividad).join("")
      : `<div class="sin-actividades">No hay actividades esta semana</div>`;
  });
