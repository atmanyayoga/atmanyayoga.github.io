// Hasanti — walking guide with built-in instant Q&A and selectable website tours
(function () {
  'use strict';

  const ROOT_ID = 'hasanti-assistant';
  const GREETED_KEY = 'hasanti_greeted';

  let root, avatar, bubble, bubbleText, actions, chat, chatLog, chatQuick, chatForm, chatInput;
  let rerender = null;
  let chatActive = false;
  let log = [];

  function lang() {
    return (window.AtmanyaTranslate && window.AtmanyaTranslate.getLang && window.AtmanyaTranslate.getLang()) || 'en';
  }

  function t(key, fallback) {
    const i18n = window.ATMANYA_I18N || {};
    return (i18n[lang()] && i18n[lang()][key]) || (i18n.en && i18n.en[key]) || fallback || key;
  }

  function button(label, handler, cls) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls || 'hasanti-btn';
    b.textContent = label;
    b.addEventListener('click', handler);
    return b;
  }

  function showBubble(text, items, renderFn) {
    bubbleText.textContent = text;
    actions.innerHTML = '';
    (items || []).forEach(function (item) { actions.appendChild(button(item.label, item.handler)); });
    actions.hidden = false;
    chat.hidden = true;
    chatActive = false;
    bubble.hidden = false;
    rerender = renderFn || null;
  }

  function hideBubble() {
    bubble.hidden = true;
    clearHighlight();
  }

  function clearHighlight() {
    document.querySelectorAll('.hasanti-highlight').forEach(function (el) { el.classList.remove('hasanti-highlight'); });
  }

  function highlight(el) {
    clearHighlight();
    if (el && el.classList) el.classList.add('hasanti-highlight');
  }

  const intents = [
    { key: 'ansTrial', kw: ['trial', 'free class', 'free trial', 'try a class', 'परीक्षण', 'निःशुल्क', 'मुफ्त', 'essai', 'gratuit'] },
    { key: 'ansStart', kw: ['beginner', 'start', 'new to yoga', 'which batch', 'शुरुआत', 'नए', 'beginner', 'débutant', 'commencer'] },
    { key: 'ansWhatIs', kw: ['what is hatha', 'what is traditional', 'what is yoga', 'about hatha', 'eight limb', 'eight limbs', 'philosophy', 'क्या है', 'आठ अंग', 'पारंपरिक', "qu'est-ce", 'huit membres', 'traditionnel'] },
    { key: 'ansQR', kw: ['qr', 'upi id', 'upi', 'placeholder', 'क्यूआर', 'यूपीआई', 'qr code'] },
    { key: 'ansPayment', kw: ['payment', 'pay', 'भुगतान', 'paiement', 'payer'] },
    { key: 'ansMeet', kw: ['google meet', 'meet link', 'meeting link', 'visio', 'मीट', 'लिंक'] },
    { key: 'ansJoin', kw: ['register', 'registration', 'enrol', 'enroll', 'sign up', 'join', 'form', 'पंजीकरण', 'नामांकन', 'शामिल', 'inscri', 'formulaire'] },
    { key: 'ansSchedule', kw: ['schedule', 'timing', 'time', 'week', 'weekly', 'ist', 'cet', 'cest', 'बैच', 'समय', 'कार्यक्रम', 'horaire', 'créneau', 'emploi du temps'] },
    { key: 'ansFees', kw: ['fee', 'fees', 'price', 'cost', '₹', '€', 'शुल्क', 'कीमत', 'frais', 'tarif', 'prix', 'coût'] },
    { key: 'ansDuration', kw: ['monthly', 'quarterly', 'annual', 'half-year', 'renew', 'subscription', 'मासिक', 'त्रैमासिक', 'वार्षिक', 'सदस्यता', 'mensuel', 'annuel', 'renouvel', 'abonnement'] },
    { key: 'ansRefund', kw: ['refund', 'cancel', 'missed', 'replacement', 'वापसी', 'रद्द', 'प्रतिस्थापन', 'remboursement', 'annul', 'manqué'] },
    { key: 'ansSafety', kw: ['injury', 'medical', 'hurt', 'pain', 'safety', 'चोट', 'चिकित्सा', 'सुरक्षा', 'blessure', 'médical', 'douleur'] },
    { key: 'ansBenefits', kw: ['benefit', 'benefits', 'advantage', 'calm', 'stress', 'strength', 'flexible', 'balance', 'लाभ', 'शांति', 'तनाव', 'bienfait', 'calme', 'force'] },
    { key: 'ansPractice', kw: ['5 minute', '5-minute', 'practice', 'guided', 'voice', 'breath', 'breathing', 'अभ्यास', 'प्राणायाम', 'साँस', '5 मिनट', 'pratique', 'respiration', 'souffle'] },
    { key: 'ansResources', kw: ['resource', 'resources', 'faq', 'insight', 'tip', 'article', 'संसाधन', 'जानकारी', 'ressource', 'conseil'] },
    { key: 'ansLegal', kw: ['privacy', 'terms', 'policy', 'condition', 'legal', 'गोपनीयता', 'नियम', 'शर्त', 'confidentialité', 'conditions', 'mentions'] },
    { key: 'ansContact', kw: ['contact', 'email', 'reach', 'message', 'write', 'संपर्क', 'ईमेल', 'संदेश', 'contacter', 'e-mail', 'écrire'] },
    { key: 'ansLocation', kw: ['where', 'location', 'online', 'india', 'europe', 'कहां', 'भारत', 'यूरोप', 'ऑनलाइन', 'où', 'inde', 'europe', 'en ligne'] },
    { key: 'ansLanguage', kw: ['language', 'hindi', 'french', 'english', 'भाषा', 'हिंदी', 'फ्रेंच', 'langue', 'français'] },
    { key: 'ansTeacher', kw: ['teacher', 'haasanthi', 'hassanthi', 'instructor', 'guide', 'शिक्षक', 'टीचर', 'हासंती', 'professeur', 'enseignant'] },
    { key: 'ansThanks', kw: ['thank', 'thanks', 'धन्यवाद', 'merci'] },
    { key: 'ansClasses', kw: ['class', 'classes', 'course', 'hatha', 'yoga', 'session', 'कक्षा', 'योग', 'cours', 'séance'] }
  ];

  function answerFor(text) {
    const q = (text || '').toLowerCase().replace(/\s+/g, ' ').trim();
    for (const intent of intents) {
      for (const word of intent.kw) {
        if (q.indexOf(word) !== -1) return intent.key;
      }
    }
    return 'ansFallback';
  }

  function renderChat() {
    chatLog.innerHTML = '';
    log.forEach(function (item) {
      const row = document.createElement('div');
      row.className = 'hc-msg hc-msg--' + item.who;
      row.textContent = item.text;
      chatLog.appendChild(row);
    });
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function botReply(answerKey) {
    log.push({ who: 'bot', text: t(answerKey, '') });
    renderChat();
  }

  function askQuestion(text) {
    const value = (text || '').trim();
    if (!value) return;
    log.push({ who: 'user', text: value });
    renderChat();
    setTimeout(function () { botReply(answerFor(value)); }, 180);
  }

  function addQuickReplies() {
    chatQuick.innerHTML = '';
    const quickKeys = ['quickClasses', 'quickFees', 'quickTrial', 'quickBatches', 'quickRegister', 'quickPractice'];
    quickKeys.forEach(function (key) {
      chatQuick.appendChild(button(t(key, ''), function () { askQuestion(t(key, '')); }, 'hc-quick'));
    });
  }

  function startChat() {
    chatActive = true;
    bubbleText.textContent = t('title', 'Ask Hasanti');
    actions.hidden = true;
    chat.hidden = false;
    bubble.hidden = false;
    if (!log.length) {
      log = [{ who: 'bot', text: t('welcome', "Namaste! I'm here to help.") }];
      addQuickReplies();
    }
    renderChat();
    chatInput.placeholder = t('inputPlaceholder', 'Ask Hasanti...');
    chatInput.focus();
    rerender = startChat;
  }

  const pageExtras = {
    'index.html': [
      { selector: '.practice-grid', key: 'tourPractice' },
      { selector: '.benefit-grid', key: 'tourBenefits' },
      { selector: '.testimonial-grid, .section--dark', key: 'tourCommunity' }
    ],
    'courses.html': [
      { selector: '.timeline', key: 'tourSchedule' },
      { selector: '.faq-list', key: 'tourFaq' }
    ],
    'membership.html': [
      { selector: '.membership-fees-grid', key: 'tourFees' },
      { selector: '.callout', key: 'tourPayment' }
    ],
    'virtual-session.html': [
      { selector: '.session-player', key: 'tourSession' },
      { selector: '.session-side', key: 'tourResources' }
    ],
    'resources.html': [
      { selector: '.resource-grid', key: 'tourResources' },
      { selector: '.faq-list', key: 'tourFaq' }
    ],
    'contact.html': [
      { selector: '#enquiryForm', key: 'tourForm' },
      { selector: '.faq-list', key: 'tourFaq' }
    ],
    'teacher.html': [
      { selector: '.teacher-grid', key: 'tourGallery' },
      { selector: '.gallery-grid', key: 'tourGallery' }
    ]
  };

  function getExtras() {
    const page = (location.pathname.split('/').pop() || 'index.html');
    return pageExtras[page] || [{ selector: 'main .card, main section', key: 'tourFaq' }];
  }

  function stepsFor(mode) {
    const start = [
      { selector: '.site-header', key: 'tourNav' },
      { selector: '.quote-ribbon', key: 'tourRibbon' },
      { selector: '.hero, .page-hero', key: 'tourHero' }
    ];
    const footer = { selector: '.site-footer', key: 'tourFooter' };
    const extras = getExtras();
    if (mode === 'classesFees') {
      return start.concat([
        { selector: '.timeline, .practice-grid', key: 'tourSchedule' },
        { selector: '.membership-fees-grid, .benefit-grid, .faq-list', key: 'tourFees' },
        footer
      ]);
    }
    if (mode === 'practice') {
      return start.concat([
        { selector: '.session-player, .practice-grid', key: 'tourSession' },
        { selector: '.session-side, .benefit-grid', key: 'tourBenefits' },
        footer
      ]);
    }
    return start.concat(extras, [footer]);
  }

  function renderStep(steps, index) {
    const current = steps[index];
    let target = document.querySelector(current.selector);
    if (target && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    highlight(target);
    showBubble(t(current.key, ''), [
      { label: t('assistantNext', 'Next'), handler: function () { renderStep(steps, index + 1); } },
      { label: t('tourAskShort', 'Ask'), handler: startChat },
      { label: t('assistantFinish', 'Finish'), handler: renderDone }
    ], function () { renderStep(steps, index); });
  }

  function renderDone() {
    clearHighlight();
    showBubble(t('tourDone', "That's the tour! Need anything else? Ask me anytime."), [
      { label: t('tourAskShort', 'Ask'), handler: startChat },
      { label: t('tourRestart', 'Restart'), handler: function () { startTour('full'); } },
      { label: t('assistantClose', 'Close'), handler: hideBubble }
    ], renderDone);
  }

  function startTour(mode) {
    renderStep(stepsFor(mode), 0);
  }

  function intro() {
    showBubble(t('assistantIntro', "Namaste! I'm Hasanti, your guide here."), [
      { label: t('tourFull', 'Full website tour'), handler: function () { startTour('full'); } },
      { label: t('tourClassesFees', 'Classes & fees'), handler: function () { startTour('classesFees'); } },
      { label: t('tourPracticeOpt', '5-minute practice'), handler: function () { startTour('practice'); } },
      { label: t('assistantAsk', 'Ask Hasanti'), handler: startChat },
      { label: t('tourLater', 'Maybe later'), handler: hideBubble }
    ], intro);
  }

  function build() {
    if (document.getElementById(ROOT_ID)) return;

    root = document.createElement('div');
    root.id = ROOT_ID;
    root.className = 'hasanti';

    bubble = document.createElement('div');
    bubble.className = 'hasanti-bubble';
    bubble.hidden = true;

    bubbleText = document.createElement('p');
    bubbleText.className = 'hasanti-bubble-text';
    actions = document.createElement('div');
    actions.className = 'hasanti-actions';

    chat = document.createElement('div');
    chat.className = 'hasanti-chat';
    chat.hidden = true;
    chatLog = document.createElement('div');
    chatLog.className = 'hc-log';
    chatQuick = document.createElement('div');
    chatQuick.className = 'hc-quick-wrap';
    chatForm = document.createElement('form');
    chatForm.className = 'hc-form';
    chatInput = document.createElement('input');
    chatInput.type = 'text';
    chatInput.className = 'hc-input';
    chatInput.setAttribute('autocomplete', 'off');
    const send = document.createElement('button');
    send.type = 'submit';
    send.className = 'hc-send';
    send.textContent = '➤';
    chatForm.appendChild(chatInput);
    chatForm.appendChild(send);
    chat.appendChild(chatLog);
    chat.appendChild(chatQuick);
    chat.appendChild(chatForm);
    chatForm.addEventListener('submit', function (e) {
      e.preventDefault();
      askQuestion(chatInput.value);
      chatInput.value = '';
    });

    bubble.appendChild(bubbleText);
    bubble.appendChild(actions);
    bubble.appendChild(chat);

    avatar = document.createElement('button');
    avatar.type = 'button';
    avatar.className = 'hasanti-avatar';
    avatar.setAttribute('aria-label', t('assistantAsk', 'Ask Hasanti'));
    avatar.innerHTML = '<span class="hw-shadow"></span>' +
      '<img class="hw-image" src="assets/brand/hasanti-cutout.png" alt="Hasanti">' +
      '<span class="hasanti-name">' + t('assistantAsk', 'Ask Hasanti') + '</span>';
    avatar.addEventListener('click', function () {
      if (bubble.hidden) intro(); else hideBubble();
    });

    root.appendChild(bubble);
    root.appendChild(avatar);
    document.body.appendChild(root);

    const select = document.getElementById('langSelect');
    if (select) {
      select.addEventListener('change', function () {
        setTimeout(function () {
          avatar.setAttribute('aria-label', t('assistantAsk', 'Ask Hasanti'));
          const nameEl = avatar.querySelector('.hasanti-name');
          if (nameEl) nameEl.textContent = t('assistantAsk', 'Ask Hasanti');
          if (chatActive) {
            addQuickReplies();
            renderChat();
          } else if (!bubble.hidden && rerender) rerender();
        }, 0);
      });
    }

    try {
      if (!sessionStorage.getItem(GREETED_KEY)) {
        sessionStorage.setItem(GREETED_KEY, '1');
        setTimeout(function () { if (bubble.hidden) intro(); }, 1400);
      }
    } catch (_) {
      setTimeout(function () { if (bubble.hidden) intro(); }, 1400);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
