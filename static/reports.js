async function loadReports() {
  const res = await fetch("/reports");
  const data = await res.json();

  const tbody = document.getElementById("reports-body");
  const banner = document.getElementById("critical-banner");
  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted py-4" style="font-size:13px">
          No reports yet. Add tests from the consultation page.
        </td>
      </tr>`;
    return;
  }

  let hasCritical = false;

  data.forEach(report => {
    if (report.is_critical) hasCritical = true;

    const row = document.createElement("tr");
    row.id = `row-${report.id}`;
    if (report.is_critical) row.classList.add("critical-row");

    row.innerHTML = `
      <td style="font-size:13px">${report.patient}</td>
      <td style="font-size:13px">${report.test_name}</td>
      <td>
        <span class="badge-${report.status}">${report.status}</span>
      </td>
      <td>
        <input
          type="checkbox"
          ${report.is_critical ? "checked" : ""}
          onchange="flagCritical(${report.id}, this.checked)"
          title="Mark as critical"
        >
      </td>`;

    tbody.appendChild(row);
  });

  banner.style.display = hasCritical ? "block" : "none";
}

async function flagCritical(reportId, isCritical) {
  const res = await fetch(`/reports/${reportId}/critical`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_critical: isCritical })
  });

  if (res.ok) {
    const row = document.getElementById(`row-${reportId}`);
    if (isCritical) {
      row.classList.add("critical-row");
    } else {
      row.classList.remove("critical-row");
    }
    // reload to update banner
    loadReports();
  } else {
    alert("Failed to update report.");
  }
}

// load reports when page opens
loadReports();