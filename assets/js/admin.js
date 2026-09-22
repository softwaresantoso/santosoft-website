// ---------- Helpers ----------
function admRupiah(n) {
  const v = Math.round(Number(n) || 0);
  return 'Rp ' + v.toLocaleString('id-ID');
}
function admShow(el) { if (el) el.hidden = false; }
function admHide(el) { if (el) el.hidden = true; }
function admDate(ts) {
  return ts && ts.toDate
    ? ts.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : '-';
}
function admEscape(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
function admEligible(layanan) {
  if (!layanan) return true;
  const eligible = ['Jasa Pembuatan Website', 'Jasa Pembuatan Aplikasi (APK)', 'Pardi (khusus UMKM)'];
  return eligible.includes(layanan);
}

// ---------- Screens ----------
const admScreens = {
  loading: document.getElementById('adm-screen-loading'),
  auth: document.getElementById('adm-screen-auth'),
  denied: document.getElementById('adm-screen-denied'),
  dashboard: document.getElementById('adm-screen-dashboard'),
};
function admShowScreen(name) {
  Object.values(admScreens).forEach(admHide);
  admShow(admScreens[name]);
}

document.getElementById('adm-back-btn').addEventListener('click', () => {
  affAuth.signOut().then(() => admShowScreen('auth'));
});

// ---------- Login (no signup here — admin accounts are provisioned manually) ----------
const admAuthError = document.getElementById('adm-auth-error');
document.getElementById('adm-auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  admAuthError.classList.remove('show');
  const email = document.getElementById('adm-email').value.trim();
  const password = document.getElementById('adm-password').value;
  if (!email || !password) {
    admAuthError.textContent = 'Isi email dan password dulu ya.';
    admAuthError.classList.add('show');
    return;
  }
  try {
    await affAuth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    const map = {
      'auth/invalid-email': 'Format email belum benar.',
      'auth/user-not-found': 'Akun tidak ditemukan.',
      'auth/wrong-password': 'Password salah.',
    };
    admAuthError.textContent = map[err.code] || 'Ada masalah, coba lagi ya.';
    admAuthError.classList.add('show');
  }
});
document.getElementById('adm-logout-btn').addEventListener('click', () => affAuth.signOut());

// ---------- Auth state + admin check ----------
let admUnsub = [];
function admClearListeners() { admUnsub.forEach((u) => u()); admUnsub = []; }

affAuth.onAuthStateChanged(async (user) => {
  admClearListeners();
  if (!user) {
    admShowScreen('auth');
    return;
  }
  admShowScreen('loading');
  try {
    const adminDoc = await affDb.collection('admins').doc(user.uid).get();
    if (!adminDoc.exists) {
      admShowScreen('denied');
      return;
    }
  } catch (err) {
    admShowScreen('denied');
    return;
  }
  admShowScreen('dashboard');
  attachAdminData();
});

// ---------- Data caches (joined client-side) ----------
let admAffiliatesByCode = {};
let admLatestReferrals = [];

function attachAdminData() {
  const affUnsub = affDb.collection('affiliates').onSnapshot((snap) => {
    admAffiliatesByCode = {};
    let activeCount = 0;
    const tbody = document.getElementById('adm-affiliate-tbody');
    tbody.innerHTML = '';
    snap.forEach((doc) => {
      const d = doc.data();
      admAffiliatesByCode[d.code] = d.name;
      if (d.status === 'active') activeCount += 1;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${admEscape(d.name)}</td>
        <td>${admEscape(d.email)}</td>
        <td>${admEscape(d.code)}</td>
        <td>${admDate(d.createdAt)}</td>
      `;
      tbody.appendChild(tr);
    });
    document.getElementById('adm-metric-affiliates').textContent = activeCount;
    renderReferrals();
  });

  const refUnsub = affDb.collection('referrals')
    .orderBy('createdAt', 'desc')
    .onSnapshot((snap) => {
      admLatestReferrals = [];
      snap.forEach((doc) => admLatestReferrals.push({ id: doc.id, ...doc.data() }));
      renderReferrals();
    });

  const payoutUnsub = affDb.collection('payoutRequests')
    .where('status', '==', 'menunggu')
    .onSnapshot((snap) => {
      const tbody = document.getElementById('adm-payout-tbody');
      const empty = document.getElementById('adm-payout-empty');
      const table = document.getElementById('adm-payout-table');
      if (snap.empty) {
        table.hidden = true;
        empty.hidden = false;
        return;
      }
      table.hidden = false;
      empty.hidden = true;
      tbody.innerHTML = '';
      snap.forEach((doc) => {
        const d = doc.data();
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${admEscape(admAffiliatesByCode[d.code] || '-')}</td>
          <td>${admEscape(d.code)}</td>
          <td>${admDate(d.requestedAt)}</td>
          <td><button class="adm-save-btn" data-payout-id="${doc.id}">Tandai Selesai</button></td>
        `;
        tbody.appendChild(tr);
      });
      tbody.querySelectorAll('button[data-payout-id]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          btn.textContent = 'Menyimpan...';
          await affDb.collection('payoutRequests').doc(btn.dataset.payoutId).update({ status: 'selesai' });
        });
      });
    });

  admUnsub.push(affUnsub, refUnsub, payoutUnsub);
}

function renderReferrals() {
  const tbody = document.getElementById('adm-referral-tbody');
  const empty = document.getElementById('adm-referral-empty');
  const table = document.getElementById('adm-referral-table');

  if (admLatestReferrals.length === 0) {
    table.hidden = true;
    empty.hidden = false;
    document.getElementById('adm-metric-referrals').textContent = '0';
    document.getElementById('adm-metric-closing').textContent = '0';
    document.getElementById('adm-metric-komisi').textContent = admRupiah(0);
    return;
  }
  table.hidden = false;
  empty.hidden = true;
  tbody.innerHTML = '';

  let closingCount = 0;
  let totalKomisi = 0;

  admLatestReferrals.forEach((d) => {
    if (d.status === 'closing') {
      closingCount += 1;
      totalKomisi += (d.commissionAmount || 0);
    }
    const layanan = d.layanan || 'Pardi';
    const eligible = admEligible(d.layanan);
    const layananText = eligible ? admEscape(layanan) : `${admEscape(layanan)} <span class="aff-not-eligible">(tanpa komisi)</span>`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${admEscape(admAffiliatesByCode[d.code] || d.code || '-')}</td>
      <td>${admEscape(d.clientName)}</td>
      <td>${admEscape(d.businessName)}</td>
      <td>${layananText}</td>
      <td>${admDate(d.createdAt)}</td>
      <td>
        <select data-field="status">
          <option value="baru" ${d.status === 'baru' ? 'selected' : ''}>Baru masuk</option>
          <option value="proses" ${d.status === 'proses' ? 'selected' : ''}>Diproses</option>
          <option value="closing" ${d.status === 'closing' ? 'selected' : ''}>Closing</option>
          <option value="batal" ${d.status === 'batal' ? 'selected' : ''}>Batal</option>
        </select>
      </td>
      <td><input type="number" data-field="commission" value="${d.commissionAmount || 0}" ${eligible ? '' : 'disabled title="Servis Software tidak ada komisi"'}></td>
      <td><button class="adm-save-btn" data-ref-id="${d.id}">Simpan</button></td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('adm-metric-referrals').textContent = admLatestReferrals.length;
  document.getElementById('adm-metric-closing').textContent = closingCount;
  document.getElementById('adm-metric-komisi').textContent = admRupiah(totalKomisi);

  tbody.querySelectorAll('button[data-ref-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('tr');
      const status = row.querySelector('select[data-field="status"]').value;
      const commissionInput = row.querySelector('input[data-field="commission"]');
      const commission = commissionInput.disabled ? 0 : (parseFloat(commissionInput.value) || 0);
      btn.textContent = 'Menyimpan...';
      try {
        await affDb.collection('referrals').doc(btn.dataset.refId).update({
          status,
          commissionAmount: commission,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        btn.textContent = 'Tersimpan';
        btn.classList.add('saved');
        setTimeout(() => { btn.textContent = 'Simpan'; btn.classList.remove('saved'); }, 1500);
      } catch (err) {
        btn.textContent = 'Gagal, coba lagi';
      }
    });
  });
}
