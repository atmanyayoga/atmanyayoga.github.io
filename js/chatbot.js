// FAQ chatbot helper — instant, no API key, follows the site language
(function () {
  'use strict';

  const ROOT_ID = 'atmanya-chatbot';
  const EN = (window.ATMANYA_CHAT_I18N && window.ATMANYA_CHAT_I18N.en) || {};

  const intents = [
    { key: 'ansTrial', kw: ['trial', 'free class', 'try', 'परीक्षण', 'निःशुल्क', 'essai', 'gratuit'] },
    { key: 'ansBatches', kw: ['batch', 'timing', 'time', 'ist', 'cet', 'cest', 'schedule', 'sample', 'बैच', 'समय', 'lot', 'horaire', 'créneau'] },
    { key: 'ansFees', kw: ['fee', 'fees', 'price', 'prices', 'cost', 'rupee', '₹', '€', 'शुल्क', 'कीमत', 'frais', 'tarif', 'prix', 'coût'] },
    { key: 'ansPayment', kw: ['payment', 'pay', 'upi', 'qr', 'भुगतान', 'paiement', 'payer'] },
    { key: 'ansRegister', kw: ['register', 'registration', 'enrol', 'enroll', 'sign up', 'form', 'रजिस्टर', 'पंजीकरण', 'नामांकन', 'inscri', 'formulaire'] },
    { key: 'ansTeacher', kw: ['teacher', 'haasanthi', 'instructor', 'teach', 'शिक्षक', 'टीचर', 'hassanthi', 'professeur', 'enseignant'] },
    { key: 'ansBeginners', kw: ['beginner', 'beginners', 'new to yoga', 'start', 'level', 'शुरुआत', 'नए', 'débutant', 'niveau'] },
    { key: 'ansPractice', kw: ['5 minute', '5-minute', 'practice', 'guided', 'voice', 'breath', 'अभ्यास', 'प्राणायाम', '5 मिनट', 'pratique', '5 minutes', 'respiration'] },
    { key: 'ansResources', kw: ['resource', 'resources', 'faq', 'insight', 'tip', 'संसाधन', 'ressource', 'conseil'] },
    { key: 'ansLegal', kw: ['privacy', 'terms', 'policy', 'condition', 'legal', 'गोपनीयता', 'नियम', 'confidentialité', 'conditions'] },
    { key: 'ansLanguage', kw: ['language', 'हिन्दी', 'hindi', 'french', 'français', 'english', 'langue'] },
    { key: 'ansThanks', kw: ['thank', 'thanks', 'धन्यवाद', 'merci'] },
    { key: 'ansOnline', kw: ['online', 'google meet', 'where', 'location', 'distance', 'ऑनलाइन', 'en ligne'] },
    { key: 'ansClasses', kw: ['class', 'classes', 'course', 'hatha', 'yoga', 'session', 'कक्षा', 'योग', 'cours', 'séance'] }
  ];

  const quickKeys = ['quickClasses', 'quickFees', 'quickTrial', 'quickBatches', 'quickRegister', 'quickPractice'];

  let panel, toggle, messagesEl, quickEl, input, form, closeBtn;
  let conversation = [];

  function lang() {
    return (window.AtmanyaTranslate && window.AtmanyaTranslate.getLang && window.AtmanyaTranslate.getLang()) || 'en';
  }

  function t(key) {
    const dict = (window.ATMANYA_CHAT_I18N && window.ATMANYA_CHAT_I18N[lang()]) || {};
    return dict[key] || EN[key] || key;
  }

  function normalize(text) {
    return (text || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function answerFor(text) {
    const q = normalize(text);
    for (const intent of intents) {
      for (const word of intent.kw) {
        if (q.indexOf(word) !== -1) return intent.key;
      }
    }
    return 'ansFallback';
  }

  function makeBubble(who, text) {
    const row = document.createElement('div');
    row.className = 'chat-row chat-row--' + who;
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble chat-bubble--' + who;
    bubble.textContent = text;
    row.appendChild(bubble);
    return row;
  }

  function render() {
    if (!messagesEl) return;
    messagesEl.innerHTML = '';
    conversation.forEach(function (item) {
      const text = item.key ? t(item.key) : item.text;
      messagesEl.appendChild(makeBubble(item.who, text));
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;

    if (quickEl) {
      quickEl.innerHTML = '';
      const label = document.createElement('span');
      label.className = 'chat-quick-label';
      label.textContent = t('askAbout');
      quickEl.appendChild(label);
      quickKeys.forEach(function (key) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chat-quick-btn';
        btn.textContent = t(key);
        btn.addEventListener('click', function () { ask(t(key), key.replace('quick', 'ans')); });
        quickEl.appendChild(btn);
      });
    }

    if (input) input.placeholder = t('inputPlaceholder');
    if (toggle) toggle.setAttribute('aria-label', t('open'));
    if (closeBtn) closeBtn.setAttribute('aria-label', t('close'));
    if (panel) panel.setAttribute('aria-label', t('title'));
    const titleEl = panel && panel.querySelector('.chat-title');
    const subEl = panel && panel.querySelector('.chat-subtitle');
    const hintEl = panel && panel.querySelector('.chat-hint');
    const sendEl = panel && panel.querySelector('.chat-send');
    if (titleEl) titleEl.textContent = t('title');
    if (subEl) subEl.textContent = t('subtitle');
    if (hintEl) hintEl.textContent = t('hint');
    if (sendEl) sendEl.textContent = t('send');
  }

  function ask(userText, answerKey) {
    conversation.push({ who: 'user', text: userText });
    conversation.push({ who: 'bot', key: answerKey || answerFor(userText) });
    render();
  }

  function setOpen(open) {
    if (!panel || !toggle) return;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? t('close') : t('open'));
    toggle.innerHTML = '<span class="chat-toggle-icon">' + (open ? '✕' : 'ॐ') + '</span>' +
      '<span class="chat-toggle-label">' + t('title') + '</span>';
    if (open) {
      render();
      if (input) input.focus();
    }
  }

  function build() {
    if (document.getElementById(ROOT_ID)) return;

    const root = document.createElement('div');
    root.id = ROOT_ID;
    root.className = 'chatbot';

    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'chat-toggle';
    toggle.setAttribute('aria-label', t('open'));
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<span class="chat-toggle-icon">ॐ</span>' +
      '<span class="chat-toggle-label">' + t('title') + '</span>';

    panel = document.createElement('section');
    panel.className = 'chat-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', t('title'));
    panel.hidden = true;

    const header = document.createElement('header');
    header.className = 'chat-header';
    header.innerHTML = '<span class="chat-avatar" aria-hidden="true">ॐ</span>' +
      '<div class="chat-heading"><strong class="chat-title"></strong><small class="chat-subtitle"></small></div>';
    closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'chat-close';
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', t('close'));
    header.appendChild(closeBtn);

    messagesEl = document.createElement('div');
    messagesEl.className = 'chat-messages';
    messagesEl.setAttribute('aria-live', 'polite');

    quickEl = document.createElement('div');
    quickEl.className = 'chat-quick';

    const hint = document.createElement('p');
    hint.className = 'chat-hint';

    form = document.createElement('form');
    form.className = 'chat-form';
    input = document.createElement('input');
    input.type = 'text';
    input.className = 'chat-input';
    input.setAttribute('autocomplete', 'off');
    const send = document.createElement('button');
    send.type = 'submit';
    send.className = 'chat-send btn btn--primary';
    form.appendChild(input);
    form.appendChild(send);

    panel.appendChild(header);
    panel.appendChild(messagesEl);
    panel.appendChild(quickEl);
    panel.appendChild(hint);
    panel.appendChild(form);
    root.appendChild(panel);
    root.appendChild(toggle);
    document.body.appendChild(root);

    toggle.addEventListener('click', function () { setOpen(panel.hidden); });
    closeBtn.addEventListener('click', function () { setOpen(false); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const value = input.value.trim();
      if (!value) return;
      ask(value);
      input.value = '';
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel && !panel.hidden) setOpen(false);
    });

    conversation = [{ who: 'bot', key: 'welcome' }];
    render();

    const select = document.getElementById('langSelect');
    if (select) {
      select.addEventListener('change', function () { setTimeout(render, 0); });
    }
  }

  window.AtmanyaChat = {
    open: function () { setOpen(true); },
    ask: function (question) {
      setOpen(true);
      ask(question);
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
