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
async function uploadReport() {
  const file = document.getElementById("pdfFile").files[0];

  if (!file) {
    alert("Please select a PDF file first.");
    return;
  }

  const btn = document.querySelector("button[onclick='uploadReport()']");
  btn.disabled = true;
  btn.textContent = "Analysing...";

  const form = new FormData();
  form.append("pdf", file);

  try {
    const res = await fetch(`/analyse-report?report_id=0`, {
      method: "POST",
      body: form
    });
    const data = await res.json();

    if (!res.ok) {
      alert("Error: " + (data.error || "Something went wrong"));
      btn.disabled = false;
      btn.textContent = "Analyse PDF";
      return;
    }

    renderReportAnalysis(data);
    loadReports(); // refresh table to show updated status

  } catch (err) {
    alert("Could not reach the server.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Analyse PDF";
  }
}

function renderReportAnalysis(data) {
  // remove old analysis if exists
  const existing = document.getElementById("report-analysis");
  if (existing) existing.remove();

  const statusColor = {
    normal: "#EAF3DE",
    high: "#FAEEDA",
    low: "#FAEEDA",
    critical: "#FCEBEB"
  };
  const statusText = {
    normal: "#27500A",
    high: "#633806",
    low: "#633806",
    critical: "#791F1F"
  };

  const findingsHTML = data.findings.map(f => `
    <tr>
      <td style="font-size:13px">${f.test}</td>
      <td style="font-size:13px">${f.value}</td>
      <td style="font-size:13px;color:#888">${f.normal_range}</td>
      <td>
        <span style="font-size:11px;padding:2px 8px;border-radius:10px;background:${statusColor[f.status]||'#f0f0f0'};color:${statusText[f.status]||'#333'}">
          ${f.status}
        </span>
      </td>
      <td style="font-size:12px;color:#666">${f.note}</td>
    </tr>`).join("");

  const div = document.createElement("div");
  div.id = "report-analysis";
  div.className = "card mt-4";
  div.innerHTML = `
    <div class="card-header p-3 d-flex align-items-center justify-content-between">
      <span>Report analysis</span>
      ${data.is_critical ? `<span style="font-size:12px;background:#FCEBEB;color:#791F1F;padding:3px 10px;border-radius:10px;font-weight:500">⚠ Critical findings</span>` : `<span style="font-size:12px;background:#EAF3DE;color:#27500A;padding:3px 10px;border-radius:10px;font-weight:500">✓ No critical findings</span>`}
    </div>
    <div class="card-body p-3">
      <p style="font-size:13px;color:#444;margin-bottom:1rem">${data.summary}</p>
      <table class="table table-sm mb-3">
        <thead class="table-light">
          <tr>
            <th style="font-size:12px">Test</th>
            <th style="font-size:12px">Value</th>
            <th style="font-size:12px">Normal range</th>
            <th style="font-size:12px">Status</th>
            <th style="font-size:12px">Note</th>
          </tr>
        </thead>
        <tbody>${findingsHTML}</tbody>
      </table>
      ${data.critical_reason ? `<div class="alert alert-danger py-2 px-3" style="font-size:13px">⚠ ${data.critical_reason}</div>` : ""}
      <div style="font-size:13px;color:#444"><strong>Recommendation:</strong> ${data.recommendation}</div>
    </div>
  `;

  document.querySelector(".container").appendChild(div);
}

// load reports when page opens
loadReports();
