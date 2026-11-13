/*
 * Ads.
 *
 *   ArrowAds.showInterstitial()  a full-screen ad between levels; resolves when it closes
 *   ArrowAds.showRewarded()      an ad the player chose to watch; resolves true if
 *                                they watched to the end (earned the reward)
 *
 * In the phone app (Capacitor) these are real Google AdMob ads, via the
 * @capacitor-community/admob plugin, with Google's consent form (EU/UK) and
 * Apple's tracking prompt (iPhone) shown first. The ad units are RedCurtain's
 * own (AdMob, app "Eel Escape"); with ads.testAds on in config.js (test builds)
 * or on a platform without units yet (iPhone, for now) Google's test units are
 * used instead. ads.units in remote-config.json can override them.
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
  // RedCurtain's own ad units (AdMob app ID ca-app-pub-4979427657253323~4371111887,
  // set in android/app/src/main/AndroidManifest.xml).
  const UNITS = {
    android: { interstitial: 'ca-app-pub-4979427657253323/9555155807', rewarded: 'ca-app-pub-4979427657253323/7499692316' },
  };
  const Cap = root.Capacitor;
  const native = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  const platform = native ? Cap.getPlatform() : 'web';
  const AdMob = native && Cap.Plugins ? Cap.Plugins.AdMob : null;
  const unit = (kind) => {
    const test = (TEST_UNITS[platform] || {})[kind];
    if (root.ArrowConfig && root.ArrowConfig.get('ads.testAds')) return test;
    const remote = root.ArrowConfig && root.ArrowConfig.get(`ads.units.${platform}.${kind}`);
    return remote || (UNITS[platform] || {})[kind] || test;
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

  // The next full-screen ad is loaded ahead of time (Google can take a few
  // seconds), so it opens straight away when a level ends. A loaded ad is
  // good for about an hour; older ones are loaded again.
  let loaded = null; // { promise, at }
  function preloadInterstitial() {
    if (loaded && Date.now() - loaded.at < 50 * 60 * 1000) return loaded.promise;
    const promise = setUp()
      .then(() => AdMob.prepareInterstitial({ adId: unit('interstitial'), isTesting: isTest('interstitial') }))
      .then(() => true, () => false);
    loaded = { promise, at: Date.now() };
    promise.then((ok) => { if (!ok && loaded && loaded.promise === promise) loaded = null; });
    return promise;
  }

  /** "Ad coming up…" over the board while an ad that isn't loaded yet loads. */
  function coming() {
    const box = document.createElement('div');
    box.className = 'ad-coming';
    box.innerHTML = '<div class="ad-coming-card"><span class="ad-coming-spin"></span><p>Ad coming up…</p></div>';
    (document.getElementById('app') || document.body).appendChild(box);
    return () => box.remove();
  }

  async function nativeInterstitial() {
    const ready = loaded && Date.now() - loaded.at < 50 * 60 * 1000;
    const done = ready ? () => {} : coming();
    try {
      quiet(true);
      // Up to 6 seconds for it to load; after that, no ad this time.
      const ok = await Promise.race([preloadInterstitial(), new Promise((r) => setTimeout(() => r(false), 6000))]);
      done();
      if (ok) {
        loaded = null;
        await AdMob.showInterstitial();
      }
    } catch (e) { /* no ad to show: carry on */ } finally {
      done();
      quiet(false);
      // Get the next one ready.
      setTimeout(() => { preloadInterstitial(); }, 2000);
    }
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
  // (ads.webTestAds in the settings: false skips them on the web.)
  const webTestAds = () => !root.ArrowConfig || root.ArrowConfig.get('ads.webTestAds') !== false;
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

  // The "Privacy choices" button in Settings shows only in the app.
  const choices = document.getElementById('privacyChoices');
  if (choices && native) {
    choices.hidden = false;
    choices.addEventListener('click', () => root.ArrowAds.privacyOptions());
  }

  if (native) setTimeout(() => root.ArrowAds && root.ArrowAds.init(), 800);

  root.ArrowAds = {
    native,
    showInterstitial: () => (AdMob ? nativeInterstitial() : webTestAds() ? webAd({ rewarded: false }) : Promise.resolve()),
    showRewarded: () => (AdMob ? nativeRewarded() : webTestAds() ? webAd({ rewarded: true }) : Promise.resolve(true)),
    // Start the consent / tracking prompts early in the app.
    init: () => { if (AdMob) { setUp(); setTimeout(preloadInterstitial, 3000); } },
    // Lets players change their ad consent later (EU/UK), from Settings.
    // (Google's privacy options form.)
    privacyOptions: async () => {
      if (!AdMob) return;
      await setUp();
      try {
        await AdMob.showPrivacyOptionsForm();
      } catch (e) {
        // Older plugin versions: clear the saved choice and ask again.
        try {
          await AdMob.resetConsentInfo();
          const info = await AdMob.requestConsentInfo();
          if (info.isConsentFormAvailable) await AdMob.showConsentForm();
        } catch (e2) { /* no form where the law doesn't need one */ }
      }
    },
  };
})(window);
