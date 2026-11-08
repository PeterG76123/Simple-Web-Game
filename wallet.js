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
 * A `coins` balance is kept too (not used yet), ready for spending in the
 * game later.
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
    owned: 0, coins: 0,
    adsRemoved: false, starterBought: false, starterOffered: false,
    levelsFinished: 0, levelsSinceAd: 0, lastAdAt: 0,
    purchases: [],
  };
  let w = { ...BLANK };
  try { w = { ...BLANK, ...JSON.parse(root.localStorage.getItem(KEY)) }; } catch (e) { /* new player */ }

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

    coins: () => w.coins,
    addCoins(n) { w.coins += n; save(); },
  };
  root.ArrowWallet = Wallet;
})(window);
