/**
 * Pool Hub — Phase 2
 * Google auth (apa-coach) + read Captain Firestore + scorer scorebooks.
 * Demo hosts link to *-demo scorers and use *-demo Firestore docs.
 */
(function () {
  "use strict";

  var IS_DEMO =
    /(?:^|\.)jamesnetworks-net-demo\.pages\.dev$/i.test(location.hostname) ||
    /^demo\./i.test(location.hostname) ||
    /[?&]demo=1(?:&|$)/i.test(location.search);

  var URLS = IS_DEMO
    ? {
        captain: "https://apacaptain.jamesnetworks.net",
        nine: "https://9ballscores-demo.pages.dev",
        eight: "https://8ballscores-demo.pages.dev",
      }
    : {
        captain: "https://apacaptain.jamesnetworks.net",
        nine: "https://9ballscores.jamesnetworks.net",
        eight: "https://8ballscores.jamesnetworks.net",
      };

  // Prefer custom domains; fall back to pages.dev if needed
  if (!IS_DEMO) {
    URLS.nine = "https://9ballscores.pages.dev";
    URLS.eight = "https://8ballscores.pages.dev";
  }

  var NINE_BOOK = IS_DEMO ? "nineball-demo" : "nineball";
  var EIGHT_BOOK = IS_DEMO ? "eightball-demo" : "eightball";

  var user = null;
  var roster = [];
  var schedule = [];
  var nineHistory = [];
  var eightHistory = [];

  function $(id) {
    return document.getElementById(id);
  }

  function setStatus(msg, kind) {
    var el = $("authStatus");
    if (!el) return;
    el.textContent = msg || "";
    el.className = "auth-status" + (kind ? " " + kind : "");
  }

  function setScoreStatus(msg, kind) {
    var el = $("scoreStatus");
    if (!el) return;
    el.textContent = msg || "";
    el.className = "auth-status" + (kind ? " " + kind : "");
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso).slice(0, 10);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function wireLinks() {
    $("linkCaptain").href = URLS.captain;
    $("linkCaptainDomain").textContent = URLS.captain.replace(/^https?:\/\//, "");
    $("link9").href = URLS.nine + "/";
    $("link9Domain").textContent = URLS.nine.replace(/^https?:\/\//, "");
    $("link8").href = URLS.eight + "/";
    $("link8Domain").textContent = URLS.eight.replace(/^https?:\/\//, "");
    $("link9History").href = URLS.nine + "/#history";
    $("link8History").href = URLS.eight + "/#history";
  }

  function showDemoBanner() {
    if (!IS_DEMO) return;
    var b = $("demoEnvBanner");
    if (b) b.hidden = false;
    document.title = "[DEMO] " + document.title;
  }

  function initFirebase() {
    if (typeof firebase === "undefined") {
      setStatus("Firebase failed to load.", "err");
      return;
    }
    if (!firebase.apps.length) {
      firebase.initializeApp({
        apiKey: "AIzaSyB9USmNYqxKu6_tNXw0Go-ewIAGjy5gdYs",
        authDomain: "apa-coach.firebaseapp.com",
        projectId: "apa-coach",
        storageBucket: "apa-coach.firebasestorage.app",
        messagingSenderId: "672777910668",
        appId: "1:672777910668:web:ec27fe86e1f32dcc93bea9",
      });
    }
    firebase.auth().onAuthStateChanged(function (u) {
      user = u;
      refreshAuthUI();
      if (u) loadDashboard();
      else clearDashboard();
    });
  }

  function refreshAuthUI() {
    var signedIn = !!user;
    $("dashSignedOut").classList.toggle("hidden", signedIn);
    $("dashSignedIn").classList.toggle("hidden", !signedIn);
    $("heroAuthArea").classList.toggle("hidden", signedIn);
    $("heroUser").classList.toggle("hidden", !signedIn);

    if (signedIn) {
      $("heroName").textContent = user.displayName || "Signed in";
      $("heroEmail").textContent = user.email || user.uid;
      var av = $("heroAvatar");
      if (user.photoURL) {
        av.src = user.photoURL;
        av.style.display = "";
      } else {
        av.removeAttribute("src");
        av.style.display = "none";
      }
      $("navAuthBtn").textContent = "Sign out";
      $("dashLead").textContent =
        "Roster & schedule from APA Captain · recent sessions from scorers" +
        (IS_DEMO ? " (demo Firestore paths)." : ".");
      setStatus("Signed in.", "ok");
    } else {
      $("navAuthBtn").textContent = "Sign in";
      $("dashLead").textContent = "Sign in to load Captain roster/schedule and recent scorer matches.";
      setStatus("");
    }
  }

  async function signIn() {
    setStatus("Opening Google sign-in…");
    var provider = new firebase.auth.GoogleAuthProvider();
    try {
      await firebase.auth().signInWithPopup(provider);
    } catch (e) {
      if (e.code === "auth/popup-closed-by-user") {
        setStatus("Sign-in cancelled.");
        return;
      }
      if (e.code === "auth/unauthorized-domain") {
        setStatus(
          "Add " + location.hostname + " to Firebase authorized domains (apa-coach).",
          "err"
        );
        return;
      }
      if (e.code === "auth/popup-blocked") {
        try {
          await firebase.auth().signInWithRedirect(provider);
          return;
        } catch (e2) {
          setStatus(e2.message || "Sign-in failed", "err");
          return;
        }
      }
      setStatus(e.message || "Sign-in failed", "err");
    }
  }

  async function signOut() {
    try {
      await firebase.auth().signOut();
      setStatus("Signed out.");
    } catch (e) {
      setStatus(e.message || "Sign-out failed", "err");
    }
  }

  function clearDashboard() {
    roster = [];
    schedule = [];
    nineHistory = [];
    eightHistory = [];
    $("rosterList").innerHTML = '<p class="muted">Sign in to load roster.</p>';
    $("scheduleList").innerHTML = "";
    $("nineList").innerHTML = "";
    $("eightList").innerHTML = "";
    $("rosterCount").textContent = "";
    fillScoreSelects();
  }

  async function loadDashboard() {
    if (!user) return;
    setStatus("Loading your pool data…");
    var db = firebase.firestore();
    var uid = user.uid;

    try {
      var playersSnap = await db.collection("captains").doc(uid).collection("players").get();
      roster = playersSnap.docs.map(function (d) {
        return Object.assign({ id: d.id }, d.data());
      });
      roster.sort(function (a, b) {
        return String(a.name || "").localeCompare(String(b.name || ""));
      });
    } catch (e) {
      roster = [];
      console.warn("players", e);
    }

    try {
      var schedSnap = await db.collection("captains").doc(uid).collection("schedule").get();
      schedule = schedSnap.docs.map(function (d) {
        return Object.assign({ id: d.id }, d.data());
      });
      schedule.sort(function (a, b) {
        return String(a.date || "").localeCompare(String(b.date || ""));
      });
    } catch (e) {
      schedule = [];
      console.warn("schedule", e);
    }

    try {
      var nSnap = await db.collection("users").doc(uid).collection("scorebooks").doc(NINE_BOOK).get();
      nineHistory = nSnap.exists && Array.isArray(nSnap.data().history) ? nSnap.data().history : [];
    } catch (e) {
      nineHistory = [];
      console.warn("nineball", e);
    }

    try {
      var eSnap = await db.collection("users").doc(uid).collection("scorebooks").doc(EIGHT_BOOK).get();
      eightHistory = eSnap.exists && Array.isArray(eSnap.data().history) ? eSnap.data().history : [];
    } catch (e) {
      eightHistory = [];
      console.warn("eightball", e);
    }

    renderRoster();
    renderSchedule();
    renderScorerHistory("nineList", nineHistory, "9");
    renderScorerHistory("eightList", eightHistory, "8");
    fillScoreSelects();
    setStatus(
      "Loaded " +
        roster.length +
        " players · " +
        schedule.length +
        " schedule entries · " +
        nineHistory.length +
        " 9-ball · " +
        eightHistory.length +
        " 8-ball sessions.",
      "ok"
    );
  }

  function renderRoster() {
    $("rosterCount").textContent = roster.length ? "(" + roster.length + ")" : "";
    var box = $("rosterList");
    if (!roster.length) {
      box.innerHTML =
        '<p class="muted">No roster in Captain yet. Connect poolplayers.com in APA Captain, then refresh here.</p>';
      return;
    }
    box.innerHTML = roster
      .slice(0, 40)
      .map(function (p) {
        var sl8 = p.skillLevel8Ball != null ? "8-ball SL-" + p.skillLevel8Ball : "";
        var sl9 = p.skillLevel9Ball != null ? "9-ball SL-" + p.skillLevel9Ball : "";
        var sl = [sl8, sl9].filter(Boolean).join(" · ");
        return (
          '<div class="list-row"><span><b>' +
          esc(p.name) +
          "</b>" +
          (p.apaMemberNumber
            ? ' <span class="meta">#' + esc(p.apaMemberNumber) + "</span>"
            : "") +
          '</span><span class="sl">' +
          esc(sl || "—") +
          "</span></div>"
        );
      })
      .join("");
  }

  function renderSchedule() {
    var box = $("scheduleList");
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var upcoming = schedule
      .filter(function (e) {
        if (e.isBye) return false;
        var d = new Date(e.date);
        if (isNaN(d.getTime())) return true;
        return d >= today;
      })
      .slice(0, 12);

    if (!upcoming.length) {
      box.innerHTML =
        '<p class="muted">No upcoming schedule. Sync schedule in APA Captain first.</p>';
      return;
    }

    box.innerHTML = upcoming
      .map(function (e) {
        var fmt = e.format === "NINE" ? "9-Ball" : e.format === "EIGHT" ? "8-Ball" : "Match";
        var home = e.isHome ? "Home" : "Away";
        var scored =
          e.isScored && e.myPoints != null
            ? e.myPoints + "–" + (e.oppPoints != null ? e.oppPoints : "?")
            : home;
        return (
          '<div class="list-row"><span><b>' +
          esc(e.opponentTeamName || "Opponent") +
          "</b><br><span class=\"meta\">" +
          esc(fmt) +
          (e.week != null ? " · Wk " + e.week : "") +
          "</span></span><span class=\"meta\">" +
          esc(fmtDate(e.date)) +
          "<br>" +
          esc(scored) +
          "</span></div>"
        );
      })
      .join("");
  }

  function renderScorerHistory(elId, hist, label) {
    var box = $(elId);
    if (!hist || !hist.length) {
      box.innerHTML =
        '<p class="muted">No ' +
        label +
        "-ball history on this account yet. Sign in on the scorer and finish a match (or Sync account).</p>";
      return;
    }
    box.innerHTML = hist
      .slice(0, 10)
      .map(function (m) {
        var w = m.winner;
        var names = m.names || ["?", "?"];
        var scores = m.scores || [0, 0];
        var line =
          w != null
            ? names[w] + " def. " + names[1 - w] + " · " + scores[w] + "–" + scores[1 - w]
            : names[0] + " vs " + names[1];
        return (
          '<div class="list-row"><span><b>' +
          esc(line) +
          '</b></span><span class="meta">' +
          esc(fmtDate(m.date)) +
          "</span></div>"
        );
      })
      .join("");
  }

  function fillScoreSelects() {
    var opts =
      '<option value="">— pick player —</option>' +
      roster
        .map(function (p) {
          return (
            '<option value="' +
            esc(p.id) +
            '">' +
            esc(p.name) +
            (p.skillLevel9Ball != null ? " (9: SL-" + p.skillLevel9Ball + ")" : "") +
            (p.skillLevel8Ball != null ? " (8: SL-" + p.skillLevel8Ball + ")" : "") +
            "</option>"
          );
        })
        .join("");
    $("scoreP1").innerHTML = opts;
    $("scoreP2").innerHTML = opts;
  }

  function openScorerPrefill() {
    var id1 = $("scoreP1").value;
    var id2 = $("scoreP2").value;
    var fmt = $("scoreFormat").value;
    if (!id1 || !id2) {
      setScoreStatus("Pick both players.", "err");
      return;
    }
    if (id1 === id2) {
      setScoreStatus("Pick two different players.", "err");
      return;
    }
    var p1 = roster.find(function (p) {
      return p.id === id1;
    });
    var p2 = roster.find(function (p) {
      return p.id === id2;
    });
    if (!p1 || !p2) {
      setScoreStatus("Roster players not found.", "err");
      return;
    }

    var sl1 = fmt === "8" ? p1.skillLevel8Ball || 4 : p1.skillLevel9Ball || 4;
    var sl2 = fmt === "8" ? p2.skillLevel8Ball || 4 : p2.skillLevel9Ball || 4;
    var base = fmt === "8" ? URLS.eight : URLS.nine;
    var q = new URLSearchParams({
      p1: p1.name,
      p2: p2.name,
      p1sl: String(sl1),
      p2sl: String(sl2),
    });
    if (p1.apaMemberNumber) q.set("p1apa", String(p1.apaMemberNumber));
    if (p2.apaMemberNumber) q.set("p2apa", String(p2.apaMemberNumber));
    setScoreStatus("Opening scorer…", "ok");
    window.open(base + "/?" + q.toString(), "_blank", "noopener");
  }

  // Wire UI
  document.getElementById("year").textContent = String(new Date().getFullYear());
  showDemoBanner();
  wireLinks();
  initFirebase();

  $("heroSignInBtn").addEventListener("click", signIn);
  $("navAuthBtn").addEventListener("click", function () {
    if (user) signOut();
    else signIn();
  });
  $("heroSignOutBtn").addEventListener("click", signOut);
  $("scoreOpenBtn").addEventListener("click", openScorerPrefill);
})();
