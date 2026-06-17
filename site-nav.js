/* Unified site header — a compact APP header (brand + subtitle + ☰ menu) fixed at
   the top of every page, with a #site-header-controls slot the map pages fill with
   the Sheet/Live toggle + period + Print (shared .mapmode/.sh-period/.sh-print
   styles below, so both maps show the same controls in the same place). Hides
   entirely when printing. Sets --sh-h (its own height) so pages can push content
   below it. Include with: <script defer src="site-nav.js"></script> */
(function () {
  "use strict";
  var here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  var mobile = /-mobile\.html$/.test(here);

  var SEC = [
    { key: "home", d: "index.html",            m: "index.html",                   ic: "⌂",  label: "Home" },
    { key: "map",  d: "cottonwood-poster.html", m: "cottonwood-poster.html",       ic: "🗺️", label: "Map (sheet)" },
    { key: "live", d: "cottonwood-map.html",    m: "cottonwood-map-mobile.html",   ic: "✎", label: "Live map · edit", sub: true },
    { key: "ld",   d: "land-divisions.html",    m: "land-divisions-mobile.html",   ic: "📖", label: "How the Survey Works" },
    { key: "hi",   d: "dls-history.html",       m: "dls-history-mobile.html",      ic: "📜", label: "The Story of the Survey" }
  ];
  var ak = (here === "" || here === "index.html") ? "home"
         : here === "cottonwood-poster.html" ? "map"
         : here.indexOf("cottonwood-map") === 0 ? "live"
         : here.indexOf("land-divisions") === 0 ? "ld"
         : here.indexOf("dls-history") === 0 ? "hi" : "";
  var SUB = {
    home: "Historical land ownership & how the prairies were squared",
    map: "Township 35, Ranges 2 & 3, West of the 5th Meridian",
    live: "Township 35, Ranges 2 & 3, West of the 5th Meridian",
    ld: "How the Dominion Land Survey works",
    hi: "The story behind the survey"
  };

  var css = ""
    + ".site-header{position:fixed;top:0;left:0;right:0;z-index:1300;"
    + "background:#efe4cd url('art/parchment.jpg?v=3') center/cover;"
    + "border-bottom:1px solid #8b5a2b;box-shadow:0 2px 8px rgba(60,40,15,.22);"
    + "font-family:Georgia,'Times New Roman',serif;color:#3a2a14;"
    + "padding:calc(env(safe-area-inset-top,0px) + 6px) 12px 6px;}"
    + ".sh-row{display:flex;align-items:center;gap:12px;}"
    + ".sh-brand{display:flex;align-items:center;gap:6px;text-decoration:none;color:#3a2a14;"
    + "font-size:18px;font-weight:bold;letter-spacing:1.5px;font-variant:small-caps;white-space:nowrap;}"
    + ".sh-brand .star{color:#8b5a2b;font-size:15px;}"
    + ".sh-sub{flex:1;font-size:12px;font-style:italic;color:#6b4e1f;opacity:.92;"
    + "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}"
    + ".sh-menu-btn{flex:none;width:36px;height:36px;cursor:pointer;border-radius:8px;"
    + "border:1px solid #8b5a2b;background:rgba(247,240,225,.5);color:#5c3a1e;"
    + "font-size:17px;line-height:1;display:flex;align-items:center;justify-content:center;}"
    + ".sh-menu-btn.on{background:#8b5a2b;color:#fff8ee;}"
    + ".sh-controls:empty{display:none;}"
    + ".sh-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 0 2px;}"
    + ".mapmode{display:inline-flex;border:1px solid #8b5a2b;border-radius:6px;overflow:hidden;}"
    + ".mapmode .mm{font-size:13px;padding:5px 11px;text-decoration:none;color:#5c3a1e;"
    + "background:#efe4cd;white-space:nowrap;cursor:pointer;font-family:inherit;}"
    + ".mapmode .mm+.mm{border-left:1px solid #8b5a2b;}"
    + ".mapmode .mm.active{background:#8b5a2b;color:#fff8ee;font-weight:bold;cursor:default;}"
    + ".sh-period{display:inline-flex;gap:4px;}"
    + ".sh-period .sh-pchip{font-family:inherit;font-size:13px;padding:5px 11px;cursor:pointer;"
    + "border:1px solid transparent;border-radius:6px;background:rgba(0,0,0,.06);color:#5c3a1e;}"
    + ".sh-period .sh-pchip.active{background:#8b5a2b;color:#fff8ee;font-weight:bold;}"
    + ".sh-print{font-family:inherit;font-size:13px;padding:5px 12px;cursor:pointer;"
    + "border:1px solid #8b5a2b;border-radius:6px;background:#5c3a1e;color:#fff8ee;font-weight:bold;text-decoration:none;}"
    + ".snav-back{position:fixed;inset:0;z-index:1290;background:rgba(40,28,12,.25);opacity:0;"
    + "pointer-events:none;transition:opacity .18s;}"
    + ".snav-back.on{opacity:1;pointer-events:auto;}"
    + ".snav-menu{position:fixed;top:calc(env(safe-area-inset-top,0px) + 56px);right:12px;z-index:1300;"
    + "min-width:240px;max-width:86vw;background:#efe4cd url('art/parchment.jpg?v=3') center/cover;"
    + "border:1px solid #8b5a2b;border-radius:10px;padding:8px;box-shadow:0 8px 30px rgba(60,40,15,.4);"
    + "font-family:Georgia,'Times New Roman',serif;opacity:0;transform:translateY(-8px) scale(.98);"
    + "transform-origin:top right;pointer-events:none;transition:opacity .18s ease,transform .18s ease;}"
    + ".snav-menu.on{opacity:1;transform:none;pointer-events:auto;}"
    + ".snav-menu .snav-head{font-variant:small-caps;letter-spacing:1px;font-size:12px;color:#8b5a2b;"
    + "padding:4px 10px 8px;border-bottom:1px solid #e0d2b3;margin-bottom:6px;}"
    + ".snav-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;"
    + "text-decoration:none;color:#3a2a14;font-size:15px;}"
    + "a.snav-item:hover{background:#efe0c4;}"
    + ".snav-item.active{background:#8b5a2b;color:#fff8ee;font-weight:bold;}"
    + ".snav-item .snav-ic{font-size:17px;width:20px;text-align:center;}"
    + ".snav-item.sub{padding-left:30px;font-size:14px;}"
    + ".snav-item.sub .snav-ic{font-size:15px;}"
    + "@media print{.site-header,.snav-menu,.snav-back{display:none !important;}}"
    + (ak === "map" || ak === "live" ? "" : " body{padding-top:var(--sh-h,0px);}");

  var items = SEC.map(function (s) {
    var href = mobile ? s.m : s.d;
    var cls = "snav-item" + (s.sub ? " sub" : "");
    var inner = '<span class="snav-ic">' + s.ic + '</span>' + s.label;
    return (s.key === ak)
      ? '<span class="' + cls + ' active" aria-current="page">' + inner + '</span>'
      : '<a class="' + cls + '" href="' + href + '">' + inner + '</a>';
  }).join("");

  var header = document.createElement("header");
  header.className = "site-header";
  header.innerHTML = '<div class="sh-row">'
    + '<a class="sh-brand" href="index.html"><span class="star">✦</span><span>Cottonwood</span></a>'
    + '<div class="sh-sub" id="site-header-sub">' + (SUB[ak] || "") + '</div>'
    + '<button class="sh-menu-btn" type="button" aria-label="Menu" aria-haspopup="true" aria-expanded="false">☰</button>'
    + '</div><div class="sh-controls" id="site-header-controls"></div>';

  var menuBtn = header.querySelector(".sh-menu-btn");
  var menu = document.createElement("nav");
  menu.className = "snav-menu"; menu.setAttribute("aria-label", "Sections");
  menu.innerHTML = '<div class="snav-head">Cottonwood</div>' + items;
  var back = document.createElement("div"); back.className = "snav-back";

  function open()  { menu.classList.add("on"); back.classList.add("on"); menuBtn.classList.add("on"); menuBtn.setAttribute("aria-expanded", "true"); }
  function close() { menu.classList.remove("on"); back.classList.remove("on"); menuBtn.classList.remove("on"); menuBtn.setAttribute("aria-expanded", "false"); }
  menuBtn.addEventListener("click", function (e) { e.stopPropagation(); menu.classList.contains("on") ? close() : open(); });
  back.addEventListener("click", close);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

  function measure() {
    document.documentElement.style.setProperty("--sh-h", header.offsetHeight + "px");
  }
  function mount() {
    var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    document.body.appendChild(header);
    document.body.appendChild(back); document.body.appendChild(menu);
    measure(); window.addEventListener("resize", measure);
    if (typeof ResizeObserver !== "undefined") new ResizeObserver(measure).observe(header);
  }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
})();
