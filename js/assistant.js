// Hasanti — animated virtual guide with instant replies and a quick site tour
(function () {
  'use strict';

  const ROOT_ID = 'hasanti-assistant';

  let root, avatar, bubble, bubbleText, actions, highlightTimer;

  function lang() {
    return (window.AtmanyaTranslate && window.AtmanyaTranslate.getLang && window.AtmanyaTranslate.getLang()) || 'en';
  }

  function t(key, fallback) {
    const i18n = window.ATMANYA_I18N || {};
    return (i18n[lang()] && i18n[lang()][key]) || (i18n.en && i18n.en[key]) || fallback || key;
  }

  function button(label, handler) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hasanti-btn';
    b.textContent = label;
    b.addEventListener('click', handler);
    return b;
  }

  function showActions(items) {
    actions.innerHTML = '';
    items.forEach(function (item) { actions.appendChild(button(item.label, item.handler)); });
  }

  function showBubble(text, items) {
    bubbleText.textContent = text;
    showActions(items || []);
    bubble.hidden = false;
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

  const steps = [
    { selector: '.site-header', key: 'tourNav' },
    { selector: '.quote-ribbon', key: 'tourRibbon' },
    { selector: '.hero, .page-hero', key: 'tourHero' },
    { selector: 'main section', key: 'tourContent' },
    { selector: '.site-footer', key: 'tourFooter' }
  ];

  function startTour() {
    let index = 0;
    function step() {
      if (index >= steps.length) {
        clearHighlight();
        showBubble(t('tourDone', "That's the tour! Need anything else? Ask me anytime."), [
          { label: t('assistantAsk', 'Ask a question'), handler: function () {
            hideBubble();
            if (window.AtmanyaChat) window.AtmanyaChat.open();
          } },
          { label: t('assistantClose', 'Close'), handler: hideBubble }
        ]);
        return;
      }
      const current = steps[index];
      let target = document.querySelector(current.selector);
      if (current.selector === 'main section') {
        const all = document.querySelectorAll('main section');
        target = all[1] || all[0] || target;
      }
      if (target && target.scrollIntoView) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      highlight(target);
      showBubble(t(current.key, ''), [
        { label: t('assistantNext', 'Next'), handler: function () { index += 1; step(); } },
        { label: t('assistantFinish', 'Finish'), handler: function () { index = steps.length; step(); } }
      ]);
    }
    step();
  }

  function greet() {
    showBubble(t('assistantGreeting', "Namaste! I'm Hasanti, your guide here."), [
      { label: t('assistantAsk', 'Ask a question'), handler: function () {
        hideBubble();
        if (window.AtmanyaChat) window.AtmanyaChat.open();
      } },
      { label: t('assistantTour', 'Take a tour'), handler: startTour },
      { label: t('assistantClose', 'Close'), handler: hideBubble }
    ]);
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
    bubble.appendChild(bubbleText);
    bubble.appendChild(actions);

    avatar = document.createElement('button');
    avatar.type = 'button';
    avatar.className = 'hasanti-avatar';
    avatar.setAttribute('aria-label', t('assistantName', 'Hasanti'));
    avatar.innerHTML = '<span class="hw-arm hw-arm--left"></span>' +
      '<span class="hw-arm hw-arm--right"></span>' +
      '<span class="hw-leg hw-leg--left"></span>' +
      '<span class="hw-leg hw-leg--right"></span>' +
      '<span class="hw-body"></span>' +
      '<span class="hw-head"></span>' +
      '<span class="hasanti-name">Hasanti</span>';
    avatar.addEventListener('click', function () {
      if (bubble.hidden) greet(); else hideBubble();
    });

    root.appendChild(bubble);
    root.appendChild(avatar);
    document.body.appendChild(root);

    const select = document.getElementById('langSelect');
    if (select) {
      select.addEventListener('change', function () {
        setTimeout(function () {
          avatar.setAttribute('aria-label', t('assistantName', 'Hasanti'));
          const nameEl = avatar.querySelector('.hasanti-name');
          if (nameEl) nameEl.textContent = t('assistantName', 'Hasanti');
          if (!bubble.hidden) greet();
        }, 0);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
