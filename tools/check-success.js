/* ============================================================
   מסלול ההצלחה של הטופס.

   check.js בודק את מסלול הכישלון. הקובץ הזה בודק את הצד השני:
   מה נשלח ב-payload, ומה קורה בדף אחרי תשובה תקינה.

   fetch מוחלף כאן בתשובת 200 מזויפת — שום בקשה לא יוצאת לרשת
   ושום ליד לא נשלח ל-n8n, גם עכשיו כש-WEBHOOK_URL מכיל כתובת חיה.

   הרצה: לצרף את הקובץ לעותק של הדף. הפירוט ב-README של התיקייה הזו.
   ============================================================ */
(async function () {
  await new Promise((r) => (document.readyState === 'complete' ? r() : addEventListener('load', r)));
  const R = [];
  const pass = (n) => R.push('PASS ' + n);
  const fail = (n, d) => R.push('FAIL ' + n + ' [' + d + ']');
  const tick = () => new Promise((r) => setTimeout(r, 60));

  const form  = document.getElementById('lead');
  const okN   = document.getElementById('ok');
  const failN = document.getElementById('fail');
  const send  = document.getElementById('send');

  /* fetch מוחלף רק עכשיו. הוא נקרא בתוך המטפל בשליחה,
     לא בטעינה, ולכן החלפה אחרי load מספיקה. */
  let seen = null;
  window.fetch = (url, opts) => {
    seen = { url, opts };
    return Promise.resolve({ ok: true, status: 200 });
  };

  document.getElementById('name').value  = 'ישראל ישראלי';
  document.getElementById('phone').value = '052-1234567';
  document.getElementById('email').value = 'israel@example.com';
  document.getElementById('msg').value   = 'שולחן אוכל 220x100';

  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  await tick(); await tick();

  // ---- הבקשה עצמה ------------------------------------------------
  if (!seen) {
    fail('request-sent', 'fetch never called');
  } else {
    pass('request-sent');
    (seen.opts.method === 'POST') ? pass('method-post')
      : fail('method-post', seen.opts.method);
    ((seen.opts.headers || {})['Content-Type'] === 'application/json')
      ? pass('json-header') : fail('json-header', 'missing');

    let body = {};
    try { body = JSON.parse(seen.opts.body); } catch (e) { fail('body-json', 'unparsable'); }

    // כל ארבעת שדות הטופס חייבים להגיע ל-n8n
    const need = { name: 'ישראל ישראלי', phone: '052-1234567',
                   email: 'israel@example.com', message: 'שולחן אוכל 220x100' };
    const bad = Object.keys(need).filter((k) => body[k] !== need[k]);
    bad.length ? fail('payload-fields', bad.join(',')) : pass('payload-fields');

    // המייל הוא השדה שנוד האישור ב-n8n שולח אליו
    body.email ? pass('payload-has-email') : fail('payload-has-email', 'missing');

    // מלכודת הספאם חייבת לעבור כדי ש-n8n יוכל לסנן לפיה
    ('company' in body) ? pass('payload-has-honeypot')
      : fail('payload-has-honeypot', 'n8n cannot filter bots without it');

    (body.sentAt && !isNaN(Date.parse(body.sentAt))) ? pass('payload-timestamp')
      : fail('payload-timestamp', String(body.sentAt));
  }

  // ---- מה שהדף עושה אחרי ------------------------------------------
  (!okN.hidden && okN.textContent.includes('קיבלתי')) ? pass('success-note')
    : fail('success-note', 'hidden=' + okN.hidden);

  failN.hidden ? pass('no-error-note') : fail('no-error-note', 'error shown too');

  // בהצלחה — ורק בהצלחה — הטופס מתרוקן
  (document.getElementById('name').value === ''
    && document.getElementById('email').value === ''
    && document.getElementById('msg').value === '')
    ? pass('form-cleared') : fail('form-cleared', 'still filled');

  (!send.disabled && send.textContent.trim() === 'שליחה')
    ? pass('button-restored') : fail('button-restored', send.disabled + '/' + send.textContent);

  document.title = 'RESULTS|' + R.join(' | ');
})();
