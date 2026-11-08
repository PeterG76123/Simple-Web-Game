/*
 * Ads.
 *
 *   ArrowAds.showInterstitial()  a full-screen ad between levels; resolves when it closes
 *   ArrowAds.showRewarded()      an ad the player chose to watch; resolves true if
 *                                they watched to the end (earned the reward)
 *
 * In the phone app (Capacitor) these are real Google AdMob ads, via the
 * @capacitor-community/admob plugin, with Google's consent form (EU/UK) and
 * Apple's tracking prompt (iPhone) shown first. The ad unit IDs below are
 * Google's official TEST IDs: swap in your own from the AdMob console before
 * release (or set ads.units in remote-config.json).
 *
 * On the web there are no real ads: a stand-in "test ad" shows instead, so the
 * whole flow can be tried in a browser.
 */
(function (root) {
  'use strict';
  const TEST_UNITS = {
    android: { interstitial: 'ca-app-pub-3940256099942544/1033173712', rewarded: 'ca-app-pub-3940256099942544/5224354917' },
    ios: { interstitial: 'ca-app-pub-3940256099942544/4411468910', rewarded: 'ca-app-pub-3940256099942544/1712485313' },
  };
  const Cap = root.Capacitor;
  const native = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  const platform = native ? Cap.getPlatform() : 'web';
  const AdMob = native && Cap.Plugins ? Cap.Plugins.AdMob : null;
  const unit = (kind) => {
    const remote = root.ArrowConfig && root.ArrowConfig.get(`ads.units.${platform}.${kind}`);
    return remote || (TEST_UNITS[platform] || {})[kind];
  };
  const isTest = (kind) => unit(kind) === (TEST_UNITS[platform] || {})[kind];
  // Sound and music pause while an ad plays.
  const quiet = (on) => root.dispatchEvent(new CustomEvent('arrow-ad', { detail: { playing: on } }));

  // ---------- The phone app: AdMob ----------
  let ready = null;
  function setUp() {
    if (ready) return ready;
    ready = (async () => {
      await AdMob.initialize({});
      // Apple's "allow tracking?" prompt (iPhone), then Google's consent form where the law needs one.
      if (platform === 'ios') {
        try {
          const { status } = await AdMob.trackingAuthorizationStatus();
          if (status === 'notDetermined') await AdMob.requestTrackingAuthorization();
        } catch (e) { /* older iOS */ }
      }
      try {
        const info = await AdMob.requestConsentInfo();
        if (info.isConsentFormAvailable && info.status === 'REQUIRED') await AdMob.showConsentForm();
      } catch (e) { /* no form needed */ }
    })().catch(() => {});
    return ready;
  }

  async function nativeInterstitial() {
    await setUp();
    try {
      quiet(true);
      await AdMob.prepareInterstitial({ adId: unit('interstitial'), isTesting: isTest('interstitial') });
      await AdMob.showInterstitial();
    } catch (e) { /* no ad to show: carry on */ } finally { quiet(false); }
  }

  async function nativeRewarded() {
    await setUp();
    let earned = false;
    const handle = await AdMob.addListener('onRewardedVideoAdReward', () => { earned = true; });
    try {
      quiet(true);
      await AdMob.prepareRewardVideoAd({ adId: unit('rewarded'), isTesting: isTest('rewarded') });
      const reward = await AdMob.showRewardVideoAd();
      if (reward && reward.amount !== undefined) earned = true;
    } catch (e) { /* no ad available */ } finally {
      quiet(false);
      if (handle && handle.remove) handle.remove();
    }
    return earned;
  }

  // ---------- The web: a stand-in test ad ----------
  function webAd({ rewarded }) {
    return new Promise((resolve) => {
      const length = rewarded ? 5 : 3;
      const box = document.createElement('div');
      box.className = 'test-ad';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-label', 'Test ad');
      box.innerHTML = `<div class="test-ad-card"><p class="test-ad-tag">Test ad</p>` +
        `<p class="test-ad-title">${rewarded ? 'Watch to earn your reward' : 'An ad would show here'}</p>` +
        `<p class="test-ad-sub">Real ads appear in the phone app.</p>` +
        `<p class="test-ad-count"></p><button class="btn ghost test-ad-close" disabled>Close</button></div>`;
      (document.getElementById('app') || document.body).appendChild(box);
      const count = box.querySelector('.test-ad-count');
      const close = box.querySelector('.test-ad-close');
      let left = length;
      let done = false;
      let timer = null;
      quiet(true);
      // A full-screen ad can be closed once its countdown ends; a rewarded one
      // can be closed any time, but only pays out if watched to the end.
      const tick = () => {
        if (left > 0) {
          count.textContent = rewarded ? `Reward in ${left}…` : `You can close this in ${left}…`;
          close.disabled = !rewarded;
          left--;
          timer = setTimeout(tick, 1000);
        } else {
          done = true;
          count.textContent = rewarded ? 'Reward earned!' : '';
          close.disabled = false;
          close.focus();
        }
      };
      tick();
      close.addEventListener('click', () => {
        clearTimeout(timer);
        box.remove();
        quiet(false);
        resolve(rewarded ? done : true);
      });
    });
  }

  root.ArrowAds = {
    native,
    showInterstitial: () => (AdMob ? nativeInterstitial() : webAd({ rewarded: false })),
    showRewarded: () => (AdMob ? nativeRewarded() : webAd({ rewarded: true })),
    // Start the consent / tracking prompts early in the app.
    init: () => { if (AdMob) setUp(); },
  };
})(window);
