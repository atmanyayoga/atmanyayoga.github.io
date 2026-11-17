// Site-wide translation (English / Hindi / French)
(function () {
  const LANGS = ['en', 'hi', 'fr'];
  const SEP = '|||';
  const CHUNK = 20;
  const API = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=';
  const CACHE_PREFIX = 'atmanya-i18n-';
  const LANG_KEY = 'atmanya-lang';
  const SKIP = 'script, style, noscript, #google_translate_element, .lang-select, .goog-te-gadget';

  let currentLang = 'en';
  let nodes = [];
  let busy = false;

  function storageGet(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (_) { return {}; }
  }
  function storageSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }
  function getDict(lang) { return storageGet(CACHE_PREFIX + lang); }
  function saveDict(lang, dict) { storageSet(CACHE_PREFIX + lang, dict); }

  function clean(text) { return (text || '').trim(); }

  function collect(root) {
    const found = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest(SKIP)) return NodeFilter.FILTER_REJECT;
        const value = clean(node.nodeValue);
        if (!value || !/[A-Za-z]/.test(value)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.__atmanyaOriginal === undefined) node.__atmanyaOriginal = node.nodeValue;
      found.push(node);
    }
    return found;
  }

  async function translateBatch(texts, lang) {
    const url = API + lang + '&dt=t&q=' + encodeURIComponent(texts.join(SEP));
    const response = await fetch(url);
    if (!response.ok) throw new Error('translation request failed');
    const json = await response.json();
    const line = (json[0] || []).map(function (part) { return part[0] || ''; }).join('');
    const parts = line.split(SEP);
    return parts.length === texts.length ? parts : null;
  }

  async function ensureDictionary(lang, texts) {
    const dict = getDict(lang);
    const missing = [];
    texts.forEach(function (text) {
      if (!dict[text] && missing.indexOf(text) === -1) missing.push(text);
    });
    if (!missing.length) return dict;

    for (let i = 0; i < missing.length; i += CHUNK) {
      const chunk = missing.slice(i, i + CHUNK);
      let translated = null;
      try {
        translated = await translateBatch(chunk, lang);
      } catch (_) {}
      if (translated) {
        chunk.forEach(function (text, index) { dict[text] = translated[index]; });
      } else {
        for (const text of chunk) {
          try {
            const single = await translateBatch([text], lang);
            if (single && single[0]) dict[text] = single[0];
          } catch (_) {}
        }
      }
      saveDict(lang, dict);
    }
    return dict;
  }

  function applyDictionary(dict) {
    nodes.forEach(function (node) {
      const original = node.__atmanyaOriginal;
      if (original === undefined) return;
      const trimmed = clean(original);
      const replacement = dict[trimmed];
      node.nodeValue = replacement ? original.replace(trimmed, replacement) : original;
    });
    document.documentElement.lang = currentLang;
  }

  function restore() {
    nodes.forEach(function (node) {
      if (node.__atmanyaOriginal !== undefined) node.nodeValue = node.__atmanyaOriginal;
    });
    document.documentElement.lang = 'en';
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
    try { localStorage.setItem(LANG_KEY, lang); } catch (_) {}

    if (!nodes.length) nodes = collect(document.body);
    if (lang === 'en') {
      restore();
      setStatus('English');
      return;
    }

    busy = true;
    setStatus('Translating...');
    try {
      const texts = nodes.map(function (node) { return clean(node.__atmanyaOriginal); }).filter(Boolean);
      const dict = await ensureDictionary(lang, texts);
      applyDictionary(dict);
      setStatus('Translated');
    } catch (_) {
      setStatus('Translation unavailable');
    } finally {
      busy = false;
      setStatus(currentLang === 'en' ? 'English' : 'Translated');
    }
  }

  function init() {
    const select = document.getElementById('langSelect');
    if (!select) return;
    let saved = 'en';
    try { saved = localStorage.getItem(LANG_KEY) || 'en'; } catch (_) {}
    if (LANGS.indexOf(saved) === -1) saved = 'en';
    select.value = saved;
    currentLang = saved;
    select.addEventListener('change', function () { switchTo(this.value); });

    // Re-translate content injected later (e.g. guided session cues).
    if (window.MutationObserver) {
      const observer = new MutationObserver(function () {
        if (busy || currentLang === 'en') return;
        const added = collect(document.body);
        if (added.length > nodes.length) {
          nodes = added;
          const dict = getDict(currentLang);
          applyDictionary(dict);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    if (saved !== 'en') switchTo(saved);
  }

  window.AtmanyaTranslate = { init: init, switchTo: switchTo };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
