/*
  ============================================================
  GROVE TYPE — CONTENT
  Every piece of visible text lives in this file.
  Edit strings freely; the app reads them on load.
  The word bank at the bottom is the supply for the typing game.
  ============================================================
*/

window.GROVE = {
  meta: {
    title: "Grove Type — A typing sprint with roots",
    description:
      "A bold, playful typing speed game. Pick a 15, 30, or 60 second sprint, beat your personal best, and share a score card.",
    themeColorLight: "#f3ead9",
    themeColorDark: "#17110c"
  },

  brand: {
    name: "Grove",
    nameAccent: "Type",
    homeLabel: "Grove Type, back to the top",
    tagline: "Type fast. Stay grounded."
  },

  skipLink: "Skip to the typing game",

  nav: {
    mainLabel: "Main",
    links: [
      { label: "Play", href: "#game" },
      { label: "How it works", href: "#how" },
      { label: "High scores", href: "#scores" }
    ],
    play: "Play now"
  },

  theme: {
    toLight: "Switch to light mode",
    toDark: "Switch to dark mode"
  },

  hero: {
    eyebrow: "A typing sprint with roots",
    titleA: "Type fast.",
    titleB: "Stay",
    titleAccent: "grounded.",
    lede: "A tiny, timed typing sprint for honest fingers. Pick a clock, chase your best, and grow a little faster every round.",
    primaryCta: "Start a sprint",
    secondaryCta: "See how it works",
    hint: "No account. No noise. Just you and the clock.",
    stats: {
      best: "Personal best",
      rounds: "Rounds grown",
      words: "Words planted",
      unit: "wpm"
    },
    keycaps: ["G", "R", "O", "V", "E"],
    badgeText: "TYPE FAST · STAY GROUNDED · ",
    scrollCue: "Keep scrolling"
  },

  tape: [
    "sprout",
    "clover",
    "meadow",
    "harvest",
    "willow",
    "amber",
    "pebble",
    "orchard",
    "cedar",
    "fern",
    "clay",
    "ember"
  ],

  game: {
    eyebrow: "The sprint",
    title: "Pick a clock. Drop your hands.",
    lede: "The timer starts on your first keystroke. Type the words, press space to plant each one, and let the numbers do the talking.",
    modesLabel: "Round length",
    modes: [
      { seconds: 15, note: "Quick dip" },
      { seconds: 30, note: "The classic" },
      { seconds: 60, note: "Long haul" }
    ],
    modeAria: function (seconds, note) {
      return seconds + " second sprint. " + note + ".";
    },
    idle: {
      title: "Your words are waiting.",
      hint: "Tap here and start typing. The clock starts on your first keystroke.",
      cta: "Start typing"
    },
    pause: {
      title: "Paused. Take a breath.",
      hint: "Your clock is on hold. Tap back in when your fingers are ready.",
      cta: "Back to it"
    },
    hud: {
      seconds: "seconds",
      wpm: "wpm",
      accuracy: "accuracy"
    },
    bestLabel: "Personal best",
    bestEmpty: "None yet",
    endCta: "End round",
    restartCta: "Fresh words",
    footHint: "Space plants a word. Backspace pulls it back.",
    inputLabel: "Type the highlighted words here",
    stageLabel: "Typing area",
    toastMode: function (seconds) {
      return "Clock set to " + seconds + " seconds.";
    },
    toastFresh: "Fresh words loaded. Same clock."
  },

  how: {
    eyebrow: "How it works",
    title: "Three steps. No setup.",
    lede: "Grove Type runs entirely in your browser. No account, no leaderboard noise, no data leaving your device.",
    stepLabel: "Step",
    steps: [
      {
        title: "Pick a clock",
        body: "Fifteen seconds for a jolt, thirty for a daily run, sixty for the long haul. Your best is tracked separately for each clock."
      },
      {
        title: "Type like you mean it",
        body: "Words scroll as you go. Space plants a word, backspace pulls it back. Small mistakes are part of the harvest."
      },
      {
        title: "Share the harvest",
        body: "Finish a round and get a score card built for screenshots, group chats, and friendly rivalries."
      }
    ]
  },

  scores: {
    eyebrow: "High scores",
    title: "The hall of flow.",
    lede: "Every run is saved on this device. No accounts, no clouds — just your own growing record.",
    bestPerMode: "Personal bests",
    bestPerModeSub: "One record per clock. Beat it to move the bar.",
    history: "Recent harvests",
    historySub: "Your last qualified runs, newest first.",
    emptyBestSub: "The bar is yours to set.",
    emptyHistory: "Nothing in the basket yet.",
    emptyHistorySub: "Finish a sprint and your result lands here.",
    clearCta: "Clear scores",
    clearConfirm: "Clear every score saved on this device? This cannot be undone.",
    cleared: "Scores cleared. Fresh soil.",
    accLabel: "accuracy",
    wpmUnit: "wpm",
    modeLabel: function (seconds) {
      return seconds + "s sprint";
    }
  },

  cta: {
    titleA: "Your fingers are warm.",
    titleAccent: "Let's grow something.",
    copy: "One more sprint won't hurt. Your personal best is watching.",
    cta: "Play again"
  },

  results: {
    eyebrow: "Round complete",
    title: "That's a wrap.",
    modeLabel: function (seconds) {
      return seconds + "s sprint";
    },
    wpmLabel: "words per minute",
    stats: {
      accuracy: "Accuracy",
      characters: "Correct characters",
      time: "Time typed"
    },
    newBest: "New personal best",
    bestPrefix: "Personal best",
    firstScore: "First score on this clock. The bar is yours.",
    shortRound: "Short rounds don't set records. Give it at least 5 seconds.",
    shareCta: "Share result",
    saveCta: "Save score card",
    againCta: "Go again",
    closeLabel: "Close results",
    copied: "Result copied to your clipboard.",
    saved: "Score card saved.",
    shareFailed: "Sharing isn't available here. Try saving the card instead.",
    shareTitle: "My Grove Type score",
    shareText: function (stats) {
      return (
        "I typed " +
        stats.wpm +
        " WPM at " +
        stats.accuracy +
        "% accuracy in a " +
        stats.duration +
        "-second sprint on Grove Type. Think you can out-type me?"
      );
    },
    cardBrand: "GROVE TYPE",
    cardKicker: "A TYPING SPRINT WITH ROOTS",
    cardNewBest: "NEW PERSONAL BEST",
    cardTagline: "Type fast. Stay grounded.",
    cardFooter: "Scores stay on your device"
  },

  footer: {
    tagline: "Fast fingers, grounded head.",
    privacy: "Runs entirely in your browser. Your scores never leave this device.",
    copy: "© {year} Grove Type. Grown with clay, code, and patience.",
    backToTop: "Back to top"
  },

  words: [
    "sprout", "clover", "meadow", "harvest", "willow", "amber", "pebble",
    "orchard", "cedar", "fern", "clay", "ember", "river", "moss", "soil",
    "root", "seed", "bloom", "petal", "pollen", "field", "furrow", "ridge",
    "valley", "canyon", "prairie", "thicket", "grove", "forest", "timber",
    "bark", "branch", "leaf", "stem", "vine", "ivy", "hazel", "birch",
    "aspen", "maple", "acorn", "pine", "juniper", "sage", "thyme", "basil",
    "mint", "nettle", "thistle", "reed", "dew", "drizzle", "rain", "storm",
    "breeze", "gust", "sunlight", "shade", "dusk", "dawn", "horizon",
    "kettle", "hearth", "cabin", "porch", "lantern", "quilt", "wool",
    "linen", "pottery", "copper", "iron", "hammer", "trowel", "shovel",
    "basket", "barrel", "cellar", "pantry", "honey", "cider", "barley",
    "oat", "wheat", "rye", "bread", "butter", "crumble", "simmer",
    "spoonful", "wander", "ramble", "stomp", "rustle", "burrow", "mosey",
    "dawdle", "hustle", "skip", "hop", "dash", "sprint", "trundle",
    "amble", "saunter", "climb", "wade", "boulder", "gravel", "sandstone",
    "granite", "limestone", "creek", "brook", "pond", "marsh", "swamp",
    "delta", "dune", "cliff", "summit", "foothill", "hedgerow", "pasture",
    "barn", "fence", "gate", "path", "trail", "lane", "hollow", "glade",
    "brush", "bramble", "berry", "apple", "plum", "pear", "fig", "peach",
    "walnut", "chestnut", "almond", "honeycomb", "beehive", "nest",
    "feather", "finch", "robin", "sparrow", "heron", "otter", "badger",
    "fox", "hare", "deer", "goat", "sheep", "woodsmoke", "campfire",
    "starlight", "moonrise", "sunrise", "weather", "seasons", "autumn",
    "winter", "spring", "summer"
  ]
};
