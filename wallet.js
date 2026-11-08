/*
 * The player's wallet, saved on this device: hints (free each day, earned
 * from ads, or bought), purchases (ads removed, starter bundle) and the
 * bookkeeping that decides when a full-screen ad may show.
 *
 *   ArrowWallet.hintsLeft()        free hints left today + hints owned
 *   ArrowWallet.useHint()          spends one (free ones first); false if none
 *   ArrowWallet.addHints(n)        hints bought or earned
 *   ArrowWallet.levelFinished()    after each level; true if an ad is due now
 *
 * Pearls are the in-game currency for the aquarium (aquarium.js): earned
 * by finishing levels and a daily gift, spent on fish, plants and
 * decorations, kept here too, in the tanks the player owns (`tanks`).
 */
(function (root) {
  'use strict';
  const KEY = 'arrow-escape-wallet-v1';
  const cfg = (p) => root.ArrowConfig.get(p);
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };

  const BLANK = {
    day: '', freeUsed: 0, rewardedToday: 0, dailyBonusTaken: false,
    owned: 0, coins: 0, pearls: 0, dailyPearlsTaken: false, feedPearlsTaken: false,
    // The aquarium tanks the player owns: { goldfish: { items, next }, ... }, and the one on show.
    tanks: null, shownTank: '',
    tank: null, // (the single tank of earlier versions; becomes the goldfish tank)
    adsRemoved: false, starterBought: false, starterOffered: false,
    levelsFinished: 0, levelsSinceAd: 0, lastAdAt: 0,
    purchases: [],
    // Levels whose best-solve pearl bonus has been paid ("tier-group-index").
    bestPaid: [],
  };
  let w = { ...BLANK };
  try { w = { ...BLANK, ...JSON.parse(root.localStorage.getItem(KEY)) }; } catch (e) { /* new player */ }
  if (!w.tanks) w.tanks = {};
  if (!w.bestPaid) w.bestPaid = [];
  if (!w.purchases) w.purchases = [];
  // Earlier versions had one tank: it becomes the goldfish tank.
  if (w.tank && !w.tanks.goldfish) { w.tanks.goldfish = w.tank; w.tank = null; }

  const listeners = [];
  const save = () => {
    try { root.localStorage.setItem(KEY, JSON.stringify(w)); } catch (e) { /* ignore */ }
    listeners.forEach((fn) => fn());
  };
  // A new day: today's free hints and ad allowances start afresh.
  const roll = () => {
    if (w.day === today()) return;
    w.day = today();
    w.freeUsed = 0;
    w.rewardedToday = 0;
    w.dailyBonusTaken = false;
    w.dailyPearlsTaken = false;
    w.feedPearlsTaken = false;
    save();
  };

  const Wallet = {
    onChange: (fn) => listeners.push(fn),
    freeLeft() { roll(); return Math.max(0, cfg('hints.freePerDay') - w.freeUsed); },
    owned: () => w.owned,
    hintsLeft() { return Wallet.freeLeft() + w.owned; },
    useHint() {
      roll();
      if (Wallet.freeLeft() > 0) w.freeUsed++;
      else if (w.owned > 0) w.owned--;
      else return false;
      save();
      return true;
    },
    addHints(n) { w.owned += n; save(); },

    // Watching an ad for a hint, a few times a day.
    canWatchForHint() { roll(); return w.rewardedToday < cfg('hints.maxRewardedPerDay'); },
    rewardedHint() { roll(); w.rewardedToday++; w.owned += cfg('hints.perRewardedAd'); save(); },
    // Once a day: an ad for a handful of extra hints.
    canTakeDailyBonus() { roll(); return !w.dailyBonusTaken; },
    takeDailyBonus() { roll(); w.dailyBonusTaken = true; w.owned += cfg('hints.dailyBonus'); save(); },

    // Purchases.
    adsRemoved: () => w.adsRemoved,
    starterBought: () => w.starterBought,
    grant(product) {
      if (product === 'removeAds') w.adsRemoved = true;
      if (product === 'hints10') w.owned += 10;
      if (product === 'hints50') w.owned += 50;
      if (product === 'hints150') w.owned += 150;
      if (product === 'starter') { w.adsRemoved = true; w.starterBought = true; w.owned += cfg('starter.hints'); }
      if (product === 'pearls500') w.pearls += cfg('pearls.packs.pearls500') || 500;
      if (product === 'pearls3000') w.pearls += cfg('pearls.packs.pearls3000') || 3000;
      w.purchases.push({ product, at: Date.now() });
      save();
    },

    // The starter bundle is offered once, after a few levels.
    starterDue() {
      return !w.starterOffered && !w.starterBought && !w.adsRemoved && w.levelsFinished >= cfg('starter.afterLevels');
    },
    starterShown() { w.starterOffered = true; save(); },

    /** Call when a level is finished. Returns true if a full-screen ad is due. */
    levelFinished() {
      w.levelsFinished++;
      w.levelsSinceAd++;
      save();
      if (w.adsRemoved || w.levelsFinished <= cfg('ads.graceLevels')) return false;
      if (w.levelsSinceAd < cfg('ads.minLevelsBetween')) return false;
      return Date.now() - w.lastAdAt >= cfg('ads.minSecondsBetween') * 1000;
    },
    adShown() { w.levelsSinceAd = 0; w.lastAdAt = Date.now(); save(); },

    // Pearls (the aquarium's currency).
    pearls: () => w.pearls,
    addPearls(n) { w.pearls += n; save(); },
    spendPearls(n) {
      if (w.pearls < n) return false;
      w.pearls -= n;
      save();
      return true;
    },
    /** True the first time a level is solved in the fewest moves (and remembers it). */
    firstBestSolve(key) {
      if (w.bestPaid.includes(key)) return false;
      w.bestPaid.push(key);
      save();
      return true;
    },
    /** Pearls for feeding the fish, once a day (returns how many, or 0). */
    takeFeedPearls() {
      roll();
      if (w.feedPearlsTaken) return 0;
      w.feedPearlsTaken = true;
      const n = cfg('pearls.feedDaily') || 0;
      w.pearls += n;
      save();
      return n;
    },
    /** Today's gift of pearls, once a day (returns how many, or 0). */
    takeDailyPearls() {
      roll();
      if (w.dailyPearlsTaken) return 0;
      w.dailyPearlsTaken = true;
      const n = cfg('pearls.daily');
      w.pearls += n;
      save();
      return n;
    },
    // ---------- Aquarium tanks ----------
    ownsTank: (id) => !!w.tanks[id],
    ownedTanks: () => Object.keys(w.tanks),
    /** Buys a tank (with a free starter fish); false if not enough pearls or already owned. */
    buyTank(id, price, starter) {
      if (w.tanks[id] || w.pearls < price) return false;
      w.pearls -= price;
      w.tanks[id] = { items: starter ? [{ uid: 1, type: starter, x: 0.5, color: 0 }] : [], next: 2 };
      w.shownTank = id;
      w.purchases.push({ product: `tank:${id}`, at: Date.now(), pearls: price });
      save();
      return true;
    },
    shownTank: () => w.shownTank,
    showTank(id) { if (w.shownTank !== id) { w.shownTank = id; save(); } },
    // What's in a tank: { items: [{ uid, type, x, y?, color }] } (x, y: 0-1 across / down
    // the tank; y only for things stuck anywhere), or null if not owned.
    tank: (id) => w.tanks[id] || null,
    addToTank(id, type, x, color) {
      const t = w.tanks[id];
      if (!t) return null;
      const item = { uid: t.next++, type, x, color };
      t.items.push(item);
      save();
      return item;
    },
    // (d: how far forward on the ground, 0-1, for things standing on it.)
    moveInTank(id, uid, x, y, d) {
      const item = w.tanks[id] && w.tanks[id].items.find((i) => i.uid === uid);
      if (item) { item.x = x; if (y !== undefined) item.y = y; if (d !== undefined) item.d = d; save(); }
    },
    removeFromTank(id, uid) {
      const t = w.tanks[id];
      if (!t) return;
      t.items = t.items.filter((i) => i.uid !== uid);
      save();
    },
  };
  root.ArrowWallet = Wallet;
})(window);
