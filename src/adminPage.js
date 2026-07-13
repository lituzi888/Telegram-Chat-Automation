export function renderAdminPage() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AI智能聊天客服</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, "Microsoft YaHei", sans-serif; color: #172026; background: #f5f7fa; }
    header { height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 18px; background: #18212b; color: #fff; }
    header h1 { margin: 0; font-size: 18px; }
    header span { color: #c8d1dc; font-size: 13px; }
    main { display: grid; grid-template-columns: 340px 1fr 380px; height: calc(100vh - 56px); min-height: 640px; }
    aside, section { min-width: 0; background: #fff; border-right: 1px solid #dce2e8; }
    aside { display: flex; flex-direction: column; overflow: hidden; }
    .panel-title { min-height: 48px; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 14px; border-bottom: 1px solid #e8edf2; font-weight: 700; }
    .toolbar { display: grid; grid-template-columns: 1fr 110px; gap: 8px; padding: 10px; border-bottom: 1px solid #e8edf2; }
    input, textarea, select { width: 100%; border: 1px solid #cdd6df; border-radius: 6px; padding: 9px 10px; font: inherit; background: #fff; }
    textarea { resize: vertical; min-height: 78px; }
    button { border: 0; border-radius: 6px; padding: 9px 12px; background: #1769e0; color: #fff; cursor: pointer; font-weight: 700; white-space: nowrap; }
    button.secondary { background: #e8edf2; color: #172026; }
    button.danger { background: #cc3d3d; color: #fff; }
    button.ghost { background: transparent; color: #1769e0; padding: 6px 8px; }
    button:disabled { opacity: .55; cursor: not-allowed; }
    .contacts { flex: 1; min-height: 0; overflow-y: scroll; overflow-x: hidden; scrollbar-gutter: stable; }
    .contact { padding: 12px 14px; border-bottom: 1px solid #eef2f5; cursor: pointer; }
    .contact.active { background: #eaf2ff; }
    .contact strong { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 5px; }
    .contact small { color: #6b7785; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .muted { color: #718096; font-size: 12px; }
    .badges { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
    .badge { font-size: 12px; padding: 3px 7px; border-radius: 999px; background: #edf2f7; color: #52606d; }
    .badge.warn { background: #fff3d6; color: #8a5a00; }
    .badge.stop { background: #ffe0e0; color: #9b2d2d; }
    .chat { display: flex; flex-direction: column; background: #eef5ef; }
    .messages { flex: 1; overflow: auto; padding: 18px; }
    .empty { color: #718096; text-align: center; padding: 50px 10px; }
    .bubble { max-width: 72%; margin: 8px 0; padding: 10px 12px; border-radius: 8px; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.08); white-space: pre-wrap; line-height: 1.45; }
    .bubble.out { margin-left: auto; background: #d9f7c7; }
    .meta { margin-top: 5px; font-size: 11px; color: #718096; }
    .composer { padding: 12px; background: #fff; border-top: 1px solid #dce2e8; display: grid; gap: 8px; }
    .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .right { overflow: auto; padding-bottom: 20px; }
    .contacts, .messages, .right { scrollbar-color: #8c949d #eef2f5; scrollbar-width: auto; }
    .contacts::-webkit-scrollbar, .messages::-webkit-scrollbar, .right::-webkit-scrollbar { width: 10px; height: 10px; }
    .contacts::-webkit-scrollbar-track, .messages::-webkit-scrollbar-track, .right::-webkit-scrollbar-track { background: #eef2f5; }
    .contacts::-webkit-scrollbar-thumb, .messages::-webkit-scrollbar-thumb, .right::-webkit-scrollbar-thumb { background: #8c949d; border-radius: 999px; border: 2px solid #eef2f5; }
    .contacts::-webkit-scrollbar-thumb:hover, .messages::-webkit-scrollbar-thumb:hover, .right::-webkit-scrollbar-thumb:hover { background: #6f7780; }
    .card { padding: 14px; border-bottom: 1px solid #e8edf2; }
    .card h2 { font-size: 15px; margin: 0 0 12px; }
    .form-grid { display: grid; gap: 10px; }
    .rules { display: grid; gap: 8px; }
    .rule { display: grid; gap: 7px; padding: 10px; border: 1px solid #e3e9ef; border-radius: 6px; }
    label { display: grid; gap: 5px; font-size: 13px; color: #52606d; }
    .switch { display: flex; align-items: center; gap: 8px; color: #172026; }
    .switch input { width: auto; }
    .danger-zone { border: 1px solid #ffd5d5; background: #fff8f8; border-radius: 6px; padding: 10px; }
    @media (max-width: 1100px) {
      main { grid-template-columns: 300px 1fr; }
      .right { display: none; }
    }
  </style>
</head>
<body>
  <header>
    <h1>开发者：@PHP74</h1>
    <span id="stats">加载中</span>
  </header>
  <main>
    <aside>
      <div class="panel-title">
        <span>聊天列表</span>
        <button class="ghost" id="refreshAllBtn">刷新</button>
      </div>
      <div class="toolbar">
        <input id="search" placeholder="搜索用户名、标签、ID">
        <select id="statusFilter">
          <option value="all">全部</option>
          <option value="normal">正常</option>
          <option value="takeover">人工接管</option>
          <option value="blocked">黑名单</option>
        </select>
      </div>
      <div class="contacts" id="contacts"></div>
    </aside>

    <section class="chat">
      <div class="panel-title">
        <span id="chatTitle">请选择聊天</span>
        <span class="row">
          <button class="secondary" id="clearCurrentBtn">清空当前记录</button>
        </span>
      </div>
      <div class="messages" id="messages"><div class="empty">请选择左侧聊天查看记录</div></div>
      <div class="composer">
        <textarea id="replyText" placeholder="输入人工回复内容，Ctrl + Enter 发送"></textarea>
        <div class="row">
          <button id="sendBtn">发送</button>
          <button class="secondary" id="refreshBtn">刷新当前</button>
        </div>
      </div>
    </section>

    <aside class="right">
      <div class="card">
        <h2>聊天状态</h2>
        <div class="form-grid">
          <label>标签 <input id="tagInput" placeholder="朋友 / 熟人 / 重要 / 忽略"></label>
          <label>备注 <textarea id="noteInput" placeholder="对方习惯、聊天偏好、需要记住的信息"></textarea></label>
          <label class="switch"><input type="checkbox" id="takeoverInput"> 人工接管，暂停 AI 自动聊天</label>
          <label class="switch"><input type="checkbox" id="blockedInput"> 黑名单，不自动回复</label>
          <button id="saveContactBtn">保存聊天状态</button>
          <div class="danger-zone form-grid">
            <button class="danger" id="deleteContactBtn">删除当前聊天</button>
            <button class="danger" id="clearAllMessagesBtn">清空全部聊天记录</button>
            <button class="danger" id="clearAllContactsBtn">一键删除聊天列表</button>
          </div>
        </div>
      </div>

      <div class="card">
        <h2>AI 角色配置</h2>
        <div class="form-grid">
          <label>角色设定 <textarea id="AI_PERSONA"></textarea></label>
          <label>聊天设定 <textarea id="AI_PRODUCT_INFO"></textarea></label>
          <label>边界规则 <textarea id="AI_PRICE_RULES"></textarea></label>
          <label>说话风格 <textarea id="AI_REPLY_STYLE"></textarea></label>
          <label>失败兜底 <textarea id="AI_FALLBACK_REPLY"></textarea></label>
          <div class="row">
            <button id="saveSettingsBtn">保存 AI 配置</button>
            <button class="secondary" id="resetSettingsBtn">恢复默认陪聊配置</button>
          </div>
        </div>
      </div>

      <div class="card">
        <h2>关键词规则</h2>
        <div class="form-grid">
          <input id="ruleKeyword" placeholder="关键词">
          <textarea id="ruleReply" placeholder="固定回复内容"></textarea>
          <input id="rulePriority" type="number" value="100" placeholder="优先级">
          <button id="addRuleBtn">添加规则</button>
        </div>
        <div class="rules" id="rules"></div>
      </div>
    </aside>
  </main>

  <script>
    let selectedContact = null;
    let contacts = [];

    const api = (path, options = {}) => fetch('/api/admin' + path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    }).then(async (res) => {
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    });

    const fmt = (date) => date ? new Date(date).toLocaleString('zh-CN', { hour12: false }) : '';
    const nameOf = (c) => c.username ? '@' + c.username : [c.firstName, c.lastName].filter(Boolean).join(' ') || c.telegramUserId;

    function resetChatSelection() {
      selectedContact = null;
      document.getElementById('chatTitle').textContent = '请选择聊天';
      document.getElementById('messages').innerHTML = '<div class="empty">请选择左侧聊天查看记录</div>';
      document.getElementById('tagInput').value = '';
      document.getElementById('noteInput').value = '';
      document.getElementById('takeoverInput').checked = false;
      document.getElementById('blockedInput').checked = false;
    }

    async function loadStats() {
      const stats = await api('/stats');
      document.getElementById('stats').textContent = '聊天 ' + stats.contacts + ' / 消息 ' + stats.messages + ' / 接管 ' + stats.humanTakeover + ' / 黑名单 ' + stats.blocked;
    }

    async function loadContacts() {
      const q = document.getElementById('search').value.trim();
      const status = document.getElementById('statusFilter').value;
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (status !== 'all') params.set('status', status);
      contacts = await api('/contacts' + (params.toString() ? '?' + params.toString() : ''));
      const list = document.getElementById('contacts');
      list.innerHTML = contacts.length ? contacts.map((c) => {
        const last = c.messages?.[0];
        return '<div class="contact ' + (selectedContact?.id === c.id ? 'active' : '') + '" data-id="' + c.id + '">' +
          '<strong><span>' + escapeHtml(nameOf(c)) + '</span><span class="muted">' + (c._count?.messages || 0) + '</span></strong>' +
          '<small>' + escapeHtml(last?.text || '暂无消息') + '</small>' +
          '<small>' + escapeHtml(fmt(last?.createdAt)) + '</small>' +
          '<div class="badges">' +
          (c.tag ? '<span class="badge">' + escapeHtml(c.tag) + '</span>' : '') +
          (c.isHumanTakeover ? '<span class="badge warn">人工接管</span>' : '') +
          (c.isBlocked ? '<span class="badge stop">黑名单</span>' : '') +
          '</div></div>';
      }).join('') : '<div class="empty">暂无聊天</div>';
    }

    async function selectContact(id) {
      selectedContact = contacts.find((c) => c.id === id);
      if (!selectedContact) return;
      document.getElementById('chatTitle').textContent = nameOf(selectedContact);
      document.getElementById('tagInput').value = selectedContact.tag || '';
      document.getElementById('noteInput').value = selectedContact.note || '';
      document.getElementById('takeoverInput').checked = selectedContact.isHumanTakeover;
      document.getElementById('blockedInput').checked = selectedContact.isBlocked;
      await loadContacts();
      await loadMessages();
    }

    async function loadMessages() {
      if (!selectedContact) return;
      const messages = await api('/contacts/' + selectedContact.id + '/messages');
      const el = document.getElementById('messages');
      el.innerHTML = messages.length ? messages.map((m) => '<div class="bubble ' + (m.direction === 'OUTBOUND' ? 'out' : '') + '">' +
        escapeHtml(m.text) + '<div class="meta">' + m.direction + ' · ' + fmt(m.createdAt) + '</div></div>').join('') : '<div class="empty">暂无聊天记录</div>';
      el.scrollTop = el.scrollHeight;
    }

    async function sendReply() {
      if (!selectedContact) return alert('请先选择聊天');
      const text = document.getElementById('replyText').value.trim();
      if (!text) return;
      await api('/contacts/' + selectedContact.id + '/reply', { method: 'POST', body: JSON.stringify({ text }) });
      document.getElementById('replyText').value = '';
      await Promise.all([loadMessages(), loadContacts(), loadStats()]);
    }

    async function saveContact() {
      if (!selectedContact) return alert('请先选择聊天');
      selectedContact = await api('/contacts/' + selectedContact.id, {
        method: 'PATCH',
        body: JSON.stringify({
          tag: document.getElementById('tagInput').value.trim() || null,
          note: document.getElementById('noteInput').value.trim() || null,
          isHumanTakeover: document.getElementById('takeoverInput').checked,
          isBlocked: document.getElementById('blockedInput').checked
        })
      });
      await Promise.all([loadContacts(), loadStats()]);
    }

    async function clearCurrentMessages() {
      if (!selectedContact) return alert('请先选择聊天');
      if (!confirm('确定清空当前聊天记录？')) return;
      await api('/contacts/' + selectedContact.id + '/messages', { method: 'DELETE' });
      await Promise.all([loadMessages(), loadContacts(), loadStats()]);
    }

    async function clearAllMessages() {
      if (!confirm('确定清空全部聊天记录？标签和备注会保留。')) return;
      await api('/messages', { method: 'DELETE' });
      await Promise.all([loadMessages(), loadContacts(), loadStats()]);
    }

    async function clearAllContacts() {
      const first = confirm('确定一键删除全部聊天列表？这会删除所有聊天对象和聊天记录。');
      if (!first) return;
      const second = prompt('请输入 DELETE 确认删除全部聊天列表');
      if (second !== 'DELETE') return alert('已取消');
      await api('/contacts', { method: 'DELETE' });
      resetChatSelection();
      await Promise.all([loadContacts(), loadStats()]);
    }

    async function deleteContact() {
      if (!selectedContact) return alert('请先选择聊天');
      if (!confirm('确定删除当前聊天和全部记录？')) return;
      await api('/contacts/' + selectedContact.id, { method: 'DELETE' });
      resetChatSelection();
      await Promise.all([loadContacts(), loadStats()]);
    }

    async function loadSettings() {
      const settings = await api('/settings');
      Object.entries(settings).forEach(([key, value]) => {
        const el = document.getElementById(key);
        if (el) el.value = value || '';
      });
    }

    async function saveSettings() {
      const keys = ['AI_PERSONA', 'AI_PRODUCT_INFO', 'AI_PRICE_RULES', 'AI_REPLY_STYLE', 'AI_FALLBACK_REPLY'];
      const body = Object.fromEntries(keys.map((key) => [key, document.getElementById(key).value]));
      await api('/settings', { method: 'PUT', body: JSON.stringify(body) });
      alert('AI 配置已保存');
    }

    async function resetSettings() {
      if (!confirm('确定恢复默认陪聊配置？当前 AI 配置会被覆盖。')) return;
      const settings = await api('/settings/reset', { method: 'POST' });
      Object.entries(settings).forEach(([key, value]) => {
        const el = document.getElementById(key);
        if (el) el.value = value || '';
      });
      alert('已恢复默认陪聊配置');
    }

    async function loadRules() {
      const rules = await api('/rules');
      document.getElementById('rules').innerHTML = rules.map((r) => '<div class="rule">' +
        '<strong>' + escapeHtml(r.keyword) + '</strong>' +
        '<small>' + escapeHtml(r.reply) + '</small>' +
        '<small>优先级：' + r.priority + ' · ' + (r.enabled ? '启用' : '停用') + '</small>' +
        '<div class="row"><button class="secondary" data-toggle="' + r.id + '">' + (r.enabled ? '停用' : '启用') + '</button>' +
        '<button class="secondary" data-edit="' + r.id + '">编辑</button>' +
        '<button class="danger" data-delete="' + r.id + '">删除</button></div></div>').join('');
      document.querySelectorAll('[data-toggle]').forEach((btn) => btn.onclick = () => toggleRule(btn.dataset.toggle, rules));
      document.querySelectorAll('[data-edit]').forEach((btn) => btn.onclick = () => editRule(btn.dataset.edit, rules));
      document.querySelectorAll('[data-delete]').forEach((btn) => btn.onclick = () => deleteRule(btn.dataset.delete));
    }

    async function addRule() {
      await api('/rules', {
        method: 'POST',
        body: JSON.stringify({
          keyword: document.getElementById('ruleKeyword').value,
          reply: document.getElementById('ruleReply').value,
          priority: document.getElementById('rulePriority').value,
          enabled: true
        })
      });
      document.getElementById('ruleKeyword').value = '';
      document.getElementById('ruleReply').value = '';
      await loadRules();
    }

    async function toggleRule(id, rules) {
      const rule = rules.find((r) => r.id === id);
      await api('/rules/' + id, { method: 'PATCH', body: JSON.stringify({ enabled: !rule.enabled }) });
      await loadRules();
    }

    async function editRule(id, rules) {
      const rule = rules.find((r) => r.id === id);
      const keyword = prompt('关键词', rule.keyword);
      if (keyword === null) return;
      const reply = prompt('回复内容', rule.reply);
      if (reply === null) return;
      const priority = prompt('优先级', String(rule.priority));
      if (priority === null) return;
      await api('/rules/' + id, { method: 'PATCH', body: JSON.stringify({ keyword, reply, priority }) });
      await loadRules();
    }

    async function deleteRule(id) {
      if (!confirm('确定删除这条规则？')) return;
      await api('/rules/' + id, { method: 'DELETE' });
      await loadRules();
    }

    function escapeHtml(value) {
      return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    }

    document.getElementById('contacts').onclick = (event) => {
      const item = event.target.closest('.contact');
      if (item) selectContact(item.dataset.id);
    };
    document.getElementById('search').oninput = () => loadContacts();
    document.getElementById('statusFilter').onchange = () => loadContacts();
    document.getElementById('replyText').onkeydown = (event) => {
      if (event.ctrlKey && event.key === 'Enter') sendReply();
    };
    document.getElementById('sendBtn').onclick = sendReply;
    document.getElementById('refreshBtn').onclick = () => { loadContacts(); loadMessages(); loadStats(); };
    document.getElementById('refreshAllBtn').onclick = () => { loadContacts(); loadMessages(); loadStats(); };
    document.getElementById('saveContactBtn').onclick = saveContact;
    document.getElementById('clearCurrentBtn').onclick = clearCurrentMessages;
    document.getElementById('clearAllMessagesBtn').onclick = clearAllMessages;
    document.getElementById('clearAllContactsBtn').onclick = clearAllContacts;
    document.getElementById('deleteContactBtn').onclick = deleteContact;
    document.getElementById('saveSettingsBtn').onclick = saveSettings;
    document.getElementById('resetSettingsBtn').onclick = resetSettings;
    document.getElementById('addRuleBtn').onclick = addRule;

    Promise.all([loadStats(), loadContacts(), loadSettings(), loadRules()]);
    setInterval(() => { loadStats(); loadContacts(); if (selectedContact) loadMessages(); }, 5000);
  </script>
</body>
</html>`;
}
