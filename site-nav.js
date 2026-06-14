/* Unified site navigation — inject an identical bar on every page and mark the
   current page active. Include with: <script defer src="site-nav.js"></script> */
(function () {
  "use strict";
  var ITEMS = [
    { href: "cottonwood-map.html", alt: "cottonwood-map-mobile.html", ic: "🗺️", label: "Map" },
    { href: "land-divisions.html", alt: "land-divisions-mobile.html", ic: "📖", label: "How the land was divided" },
    { href: "dls-history.html", alt: "dls-history-mobile.html", ic: "📜", label: "The making of the grid" }
  ];
  var here = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  var css = ''
    + '.site-nav{position:fixed;top:0;left:0;right:0;z-index:1200;height:40px;display:flex;'
    + 'align-items:center;justify-content:space-between;gap:10px;padding:0 14px;'
    + 'background:rgba(247,240,225,.95);border-bottom:1px solid #8b5a2b;'
    + '-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);'
    + 'font-family:Georgia,"Times New Roman",serif;box-sizing:border-box;}'
    + '.site-nav .sn-brand{font-variant:small-caps;letter-spacing:.5px;font-weight:bold;'
    + 'color:#5c3a1e;text-decoration:none;font-size:15px;white-space:nowrap;}'
    + '.site-nav .sn-links{display:flex;gap:6px;align-items:center;}'
    + '.site-nav .sn-link{text-decoration:none;color:#5c3a1e;font-size:13px;padding:5px 10px;'
    + 'border-radius:6px;white-space:nowrap;border:1px solid transparent;display:inline-flex;align-items:center;gap:6px;}'
    + '.site-nav a.sn-link:hover{background:#efe0c4;}'
    + '.site-nav .sn-link.active{background:#8b5a2b;color:#fff8ee;font-weight:bold;}'
    + '.site-nav .sn-ic{font-size:14px;line-height:1;}'
    + 'html.has-site-nav #progress{top:40px;}'
    + '@media (max-width:680px){.site-nav .sn-link .sn-label{display:none;}'
    + '.site-nav .sn-link{padding:6px 9px;}.site-nav .sn-brand .sn-co{display:none;}}';
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  var links = ITEMS.map(function (n) {
    var active = (here === n.href || here === n.alt);
    var inner = '<span class="sn-ic">' + n.ic + '</span><span class="sn-label">' + n.label + '</span>';
    return active
      ? '<span class="sn-link active" aria-current="page">' + inner + '</span>'
      : '<a class="sn-link" href="' + n.href + '">' + inner + '</a>';
  }).join("");

  var nav = document.createElement("nav");
  nav.className = "site-nav";
  nav.innerHTML = '<a class="sn-brand" href="index.html">✦ <span class="sn-co">Cottonwood</span></a>'
    + '<div class="sn-links">' + links + '</div>';

  function mount() {
    document.documentElement.classList.add("has-site-nav");
    document.body.insertBefore(nav, document.body.firstChild);
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
