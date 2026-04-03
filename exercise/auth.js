// ═══════════════════════════════════════════════════════════════════════════
// AUTH MODULE  —  login, session management, password hashing
// ═══════════════════════════════════════════════════════════════════════════
// Loaded before user-manager.js and exercise_timer.js.
// Exposes a single global: Auth

const Auth = (() => {
  const USERS_KEY   = 'et_users';
  const SESSION_KEY = 'et_session';
  const PBKDF2_ITERS = 100000;

  // ── PBKDF2 password hashing with per-user salt ───────────────────────────

  function generateSalt() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function hexToBytes(hex) {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2)
      out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    return out;
  }

  async function deriveKey(password, saltHex) {
    const keyMaterial = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(password),
      { name: 'PBKDF2' }, false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: hexToBytes(saltHex),
        iterations: PBKDF2_ITERS, hash: 'SHA-256' },
      keyMaterial, 256
    );
    return Array.from(new Uint8Array(bits))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Creates a { salt, passwordHash } entry ready to store.
  async function createPasswordEntry(password) {
    const salt         = generateSalt();
    const passwordHash = await deriveKey(password, salt);
    return { salt, passwordHash };
  }

  // Verify a plaintext password against a stored { salt, passwordHash }.
  async function verifyPassword(password, user) {
    return await deriveKey(password, user.salt) === user.passwordHash;
  }

  // ── Persisted user list ──────────────────────────────────────────────────
  function getUsers() {
    try   { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
    catch { return []; }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  // Ensure at least one admin exists; creates admin / admin on first run.
  async function ensureDefaultAdmin() {
    if (getUsers().length === 0) {
      const entry = await createPasswordEntry('admin');
      saveUsers([{ username: 'admin', ...entry, role: 'admin' }]);
    }
  }

  // ── Login / logout ───────────────────────────────────────────────────────
  async function login(username, password) {
    const lc   = username.toLowerCase();
    const user = getUsers().find(u => u.username.toLowerCase() === lc);
    if (!user) return null;
    if (!(await verifyPassword(password, user))) return null;
    const session = { username: user.username, role: user.role };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function logout() { sessionStorage.removeItem(SESSION_KEY); }

  // ── Current session ──────────────────────────────────────────────────────
  function getSession() {
    try   { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); }
    catch { return null; }
  }

  function isAdmin() { const s = getSession(); return s !== null && s.role === 'admin'; }

  // ── Password changes ─────────────────────────────────────────────────────
  // User changes their own password; requires the correct current password.
  async function changePassword(username, currentPassword, newPassword) {
    const users = getUsers();
    const user  = users.find(u => u.username === username);
    if (!user) return false;
    if (!(await verifyPassword(currentPassword, user))) return false;
    Object.assign(user, await createPasswordEntry(newPassword));
    saveUsers(users);
    return true;
  }

  // Admin only: set any user's password without knowing the current one.
  async function adminSetPassword(username, newPassword) {
    const users = getUsers();
    const user  = users.find(u => u.username === username);
    if (!user) return false;
    Object.assign(user, await createPasswordEntry(newPassword));
    saveUsers(users);
    return true;
  }

  return {
    ensureDefaultAdmin,
    login, logout,
    getSession, isAdmin,
    changePassword, adminSetPassword,
    getUsers, saveUsers, createPasswordEntry,
  };
})();

// ── Password visibility toggle (eye button) ──────────────────────────────────
// Delegated from document so it works for modals added at any time.
document.addEventListener('click', function (e) {
  const btn = e.target.closest('.btn-pw-toggle');
  if (!btn) return;
  const input = btn.closest('.pw-wrap').querySelector('input');
  if (!input || (input.type !== 'password' && input.type !== 'text')) return;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  btn.textContent = show ? '🙈' : '👁';
  btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  btn.classList.toggle('pw-visible', show);
});

