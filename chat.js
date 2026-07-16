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
    '#joan-chat header span{color:var(--text-soft,#a4a6b8);font-size:11px;}' +
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
    '<header><b>PROJECT ASSISTANT</b><span>answers from this documentation</span></header>' +
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

  async function ask(question, retriedAuth) {
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
          return ask(question, true);
        }
        add('jc-err', 'Passphrase required.');
        return;
      }
      if (resp.status === 404 || resp.status === 405 || resp.status === 501) {
        bubble.remove();
        add('jc-err', 'Chat is not available on this mirror of the site — use the Vercel deployment.');
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
