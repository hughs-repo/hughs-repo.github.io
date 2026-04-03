// ═══════════════════════════════════════════════════════════════════════════
// ADMIN MODULE  —  user management UI and per-user config editing
// ═══════════════════════════════════════════════════════════════════════════
// Depends on (loaded before this file):
//   auth.js          → Auth
//   user-manager.js  → UserManager
//   exercise_timer.js → parseCfg, showScreen

// ── Escape HTML for safe DOM insertion ───────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Edit-screen state ────────────────────────────────────────────────────
let editExercises     = [];   // deep-copy of the user's exercises being edited
let editExerciseOrder = [];   // same format as exerciseOrder in exercise_timer.js
let editingUsername   = null; // which user's config is currently being edited
let editDragSrc       = null; // drag source element for the edit list

// ── Serialize exercise objects back to .cfg text ─────────────────────────
function serializeCfg(exArr, order) {
  const enabled = order.filter(e => !e.disabled);
  const lines   = [];
  enabled.forEach((entry, i) => {
    const ex    = exArr[entry.idx];
    const exNum = i + 1;
    lines.push(`[exercise.${exNum}]`);
    lines.push(`name = ${ex.name}`);
    if (ex.requirement)  lines.push(`requirement = ${ex.requirement}`);
    lines.push(`sets = ${ex.sets}`);
    if (ex.activity)     lines.push(`activity = ${ex.activity}`);
    lines.push(`between_focus_time = ${ex.betweenFocusTime}`);
    lines.push('');
    ex.focusAreas.forEach((fa, j) => {
      lines.push(`[exercise.${exNum}.focus.${j + 1}]`);
      lines.push(`name = ${fa.name}`);
      if (fa.intro)  lines.push(`intro = ${fa.intro}`);
      lines.push(`hold_time  = ${fa.holdTime}`);
      lines.push(`relax_time = ${fa.relaxTime}`);
      lines.push(`reps       = ${fa.reps}`);
      lines.push('');
    });
  });
  return lines.join('\n');
}

// ── Read current input values into editExercises ─────────────────────────
function syncEditInputs() {
  const list = document.getElementById('edit-exercise-preview');
  if (!list) return;
  list.querySelectorAll('li').forEach(li => {
    const visualIdx = parseInt(li.dataset.visualIdx);
    if (isNaN(visualIdx)) return;
    const entry = editExerciseOrder[visualIdx];
    if (!entry) return;
    const ex = editExercises[entry.idx];
    if (!ex) return;

    const setsInput = li.querySelector('.edit-sets');
    if (setsInput) ex.sets = Math.max(1, parseInt(setsInput.value) || 1);

    li.querySelectorAll('.ex-focus-area-row').forEach(row => {
      const faIdx    = parseInt(row.dataset.faIdx);
      const fa       = ex.focusAreas[faIdx];
      if (!fa) return;
      const repsInput  = row.querySelector('.edit-reps');
      const holdInput  = row.querySelector('.edit-hold');
      const relaxInput = row.querySelector('.edit-relax');
      if (repsInput)  fa.reps      = Math.max(1, parseInt(repsInput.value)  || 1);
      if (holdInput)  fa.holdTime  = Math.max(1, parseInt(holdInput.value)  || 1);
      if (relaxInput) fa.relaxTime = Math.max(0, parseInt(relaxInput.value) || 0);
    });
  });
}

// ── Render the edit-screen exercise list ─────────────────────────────────
function renderEditExerciseList() {
  const list = document.getElementById('edit-exercise-preview');
  list.innerHTML = '';

  if (editExercises.length === 0) {
    const msg = document.createElement('li');
    msg.className   = 'edit-cfg-empty';
    msg.textContent = 'No exercises loaded. Use "Reset to Default Config" to load the built-in exercises.';
    list.appendChild(msg);
    return;
  }

  const enabled  = editExerciseOrder.filter(e => !e.disabled);
  const disabled = editExerciseOrder.filter(e =>  e.disabled);
  const ordered  = [...enabled, ...disabled];
  editExerciseOrder = ordered;

  let enabledCount = 0;
  ordered.forEach((entry, visualIdx) => {
    const ex = editExercises[entry.idx];
    const li = document.createElement('li');
    li.dataset.visualIdx = visualIdx;
    li.classList.toggle('ex-disabled', entry.disabled);

    const num = entry.disabled ? '✕' : ++enabledCount;

    const focusRowsHtml = ex.focusAreas.map((fa, faIdx) => `
      <div class="ex-focus-area-row" data-fa-idx="${faIdx}">
        <span class="ex-focus-label">${fa.name || 'Focus ' + (faIdx + 1)}</span>
        <label class="ex-inline-label">Reps <input type="number" class="ex-inline-input edit-reps" value="${fa.reps}" min="1" max="50"></label>
        <label class="ex-inline-label">Hold <input type="number" class="ex-inline-input edit-hold" value="${fa.holdTime}" min="1" max="300">s</label>
        <label class="ex-inline-label">Relax <input type="number" class="ex-inline-input edit-relax" value="${fa.relaxTime}" min="0" max="300">s</label>
      </div>`).join('');

    li.innerHTML = `
      <div class="ex-drag-handle" title="Drag to reorder">&#8942;</div>
      <div class="ex-num ${entry.disabled ? 'ex-num-off' : ''}">${num}</div>
      <div class="ex-body">
        <div class="ex-header-row">
          <span class="ex-name">${ex.name}</span>
          <label class="ex-inline-label">Sets <input type="number" class="ex-inline-input edit-sets" value="${ex.sets}" min="1" max="20"></label>
        </div>
        ${focusRowsHtml}
      </div>
      <div class="ex-toggle-btn" title="${entry.disabled ? 'Tap to enable' : 'Tap to skip'}">${entry.disabled ? '＋' : '−'}</div>`;

    li.querySelector('.ex-toggle-btn').addEventListener('click', e => {
      e.stopPropagation();
      syncEditInputs();
      entry.disabled = !entry.disabled;
      renderEditExerciseList();
    });

    attachEditDrag(li, list, visualIdx);
    list.appendChild(li);
  });
}

// ── Drag-to-reorder for the edit screen (mouse + touch) ──────────────────
function attachEditDrag(li, list, visualIdx) {
  const handle = li.querySelector('.ex-drag-handle');

  // Mouse drag
  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    editDragSrc = li;
    li.classList.add('ex-dragging');

    function onMove(ev) {
      const items = [...list.querySelectorAll('li:not(.ex-dragging)')];
      const over  = items.find(item => {
        const r = item.getBoundingClientRect();
        return ev.clientY >= r.top && ev.clientY <= r.bottom;
      });
      if (over) {
        const overIdx = parseInt(over.dataset.visualIdx);
        const srcIdx  = parseInt(li.dataset.visualIdx);
        if (overIdx !== srcIdx) {
          syncEditInputs();
          const [moved] = editExerciseOrder.splice(srcIdx, 1);
          editExerciseOrder.splice(overIdx, 0, moved);
          renderEditExerciseList();
          editDragSrc = list.querySelector(`li[data-visual-idx="${overIdx}"]`);
          if (editDragSrc) editDragSrc.classList.add('ex-dragging');
        }
      }
    }

    function onUp() {
      li.classList.remove('ex-dragging');
      if (editDragSrc) editDragSrc.classList.remove('ex-dragging');
      editDragSrc = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      renderEditExerciseList();
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  });

  // Touch drag
  handle.addEventListener('touchstart', e => {
    e.preventDefault();
    editDragSrc = li;
    li.classList.add('ex-dragging');

    function onMove(ev) {
      const touch = ev.touches[0];
      const items = [...list.querySelectorAll('li:not(.ex-dragging)')];
      const over  = items.find(item => {
        const r = item.getBoundingClientRect();
        return touch.clientY >= r.top && touch.clientY <= r.bottom;
      });
      if (over) {
        const overIdx = parseInt(over.dataset.visualIdx);
        const srcIdx  = parseInt(li.dataset.visualIdx);
        if (overIdx !== srcIdx) {
          syncEditInputs();
          const [moved] = editExerciseOrder.splice(srcIdx, 1);
          editExerciseOrder.splice(overIdx, 0, moved);
          renderEditExerciseList();
          editDragSrc = list.querySelector(`li[data-visual-idx="${overIdx}"]`);
          if (editDragSrc) editDragSrc.classList.add('ex-dragging');
        }
      }
    }

    function onEnd() {
      if (editDragSrc) editDragSrc.classList.remove('ex-dragging');
      editDragSrc = null;
      handle.removeEventListener('touchmove', onMove);
      handle.removeEventListener('touchend',  onEnd);
      renderEditExerciseList();
    }

    handle.addEventListener('touchmove', onMove, { passive: false });
    handle.addEventListener('touchend',  onEnd);
  }, { passive: false });
}

// ── Open the edit-config screen for a given user ─────────────────────────
function openEditUserConfig(username) {
  editingUsername  = username;
  const users      = Auth.getUsers();
  const userRecord = users.find(u => u.username === username);

  document.getElementById('edit-cfg-username').textContent = username;
  document.getElementById('edit-cfg-fullname').value =
    (userRecord && userRecord.fullName) ? userRecord.fullName : '';

  const cfgText = UserManager.getUserConfig(username);
  editExercises = cfgText ? parseCfg(cfgText) : [];
  // Deep-copy so edits do not mutate any cached/parsed data
  editExercises     = JSON.parse(JSON.stringify(editExercises));
  editExerciseOrder = editExercises.map((_, i) => ({ idx: i, disabled: false }));

  renderEditExerciseList();
  showScreen('screen-edit-user-cfg');
}

// ── Render the user list in the user-management screen ───────────────────
function renderUserList() {
  const container   = document.getElementById('user-list-container');
  const users       = Auth.getUsers();
  const currentUser = Auth.getSession().username;

  container.innerHTML = '';

  if (users.length === 0) {
    container.innerHTML = '<p class="user-list-empty">No users found.</p>';
    return;
  }

  const ul = document.createElement('ul');
  ul.className = 'user-list';

  users.forEach(user => {
    const isMe = user.username === currentUser;
    const li   = document.createElement('li');
    li.className = 'user-list-item';

    // Info: name (+ full name if set) + role badge
    const infoDiv = document.createElement('div');
    infoDiv.className = 'user-list-info';

    const nameSpan = document.createElement('span');
    nameSpan.className   = 'user-list-name';
    nameSpan.textContent = user.fullName
      ? `${user.fullName} (${user.username})`
      : user.username;

    const roleBadge = document.createElement('span');
    roleBadge.className   = 'user-list-role-badge role-' + escapeHtml(user.role);
    roleBadge.textContent = user.role;

    infoDiv.appendChild(nameSpan);
    infoDiv.appendChild(roleBadge);
    if (isMe) {
      const youSpan = document.createElement('span');
      youSpan.className   = 'user-list-you';
      youSpan.textContent = '(you)';
      infoDiv.appendChild(youSpan);
    }

    // Actions
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'user-list-actions';

    const setPwBtn = document.createElement('button');
    setPwBtn.className        = 'btn-user-list-action btn-set-pw';
    setPwBtn.textContent      = 'Set Password';
    setPwBtn.dataset.username = user.username;
    actionsDiv.appendChild(setPwBtn);

    // "Edit Config" is available for ordinary users only
    if (user.role === 'user') {
      const editCfgBtn = document.createElement('button');
      editCfgBtn.className        = 'btn-user-list-action btn-edit-cfg';
      editCfgBtn.textContent      = 'Edit Config';
      editCfgBtn.dataset.username = user.username;
      actionsDiv.appendChild(editCfgBtn);
    }

    if (!isMe) {
      const delBtn = document.createElement('button');
      delBtn.className        = 'btn-user-list-action btn-delete-user';
      delBtn.textContent      = 'Delete';
      delBtn.dataset.username = user.username;
      actionsDiv.appendChild(delBtn);
    }

    li.appendChild(infoDiv);
    li.appendChild(actionsDiv);
    ul.appendChild(li);
  });

  container.appendChild(ul);

  // Wire Set Password buttons
  container.querySelectorAll('.btn-set-pw').forEach(btn => {
    btn.addEventListener('click', () => {
      const label = document.getElementById('set-pw-username-label');
      label.textContent      = btn.dataset.username;
      label.dataset.username = btn.dataset.username;
      document.getElementById('set-pw-error').classList.add('hidden');
      document.getElementById('set-password-form').reset();
      document.getElementById('set-password-overlay').classList.add('active');
    });
  });

  // Wire Edit Config buttons
  container.querySelectorAll('.btn-edit-cfg').forEach(btn => {
    btn.addEventListener('click', () => openEditUserConfig(btn.dataset.username));
  });

  // Wire Delete buttons
  container.querySelectorAll('.btn-delete-user').forEach(btn => {
    btn.addEventListener('click', () => {
      const username = btn.dataset.username;
      if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
      const result = UserManager.deleteUser(username);
      if (!result.ok) {
        alert(result.reason);
      } else {
        renderUserList();
      }
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN EVENT WIRING
// ═══════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

  // ── User management screen ───────────────────────────────────────────────
  document.getElementById('btn-manage-users').addEventListener('click', () => {
    renderUserList();
    showScreen('screen-user-mgmt');
  });

  document.getElementById('btn-back-to-setup').addEventListener('click', () => {
    showScreen('screen-setup');
  });

  // ── Add user modal ────────────────────────────────────────────────────────
  document.getElementById('btn-open-add-user').addEventListener('click', () => {
    document.getElementById('add-user-error').classList.add('hidden');
    document.getElementById('add-user-form').reset();
    document.getElementById('add-user-overlay').classList.add('active');
  });

  document.getElementById('btn-cancel-add-user').addEventListener('click', () => {
    document.getElementById('add-user-overlay').classList.remove('active');
  });

  document.getElementById('add-user-form').addEventListener('submit', async e => {
    e.preventDefault();
    const username = document.getElementById('au-username').value.trim();
    const fullName = document.getElementById('au-fullname').value.trim();
    const password = document.getElementById('au-password').value;
    const role     = document.getElementById('au-role').value;
    const errorEl  = document.getElementById('add-user-error');
    errorEl.classList.add('hidden');

    if (!username) {
      errorEl.textContent = 'Username is required.';
      errorEl.classList.remove('hidden');
      return;
    }
    if (password.length < 8) {
      errorEl.textContent = 'Password must be at least 8 characters.';
      errorEl.classList.remove('hidden');
      return;
    }

    let defaultCfg = null;
    try {
      const r = await fetch('exercise-scripts/default-config.cfg');
      defaultCfg = await r.text();
    } catch (_) { /* silently continue without a config */ }

    const result = await UserManager.addUser(username, password, role, fullName, defaultCfg);
    if (result.ok) {
      document.getElementById('add-user-overlay').classList.remove('active');
      renderUserList();
    } else {
      errorEl.textContent = result.reason;
      errorEl.classList.remove('hidden');
    }
  });

  // ── Set user password modal ───────────────────────────────────────────────
  document.getElementById('btn-cancel-set-pw').addEventListener('click', () => {
    document.getElementById('set-password-overlay').classList.remove('active');
  });

  document.getElementById('set-password-form').addEventListener('submit', async e => {
    e.preventDefault();
    const label    = document.getElementById('set-pw-username-label');
    const username = label.dataset.username;
    const newPw    = document.getElementById('sp-new').value;
    const confirm  = document.getElementById('sp-confirm').value;
    const errorEl  = document.getElementById('set-pw-error');
    errorEl.classList.add('hidden');

    if (newPw !== confirm) {
      errorEl.textContent = 'Passwords do not match.';
      errorEl.classList.remove('hidden');
      return;
    }
    if (newPw.length < 8) {
      errorEl.textContent = 'Password must be at least 8 characters.';
      errorEl.classList.remove('hidden');
      return;
    }
    await Auth.adminSetPassword(username, newPw);
    document.getElementById('set-password-overlay').classList.remove('active');
    alert(`Password for "${username}" has been updated.`);
  });

  // ── Edit user config screen ───────────────────────────────────────────────
  document.getElementById('btn-cancel-edit-cfg').addEventListener('click', () => {
    renderUserList();
    showScreen('screen-user-mgmt');
  });

  document.getElementById('btn-reset-to-default').addEventListener('click', () => {
    fetch('exercise-scripts/default-config.cfg')
      .then(r => r.text())
      .then(text => {
        editExercises     = JSON.parse(JSON.stringify(parseCfg(text)));
        editExerciseOrder = editExercises.map((_, i) => ({ idx: i, disabled: false }));
        renderEditExerciseList();
      })
      .catch(() => alert('Could not load the default config. Please check your connection.'));
  });

  document.getElementById('btn-save-user-cfg').addEventListener('click', () => {
    syncEditInputs();
    const anyEnabled = editExerciseOrder.some(e => !e.disabled);
    if (!anyEnabled) {
      alert('Please enable at least one exercise before saving.');
      return;
    }
    const fullName = document.getElementById('edit-cfg-fullname').value.trim();
    UserManager.setUserFullName(editingUsername, fullName);
    const cfgText = serializeCfg(editExercises, editExerciseOrder);
    UserManager.setUserConfig(editingUsername, cfgText);
    alert(`Config saved for "${editingUsername}".`);
    renderUserList();
    showScreen('screen-user-mgmt');
  });
});
