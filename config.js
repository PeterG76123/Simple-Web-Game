/*
 * Settings that shape how the game earns money, all in one place so they can
 * be tuned without an app update.
 *
 *   ArrowConfig.get('hints.freePerDay')    a value (dotted path)
 *
 * The defaults are below. On start the game also fetches remote-config.json
 * (from the web site, so changing that file on GitHub changes every player's
 * settings within a launch or two) and remembers the last copy it got, so it
 * still works offline. Anything not in that file keeps its default.
 */
(function (root) {
  'use strict';
  const DEFAULTS = {
    // Every level open (for testing). Set to false for release.
    unlockAll: true,
    ads: {
      // No full-screen ads until the player has finished this many levels.
      graceLevels: 10,
      // Then at most one after every N levels finished...
      minLevelsBetween: 2,
      // ...and never more often than this.
      minSecondsBetween: 180,
      // On the web (no real ads): show the stand-in test ads (for trying the
      // flow), or skip them (full-screen ads skipped, rewards just given).
      webTestAds: true,
    },
    hints: {
      // Free hints each day (unused ones don't carry over).
      freePerDay: 3,
      // Hints for watching an ad, and how many such ads a day.
      perRewardedAd: 1,
      maxRewardedPerDay: 10,
      // Once a day: watch an ad for this many extra hints.
      dailyBonus: 3,
    },
    // Watch an ad to skip a level (difficulty numbers: 0 Easy, 1 Medium, 2 Hard).
    skip: { enabled: true, tiers: [2] },
    // The starter bundle, offered once after this many levels are finished.
    starter: { afterLevels: 10, hints: 25 },
    // Pearls, for the aquarium. Per level finished, by difficulty (Easy,
    // Medium, Hard), plus bonuses for a first clear and a best-possible solve.
    pearls: {
      perLevel: [10, 20, 30],
      firstClear: [10, 15, 20],
      bestSolve: [5, 10, 15],
      // A gift each day the game is opened.
      daily: 25,
      // Watch an ad on the win screen to double that level's pearls.
      doubleByAd: true,
      // Pearl packs in the shop.
      packs: { pearls500: 500, pearls3000: 3000 },
    },
    // Aquarium item prices in pearls (any not listed use aquarium.js's own).
    aquariumPrices: {},
    // Prices as shown (the stores set the real ones).
    prices: { removeAds: '$3.99', hints10: '$0.99', hints50: '$2.99', hints150: '$5.99', starter: '$4.99', pearls500: '$0.99', pearls3000: '$4.99' },
  };

  const CACHE_KEY = 'arrow-escape-remote-config-v1';
  // The live copy on the web site; the app (which has no web address of its
  // own) fetches it from here too.
  const REMOTE_URL = 'https://peterg76123.github.io/Simple-Web-Game/remote-config.json';

  const merge = (base, extra) => {
    if (!extra || typeof extra !== 'object') return base;
    const out = Array.isArray(base) ? base.slice() : { ...base };
    for (const [k, v] of Object.entries(extra)) {
      out[k] = v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' ? merge(base[k], v) : v;
    }
    return out;
  };

  let values = DEFAULTS;
  try { values = merge(DEFAULTS, JSON.parse(root.localStorage.getItem(CACHE_KEY))); } catch (e) { /* none saved */ }

  const listeners = [];
  const Config = {
    get(pathText) {
      return pathText.split('.').reduce((v, k) => (v == null ? v : v[k]), values);
    },
    all: () => values,
    onChange: (fn) => listeners.push(fn),
  };
  root.ArrowConfig = Config;

  // Fetch the latest settings (quietly: offline or missing just keeps what we have).
  const isApp = !!(root.Capacitor && root.Capacitor.isNativePlatform && root.Capacitor.isNativePlatform());
  const url = isApp || location.protocol === 'file:' ? REMOTE_URL : 'remote-config.json';
  if (root.fetch && location.protocol !== 'file:') {
    fetch(url + '?t=' + Date.now(), { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((remote) => {
        if (!remote) return;
        values = merge(DEFAULTS, remote);
        try { root.localStorage.setItem(CACHE_KEY, JSON.stringify(remote)); } catch (e) { /* ignore */ }
        listeners.forEach((fn) => fn(values));
      })
      .catch(() => {});
  }
})(window);
