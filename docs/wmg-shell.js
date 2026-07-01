/* =============================================================================
   <wmg-shell> — shared WMG header/footer shell for the WM956-15 e-commerce games.
   Framework-agnostic. Drop into any game page:

     <script src="wmg-shell.js"></script>
     <wmg-shell game="Marketplace Tycoon" accent="#009DDC">
        ...your game markup...
     </wmg-shell>

   Attributes (all optional):
     game       Name of the current game. Omit on the hub (home) page.
     accent     Game accent colour (hex). Default WMG red #EE3124.
     category   Small uppercase category shown under the game name.
     module     Module label in the top bar. Default "WM956-15 · Enterprise eCommerce Solutions".
     hub-href   URL of the games hub for the "All games" link.
                Default "https://mgb9.github.io/ecommerce-games/".
     footer     "off" to hide the footer.

   Simpler-English support (shared behaviour for every game):
     The toggle in the bar flips every element marked data-normal <-> data-simple-copy
     across the page (hide/show), sets <html data-wmg-simpler="on|off">, persists the
     choice in localStorage, and dispatches a "wmg:simplerchange" event on document
     with detail { simpler:boolean } so games can react programmatically.
   ============================================================================= */
(function () {
  if (customElements.get('wmg-shell')) return;

  var LATO = 'https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,300;0,400;0,700;0,900;1,400&display=swap';
  var STORE_KEY = 'wmg-simpler';

  function ensureFont() {
    if (document.querySelector('link[data-wmg-font]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = LATO; l.setAttribute('data-wmg-font', '');
    document.head.appendChild(l);
  }

  // ---- shared page-level simpler-English application (runs on the document) ----
  function applySimpler(on) {
    document.documentElement.setAttribute('data-wmg-simpler', on ? 'on' : 'off');
    document.querySelectorAll('[data-normal]').forEach(function (el) { el.style.display = on ? 'none' : ''; });
    document.querySelectorAll('[data-simple-copy]').forEach(function (el) { el.style.display = on ? '' : 'none'; });
    try { localStorage.setItem(STORE_KEY, on ? '1' : '0'); } catch (e) {}
    document.dispatchEvent(new CustomEvent('wmg:simplerchange', { detail: { simpler: on } }));
  }
  function initialSimpler() {
    try { return localStorage.getItem(STORE_KEY) === '1'; } catch (e) { return false; }
  }

  class WmgShell extends HTMLElement {
    static get observedAttributes() { return ['game', 'accent', 'category', 'module', 'hub-href', 'footer']; }

    connectedCallback() {
      ensureFont();
      this._simpler = initialSimpler();
      this.render();
      // apply any stored preference to the whole page once mounted
      requestAnimationFrame(function () { applySimpler(this._simpler); }.bind(this));
    }
    attributeChangedCallback() { if (this.shadowRoot) this.render(); }

    render() {
      var game = this.getAttribute('game') || '';
      var accent = this.getAttribute('accent') || '#EE3124';
      var category = this.getAttribute('category') || '';
      var module = this.getAttribute('module') || 'WM956-15 · Enterprise eCommerce Solutions';
      var hub = this.getAttribute('hub-href') || 'https://mgb9.github.io/ecommerce-games/';
      var showFooter = this.getAttribute('footer') !== 'off';
      var isGame = !!game;
      var on = this._simpler;

      var root = this.shadowRoot || this.attachShadow({ mode: 'open' });
      root.innerHTML =
        '<style>' +
        ':host{display:block;font-family:"Lato","Helvetica Neue",Arial,sans-serif;color:#211F25;}' +
        '*{box-sizing:border-box;}' +
        'a{text-decoration:none;color:inherit;}' +
        '.bar{position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;gap:20px;' +
          'padding:12px 6vw;background:#211F25;border-bottom:1px solid rgba(255,255,255,.09);}' +
        '.left{display:flex;align-items:center;gap:18px;min-width:0;}' +
        '.mark{display:flex;align-items:center;gap:11px;}' +
        '.dots{display:grid;grid-template-columns:1fr 1fr;gap:3px;}' +
        '.dots span{width:11px;height:11px;display:block;}' +
        '.wm{font-weight:900;font-size:22px;letter-spacing:1px;color:#fff;line-height:1;}' +
        '.desc{font-size:8px;letter-spacing:1.6px;text-transform:uppercase;color:#9a9a9e;margin-top:3px;}' +
        '.sep{width:1px;height:30px;background:rgba(255,255,255,.16);}' +
        '.back{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;color:#c7c7ca;' +
          'border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:7px 14px;transition:background .15s,color .15s;}' +
        '.back:hover{background:rgba(255,255,255,.1);color:#fff;}' +
        '.mod{font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#c7c7ca;' +
          'border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:6px 13px;white-space:nowrap;}' +
        '.right{display:flex;align-items:center;gap:24px;}' +
        '.game{display:flex;align-items:center;gap:11px;}' +
        '.gdot{width:12px;height:12px;border-radius:3px;flex:none;}' +
        '.gname{font-weight:900;font-size:16px;letter-spacing:-.2px;color:#fff;line-height:1.05;white-space:nowrap;}' +
        '.gcat{font-size:9px;font-weight:900;letter-spacing:1.4px;text-transform:uppercase;margin-top:2px;}' +
        '.toggle{display:inline-flex;align-items:center;gap:9px;background:none;border:0;cursor:pointer;font-family:inherit;padding:0;}' +
        '.tlabel{font-size:12px;font-weight:700;letter-spacing:.4px;color:#fff;white-space:nowrap;}' +
        '.track{width:38px;height:22px;border-radius:999px;position:relative;transition:background .2s;flex:none;display:inline-block;}' +
        '.knob{position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .2s;}' +
        '.foot{display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;' +
          'padding:26px 6vw;background:#211F25;}' +
        '.foot .a{font-size:13.5px;color:#c7c7ca;}' +
        '.foot .a b{color:#fff;}' +
        '.foot .b{font-size:12px;color:#8d8d91;}' +
        '@media(max-width:820px){.mod,.desc,.gcat{display:none;}.tlabel{display:none;}.right{gap:14px;}}' +
        '</style>' +

        '<header class="bar">' +
          '<div class="left">' +
            '<a class="mark" href="' + hub + '" aria-label="WMG home">' +
              '<span class="dots"><span style="background:#C1D82F"></span><span style="background:#EE3124"></span>' +
                '<span style="background:#009DDC"></span><span style="background:#FBB034"></span></span>' +
              '<span><span class="wm">WMG</span><span class="desc">The University of Warwick</span></span>' +
            '</a>' +
            (isGame
              ? '<span class="sep"></span><a class="back" href="' + hub + '">&larr; All games</a>'
              : '<span class="sep"></span><span class="mod">' + module + '</span>') +
          '</div>' +
          '<div class="right">' +
            (isGame
              ? '<span class="game"><span class="gdot" style="background:' + accent + '"></span>' +
                  '<span><span class="gname">' + game + '</span>' +
                  (category ? '<span class="gcat" style="display:block;color:' + accent + '">' + category + '</span>' : '') +
                  '</span></span>'
              : '') +
            '<button class="toggle" part="toggle" aria-pressed="' + (on ? 'true' : 'false') + '" title="Toggle Simpler English">' +
              '<span class="tlabel">Simpler English</span>' +
              '<span class="track" style="background:' + (on ? '#EE3124' : '#6D6E71') + '">' +
                '<span class="knob" style="transform:' + (on ? 'translateX(16px)' : 'none') + '"></span>' +
              '</span>' +
            '</button>' +
          '</div>' +
        '</header>' +

        '<slot></slot>' +

        (showFooter
          ? '<footer class="foot">' +
              '<div class="a">Built for teaching by <b>Mark Bonnett</b> · WMG, University of Warwick</div>' +
              '<div class="b">Each game runs entirely in your browser — nothing is sent anywhere.</div>' +
            '</footer>'
          : '');

      var btn = root.querySelector('.toggle');
      btn.addEventListener('click', function () {
        this._simpler = !this._simpler;
        var track = root.querySelector('.track');
        var knob = root.querySelector('.knob');
        track.style.background = this._simpler ? '#EE3124' : '#6D6E71';
        knob.style.transform = this._simpler ? 'translateX(16px)' : 'none';
        btn.setAttribute('aria-pressed', this._simpler ? 'true' : 'false');
        applySimpler(this._simpler);
      }.bind(this));
    }
  }

  customElements.define('wmg-shell', WmgShell);
})();
