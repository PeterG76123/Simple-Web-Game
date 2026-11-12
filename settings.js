/*
 * Player settings (sound, music, sea creatures), saved on this device, and
 * the settings screen that changes them. Other scripts read them with
 * ArrowSettings.get(name) and hear about changes with ArrowSettings.onChange.
 */
(function (root) {
  'use strict';
  const KEY = 'arrowEscape.settings';
  const reducedMotion = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DEFAULTS = {
    music: true,
    musicVol: 60,
    sfx: true,
    sfxVol: 80,
    // Swimming creatures start off for players whose device asks for less motion.
    creatures: !reducedMotion,
    // TEMPORARY (testing only, remove before release): every level open.
    unlockAll: false,
  };
  let values = { ...DEFAULTS };
  try {
    const saved = JSON.parse(root.localStorage.getItem(KEY));
    if (saved && typeof saved === 'object') {
      for (const k of Object.keys(DEFAULTS)) if (typeof saved[k] === typeof DEFAULTS[k]) values[k] = saved[k];
    }
  } catch (e) { /* no saved settings, or storage is blocked */ }

  const listeners = [];
  const Settings = {
    get: (name) => values[name],
    set(name, value) {
      if (values[name] === value) return;
      values[name] = value;
      try { root.localStorage.setItem(KEY, JSON.stringify(values)); } catch (e) { /* ignore */ }
      listeners.forEach((fn) => fn(name, value));
    },
    onChange: (fn) => listeners.push(fn),
  };
  root.ArrowSettings = Settings;

  // ---------- The settings screen ----------
  function wire() {
    const $ = (id) => document.getElementById(id);
    const overlay = $('settingsOverlay');
    if (!overlay) return;
    const toggles = { setMusic: 'music', setSfx: 'sfx', setCreatures: 'creatures', setUnlockAll: 'unlockAll' };
    const sliders = { setMusicVol: 'musicVol', setSfxVol: 'sfxVol' };
    let opener = null;

    function refresh() {
      for (const [id, name] of Object.entries(toggles)) $(id).checked = values[name];
      for (const [id, name] of Object.entries(sliders)) {
        $(id).value = values[name];
        $(id).disabled = !values[name === 'musicVol' ? 'music' : 'sfx'];
        $(id).style.setProperty('--fill', `${values[name]}%`);
      }
    }
    for (const [id, name] of Object.entries(toggles)) {
      $(id).addEventListener('change', (e) => { Settings.set(name, e.target.checked); refresh(); });
    }
    for (const [id, name] of Object.entries(sliders)) {
      $(id).addEventListener('input', (e) => { Settings.set(name, Number(e.target.value)); refresh(); });
      // Let the player hear the new effects volume when they let go.
      if (name === 'sfxVol') $(id).addEventListener('change', () => root.ArrowAudio && root.ArrowAudio.play('pick'));
    }

    function open(evt) {
      opener = evt && evt.currentTarget;
      refresh();
      overlay.hidden = false;
      $('settingsDone').focus();
    }
    function close() {
      overlay.hidden = true;
      if (opener) opener.focus();
    }
    document.querySelectorAll('[data-open-settings]').forEach((b) => b.addEventListener('click', open));
    $('settingsDone').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !overlay.hidden) close(); });
    Settings.isOpen = () => !overlay.hidden;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})(window);
