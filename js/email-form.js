// Email Us button -> quick enquiry form that composes an email
(function () {
  'use strict';

  const MODAL_ID = 'email-modal';
  const EMAIL = 'atmanyayoga@gmail.com';

  let modal, form, titleEl, noteEl, sendEl, closeEl;

  function lang() {
    return (window.AtmanyaTranslate && window.AtmanyaTranslate.getLang && window.AtmanyaTranslate.getLang()) || 'en';
  }

  function t(key, fallback) {
    const i18n = window.ATMANYA_I18N || {};
    return (i18n[lang()] && i18n[lang()][key]) || (i18n.en && i18n.en[key]) || fallback || key;
  }

  function render() {
    if (!modal) return;
    titleEl.textContent = t('emailModalTitle', 'Send us an email');
    noteEl.textContent = t('emailNote', 'Your email app will open with the message ready to send.');
    sendEl.textContent = t('emailSend', 'Open email app');
    closeEl.setAttribute('aria-label', t('emailClose', 'Close'));
    form.querySelector('[data-label=name]').textContent = t('emailName', 'Your name');
    form.querySelector('[data-label=from]').textContent = t('emailYourEmail', 'Your email address');
    form.querySelector('[data-label=subject]').textContent = t('emailSubject', 'Subject');
    form.querySelector('[data-label=message]').textContent = t('emailMessage', 'Your message');
    Array.from(document.querySelectorAll('.email-trigger')).forEach(function (el) {
      const label = t('emailBtn', 'Email');
      el.textContent = label;
      el.title = label;
    });
  }

  function open() {
    if (!modal) return;
    modal.hidden = false;
    render();
    const first = form.querySelector('input');
    if (first) first.focus();
  }

  function close() {
    if (modal) modal.hidden = true;
  }

  function build() {
    if (document.getElementById(MODAL_ID)) return;

    modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'email-modal';
    modal.hidden = true;
    modal.innerHTML =
      '<div class="email-modal__backdrop" data-email-close></div>' +
      '<div class="email-modal__card" role="dialog" aria-modal="true" aria-labelledby="email-modal-title">' +
        '<button type="button" class="email-modal__close" data-email-close aria-label="Close">✕</button>' +
        '<h2 id="email-modal-title"></h2>' +
        '<p class="email-modal__note"></p>' +
        '<form id="email-form" class="email-modal__form">' +
          '<label><span data-label="name"></span><input type="text" name="name" required></label>' +
          '<label><span data-label="from"></span><input type="email" name="from" required></label>' +
          '<label><span data-label="subject"></span><input type="text" name="subject"></label>' +
          '<label><span data-label="message"></span><textarea name="message" rows="5" required></textarea></label>' +
          '<button type="submit" class="btn btn--primary"></button>' +
        '</form>' +
      '</div>';
    document.body.appendChild(modal);

    form = document.getElementById('email-form');
    titleEl = document.getElementById('email-modal-title');
    noteEl = modal.querySelector('.email-modal__note');
    sendEl = form.querySelector('button[type=submit]');
    closeEl = modal.querySelector('.email-modal__close');

    modal.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-email-close')) close();
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const data = new FormData(form);
      const subject = (data.get('subject') || '').toString().trim() || t('emailSubjectDefault', 'Enquiry from the Ātmanya Yoga website');
      const body = [
        t('emailName', 'Your name') + ': ' + (data.get('name') || ''),
        t('emailYourEmail', 'Your email address') + ': ' + (data.get('from') || ''),
        '',
        data.get('message') || ''
      ].join('\n');
      window.location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) close();
    });

    document.addEventListener('click', function (e) {
      const trigger = e.target.closest && e.target.closest('[data-email-form]');
      if (trigger) {
        e.preventDefault();
        open();
      }
    });

    const select = document.getElementById('langSelect');
    if (select) select.addEventListener('change', function () { setTimeout(render, 0); });

    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
