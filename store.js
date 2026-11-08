/*
 * Real in-app purchases, through RevenueCat (Google Play and the App Store).
 *
 *   ArrowStore.live            true in the phone app once RevenueCat is set up
 *   ArrowStore.price(product)  the store's price for a product, e.g. "$3.99" (else the one in the settings)
 *   ArrowStore.buy(product)    resolves 'ok', 'cancelled' or 'failed'
 *   ArrowStore.restore()       resolves true if "Remove ads" was found and given back
 *
 * Products are the game's names (removeAds, starter, hints10, hints50,
 * hints150, pearls500, pearls3000); store.products in the settings maps them
 * to the product IDs set up in Google Play / App Store Connect and RevenueCat.
 * "Remove ads" and the starter bundle unlock the RevenueCat entitlement
 * store.adsEntitlement ("no_ads"), which is how they come back after a
 * reinstall or on a new phone.
 *
 * On the web, or before the RevenueCat keys are filled in (store.keys in
 * config.js), `live` is false and the shop's stand-in purchases are used.
 */
(function (root) {
  'use strict';
  const cfg = (p) => root.ArrowConfig.get(p);
  const Cap = root.Capacitor;
  const native = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  const platform = native ? Cap.getPlatform() : 'web';
  const RC = native && Cap.Plugins ? Cap.Plugins.Purchases : null;
  const key = () => (cfg('store.keys') || {})[platform] || '';

  const products = {}; // game product -> RevenueCat StoreProduct
  let ready = null;

  const Store = {
    live: false,
    price(product) {
      const p = products[product];
      return p && p.priceString ? p.priceString : (cfg('prices') || {})[product];
    },
    async buy(product) {
      await ready;
      const p = products[product];
      if (!Store.live || !p) return 'failed';
      try {
        const { customerInfo } = await RC.purchaseStoreProduct({ product: p });
        noteAds(customerInfo);
        return 'ok';
      } catch (e) {
        const cancelled = e && (e.userCancelled || e.code === '1' || e.code === 1 || /cancel/i.test(e.message || ''));
        return cancelled ? 'cancelled' : 'failed';
      }
    },
    async restore() {
      await ready;
      if (!Store.live) return false;
      try {
        const { customerInfo } = await RC.restorePurchases();
        return noteAds(customerInfo);
      } catch (e) { return false; }
    },
  };

  // "Remove ads" (or the starter bundle) owned on this store account: make sure the game knows.
  function noteAds(info) {
    const ent = cfg('store.adsEntitlement') || 'no_ads';
    const active = !!(info && info.entitlements && info.entitlements.active && info.entitlements.active[ent]);
    if (active && !root.ArrowWallet.adsRemoved()) root.ArrowWallet.grant('removeAds');
    return active;
  }

  if (RC && key()) {
    ready = (async () => {
      try {
        await RC.configure({ apiKey: key() });
        const ids = cfg('store.products') || {};
        const { products: list } = await RC.getProducts({ productIdentifiers: Object.values(ids), type: 'NON_SUBSCRIPTION' });
        for (const [name, id] of Object.entries(ids)) {
          const p = list.find((x) => x.identifier === id || x.identifier.split(':')[0] === id);
          if (p) products[name] = p;
        }
        Store.live = list.length > 0;
        const { customerInfo } = await RC.getCustomerInfo();
        noteAds(customerInfo);
      } catch (e) { Store.live = false; }
    })();
  } else {
    ready = Promise.resolve();
  }

  root.ArrowStore = Store;
})(window);
