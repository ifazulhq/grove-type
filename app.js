(function () {
  "use strict";

  var C = window.GROVE;
  if (!C || !C.game) return;

  var root = document.documentElement;
  var scoreKey = "grovetype.scores.v1";
  var durationKey = "grovetype.duration";
  var themeKey = "grovetype.theme";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  var leafSvg = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.5 3.5C11 4.5 4.6 10 4.5 19.5c9.5.1 15-6.3 16-15.6Z" fill="currentColor"/></svg>';

  function $(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function $$(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  function readStore(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function writeStore(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      /* storage can be unavailable in private modes */
    }
  }

  function copyAt(path) {
    return path.split(".").reduce(function (node, key) {
      return node && typeof node === "object" ? node[key] : undefined;
    }, C);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatNumber(value) {
    try {
      return new Intl.NumberFormat().format(value);
    } catch (error) {
      return String(value);
    }
  }

  function escapeText(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[character];
    });
  }

  /* ---------- Element references ---------- */
  var header = $("#siteHeader");
  var navLinks = $("#navLinks");
  var themeToggle = $("#themeToggle");
  var heroStats = $("#heroStats");
  var heroCaps = $("#heroCaps");
  var heroScene = $("#heroScene");
  var badgeText = $("#badgeText");
  var tapeTrack = $("#tapeTrack");
  var modesEl = $("#modes");
  var bestModeLabel = $("#bestModeLabel");
  var bestValue = $("#bestValue");
  var endBtn = $("#endBtn");
  var hud = $("#hud");
  var hudTime = $("#hudTime");
  var hudWpm = $("#hudWpm");
  var hudAcc = $("#hudAcc");
  var progressFill = $("#progressFill");
  var stage = $("#stage");
  var wordsEl = $("#words");
  var wordsViewport = $("#wordsViewport");
  var input = $("#typeInput");
  var veil = $("#stageVeil");
  var veilTitle = $("#veilTitle");
  var veilHint = $("#veilHint");
  var startBtn = $("#startBtn");
  var restartBtn = $("#restartBtn");
  var howGrid = $("#howGrid");
  var bestGrid = $("#bestGrid");
  var historyList = $("#historyList");
  var clearScores = $("#clearScores");
  var footerLinks = $("#footerLinks");
  var footerCopy = $("#footerCopy");
  var toastEl = $("#toast");
  var liveRegion = $("#liveRegion");
  var results = $("#results");
  var resultsCard = $("#resultsCard");
  var closeResultsBtn = $("#closeResults");
  var resWpm = $("#resWpm");
  var resAcc = $("#resAcc");
  var resChars = $("#resChars");
  var resTime = $("#resTime");
  var resMode = $("#resMode");
  var resBestLine = $("#resBestLine");
  var resSticker = $("#resSticker");
  var shareResultsBtn = $("#shareResults");
  var saveCardBtn = $("#saveCard");
  var againBtn = $("#againBtn");
  var confetti = $("#confetti");

  /* ---------- State & storage ---------- */
  var defaultScores = function () {
    return { best: {}, history: [], rounds: 0, words: 0 };
  };

  function loadScores() {
    var parsed = null;
    try {
      parsed = JSON.parse(readStore(scoreKey) || "null");
    } catch (error) {
      parsed = null;
    }
    var store = defaultScores();
    if (!parsed || typeof parsed !== "object") return store;

    C.game.modes.forEach(function (mode) {
      var saved = parsed.best && parsed.best[mode.seconds];
      if (saved && isFinite(saved.wpm) && Number(saved.wpm) > 0) {
        store.best[mode.seconds] = {
          wpm: Math.round(Number(saved.wpm)),
          accuracy: clamp(Math.round(Number(saved.accuracy) || 0), 0, 100),
          date: typeof saved.date === "string" ? saved.date : null
        };
      }
    });

    if (Array.isArray(parsed.history)) {
      store.history = parsed.history
        .filter(function (entry) {
          return entry && isFinite(entry.wpm) && Number(entry.wpm) > 0 && isFinite(entry.duration);
        })
        .slice(0, 8)
        .map(function (entry) {
          return {
            wpm: Math.round(Number(entry.wpm)),
            accuracy: clamp(Math.round(Number(entry.accuracy) || 0), 0, 100),
            duration: Number(entry.duration),
            seconds: Math.max(1, Math.round(Number(entry.seconds) || Number(entry.duration))),
            date: typeof entry.date === "string" ? entry.date : null
          };
        });
    }

    store.rounds = Math.max(0, Number(parsed.rounds) || 0);
    store.words = Math.max(0, Number(parsed.words) || 0);
    return store;
  }

  function persistScores() {
    try {
      writeStore(scoreKey, JSON.stringify(scoresData));
    } catch (error) {
      /* ignore */
    }
  }

  var scoresData = loadScores();
  var storedDuration = parseInt(readStore(durationKey), 10);
  var initialDuration = 30;
  C.game.modes.some(function (mode) {
    if (mode.seconds === storedDuration) {
      initialDuration = storedDuration;
      return true;
    }
    return false;
  });

  var state = {
    duration: initialDuration,
    status: "idle",
    words: [],
    index: 0,
    keystrokes: 0,
    correctKeystrokes: 0,
    remaining: initialDuration * 1000,
    lastTick: 0,
    timerId: null,
    lastValue: "",
    rows: [],
    lastWord: "",
    currentResult: null,
    cardCanvas: null
  };

  var hideTimer = null;
  var toastTimer = null;
  var announceTimer = null;
  var wpmAnim = 0;
  var tiltFrame = 0;

  /* ---------- Copy hydration & metadata ---------- */
  function hydrateCopy(scope) {
    $$("[data-copy]", scope).forEach(function (el) {
      var value = copyAt(el.getAttribute("data-copy"));
      if (typeof value === "string") el.textContent = value;
    });
    $$("[data-copy-aria]", scope).forEach(function (el) {
      var value = copyAt(el.getAttribute("data-copy-aria"));
      if (typeof value === "string") el.setAttribute("aria-label", value);
    });
  }

  function applyMeta() {
    document.title = C.meta.title;
    var description = $('meta[name="description"]');
    if (description) description.setAttribute("content", C.meta.description);
    var ogTitle = $('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", C.meta.title);
    var ogDescription = $('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute("content", C.meta.description);
  }

  /* ---------- Static content rendering ---------- */
  function renderNav() {
    navLinks.replaceChildren();
    C.nav.links.forEach(function (link) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = link.href;
      a.textContent = link.label;
      li.appendChild(a);
      navLinks.appendChild(li);
    });

    footerLinks.replaceChildren();
    C.nav.links.forEach(function (link) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = link.href;
      a.textContent = link.label;
      li.appendChild(a);
      footerLinks.appendChild(li);
    });

    footerCopy.textContent = C.footer.copy.replace("{year}", String(new Date().getFullYear()));
  }

  function renderHero() {
    heroCaps.replaceChildren();
    C.hero.keycaps.forEach(function (letter) {
      var cap = document.createElement("span");
      cap.className = "keycap";
      cap.textContent = letter;
      heroCaps.appendChild(cap);
    });
    badgeText.textContent = C.hero.badgeText;
  }

  function renderTape() {
    tapeTrack.replaceChildren();
    if (!C.tape.length) {
      $(".tape").hidden = true;
      return;
    }
    function buildGroup() {
      var group = document.createElement("div");
      group.className = "tape__group";
      C.tape.forEach(function (word) {
        var item = document.createElement("span");
        item.className = "tape__item";
        item.textContent = word;
        var sep = document.createElement("span");
        sep.className = "tape__sep";
        sep.innerHTML = leafSvg;
        group.appendChild(item);
        group.appendChild(sep);
      });
      return group;
    }
    tapeTrack.appendChild(buildGroup());
    tapeTrack.appendChild(buildGroup());
  }

  function renderSteps() {
    howGrid.replaceChildren();
    C.how.steps.forEach(function (step, index) {
      var card = document.createElement("article");
      card.className = "step-card reveal";
      card.style.setProperty("--reveal-delay", index * 80 + "ms");

      var label = document.createElement("span");
      label.className = "step-card__label";
      label.textContent = C.how.stepLabel;

      var num = document.createElement("span");
      num.className = "step-card__num";
      num.textContent = String(index + 1).padStart(2, "0");

      var heading = document.createElement("h3");
      heading.textContent = step.title;

      var body = document.createElement("p");
      body.textContent = step.body;

      card.append(label, num, heading, body);
      howGrid.appendChild(card);
    });
  }

  /* ---------- Modes ---------- */
  function renderModes() {
    modesEl.replaceChildren();
    C.game.modes.forEach(function (mode) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "mode";
      button.setAttribute("data-seconds", String(mode.seconds));
      button.setAttribute("aria-pressed", String(mode.seconds === state.duration));
      button.setAttribute("aria-label", C.game.modeAria(mode.seconds, mode.note));
      if (mode.seconds === state.duration) button.classList.add("is-active");

      var strong = document.createElement("strong");
      strong.textContent = mode.seconds + "s";
      var note = document.createElement("span");
      note.textContent = mode.note;
      button.append(strong, note);

      button.addEventListener("click", function () {
        selectDuration(mode.seconds);
      });
      modesEl.appendChild(button);
    });
  }

  function syncModes() {
    $$(".mode", modesEl).forEach(function (button) {
      var active = Number(button.getAttribute("data-seconds")) === state.duration;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function selectDuration(seconds) {
    if (!C.game.modes.some(function (mode) { return mode.seconds === seconds; })) return;
    state.duration = seconds;
    writeStore(durationKey, String(seconds));
    syncModes();
    resetRound();
    updateBestUI();
    toast(C.game.toastMode(seconds));
  }

  /* ---------- Scores UI ---------- */
  function heroValue(label, value, unit) {
    var li = document.createElement("li");
    var span = document.createElement("span");
    span.className = "stat-label";
    span.textContent = label;
    var strong = document.createElement("strong");
    strong.textContent = value;
    if (unit) {
      var small = document.createElement("small");
      small.textContent = unit;
      strong.appendChild(small);
    }
    li.append(span, strong);
    return li;
  }

  function renderHeroStats() {
    var bestValues = C.game.modes.map(function (mode) {
      var best = scoresData.best[mode.seconds];
      return best ? best.wpm : 0;
    });
    var best = Math.max.apply(Math, bestValues.concat(0));
    heroStats.replaceChildren(
      heroValue(C.hero.stats.best, best ? formatNumber(best) : "—", best ? C.hero.stats.unit : ""),
      heroValue(C.hero.stats.rounds, formatNumber(scoresData.rounds)),
      heroValue(C.hero.stats.words, formatNumber(scoresData.words))
    );
  }

  function renderBestCards() {
    bestGrid.replaceChildren();
    C.game.modes.forEach(function (mode) {
      var best = scoresData.best[mode.seconds];
      var card = document.createElement("article");
      card.className = "best-card";

      var label = document.createElement("p");
      label.className = "best-card__mode";
      var clock = document.createElement("span");
      clock.className = "best-card__clock";
      clock.textContent = mode.seconds + "s";
      var note = document.createElement("span");
      note.className = "best-card__note";
      note.textContent = mode.note;
      label.append(clock, note);

      var value = document.createElement("p");
      value.className = "best-card__wpm";
      value.textContent = best ? String(best.wpm) : "—";

      var unit = document.createElement("p");
      unit.className = "best-card__unit";
      unit.textContent = C.scores.wpmUnit;

      var sub = document.createElement("p");
      sub.className = "best-card__sub";
      sub.textContent = best
        ? best.accuracy + "% " + C.scores.accLabel
        : C.scores.emptyBestSub;

      card.append(label, value, unit, sub);
      bestGrid.appendChild(card);
    });
  }

  var dateFormatter;
  try {
    dateFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
  } catch (error) {
    dateFormatter = null;
  }

  function formatDate(value) {
    if (!value) return "";
    var date = new Date(value);
    if (isNaN(date.getTime())) return "";
    return dateFormatter ? dateFormatter.format(date) : date.toLocaleDateString();
  }

  function renderHistory() {
    historyList.replaceChildren();
    clearScores.hidden = !scoresData.history.length;
    if (!scoresData.history.length) {
      var empty = document.createElement("div");
      empty.className = "history-empty";
      empty.innerHTML = leafSvg;
      var title = document.createElement("strong");
      title.textContent = C.scores.emptyHistory;
      var hint = document.createElement("span");
      hint.textContent = C.scores.emptyHistorySub;
      empty.append(title, hint);
      historyList.appendChild(empty);
      return;
    }

    scoresData.history.forEach(function (entry) {
      var row = document.createElement("div");
      row.className = "history-row";
      row.innerHTML =
        '<span class="history-row__mode">' + escapeText(entry.duration) + "s</span>" +
        '<span class="history-row__wpm">' + escapeText(entry.wpm) + " <small>" + escapeText(C.scores.wpmUnit) + "</small></span>" +
        '<span class="history-row__acc">' + escapeText(entry.accuracy) + "%</span>" +
        '<span class="history-row__date">' + escapeText(formatDate(entry.date)) + "</span>";
      historyList.appendChild(row);
    });
  }

  function updateBestUI() {
    var best = scoresData.best[state.duration];
    bestModeLabel.textContent = state.duration + "s";
    bestValue.textContent = best ? best.wpm + " " + C.scores.wpmUnit : C.game.bestEmpty;
  }

  function renderScoreboard() {
    renderHeroStats();
    renderBestCards();
    renderHistory();
    updateBestUI();
  }

  clearScores.addEventListener("click", function () {
    if (!window.confirm(C.scores.clearConfirm)) return;
    scoresData = defaultScores();
    persistScores();
    renderScoreboard();
    toast(C.scores.cleared);
  });

  /* ---------- Word engine ---------- */
  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = list[i];
      list[i] = list[j];
      list[j] = temp;
    }
    return list;
  }

  function wordPool() {
    var seen = Object.create(null);
    var pool = [];
    C.words.forEach(function (word) {
      var clean = String(word).trim().toLowerCase();
      if (clean && !seen[clean]) {
        seen[clean] = true;
        pool.push(clean);
      }
    });
    return pool;
  }

  function createWordList(count) {
    var pool = wordPool();
    if (!pool.length) return ["sprout"];
    var output = [];
    var deck = [];
    var last = state.lastWord;

    while (output.length < count) {
      if (!deck.length) deck = shuffle(pool.slice());
      var choice = deck.pop();
      if (choice === last && deck.length) {
        var alternate = deck.pop();
        deck.push(choice);
        choice = alternate;
      }
      output.push(choice);
      last = choice;
    }
    state.lastWord = last;
    return output;
  }

  function createCaret() {
    var caret = document.createElement("span");
    caret.className = "caret";
    caret.setAttribute("aria-hidden", "true");
    return caret;
  }

  function paintWord(word, isActive) {
    if (!word || !word.el) return;
    var fragment = document.createDocumentFragment();
    var letters = [];
    var max = Math.max(word.text.length, word.typed.length);

    for (var i = 0; i < max; i += 1) {
      var span = document.createElement("span");
      if (i >= word.text.length) {
        span.className = "letter is-extra";
        span.textContent = word.typed[i];
      } else if (i >= word.typed.length) {
        span.className = "letter";
        span.textContent = word.text[i];
      } else {
        span.className = "letter " + (word.typed[i] === word.text[i] ? "is-ok" : "is-bad");
        span.textContent = word.text[i];
      }
      letters.push(span);
    }

    if (isActive) {
      letters.splice(Math.min(word.typed.length, letters.length), 0, createCaret());
    }

    letters.forEach(function (node) {
      fragment.appendChild(node);
    });
    word.el.classList.toggle("word--active", Boolean(isActive));
    word.el.replaceChildren(fragment);
  }

  function renderWords() {
    var list = createWordList(180);
    state.words = list.map(function (text) {
      return { text: text, typed: "", el: null };
    });
    state.index = 0;
    state.rows = [];

    var fragment = document.createDocumentFragment();
    state.words.forEach(function (word) {
      var span = document.createElement("span");
      span.className = "word";
      word.el = span;
      paintWord(word, false);
      fragment.appendChild(span);
    });
    wordsEl.replaceChildren(fragment);
    wordsEl.style.transition = "none";
    wordsEl.style.transform = "translateY(0)";

    window.requestAnimationFrame(function () {
      measureRows();
      paintWord(state.words[0], true);
      input.maxLength = state.words[0].text.length + 2;
    });
  }

  function measureRows() {
    if (!state.words.length || !wordsEl.children.length) return;
    var tops = [];
    state.words.forEach(function (word) {
      var top = word.el.offsetTop;
      if (tops.indexOf(top) === -1) tops.push(top);
    });
    tops.sort(function (a, b) { return a - b; });
    state.rows = tops;
    var rowHeight = tops.length > 1 ? tops[1] - tops[0] : state.words[0].el.offsetHeight || 40;
    wordsViewport.style.height = Math.round(rowHeight * 3) + "px";
    scrollWords(false);
  }

  function scrollWords(smooth) {
    var active = state.words[state.index];
    if (!active || !state.rows.length) return;
    var top = active.el.offsetTop;
    var rowIndex = 0;
    state.rows.forEach(function (value, index) {
      if (value <= top + 1) rowIndex = index;
    });
    var target = state.rows[Math.max(0, rowIndex - 1)] || 0;

    if (!smooth) {
      wordsEl.style.transition = "none";
    }
    wordsEl.style.transform = "translateY(" + -target + "px)";
    if (!smooth) {
      void wordsEl.offsetHeight;
      wordsEl.style.transition = "";
    }
  }

  /* ---------- Round mechanics ---------- */
  function stopTimer() {
    if (state.timerId) {
      window.clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function elapsedMs() {
    return Math.max(0, state.duration * 1000 - state.remaining);
  }

  function countCorrect(includeSpaces) {
    var total = 0;
    var last = Math.min(state.index, state.words.length - 1);
    for (var i = 0; i <= last; i += 1) {
      var word = state.words[i];
      if (!word) continue;
      var length = Math.min(word.typed.length, word.text.length);
      for (var j = 0; j < length; j += 1) {
        if (word.typed[j] === word.text[j]) total += 1;
      }
      if (includeSpaces && i < state.index) total += 1;
    }
    return total;
  }

  function accuracyPct() {
    if (!state.keystrokes) return 100;
    return Math.round((state.correctKeystrokes / state.keystrokes) * 100);
  }

  function currentWpm() {
    var elapsed = elapsedMs();
    if (elapsed < 400) return 0;
    return Math.round((countCorrect(true) / 5) / (elapsed / 60000));
  }

  function updateHud() {
    var secondsLeft = Math.max(0, Math.ceil(state.remaining / 1000));
    var displaySeconds = state.status === "finished" ? Math.max(1, Math.round(elapsedMs() / 1000)) : secondsLeft;
    hudTime.textContent = String(displaySeconds);
    hudWpm.textContent = String(currentWpm());
    hudAcc.textContent = accuracyPct() + "%";

    var progress = state.status === "finished" ? 100 : clamp((1 - state.remaining / (state.duration * 1000)) * 100, 0, 100);
    progressFill.style.width = progress + "%";
    hud.classList.toggle("is-urgent", state.status === "running" && state.remaining <= 10000);
  }

  function setVeil(kind) {
    if (kind === "hidden") {
      veil.classList.add("is-hidden");
      return;
    }
    veil.classList.remove("is-hidden");
    var source = kind === "paused" ? C.game.pause : C.game.idle;
    veilTitle.textContent = source.title;
    veilHint.textContent = source.hint;
    startBtn.textContent = source.cta;
  }

  function resetRound() {
    stopTimer();
    state.status = "idle";
    state.remaining = state.duration * 1000;
    state.index = 0;
    state.keystrokes = 0;
    state.correctKeystrokes = 0;
    state.lastValue = "";
    state.currentResult = null;
    state.cardCanvas = null;
    input.value = "";
    input.maxLength = 24;
    if (document.activeElement === input) input.blur();

    stage.classList.remove("is-running", "is-paused", "is-finished");
    stage.classList.add("is-idle");
    endBtn.disabled = true;
    hud.classList.remove("is-urgent");
    setVeil("idle");
    renderWords();
    updateHud();
    updateBestUI();
  }

  function startRound() {
    if (state.status !== "idle") return;
    state.status = "running";
    state.lastTick = performance.now();
    state.timerId = window.setInterval(tick, 100);
    stage.classList.remove("is-idle");
    stage.classList.add("is-running");
    endBtn.disabled = false;
    setVeil("hidden");
    updateHud();
  }

  function pauseRound() {
    if (state.status !== "running") return;
    stopTimer();
    state.status = "paused";
    stage.classList.add("is-paused");
    setVeil("paused");
    updateHud();
  }

  function resumeRound() {
    if (state.status !== "paused") return;
    state.status = "running";
    state.lastTick = performance.now();
    state.timerId = window.setInterval(tick, 100);
    stage.classList.remove("is-paused");
    setVeil("hidden");
    updateHud();
  }

  function tick() {
    if (state.status !== "running") return;
    var now = performance.now();
    var delta = now - state.lastTick;
    state.lastTick = now;
    state.remaining = Math.max(0, state.remaining - delta);
    updateHud();
    if (state.remaining <= 0) finishRound();
  }

  function commitWord() {
    if (state.status === "finished" || state.status === "idle") return;
    var active = state.words[state.index];
    if (!active || !input.value.length) return;

    active.typed = input.value;
    paintWord(active, false);
    state.index += 1;
    state.lastValue = "";
    input.value = "";

    if (state.index >= state.words.length) {
      finishRound();
      return;
    }

    var next = state.words[state.index];
    paintWord(next, true);
    input.maxLength = next.text.length + 2;
    scrollWords(true);
    updateHud();
  }

  function goBack() {
    if (state.status === "finished" || state.index === 0) return;
    var current = state.words[state.index];
    if (current) {
      current.typed = "";
      paintWord(current, false);
    }
    state.index -= 1;
    var previous = state.words[state.index];
    previous.typed = previous.typed.slice(0, -1);
    input.value = previous.typed;
    input.maxLength = previous.text.length + 2;
    state.lastValue = previous.typed;
    paintWord(previous, true);
    scrollWords(true);
    updateHud();
  }

  function onInput() {
    if (state.status === "finished") {
      input.value = "";
      return;
    }
    if (state.status === "paused") resumeRound();
    var active = state.words[state.index];
    if (!active) return;

    var raw = input.value || "";
    var commit = false;
    if (/\s/.test(raw)) {
      commit = true;
      raw = raw.replace(/\s+/g, " ").split(" ")[0];
    }
    raw = raw.replace(/\s/g, "");
    var limit = active.text.length + 2;
    if (raw.length > limit) raw = raw.slice(0, limit);
    if (input.value !== raw) input.value = raw;

    if (state.status === "idle") startRound();

    var added = raw.length - state.lastValue.length;
    if (added > 0) {
      for (var i = state.lastValue.length; i < raw.length; i += 1) {
        state.keystrokes += 1;
        if (raw[i] === active.text[i]) state.correctKeystrokes += 1;
      }
    }

    active.typed = raw;
    state.lastValue = raw;
    paintWord(active, true);
    updateHud();

    if (commit) commitWord();
  }

  function finishRound() {
    if (state.status === "finished") return;
    if (state.status === "idle") return;

    var elapsed = elapsedMs();
    stopTimer();
    state.status = "finished";
    stage.classList.remove("is-running", "is-paused");
    stage.classList.add("is-finished");
    endBtn.disabled = true;
    hud.classList.remove("is-urgent");

    var active = state.words[state.index];
    if (active) paintWord(active, false);
    input.blur();

    var correct = countCorrect(false);
    var wpm = elapsed > 400 ? Math.round((countCorrect(true) / 5) / (elapsed / 60000)) : 0;
    var accuracy = accuracyPct();
    var wordsTyped = state.index + (active && active.typed.length ? 1 : 0);
    var qualifies = elapsed >= 5000 && wordsTyped >= 1 && wpm > 0;

    var result = {
      wpm: wpm,
      accuracy: accuracy,
      correct: correct,
      seconds: Math.max(1, Math.round(elapsed / 1000)),
      duration: state.duration,
      wordsTyped: wordsTyped,
      qualifies: qualifies,
      date: new Date().toISOString()
    };

    updateHud();
    recordResult(result);
    state.currentResult = result;
    openResults(result);
  }

  function recordResult(result) {
    var previous = scoresData.best[result.duration] || null;
    result.previousBest = previous ? previous.wpm : null;
    result.isNewBest = false;
    result.isFirstScore = !previous && result.qualifies;

    if (result.qualifies) {
      scoresData.rounds += 1;
      scoresData.words += result.wordsTyped;
      scoresData.history.unshift({
        wpm: result.wpm,
        accuracy: result.accuracy,
        duration: result.duration,
        seconds: result.seconds,
        date: result.date
      });
      scoresData.history = scoresData.history.slice(0, 8);
      if (!previous || result.wpm > previous.wpm) {
        scoresData.best[result.duration] = {
          wpm: result.wpm,
          accuracy: result.accuracy,
          date: result.date
        };
        result.isNewBest = Boolean(previous);
      }
      persistScores();
    } else if (result.wordsTyped > 0) {
      scoresData.rounds += 1;
      scoresData.words += result.wordsTyped;
      persistScores();
    }

    renderScoreboard();
  }

  /* ---------- Toast & announcements ---------- */
  function toast(message) {
    if (!message) return;
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastEl.classList.remove("is-visible");
    }, 2600);
  }

  function announce(message) {
    window.clearTimeout(announceTimer);
    liveRegion.textContent = "";
    announceTimer = window.setTimeout(function () {
      liveRegion.textContent = message;
    }, 60);
  }

  /* ---------- Results dialog ---------- */
  function animateWpm(target) {
    window.cancelAnimationFrame(wpmAnim);
    if (reduceMotion.matches) {
      resWpm.textContent = String(target);
      return;
    }
    var started = performance.now();
    var duration = 850;
    function frame(now) {
      var progress = Math.min(1, (now - started) / duration);
      var eased = 1 - Math.pow(1 - progress, 3);
      resWpm.textContent = String(Math.round(target * eased));
      if (progress < 1) wpmAnim = window.requestAnimationFrame(frame);
    }
    wpmAnim = window.requestAnimationFrame(frame);
  }

  function launchLeaves() {
    if (reduceMotion.matches) return;
    confetti.replaceChildren();
    var styles = window.getComputedStyle(root);
    var colors = ["--clay", "--ochre", "--olive", "--sage"].map(function (name) {
      return styles.getPropertyValue(name).trim();
    }).filter(Boolean);

    for (var i = 0; i < 28; i += 1) {
      var leaf = document.createElement("span");
      leaf.className = "leaf-piece";
      leaf.style.setProperty("--x", Math.random() * 100 + "%");
      leaf.style.setProperty("--drift", (Math.random() - 0.5) * 190 + "px");
      leaf.style.setProperty("--spin", Math.round(Math.random() * 720 - 360) + "deg");
      leaf.style.setProperty("--dur", 1.8 + Math.random() * 1.7 + "s");
      leaf.style.setProperty("--delay", Math.random() * 0.7 + "s");
      leaf.style.setProperty("--leaf-color", colors[i % colors.length] || "currentColor");
      leaf.style.width = 6 + Math.random() * 7 + "px";
      leaf.style.height = 11 + Math.random() * 8 + "px";
      confetti.appendChild(leaf);
    }

    window.setTimeout(function () {
      confetti.replaceChildren();
    }, 4200);
  }

  function openResults(result) {
    window.clearTimeout(hideTimer);
    resWpm.textContent = "0";
    resAcc.textContent = result.accuracy + "%";
    resChars.textContent = String(result.correct);
    resTime.textContent = result.seconds + "s";
    resMode.textContent = C.results.modeLabel(result.duration);

    if (result.qualifies) {
      if (result.isNewBest) {
        resBestLine.textContent = C.results.bestPrefix + ": " + result.wpm + " " + C.scores.wpmUnit;
      } else if (result.previousBest) {
        resBestLine.textContent = C.results.bestPrefix + ": " + result.previousBest + " " + C.scores.wpmUnit;
      } else {
        resBestLine.textContent = C.results.firstScore;
      }
    } else {
      resBestLine.textContent = C.results.shortRound;
    }

    resSticker.hidden = true;
    shareResultsBtn.disabled = false;
    saveCardBtn.disabled = false;

    results.hidden = false;
    void results.offsetWidth;
    results.classList.add("is-open");
    document.body.classList.add("is-locked");
    [header, $("main"), $(".site-footer"), $(".skip-link")].forEach(function (el) {
      if (el) el.inert = true;
    });

    if (result.isNewBest) {
      void resSticker.offsetWidth;
      resSticker.hidden = false;
    }

    closeResultsBtn.focus({ preventScroll: true });
    animateWpm(result.wpm);

    if (result.isNewBest) {
      launchLeaves();
      announce("New personal best. " + result.wpm + " words per minute at " + result.accuracy + " percent accuracy.");
    } else {
      announce("Round complete. " + result.wpm + " words per minute at " + result.accuracy + " percent accuracy.");
    }
  }

  function closeResults(options) {
    var again = Boolean(options && options.again);
    results.classList.remove("is-open");
    document.body.classList.remove("is-locked");
    [header, $("main"), $(".site-footer"), $(".skip-link")].forEach(function (el) {
      if (el) el.inert = false;
    });
    resetRound();

    hideTimer = window.setTimeout(function () {
      results.hidden = true;
      if (again) {
        input.focus({ preventScroll: true });
      } else {
        startBtn.focus({ preventScroll: true });
      }
    }, 280);
  }

  closeResultsBtn.addEventListener("click", function () {
    closeResults();
  });

  againBtn.addEventListener("click", function () {
    closeResults({ again: true });
  });

  $(".results__backdrop").addEventListener("click", function () {
    closeResults();
  });

  resultsCard.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeResults();
      return;
    }
    if (event.key !== "Tab") return;
    var focusables = $$("button, a[href], input, [tabindex]:not([tabindex='-1'])", resultsCard).filter(function (el) {
      return !el.disabled && el.offsetParent !== null;
    });
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  /* ---------- Shareable score card ---------- */
  function palette() {
    var styles = window.getComputedStyle(root);
    function value(name, fallback) {
      var result = styles.getPropertyValue(name).trim();
      return result || fallback;
    }
    return {
      bg: value("--bg", "#f3ead9"),
      surface: value("--surface", "#fbf6ec"),
      ink: value("--ink", "#2a1f16"),
      inkSoft: value("--ink-soft", "#6f5c46"),
      inkOnBright: value("--ink-on-bright", "#241a10"),
      clay: value("--clay", "#b5542d"),
      ochre: value("--ochre", "#d99a2b"),
      sage: value("--sage", "#b7c4a2"),
      olive: value("--olive", "#5c683c")
    };
  }

  function colorWithAlpha(color, alpha) {
    if (!color) return "rgba(0,0,0," + alpha + ")";
    if (color.charAt(0) === "#") {
      var hex = color.slice(1);
      if (hex.length === 3) {
        hex = hex.split("").map(function (part) { return part + part; }).join("");
      }
      var number = parseInt(hex, 16);
      if (!isNaN(number)) {
        return "rgba(" + ((number >> 16) & 255) + "," + ((number >> 8) & 255) + "," + (number & 255) + "," + alpha + ")";
      }
    }
    var rgb = color.match(/rgba?\(([^)]+)\)/);
    if (rgb) {
      var parts = rgb[1].split(",").map(Number);
      return "rgba(" + parts[0] + "," + parts[1] + "," + parts[2] + "," + alpha + ")";
    }
    return color;
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    var r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawBlob(ctx, x, y, radius, color, alpha) {
    var gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, colorWithAlpha(color, alpha));
    gradient.addColorStop(0.65, colorWithAlpha(color, alpha * 0.55));
    gradient.addColorStop(1, colorWithAlpha(color, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawLeaf(ctx, x, y, size, color, stemColor) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.35);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, size * 0.9);
    ctx.bezierCurveTo(-size * 0.7, size * 0.3, -size * 0.5, -size * 0.7, size * 0.9, -size * 0.9);
    ctx.bezierCurveTo(size * 0.95, size * 0.1, size * 0.35, size * 0.85, 0, size * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = stemColor;
    ctx.lineWidth = size * 0.055;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(size * 0.02, size * 0.72);
    ctx.quadraticCurveTo(size * 0.22, size * 0.1, size * 0.68, -size * 0.62);
    ctx.stroke();
    ctx.restore();
  }

  function drawTracked(ctx, text, x, y, spacing, align) {
    var characters = String(text).split("");
    var widths = characters.map(function (character) {
      return ctx.measureText(character).width;
    });
    var total = widths.reduce(function (sum, width) { return sum + width; }, 0) + spacing * Math.max(0, characters.length - 1);
    var cursor = x;
    if (align === "center") cursor = x - total / 2;
    if (align === "right") cursor = x - total;
    ctx.textAlign = "left";
    characters.forEach(function (character, index) {
      ctx.fillText(character, cursor, y);
      cursor += widths[index] + spacing;
    });
  }

  function makeCardCanvas(result) {
    var sheet = result || state.currentResult;
    if (!sheet) return null;
    var p = palette();
    var width = 1080;
    var height = 1350;
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext("2d");
    if (!ctx) return null;

    var background = ctx.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, p.bg);
    background.addColorStop(1, p.surface);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    drawBlob(ctx, 890, 190, 500, p.ochre, 0.24);
    drawBlob(ctx, 110, 1170, 450, p.sage, 0.5);
    drawBlob(ctx, 1020, 980, 330, p.clay, 0.17);
    drawBlob(ctx, 260, 360, 300, p.sage, 0.16);

    ctx.save();
    for (var dot = 0; dot < 850; dot += 1) {
      ctx.fillStyle = colorWithAlpha(p.ink, Math.random() * 0.045);
      ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = colorWithAlpha(p.ink, 0.12);
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 13]);
    ctx.beginPath();
    ctx.arc(930, 700, 295, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    drawLeaf(ctx, 96, 74, 48, p.clay, colorWithAlpha(p.surface, 0.55));
    ctx.textBaseline = "middle";
    ctx.fillStyle = p.ink;
    ctx.font = '700 34px "Outfit", sans-serif';
    ctx.textAlign = "left";
    ctx.fillText(C.results.cardBrand, 158, 78);

    ctx.fillStyle = p.inkSoft;
    ctx.font = '700 19px "Space Mono", monospace';
    drawTracked(ctx, C.results.cardKicker, width - 90, 80, 3, "right");

    ctx.save();
    ctx.strokeStyle = colorWithAlpha(p.ink, 0.18);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(90, 140);
    ctx.lineTo(width - 90, 140);
    ctx.stroke();
    ctx.restore();

    if (sheet.isNewBest) {
      ctx.save();
      ctx.translate(width - 262, 214);
      ctx.rotate(-0.055);
      ctx.fillStyle = p.ochre;
      roundedRect(ctx, -170, -33, 340, 66, 14);
      ctx.fill();
      ctx.strokeStyle = colorWithAlpha(p.ink, 0.32);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = p.inkOnBright;
      ctx.font = '700 21px "Space Mono", monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(C.results.cardNewBest, 0, 1);
      ctx.restore();
    }

    var chipLabel = C.results.modeLabel(sheet.duration).toUpperCase();
    ctx.font = '700 24px "Space Mono", monospace';
    var chipWidth = ctx.measureText(chipLabel).width + 70;
    ctx.fillStyle = p.ochre;
    roundedRect(ctx, width / 2 - chipWidth / 2, 300, chipWidth, 56, 28);
    ctx.fill();
    ctx.strokeStyle = colorWithAlpha(p.ink, 0.28);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = p.inkOnBright;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(chipLabel, width / 2, 329);

    var wpmText = String(sheet.wpm);
    var size = 390;
    ctx.font = '900 ' + size + 'px "Fraunces", Georgia, serif';
    while (ctx.measureText(wpmText).width > 810 && size > 220) {
      size -= 10;
      ctx.font = '900 ' + size + 'px "Fraunces", Georgia, serif';
    }
    ctx.fillStyle = p.ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(wpmText, width / 2, 780);

    ctx.fillStyle = p.inkSoft;
    ctx.font = '700 24px "Space Mono", monospace';
    drawTracked(ctx, C.results.wpmLabel.toUpperCase(), width / 2, 846, 6, "center");

    ctx.save();
    ctx.strokeStyle = colorWithAlpha(p.ink, 0.18);
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.moveTo(90, 916);
    ctx.lineTo(width - 90, 916);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = colorWithAlpha(p.ink, 0.14);
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 9]);
    [385, 695].forEach(function (x) {
      ctx.beginPath();
      ctx.moveTo(x, 958);
      ctx.lineTo(x, 1094);
      ctx.stroke();
    });
    ctx.restore();

    var stats = [
      { value: sheet.accuracy + "%", label: C.results.stats.accuracy.toUpperCase() },
      { value: String(sheet.correct), label: C.results.stats.characters.toUpperCase() },
      { value: sheet.seconds + "s", label: C.results.stats.time.toUpperCase() }
    ];
    var columns = [232, 540, 848];
    stats.forEach(function (stat, index) {
      ctx.fillStyle = p.ink;
      ctx.font = '700 58px "Space Mono", monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(stat.value, columns[index], 1042);
      ctx.fillStyle = p.inkSoft;
      ctx.font = '700 18px "Space Mono", monospace';
      drawTracked(ctx, stat.label, columns[index], 1084, 2, "center");
    });

    drawLeaf(ctx, 158, 1194, 30, colorWithAlpha(p.olive, 0.7), colorWithAlpha(p.bg, 0.5));
    ctx.save();
    ctx.translate(922, 1194);
    ctx.scale(-1, 1);
    drawLeaf(ctx, 0, 0, 30, colorWithAlpha(p.olive, 0.7), colorWithAlpha(p.bg, 0.5));
    ctx.restore();

    ctx.fillStyle = p.ink;
    ctx.font = 'italic 500 44px "Fraunces", Georgia, serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(C.results.cardTagline, width / 2, 1200);

    ctx.save();
    ctx.strokeStyle = colorWithAlpha(p.ink, 0.16);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(90, 1272);
    ctx.lineTo(width - 90, 1272);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = p.inkSoft;
    ctx.font = '700 17px "Space Mono", monospace';
    drawTracked(ctx, C.results.cardFooter.toUpperCase(), width / 2, 1318, 3, "center");

    state.cardCanvas = canvas;
    return canvas;
  }

  function dataUrlToBlob(dataUrl) {
    var parts = dataUrl.split(",");
    var mime = parts[0].match(/:(.*?);/)[1];
    var binary = window.atob(parts[1]);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (error) {
      /* fall through to the legacy path */
    }
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    var copied = false;
    try {
      copied = document.execCommand("copy");
    } catch (error) {
      copied = false;
    }
    area.remove();
    return copied;
  }

  async function shareResult() {
    var result = state.currentResult;
    if (!result) return;
    var text = C.results.shareText(result);
    var pageUrl = /^https?:$/.test(window.location.protocol)
      ? window.location.href.split("#")[0]
      : "";
    var fullText = pageUrl ? text + "\n" + pageUrl : text;
    var canvas = makeCardCanvas(result);
    var file = null;

    if (canvas) {
      try {
        file = new File([dataUrlToBlob(canvas.toDataURL("image/png"))], "grove-type-" + result.wpm + "wpm.png", { type: "image/png" });
      } catch (error) {
        file = null;
      }
    }

    try {
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: C.results.shareTitle, text: fullText });
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: C.results.shareTitle, text: fullText });
        return;
      }
      var copied = await copyText(fullText);
      toast(copied ? C.results.copied : C.results.shareFailed);
    } catch (error) {
      if (error && error.name === "AbortError") return;
      var fallback = await copyText(fullText);
      toast(fallback ? C.results.copied : C.results.shareFailed);
    }
  }

  function saveCard() {
    var result = state.currentResult;
    if (!result) return;
    var canvas = makeCardCanvas(result);
    if (!canvas) return;

    function download(url) {
      var link = document.createElement("a");
      link.href = url;
      link.download = "grove-type-" + result.wpm + "wpm.png";
      document.body.appendChild(link);
      link.click();
      link.remove();
    }

    if (canvas.toBlob) {
      canvas.toBlob(function (blob) {
        if (!blob) {
          download(canvas.toDataURL("image/png"));
          return;
        }
        var url = URL.createObjectURL(blob);
        download(url);
        window.setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
      }, "image/png");
    } else {
      download(canvas.toDataURL("image/png"));
    }
    toast(C.results.saved);
  }

  shareResultsBtn.addEventListener("click", shareResult);
  saveCardBtn.addEventListener("click", saveCard);

  /* ---------- Theme ---------- */
  function setTheme(mode, persist) {
    var theme = mode === "dark" ? "dark" : "light";
    root.setAttribute("data-theme", theme);
    themeToggle.setAttribute("aria-checked", String(theme === "dark"));
    themeToggle.setAttribute("aria-label", theme === "dark" ? C.theme.toLight : C.theme.toDark);
    var themeColor = $('meta[name="theme-color"]');
    if (themeColor) {
      themeColor.setAttribute("content", theme === "dark" ? C.meta.themeColorDark : C.meta.themeColorLight);
    }
    if (persist !== false) writeStore(themeKey, theme);
    state.cardCanvas = null;
  }

  themeToggle.addEventListener("click", function () {
    setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });

  var systemScheme = window.matchMedia("(prefers-color-scheme: dark)");
  function handleSystemTheme(event) {
    if (!readStore(themeKey)) setTheme(event.matches ? "dark" : "light", false);
  }
  if (systemScheme.addEventListener) {
    systemScheme.addEventListener("change", handleSystemTheme);
  } else if (systemScheme.addListener) {
    systemScheme.addListener(handleSystemTheme);
  }

  /* ---------- Input wiring ---------- */
  input.setAttribute("aria-label", C.game.inputLabel);

  input.addEventListener("input", onInput);

  input.addEventListener("beforeinput", function (event) {
    if (state.status === "finished") return;
    if (event.inputType === "deleteContentBackward" && input.value.length === 0 && state.index > 0) {
      event.preventDefault();
      goBack();
    }
  });

  input.addEventListener("keydown", function (event) {
    if (state.status === "finished") return;
    if (event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      if (state.status === "idle" || state.status === "paused") return;
      if (input.value.length) commitWord();
    } else if (event.key === "Backspace" && input.value.length === 0 && state.index > 0) {
      event.preventDefault();
      goBack();
    }
  });

  input.addEventListener("focus", function () {
    if (state.status === "paused") {
      resumeRound();
    } else if (state.status === "idle") {
      stage.classList.remove("is-idle");
      setVeil("hidden");
    }
    if (window.matchMedia("(max-width: 720px)").matches) {
      window.setTimeout(function () {
        if (document.activeElement === input && state.status !== "finished") {
          stage.scrollIntoView({ block: "center", behavior: reduceMotion.matches ? "auto" : "smooth" });
        }
      }, 320);
    }
  });

  input.addEventListener("blur", function () {
    if (state.status === "running") {
      pauseRound();
    } else if (state.status === "idle") {
      stage.classList.add("is-idle");
      setVeil("idle");
    }
  });

  startBtn.addEventListener("click", function () {
    input.focus({ preventScroll: true });
  });

  endBtn.addEventListener("click", function () {
    if (state.status === "running" || state.status === "paused") finishRound();
  });

  restartBtn.addEventListener("click", function () {
    resetRound();
    toast(C.game.toastFresh);
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) pauseRound();
  });

  /* ---------- Scroll reveal & header ---------- */
  var observer = null;
  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  }

  function setupReveals() {
    $$(".reveal").forEach(function (el) {
      if (observer) {
        observer.observe(el);
      } else {
        el.classList.add("is-visible");
      }
    });
  }

  function setupHeader() {
    function update() {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  function setupHeroTilt() {
    if (!heroScene || !finePointer.matches) return;
    var hero = $(".hero");
    hero.addEventListener("pointermove", function (event) {
      if (reduceMotion.matches || tiltFrame) return;
      tiltFrame = window.requestAnimationFrame(function () {
        tiltFrame = 0;
        var rect = heroScene.getBoundingClientRect();
        var x = (event.clientX - rect.left) / rect.width - 0.5;
        var y = (event.clientY - rect.top) / rect.height - 0.5;
        heroScene.style.setProperty("--tilt-x", (x * 7).toFixed(2) + "deg");
        heroScene.style.setProperty("--tilt-y", (y * -7).toFixed(2) + "deg");
      });
    });
    hero.addEventListener("pointerleave", function () {
      heroScene.style.setProperty("--tilt-x", "0deg");
      heroScene.style.setProperty("--tilt-y", "0deg");
    });
  }

  function setupLayoutWatch() {
    var resizeTimer = null;
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(measureRows, 160);
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        measureRows();
      });
    }
    if ("ResizeObserver" in window) {
      var lastWidth = 0;
      var lastHeight = 0;
      var resizeObserver = new ResizeObserver(function () {
        var width = wordsEl.clientWidth;
        var height = wordsEl.clientHeight;
        if (width !== lastWidth || height !== lastHeight) {
          lastWidth = width;
          lastHeight = height;
          measureRows();
        }
      });
      resizeObserver.observe(wordsEl);
    }
  }

  /* ---------- Init ---------- */
  hydrateCopy();
  applyMeta();
  renderNav();
  renderHero();
  renderTape();
  renderSteps();
  renderModes();
  renderScoreboard();
  setTheme(root.getAttribute("data-theme") || "light", false);
  resetRound();
  setupReveals();
  setupHeader();
  setupHeroTilt();
  setupLayoutWatch();
})();
