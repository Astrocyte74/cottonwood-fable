// ============================================================================
// Cottonwood Historical Land Ownership — SEED DATA
// Township 35, Ranges 2 & 3, West of the 5th Meridian — central Alberta
//
// Hand-drawn plat maps by L.D.; transcribed in maps/IMG_1674–1681.jpeg
// (stitched copies in maps/merged_*.JPG).
//
// This file is the STARTING POINT only. The app loads it the first time, then
// keeps your edits in the browser. Click any section in the map to add / fix
// names, change which quarter they sit in, or set the whole-section type.
// "Reset to original" in the app restores exactly what is in this file.
//
// DLS quarter-sections (NW / NE / SW / SE = 160 acres each) are the real land
// units, so names are organized by quarter. Names ending in "?" are uncertain
// readings of the handwriting and render in a lighter tint. Multiple names may
// share one quarter (a quarter holds a list). "free" holds floating labels
// positioned by fx (west→east, 0–1) and fy (south→north, 0–1).
//
// Whole-section "type":  CPR = Canadian Pacific Railway grant,
//   HBC = Hudson's Bay Company, SCHOOL = DLS school section,
//   SSB = Soldier Settlement Board.  A type tints the whole section.
//
// Section keys: "T<township>R<range>S<section>"  e.g. "T35R3S16" = Sec 16, Rge 3, Twp 35 W5.
// Period keys:  p1901 (1901–1911), p1905 (1905–1911), p1917 (1917), p1927 (1927)
//
// NOTE: the seed quarter assignments are a best-effort first pass — verify each
// against the overlay of the original sheet and drag/retype as needed.
// ============================================================================

const COTTONWOOD_SEED = {

  periods: [
    { id: "p1901", label: "1901–1911", overlay: "ov-80-81", sources: ["IMG_1680 (Rge 3)", "IMG_1681 (Rge 2)"] },
    { id: "p1905", label: "1905–1911", overlay: "ov-78-79", sources: ["IMG_1678 (Rge 3)", "IMG_1679 (Rge 2)"] },
    { id: "p1917", label: "1917",      overlay: "ov-74-75", sources: ["IMG_1674/1676 (black/blue ink)"] },
    { id: "p1927", label: "1927",      overlay: "ov-74-75", sources: ["IMG_1674/1676 (red ink)"] }
  ],

  sections: {

    // ===== RANGE 3 =====
    "T35R3S21": {
      p1901: { type: "CPR" }, p1905: { type: "CPR" }, p1917: { type: "CPR" }, p1927: { type: "CPR" }
    },
    "T35R3S22": {
      p1901: { type: "CPR", q: { NW: ["David Fordyce (1906)?"] } },
      p1905: { type: "CPR" },
      p1917: { type: "CPR", q: { NW: ["H. McKuin"] } },
      p1927: { q: { NW: ["F. Tingle?"] } }
    },
    "T35R3S16": {
      p1901: { q: { NW: ["Fred Tingle (1905)"], NE: ["A. Caldwell — Mountain House (1905)"] } },
      p1905: { q: { NW: ["Fred Tingle (1905)"], NE: ["A. Caldwell — Mountain House (1903)"], SW: ["J. Scott (1903)"] } },
      p1917: { q: { NW: ["F. Tingle"], NE: ["J. Scott"] } },
      p1927: { q: { NW: ["F. Tingle"], NE: ["J.C. Scott"] } }
    },
    "T35R3S15": {
      p1901: { type: "CPR", q: { NW: ["C. Scott (1903)"], NE: ["John Scott?"] } },
      p1905: { type: "CPR", q: { NW: ["C. Scott (1903)"] } },
      p1917: { type: "CPR", q: { NW: ["F. Fulton (1918)"], NE: ["C. Scott"] } },
      p1927: { q: { NW: ["Fulton"], NE: ["J. Scott"], SW: ["D. Cunningham"] } }
    },
    "T35R3S14": {
      p1901: { q: { NW: ["Joseph Kerwin (1903)"] } },
      p1905: { q: { NW: ["Joseph Kerwin (1903)"] } },
      p1917: { q: { NW: ["E. Kerwin"] } },
      p1927: { q: { NW: ["Kerwin"] } }
    },
    "T35R3S13": {
      p1901: { q: { NW: ["J.E. Hayes"] } },
      p1905: { q: { NW: ["J.E. Hayes"] } },
      p1917: { q: { NW: ["J. Hayes"] } },
      p1927: { q: { NW: ["J. Hayes"] } }
    },
    "T35R3S9": {
      p1901: { q: { NW: ["F. Earl Tingle"], NE: ["Duncan Cunningham"], SW: ["Tom Fulton?"] } },
      p1905: { q: { NW: ["F. Earl Tingle"], NE: ["Duncan Cunningham"], SW: ["F.G. Fulton"] } },
      p1917: { q: { NW: ["C. & E. Land Co."], NE: ["H. Ellifson"] } },
      p1927: { q: { NW: ["C. & E. Land Co."], NE: ["H. Ellifson"] } }
    },
    "T35R3S10": {
      p1901: { q: { NW: ["A. Gabrielle Shrader?"], NE: ["M. Fordyce (1904)"], SW: ["J. Morfitt"] } },
      p1905: { q: { NW: ["A. Gabrielle Shrader?"], NE: ["M. Fordyce (1899–1904)"], SW: ["J. Morfitt"] } },
      p1917: { q: { NW: ["T. Fulton"], NE: ["M. Fordyce"], SW: ["G. Buchan"], SE: ["Kerr?"] } },
      p1927: { q: { NW: ["M. Fordyce"], NE: ["G. Buchan"], SW: ["D. Fordyce"] } }
    },
    "T35R3S11": {
      p1901: { type: "SCHOOL" }, p1905: { type: "SCHOOL" }, p1917: { type: "SCHOOL" }, p1927: { type: "SCHOOL" }
    },
    "T35R3S12": {
      p1901: { q: { NW: ["F. Barnes (1901)", "J. Arnold"], NE: ["S. Arnold (1904)"], SW: ["Marquand?"], SE: ["J. Laird (1904)"] } },
      p1905: { q: { NW: ["F. Barnes (1901)"], NE: ["S. Arnold (1904)"], SW: ["J. Laird (1903)"], SE: ["J. Arnold"] } },
      p1917: { q: { NW: ["F. Barnes"], NE: ["S. Arnold"], SW: ["James Laird"], SE: ["J. Arnold"] } },
      p1927: { q: { NW: ["F. Wright?"], NE: ["H. Brachley?"], SW: ["J.E. Blain?"], SE: ["McLaughlin Motors?"] } }
    },
    "T35R3S4": {
      p1901: { q: { NW: ["J. Brightman (1903)"], NE: ["G. Buchan"] } },
      p1905: { q: { NW: ["J. Brightman (1903)"], NE: ["B. Buchan (1910)"] } },
      p1917: { q: { NW: ["J. Brightman"], NE: ["W. Cameron"] } },
      p1927: { q: { NW: ["J. Brightman"], NE: ["W. Cameron"], SW: ["A.G. Reinke?"] } }
    },
    "T35R3S3": {
      p1901: { q: { NW: ["Andrew George?"] } },
      p1905: { q: { NW: ["Andrew George?"] } },
      p1917: { q: { NW: ["B. Pugh"], NE: ["E.R. Truman"], SW: ["C. & E. Land Co."] } },
      p1927: { q: { NW: ["C.B. Pugh"], NE: ["Rumke?"], SW: ["C. & E. Land Co."] } }
    },
    "T35R3S2": {
      p1901: { q: { NW: ["Henry Laird (1903)"], NE: ["Lyman Luther Lewis (1903)"] } },
      p1905: { q: { NW: ["Henry Laird (1903)"], NE: ["Lyman Luther Lewis (1903)"] } },
      p1917: { q: { NW: ["G. Buchan"], NE: ["F. Gerrung?"], SW: ["H. Grundy"] } },
      p1927: { q: { NW: ["G. Buchan"], NE: ["R. Legare"], SW: ["Grundy"] } }
    },
    "T35R3S1": {
      p1901: { q: { NW: ["George Laird (1903)"], NE: ["James Alex Laird (1903)"] } },
      p1905: { q: { NW: ["George Laird (1903)"], NE: ["James Alex Laird (1903)"] } },
      p1917: { q: { NW: ["J. Ross"], NE: ["A. Wanton?"] } },
      p1927: { q: { NW: ["J. Ross"], NE: ["H. Robinson?"] } }
    },

    // ===== RANGE 2 =====
    "T35R2S19": {
      p1901: { type: "CPR" },
      p1905: { type: "CPR", q: { NW: ["J. Miller?"] } },
      p1917: { type: "CPR", q: { NW: ["J. Whitelock"], NE: ["J. Miller"] } },
      p1927: { q: { NW: ["C. Lagard?"], NE: ["J. Miller"] } }
    },
    "T35R2S20": {
      p1901: { q: { NW: ["James Whitelock (1905)"], NE: ["W. Sanborn (1901)"], SW: ["E. Sanborn"] } },
      p1905: { q: { NW: ["James Whitelock (1905)"], NE: ["Mrs. Baker"], SW: ["Legare?"] } },
      p1917: { q: { NW: ["J.F. Whitelock"], NE: ["J. Crate"], SW: ["C. Whitelock"], SE: ["H. Baker"] } },
      p1927: { type: "SSB" }
    },
    "T35R2S21": {
      p1901: { type: "CPR", q: { NW: ["Sanborn (1901)?"] } },
      p1905: { type: "CPR", q: { NW: ["Freeman"] } },
      p1917: { type: "CPR", q: { NW: ["E. Freeman"] } },
      p1927: { type: "CPR", q: { NW: ["E.N. Freeman"] } }
    },
    "T35R2S18": {
      p1901: { q: { NW: ["Fred Whitelock"], NE: ["Tony Miller (1901)"] } },
      p1905: { q: { NW: ["Fred Whitelock (1905)"], NE: ["Tony Miller (1901)"], SW: ["George Steel (1904)"] } },
      p1917: { q: { NW: ["Whitelock"], NE: ["T. Miller"], SW: ["J. Lee"] } },
      p1927: { q: { NW: ["J. Wright?"], NE: ["T. Miller"], SW: ["J. Lee"] } }
    },
    "T35R2S17": {
      p1901: { type: "CPR", q: { NW: ["A. Hunt"] } },
      p1905: { type: "CPR", q: { NW: ["A. Hunt"], NE: ["Lee?"] } },
      p1917: { type: "CPR", q: { NW: ["Mrs. L. Watson"], NE: ["E. Hartley"], SW: ["C. Watson"] } },
      p1927: { type: "CPR", q: { NW: ["E. Mason?"], NE: ["G. Hartley"] } }
    },
    "T35R2S16": {
      p1901: { q: { NW: ["George Miller (1901)"] } },
      p1905: { q: { NW: ["George Miller (1902)"], NE: ["Mrs. Watson?"], SW: ["E. Jones?"] } },
      p1917: { q: { NW: ["E. Jones"], NE: ["G. Miller"] } },
      p1927: { q: { NW: ["E. Rogers?"], NE: ["G. Miller"], SW: ["A. Webb"] } }
    },
    "T35R2S7": {
      p1901: { type: "HBC" },
      p1905: { q: { NW: ["L. Deduc?"], NE: ["Deduc?"] } },
      p1917: { q: { NW: ["C. & E. Deduc"], NE: ["L. Deduc"] } },
      p1927: { q: { NW: ["L. Deduc"], NE: ["H. Blain?"] } }
    },
    "T35R2S8": {
      p1901: { type: "HBC" },
      p1905: { type: "HBC" },
      p1917: { type: "HBC" },
      p1927: { q: { NW: ["A. Hunt?"], NE: ["C. Husband?"] } }
    },
    "T35R2S9": {
      p1901: { type: "HBC" },
      p1905: { type: "HBC", q: { NW: ["Marsden?"], NE: ["Snow?"] } },
      p1917: { type: "HBC", q: { NW: ["J. Leis"], NE: ["W. Sandborn?"] } },
      p1927: { q: { NW: ["J. & B. Leis"], NE: ["F. Marsden?"], SW: ["H. Snow?"] } }
    },
    "T35R2S6": {
      p1901: { q: { NW: ["Robinson?"], NE: ["E.B. Watson (1907)?"] } },
      p1905: { q: { NW: ["H. Blain"], NE: ["Mrs. F. Miller?"] } },
      p1917: { q: { NW: ["H. Blain"], NE: ["Mrs. F. Miller"], SW: ["J.R. Tims"] } },
      p1927: { q: { NW: ["H. Blain"], NE: ["Mrs. Miller"], SW: ["J.B. Tims?"] } }
    },
    "T35R2S5": {
      p1905: { q: { NW: ["E.B. Watson (1907)?"], NE: ["A. Getty"], SW: ["C.E. Deduc?"] } },
      p1917: { q: { NW: ["T. Getty"], NE: ["A.T. Getty"], SW: ["R.B. Murray"], SE: ["L. Deduc?"] } },
      p1927: { q: { NW: ["Getty"], NE: ["R.B. Murray"], SW: ["C.F. Linard?"] } }
    },
    "T35R2S4": {
      p1905: { q: { NW: ["Arthur Webb (1905)"], NE: ["George Webb (1904)"], SW: ["Austin?"] } },
      p1917: { q: { NW: ["R.J. Austin"], NE: ["F. Webb"], SW: ["G.E. Hunter"] } },
      p1927: { q: { NW: ["Austin"], NE: ["E. Webb?"], SW: ["Can. Mort. Co.?"], SE: ["W. Lynch?"] } }
    }
  },

  // --------------------------------------------------------------------------
  // Landmarks. Position = section + fractional offset (fx west→east, fy south→
  // north, both 0–1). All approximate — drag in the app or nudge fx/fy here.
  // --------------------------------------------------------------------------
  landmarks: [
    { name: "Mountain House (A. Caldwell)", icon: "house", twp: 35, rge: 3, sec: 16, fx: 0.55, fy: 0.65,
      note: "Stopping house, c. 1903–1905. Marked with a dot on the 1901–1911 sheet." },
    { name: "Cottonwood School — site 1 (1904–1923)", icon: "school", twp: 35, rge: 2, sec: 16, fx: 0.10, fy: 0.15,
      note: "Star on the plat maps near the SW corner of Sec 16, Rge 2." },
    { name: "Cottonwood School — site 2 (1923–1957)", icon: "school", twp: 35, rge: 2, sec: 7, fx: 0.05, fy: 0.55,
      note: "Later school site, west edge of Sec 7, Rge 2." },
    { name: "Cottonwood School No. 2 (1940–1947)", icon: "school", twp: 35, rge: 3, sec: 9, fx: 0.85, fy: 0.95,
      note: "Star on the 1917–1927 sheet near the Sec 9/10 line, Rge 3." },
    { name: "Moose Mountain Bridge (1903–1943?)", icon: "bridge", twp: 35, rge: 3, sec: 9, fx: 0.05, fy: 0.90,
      note: "Red Deer River crossing; dates partly illegible (1903–1925 or 1903–1943)." },
    { name: "Ferry", icon: "ferry", twp: 35, rge: 3, sec: 21, fx: 0.15, fy: 0.85,
      note: "Ferry crossing on the Red Deer River, NW part of Sec 21, Rge 3." },
    { name: "Mountain House (Moose Ridge)", icon: "house", twp: 35, rge: 3, sec: 1, fx: 0.70, fy: 0.10,
      note: "Star at bottom of the Rge 3 sheets, labelled Moose Ridge. Location very approximate." }
  ]
};
