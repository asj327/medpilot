let lastResult = null;
let lastPatient = null;

async function transcribe() {
  const file = document.getElementById("audioFile").files[0];
  const patient = document.getElementById("patientName").value.trim() || "Unknown";

  if (!file) {
    alert("Please select an audio file first.");
    return;
  }

  // show loading
  document.getElementById("loading").style.display = "block";
  document.getElementById("results").style.display = "none";
  document.getElementById("transcript-editor").style.display = "none";
  document.getElementById("success-alert").style.display = "none";

  const form = new FormData();
  form.append("audio", file);
  form.append("patient", patient);

  try {
    const res = await fetch("/transcribe", { method: "POST", body: form });
    const data = await res.json();

    if (!res.ok) {
      alert("Error: " + (data.error || "Something went wrong"));
      document.getElementById("loading").style.display = "none";
      return;
    }

    // show editable transcript
    document.getElementById("loading").style.display = "none";
    document.getElementById("transcript-input").value = data.transcript;
    document.getElementById("transcript-editor").style.display = "block";
    lastPatient = patient;

  } catch (err) {
    alert("Could not reach the server. Is it running?");
    document.getElementById("loading").style.display = "none";
  }
}

async function analyse() {
  const transcript = document.getElementById("transcript-input").value.trim();

  if (!transcript) {
    alert("Transcript is empty.");
    return;
  }

  // show loading
  document.getElementById("loading").style.display = "block";
  document.getElementById("results").style.display = "none";

  try {
    const res = await fetch("/analyse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: transcript })
    });
    const data = await res.json();

    if (!res.ok) {
      alert("Error: " + (data.error || "Something went wrong"));
      document.getElementById("loading").style.display = "none";
      return;
    }

    lastResult = data;
    renderResults(data, transcript);

  } catch (err) {
    alert("Could not reach the server. Is it running?");
    document.getElementById("loading").style.display = "none";
  }
}

function renderResults(data, transcript) {
  // transcript
  document.getElementById("transcript-text").textContent = transcript;

  // soap
  document.getElementById("soap-s").textContent = data.soap.subjective;
  document.getElementById("soap-o").textContent = data.soap.objective;
  document.getElementById("soap-a").textContent = data.soap.assessment;
  document.getElementById("soap-p").textContent = data.soap.plan;

  // conditions
  const container = document.getElementById("conditions-list");
  container.innerHTML = "";
  data.conditions.forEach(c => {
    const badgeClass = c.likelihood === "high" ? "badge-high" :
                       c.likelihood === "medium" ? "badge-medium" : "badge-low";
    container.innerHTML += `
      <div class="border rounded p-3 mb-2">
        <div class="d-flex align-items-center gap-2 mb-1">
          <span style="font-size:13px;font-weight:500">${c.name}</span>
          <span class="badge ${badgeClass}">${c.likelihood}</span>
        </div>
        <div style="font-size:12px;color:#666">Tests: ${c.tests.join(", ")}</div>
      </div>`;
  });

  // show results
  document.getElementById("loading").style.display = "none";
  document.getElementById("results").style.display = "block";
}

async function addToTracker() {
  if (!lastResult) return;

  const btn = event.target;
  btn.disabled = true;
  btn.textContent = "Added to tracker ✓";

  const tests = lastResult.conditions.flatMap(c => c.tests);

  const res = await fetch("/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patient: lastPatient, tests: tests })
  });

  if (res.ok) {
    document.getElementById("success-alert").style.display = "block";
    setTimeout(() => {
      document.getElementById("success-alert").style.display = "none";
    }, 3000);
  } else {
    alert("Failed to save to tracker.");
  }
}