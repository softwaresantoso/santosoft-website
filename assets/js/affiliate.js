// ---------- Helpers ----------
function affRupiah(n) {
  const v = Math.round(Number(n) || 0);
  return 'Rp ' + v.toLocaleString('id-ID');
}
function affShow(el) { if (el) el.hidden = false; }
function affHide(el) { if (el) el.hidden = true; }
function generateCode(name) {
  const base = (name || 'AFILIATOR')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 6) || 'SANTO';
  const suffix = Math.floor(10 + Math.random() * 90);
  return `AFF-${base}${suffix}`;
}
function referralLink(code) {
  return `${window.location.origin}/kontak.html?ref=${encodeURIComponent(code)}`;
}
function isEligibleLayanan(layanan) {
  if (!layanan) return true; // referral dari Pardi (tidak ada field layanan) selalu eligible
  const eligible = ['Jasa Pembuatan Website', 'Jasa Pembuatan Aplikasi (APK)', 'Pardi (khusus UMKM)'];
  return eligible.includes(layanan);
}

// ---------- Screens ----------
const affScreens = {
  loading: document.getElementById('aff-screen-loading'),
  auth: document.getElementById('aff-screen-auth'),
  dashboard: document.getElementById('aff-screen-dashboard'),
};
function affShowScreen(name) {
  Object.values(affScreens).forEach(affHide);
  affShow(affScreens[name]);
}

// ---------- Auth mode toggle ----------
let affAuthMode = 'login';
const affAuthTitle = document.getElementById('aff-auth-title');
const affAuthSub = document.getElementById('aff-auth-sub');
const affNameField = document.getElementById('aff-name-field');
const affSubmitBtn = document.getElementById('aff-auth-submit');
const affToggleBtn = document.getElementById('aff-toggle-btn');
const affToggleText = document.getElementById('aff-toggle-text');
const affAuthError = document.getElementById('aff-auth-error');

function setAffMode(mode) {
  affAuthMode = mode;
  affAuthError.classList.remove('show');
  if (mode === 'login') {
    affAuthTitle.textContent = 'Masuk ke Dashboard Afiliator';
    affAuthSub.textContent = 'Pantau referral dan komisimu.';
    affSubmitBtn.textContent = 'Masuk';
    affHide(affNameField);
    affToggleBtn.textContent = 'Daftar di sini';
    affToggleText.firstChild.textContent = 'Belum jadi afiliator? ';
  } else {
    affAuthTitle.textContent = 'Daftar Jadi Afiliator';
    affAuthSub.textContent = 'Jual layanan SantoSoft & Pardi, dapatkan kode referral pribadimu.';
    affSubmitBtn.textContent = 'Daftar';
    affShow(affNameField);
    affToggleBtn.textContent = 'Masuk di sini';
    affToggleText.firstChild.textContent = 'Sudah jadi afiliator? ';
  }
}
affToggleBtn.addEventListener('click', () => setAffMode(affAuthMode === 'login' ? 'signup' : 'login'));

document.getElementById('aff-auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  affAuthError.classList.remove('show');
  const email = document.getElementById('aff-email').value.trim();
  const password = document.getElementById('aff-password').value;
  const name = document.getElementById('aff-name').value.trim();

  if (!email || !password || (affAuthMode === 'signup' && !name)) {
    affAuthError.textContent = 'Lengkapi semua kolom dulu ya.';
    affAuthError.classList.add('show');
    return;
  }

  affSubmitBtn.textContent = 'Memproses...';
  try {
    if (affAuthMode === 'login') {
      await affAuth.signInWithEmailAndPassword(email, password);
    } else {
      const cred = await affAuth.createUserWithEmailAndPassword(email, password);
      const uid = cred.user.uid;
      const code = generateCode(name);
      await affDb.collection('affiliates').doc(uid).set({
        name,
        email,
        code,
        status: 'active',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }
  } catch (err) {
    affAuthError.textContent = affErrorMessage(err);
    affAuthError.classList.add('show');
  }
  affSubmitBtn.textContent = affAuthMode === 'login' ? 'Masuk' : 'Daftar';
});

function affErrorMessage(err) {
  const map = {
    'auth/invalid-email': 'Format email belum benar.',
    'auth/user-not-found': 'Akun belum terdaftar, coba daftar dulu.',
    'auth/wrong-password': 'Password salah.',
    'auth/email-already-in-use': 'Email ini sudah terdaftar, coba masuk.',
    'auth/weak-password': 'Password minimal 6 karakter.',
  };
  return map[err.code] || 'Ada masalah, coba lagi ya.';
}

document.getElementById('aff-logout-btn').addEventListener('click', () => affAuth.signOut());

// ---------- Auth state ----------
let affUnsub = [];
function affClearListeners() { affUnsub.forEach((u) => u()); affUnsub = []; }

affAuth.onAuthStateChanged((user) => {
  affClearListeners();
  if (!user) {
    affShowScreen('auth');
    return;
  }
  affShowScreen('dashboard');
  attachAffDashboard(user.uid);
});

// ---------- Dashboard ----------
function attachAffDashboard(uid) {
  const bizUnsub = affDb.collection('affiliates').doc(uid).onSnapshot((doc) => {
    const d = doc.data();
    if (!d) return;
    document.getElementById('aff-name-display').textContent = d.name || '';
    document.getElementById('aff-code-display').textContent = d.code;
    const link = referralLink(d.code);
    document.getElementById('aff-link-hidden').value = link;

    document.getElementById('aff-copy-btn').onclick = () => {
      navigator.clipboard.writeText(link).then(() => {
        const btn = document.getElementById('aff-copy-btn');
        const original = btn.textContent;
        btn.textContent = 'Tersalin!';
        setTimeout(() => { btn.textContent = original; }, 1800);
      });
    };
    document.getElementById('aff-wa-share').href =
      'https://wa.me/?text=' + encodeURIComponent(
        `Halo! Kalau butuh website, aplikasi Android, atau digitalisasi UMKM (Pardi), coba cek SantoSoft ya: ${link}`
      );

    attachReferralList(d.code);
  });

  const payoutBtn = document.getElementById('aff-payout-btn');
  payoutBtn.onclick = async () => {
    payoutBtn.textContent = 'Mengirim...';
    try {
      const bizDoc = await affDb.collection('affiliates').doc(uid).get();
      const code = bizDoc.data().code;
      await affDb.collection('payoutRequests').add({
        uid,
        code,
        status: 'menunggu',
        requestedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      document.getElementById('aff-payout-success').hidden = false;
      const waText = encodeURIComponent(`Halo SantoSoft, saya mau minta pencairan komisi afiliator (kode: ${code}).`);
      window.open(`https://wa.me/6281212551846?text=${waText}`, '_blank', 'noopener');
    } catch (err) {
      alert('Gagal mengirim permintaan, coba lagi ya.');
    }
    payoutBtn.textContent = 'Minta Pencairan';
  };
}

function attachReferralList(code) {
  const tbody = document.getElementById('aff-referral-tbody');
  const emptyState = document.getElementById('aff-referral-empty');
  const table = document.getElementById('aff-referral-table');

  const unsub = affDb.collection('referrals')
    .where('code', '==', code)
    .onSnapshot((snap) => {
      if (snap.empty) {
        table.hidden = true;
        emptyState.hidden = false;
        renderTotals(0, 0);
        return;
      }
      table.hidden = false;
      emptyState.hidden = true;
      tbody.innerHTML = '';
      let totalReferral = 0;
      let totalKomisi = 0;
      const statusLabel = { baru: 'Baru masuk', proses: 'Diproses', closing: 'Closing', batal: 'Batal' };

      snap.forEach((doc) => {
        const d = doc.data();
        totalReferral += 1;
        if (d.status === 'closing') totalKomisi += (d.commissionAmount || 0);

        const layananText = d.layanan
          ? (isEligibleLayanan(d.layanan) ? escapeHtml(d.layanan) : `${escapeHtml(d.layanan)} <span class="aff-not-eligible">(tanpa komisi)</span>`)
          : 'Pardi';

        const tr = document.createElement('tr');
        const tanggal = d.createdAt && d.createdAt.toDate
          ? d.createdAt.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
          : '-';
        tr.innerHTML = `
          <td>${escapeHtml(d.clientName || '-')}</td>
          <td>${escapeHtml(d.businessName || '-')}</td>
          <td>${layananText}</td>
          <td>${tanggal}</td>
          <td><span class="aff-status ${d.status || 'baru'}">${statusLabel[d.status] || 'Baru masuk'}</span></td>
          <td>${d.status === 'closing' ? affRupiah(d.commissionAmount || 0) : '—'}</td>
        `;
        tbody.appendChild(tr);
      });
      renderTotals(totalReferral, totalKomisi);
    });
  affUnsub.push(unsub);
}

function renderTotals(totalReferral, totalKomisi) {
  document.getElementById('aff-metric-total-referral').textContent = totalReferral;
  document.getElementById('aff-metric-komisi').textContent = affRupiah(totalKomisi);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Init ----------
affShowScreen('loading');
setAffMode('login');
