/* Bize Özel oyunları: yapboz, hafıza kartları, kalp yakalama.
   Tek başına ya da iki telefonda birlikte (PeerJS ile doğrudan bağlantı) oynanır. */
(function () {
  "use strict";
  var B = window.BZ;
  var app = B.app;
  function esc(s) { return B.esc(s); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function sl(ms, f) { return setTimeout(f, ms); }

  // ---------- Kimlik ----------
  function myName() { var C = B.C; return B.state.me === "faho" ? (C.benim_adim || "Faho") : (C.ad || "Hayatım"); }
  function askWho(next) {
    if (B.state.me) return next();
    var C = B.C;
    app.innerHTML = '<div class="lock fade">' + B.flower(80) + '<h1 class="script">Sen kimsin?</h1><p>Oyunlarda adın böyle görünecek.</p>' +
      '<button class="btn" data-me="hayatim" style="max-width:280px">🌸 ' + esc(C.ad || "Hayatım") + '</button>' +
      '<button class="btn soft" data-me="faho" style="max-width:280px">😎 ' + esc(C.benim_adim || "Faho") + '</button></div>';
    app.querySelectorAll("[data-me]").forEach(function (b) { b.onclick = function () { B.state.me = b.dataset.me; B.save(); next(); }; });
  }

  // ---------- Bağlantı ----------
  var NET = { peer: null, conn: null, host: false, other: "", onMsg: null, onOpen: null, onClose: null, queue: [] };
  function netClose() {
    try { if (NET.conn) NET.conn.close(); } catch (e) {}
    try { if (NET.peer) NET.peer.destroy(); } catch (e) {}
    NET.peer = NET.conn = null; NET.onMsg = NET.onOpen = NET.onClose = null; NET.other = ""; NET.queue = [];
  }
  function onMsg(fn) { NET.onMsg = fn; while (NET.queue.length) fn(NET.queue.shift()); }
  function send(o) { if (NET.conn && NET.conn.open) NET.conn.send(o); }
  function wire(c) {
    c.on("open", function () {
      NET.conn = c; send({ t: "hello", name: myName() });
    });
    c.on("data", function (d) {
      if (d && d.t === "hello") { NET.other = d.name; if (NET.onOpen) NET.onOpen(); return; }
      if (NET.onMsg) NET.onMsg(d); else NET.queue.push(d); // oyun ekranı hazır değilse sıraya al
    });
    c.on("close", function () { if (NET.onClose) NET.onClose(); });
  }
  var PREFIX = "bize-ozel-oda-";
  function hostRoom(game, onCode, onErr) {
    if (!window.Peer) return onErr("Bağlantı aracı yüklenemedi. İnterneti kontrol et.");
    var code = String(1000 + Math.floor(Math.random() * 9000));
    NET.host = true;
    NET.peer = new Peer(PREFIX + game + "-" + code);
    NET.peer.on("open", function () { onCode(code); });
    NET.peer.on("connection", function (c) { if (NET.conn) { c.close(); return; } wire(c); });
    NET.peer.on("error", function (e) {
      if (e.type === "unavailable-id") { netClose(); hostRoom(game, onCode, onErr); }
      else onErr("Bağlantı kurulamadı (" + e.type + "). Wi-Fi'ye geçip tekrar dene.");
    });
  }
  function joinRoom(game, code, onErr) {
    if (!window.Peer) return onErr("Bağlantı aracı yüklenemedi. İnterneti kontrol et.");
    NET.host = false;
    NET.peer = new Peer();
    NET.peer.on("open", function () { wire(NET.peer.connect(PREFIX + game + "-" + code, { reliable: true })); });
    NET.peer.on("error", function (e) {
      onErr(e.type === "peer-unavailable" ? "Bu kodla oda bulunamadı. Kodu kontrol et." : "Bağlantı kurulamadı (" + e.type + "). Wi-Fi'ye geçip tekrar dene.");
    });
  }

  // ---------- Oyun lobisi ----------
  // start(net): net=false tek kişi, net=true bağlantı kuruldu
  function lobby(game, title, icon, desc, start) {
    askWho(function () {
      netClose();
      app.innerHTML = '<button class="back" id="back" aria-label="Geri">←</button><div class="lobby fade"><div class="big-ico">' + icon + '</div>' +
        '<h1 class="page-title center">' + esc(title) + '</h1><p class="page-sub center">' + esc(desc) + '</p>' +
        '<button class="btn" id="solo">Tek başına oyna</button>' +
        '<div class="card center"><h2>Birlikte oyna</h2><button class="btn soft" id="host">Oda kur</button>' +
        '<div class="join"><input id="code" inputmode="numeric" maxlength="4" placeholder="Kod"><button class="btn" id="join">Katıl</button></div>' +
        '<p class="muted" id="netmsg">Biri oda kurar, diğeri kodu girer.</p></div></div>';
      var msg = app.querySelector("#netmsg");
      app.querySelector("#back").onclick = function () { netClose(); B.showTab("fun"); };
      app.querySelector("#solo").onclick = function () { start(false); };
      function ready() { msg.textContent = NET.other + " bağlandı! 💞"; sl(700, function () { start(true); }); }
      app.querySelector("#host").onclick = function () {
        netClose(); msg.textContent = "Oda kuruluyor…";
        NET.onOpen = ready;
        hostRoom(game, function (code) { msg.innerHTML = 'Oda kodu: <b class="room">' + code + '</b><br>Bu kodu ' + (B.state.me === "faho" ? esc(B.C.ad) : esc(B.C.benim_adim || "Faho")) + '’ya söyle.'; },
          function (e) { msg.textContent = e; });
      };
      app.querySelector("#join").onclick = function () {
        var code = app.querySelector("#code").value.trim();
        if (!/^\d{4}$/.test(code)) { msg.textContent = "4 haneli kodu gir."; return; }
        netClose(); msg.textContent = "Bağlanıyor…";
        NET.onOpen = ready;
        joinRoom(game, code, function (e) { msg.textContent = e; });
      };
    });
  }
  function header(title, extra) {
    return '<div class="g-head"><button class="back" id="gback" aria-label="Çık">✕</button><b>' + esc(title) + '</b>' + (extra || "") + '</div>';
  }
  function bindBack(cb) {
    app.querySelector("#gback").onclick = function () { if (cb) cb(); netClose(); B.showTab("fun"); };
  }
  function lostNote() { var d = document.createElement("div"); d.className = "toast"; d.textContent = "Bağlantı koptu 😢"; document.body.appendChild(d); sl(2500, function () { d.remove(); }); }

  // ---------- 1) Yapboz ----------
  function puzzle() {
    var P = (B.C.yapboz || [])[0];
    lobby("yapboz", "Yapboz", "🧩", "Parçalara dokunup yer değiştir. Birlikte oynarsanız aynı yapbozu beraber çözersiniz.", function (net) {
      var N = 3, img = P ? P.foto : null, order, sel = -1, moves = 0;
      function init(o) { order = o; draw(); }
      function solved() { return order.every(function (v, i) { return v === i; }); }
      function draw() {
        var tiles = "";
        order.forEach(function (t, pos) {
          var x = t % N, y = Math.floor(t / N);
          tiles += '<button class="tile' + (pos === sel ? " sel" : "") + (t === pos ? " ok" : "") + '" data-p="' + pos + '" style="' +
            (img ? 'background-image:url(' + img + ');background-size:' + N * 100 + '% ' + N * 100 + '%;background-position:' + (x * 100 / (N - 1)) + '% ' + (y * 100 / (N - 1)) + '%' : "") + '">' +
            (img ? "" : '<span>' + (t + 1) + '</span>') + '</button>';
        });
        app.innerHTML = header("Yapboz", net ? '<span class="vs">🤝 ' + esc(NET.other) + '</span>' : "") +
          '<div class="board" style="grid-template-columns:repeat(' + N + ',1fr)">' + tiles + '</div>' +
          '<p class="muted center">' + moves + ' hamle' + (P && P.baslik ? ' · ' + esc(P.baslik) : "") + '</p>' +
          (!net || NET.host ? '<div class="sizes"><button data-n="3" class="' + (N === 3 ? "on" : "") + '">3×3</button><button data-n="4" class="' + (N === 4 ? "on" : "") + '">4×4</button><button data-n="5" class="' + (N === 5 ? "on" : "") + '">5×5</button></div>' : "") +
          (img ? '<details class="peek"><summary>Resmin tamamına bak</summary><img src="' + img + '" alt=""></details>' : "");
        bindBack();
        app.querySelectorAll(".tile").forEach(function (b) { b.onclick = function () { tap(+b.dataset.p, true); }; });
        app.querySelectorAll("[data-n]").forEach(function (b) {
          b.onclick = function () { N = +b.dataset.n; moves = 0; sel = -1; newGame(); };
        });
        if (solved()) win();
      }
      function tap(p, mine) {
        if (sel === -1) { sel = p; draw(); return; }
        if (sel !== p) swap(sel, p, mine);
        sel = -1; draw();
      }
      function swap(a, b, mine) {
        var t = order[a]; order[a] = order[b]; order[b] = t; moves++;
        if (mine && net) send({ t: "swap", a: a, b: b });
      }
      function win() {
        var box = app.querySelector(".board");
        box.classList.add("done");
        B.hearts(box);
        var m = document.createElement("div");
        m.className = "card center fade win";
        m.innerHTML = '<div class="note-title">' + (net ? "Birlikte başardık! 💞" : "Tamamlandı! 🌸") + '</div><p class="muted">' + moves + ' hamlede bitti.</p>' +
          (!net || NET.host ? '<button class="btn" id="again">Yeniden karıştır</button>' : '<p class="muted">Yeni oyunu ' + esc(NET.other) + ' başlatabilir.</p>');
        box.after(m);
        var a = app.querySelector("#again"); if (a) a.onclick = newGame;
      }
      function newGame() {
        var o; do { o = shuffle(Array.apply(null, Array(N * N)).map(function (_, i) { return i; })); } while (o.every(function (v, i) { return v === i; }));
        moves = 0; sel = -1;
        if (net) send({ t: "init", n: N, order: o });
        init(o);
      }
      if (net) {
        onMsg(function (d) {
          if (d.t === "init") { N = d.n; moves = 0; sel = -1; init(d.order); }
          if (d.t === "swap") { swap(d.a, d.b, false); if (sel === d.a || sel === d.b) sel = -1; draw(); }
        });
        NET.onClose = lostNote;
        if (NET.host) newGame(); else app.innerHTML = header("Yapboz") + '<p class="center muted">Oyun başlıyor…</p>', bindBack();
      } else newGame();
    });
  }

  // ---------- 2) Hafıza kartları ----------
  var CARDS = [["🌼", "Nergis"], ["💗", "Kalp"], ["🫓", "Bazlama"], ["🌶️", "Adana"], ["🌸", "Çiçek"], ["💌", "Mektup"], ["☕", "Kahvaltı"], ["🎀", "Pembe"]];
  function memory() {
    lobby("hafiza", "Hafıza kartları", "🃏", "Kartları çevir, eşleri bul. Birlikte oynarsanız sırayla çevirirsiniz; çok eş bulan kazanır.", function (net) {
      var deck, open = [], done = {}, turn, score, busy = false, tries = 0;
      var names = net ? (NET.host ? [myName(), NET.other] : [NET.other, myName()]) : [myName()];
      var meIdx = net ? (NET.host ? 0 : 1) : 0;
      function init(d) { deck = d; open = []; done = {}; turn = 0; score = [0, 0]; tries = 0; busy = false; draw(); }
      function draw() {
        var head = net ? '<div class="scores">' + names.map(function (n, i) {
          return '<span class="' + (turn === i ? "on" : "") + '">' + esc(n) + ': ' + score[i] + '</span>';
        }).join("") + '</div>' : '<div class="scores"><span class="on">Deneme: ' + tries + '</span></div>';
        app.innerHTML = header("Hafıza kartları") + head +
          (net ? '<p class="muted center">' + (turn === meIdx ? "Sıra sende 💗" : "Sıra " + esc(names[turn]) + "’da") + '</p>' : "") +
          '<div class="mem">' + deck.map(function (c, i) {
            var up = open.indexOf(i) >= 0 || done[i];
            return '<button class="mcard' + (up ? " up" : "") + (done[i] ? " done" : "") + '" data-i="' + i + '"><span class="front">' + CARDS[c][0] +
              '<small>' + CARDS[c][1] + '</small></span><span class="backside">🌼</span></button>';
          }).join("") + '</div>';
        bindBack();
        app.querySelectorAll(".mcard").forEach(function (b) { b.onclick = function () { flip(+b.dataset.i, true); }; });
        if (Object.keys(done).length === deck.length) finish();
      }
      function flip(i, mine) {
        if (mine && (busy || (net && turn !== meIdx))) return;
        if (done[i] || open.indexOf(i) >= 0 || open.length === 2) return;
        if (mine && net) send({ t: "flip", i: i });
        open.push(i); draw();
        if (open.length === 2) {
          busy = true; tries++;
          var a = open[0], b = open[1];
          if (deck[a] === deck[b]) {
            sl(450, function () { done[a] = done[b] = 1; score[turn]++; open = []; busy = false; draw(); B.hearts(app.querySelector(".mem")); });
          } else {
            sl(1000, function () { open = []; busy = false; if (net) turn = 1 - turn; draw(); });
          }
        }
      }
      function finish() {
        var txt;
        if (!net) txt = tries + " denemede bitirdin! 🌸";
        else txt = score[0] === score[1] ? "Berabere! Zaten biz bir takımız 💞" : esc(names[score[0] > score[1] ? 0 : 1]) + " kazandı! 🏆";
        var m = document.createElement("div");
        m.className = "card center fade win";
        m.innerHTML = '<div class="note-title">' + txt + '</div>' + (!net || NET.host ? '<button class="btn" id="again">Yeniden oyna</button>' : '<p class="muted">Yeni oyunu ' + esc(NET.other) + ' başlatabilir.</p>');
        app.querySelector(".mem").after(m);
        B.hearts(m);
        var a = app.querySelector("#again"); if (a) a.onclick = newGame;
      }
      function newGame() {
        var d = shuffle(CARDS.map(function (_, i) { return i; }).concat(CARDS.map(function (_, i) { return i; })));
        if (net) send({ t: "init", deck: d });
        init(d);
      }
      if (net) {
        onMsg(function (d) { if (d.t === "init") init(d.deck); if (d.t === "flip") flip(d.i, false); });
        NET.onClose = lostNote;
        if (NET.host) newGame(); else { app.innerHTML = header("Hafıza kartları") + '<p class="center muted">Oyun başlıyor…</p>'; bindBack(); }
      } else newGame();
    });
  }

  // ---------- 3) Kalp yakalama ----------
  var ITEMS = [["💗", 1, 50], ["🌼", 2, 25], ["🫓", 3, 10], ["☁️", -3, 15]];
  function catcher() {
    lobby("kalp", "Kalp yakalama", "🧺", "Sepetle kalpleri, nergisleri ve bazlamaları yakala; bulutlardan kaç. 45 saniye! Birlikte oynarsanız aynı anda yarışırsınız.", function (net) {
      var other = 0, otherDone = false, raf = 0, timer = 0;
      function screen() {
        app.innerHTML = header("Kalp yakalama", '<span class="vs" id="hud"></span>') +
          '<div class="arena"><canvas id="cv"></canvas><div class="overlay" id="ov"></div></div>';
        bindBack(function () { cancelAnimationFrame(raf); clearInterval(timer); });
      }
      function countdown(then) {
        var ov = app.querySelector("#ov"), n = 3;
        ov.style.display = "grid"; ov.innerHTML = '<b>' + n + '</b>';
        var t = setInterval(function () { n--; if (n > 0) ov.innerHTML = '<b>' + n + '</b>'; else { clearInterval(t); ov.style.display = "none"; then(); } }, 800);
      }
      function play() {
        var cv = app.querySelector("#cv"), box = cv.parentNode, dpr = window.devicePixelRatio || 1;
        var W = box.clientWidth, H = box.clientHeight;
        cv.width = W * dpr; cv.height = H * dpr;
        var ctx = cv.getContext("2d"); ctx.scale(dpr, dpr);
        var bx = W / 2, score = 0, left = 45, drops = [], last = performance.now(), t0 = last, spawn = 0, flash = 0;
        var hud = app.querySelector("#hud");
        function hudTxt() { hud.innerHTML = '⏱ ' + Math.ceil(left) + ' · ' + esc(myName()) + ': <b>' + score + '</b>' + (net ? ' · ' + esc(NET.other) + ': <b>' + other + '</b>' : ""); }
        function move(e) { var r = cv.getBoundingClientRect(), t = e.touches ? e.touches[0] : e; bx = Math.max(30, Math.min(W - 30, t.clientX - r.left)); }
        cv.addEventListener("pointermove", move); cv.addEventListener("pointerdown", move);
        cv.addEventListener("touchmove", function (e) { e.preventDefault(); move(e); }, { passive: false });
        if (net) timer = setInterval(function () { send({ t: "score", s: score }); }, 700);
        function pick() { var r = Math.random() * 100, acc = 0; for (var i = 0; i < ITEMS.length; i++) { acc += ITEMS[i][2]; if (r < acc) return ITEMS[i]; } return ITEMS[0]; }
        function frame(now) {
          var dt = Math.min(0.05, (now - last) / 1000); last = now; left = 45 - (now - t0) / 1000; // süre gerçek saate göre
          spawn -= dt;
          var speed = 1 + (45 - left) / 30;
          if (spawn <= 0) { var it = pick(); drops.push({ x: 20 + Math.random() * (W - 40), y: -30, v: (110 + Math.random() * 90) * speed, it: it }); spawn = 0.55 / speed; }
          ctx.clearRect(0, 0, W, H);
          ctx.font = "30px system-ui"; ctx.textAlign = "center";
          drops = drops.filter(function (d) {
            d.y += d.v * dt;
            if (d.y > H - 62 && d.y < H - 20 && Math.abs(d.x - bx) < 40) {
              score = Math.max(0, score + d.it[1]); if (d.it[1] < 0) { flash = 0.3; try { navigator.vibrate && navigator.vibrate(60); } catch (e) {} }
              return false;
            }
            ctx.fillText(d.it[0], d.x, d.y);
            return d.y < H + 30;
          });
          if (flash > 0) { flash -= dt; ctx.fillStyle = "rgba(160,160,200,.25)"; ctx.fillRect(0, 0, W, H); }
          ctx.font = "46px system-ui"; ctx.fillText("🧺", bx, H - 18);
          hudTxt();
          if (left > 0) raf = requestAnimationFrame(frame); else end(score);
        }
        raf = requestAnimationFrame(frame);
      }
      function end(score) {
        clearInterval(timer);
        if (net) send({ t: "final", s: score });
        var best = B.state.catchBest || 0;
        if (score > best) { B.state.catchBest = score; B.save(); }
        var ov = app.querySelector("#ov");
        ov.style.display = "grid";
        function show() {
          var res = !net ? "Puanın: " + score + (score > best ? " · Yeni rekor! 🏆" : " · Rekor: " + Math.max(best, score)) :
            !otherDone ? "Puanın: " + score + "<br><small>" + esc(NET.other) + " bekleniyor…</small>" :
            score === other ? "Berabere! " + score + " - " + other + " 💞" : (score > other ? "Kazandın! 🏆 " : esc(NET.other) + " kazandı! ") + score + " - " + other;
          ov.innerHTML = '<div class="ov-card"><div class="note-title">' + res + '</div>' +
            (!net || NET.host ? '<button class="btn" id="again">Yeniden oyna</button>' : '<p class="muted">Yeni turu ' + esc(NET.other) + ' başlatabilir.</p>') + '</div>';
          var a = app.querySelector("#again"); if (a) a.onclick = round;
        }
        show();
        if (net && !otherDone) NET.onFinalShow = show;
        B.hearts(ov);
      }
      function round() {
        other = 0; otherDone = false; NET.onFinalShow = null;
        if (net && NET.host) send({ t: "start" });
        screen(); countdown(play);
      }
      if (net) {
        onMsg(function (d) {
          if (d.t === "start") { other = 0; otherDone = false; NET.onFinalShow = null; screen(); countdown(play); }
          if (d.t === "score") other = d.s;
          if (d.t === "final") { other = d.s; otherDone = true; if (NET.onFinalShow) NET.onFinalShow(); }
        });
        NET.onClose = lostNote;
        if (NET.host) round(); else { app.innerHTML = header("Kalp yakalama") + '<p class="center muted">Oyun başlıyor…</p>'; bindBack(); }
      } else round();
    });
  }

  window.GAMES = { puzzle: puzzle, memory: memory, catcher: catcher };
})();
