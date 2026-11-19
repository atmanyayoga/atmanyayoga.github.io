// Site-wide translation (English / Hindi / French)
(function () {
  const LANGS = ['en', 'hi', 'fr'];
  const LANG_NAMES = { hi: 'हिन्दी', fr: 'Français' };
  const VOICE_LANG = { en: 'en-US', hi: 'hi-IN', fr: 'fr-FR' };
  const SEP = '|||';
  const MAX_CHARS = 450;
  const CONCURRENCY = 3;
  const API = 'https://api.mymemory.translated.net/get?langpair=en|';
  const CACHE_PREFIX = 'atmanya-i18n3-';
  const LANG_KEY = 'atmanya-lang';
  const OVERLAY_ID = 'atmanya-translate-overlay';
  const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  const SKIP = 'script, style, noscript, .lang-select, .goog-te-gadget, #' + OVERLAY_ID;

  let currentLang = 'en';
  let nodes = [];
  let nodeSet = new Set();
  let attrEntries = [];
  let attrSet = new Set();
  let busy = false;
  let overlayTimer = null;
  const inflight = new Map();

  function storageGet(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (_) { return {}; }
  }
  function storageSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }
  function staticDict(lang) {
    return (window.ATMANYA_I18N && window.ATMANYA_I18N[lang]) || {};
  }
  function getDict(lang) {
    return Object.assign({}, staticDict(lang), storageGet(CACHE_PREFIX + lang));
  }
  function saveDict(lang, dict) {
    const base = staticDict(lang);
    const overrides = {};
    Object.keys(dict).forEach(function (key) {
      if (base[key] !== dict[key]) overrides[key] = dict[key];
    });
    storageSet(CACHE_PREFIX + lang, overrides);
  }
  function clean(text) { return (text || '').trim(); }
  function skipText(text) {
    return !text || /^\[(INSERT|UPLOAD)/.test(text);
  }

  function rememberNode(node) {
    if (!node || nodeSet.has(node)) return false;
    nodeSet.add(node);
    if (node.__atmanyaOriginal === undefined) {
      const parent = node.parentElement;
      const marked = parent && parent.getAttribute && parent.getAttribute('data-i18n-original');
      node.__atmanyaOriginal = (marked && clean(parent.textContent) === clean(node.nodeValue))
        ? marked
        : node.nodeValue;
    }
    nodes.push(node);
    return true;
  }

  function rememberAttrs(el) {
    if (!el || attrSet.has(el)) return false;
    attrSet.add(el);
    const originals = {};
    ATTRS.forEach(function (attr) {
      const value = el.getAttribute(attr);
      if (value && clean(value) && !skipText(clean(value))) originals[attr] = value;
    });
    if (!Object.keys(originals).length) return false;
    el.__atmanyaAttrs = originals;
    attrEntries.push(el);
    return true;
  }

  function collect(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        const parent = node.parentElement;
        if (!parent || parent.closest(SKIP)) return NodeFilter.FILTER_REJECT;
        const value = clean(node.nodeValue);
        if (!value || skipText(value) || !/[A-Za-z]/.test(value)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    while (walker.nextNode()) rememberNode(walker.currentNode);

    const elements = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (let i = 0; i < elements.length; i++) {
      if (elements[i].closest && elements[i].closest(SKIP)) continue;
      rememberAttrs(elements[i]);
    }
  }

  function allTexts() {
    const list = [];
    nodes.forEach(function (node) {
      const value = clean(node.__atmanyaOriginal);
      if (value && !skipText(value) && list.indexOf(value) === -1) list.push(value);
    });
    attrEntries.forEach(function (el) {
      const originals = el.__atmanyaAttrs || {};
      ATTRS.forEach(function (attr) {
        const value = clean(originals[attr]);
        if (value && !skipText(value) && list.indexOf(value) === -1) list.push(value);
      });
    });
    return list;
  }

  async function translateBatch(texts, lang) {
    const url = API + lang + '&q=' + encodeURIComponent(texts.join(SEP));
    const response = await fetch(url);
    if (!response.ok) throw new Error('translation request failed');
    const json = await response.json();
    const line = (json.responseData && json.responseData.translatedText) || '';
    if (/MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(line)) throw new Error('translation quota reached');
    const parts = line.split(SEP);
    return parts.length === texts.length ? parts : null;
  }

  async function fetchOne(text, lang) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await translateBatch([text], lang);
        if (result && result[0]) return result[0];
      } catch (_) {}
      if (attempt < 2) await new Promise(function (resolve) { setTimeout(resolve, 400 * (attempt + 1)); });
    }
    return null;
  }

  async function translateText(text, lang) {
    const value = clean(text);
    if (!value || skipText(value)) return text;
    lang = LANGS.indexOf(lang) !== -1 ? lang : currentLang;
    if (lang === 'en') return text;

    const dict = getDict(lang);
    if (dict[value]) return text.replace(value, dict[value]);

    const key = lang + '\u0000' + value;
    if (inflight.has(key)) return inflight.get(key);

    const task = (async function () {
      const translated = await fetchOne(value, lang);
      if (translated) {
        const fresh = getDict(lang);
        fresh[value] = translated;
        saveDict(lang, fresh);
        return text.replace(value, translated);
      }
      return text;
    })();

    inflight.set(key, task);
    try { return await task; } finally { inflight.delete(key); }
  }

  async function ensureDictionary(lang, texts, onProgress) {
    const dict = getDict(lang);
    const missing = [];
    texts.forEach(function (text) {
      if (text && !dict[text] && missing.indexOf(text) === -1) missing.push(text);
    });
    if (!missing.length) return dict;

    const chunks = [];
    let chunk = [];
    let chars = 0;
    missing.forEach(function (text) {
      const cost = text.length + SEP.length;
      if (chunk.length && chars + cost > MAX_CHARS) {
        chunks.push(chunk);
        chunk = [];
        chars = 0;
      }
      chunk.push(text);
      chars += cost;
    });
    if (chunk.length) chunks.push(chunk);

    let cursor = 0;
    let completed = 0;
    async function worker() {
      while (cursor < chunks.length) {
        const chunk = chunks[cursor++];
        try {
          const translated = await translateBatch(chunk, lang);
          if (translated && translated.length === chunk.length) {
            chunk.forEach(function (text, index) { dict[text] = translated[index]; });
          } else {
            for (const text of chunk) {
              const single = await fetchOne(text, lang);
              if (single) dict[text] = single;
            }
          }
        } catch (_) {
          for (const text of chunk) {
            const single = await fetchOne(text, lang);
            if (single) dict[text] = single;
          }
        }
        saveDict(lang, dict);
        completed += chunk.length;
        if (onProgress) onProgress(completed, missing.length);
        applyAll(dict); // progressively replace text as batches finish
        await new Promise(function (resolve) { setTimeout(resolve, 120); });
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, chunks.length) }, worker));
    return dict;
  }

  function applyAll(dict) {
    nodes.forEach(function (node) {
      const original = node.__atmanyaOriginal;
      if (original === undefined) return;
      const trimmed = clean(original);
      const replacement = dict[trimmed];
      node.nodeValue = replacement ? original.replace(trimmed, replacement) : original;
    });
    attrEntries.forEach(function (el) {
      const originals = el.__atmanyaAttrs || {};
      ATTRS.forEach(function (attr) {
        const original = originals[attr];
        if (original === undefined) return;
        const replacement = dict[clean(original)];
        el.setAttribute(attr, replacement ? original.replace(clean(original), replacement) : original);
      });
    });
    document.documentElement.lang = currentLang;
  }

  function restoreAll() {
    nodes.forEach(function (node) {
      if (node.__atmanyaOriginal !== undefined) node.nodeValue = node.__atmanyaOriginal;
    });
    attrEntries.forEach(function (el) {
      const originals = el.__atmanyaAttrs || {};
      ATTRS.forEach(function (attr) {
        if (originals[attr] !== undefined) el.setAttribute(attr, originals[attr]);
      });
    });
    document.documentElement.lang = 'en';
  }

  function injectOverlayStyles() {
    if (document.getElementById('atmanya-translate-styles')) return;
    const style = document.createElement('style');
    style.id = 'atmanya-translate-styles';
    style.textContent = [
      '#' + OVERLAY_ID + '{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(18,18,16,.62);backdrop-filter:blur(5px);padding:20px;}',
      '.' + OVERLAY_ID + '__card{max-width:380px;width:100%;background:var(--surface,#fffaf5);color:var(--text,#2b1f1a);border:1px solid var(--border,#d9cbb6);border-radius:20px;padding:30px 28px;text-align:center;box-shadow:0 22px 60px rgba(0,0,0,.35);font-family:var(--sans,Arial,sans-serif);}',
      '.' + OVERLAY_ID + '__spinner{width:42px;height:42px;margin:0 auto 16px;border-radius:50%;border:3px solid rgba(161,32,32,.18);border-top-color:#a12020;animation:' + OVERLAY_ID + '-spin .8s linear infinite;}',
      '@keyframes ' + OVERLAY_ID + '-spin{to{transform:rotate(360deg);}}',
      '.' + OVERLAY_ID + '__title{font-family:var(--serif,Georgia,serif);font-size:1.5rem;color:var(--heading,#5a1714);margin:0 0 8px;}',
      '.' + OVERLAY_ID + '__text{font-size:.92rem;line-height:1.5;color:var(--text-muted,#6b5f52);margin:0 0 16px;}',
      '.' + OVERLAY_ID + '__track{height:8px;border-radius:999px;background:var(--bg-alt,#efe3d6);overflow:hidden;border:1px solid var(--border,#d9cbb6);}',
      '.' + OVERLAY_ID + '__bar{display:block;height:100%;width:0%;border-radius:999px;background:linear-gradient(90deg,#a12020,#c8a35a);transition:width .2s ease;}',
      '.' + OVERLAY_ID + '__meta{display:flex;justify-content:space-between;gap:12px;font-size:.8rem;color:var(--text-muted,#6b5f52);margin-top:10px;}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function showOverlay(lang, total) {
    injectOverlayStyles();
    let overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = OVERLAY_ID;
      overlay.setAttribute('role', 'status');
      overlay.setAttribute('aria-live', 'polite');
      overlay.innerHTML = '<div class="' + OVERLAY_ID + '__card">' +
        '<div class="' + OVERLAY_ID + '__spinner"></div>' +
        '<p class="' + OVERLAY_ID + '__title">Translating to ' + (LANG_NAMES[lang] || lang) + '…</p>' +
        '<p class="' + OVERLAY_ID + '__text">Please wait — the full page will change together.</p>' +
        '<div class="' + OVERLAY_ID + '__track"><span class="' + OVERLAY_ID + '__bar"></span></div>' +
        '<div class="' + OVERLAY_ID + '__meta"><span class="' + OVERLAY_ID + '__count">0 / ' + total + '</span>' +
        '<span class="' + OVERLAY_ID + '__time">0s elapsed</span></div>' +
        '</div>';
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
    const start = Date.now();
    if (overlayTimer) clearInterval(overlayTimer);
    overlayTimer = setInterval(function () {
      const timeEl = overlay.querySelector('.' + OVERLAY_ID + '__time');
      if (timeEl) timeEl.textContent = Math.round((Date.now() - start) / 1000) + 's elapsed';
    }, 250);
    updateOverlay(0, total);
  }

  function updateOverlay(done, total) {
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    const bar = overlay.querySelector('.' + OVERLAY_ID + '__bar');
    const count = overlay.querySelector('.' + OVERLAY_ID + '__count');
    if (bar) bar.style.width = Math.round((done / Math.max(1, total)) * 100) + '%';
    if (count) count.textContent = done + ' / ' + total;
  }

  function hideOverlay(immediate) {
    if (overlayTimer) { clearInterval(overlayTimer); overlayTimer = null; }
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    if (immediate) overlay.style.display = 'none';
    else setTimeout(function () { overlay.style.display = 'none'; }, 400);
  }

  function setStatus(message) {
    const select = document.getElementById('langSelect');
    if (!select) return;
    select.disabled = busy;
    select.title = message || '';
  }

  async function switchTo(lang) {
    if (busy) return;
    if (LANGS.indexOf(lang) === -1) lang = 'en';
    currentLang = lang;
    try { sessionStorage.setItem(LANG_KEY, lang); } catch (_) {}
    try { localStorage.removeItem(LANG_KEY); } catch (_) {}
    document.documentElement.lang = lang;

    collect(document.body);
    if (lang === 'en') {
      restoreAll();
      hideOverlay(true);
      setStatus('English');
      return;
    }

    const texts = allTexts();
    const dict = getDict(lang);
    // Translations are bundled, so switching is instant — never show a blocking popup.
    hideOverlay(true);

    busy = true;
    setStatus('Translating...');
    try {
      await ensureDictionary(lang, texts, updateOverlay);
      // Catch anything added while translating, then apply the complete result.
      collect(document.body);
      const remaining = allTexts().filter(function (text) { return text && !dict[text]; });
      if (remaining.length) await ensureDictionary(lang, remaining, updateOverlay);
      applyAll(getDict(lang));
      setStatus('Translated');
    } catch (_) {
      setStatus('Translation unavailable');
    } finally {
      busy = false;
      hideOverlay(false);
      setStatus(currentLang === 'en' ? 'English' : 'Translated');
    }
  }

  function init() {
    const select = document.getElementById('langSelect');
    hideOverlay(true);
    if (!select) return;
    let saved = 'en';
    try { saved = sessionStorage.getItem(LANG_KEY) || 'en'; } catch (_) {}
    try { localStorage.removeItem(LANG_KEY); } catch (_) {}
    if (LANGS.indexOf(saved) === -1) saved = 'en';
    select.value = saved;
    currentLang = saved;
    document.documentElement.lang = saved;
    select.addEventListener('change', function () { switchTo(this.value); });

    if (window.MutationObserver) {
      const observer = new MutationObserver(function (records) {
        if (busy || currentLang === 'en') return;
        let changed = false;
        records.forEach(function (record) {
          record.addedNodes.forEach(function (added) {
            if (added.nodeType === 3) {
              if (rememberNode(added)) changed = true;
            } else if (added.nodeType === 1) {
              if (added.closest && added.closest(SKIP)) return;
              if (collect(added)) changed = true;
            }
          });
        });
        if (changed) applyAll(getDict(currentLang));
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    if (saved !== 'en') switchTo(saved);
  }

  window.AtmanyaTranslate = {
    init: init,
    switchTo: switchTo,
    getLang: function () { return currentLang; },
    getVoiceLang: function () { return VOICE_LANG[currentLang] || 'en-US'; },
    translateText: translateText
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
