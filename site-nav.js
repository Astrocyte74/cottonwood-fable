/* Unified site header — a compact APP header (brand + subtitle + ☰ menu) fixed at
   the top of every page, with a #site-header-controls slot the map pages fill with
   grouped Maps + Dates controls and Print (shared .mapmode/.sh-period/.sh-print
   styles below, so both maps show the same controls in the same place). Hides
   entirely when printing. Sets --sh-h (its own height) so pages can push content
   below it. Include with: <script defer src="site-nav.js"></script> */
(function () {
  "use strict";
  var here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  var mobile = /-mobile\.html$/.test(here);

  var SEC = [
    { key: "home", d: "index.html",            m: "index.html",                   ic: "⌂",  label: "Home" },
    { key: "map",  d: "cottonwood-poster.html", m: "cottonwood-poster.html",       ic: "🗺️", label: "Printable map" },
    { key: "live", d: "cottonwood-map.html",    m: "cottonwood-map-mobile.html",   ic: "✎", label: "Editable map", sub: true },
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
    + ".site-header{position:fixed !important;top:0;left:0;right:0;z-index:1300 !important;"
    + "background:#efe4cd url('art/parchment.jpg?v=3') center/cover;"
    + "border-top:4px solid #174f47;border-bottom:1px solid rgba(92,58,30,.72);"
    + "box-shadow:0 2px 10px rgba(60,40,15,.2);"
    + "font-family:Georgia,'Times New Roman',serif;color:#3a2a14;"
    + "padding:calc(env(safe-area-inset-top,0px) + 8px) 18px 8px;}"
    + ".sh-row{display:flex;align-items:center;gap:16px;min-height:34px;}"
    + ".sh-brand{display:flex;align-items:center;gap:8px;text-decoration:none;color:#2f210f;"
    + "font-size:24px;font-weight:bold;letter-spacing:1.8px;font-variant:small-caps;white-space:nowrap;line-height:1;}"
    + ".sh-brand .star{color:#8b5a2b;font-size:16px;}"
    + ".sh-sub{flex:1;font-size:15px;font-style:italic;color:#6b4e1f;opacity:.9;"
    + "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:140px;}"
    + ".sh-menu-btn{flex:none;width:40px;height:40px;cursor:pointer;border-radius:10px;"
    + "border:1px solid rgba(139,90,43,.8);background:rgba(247,240,225,.42);color:#5c3a1e;"
    + "font-size:21px;line-height:1;display:flex;align-items:center;justify-content:center;"
    + "box-shadow:inset 0 0 0 1px rgba(255,248,238,.45);}"
    + ".sh-menu-btn:hover{background:rgba(255,248,238,.68);}"
    + ".sh-menu-btn.on{background:#6f4425;color:#fff8ee;}"
    + ".sh-controls:empty{display:none;}"
    + ".sh-controls{display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin-top:7px;padding:7px 0 0;"
    + "border-top:1px solid rgba(122,92,61,.28);}"
    + ".control-group{display:inline-flex;align-items:center;gap:8px;min-height:34px;}"
    + ".control-group+.control-group{padding-left:18px;border-left:1px solid rgba(122,92,61,.26);}"
    + ".cg-label{font-size:12px;text-transform:uppercase;letter-spacing:.9px;color:#6d5438;font-weight:bold;"
    + "line-height:1;white-space:nowrap;}"
    + ".mapmode{display:inline-flex;border:1px solid rgba(139,90,43,.82);border-radius:8px;overflow:hidden;"
    + "background:rgba(255,248,238,.36);box-shadow:inset 0 0 0 1px rgba(255,248,238,.32);}"
    + ".mapmode .mm{font-size:15px;padding:6px 13px;text-decoration:none;color:#5c3a1e;"
    + "background:rgba(247,240,225,.58);white-space:nowrap;cursor:pointer;font-family:inherit;line-height:1.05;}"
    + ".mapmode .mm:hover{background:rgba(255,248,238,.82);}"
    + ".mapmode .mm+.mm{border-left:1px solid rgba(139,90,43,.72);}"
    + ".mapmode .mm.active{background:#6f4425;color:#fff8ee;font-weight:bold;cursor:default;}"
    + ".sh-period{display:inline-flex;gap:6px;}"
    + ".sh-period .sh-pchip{font-family:inherit;font-size:15px;padding:6px 12px;cursor:pointer;"
    + "border:1px solid rgba(139,90,43,.18);border-radius:8px;background:rgba(92,58,30,.08);color:#5c3a1e;line-height:1.05;}"
    + ".sh-period .sh-pchip:hover{background:rgba(255,248,238,.7);border-color:rgba(139,90,43,.38);}"
    + ".sh-period .sh-pchip.active{background:#6f4425;color:#fff8ee;font-weight:bold;border-color:#6f4425;}"
    + ".sh-print,.site-header .btn{font-family:inherit;font-size:15px;padding:7px 13px;cursor:pointer;"
    + "border:1px solid #6f4425;border-radius:8px;background:#8b5a2b;color:#fff8ee;font-weight:bold;text-decoration:none;"
    + "box-shadow:0 1px 2px rgba(60,40,15,.14);}"
    + ".site-header .btn:hover,.sh-print:hover{filter:none;background:#744624;}"
    + ".sh-controls .pt-spacer{flex:1;min-width:40px;}"
    + ".site-header .pt-print{position:relative;display:inline-block;}"
    + ".site-header .pt-display{margin-left:-4px;}"
    + ".snav-back{position:fixed;inset:0;z-index:1290;background:rgba(40,28,12,.25);opacity:0;"
    + "pointer-events:none;transition:opacity .18s;}"
    + ".snav-back.on{opacity:1;pointer-events:auto;}"
    + ".snav-menu{position:fixed;top:calc(var(--sh-h,56px) + 6px);right:12px;z-index:1300;"
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
    + "@media (max-width:900px){.site-header{padding-left:12px;padding-right:12px;}"
    + ".sh-row{gap:10px;}.sh-brand{font-size:22px;letter-spacing:1.4px;}.sh-sub{font-size:13px;}"
    + ".sh-controls{gap:12px;}.control-group{gap:6px;}.control-group+.control-group{padding-left:12px;}"
    + ".mapmode .mm,.sh-period .sh-pchip,.sh-print,.site-header .btn{font-size:14px;padding:7px 10px;}}"
    + "@media (max-width:680px){.sh-row{align-items:flex-start;}.sh-sub{display:none;}.sh-menu-btn{width:40px;height:40px;font-size:20px;}"
    + ".sh-controls{flex-wrap:nowrap;overflow-x:auto;align-items:flex-start;padding-bottom:2px;}"
    + ".control-group{flex-direction:column;align-items:flex-start;gap:4px;}.cg-label{font-size:10px;}"
    + ".control-group+.control-group{padding-left:0;border-left:0;}"
    + ".sh-controls .pt-spacer{display:none;}.site-header .pt-display{margin-left:0;}}"
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
