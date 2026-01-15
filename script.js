const ENDPOINT = "/.netlify/functions/get-activities";

function parseFechaFlexible(fechaStr) {
  if (!fechaStr) return null;

  // limpiar espacios raros
  fechaStr = fechaStr.trim();

  // yyyy-mm-dd
  if (fechaStr.includes("-")) {
    return new Date(fechaStr + "T00:00:00");
  }

  // dd/mm/yyyy
  if (fechaStr.includes("/")) {
    const [dd, mm, yyyy] = fechaStr.split("/");
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  }

  return null;
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

    renderDebug(activities);
  });

function renderDebug(activities) {
  const container = document.getElementById("agenda");
  container.innerHTML = "<h2>DEBUG FECHAS</h2>";

  const hoy = new Date();
  hoy.setHours(0,0,0,0);

  activities.forEach(act => {
    const raw = act["FECHA"];
    const parsed = parseFechaFlexible(raw);

    const p = document.createElement("p");
    p.innerHTML = `
      <strong>${act["NOMBRE DE LA ACTIVIDAD"]}</strong><br>
      FECHA RAW: <code>${raw}</code><br>
      FECHA PARSEADA: <code>${parsed}</code><br>
      ES >= HOY?: <code>${parsed >= hoy}</code>
      <hr>
    `;
    container.appendChild(p);
  });
}
