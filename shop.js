/*
 * The shop, and the little offers that lead to it.
 *
 *   ArrowShop.open()                     the shop
 *   ArrowShop.outOfHints({ onSkip })     "out of hints": watch an ad, shop, or
 *                                        (when onSkip is given) skip the level
 *   ArrowShop.offerStarter()             the one-time starter bundle offer
 *
 * Buying is a stand-in for now: it just confirms the purchase and gives the
 * item. In the app it will go through the App Store / Google Play.
 */
(function (root) {
  'use strict';
  const W = root.ArrowWallet;
  const cfg = (p) => root.ArrowConfig.get(p);
  const ad = () => root.ArrowAds.showRewarded();
  const NAMES = {
    removeAds: 'Remove ads',
    hints10: '10 hints',
    hints50: '50 hints',
    hints150: '150 hints',
    starter: 'Starter bundle',
    pearls500: `${(cfg('pearls.packs.pearls500') || 500).toLocaleString()} pearls`,
    pearls3000: `${(cfg('pearls.packs.pearls3000') || 3000).toLocaleString()} pearls`,
  };

  // ---------- A small dialog of our own (on top of everything) ----------
  let box = null;
  let onClose = null;
  function dialog(title, body, buttons, { wide = false } = {}) {
    close(true);
    box = document.createElement('div');
    box.className = 'overlay shop-overlay';
    box.innerHTML = `<div class="dialog shop${wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-label="${title}">` +
      `<h2>${title}</h2><div class="shop-body"></div><div class="dialog-buttons"></div></div>`;
    const bodyEl = box.querySelector('.shop-body');
    if (typeof body === 'string') bodyEl.innerHTML = body; else bodyEl.appendChild(body);
    const row = box.querySelector('.dialog-buttons');
    for (const b of buttons) {
      const el = document.createElement('button');
      el.className = `btn ${b.primary ? 'primary' : 'ghost'}`;
      el.textContent = b.label;
      el.addEventListener('click', b.action);
      row.appendChild(el);
    }
    box.addEventListener('click', (e) => { if (e.target === box) close(); });
    (document.getElementById('app') || document.body).appendChild(box);
    const first = box.querySelector('button');
    if (first) first.focus();
  }
  function close(silent) {
    if (!box) return;
    box.remove();
    box = null;
    const done = onClose;
    onClose = null;
    if (done && !silent) done();
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && box) close(); });
  const isOpen = () => !!box;

  // A brief message that fades by itself.
  function toast(text) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    (document.getElementById('app') || document.body).appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 2200);
  }

  const hintLine = () => {
    const free = W.freeLeft(), owned = W.owned();
    return `<p class="shop-balance"><span class="shop-bulb" aria-hidden="true">💡</span> <strong>${free + owned}</strong> hint${free + owned === 1 ? '' : 's'}` +
      `<span class="shop-small">${free} free today${owned ? ` + ${owned} saved` : ''}</span></p>`;
  };

  // ---------- Buying (a stand-in for the stores) ----------
  // A product's price: the store's own (in the player's currency) in the app, else the one in the settings.
  const price = (product) => (root.ArrowStore ? root.ArrowStore.price(product) : cfg(`prices.${product}`));

  async function buy(product, then) {
    const S = root.ArrowStore;
    if (S && S.live) {
      // A real purchase, through Google Play / the App Store.
      dialog('Just a moment', '<p class="shop-small">Connecting to the store…</p>', []);
      const result = await S.buy(product);
      if (result === 'cancelled') { close(true); if (then) then(); return; }
      if (result !== 'ok') {
        dialog('Purchase didn’t go through', '<p>Nothing was charged. Please try again in a moment.</p>',
          [{ label: 'OK', primary: true, action: () => { close(true); if (then) then(); } }]);
        return;
      }
    }
    W.grant(product);
    dialog('Purchase successful', `<p class="shop-done">✓ ${NAMES[product]} — thank you!</p>` +
      (product === 'removeAds' || product === 'starter' ? '<p class="shop-small">No more ads between levels. You can still watch ads for free hints.</p>' : ''),
    [{ label: 'Great', primary: true, action: () => { close(true); if (then) then(); } }]);
  }

  // ---------- The shop ----------
  function open(then) {
    const el = document.createElement('div');
    const item = (id, title, sub, price, extra = '') =>
      `<button class="shop-item${extra}" data-buy="${id}"><span class="shop-item-text"><strong>${title}</strong><span>${sub}</span></span><span class="shop-price">${price}</span></button>`;
    el.innerHTML = hintLine() +
      '<div class="shop-list">' +
      (W.canTakeDailyBonus() ? `<button class="shop-item free" data-free="bonus"><span class="shop-item-text"><strong>Daily bonus</strong><span>Watch an ad for ${cfg('hints.dailyBonus')} hints (once a day)</span></span><span class="shop-price">Free</span></button>` : '') +
      (W.canWatchForHint() ? `<button class="shop-item free" data-free="hint"><span class="shop-item-text"><strong>Free hint</strong><span>Watch an ad for ${cfg('hints.perRewardedAd')} hint${cfg('hints.perRewardedAd') === 1 ? '' : 's'}</span></span><span class="shop-price">Free</span></button>` : '') +
      (!W.starterBought() && !W.adsRemoved() ? item('starter', 'Starter bundle', `No ads + ${cfg('starter.hints')} hints`, price('starter'), ' featured') : '') +
      (W.adsRemoved() ? '<p class="shop-owned">✓ Ads removed</p>' : item('removeAds', 'Remove ads', 'No ads between levels, ever', price('removeAds'))) +
      item('hints10', '10 hints', 'A handful for tricky spots', price('hints10')) +
      item('hints50', '50 hints', 'Best value for regulars', price('hints50')) +
      item('hints150', '150 hints', 'Never be stuck again', price('hints150')) +
      item('pearls500', NAMES.pearls500, 'For fish and plants in your aquarium', price('pearls500')) +
      item('pearls3000', NAMES.pearls3000, 'Fill your tank with sharks and treasure', price('pearls3000')) +
      '</div><button class="shop-restore">Restore purchases</button>';
    dialog('Shop', el, [{ label: 'Done', primary: true, action: () => close() }], { wide: true });
    onClose = then || null;
    el.querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', () => buy(b.dataset.buy, () => open(then))));
    el.querySelectorAll('[data-free]').forEach((b) => b.addEventListener('click', async () => {
      const keep = onClose;
      onClose = null;
      close(true);
      if (await ad()) {
        if (b.dataset.free === 'bonus') W.takeDailyBonus(); else W.rewardedHint();
        toast(b.dataset.free === 'bonus' ? `+${cfg('hints.dailyBonus')} hints` : `+${cfg('hints.perRewardedAd')} hint`);
      } else {
        toast('Watch to the end to earn the reward');
      }
      open(keep);
    }));
    el.querySelector('.shop-restore').addEventListener('click', async () => {
      const S = root.ArrowStore;
      if (!S || !S.live) { toast('Purchases restored'); return; }
      toast('Checking your purchases…');
      const had = W.adsRemoved();
      const found = await S.restore();
      toast(found ? (had ? 'Ads are already removed' : 'Ads removed again. Welcome back!') : 'No purchases to restore');
      if (found && !had) open(then);
    });
  }

  // ---------- Out of hints ----------
  function outOfHints({ onSkip } = {}) {
    const can = W.canWatchForHint();
    const buttons = [];
    if (can) buttons.push({ label: `Watch an ad for ${cfg('hints.perRewardedAd') === 1 ? 'a hint' : cfg('hints.perRewardedAd') + ' hints'}`, primary: true, action: async () => {
      close(true);
      if (await ad()) { W.rewardedHint(); toast(`+${cfg('hints.perRewardedAd')} hint`); } else toast('Watch to the end to earn the hint');
    } });
    buttons.push({ label: 'Get more hints', primary: !can, action: () => { close(true); open(); } });
    if (onSkip) buttons.push({ label: 'Skip this level (watch an ad)', action: async () => {
      close(true);
      if (await ad()) onSkip(); else toast('Watch to the end to skip');
    } });
    buttons.push({ label: 'Not now', action: () => close() });
    dialog('Out of hints', `<p>You've used today's free hints.${can ? '' : ' You can watch more ads for hints tomorrow.'}</p><p class="shop-small">${cfg('hints.freePerDay')} more free hints tomorrow.</p>`, buttons);
  }

  // ---------- The starter bundle (offered once) ----------
  function offerStarter() {
    return new Promise((resolve) => {
      W.starterShown();
      dialog('Starter bundle', `<p class="shop-offer">No more ads between levels, plus <strong>${cfg('starter.hints')} hints</strong>.</p><p class="shop-small">A one-time offer for enjoying the deep.</p>`, [
        { label: `Get it for ${price('starter')}`, primary: true, action: () => buy('starter', resolve) },
        { label: 'No thanks', action: () => close() },
      ]);
      onClose = resolve;
    });
  }

  const shopBtn = document.getElementById('menuShopBtn');
  if (shopBtn) shopBtn.addEventListener('click', () => open());

  root.ArrowShop = { open, outOfHints, offerStarter, isOpen, toast };
})(window);
