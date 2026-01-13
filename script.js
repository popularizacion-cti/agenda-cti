const ENDPOINT = "/.netlify/functions/get-activities";

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

    const approvedActivities = activities.filter(
      act => act["APROBADO"] === "SI"
    );
    
    renderActivities(approvedActivities);
  })
  .catch(err => {
    document.getElementById("agenda").innerText =
      "Error cargando actividades";
    console.error(err);
  });

function renderActivities(activities) {
  const container = document.getElementById("agenda");
  container.innerHTML = "";

  activities.forEach(act => {
    const div = document.createElement("div");
    div.style.marginBottom = "1rem";

    div.innerHTML = `
      <h3>${act["NOMBRE DE LA ACTIVIDAD"]}</h3>
      <p><strong>Fecha:</strong> ${act["FECHA"]} ${act["HORA"]}</p>
      <p><strong>Modalidad:</strong> ${act["MODALIDAD"]}</p>
      <p>${act["RESUMEN"]}</p>
      <a href="${act["LUGAR / LINK"]}" target="_blank">
        Ver evento
      </a>
      <hr>
    `;

    container.appendChild(div);
  });
}
