const form = document.getElementById("scan-form");
const submitBtn = document.getElementById("submitBtn");
const formError = document.getElementById("formError");
const reviewText = document.getElementById("reviewText");
const charCount = document.getElementById("charCount");

const reportEmpty = document.getElementById("reportEmpty");
const reportBody = document.getElementById("reportBody");
const verdictStamp = document.getElementById("verdictStamp");
const scoreNum = document.getElementById("scoreNum");
const reportTitle = document.getElementById("reportTitle");
const reasoningText = document.getElementById("reasoningText");
const fullReviewText = document.getElementById("fullReviewText");

const historyEmpty = document.getElementById("historyEmpty");
const historyList = document.getElementById("historyList");

const statTotal = document.getElementById("statTotal");
const statGenuine = document.getElementById("statGenuine");
const statSuspicious = document.getElementById("statSuspicious");
const statFake = document.getElementById("statFake");

// Keeps a lookup of every scan we've loaded, by its Firestore ID,
// so clicking a history row can pull up its full details instantly.
const scansById = {};

reviewText.addEventListener("input", () => {
  charCount.textContent = reviewText.value.length;
});

function verdictClass(verdict) {
  if (verdict === "Genuine") return "genuine";
  if (verdict === "Suspicious") return "suspicious";
  return "fake";
}

function formatTimestamp(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderReport(result) {
  reportEmpty.hidden = true;
  reportBody.hidden = false;

  const cls = verdictClass(result.verdict);
  verdictStamp.textContent = result.verdict.toUpperCase();
  verdictStamp.className = `verdict-stamp ${cls}`;

  scoreNum.textContent = result.fakeScore;
  reportTitle.textContent = result.title || "";
  reasoningText.textContent = result.reasoning || "";
  fullReviewText.textContent = `"${result.reviewText}"`;
}

function prependHistoryItem(entry) {
  historyEmpty.hidden = true;
  historyList.hidden = false;

  scansById[entry.id] = entry;

  const li = document.createElement("li");
  li.className = "history-item";
  li.dataset.id = entry.id;
  const cls = verdictClass(entry.verdict);

  const displayTitle = entry.title || entry.reviewText.slice(0, 40);
  const timeLabel = formatTimestamp(entry.createdAt);

  li.innerHTML = `
    <span class="h-verdict ${cls}">${entry.verdict.toUpperCase()}</span>
    <span class="h-text">${escapeHtml(displayTitle)}</span>
    <span class="h-score">${entry.fakeScore}/100</span>
    <span class="h-time">${timeLabel}</span>
  `;

  li.addEventListener("click", () => {
    const clickedEntry = scansById[li.dataset.id];
    if (clickedEntry) {
      renderReport(clickedEntry);
    }
  });

  historyList.prepend(li);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function loadHistory() {
  const res = await fetch("/api/reviews?limit=15");
  const data = await res.json();
  if (data.reviews && data.reviews.length) {
    historyEmpty.hidden = true;
    historyList.hidden = false;
    data.reviews.forEach((entry) => prependHistoryItem(entry));
  }
}

async function loadStats() {
  const res = await fetch("/api/stats");
  const stats = await res.json();
  statTotal.textContent = stats.total ?? 0;
  statGenuine.textContent = stats.Genuine ?? 0;
  statSuspicious.textContent = stats.Suspicious ?? 0;
  statFake.textContent = stats.Fake ?? 0;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.hidden = true;

  const payload = {
    reviewText: reviewText.value.trim(),
  };

  if (payload.reviewText.length < 5) {
    formError.textContent = "Please enter at least a few words of review text.";
    formError.hidden = false;
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Scanning…";

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Scan failed.");
    }

    renderReport(data);
    prependHistoryItem(data);
    loadStats();

    reviewText.value = "";
    charCount.textContent = "0";
  } catch (err) {
    formError.textContent = err.message || "Something went wrong.";
    formError.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Run scan";
  }
});

loadHistory();
loadStats();