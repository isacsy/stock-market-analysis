const DATA_URL = "data/news.json";
const AUTO_REFRESH_MS = 15 * 60 * 1000; // re-check for new data every 15 min

const state = {
  items: [],
  topics: [],
  activeTopic: "All",
  query: "",
};

const els = {
  list: document.getElementById("news-list"),
  empty: document.getElementById("empty-state"),
  status: document.getElementById("status-text"),
  chips: document.getElementById("topic-chips"),
  search: document.getElementById("search-input"),
  refreshBtn: document.getElementById("refresh-btn"),
};

function timeAgo(isoString) {
  const then = new Date(isoString).getTime();
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function renderChips() {
  const all = ["All", ...state.topics];
  els.chips.innerHTML = "";
  for (const topic of all) {
    const btn = document.createElement("button");
    btn.className = "chip" + (topic === state.activeTopic ? " active" : "");
    btn.textContent = topic;
    btn.addEventListener("click", () => {
      state.activeTopic = topic;
      renderChips();
      renderList();
    });
    els.chips.appendChild(btn);
  }
}

function matchesFilters(item) {
  const topicOk = state.activeTopic === "All" || item.topics.includes(state.activeTopic);
  if (!topicOk) return false;
  if (!state.query) return true;
  const haystack = (item.title + " " + item.summary).toLowerCase();
  return haystack.includes(state.query.toLowerCase());
}

function renderList() {
  const filtered = state.items.filter(matchesFilters);
  els.list.innerHTML = "";
  els.empty.hidden = filtered.length > 0;

  for (const item of filtered) {
    const card = document.createElement("article");
    card.className = "news-card";

    const link = document.createElement("a");
    link.className = "title-link";
    link.href = item.link;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = item.title;
    card.appendChild(link);

    const meta = document.createElement("div");
    meta.className = "news-meta";
    meta.innerHTML = `<span>${escapeHtml(item.source)}</span><span>&middot;</span><span>${timeAgo(item.published)}</span>`;
    card.appendChild(meta);

    if (item.summary) {
      const summary = document.createElement("p");
      summary.className = "news-summary";
      summary.textContent = item.summary;
      card.appendChild(summary);
    }

    const topics = document.createElement("div");
    topics.className = "news-topics";
    for (const t of item.topics) {
      const tag = document.createElement("span");
      tag.className = "topic-tag";
      tag.textContent = t;
      topics.appendChild(tag);
    }
    card.appendChild(topics);

    els.list.appendChild(card);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function loadNews({ silent } = {}) {
  if (!silent) els.status.textContent = "Loading...";
  try {
    const res = await fetch(`${DATA_URL}?_=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.items = data.items || [];
    state.topics = data.topics || [];
    renderChips();
    renderList();
    if (!data.generated_at) {
      els.status.textContent = "No stories yet — the first scheduled scan hasn't run.";
    } else {
      const updated = new Date(data.generated_at);
      els.status.textContent = `${data.count} stories · updated ${timeAgo(data.generated_at)} (${updated.toLocaleString()})`;
    }
  } catch (err) {
    els.status.textContent = "Couldn't load news feed. Try refreshing.";
    console.error(err);
  }
}

els.search.addEventListener("input", (e) => {
  state.query = e.target.value;
  renderList();
});

els.refreshBtn.addEventListener("click", () => loadNews());

loadNews();
setInterval(() => loadNews({ silent: true }), AUTO_REFRESH_MS);
