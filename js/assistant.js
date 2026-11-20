// Hasanti — virtual guide with automatic greeting, selectable tours and instant replies
(function () {
  'use strict';

  const ROOT_ID = 'hasanti-assistant';
  const GREETED_KEY = 'hasanti_greeted';

  let root, avatar, bubble, bubbleText, actions;
  let rerender = null;

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

  function showBubble(text, items, renderFn) {
    bubbleText.textContent = text;
    actions.innerHTML = '';
    (items || []).forEach(function (item) { actions.appendChild(button(item.label, item.handler)); });
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

  function openChat() {
    hideBubble();
    if (window.AtmanyaChat) window.AtmanyaChat.open();
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
    const commonStart = [
      { selector: '.site-header', key: 'tourNav' },
      { selector: '.quote-ribbon', key: 'tourRibbon' },
      { selector: '.hero, .page-hero', key: 'tourHero' }
    ];
    const footer = { selector: '.site-footer', key: 'tourFooter' };
    const extras = getExtras();

    if (mode === 'classesFees') {
      return commonStart.concat([
        { selector: '.timeline, .practice-grid', key: 'tourSchedule' },
        { selector: '.membership-fees-grid, .benefit-grid, .faq-list', key: 'tourFees' },
        footer
      ]);
    }
    if (mode === 'practice') {
      return commonStart.concat([
        { selector: '.session-player, .practice-grid', key: 'tourSession' },
        { selector: '.session-side, .benefit-grid', key: 'tourBenefits' },
        footer
      ]);
    }
    return commonStart.concat(extras, [footer]);
  }

  function renderStep(steps, index) {
    const current = steps[index];
    let target = document.querySelector(current.selector);
    if (target && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    highlight(target);
    showBubble(t(current.key, ''), [
      { label: t('assistantNext', 'Next'), handler: function () { index += 1; renderStep(steps, index); } },
      { label: t('tourAskShort', 'Ask'), handler: openChat },
      { label: t('assistantFinish', 'Finish'), handler: function () { renderDone(); } }
    ], function () { renderStep(steps, index); });
  }

  function renderDone() {
    clearHighlight();
    showBubble(t('tourDone', "That's the tour! Need anything else? Ask me anytime."), [
      { label: t('tourAskShort', 'Ask'), handler: openChat },
      { label: t('tourRestart', 'Restart'), handler: function () { startTour('full'); } },
      { label: t('assistantClose', 'Close'), handler: hideBubble }
    ], renderDone);
  }

  function startTour(mode) {
    const steps = stepsFor(mode);
    renderStep(steps, 0);
  }

  function intro() {
    showBubble(t('assistantIntro', "Namaste! I'm Hasanti, your guide here."), [
      { label: t('tourFull', 'Full website tour'), handler: function () { startTour('full'); } },
      { label: t('tourClassesFees', 'Classes & fees'), handler: function () { startTour('classesFees'); } },
      { label: t('tourPracticeOpt', '5-minute practice'), handler: function () { startTour('practice'); } },
      { label: t('assistantAsk', 'Ask a question'), handler: openChat },
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
    bubble.appendChild(bubbleText);
    bubble.appendChild(actions);

    avatar = document.createElement('button');
    avatar.type = 'button';
    avatar.className = 'hasanti-avatar';
    avatar.setAttribute('aria-label', t('assistantName', 'Hasanti'));
    avatar.innerHTML = '<span class="hw-shadow"></span>' +
      '<img class="hw-image" src="assets/brand/hasanti-cutout.png" alt="Hasanti">' +
      '<span class="hasanti-name">Hasanti</span>';
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
          avatar.setAttribute('aria-label', t('assistantName', 'Hasanti'));
          const nameEl = avatar.querySelector('.hasanti-name');
          if (nameEl) nameEl.textContent = t('assistantName', 'Hasanti');
          if (!bubble.hidden && rerender) rerender();
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
