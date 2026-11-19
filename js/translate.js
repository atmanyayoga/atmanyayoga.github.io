// Site-wide translation (English / Hindi / French)
(function () {
  const LANGS = ['en', 'hi', 'fr'];
  const VOICE_LANG = { en: 'en-US', hi: 'hi-IN', fr: 'fr-FR' };
  const SEP = '|||';
  const CHUNK = 20;
  const CONCURRENCY = 5;
  const API = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=';
  const CACHE_PREFIX = 'atmanya-i18n-';
  const LANG_KEY = 'atmanya-lang';
  const SKIP = 'script, style, noscript, #google_translate_element, .lang-select, .goog-te-gadget';

  let currentLang = 'en';
  let nodes = [];
  let nodeSet = new Set();
  let busy = false;
  const inflight = new Map();

  function storageGet(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (_) { return {}; }
  }
  function storageSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }
  function getDict(lang) { return storageGet(CACHE_PREFIX + lang); }
  function saveDict(lang, dict) { storageSet(CACHE_PREFIX + lang, dict); }
  function clean(text) { return (text || '').trim(); }

  function remember(node) {
    if (!node || nodeSet.has(node)) return false;
    nodeSet.add(node);
    if (node.__atmanyaOriginal === undefined) node.__atmanyaOriginal = node.nodeValue;
    nodes.push(node);
    return true;
  }

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
      if (remember(walker.currentNode)) found.push(walker.currentNode);
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

  async function fetchOne(text, lang) {
    try {
      const result = await translateBatch([text], lang);
      if (result && result[0]) return result[0];
    } catch (_) {}
    return text;
  }

  async function translateText(text, lang) {
    const value = clean(text);
    if (!value) return text;
    lang = LANGS.indexOf(lang) !== -1 ? lang : currentLang;
    if (lang === 'en') return text;

    const dict = getDict(lang);
    if (dict[value]) return text.replace(value, dict[value]);

    const key = lang + '\u0000' + value;
    if (inflight.has(key)) return inflight.get(key);

    const task = (async function () {
      const translated = await fetchOne(value, lang);
      const fresh = getDict(lang);
      fresh[value] = translated;
      saveDict(lang, fresh);
      return text.replace(value, translated);
    })();

    inflight.set(key, task);
    try { return await task; } finally { inflight.delete(key); }
  }

  async function ensureDictionary(lang, texts) {
    const dict = getDict(lang);
    const missing = [];
    texts.forEach(function (text) {
      if (text && !dict[text] && missing.indexOf(text) === -1) missing.push(text);
    });
    if (!missing.length) return dict;

    const chunks = [];
    for (let i = 0; i < missing.length; i += CHUNK) chunks.push(missing.slice(i, i + CHUNK));

    let cursor = 0;
    async function worker() {
      while (cursor < chunks.length) {
        const chunk = chunks[cursor++];
        try {
          const translated = await translateBatch(chunk, lang);
          if (translated && translated.length === chunk.length) {
            chunk.forEach(function (text, index) { dict[text] = translated[index]; });
          } else {
            const singles = await Promise.all(chunk.map(function (text) { return fetchOne(text, lang); }));
            chunk.forEach(function (text, index) { dict[text] = singles[index]; });
          }
        } catch (_) {
          const singles = await Promise.all(chunk.map(function (text) { return fetchOne(text, lang); }));
          chunk.forEach(function (text, index) { dict[text] = singles[index]; });
        }
        saveDict(lang, dict);
        applyDictionary(dict); // show each completed batch immediately
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, chunks.length) }, worker));
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
    document.documentElement.lang = lang;

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
    document.documentElement.lang = saved;
    select.addEventListener('change', function () { switchTo(this.value); });

    // Translate content injected later (e.g. guided session cues) without a full page walk.
    if (window.MutationObserver) {
      const observer = new MutationObserver(function (records) {
        if (busy || currentLang === 'en') return;
        let changed = false;
        records.forEach(function (record) {
          record.addedNodes.forEach(function (added) {
            if (added.nodeType === 3) {
              if (remember(added)) changed = true;
            } else if (added.nodeType === 1) {
              if (collect(added).length) changed = true;
            }
          });
        });
        if (changed) applyDictionary(getDict(currentLang));
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
