const DATA_URL = "data/news.json";
const AUTO_REFRESH_MS = 15 * 60 * 1000; // re-check for new data every 15 min
const STORAGE_KEY = "newsAppState-v1";
const IMPORTANCE_RANK = { High: 2, Medium: 1, Low: 0 };
const WINDOW_HOURS = { hour: 1, day: 24, week: 24 * 7 };

// ---------- persisted state (per-browser; there is no backend) ----------

function defaultState() {
  return {
    prefs: {
      watchKeywords: [],
      blockKeywords: [],
      briefWindow: "day",
      notificationsEnabled: false,
    },
    topicWeights: {}, // topic name -> +1/-1 accumulated from feedback buttons
    itemMeta: {}, // link -> { bookmarked, readLater, feedback }
    seenLinks: [],
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed, prefs: { ...defaultState().prefs, ...parsed.prefs } };
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function metaFor(link) {
  if (!state.itemMeta[link]) state.itemMeta[link] = { bookmarked: false, readLater: false, feedback: null };
  return state.itemMeta[link];
}

// ---------- app state ----------

const state = loadState();
const data = { items: [], sections: [], generatedAt: null, dailyBriefServer: "" };
const filters = {
  section: "All",
  importance: "All",
  view: "All", // All | Bookmarked | Read Later
  query: "",
  source: "",
  sort: "ranked",
};

const els = {
  list: document.getElementById("news-list"),
  empty: document.getElementById("empty-state"),
  status: document.getElementById("status-text"),
  sectionTabs: document.getElementById("section-tabs"),
  importanceChips: document.getElementById("importance-chips"),
  viewChips: document.getElementById("view-chips"),
  sourceSelect: document.getElementById("source-select"),
  sortSelect: document.getElementById("sort-select"),
  search: document.getElementById("search-input"),
  refreshBtn: document.getElementById("refresh-btn"),
  briefText: document.getElementById("daily-brief-text"),
  notifBtn: document.getElementById("notif-btn"),
  prefsBtn: document.getElementById("prefs-btn"),
  prefsDialog: document.getElementById("prefs-dialog"),
  watchTags: document.getElementById("watch-tags"),
  watchInput: document.getElementById("watch-input"),
  blockTags: document.getElementById("block-tags"),
  blockInput: document.getElementById("block-input"),
  briefWindowSelect: document.getElementById("brief-window-select"),
};

// ---------- helpers ----------

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

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function matchesKeyword(item, keyword) {
  const haystack = (item.title + " " + item.summary).toLowerCase();
  return haystack.includes(keyword.toLowerCase());
}

function isClientBlocked(item) {
  return state.prefs.blockKeywords.some((kw) => matchesKeyword(item, kw));
}

function matchedWatchKeywords(item) {
  return state.prefs.watchKeywords.filter((kw) => matchesKeyword(item, kw));
}

function personalScore(item) {
  let score = IMPORTANCE_RANK[item.importance] ?? 0;
  for (const topic of item.topics) {
    score += state.topicWeights[topic] || 0;
  }
  score += matchedWatchKeywords(item).length * 1.5;
  const meta = state.itemMeta[item.link];
  if (meta?.feedback === "down") score -= 3;
  if (meta?.feedback === "up") score += 3;
  return score;
}

// ---------- rendering ----------

function renderSectionTabs() {
  const all = ["All", ...data.sections];
  els.sectionTabs.innerHTML = "";
  for (const section of all) {
    const btn = document.createElement("button");
    btn.className = "chip" + (section === filters.section ? " active" : "");
    btn.textContent = section;
    btn.addEventListener("click", () => {
      filters.section = section;
      renderSectionTabs();
      renderList();
    });
    els.sectionTabs.appendChild(btn);
  }
}

function renderImportanceChips() {
  const levels = ["All", "High", "Medium", "Low"];
  els.importanceChips.innerHTML = "";
  for (const level of levels) {
    const btn = document.createElement("button");
    btn.className = "chip chip-small" + (level === filters.importance ? " active" : "");
    btn.textContent = level;
    btn.addEventListener("click", () => {
      filters.importance = level;
      renderImportanceChips();
      renderList();
    });
    els.importanceChips.appendChild(btn);
  }
}

function renderViewChips() {
  const views = ["All", "Bookmarked", "Read Later"];
  els.viewChips.innerHTML = "";
  for (const view of views) {
    const btn = document.createElement("button");
    btn.className = "chip chip-small" + (view === filters.view ? " active" : "");
    btn.textContent = view;
    btn.addEventListener("click", () => {
      filters.view = view;
      renderViewChips();
      renderList();
    });
    els.viewChips.appendChild(btn);
  }
}

function renderSourceSelect() {
  const sources = [...new Set(data.items.map((i) => i.source))].sort();
  els.sourceSelect.innerHTML = '<option value="">All sources</option>';
  for (const source of sources) {
    const opt = document.createElement("option");
    opt.value = source;
    opt.textContent = source;
    els.sourceSelect.appendChild(opt);
  }
  els.sourceSelect.value = filters.source;
}

function renderDailyBrief() {
  const windowHours = WINDOW_HOURS[state.prefs.briefWindow] ?? 24;
  const cutoff = Date.now() - windowHours * 3600 * 1000;
  const inWindow = data.items.filter((i) => new Date(i.published).getTime() >= cutoff && !isClientBlocked(i));

  if (inWindow.length === 0) {
    els.briefText.textContent = data.dailyBriefServer || "No stories in this window yet.";
    return;
  }

  const ranked = [...inWindow].sort((a, b) => personalScore(b) - personalScore(a));
  const top = ranked.slice(0, 5);
  const parts = top.map((i) => `${i.title} (${i.sections.join(", ")})`);
  els.briefText.textContent = `Top for the last ${state.prefs.briefWindow === "hour" ? "hour" : state.prefs.briefWindow === "week" ? "7 days" : "24 hours"}: ${parts.join(" · ")}`;
}

function matchesFilters(item) {
  if (isClientBlocked(item)) return false;
  if (filters.section !== "All" && !item.sections.includes(filters.section)) return false;
  if (filters.importance !== "All" && item.importance !== filters.importance) return false;
  if (filters.source && item.source !== filters.source) return false;
  const meta = state.itemMeta[item.link];
  if (filters.view === "Bookmarked" && !meta?.bookmarked) return false;
  if (filters.view === "Read Later" && !meta?.readLater) return false;
  if (filters.query) {
    const haystack = (item.title + " " + item.summary).toLowerCase();
    if (!haystack.includes(filters.query.toLowerCase())) return false;
  }
  return true;
}

function importanceBadgeClass(importance) {
  return "badge badge-" + importance.toLowerCase();
}

function renderCard(item) {
  const meta = metaFor(item.link);
  const card = document.createElement("article");
  card.className = "news-card";

  const titleRow = document.createElement("div");
  titleRow.className = "news-title-row";
  const link = document.createElement("a");
  link.className = "title-link";
  link.href = item.link;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = item.title;
  titleRow.appendChild(link);
  const badge = document.createElement("span");
  badge.className = importanceBadgeClass(item.importance);
  badge.textContent = item.importance;
  titleRow.appendChild(badge);
  card.appendChild(titleRow);

  const metaRow = document.createElement("div");
  metaRow.className = "news-meta";
  metaRow.innerHTML = `<span>${escapeHtml(item.source)}</span><span>&middot;</span><span>${timeAgo(item.published)}</span>`;
  card.appendChild(metaRow);

  if (item.key_points && item.key_points.length) {
    const ul = document.createElement("ul");
    ul.className = "key-points";
    for (const point of item.key_points) {
      const li = document.createElement("li");
      li.textContent = point;
      ul.appendChild(li);
    }
    card.appendChild(ul);
  }

  const why = document.createElement("p");
  why.className = "why-recommended";
  why.textContent = item.why_recommended;
  card.appendChild(why);

  const topics = document.createElement("div");
  topics.className = "news-topics";
  for (const t of item.topics) {
    const tag = document.createElement("span");
    tag.className = "topic-tag";
    tag.textContent = t;
    topics.appendChild(tag);
  }
  card.appendChild(topics);

  const actions = document.createElement("div");
  actions.className = "news-actions";

  const bookmarkBtn = document.createElement("button");
  bookmarkBtn.className = "action-btn" + (meta.bookmarked ? " action-active" : "");
  bookmarkBtn.textContent = meta.bookmarked ? "★ Bookmarked" : "☆ Bookmark";
  bookmarkBtn.addEventListener("click", () => {
    meta.bookmarked = !meta.bookmarked;
    saveState();
    renderList();
  });
  actions.appendChild(bookmarkBtn);

  const readLaterBtn = document.createElement("button");
  readLaterBtn.className = "action-btn" + (meta.readLater ? " action-active" : "");
  readLaterBtn.textContent = meta.readLater ? "🕒 In Read Later" : "🕒 Read Later";
  readLaterBtn.addEventListener("click", () => {
    meta.readLater = !meta.readLater;
    saveState();
    renderList();
  });
  actions.appendChild(readLaterBtn);

  const upBtn = document.createElement("button");
  upBtn.className = "action-btn" + (meta.feedback === "up" ? " action-active" : "");
  upBtn.textContent = "👍 More like this";
  upBtn.addEventListener("click", () => {
    meta.feedback = meta.feedback === "up" ? null : "up";
    for (const t of item.topics) {
      state.topicWeights[t] = (state.topicWeights[t] || 0) + (meta.feedback === "up" ? 1 : -1);
    }
    saveState();
    renderList();
  });
  actions.appendChild(upBtn);

  const downBtn = document.createElement("button");
  downBtn.className = "action-btn" + (meta.feedback === "down" ? " action-active" : "");
  downBtn.textContent = "👎 Not relevant";
  downBtn.addEventListener("click", () => {
    meta.feedback = meta.feedback === "down" ? null : "down";
    for (const t of item.topics) {
      state.topicWeights[t] = (state.topicWeights[t] || 0) + (meta.feedback === "down" ? -1 : 1);
    }
    saveState();
    renderList();
  });
  actions.appendChild(downBtn);

  card.appendChild(actions);
  return card;
}

function renderList() {
  let filtered = data.items.filter(matchesFilters);

  if (filters.sort === "ranked") {
    filtered = [...filtered].sort((a, b) => personalScore(b) - personalScore(a));
  } else {
    filtered = [...filtered].sort((a, b) => new Date(b.published) - new Date(a.published));
  }

  els.list.innerHTML = "";
  els.empty.hidden = filtered.length > 0;
  for (const item of filtered) {
    els.list.appendChild(renderCard(item));
  }
  renderDailyBrief();
}

// ---------- preferences dialog ----------

function renderTagList(container, list, onRemove) {
  container.innerHTML = "";
  list.forEach((kw, idx) => {
    const tag = document.createElement("span");
    tag.className = "pref-tag";
    tag.textContent = kw;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.addEventListener("click", () => onRemove(idx));
    tag.appendChild(remove);
    container.appendChild(tag);
  });
}

function renderPrefsDialog() {
  renderTagList(els.watchTags, state.prefs.watchKeywords, (idx) => {
    state.prefs.watchKeywords.splice(idx, 1);
    saveState();
    renderPrefsDialog();
    renderList();
  });
  renderTagList(els.blockTags, state.prefs.blockKeywords, (idx) => {
    state.prefs.blockKeywords.splice(idx, 1);
    saveState();
    renderPrefsDialog();
    renderList();
  });
  els.briefWindowSelect.value = state.prefs.briefWindow;
}

function addTagFromInput(inputEl, list, onDone) {
  const value = inputEl.value.trim();
  if (!value) return;
  if (!list.includes(value)) list.push(value);
  inputEl.value = "";
  saveState();
  onDone();
}

// ---------- notifications ----------

function maybeNotify(items) {
  if (!state.prefs.notificationsEnabled || Notification.permission !== "granted") return;
  const seen = new Set(state.seenLinks);
  const fresh = items.filter((i) => !seen.has(i.link));
  const worthNotifying = fresh.filter((i) => i.importance === "High" || matchedWatchKeywords(i).length > 0);

  for (const item of worthNotifying.slice(0, 3)) {
    new Notification(item.title, {
      body: `${item.source} · ${item.why_recommended}`,
      tag: item.link,
    });
  }

  state.seenLinks = items.map((i) => i.link).slice(0, 300);
  saveState();
}

function updateNotifBtn() {
  if (state.prefs.notificationsEnabled && Notification.permission === "granted") {
    els.notifBtn.textContent = "🔔";
    els.notifBtn.title = "Notifications on for important stories";
    els.notifBtn.classList.add("action-active");
  } else {
    els.notifBtn.textContent = "🔕";
    els.notifBtn.title = "Enable notifications for important stories";
    els.notifBtn.classList.remove("action-active");
  }
}

// ---------- data loading ----------

async function loadNews({ silent } = {}) {
  if (!silent) els.status.textContent = "Loading...";
  try {
    const res = await fetch(`${DATA_URL}?_=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    data.items = json.items || [];
    data.sections = json.sections || [];
    data.generatedAt = json.generated_at;
    data.dailyBriefServer = json.daily_brief || "";

    if (!filters.section || !["All", ...data.sections].includes(filters.section)) {
      filters.section = "All";
    }

    renderSectionTabs();
    renderSourceSelect();
    renderList();
    maybeNotify(data.items);

    if (!json.generated_at) {
      els.status.textContent = "No stories yet — the first scheduled scan hasn't run.";
    } else {
      const updated = new Date(json.generated_at);
      els.status.textContent = `${json.count} stories · updated ${timeAgo(json.generated_at)} (${updated.toLocaleString()})`;
    }
  } catch (err) {
    els.status.textContent = "Couldn't load news feed. Try refreshing.";
    console.error(err);
  }
}

// ---------- wiring ----------

els.search.addEventListener("input", (e) => {
  filters.query = e.target.value;
  renderList();
});
els.sourceSelect.addEventListener("change", (e) => {
  filters.source = e.target.value;
  renderList();
});
els.sortSelect.addEventListener("change", (e) => {
  filters.sort = e.target.value;
  renderList();
});
els.refreshBtn.addEventListener("click", () => loadNews());

els.prefsBtn.addEventListener("click", () => {
  renderPrefsDialog();
  els.prefsDialog.showModal();
});
els.prefsDialog.addEventListener("close", () => {
  renderDailyBrief();
});
els.watchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addTagFromInput(els.watchInput, state.prefs.watchKeywords, () => {
      renderPrefsDialog();
      renderList();
    });
  }
});
els.blockInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addTagFromInput(els.blockInput, state.prefs.blockKeywords, () => {
      renderPrefsDialog();
      renderList();
    });
  }
});
els.briefWindowSelect.addEventListener("change", (e) => {
  state.prefs.briefWindow = e.target.value;
  saveState();
  renderDailyBrief();
});

els.notifBtn.addEventListener("click", async () => {
  if (!("Notification" in window)) {
    alert("Your browser doesn't support notifications.");
    return;
  }
  if (!state.prefs.notificationsEnabled) {
    const permission = await Notification.requestPermission();
    state.prefs.notificationsEnabled = permission === "granted";
  } else {
    state.prefs.notificationsEnabled = false;
  }
  saveState();
  updateNotifBtn();
});

// ---------- init ----------

renderImportanceChips();
renderViewChips();
updateNotifBtn();
loadNews();
setInterval(() => loadNews({ silent: true }), AUTO_REFRESH_MS);
