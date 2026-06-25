/* ============================================================
   Joan of the City — shared sidebar, TOC, scroll-spy & search.
   One source of truth for navigation across every page.
   ============================================================ */
(function () {
  // ---- Site navigation model ----
  var NAV = [
    {
      label: 'Documentation',
      items: [
        { title: 'Story Overview',  href: 'index.html', children: [
          { title: 'Story Overview', href: 'index.html#story' },
          { title: 'Pillars', href: 'index.html#pillars' },
          { title: 'The Scenes', href: 'index.html#structure' },
        ]},
        { title: 'System Overview', href: 'system-overview.html', children: [
          { title: 'Architecture at a glance', href: 'system-overview.html#philosophy' },
          { title: 'The Subsystems', href: 'system-overview.html#systems' },
          { title: 'Cueing & STOP ALL', href: 'system-overview.html#events' },
          { title: 'Technical priorities', href: 'system-overview.html#data-flow' },
          { title: 'Open questions', href: 'system-overview.html#folders' },
        ]},
      ]
    },
    {
      label: 'Setup & Operation',
      items: [
        { title: 'System Set Up', href: 'system-setup.html', children: [
          { title: 'Prerequisites', href: 'system-setup.html#prerequisites' },
          { title: 'Running a Local Test', href: 'system-setup.html#local-test' },
          { title: 'Larger System Set Up', href: 'system-setup.html#larger-system' },
        ]},
        { title: 'Cues', href: 'cues.html', children: [
          { title: 'Overview', href: 'cues.html#cues-overview' },
          { title: 'Editing & Cueing System', href: 'cues.html#cue-editing' },
        ]},
      ]
    },
    {
      label: 'Reference',
      items: [
        { title: 'Assets Documentation', href: 'assets.html', children: [
          { title: 'The asset pipeline', href: 'assets.html#pipeline' },
          { title: 'Formats & budgets', href: 'assets.html#formats' },
          { title: 'Naming conventions', href: 'assets.html#naming' },
          { title: 'Visual language', href: 'assets.html#visual-language' },
        ]},
        { title: 'Resources', href: 'resources.html', children: [
          { title: 'Glossary', href: 'resources.html#glossary' },
          { title: 'Contributing & reviews', href: 'resources.html#contributing' },
          { title: 'Tools & links', href: 'resources.html#tools' },
          { title: 'Who to ask', href: 'resources.html#contacts' },
          { title: 'Open items & PM', href: 'resources.html#open-items' },
        ]},
      ]
    }
  ];

  // Ordered flat list for prev/next page navigation
  var ORDER = [
    { title: 'Story Overview',        href: 'index.html' },
    { title: 'System Overview',       href: 'system-overview.html' },
    { title: 'System Set Up',         href: 'system-setup.html' },
    { title: 'Cues',                  href: 'cues.html' },
    { title: 'Assets Documentation',  href: 'assets.html' },
    { title: 'Resources',             href: 'resources.html' },
  ];

  function currentFile() {
    var f = location.pathname.split('/').pop();
    return f && f.length ? f : 'index.html';
  }
  var here = currentFile();
  function fileOf(href) { return href.split('#')[0]; }

  // ---- Build sidebar ----
  var sidebar = document.getElementById('sidebar');
  if (sidebar) {
    var html = '';
    html += '<a class="brand" href="index.html">' +
              '<div class="brand-mark">J</div>' +
              '<div class="brand-text"><h1>Joan of the City</h1><span>Design &amp; Tech Docs</span></div>' +
            '</a>';
    html += '<div class="search-box">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
              '<input type="text" id="search" placeholder="Search documentation…" />' +
            '</div>';

    NAV.forEach(function (group) {
      html += '<div class="nav-group"><div class="nav-label">' + group.label + '</div>';
      group.items.forEach(function (item) {
        var isActive = fileOf(item.href) === here;
        html += '<a href="' + item.href + '"' + (isActive ? ' class="active"' : '') + '>' + item.title + '</a>';
        if (item.children && isActive) {
          html += '<div class="nav-sub">';
          item.children.forEach(function (c) {
            html += '<a href="' + c.href + '" data-anchor="' + (c.href.split('#')[1] || '') + '">' + c.title + '</a>';
          });
          html += '</div>';
        }
      });
      html += '</div>';
    });

    html += '<div class="sidebar-foot">' +
              '<div class="status-pill"><span class="status-dot"></span> Living document · v0.4</div>' +
              '<div style="margin-top:8px">Maintained by Psychojelly</div>' +
              '<button class="theme-toggle" id="themeToggle" aria-label="Toggle colour theme"></button>' +
            '</div>';
    sidebar.innerHTML = html;
  }

  // ---- Theme toggle (persisted in localStorage) ----
  (function () {
    var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
    var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
    function current() {
      try { return localStorage.getItem('joan-theme') === 'light' ? 'light' : 'dark'; } catch (e) { return 'dark'; }
    }
    function apply(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      try { localStorage.setItem('joan-theme', theme); } catch (e) {}
      var btn = document.getElementById('themeToggle');
      if (btn) btn.innerHTML = (theme === 'light' ? MOON + '<span>Dark mode</span>' : SUN + '<span>Light mode</span>');
    }
    apply(current());
    var btn = document.getElementById('themeToggle');
    if (btn) btn.addEventListener('click', function () { apply(current() === 'light' ? 'dark' : 'light'); });
  })();

  // ---- Mobile menu button + scrim (injected once) ----
  var menuBtn = document.createElement('button');
  menuBtn.className = 'menu-btn';
  menuBtn.setAttribute('aria-label', 'Toggle menu');
  menuBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
  var scrim = document.createElement('div');
  scrim.className = 'scrim';
  document.body.appendChild(menuBtn);
  document.body.appendChild(scrim);
  function closeMenu() { sidebar && sidebar.classList.remove('open'); scrim.classList.remove('show'); }
  menuBtn.addEventListener('click', function () { sidebar && sidebar.classList.toggle('open'); scrim.classList.toggle('show'); });
  scrim.addEventListener('click', closeMenu);
  if (sidebar) sidebar.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeMenu); });

  // ---- Build right-hand TOC from h2 sections ----
  var toc = document.getElementById('toc');
  var sections = Array.prototype.slice.call(document.querySelectorAll('main section[id]'));
  if (toc) {
    sections.forEach(function (sec) {
      var h2 = sec.querySelector('h2');
      if (!h2) return;
      var a = document.createElement('a');
      a.href = '#' + sec.id;
      a.textContent = h2.textContent;
      a.dataset.id = sec.id;
      toc.appendChild(a);
    });
  }

  // ---- Prev / next page links ----
  var pageNavHost = document.getElementById('pageNav');
  if (pageNavHost) {
    var idx = ORDER.findIndex(function (p) { return p.href === here; });
    var prev = idx > 0 ? ORDER[idx - 1] : null;
    var next = idx >= 0 && idx < ORDER.length - 1 ? ORDER[idx + 1] : null;
    var pn = '';
    if (prev) pn += '<a href="' + prev.href + '"><span>← Previous</span><b>' + prev.title + '</b></a>';
    else pn += '<span style="flex:1"></span>';
    if (next) pn += '<a class="next" href="' + next.href + '"><span>Next →</span><b>' + next.title + '</b></a>';
    pageNavHost.innerHTML = pn;
  }

  // ---- Scroll spy (TOC + sidebar sub-nav) ----
  var tocLinks = toc ? Array.prototype.slice.call(toc.querySelectorAll('a')) : [];
  var subLinks = sidebar ? Array.prototype.slice.call(sidebar.querySelectorAll('.nav-sub a')) : [];
  function setActive(id) {
    tocLinks.forEach(function (l) { l.classList.toggle('active', l.dataset.id === id); });
    subLinks.forEach(function (l) { l.classList.toggle('active', l.dataset.anchor === id); });
  }
  if (sections.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (s) { observer.observe(s); });
  }

  // ---- Sidebar search filter ----
  var search = document.getElementById('search');
  if (search) {
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      document.querySelectorAll('.nav-group').forEach(function (group) {
        var anyVisible = false;
        group.querySelectorAll('a').forEach(function (a) {
          if (a.parentElement && a.parentElement.classList.contains('nav-sub')) return;
          var match = a.textContent.toLowerCase().indexOf(q) !== -1;
          a.style.display = match ? '' : 'none';
          if (match) anyVisible = true;
        });
        group.style.display = anyVisible ? '' : 'none';
      });
    });
  }
})();
