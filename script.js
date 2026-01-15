const ENDPOINT = "/.netlify/functions/get-activities";

fetch(ENDPOINT)
  .then(res => res.json())
  .then(data => {

    const headers = data[0];
    const rows = data.slice(1);

    const activities = rows.map(row => {
      let obj = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] || "";
      });
      return obj;
    });

    // ---- fechas base ----
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    // ---- filtros ----
    const filteredActivities = activities.filter(act => {

      if (act["APROBADO"] !== "SI") return false;

      const fechaStr = act["FECHA"]; // dd/mm/yyyy
      if (!fechaStr) return false;

      const [day, month, year] = fechaStr.split("/").map(Number);
      const fechaActividad = new Date(year, month - 1, day);

      return fechaActividad >= today && fechaActividad <= endOfWeek;
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
    container.innerHTML = `
      <div class="sin-actividades">
        No hay actividades programadas para esta semana.
      </div>
    `;
    return;
  }

  activities.forEach(act => {
    const div = document.createElement("div");
    div.className = "actividad";

    div.innerHTML = `
      <div class="fecha">
        ${act["FECHA"]} – ${act["HORA"]}
      </div>

      <h3>${act["NOMBRE DE LA ACTIVIDAD"]}</h3>

      <div class="institucion">
        ${act["INSTITUCION"]} · ${act["REGION"]}
      </div>

      <p>${act["RESUMEN"]}</p>

      <div class="modalidad">
        <strong>Modalidad:</strong> ${act["MODALIDAD"]}
      </div>

      <a href="${act["LUGAR / LINK"]}" target="_blank">
        Ver evento
      </a>
    `;

    container.appendChild(div);
  });
}
