const ENDPOINT = "/.netlify/functions/get-activities";

// ---- helper: dd/mm/yyyy → Date ----
function parseFecha(fechaStr) {
  if (!fechaStr) return null;
  const [dd, mm, yyyy] = fechaStr.trim().split("/");
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
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

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fin = new Date(hoy);
    fin.setDate(hoy.getDate() + 7);

    const filteredActivities = activities.filter(act => {
      if (act["APROBADO"] !== "SI") return false;

      const fechaActividad = parseFecha(act["FECHA"]);
      if (!fechaActividad) return false;

      return fechaActividad >= hoy && fechaActividad <= fin;
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
    container.innerHTML =
      "<p>No hay actividades programadas en los próximos 7 días.</p>";
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
