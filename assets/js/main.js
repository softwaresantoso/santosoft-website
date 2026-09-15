// Register service worker (foundation for installable PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  });
}

// Mobile nav toggle
(function () {
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (!toggle || !links) return;
  toggle.addEventListener('click', function () {
    var open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  links.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { links.classList.remove('open'); });
  });
})();

// Contact form -> validate, submit to Netlify Forms, then hand off to WhatsApp
(function () {
  var form = document.getElementById('contact-form');
  if (!form) return;

  var WA_NUMBER = '6281212551846'; // TODO: ganti dengan nomor WhatsApp bisnis SantoSoft

  function encode(data) {
    return Object.keys(data)
      .map(function (key) { return encodeURIComponent(key) + '=' + encodeURIComponent(data[key]); })
      .join('&');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fields = {
      nama: form.querySelector('#nama'),
      usaha: form.querySelector('#usaha'),
      layanan: form.querySelector('#layanan'),
      pesan: form.querySelector('#pesan'),
    };

    var valid = true;
    Object.values(fields).forEach(function (f) {
      var wrap = f.closest('.field');
      if (!f.value || !f.value.trim()) {
        wrap.classList.add('has-error');
        valid = false;
      } else {
        wrap.classList.remove('has-error');
      }
    });
    if (!valid) return;

    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: encode({
        'form-name': 'contact',
        nama: fields.nama.value.trim(),
        usaha: fields.usaha.value.trim(),
        layanan: fields.layanan.value,
        pesan: fields.pesan.value.trim(),
      }),
    }).catch(function () {});

    var text = [
      'Halo SantoSoft, saya mau tanya soal layanan.',
      '',
      'Nama: ' + fields.nama.value.trim(),
      'Nama usaha/perusahaan: ' + fields.usaha.value.trim(),
      'Layanan yang dibutuhkan: ' + fields.layanan.value,
      'Kebutuhan: ' + fields.pesan.value.trim(),
    ].join('\n');

    var url = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(text);
    var success = document.getElementById('form-success');
    if (success) success.classList.add('show');
    window.open(url, '_blank', 'noopener');
    form.reset();
  });
})();
