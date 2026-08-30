(async function () {
  await new Promise((r) => (document.readyState === "complete" ? r() : addEventListener("load", r)));
  const R = [];
  const pass = (n) => R.push('PASS ' + n);
  const fail = (n, d) => R.push('FAIL ' + n + ' [' + d + ']');

  // ---- 1. no horizontal overflow -------------------------------------
  const de = document.documentElement;
  if (de.scrollWidth <= de.clientWidth + 1) pass('no-h-overflow(' + de.clientWidth + ')');
  else fail('no-h-overflow', de.scrollWidth + '>' + de.clientWidth);

  // ---- 2. nothing wider than the viewport ----------------------------
  const vw = de.clientWidth;
  let wide = [];
  document.querySelectorAll('body *').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > vw + 1) wide.push(el.tagName + '.' + (el.className || '?') + '=' + Math.round(r.width));
  });
  wide.length ? fail('no-wide-elements', wide.slice(0, 3).join(',')) : pass('no-wide-elements');

  // ---- 3. tap targets >= 44px ----------------------------------------
  let small = [];
  document.querySelectorAll('a,button,input,textarea').forEach((el) => {
    if (el.closest('.hp')) return;              // honeypot is meant to be hidden
    const r = el.getBoundingClientRect();
    if (r.height === 0) return;                 // inline links inside prose
    if (el.tagName === 'A' && !el.classList.contains('btn')) return;
    if (r.height < 44) small.push(el.tagName + '=' + Math.round(r.height));
  });
  small.length ? fail('tap-targets-44', small.join(',')) : pass('tap-targets-44');

  // ---- 4. font-size >= 16px on inputs (iOS auto-zoom) -----------------
  let tiny = [];
  document.querySelectorAll('input:not([tabindex="-1"]),textarea').forEach((el) => {
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 16) tiny.push(el.id + '=' + fs);
  });
  tiny.length ? fail('input-font-16', tiny.join(',')) : pass('input-font-16');

  // ---- 5. every input has a real label --------------------------------
  let unlabelled = [];
  document.querySelectorAll('input,textarea').forEach((el) => {
    if (!document.querySelector('label[for="' + el.id + '"]')) unlabelled.push(el.id);
  });
  unlabelled.length ? fail('labels', unlabelled.join(',')) : pass('labels');

  // ---- 6. image has explicit dimensions (no CLS) ----------------------
  const logo = document.querySelector('.logo');
  (logo && logo.getAttribute('width') && logo.getAttribute('height'))
    ? pass('logo-dims') : fail('logo-dims', 'missing');
  (logo && logo.naturalWidth > 0) ? pass('logo-loads') : fail('logo-loads', 'natural=0');

  // ---- 7. FORM: empty submit is rejected -------------------------------
  const form = document.getElementById('lead');
  const okN = document.getElementById('ok');
  const failN = document.getElementById('fail');
  const tick = () => new Promise((r) => setTimeout(r, 60));

  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  await tick();
  (!failN.hidden && failN.textContent.includes('שם')) ? pass('empty-rejected')
    : fail('empty-rejected', 'hidden=' + failN.hidden);

  // ---- 7b. FORM: a malformed email is rejected --------------------------
  failN.hidden = true; okN.hidden = true;
  document.getElementById('name').value = 'ישראל';
  document.getElementById('phone').value = '0521234567';
  document.getElementById('email').value = 'not-an-email';
  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  await tick();
  (!failN.hidden && failN.textContent.includes('מייל')) ? pass('bad-email-rejected')
    : fail('bad-email-rejected', 'hidden=' + failN.hidden);

  // ---- 8. FORM: honeypot swallows bots ---------------------------------
  failN.hidden = true; okN.hidden = true;
  document.getElementById('name').value = 'בוט';
  document.getElementById('phone').value = '0500000000';
  document.getElementById('email').value = 'bot@spam.test';
  document.getElementById('company').value = 'spam-corp';
  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  await tick();
  (failN.hidden && okN.hidden) ? pass('honeypot-silent')
    : fail('honeypot-silent', 'a note appeared');

  // ---- 9. FORM: no webhook -> whatsapp fallback keeps the lead ---------
  document.getElementById('company').value = '';
  document.getElementById('name').value = 'ישראל ישראלי';
  document.getElementById('phone').value = '052-1234567';
  document.getElementById('email').value = 'israel@example.com';
  document.getElementById('msg').value = 'שולחן אוכל 220x100';
  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  await tick(); await tick();

  if (failN.hidden) {
    fail('fallback-shown', 'no note');
  } else {
    const link = failN.querySelector('a[href^="https://wa.me/"]');
    if (!link) fail('fallback-wa-link', 'missing');
    else {
      const href = decodeURIComponent(link.getAttribute('href'));
      const hasAll = href.includes('ישראל ישראלי')
                  && href.includes('052-1234567')
                  && href.includes('שולחן אוכל 220x100');
      hasAll ? pass('fallback-carries-lead') : fail('fallback-carries-lead', href.slice(0, 90));
    }
    const tel = failN.querySelector('a[href^="tel:"]');
    tel ? pass('fallback-has-tel') : fail('fallback-has-tel', 'missing');
  }

  // ---- 10. button re-enabled after failure ------------------------------
  const send = document.getElementById('send');
  (!send.disabled && send.textContent.trim() === 'שליחה')
    ? pass('button-restored') : fail('button-restored', send.disabled + '/' + send.textContent);

  // ---- 11. content audit: forbidden marketing language -------------------
  const body = document.body.innerText;
  const banned = ['הכי טוב', 'מוביל', 'מומחה מספר', 'ללא תחרות', 'שנות ניסיון',
                  'לקוחות מרוצים', 'המלצות', 'פרס', 'החל מ', 'מבצע', 'הצוות שלנו'];
  const hits = banned.filter((w) => body.includes(w));
  hits.length ? fail('no-marketing-slop', hits.join(',')) : pass('no-marketing-slop');

  document.title = 'RESULTS|' + R.join(' | ');
})();
