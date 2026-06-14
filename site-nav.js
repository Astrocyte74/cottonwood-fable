/* Unified site navigation — a single ☰ menu button (fixed top-right, identical
   on every page) that opens a dropdown of sections with the current one active.
   Include with: <script defer src="site-nav.js"></script>
   (The mobile map has its own ☰ sheet, so it does NOT load this — it lists the
   same sections inside that sheet instead.) */
(function () {
  "use strict";
  var here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  var mobile = /-mobile\.html$/.test(here);

  var SEC = [
    { key: "home", d: "index.html",            m: "index.html",                   ic: "⌂",  label: "Home" },
    { key: "map",  d: "cottonwood-map.html",    m: "cottonwood-map-mobile.html",   ic: "🗺️", label: "Map" },
    { key: "ld",   d: "land-divisions.html",    m: "land-divisions-mobile.html",   ic: "📖", label: "How the land was divided" },
    { key: "hi",   d: "dls-history.html",       m: "dls-history-mobile.html",      ic: "📜", label: "The making of the grid" }
  ];
  var ak = (here === "" || here === "index.html") ? "home"
         : here.indexOf("cottonwood-map") === 0 ? "map"
         : here.indexOf("land-divisions") === 0 ? "ld"
         : here.indexOf("dls-history") === 0 ? "hi" : "";

  var css = ''
    + '.snav-btn{position:fixed;top:calc(env(safe-area-inset-top,0px) + 10px);right:12px;z-index:1300;'
    + 'width:42px;height:42px;cursor:pointer;border-radius:8px;border:1px solid #8b5a2b;'
    + 'background:#efe4cd url("art/parchment.jpg?v=3") center/cover;color:#5c3a1e;font-size:20px;line-height:1;display:flex;'
    + 'align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(60,40,15,.32);font-family:Georgia,serif;}'
    + '.snav-btn.on{background:#8b5a2b;color:#fff8ee;}'
    + '.snav-back{position:fixed;inset:0;z-index:1290;background:rgba(40,28,12,.25);opacity:0;'
    + 'pointer-events:none;transition:opacity .18s;}'
    + '.snav-back.on{opacity:1;pointer-events:auto;}'
    + '.snav-menu{position:fixed;top:calc(env(safe-area-inset-top,0px) + 58px);right:12px;z-index:1300;'
    + 'min-width:240px;max-width:86vw;background:#efe4cd url("art/parchment.jpg?v=3") center/cover;'
    + 'border:1px solid #8b5a2b;border-radius:10px;'
    + 'padding:8px;box-shadow:0 8px 30px rgba(60,40,15,.4);font-family:Georgia,"Times New Roman",serif;'
    + 'opacity:0;transform:translateY(-8px) scale(.98);transform-origin:top right;pointer-events:none;'
    + 'transition:opacity .18s ease,transform .18s ease;}'
    + '.snav-menu.on{opacity:1;transform:none;pointer-events:auto;}'
    + '.snav-menu .snav-head{font-variant:small-caps;letter-spacing:1px;font-size:12px;color:#8b5a2b;'
    + 'padding:4px 10px 8px;border-bottom:1px solid #e0d2b3;margin-bottom:6px;}'
    + '.snav-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;'
    + 'text-decoration:none;color:#3a2a14;font-size:15px;}'
    + 'a.snav-item:hover{background:#efe0c4;}'
    + '.snav-item.active{background:#8b5a2b;color:#fff8ee;font-weight:bold;}'
    + '.snav-item .snav-ic{font-size:17px;width:20px;text-align:center;}'
    + '@media print{.snav-btn,.snav-menu,.snav-back{display:none !important;}}';

  var items = SEC.map(function (s) {
    var href = mobile ? s.m : s.d;
    var inner = '<span class="snav-ic">' + s.ic + '</span>' + s.label;
    return (s.key === ak)
      ? '<span class="snav-item active" aria-current="page">' + inner + '</span>'
      : '<a class="snav-item" href="' + href + '">' + inner + '</a>';
  }).join("");

  var btn = document.createElement("button");
  btn.className = "snav-btn"; btn.type = "button";
  btn.setAttribute("aria-label", "Menu"); btn.setAttribute("aria-haspopup", "true");
  btn.setAttribute("aria-expanded", "false"); btn.textContent = "☰";
  var menu = document.createElement("nav");
  menu.className = "snav-menu"; menu.setAttribute("aria-label", "Sections");
  menu.innerHTML = '<div class="snav-head">Cottonwood</div>' + items;
  var back = document.createElement("div"); back.className = "snav-back";

  function open()  { menu.classList.add("on"); back.classList.add("on"); btn.classList.add("on"); btn.setAttribute("aria-expanded", "true"); }
  function close() { menu.classList.remove("on"); back.classList.remove("on"); btn.classList.remove("on"); btn.setAttribute("aria-expanded", "false"); }
  btn.addEventListener("click", function (e) { e.stopPropagation(); menu.classList.contains("on") ? close() : open(); });
  back.addEventListener("click", close);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

  function mount() {
    var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    document.body.appendChild(back); document.body.appendChild(menu); document.body.appendChild(btn);
  }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
})();
