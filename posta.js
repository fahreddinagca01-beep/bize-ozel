/* Posta: iki taraf birbirine not ve mektup yazar. Mesajlar kalp kanalından (kalp.js) şifreli gider.
   Ücretsiz sunucu mesajı ~12 saat tutar ve 4 KB'tan uzun mesajı kabul etmez; bu yüzden metin parçalara bölünür
   ve karşı taraf "ulaştı" diyene kadar uygulama her açılışta yeniden gönderir. Okununca "okundu" bilgisi döner. */
(function () {
  "use strict";
  var B = window.BZ, K = window.KALP, PART = 900, KEEP = 200;
  var ZARF = ["Özlediğinde aç", "Canın sıkıldığında aç", "Uyumadan önce aç", "Güne başlarken aç", "Gülümsemek istediğinde aç"];

  var st = B.state;
  if (!st.posta) st.posta = { giden: [], gelen: [], parca: {} };
  var P = st.posta, tur = st.postaTur || "not";

  function find(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function box() { return B.app.querySelector("#posta"); }
  function unread() { return P.gelen.filter(function (x) { return !x.okundu; }).length; }
  function when(t) {
    var d = new Date(t), now = new Date(), y = new Date(now.getTime() - 86400000);
    var hm = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    if (d.toDateString() === now.toDateString()) return "Bugün " + hm;
    if (d.toDateString() === y.toDateString()) return "Dün " + hm;
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" }) + " " + hm;
  }

  // ---------- Gönderme ----------
  function sendItem(it) {
    var parts = [], s = it.metin;
    for (var i = 0; i < s.length; i += PART) parts.push(s.slice(i, i + PART));
    if (!parts.length) parts.push("");
    return Promise.all(parts.map(function (c, j) {
      var o = { k: K.me(), tip: "posta", id: it.id, j: j, n: parts.length, c: c };
      if (j === 0) { o.tur = it.tur; o.baslik = it.baslik || ""; o.t = it.t; }
      return K.send(o);
    }));
  }
  function resend() {
    P.giden.forEach(function (it) { if (!it.ulasti) sendItem(it).catch(function () {}); });
  }
  // Onaylar 1,5 sn toplanıp tek mesajla gider
  var ackIds = {}, ackTimer = null;
  function ack(id) {
    ackIds[id] = 1; clearTimeout(ackTimer);
    ackTimer = setTimeout(function () {
      var ids = Object.keys(ackIds); ackIds = {};
      var ok = ids.filter(function (x) { var g = find(P.gelen, x); return g && g.okundu; });
      K.send({ k: K.me(), tip: "posta-ack", ids: ids, okundu: ok }).catch(function () {});
    }, 1500);
  }

  // ---------- Alma ----------
  K.on("posta", function (d, m) {
    if (!d.id || !(d.n >= 1 && d.n <= 10) || !(d.j >= 0 && d.j < d.n)) return;
    if (find(P.gelen, d.id)) { ack(d.id); return; }
    var pc = P.parca[d.id] || (P.parca[d.id] = { n: d.n, c: {}, at: Date.now() });
    pc.c[d.j] = String(d.c || "").slice(0, PART + 50);
    if (d.j === 0) { pc.tur = d.tur === "mektup" ? "mektup" : "not"; pc.baslik = String(d.baslik || "").slice(0, 60); pc.t = +d.t || m.time * 1000; pc.k = d.k; }
    // Eski yarım parçaları temizle
    Object.keys(P.parca).forEach(function (x) { if (Date.now() - P.parca[x].at > 7 * 86400000) delete P.parca[x]; });
    if (Object.keys(pc.c).length < pc.n || pc.tur === undefined) { B.save(); return; }
    var metin = ""; for (var j = 0; j < pc.n; j++) metin += pc.c[j];
    P.gelen.unshift({ id: d.id, tur: pc.tur, baslik: pc.baslik, metin: metin, t: pc.t, k: pc.k });
    P.gelen.sort(function (a, b) { return b.t - a.t; });
    if (P.gelen.length > KEEP) P.gelen.length = KEEP;
    delete P.parca[d.id]; B.save(); ack(d.id);
    paint(); badge();
    if (m.time * 1000 > Date.now() - 90000) {
      K.toast("💌 " + K.name(K.other()) + " sana bir " + (pc.tur === "mektup" ? "mektup" : "not") + " yazdı");
      try { if (navigator.vibrate) navigator.vibrate([40, 60, 40]); } catch (x) {}
    }
  }, resend);

  K.on("posta-ack", function (d, m) {
    var ids = Array.isArray(d.ids) ? d.ids : [], ok = Array.isArray(d.okundu) ? d.okundu : [], yeniOkundu = null;
    P.giden.forEach(function (it) {
      if (ids.indexOf(it.id) >= 0) it.ulasti = 1;
      if (ok.indexOf(it.id) >= 0 && !it.okundu) { it.okundu = 1; it.ulasti = 1; yeniOkundu = it; }
    });
    B.save(); paint();
    if (yeniOkundu && m.time * 1000 > Date.now() - 90000) K.toast("💗 " + K.name(K.other()) + " " + (yeniOkundu.tur === "mektup" ? "mektubunu" : "notunu") + " okudu");
  });

  // ---------- Okuma ----------
  function open(id) {
    var g = find(P.gelen, id); if (!g) return;
    if (!g.okundu) { g.okundu = 1; B.save(); ack(id); }
    B.reader({ baslik: g.tur === "mektup" ? g.baslik : "", metin: g.metin, imza: K.name(K.other()) }, (g.tur === "mektup" ? "Mektup" : "Not") + " · " + when(g.t));
  }
  function openMine(id) {
    var g = find(P.giden, id); if (!g) return;
    B.reader({ baslik: g.tur === "mektup" ? g.baslik : "", metin: g.metin, imza: K.name(K.me()) }, "Gönderdiğin " + (g.tur === "mektup" ? "mektup" : "not") + " · " + when(g.t));
  }

  // ---------- Ekran ----------
  // Yazma kartı yalnız gerektiğinde yeniden çizilir; yazarken gelen mesaj yazıyı bozmaz
  function paint(force) {
    var el = box(); if (!el) return;
    if (!el.querySelector("#pWrite")) el.innerHTML = '<div id="pWrite"></div><div id="pList"></div>';
    var wr = el.querySelector("#pWrite"), li = el.querySelector("#pList");
    var o = K.name(K.other()), mek = tur === "mektup";
    var h = '<div class="card write fade"><h2>' + B.esc(o) + ' için yaz ✍️</h2>' +
      '<div class="seg"><button data-tur="not" class="' + (mek ? "" : "on") + '">📝 Kısa not</button><button data-tur="mektup" class="' + (mek ? "on" : "") + '">💌 Mektup</button></div>';
    if (mek) {
      h += '<input id="pZarf" maxlength="60" placeholder="Zarfın üstüne ne yazalım? (ör. Özlediğinde aç)" value="' + B.esc(st.postaZarf || "") + '">' +
        '<div class="zarf-chips">' + ZARF.map(function (z) { return '<button data-zarf="' + B.esc(z) + '">' + B.esc(z) + '</button>'; }).join("") + '</div>';
    }
    h += '<textarea id="pMetin" rows="' + (mek ? 7 : 3) + '" maxlength="' + (mek ? 3000 : 500) + '" placeholder="' + (mek ? "Sevgili " + B.esc(o) + "…" : "Aklından geçeni yaz…") + '">' +
      B.esc(st.postaTaslak || "") + '</textarea><button class="btn" id="pGonder">' + (mek ? "Mektubu gönder 💌" : "Notu gönder 📝") + '</button></div>';

    var l = "";
    // Gelenler
    l += '<div class="sec">' + B.esc(o) + ' yazdı</div>';
    if (!P.gelen.length) l += '<div class="card center fade"><p class="muted">Henüz bir şey gelmedi. Gelince burada ve ana ekranda görünecek 🌸</p></div>';
    else l += '<div class="inbox fade">' + P.gelen.slice(0, 30).map(function (g) {
      var ico = g.tur === "mektup" ? (g.okundu ? "📨" : "💌") : "📝";
      var title = g.tur === "mektup" ? (g.baslik || "Mektup") : g.metin.slice(0, 60) + (g.metin.length > 60 ? "…" : "");
      return '<button class="mail' + (g.okundu ? "" : " new") + '" data-in="' + B.esc(g.id) + '"><span class="m-ico">' + ico + '</span><span class="m-body"><b>' +
        B.esc(title) + '</b><small>' + (g.tur === "mektup" ? "Mektup" : "Not") + ' · ' + when(g.t) + '</small></span>' + (g.okundu ? "" : '<span class="m-dot">Yeni</span>') + '</button>';
    }).join("") + '</div>';

    // Gönderilenler
    if (P.giden.length) {
      l += '<details class="sent"><summary>Gönderdiklerin (' + P.giden.length + ')</summary>' + P.giden.slice(0, 30).map(function (g) {
        var s = g.okundu ? '<span class="m-st ok">Okudu 💗</span>' : g.ulasti ? '<span class="m-st">Ulaştı ✓</span>' : '<span class="m-st wait">Gönderiliyor…</span>';
        var title = g.tur === "mektup" ? (g.baslik || "Mektup") : g.metin.slice(0, 50) + (g.metin.length > 50 ? "…" : "");
        return '<button class="mail" data-out="' + B.esc(g.id) + '"><span class="m-ico">' + (g.tur === "mektup" ? "💌" : "📝") + '</span><span class="m-body"><b>' +
          B.esc(title) + '</b><small>' + when(g.t) + '</small></span>' + s + '</button>';
      }).join("") + '</details>';
    }
    var wasOpen = li.querySelector("details.sent") && li.querySelector("details.sent").open;
    li.innerHTML = l;
    if (wasOpen) li.querySelector("details.sent").open = true;
    li.querySelectorAll("[data-in]").forEach(function (b) { b.onclick = function () { open(b.dataset.in); }; });
    li.querySelectorAll("[data-out]").forEach(function (b) { b.onclick = function () { openMine(b.dataset.out); }; });
    if (wr.firstChild && !force) return;
    wr.innerHTML = h;

    el.querySelectorAll("[data-tur]").forEach(function (b) {
      b.onclick = function () { tur = st.postaTur = b.dataset.tur; B.save(); paint(true); };
    });
    el.querySelectorAll("[data-zarf]").forEach(function (b) {
      b.onclick = function () { var z = el.querySelector("#pZarf"); z.value = st.postaZarf = b.dataset.zarf; B.save(); };
    });
    var ta = el.querySelector("#pMetin"), zf = el.querySelector("#pZarf");
    ta.oninput = function () { st.postaTaslak = ta.value; B.save(); };
    if (zf) zf.oninput = function () { st.postaZarf = zf.value; B.save(); };
    el.querySelector("#pGonder").onclick = function () {
      var v = ta.value.trim();
      if (!v) { ta.focus(); return; }
      var it = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), tur: mek ? "mektup" : "not", metin: v, t: Date.now() };
      if (mek) it.baslik = (zf.value.trim() || "Sana bir mektup").slice(0, 60);
      P.giden.unshift(it); if (P.giden.length > KEEP) P.giden.length = KEEP;
      delete st.postaTaslak; delete st.postaZarf; B.save();
      paint(true); B.hearts(el.querySelector(".write") || el);
      if (window.BUGUN) BUGUN.aktif();
      sendItem(it).then(function () {
        K.toast(mek ? "💌 Mektubun yola çıktı" : "📝 Notun gönderildi");
        K.notify(mek ? "Sana bir mektup yazdı 💌" : "Sana bir not yazdı 📝");
      }).catch(function () { K.toast("İnternet gelince gönderilecek 🌸"); });
    };
  }

  // Ana ekranda okunmamış mektup kartı ve sekme rozeti
  function paintHome() {
    var el = B.app.querySelector("#postaHome"); if (!el) return;
    var n = unread(), g = P.gelen.filter(function (x) { return !x.okundu; })[0];
    if (!n) { el.innerHTML = ""; return; }
    el.innerHTML = '<button class="card new-mail fade" id="pAc"><span class="nm-ico">💌</span><span><small>' + B.esc(K.name(K.other())) + ' sana yazdı</small><b>' +
      (n > 1 ? n + " okunmamış mesajın var" : B.esc(g.tur === "mektup" ? (g.baslik || "Bir mektup") : "Yeni bir not")) + '</b></span><span class="nm-go">Aç</span></button>';
    el.querySelector("#pAc").onclick = function () { if (n > 1) B.showTab("letters"); else open(g.id); };
  }
  function badge() {
    var b = B.app.querySelector('[data-tab="letters"]'); if (!b) return;
    b.classList.toggle("dot", unread() > 0);
    paintHome();
  }

  window.POSTA = { paint: paint, paintHome: paintHome, badge: badge, unread: unread };
})();
