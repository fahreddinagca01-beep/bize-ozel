/* Bize Özel: sevgiliye özel küçük uygulama.
   İçerik icerik.enc.json içinde şifreli durur; şifre girilince tarayıcıda çözülür. */
(function () {
  "use strict";

  var KEY = "bize-ozel-v1";
  var DAY = 86400000;
  var app = document.getElementById("app");
  var C = null; // çözülmüş içerik

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  var state = load();
  ["opened", "todos", "added", "love", "coupons", "special", "mood"].forEach(function (k) { if (!state[k]) state[k] = k === "added" ? [] : {}; });
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function startOfDay(t) { var d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function todayKey() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }

  // Nergis çizimi (SVG)
  function flower(size) {
    var petals = "";
    for (var i = 0; i < 6; i++) {
      petals += '<ellipse cx="50" cy="24" rx="15" ry="24" fill="#fffdf6" stroke="#f3e6c8" stroke-width="1.5" transform="rotate(' + (i * 60) + ' 50 50)"/>';
    }
    return '<svg class="flower" width="' + size + '" height="' + size + '" viewBox="0 0 100 100" aria-hidden="true">' + petals +
      '<circle cx="50" cy="50" r="16" fill="#ffd54f"/><circle cx="50" cy="50" r="16" fill="none" stroke="#f6a623" stroke-width="4"/>' +
      '<circle cx="50" cy="50" r="7" fill="#f6a623" opacity=".55"/></svg>';
  }

  // Süzülen yapraklar
  (function petals() {
    var box = document.getElementById("petals"), html = "";
    for (var i = 0; i < 9; i++) {
      var left = Math.round(Math.random() * 100), dur = 14 + Math.random() * 12, delay = -Math.random() * 20, sz = 16 + Math.round(Math.random() * 14);
      var pink = i % 3 === 0;
      html += '<svg class="petal" style="left:' + left + '%;animation-duration:' + dur + 's;animation-delay:' + delay + 's" width="' + sz + '" height="' + sz + '" viewBox="0 0 20 20">' +
        '<ellipse cx="10" cy="10" rx="5" ry="9" fill="' + (pink ? "#f8bbd0" : "#fffdf6") + '" stroke="' + (pink ? "#f48fb1" : "#f3e6c8") + '"/></svg>';
    }
    box.innerHTML = html;
  })();

  // ---------- Şifre çözme ----------
  function b64(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function decrypt(pw, enc) {
    var te = new TextEncoder();
    return crypto.subtle.importKey("raw", te.encode(pw), "PBKDF2", false, ["deriveKey"]).then(function (km) {
      return crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64(enc.salt), iterations: enc.iter, hash: "SHA-256" },
        km, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    }).then(function (key) {
      return crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(enc.iv) }, key, b64(enc.data));
    }).then(function (buf) { return JSON.parse(new TextDecoder().decode(buf)); });
  }
  var ENC = null;
  function getEnc() {
    if (ENC) return Promise.resolve(ENC);
    return fetch("icerik.enc.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (j) { ENC = j; return j; });
  }

  function renderLock(err) {
    app.innerHTML = '<div class="lock fade">' + flower(110) +
      '<h1 class="script">Bize Özel</h1><p>Sadece senin için hazırlandı 💗</p>' +
      '<input id="pw" type="password" placeholder="Şifremiz" autocomplete="current-password">' +
      '<button class="btn" id="go" style="max-width:300px">Aç</button>' +
      '<p class="muted" id="msg">' + (err ? "Şifre olmadı, bir daha dener misin? 🌸" : "İpucu: ikimizin bildiği kelime") + '</p></div>';
    var pw = app.querySelector("#pw");
    function tryOpen() {
      var v = pw.value.trim();
      if (!v) return;
      app.querySelector("#msg").textContent = "Açılıyor…";
      getEnc().then(function (enc) { return decrypt(v, enc); }).then(function (c) {
        C = c; state.pw = v; save(); start();
      }).catch(function () {
        var box = app.querySelector(".lock"); box.classList.remove("shake"); void box.offsetWidth; box.classList.add("shake");
        app.querySelector("#msg").textContent = "Şifre olmadı, bir daha dener misin? 🌸";
      });
    }
    app.querySelector("#go").onclick = tryOpen;
    pw.onkeydown = function (e) { if (e.key === "Enter") tryOpen(); };
  }

  // ---------- Sekmeler ----------
  var tab = "home";
  function tabbar() {
    var t = [["home", "🌼", "Bugün"], ["letters", "💌", "Mektuplar"], ["fun", "🎁", "Sürpriz"], ["memories", "📸", "Anılar"], ["todo", "✨", "Planlar"]];
    return '<nav class="tabbar">' + t.map(function (x) {
      return '<button data-tab="' + x[0] + '" class="' + (tab === x[0] ? "on" : "") + '"><span>' + x[1] + '</span><small>' + x[2] + '</small></button>';
    }).join("") + '</nav>';
  }
  function showTab(t) {
    tab = t; window.scrollTo(0, 0);
    R[t]();
    app.querySelectorAll("[data-tab]").forEach(function (b) { b.onclick = function () { showTab(b.dataset.tab); }; });
  }
  var R = {};

  function greeting() {
    var h = new Date().getHours();
    return h < 6 ? "İyi geceler" : h < 12 ? "Günaydın" : h < 18 ? "İyi günler" : "İyi akşamlar";
  }
  function dayIndex() {
    if (!C.baslangic) return 0;
    return Math.floor((startOfDay(Date.now()) - startOfDay(new Date(C.baslangic + "T00:00").getTime())) / DAY);
  }

  R.home = function () {
    var idx = dayIndex(), notes = C.gunluk || [];
    var h = '<div class="hello fade">' + flower(54) + '<div><h1 class="script">' + greeting() + ' ' + esc(C.ad) + '</h1>' +
      '<p>' + esc(C.alt_yazi || "Bugün de aklımdasın.") + '</p></div></div>';

    // Buluşma sayacı
    if (C.bulusma && !C.bulusma.tarih && C.bulusma.yer) {
      h += '<div class="card count fade"><h2>Bir sonraki durağımız</h2><div class="note-title" style="color:#fff;font-size:40px">' +
        esc(C.bulusma.yer) + '</div><div class="where">Orada kavuşacağız 💞</div></div>';
    }
    if (C.bulusma && C.bulusma.tarih) {
      var diff = new Date(C.bulusma.tarih).getTime() - Date.now();
      if (diff > 0) {
        var d = Math.floor(diff / DAY), hh = Math.floor(diff % DAY / 3600000), mm = Math.floor(diff % 3600000 / 60000);
        h += '<div class="card count fade"><h2>Kavuşmamıza</h2><div class="nums">' +
          '<div class="num"><b>' + d + '</b><small>gün</small></div><div class="num"><b>' + hh + '</b><small>saat</small></div>' +
          '<div class="num"><b>' + mm + '</b><small>dakika</small></div></div>' +
          (C.bulusma.yer ? '<div class="where">📍 ' + esc(C.bulusma.yer) + '</div>' : "") + '</div>';
      } else if (diff > -DAY) {
        h += '<div class="card count fade"><h2>Bugün</h2><div class="note-title" style="color:#fff">Kavuşuyoruz! 💞</div></div>';
      }
    }

    // Günün notu
    if (idx < 0) {
      h += '<div class="card note-card center fade"><div class="env">🌷</div><p class="locked-note">İlk notun ' + (-idx) + ' gün sonra açılacak.</p></div>';
    } else if (notes.length) {
      var i = Math.min(idx, notes.length - 1), n = notes[i], opened = state.opened["g" + i];
      h += '<div class="card note-card fade"><h2>Günün notu · ' + (i + 1) + '. gün</h2>';
      if (!opened) {
        h += '<button class="envelope" data-open="' + i + '"><span class="env">💌</span><span class="muted">Açmak için dokun</span></button>';
      } else {
        h += noteHtml(n);
      }
      h += '</div>';
      if (idx >= notes.length) h += '<p class="locked-note">Yeni notlar yolda 🌸</p>';
      else if (idx + 1 < notes.length) h += '<p class="locked-note">Yarın yeni bir not seni bekliyor 🌼</p>';
    }

    // Bugün nasılsın?
    var moods = C.ruh_halleri || [];
    if (moods.length) {
      var mk = state.mood[todayKey()];
      h += '<div class="card fade"><h2>Bugün nasılsın?</h2><div class="moods">' + moods.map(function (m, i) {
        return '<button class="mood' + (mk === i ? " on" : "") + '" data-mood="' + i + '"><span>' + esc(m.ikon) + '</span><small>' + esc(m.ad) + '</small></button>';
      }).join("") + '</div>';
      if (mk !== undefined && moods[mk]) {
        h += '<div class="mood-msg fade">' + esc(moods[mk].mesaj) + '</div>';
        if (C.whatsapp) h += '<a class="btn soft wa" target="_blank" rel="noopener" href="https://wa.me/' + esc(C.whatsapp) + '?text=' +
          encodeURIComponent("Bugün kendimi " + moods[mk].ad.toLocaleLowerCase("tr") + " hissediyorum " + moods[mk].ikon) + '">💬 ' + esc(C.benim_adim || "Ona") + '\'ya haber ver</a>';
      }
      h += '</div>';
    }

    // Seni düşünüyorum
    var lv = state.love[todayKey()] || 0;
    h += '<div class="card love fade"><h2>Beni düşündüğünde dokun</h2><button class="heart-btn" id="heart">💗</button>' +
      '<p class="muted" id="lv">' + (lv ? "Bugün " + lv + " kez 💕" : "Her dokunuşun kalbime ulaşıyor") + '</p></div>';

    // Geçmiş notlar
    if (idx > 0 && notes.length) {
      h += '<div class="card fade"><h2>Önceki notlar</h2><div class="past">';
      for (var k = Math.min(idx, notes.length) - 1; k >= 0; k--) {
        if (k === Math.min(idx, notes.length - 1)) continue;
        h += '<button data-past="' + k + '"><span>💌</span><span><b>' + esc(notes[k].baslik || (k + 1) + ". gün") + '</b><br><small>' + (k + 1) + '. gün</small></span></button>';
      }
      h += '</div></div>';
    }
    app.innerHTML = h + tabbar();

    var env = app.querySelector("[data-open]");
    if (env) env.onclick = function () { state.opened["g" + env.dataset.open] = 1; save(); confettiHearts(env); R.home(); bindTabs(); };
    app.querySelector("#heart").onclick = function (e) {
      state.love[todayKey()] = (state.love[todayKey()] || 0) + 1; save();
      app.querySelector("#lv").textContent = "Bugün " + state.love[todayKey()] + " kez 💕";
      hearts(e.currentTarget);
      try { if (navigator.vibrate) navigator.vibrate(30); } catch (x) {}
    };
    app.querySelectorAll("[data-mood]").forEach(function (b) {
      b.onclick = function () { state.mood[todayKey()] = +b.dataset.mood; save(); R.home(); bindTabs(); };
    });
    app.querySelectorAll("[data-past]").forEach(function (b) {
      b.onclick = function () { reader(notes[+b.dataset.past], (+b.dataset.past + 1) + ". günün notu"); };
    });
  };
  function bindTabs() { app.querySelectorAll("[data-tab]").forEach(function (b) { b.onclick = function () { showTab(b.dataset.tab); }; }); }

  function noteHtml(n) {
    return '<div class="fade">' + (n.baslik ? '<div class="note-title">' + esc(n.baslik) + '</div>' : "") +
      '<div class="note-text">' + esc(n.metin) + '</div>' +
      (n.foto ? '<img class="note-photo" src="' + esc(n.foto) + '" alt="">' : "") +
      '<div class="sign">' + esc(C.imza || "Seni seven") + '</div></div>';
  }
  function reader(n, top) {
    window.scrollTo(0, 0);
    app.innerHTML = '<button class="back" id="back" aria-label="Geri">←</button><div class="paper fade">' +
      '<p class="muted">' + esc(top) + '</p>' + noteHtml(n) + '</div>';
    app.querySelector("#back").onclick = function () { showTab(tab); };
  }

  R.letters = function () {
    var L = C.mektuplar || [];
    var h = '<h1 class="page-title">Mektuplar</h1><p class="page-sub">İhtiyacın olduğunda aç. Hepsi senin için yazıldı.</p><div class="letters fade">';
    L.forEach(function (m, i) {
      var o = state.opened["m" + i];
      h += '<button class="letter' + (o ? " opened" : "") + '" data-l="' + i + '"><span class="ico">' + esc(m.ikon || "💌") + '</span>' +
        '<b>' + esc(m.zarf) + '</b><small>' + (o ? "Açıldı" : "Kapalı zarf") + '</small></button>';
    });
    app.innerHTML = h + '</div>' + tabbar();
    app.querySelectorAll("[data-l]").forEach(function (b) {
      b.onclick = function () { var i = +b.dataset.l; state.opened["m" + i] = 1; save(); reader({ baslik: L[i].zarf, metin: L[i].metin, foto: L[i].foto }, "Mektup"); };
    });
  };

  R.memories = function () {
    var A = C.anilar || [];
    var h = '<h1 class="page-title">Anılarımız</h1><p class="page-sub">Birlikte biriktirdiğimiz güzel anlar.</p>';
    if (!A.length) h += '<div class="card center fade">' + flower(70) + '<p class="note-text">Anı defterimiz şimdilik boş.<br>Adana’dan sonra burayı birlikte dolduracağız 📸</p></div>';
    h += '<div class="timeline">';
    A.forEach(function (a) {
      h += '<div class="card memory fade"><div class="date">' + esc(a.tarih) + '</div><h3>' + esc(a.baslik) + '</h3><p>' + esc(a.metin) + '</p>' +
        (a.foto ? '<img class="note-photo" src="' + esc(a.foto) + '" alt="">' : "") + '</div>';
    });
    app.innerHTML = h + '</div>' + tabbar();
  };

  R.todo = function () {
    var list = (C.yapilacaklar || []).map(function (t, i) { return { id: "c" + i, t: t }; })
      .concat(state.added.map(function (t, i) { return { id: "a" + i, t: t }; }));
    var h = '<h1 class="page-title">Birlikte yapacaklarımız</h1><p class="page-sub">Kavuştuğumuzda yapacaklarımız. Sen de ekle!</p><div class="card fade">';
    list.forEach(function (x) {
      var d = state.todos[x.id];
      h += '<div class="todo' + (d ? " done" : "") + '"><button data-t="' + x.id + '" aria-label="İşaretle">' + (d ? "✓" : "") + '</button><span>' + esc(x.t) + '</span></div>';
    });
    h += '<div class="add"><input id="new" placeholder="Bir fikir ekle…" maxlength="80"><button id="addb" aria-label="Ekle">+</button></div></div>';
    app.innerHTML = h + tabbar();
    app.querySelectorAll("[data-t]").forEach(function (b) {
      b.onclick = function () { state.todos[b.dataset.t] = !state.todos[b.dataset.t]; save(); showTab("todo"); };
    });
    function add() { var v = app.querySelector("#new").value.trim(); if (v) { state.added.push(v); save(); showTab("todo"); } }
    app.querySelector("#addb").onclick = add;
    app.querySelector("#new").onkeydown = function (e) { if (e.key === "Enter") add(); };
  };

  // ---------- Sürpriz: kazı-kazan kuponlar ve oyun ----------
  R.fun = function () {
    var K = C.kuponlar || [];
    var h = '<h1 class="page-title">Sürprizler</h1><p class="page-sub">Kazı, bak, buluşunca kullan 💝</p>';
    h += '<div class="card game-card fade"><div class="game-ico">🧠💗</div><div><b>Beni ne kadar tanıyorsun?</b><small>' +
      ((C.sorular || []).length) + ' sorudan her seferinde 10 tanesi gelir</small></div>' +
      (state.best !== undefined ? '<span class="best">En iyi: ' + state.best + '/10</span>' : "") + '<button class="btn" id="play">OYNA</button></div>';
    h += '<div class="coupons">';
    K.forEach(function (k, i) {
      var st = state.coupons[i] || {};
      h += '<div class="coupon' + (st.used ? " used" : "") + '"><div class="c-inner"><span class="c-ico">' + esc(k.ikon || "🎟️") + '</span><b>' + esc(k.baslik) + '</b>' +
        (k.metin ? '<small>' + esc(k.metin) + '</small>' : "") +
        (st.used ? '<span class="stamp">Kullanıldı</span>' : '<button class="use" data-use="' + i + '">Kullan</button>') + '</div>' +
        (st.open ? "" : '<canvas class="scratch" data-sc="' + i + '"></canvas>') + '</div>';
    });
    app.innerHTML = h + '</div>' + tabbar();
    bindTabs();
    app.querySelector("#play").onclick = startQuiz;
    app.querySelectorAll("[data-use]").forEach(function (b) {
      b.onclick = function () {
        if (b.dataset.confirm) { state.coupons[b.dataset.use].used = 1; save(); R.fun(); return; }
        b.dataset.confirm = 1; b.textContent = "Emin misin? Dokun";
      };
    });
    app.querySelectorAll("canvas.scratch").forEach(scratch);
  };
  function scratch(cv) {
    var i = +cv.dataset.sc, box = cv.parentNode, w = box.offsetWidth, hh = box.offsetHeight, dpr = window.devicePixelRatio || 1;
    cv.width = w * dpr; cv.height = hh * dpr;
    var ctx = cv.getContext("2d");
    ctx.scale(dpr, dpr);
    var g = ctx.createLinearGradient(0, 0, w, hh);
    g.addColorStop(0, "#ffc1d4"); g.addColorStop(1, "#f06c94");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, hh);
    ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.font = "700 16px Nunito, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("✨ Kazı ✨", w / 2, hh / 2 + 6);
    ctx.globalCompositeOperation = "destination-out";
    var down = false, moves = 0;
    function at(e) { var r = cv.getBoundingClientRect(), t = e.touches ? e.touches[0] : e; return [t.clientX - r.left, t.clientY - r.top]; }
    function draw(e) {
      if (!down) return;
      e.preventDefault();
      var pt = at(e); ctx.beginPath(); ctx.arc(pt[0], pt[1], 22, 0, Math.PI * 2); ctx.fill();
      if (++moves % 10 === 0 && cleared() > 0.5) reveal();
    }
    function cleared() {
      var d = ctx.getImageData(0, 0, cv.width, cv.height).data, n = 0, tot = 0;
      for (var k = 3; k < d.length; k += 64) { tot++; if (d[k] === 0) n++; }
      return n / tot;
    }
    function reveal() {
      down = false; cv.style.transition = "opacity .5s"; cv.style.opacity = 0;
      state.coupons[i] = state.coupons[i] || {}; state.coupons[i].open = 1; save();
      hearts(box); setTimeout(function () { cv.remove(); }, 500);
    }
    cv.addEventListener("pointerdown", function (e) { down = true; draw(e); });
    cv.addEventListener("pointermove", draw);
    window.addEventListener("pointerup", function () { down = false; });
    cv.addEventListener("touchmove", function (e) { e.preventDefault(); }, { passive: false });
  }

  // Bilgi yarışması
  var Q = null;
  function shuffled(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function startQuiz() {
    var all = C.sorular || [];
    if (!all.length) return;
    Q = { list: shuffled(all).slice(0, 10), pos: 0, score: 0 };
    quizStep();
  }
  function quizStep() {
    window.scrollTo(0, 0);
    if (Q.pos >= Q.list.length) return quizEnd();
    var q = Q.list[Q.pos];
    var opts = q.secenekler.map(function (o, i) { return { t: o, i: i }; });
    if (!q.sabit) opts = shuffled(opts);
    app.innerHTML = '<button class="back" id="back" aria-label="Çık">✕</button><div class="quiz fade">' +
      '<div class="q-bar"><span style="width:' + Math.round(Q.pos / Q.list.length * 100) + '%"></span></div>' +
      '<div class="q-meta">' + (Q.pos + 1) + ' / ' + Q.list.length + (q.tur ? ' · ' + esc(q.tur) : "") + '</div>' +
      '<h2 class="q-text">' + esc(q.soru) + '</h2><div class="q-opts">' + opts.map(function (o) {
        return '<button class="q-opt" data-i="' + o.i + '">' + esc(o.t) + '</button>';
      }).join("") + '</div><div id="q-fb"></div></div>';
    app.querySelector("#back").onclick = function () { Q = null; showTab("fun"); };
    app.querySelectorAll(".q-opt").forEach(function (b) {
      b.onclick = function () {
        var i = +b.dataset.i, ok = q.dogru === -1 || i === q.dogru;
        if (ok) Q.score++;
        app.querySelectorAll(".q-opt").forEach(function (x) {
          x.disabled = true;
          var xi = +x.dataset.i;
          if (q.dogru === -1 ? xi === i : xi === q.dogru) x.classList.add("right");
          else if (xi === i) x.classList.add("wrong");
        });
        if (ok) hearts(b);
        app.querySelector("#q-fb").innerHTML = '<div class="q-react ' + (ok ? "ok" : "no") + ' fade">' +
          esc(ok ? (q.tepki || "Doğru! Beni çok iyi tanıyorsun 💗") : (q.tepki_yanlis || "Olmadı ama seni yine de çok seviyorum 😄")) + '</div>' +
          '<button class="btn" id="next">' + (Q.pos + 1 < Q.list.length ? "Sonraki soru" : "Sonucu gör") + '</button>';
        app.querySelector("#next").onclick = function () { Q.pos++; quizStep(); };
      };
    });
  }
  function quizEnd() {
    var s = Q.score, n = Q.list.length;
    if (state.best === undefined || s > state.best) { state.best = s; save(); }
    var t = s >= 9 ? ["Faho uzmanı 🏆", "Beni benden iyi tanıyorsun!"] : s >= 7 ? ["Kalp okuyucu 💞", "Çok az kaldı, neredeyse kusursuz."] :
      s >= 4 ? ["Tatlı tahminci 🌸", "Adana'da eksikleri birlikte tamamlarız 😄"] : ["Sürprizlerle dolu 🙈", "Demek ki daha çok konuşmamız lazım!"];
    app.innerHTML = '<div class="quiz center fade">' + flower(90) + '<h1 class="page-title">' + s + ' / ' + n + '</h1>' +
      '<h2 class="q-text">' + t[0] + '</h2><p class="note-text">' + t[1] + '</p>' +
      '<button class="btn" id="again">Tekrar oyna</button><br><button class="btn soft" id="out">Sürprizlere dön</button></div>';
    hearts(app.querySelector(".page-title"));
    app.querySelector("#again").onclick = startQuiz;
    app.querySelector("#out").onclick = function () { Q = null; showTab("fun"); };
  }

  // ---------- Özel günler ----------
  function start() {
    var d = new Date(), md = String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    var sp = (C.ozel_gunler || []).filter(function (x) { return x.tarih === md; })[0];
    if (sp && !state.special[todayKey()]) {
      app.innerHTML = '<div class="special fade"><div class="sp-ico">' + esc(sp.ikon || "🎉") + '</div><h1 class="script">' + esc(sp.baslik) + '</h1>' +
        '<div class="note-text">' + esc(sp.metin) + '</div><div class="sign">' + esc(C.imza || "") + '</div>' +
        '<button class="btn" id="spok">Teşekkürler 💗</button></div>';
      var el = app.querySelector(".sp-ico");
      [0, 400, 800, 1300].forEach(function (ms) { setTimeout(function () { hearts(el); }, ms); });
      app.querySelector("#spok").onclick = function () { state.special[todayKey()] = 1; save(); showTab("home"); };
      return;
    }
    showTab("home");
  }

  // ---------- Kalp efektleri ----------
  function hearts(el) {
    var r = el.getBoundingClientRect(), icons = ["💗", "💕", "💖", "🌸", "🌼"];
    for (var i = 0; i < 8; i++) {
      var s = document.createElement("span");
      s.className = "burst"; s.textContent = icons[i % icons.length];
      s.style.left = (r.left + r.width / 2 - 13) + "px"; s.style.top = (r.top + 10) + "px";
      s.style.setProperty("--dx", (Math.random() * 160 - 80) + "px");
      s.style.animationDelay = (i * 0.06) + "s";
      document.body.appendChild(s);
      setTimeout(function (x) { x.remove(); }.bind(null, s), 1700);
    }
  }
  function confettiHearts(el) { hearts(el); }

  // ---------- Başlangıç ----------
  if (state.pw) {
    getEnc().then(function (enc) { return decrypt(state.pw, enc); })
      .then(function (c) { C = c; start(); })
      .catch(function () { delete state.pw; save(); renderLock(false); });
  } else renderLock(false);

  // Sayaç her dakika yenilenir
  setInterval(function () { if (C && tab === "home" && !app.querySelector(".paper")) { R.home(); bindTabs(); } }, 60000);

  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(function () {});
})();
