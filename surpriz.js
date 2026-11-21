/* Sürpriz sekmesi: günün çarkı (ortak plan) ve iki telefonda görünen sevgi kuponları.
   Çark: günde bir kez çevrilir; kim çevirirse çevirsin sonuç iki telefona da gider (önce çevrilen geçerli).
   Kuponlar onun telefonunda kazınır ve kullanılır; durum Faho'nun telefonunda görünür. Mesajlar kalp kanalından (kalp.js) şifreli gider. */
(function () {
  "use strict";
  var B = window.BZ, K = window.KALP, DAY = 86400000;
  var PLAN = [
    ["🎬", "Aynı anda aynı filmi izleyelim"], ["📞", "Bu akşam görüntülü konuşalım"], ["🎵", "Birbirimize 3 şarkı gönderelim"],
    ["📸", "Bugünün en güzel fotoğrafını gönder"], ["✍️", "Birbirimize kısa bir mektup yazalım"], ["🍳", "Aynı akşam aynı yemeği yapalım"],
    ["🌙", "Uyumadan önce 10 dakika sesli konuşalım"], ["🗺️", "Bir sonraki buluşmamızı planlayalım"], ["🎮", "Birlikte bir oyun oynayalım"],
    ["☕", "Sabah kahvesini görüntülü içelim"], ["📚", "Aynı kitaptan birer sayfa okuyalım"], ["🌟", "Birbirimize 5 iltifat yazalım"],
    ["🎤", "Birbirimize sesli mesaj bırakalım"], ["🧩", "Yapbozu birlikte bitirelim"], ["😂", "En komik fotoğrafını gönder"],
    ["🎁", "Ona küçük bir sürpriz hazırla"], ["🌅", "Gün batımının fotoğrafını çek"], ["📝", "Planlara yeni bir hayal ekleyelim"],
    ["🍿", "Bir dizi bölümünü birlikte izleyelim"], ["🗓️", "Hafta sonu ikimize bir saat ayıralım"], ["🚶", "Yürüyüşe çık, görüntülü gezdir"],
    ["💌", "Ona eski bir anımızı hatırlat"], ["🥰", "Ona neden onu sevdiğini anlat"], ["🌸", "Bugün birbirimize 'iyi ki' diyelim"]
  ];
  var SEG = 8, COLORS = ["#ffd0dd", "#ffe7c7", "#f9c6e8", "#d9ecff", "#ffd0dd", "#e3f6ea", "#f9c6e8", "#fff1b8"];

  var st = B.state;
  if (!st.cark) st.cark = {};
  if (!st.coupons) st.coupons = {};
  function today() { return K.dayKey(Date.now()); }
  function dk(g) { var p = g.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]).getTime(); }
  function dayNo(g) { return Math.round((dk(g) - new Date(2026, 0, 1).getTime()) / DAY); }
  // Günün 8 dilimi: liste her gün kayarak döner
  function pool(g) { var n = dayNo(g), a = []; for (var j = 0; j < SEG; j++) a.push(PLAN[(((n * 5 + j * 3) % PLAN.length) + PLAN.length) % PLAN.length]); return a; }
  function trim() { Object.keys(st.cark).forEach(function (g) { if (Date.now() - dk(g) > 14 * DAY) delete st.cark[g]; }); }
  function box(id) { return B.app.querySelector("#" + id); }

  // ---------- Çark ----------
  function pushCark(g, ack) {
    var r = st.cark[g]; if (!r) return;
    K.send({ k: K.me(), tip: "cark", g: g, i: r.i, t: r.t, by: r.by, ack: !!ack }).catch(function () {});
  }
  K.on("cark", function (d, m) {
    if (!d.g || !(d.i >= 0 && d.i < SEG)) return;
    var r = st.cark[d.g], changed = false;
    if (!r || d.t < r.t) { st.cark[d.g] = r = { i: d.i, t: d.t, by: d.by }; changed = true; }
    if (r.i === d.i) r.ack = 1;
    trim(); B.save();
    if (!d.ack) pushCark(d.g, true);
    if (changed && d.g === today()) {
      paintCark();
      if (m.time * 1000 > Date.now() - 90000) K.toast("🎡 " + K.name(d.by) + " günün çarkını çevirdi!");
    }
  }, function () {
    var r = st.cark[today()]; if (r && !r.ack) pushCark(today(), false);
  });

  function wheelHtml(g, rot) {
    var p = pool(g), stops = [], labels = "";
    for (var j = 0; j < SEG; j++) {
      stops.push(COLORS[j] + " " + (j * 45) + "deg " + ((j + 1) * 45) + "deg");
      labels += '<span style="transform:rotate(' + (j * 45 + 22.5) + 'deg)"><i>' + p[j][0] + '</i></span>';
    }
    return '<div class="wheel-wrap"><div class="wheel-pin">▼</div><div class="wheel" id="wheel" style="background:conic-gradient(' + stops.join(",") +
      ');transform:rotate(' + rot + 'deg)">' + labels + '<b class="wheel-hub">💗</b></div></div>';
  }
  function restRot(i) { return 360 - (i * 45 + 22.5); }
  function paintCark() {
    var el = box("cark"); if (!el) return;
    var g = today(), r = st.cark[g], p = pool(g);
    var h = '<h2>Günün çarkı 🎡</h2>';
    if (r) {
      h += wheelHtml(g, restRot(r.i)) + '<div class="plan fade"><span>' + p[r.i][0] + '</span><div><small>Bugünkü planımız</small><b>' + B.esc(p[r.i][1]) + '</b></div></div>' +
        '<p class="muted center"><small>' + (r.by === K.me() ? "Sen çevirdin" : B.esc(K.name(r.by)) + " çevirdi") + ' · Yarın yeni çark 🌙</small></p>';
    } else {
      h += '<p class="muted center">Bugün birlikte ne yapacağımızı çark seçsin. Kim çevirirse çevirsin, sonuç ikimizin telefonunda da görünür.</p>' +
        wheelHtml(g, 0) + '<button class="btn" id="spin">Çarkı çevir</button>';
    }
    el.innerHTML = h;
    var bt = el.querySelector("#spin");
    if (bt) bt.onclick = function () {
      bt.disabled = true;
      var i = Math.floor(Math.random() * SEG), wh = el.querySelector("#wheel");
      wh.style.transition = "transform 4s cubic-bezier(.17,.67,.2,1)";
      wh.style.transform = "rotate(" + (360 * 6 + restRot(i)) + "deg)";
      try { if (navigator.vibrate) navigator.vibrate(20); } catch (x) {}
      setTimeout(function () {
        if (st.cark[g]) { paintCark(); return; } // bu arada karşı taraf çevirdiyse onunki geçerli
        st.cark[g] = { i: i, t: Date.now(), by: K.me() }; trim(); B.save();
        paintCark(); B.hearts(el);
        if (window.BUGUN) BUGUN.aktif();
        pushCark(g, false);
        K.notify("Günün çarkını çevirdi 🎡");
      }, 4100);
    };
  }

  // ---------- Kuponlar ----------
  // Durum kodu: her kupon için 0 kapalı, 1 kazındı, 2 kullanıldı
  function code() {
    return (B.C.kuponlar || []).map(function (k, i) { var c = st.coupons[i] || {}; return c.used ? "2" : c.open ? "1" : "0"; }).join("");
  }
  function pushKupon() {
    if (K.me() !== "o") return;
    var v = code(); if (v === st.kuponAck || !/[12]/.test(v)) return;
    K.send({ k: K.me(), tip: "kupon", v: v }).catch(function () {});
  }
  K.on("kupon", function (d, m) {
    if (d.ack !== undefined) { if (K.me() === "o") { st.kuponAck = d.ack; B.save(); } return; }
    if (typeof d.v !== "string" || K.me() !== "faho") return;
    var old = st.kuponOnun || "", L = B.C.kuponlar || [];
    st.kuponOnun = d.v.slice(0, 60); B.save();
    K.send({ k: K.me(), tip: "kupon", ack: st.kuponOnun }).catch(function () {});
    if (m.time * 1000 > Date.now() - 90000) {
      for (var i = 0; i < d.v.length; i++) {
        if (d.v[i] === "2" && old[i] !== "2" && L[i]) { K.toast("🎟️ " + K.name(d.k) + " kullandı: " + L[i].baslik); break; }
        if (d.v[i] === "1" && (old[i] || "0") === "0" && L[i]) { K.toast("✨ " + K.name(d.k) + " bir kupon kazıdı"); break; }
      }
    }
    paintKupon();
  }, pushKupon);

  function stats(v) {
    var o = 0, u = 0; for (var i = 0; i < v.length; i++) { if (v[i] !== "0") o++; if (v[i] === "2") u++; } return { o: o, u: u };
  }
  function paintKupon() {
    var el = box("kuponlar"); if (!el) return;
    var L = B.C.kuponlar || [], faho = K.me() === "faho";
    var v = faho ? (st.kuponOnun || "") : code(), s = stats(v), n = L.length;
    var h = '<div class="k-head"><div><b>' + s.o + ' / ' + n + '</b><small>' + (faho ? "kazıdı" : "kazındı") + '</small></div><div><b>' + s.u +
      '</b><small>kullanıldı</small></div><div class="k-bar"><span style="width:' + (n ? Math.round(s.o / n * 100) : 0) + '%"></span></div></div>';
    h += '<p class="page-sub">' + (faho ? "Ona verdiğin kuponlar. Kazıdıkça ve kullandıkça burada görürsün." : "Kazı, bak, buluşunca kullan 💝") + '</p><div class="coupons">';
    L.forEach(function (k, i) {
      var c = st.coupons[i] || {}, used = faho ? v[i] === "2" : c.used, open = faho ? (v[i] || "0") !== "0" : c.open;
      h += '<div class="coupon' + (used ? " used" : "") + '"><div class="c-inner"><span class="c-ico">' + B.esc(k.ikon || "🎟️") + '</span><b>' + B.esc(k.baslik) + '</b>' +
        (k.metin ? '<small>' + B.esc(k.metin) + '</small>' : "");
      if (faho) h += used ? '<span class="stamp">Kullandı</span>' : '<span class="k-tag' + (open ? " on" : "") + '">' + (open ? "Kazıdı ✨" : "Henüz kapalı") + '</span>';
      else h += used ? '<span class="stamp">Kullanıldı</span>' : '<button class="use" data-use="' + i + '">Kullan</button>';
      h += '</div>' + (!faho && !open ? '<canvas class="scratch" data-sc="' + i + '"></canvas>' : "") + '</div>';
    });
    el.innerHTML = h + '</div>';
    el.querySelectorAll("[data-use]").forEach(function (b) {
      b.onclick = function () {
        var i = +b.dataset.use;
        if (!b.dataset.confirm) { b.dataset.confirm = 1; b.textContent = "Emin misin? Dokun"; return; }
        st.coupons[i] = st.coupons[i] || {}; st.coupons[i].used = 1; B.save();
        paintKupon(); pushKupon();
        K.notify("Bir sevgi kuponu kullandı 🎟️");
      };
    });
    el.querySelectorAll("canvas.scratch").forEach(function (cv) {
      B.scratch(cv, function () {
        var i = +cv.dataset.sc; st.coupons[i] = st.coupons[i] || {}; st.coupons[i].open = 1; B.save();
        pushKupon(); setTimeout(paintHead, 520);
      });
    });
  }
  function paintHead() {
    var el = box("kuponlar"); if (!el) return;
    var s = stats(code()), n = (B.C.kuponlar || []).length, hd = el.querySelector(".k-head");
    if (!hd) return;
    hd.querySelector("b").textContent = s.o + " / " + n;
    hd.querySelector(".k-bar span").style.width = (n ? Math.round(s.o / n * 100) : 0) + "%";
  }

  window.SURPRIZ = { paint: function () { paintCark(); paintKupon(); } };
})();
