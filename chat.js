/* ============================================================
   Joan of the City — docs chat assistant widget.
   Floating 💬 button that opens a small panel; questions go to
   /api/chat (Vercel serverless function backed by Claude) and
   answers stream in. Knowledge = this documentation site only.

   Degrades gracefully: on hosts without the API (e.g. the GitHub
   Pages mirror) the panel explains where chat is available.
   ============================================================ */
(function () {
  // ---- UI ------------------------------------------------------------
  var css =
    '#joan-chat-btn{position:fixed;right:22px;bottom:22px;z-index:9998;width:52px;height:52px;' +
    'border-radius:50%;border:1px solid var(--border,#2a2d3a);background:var(--bg-elev,#1b1d28);' +
    'color:var(--text,#e8e9f0);font-size:22px;cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,.45);}' +
    '#joan-chat-btn:hover{transform:translateY(-2px);}' +
    '#joan-chat{position:fixed;right:22px;bottom:84px;z-index:9999;width:380px;max-width:calc(100vw - 44px);' +
    'height:520px;max-height:calc(100vh - 120px);display:none;flex-direction:column;' +
    'background:var(--bg-card,#15161f);border:1px solid var(--border,#2a2d3a);border-radius:14px;' +
    'box-shadow:0 18px 60px rgba(0,0,0,.55);overflow:hidden;font-size:14px;color:var(--text,#e8e9f0);}' +
    '#joan-chat header{padding:12px 16px;border-bottom:1px solid var(--border,#2a2d3a);display:flex;align-items:center;gap:8px;}' +
    '#joan-chat header b{color:var(--gold,#d4af6a);font-size:13px;letter-spacing:.4px;}' +
    '#joan-chat header span{color:var(--text-soft,#a4a6b8);font-size:11px;flex:1;}' +
    '#joan-chat-key{background:none;border:1px solid var(--border,#2a2d3a);border-radius:6px;color:var(--text-soft,#a4a6b8);' +
    'font-size:11px;cursor:pointer;padding:3px 8px;}' +
    '#joan-chat-settings{display:none;padding:10px 14px;border-bottom:1px solid var(--border,#2a2d3a);' +
    'font-size:12px;color:var(--text-soft,#a4a6b8);}' +
    '#joan-chat-settings label{display:flex;gap:6px;align-items:center;margin:4px 0;cursor:pointer;}' +
    '#joan-chat-settings input[type=password]{width:100%;margin-top:6px;background:var(--bg-soft,#11121a);' +
    'border:1px solid var(--border,#2a2d3a);border-radius:6px;color:var(--text,#e8e9f0);padding:7px 10px;font-size:12px;}' +
    '#joan-chat-settings .jc-save{margin-top:8px;background:var(--gold,#d4af6a);border:none;border-radius:6px;' +
    'color:#141414;font-weight:600;padding:5px 12px;cursor:pointer;font-size:12px;}' +
    '#joan-chat-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;}' +
    '.jc-msg{max-width:88%;padding:8px 12px;border-radius:10px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word;}' +
    '.jc-user{align-self:flex-end;background:var(--bg-elev,#1b1d28);border:1px solid var(--border,#2a2d3a);}' +
    '.jc-bot{align-self:flex-start;background:var(--bg-soft,#11121a);border:1px solid var(--border,#2a2d3a);}' +
    '.jc-err{align-self:center;color:#e07a7a;font-size:12px;}' +
    '#joan-chat form{display:flex;gap:8px;padding:12px;border-top:1px solid var(--border,#2a2d3a);}' +
    '#joan-chat input{flex:1;background:var(--bg-soft,#11121a);border:1px solid var(--border,#2a2d3a);' +
    'border-radius:8px;color:var(--text,#e8e9f0);padding:9px 12px;font-size:13px;outline:none;}' +
    '#joan-chat button[type=submit]{background:var(--gold,#d4af6a);border:none;border-radius:8px;' +
    'color:#141414;font-weight:600;padding:0 16px;cursor:pointer;font-size:13px;}' +
    '#joan-chat button[type=submit]:disabled{opacity:.45;cursor:default;}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var btn = document.createElement('button');
  btn.id = 'joan-chat-btn';
  btn.title = 'Ask about this project';
  btn.textContent = '💬';

  var panel = document.createElement('div');
  panel.id = 'joan-chat';
  panel.innerHTML =
    '<header><b>PROJECT ASSISTANT</b><span>answers from this documentation</span>' +
    '<button id="joan-chat-key" title="Choose whose API key answers are billed to">⚙ key</button></header>' +
    '<div id="joan-chat-settings">' +
    '<label><input type="radio" name="jc-mode" value="site"/> Use the site’s key (may need the team passphrase)</label>' +
    '<label><input type="radio" name="jc-mode" value="own"/> Use my own Anthropic API key (billed to me, stays in my browser)</label>' +
    '<div style="margin:2px 0 0 22px;"><a href="https://platform.claude.com/settings/keys" target="_blank" rel="noopener" ' +
    'style="color:var(--gold,#d4af6a);font-size:11px;">Create a key at platform.claude.com →</a></div>' +
    '<input type="password" id="joan-chat-ownkey" placeholder="sk-ant-… (stored only in this browser)"/>' +
    '<button class="jc-save" type="button">Save</button>' +
    '</div>' +
    '<div id="joan-chat-msgs"></div>' +
    '<form id="joan-chat-form"><input id="joan-chat-in" placeholder="Ask about Joan of the City…" ' +
    'maxlength="2000" autocomplete="off"/><button type="submit">Ask</button></form>';

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  var msgs = panel.querySelector('#joan-chat-msgs');
  var form = panel.querySelector('#joan-chat-form');
  var input = panel.querySelector('#joan-chat-in');
  var send = form.querySelector('button');
  var history = [];
  var greeted = false;

  // ---- key mode: 'site' (server pays) or 'own' (visitor's key, browser-direct) ----
  var settings = panel.querySelector('#joan-chat-settings');
  var keyBtn = panel.querySelector('#joan-chat-key');
  var ownKeyInput = panel.querySelector('#joan-chat-ownkey');
  function getMode() { return localStorage.getItem('joan-chat-mode') || 'site'; }
  function getOwnKey() { return localStorage.getItem('joan-chat-own-key') || ''; }

  keyBtn.addEventListener('click', function () {
    var open = settings.style.display === 'block';
    settings.style.display = open ? 'none' : 'block';
    if (!open) {
      var mode = getMode();
      settings.querySelectorAll('input[name=jc-mode]').forEach(function (r) {
        r.checked = r.value === mode;
      });
      ownKeyInput.value = getOwnKey();
    }
  });
  settings.querySelector('.jc-save').addEventListener('click', function () {
    var mode = (settings.querySelector('input[name=jc-mode]:checked') || {}).value || 'site';
    localStorage.setItem('joan-chat-mode', mode);
    var key = ownKeyInput.value.trim();
    if (mode === 'own') {
      if (!/^sk-ant-/.test(key)) {
        add('jc-err', 'That doesn’t look like an Anthropic API key (should start with sk-ant-…).');
        return;
      }
      localStorage.setItem('joan-chat-own-key', key);
    }
    settings.style.display = 'none';
    add('jc-bot', mode === 'own'
      ? 'Using your own API key — questions go straight from this browser to Anthropic and are billed to you.'
      : 'Using the site’s key.');
  });

  // ---- knowledge base for browser-direct mode ----
  var docsContext = null;
  async function loadContext() {
    if (docsContext) return docsContext;
    var r = await fetch('docs-context.json');
    if (!r.ok) throw new Error('context unavailable');
    docsContext = (await r.json()).context;
    return docsContext;
  }
  function systemPrompt(ctx) {
    return 'You are the documentation assistant for "Joan of the City", an augmented-reality ' +
      'opera built in Unity for XR glasses by Psychojelly. Visitors to the documentation ' +
      'site ask you questions about the project.\n\n' +
      'Rules:\n' +
      '- Answer ONLY from the documentation provided below. If the docs don\'t cover it, ' +
      'say so plainly and suggest which page comes closest — never invent details.\n' +
      '- Keep answers short and concrete; link pages by name (e.g. "see System Overview").\n' +
      '- Technical message contracts and credentials are deliberately not in these docs; ' +
      'if asked for them, say they live with the development team.\n' +
      '- Stay on topic. For questions unrelated to this project, say you only cover ' +
      'the Joan of the City documentation.\n\n' +
      'THE DOCUMENTATION:\n' + ctx;
  }

  btn.addEventListener('click', function () {
    var open = panel.style.display === 'flex';
    panel.style.display = open ? 'none' : 'flex';
    if (!open) {
      if (!greeted) {
        greeted = true;
        add('jc-bot', 'Hi — ask me anything about the Joan of the City project. My answers come from this documentation site.');
      }
      input.focus();
    }
  });

  function add(cls, text) {
    var d = document.createElement('div');
    d.className = 'jc-msg ' + cls;
    d.textContent = text;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = input.value.trim();
    if (!q || send.disabled) return;
    input.value = '';
    add('jc-user', q);
    ask(q);
  });

  function ask(question, retriedAuth) {
    if (getMode() === 'own' && getOwnKey()) return askDirect(question);
    return askServer(question, retriedAuth);
  }

  // ---- browser → Anthropic directly, with the visitor's own key ----------
  async function askDirect(question) {
    send.disabled = true;
    var bubble = add('jc-bot', '…');
    try {
      var ctx = await loadContext();
      var resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': getOwnKey(),
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-8',
          max_tokens: 2048,
          stream: true,
          system: [{ type: 'text', text: systemPrompt(ctx), cache_control: { type: 'ephemeral' } }],
          messages: history.concat([{ role: 'user', content: question }]),
        }),
      });

      if (resp.status === 401) {
        bubble.remove();
        add('jc-err', 'Your API key was rejected — check it under ⚙ key.');
        return;
      }
      if (resp.status === 429) {
        bubble.remove();
        add('jc-err', 'Your key is rate-limited — try again in a moment.');
        return;
      }
      if (!resp.ok || !resp.body) {
        bubble.remove();
        var detail = '';
        try { detail = (await resp.json()).error.message || ''; } catch (_) {}
        add('jc-err', 'Anthropic API error' + (detail ? ': ' + detail.slice(0, 140) : '.'));
        return;
      }

      // Anthropic SSE: content_block_delta events carry text_delta chunks.
      var reader = resp.body.getReader();
      var decoder = new TextDecoder();
      var buf = '';
      var answer = '';
      bubble.textContent = '';
      for (;;) {
        var chunk = await reader.read();
        if (chunk.done) break;
        buf += decoder.decode(chunk.value, { stream: true });
        var lines = buf.split('\n');
        buf = lines.pop();
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i];
          if (line.indexOf('data: ') !== 0) continue;
          try {
            var ev = JSON.parse(line.slice(6));
            if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') {
              answer += ev.delta.text;
              bubble.textContent = answer;
              msgs.scrollTop = msgs.scrollHeight;
            }
          } catch (_) { /* keepalives / partials */ }
        }
      }
      if (!answer) {
        bubble.remove();
        add('jc-err', 'No answer received — try again.');
        return;
      }
      history.push({ role: 'user', content: question });
      history.push({ role: 'assistant', content: answer });
      if (history.length > 12) history = history.slice(-12);
    } catch (err) {
      bubble.remove();
      add('jc-err', 'Could not reach Anthropic — check your connection and key (⚙ key).');
    } finally {
      send.disabled = false;
      input.focus();
    }
  }

  // ---- via the site's serverless function (site pays) ---------------------
  async function askServer(question, retriedAuth) {
    send.disabled = true;
    var bubble = add('jc-bot', '…');
    try {
      var headers = { 'Content-Type': 'application/json' };
      var code = localStorage.getItem('joan-chat-code');
      if (code) headers['x-chat-code'] = code;

      var resp = await fetch('/api/chat', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ question: question, history: history }),
      });

      if (resp.status === 401 && !retriedAuth) {
        bubble.remove();
        var entered = prompt('This assistant needs the team passphrase:');
        if (entered) {
          localStorage.setItem('joan-chat-code', entered);
          return askServer(question, true);
        }
        add('jc-err', 'Passphrase required — or click “⚙ key” to use your own API key instead.');
        return;
      }
      if (resp.status === 404 || resp.status === 405 || resp.status === 501) {
        bubble.remove();
        add('jc-err', 'This copy of the site has no chat server — click “⚙ key” and use your own Anthropic API key instead.');
        return;
      }
      if (resp.status === 429) {
        bubble.remove();
        add('jc-err', 'Slow down a little — try again in a minute.');
        return;
      }
      if (!resp.ok || !resp.body) {
        bubble.remove();
        add('jc-err', 'The assistant is unavailable right now.');
        return;
      }

      // Stream SSE lines: data: {"text": "..."} / {"done":true} / {"error": "..."}
      var reader = resp.body.getReader();
      var decoder = new TextDecoder();
      var buf = '';
      var answer = '';
      bubble.textContent = '';
      for (;;) {
        var chunk = await reader.read();
        if (chunk.done) break;
        buf += decoder.decode(chunk.value, { stream: true });
        var lines = buf.split('\n');
        buf = lines.pop();
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i];
          if (line.indexOf('data: ') !== 0) continue;
          try {
            var ev = JSON.parse(line.slice(6));
            if (ev.text) {
              answer += ev.text;
              bubble.textContent = answer;
              msgs.scrollTop = msgs.scrollHeight;
            } else if (ev.error) {
              bubble.remove();
              add('jc-err', ev.error);
              return;
            }
          } catch (_) { /* partial line — ignored */ }
        }
      }
      if (!answer) {
        bubble.remove();
        add('jc-err', 'No answer received — try again.');
        return;
      }
      history.push({ role: 'user', content: question });
      history.push({ role: 'assistant', content: answer });
      if (history.length > 12) history = history.slice(-12);
    } catch (err) {
      bubble.remove();
      add('jc-err', 'Could not reach the assistant (offline, or this mirror has no chat).');
    } finally {
      send.disabled = false;
      input.focus();
    }
  }
})();
