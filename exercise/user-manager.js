// ═══════════════════════════════════════════════════════════════════════════
// USER MANAGER MODULE  —  CRUD for users and per-user configuration
// ═══════════════════════════════════════════════════════════════════════════
// Depends on Auth (loaded before this file).
// Exposes a single global: UserManager

const UserManager = (() => {
  const CFG_PREFIX = 'et_cfg_';

  // ── Per-user config ──────────────────────────────────────────────────────
  function getUserConfig(username) {
    return localStorage.getItem(CFG_PREFIX + username);   // null if absent
  }

  function setUserConfig(username, cfgText) {
    localStorage.setItem(CFG_PREFIX + username, cfgText);
  }

  // ── User CRUD ────────────────────────────────────────────────────────────

  // Create a new user and copy defaultCfgText as their personal config.
  // Returns { ok: true } or { ok: false, reason: string }.
  async function addUser(username, password, role, defaultCfgText) {
    const users = Auth.getUsers();
    if (users.find(u => u.username === username))
      return { ok: false, reason: 'Username already exists.' };
    const entry = await Auth.createPasswordEntry(password);
    users.push({ username, ...entry, role });
    Auth.saveUsers(users);
    if (defaultCfgText != null) setUserConfig(username, defaultCfgText);
    return { ok: true };
  }

  // Delete a user; refuses to remove the last admin.
  // Returns { ok: true } or { ok: false, reason: string }.
  function deleteUser(username) {
    let users    = Auth.getUsers();
    const target = users.find(u => u.username === username);
    if (!target)
      return { ok: false, reason: 'User not found.' };
    if (target.role === 'admin' && users.filter(u => u.role === 'admin').length <= 1)
      return { ok: false, reason: 'Cannot delete the last admin account.' };
    Auth.saveUsers(users.filter(u => u.username !== username));
    localStorage.removeItem(CFG_PREFIX + username);
    return { ok: true };
  }

  // Change a user's role (admin action only).
  function setUserRole(username, role) {
    const users = Auth.getUsers();
    const user  = users.find(u => u.username === username);
    if (!user) return false;
    user.role = role;
    Auth.saveUsers(users);
    return true;
  }

  return { getUserConfig, setUserConfig, addUser, deleteUser, setUserRole };
})();
