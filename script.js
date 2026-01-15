const ENDPOINT = "/.netlify/functions/get-activities";

// ---- helper: convierte dd/mm/yyyy → Date ----
function parseFecha(fechaStr) {
  const [dd, mm, yyyy] = fechaStr.split("/");
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

// ---- obtener inicio y fin de esta semana ----
function getRangoSemana() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const finSemana = new Date(hoy);
  finSemana.setDate(hoy.getDate() + (7 - hoy.getDay())); // domingo
  finSemana.setHours(23, 59, 59, 999);

  return { hoy, finSemana };
}

fetch(ENDPOINT)
  .then(res => res.json())
  .then(data => {
    const headers = data[0];
    const rows = data.slice(1);

    const activities = rows.map(row => {
      let obj = {};
      headers.forEach((h, i) => {
        obj[h] = row[i];
      });
      return obj;
    });

    const { hoy, finSemana } = getRangoSemana();

    const filteredActivities = activities.filter(act => {
      if (act["APROBADO"] !== "SI") return false;

      const fechaActividad = parseFecha(act["FECHA"]);
      return fechaActividad >= hoy && fechaActividad <= finSemana;
    });

    renderActivities(filteredActivities);
  })
  .catch(err => {
    document.getElementById("agenda").innerText =
      "Error cargando actividades";
    console.error(err);
  });

function renderActivities(activities) {
  const container = document.getElementById("agenda");
  container.innerHTML = "";

  if (activities.length === 0) {
    container.innerHTML = "<p>No hay actividades programadas esta semana.</p>";
    return;
  }

  activities.forEach(act => {
    const div = document.createElement("div");
    div.style.marginBottom = "1rem";

    div.innerHTML = `
      <h3>${act["NOMBRE DE LA ACTIVIDAD"]}</h3>
      <p><strong>Fecha:</strong> ${act["FECHA"]} ${act["HORA"]}</p>
      <p><strong>Modalidad:</strong> ${act["MODALIDAD"]}</p>
      <p>${act["RESUMEN"]}</p>
      <a href="${act["LUGAR / LINK"]}" target="_blank">Ver evento</a>
      <hr>
    `;

    container.appendChild(div);
  });
}
