/**
 * Contact Form Module
 * Handles form validation, Formspree submission, and unsent message protection
 */

(function() {
  'use strict';

  const form = document.querySelector('#contact form');
  const errorMsg = document.getElementById('form-error');
  if (!form) return;

  const formStatus = document.getElementById('form-status');
  let submitting = false;
  let submitted = false;

  const hasUnsentMessage = () => !submitted && [...form.querySelectorAll('.form-group input, textarea')].some(field => field.value.trim());

  window.addEventListener('beforeunload', event => {
    if (hasUnsentMessage()) {
      event.preventDefault();
      event.returnValue = '';
    }
  });

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || link.target === '_blank' || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const target = new URL(link.href, window.location.href);
    if (target.origin === location.origin && target.pathname === location.pathname && target.search === location.search) return;
    if (hasUnsentMessage() && !window.confirm('You have an unsent message. Leave this page without sending it?')) {
      event.preventDefault();
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (submitting) return;

    errorMsg.style.display = 'none';
    if (formStatus) formStatus.textContent = '';
    let valid = true;

    const nameField = document.getElementById('contact-name');
    const emailField = document.getElementById('contact-email');
    const phoneField = document.getElementById('contact-phone');
    const subjectField = document.getElementById('contact-subject');
    const messageField = document.getElementById('contact-message');

    const errName = document.getElementById('err-name');
    const errEmail = document.getElementById('err-email');
    const errPhone = document.getElementById('err-phone');
    const errSubject = document.getElementById('err-subject');
    const errMessage = document.getElementById('err-message');

    // Reset errors
    form.querySelectorAll('.form-group').forEach(g => g.classList.remove('error'));
    [nameField, emailField, phoneField, subjectField, messageField].forEach(f => f.setAttribute('aria-invalid', 'false'));
    [errName, errEmail, errPhone, errSubject, errMessage].forEach(d => { if (d) { d.style.display = 'none'; d.textContent = ''; } });

    function fieldError(field, el, msg) {
      field.closest('.form-group').classList.add('error');
      field.setAttribute('aria-invalid', 'true');
      if (el) { el.textContent = msg; el.style.display = 'block'; }
    }

    if (!nameField.value.trim()) {
      fieldError(nameField, errName, 'Please enter your name.');
      valid = false;
    }

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(emailField.value.trim())) {
      fieldError(emailField, errEmail, 'Please enter a valid email address.');
      valid = false;
    }

    if (phoneField.value.trim() !== '' && !/^[+]?[\d\s().-]{6,20}$/.test(phoneField.value.trim())) {
      fieldError(phoneField, errPhone, 'Please enter a valid phone number.');
      valid = false;
    }

    if (!subjectField.value.trim()) {
      fieldError(subjectField, errSubject, 'Please enter a subject.');
      valid = false;
    }

    if (!messageField.value.trim()) {
      fieldError(messageField, errMessage, 'Please enter your message.');
      valid = false;
    }

    if (!valid) {
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      if (formStatus) formStatus.textContent = 'Please correct the highlighted fields before sending your message.';
      return;
    }

    submitting = true;
    form.setAttribute('aria-busy', 'true');
    if (formStatus) formStatus.textContent = 'Sending your message…';
    const btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; btn.classList.add('loading'); }

    const data = new FormData(form);
    data.append('_format', 'json');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    fetch(form.action, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: data,
      signal: controller.signal
    })
      .then(async (res) => {
        clearTimeout(timeoutId);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.error || body.errors?.[0]?.message || 'submit-failed');
        }
        submitted = true;
        window.location.href = new URL('thank-you.html', window.location.href).href;
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        submitting = false;
        form.setAttribute('aria-busy', 'false');
        if (formStatus) formStatus.textContent = '';
        if (btn) { btn.disabled = false; btn.textContent = 'Send Message'; btn.classList.remove('loading'); }
        errorMsg.style.display = 'block';
        errorMsg.textContent = err.name === 'AbortError'
          ? 'Request timed out. Please check your connection and try again.'
          : 'Your message could not be sent. Your entries are preserved. Please try again or reach out on LinkedIn.';
      });
  });

  // Clear errors on input
  form.querySelectorAll('input, textarea').forEach(function(field) {
    field.addEventListener('input', function() {
      var group = this.closest('.form-group');
      if (group) {
        group.classList.remove('error');
        this.setAttribute('aria-invalid', 'false');
        var err = group.querySelector('.form-error');
        if (err) { err.style.display = 'none'; err.textContent = ''; }
      }
    });
  });
})();