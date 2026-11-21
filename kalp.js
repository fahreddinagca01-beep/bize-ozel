/* "Beni düşündüğünde dokun" iki yönlü: dokunuşlar ntfy.sh (ücretsiz, hesapsız) üzerinden karşı telefona gider.
   Kanal adları ve anahtar uygulama şifresinden türetilir; dosyalarda gizli bilgi yoktur.
   Veri kanalındaki mesajlar uygulama şifresiyle şifrelidir. İsteğe bağlı bildirim kanalına yalnız isimsiz kısa metin gider.
   Telefon kimin: varsayılan "o"; Faho'nun telefonunda bir kez ?ben=faho ile açılır ya da kart başlığına 5 kez dokunulur. */
(function () {
  "use strict";
  var B = window.BZ, SRV = "https://ntfy.sh/";
  var te = new TextEncoder(), DAY_KEEP = 40, NOTIFY_GAP = 10 * 60000;
  var ch = null, es = null, pending = 0, timer = null, handlers = {}, opens = [];

  var st = B.state;
  if (!st.kalp) st.kalp = { seen: [], gelen: {}, son: "", bildirim: 0 };
  var q = new URLSearchParams(location.search).get("ben");
  if (q === "faho" || q === "o") { st.ben = q; B.save(); }

  function me() { return st.ben === "faho" ? "faho" : "o"; }
  function other() { return me() === "faho" ? "o" : "faho"; }
  function name(k) { var C = B.C || {}; return k === "faho" ? (C.benim_adim || "Faho") : (C.ad || "Hayatım"); }
  function dayKey(t) { var d = new Date(t); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function b64(u) { var s = ""; u = new Uint8Array(u); for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
  function unb64(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function toast(t) {
    var d = document.createElement("div"); d.className = "toast"; d.textContent = t; document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 2800);
  }

  // Kanal adları ve anahtar: şifreden türetilir, aynı şifreyi bilen iki telefon aynı kanalı bulur
  function channel() {
    if (ch) return ch;
    var pw = st.pw;
    ch = crypto.subtle.digest("SHA-256", te.encode("bize-ozel-kalp|" + pw)).then(function (h) {
      var x = Array.prototype.map.call(new Uint8Array(h), function (v) { return ("0" + v.toString(16)).slice(-2); }).join("");
      return crypto.subtle.importKey("raw", te.encode(pw), "PBKDF2", false, ["deriveKey"]).then(function (km) {
        return crypto.subtle.deriveKey({ name: "PBKDF2", salt: te.encode("bize-ozel-kalp-anahtar"), iterations: 100000, hash: "SHA-256" },
          km, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
      }).then(function (key) {
        return { veri: "bz" + x.slice(0, 22), bildir: { faho: "bz" + x.slice(22, 44), o: "bz" + x.slice(44, 64) }, key: key };
      });
    });
    return ch;
  }

  // ---------- Gönderme: dokunuşlar 2,5 sn toplanıp tek mesajla gider ----------
  function tap() {
    pending++;
    clearTimeout(timer); timer = setTimeout(flush, 2500);
  }
  // Şifreli mesaj gönderir; diğer özellikler (ör. günün sorusu) "tip" alanıyla aynı kanalı kullanır
  function send(obj) {
    return channel().then(function (c) {
      var iv = crypto.getRandomValues(new Uint8Array(12));
      return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, c.key, te.encode(JSON.stringify(obj))).then(function (ct) {
        return fetch(SRV + c.veri, { method: "POST", body: "1." + b64(iv) + "." + b64(ct) });
      }).then(function (r) { if (!r.ok) throw new Error(r.status); return c; });
    });
  }
  // İsteğe bağlı ntfy uygulaması bildirimi: isimsiz kısa metin
  function notify(text) {
    return channel().then(function (c) {
      return fetch(SRV, { method: "POST", body: JSON.stringify({ topic: c.bildir[other()], title: "Bize Özel", message: text, tags: ["sparkling_heart"] }) });
    }).catch(function () {});
  }
  function flush() {
    if (!pending || !st.pw) return;
    var n = pending; pending = 0;
    send({ k: me(), n: n, t: Date.now() }).then(function () {
      if (Date.now() - (st.kalp.bildirim || 0) > NOTIFY_GAP) {
        st.kalp.bildirim = Date.now(); B.save();
        notify("Şu an seni düşünüyor 💗");
      }
    }).catch(function () { pending += n; clearTimeout(timer); timer = setTimeout(flush, 15000); });
  }
  window.addEventListener("online", flush);

  // ---------- Alma ----------
  function onMsg(m) {
    if (!m || m.event !== "message" || !m.message) return;
    var k = st.kalp;
    if (k.seen.indexOf(m.id) >= 0) return;
    k.seen.push(m.id); if (k.seen.length > 300) k.seen = k.seen.slice(-300);
    k.son = m.id;
    var p = String(m.message).split(".");
    if (p[0] !== "1" || p.length !== 3) { B.save(); return; }
    channel().then(function (c) {
      return crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(p[1]) }, c.key, unb64(p[2]));
    }).then(function (buf) {
      var d = JSON.parse(new TextDecoder().decode(buf));
      if (d.tip) { if (d.k !== me() && handlers[d.tip]) handlers[d.tip](d, m); B.save(); return; }
      if (d.k === me() || !(d.n > 0)) { B.save(); return; }
      var dk = dayKey(m.time * 1000);
      k.gelen[dk] = (k.gelen[dk] || 0) + Math.min(d.n, 500);
      var keys = Object.keys(k.gelen); if (keys.length > DAY_KEEP) keys.slice(0, keys.length - DAY_KEEP).forEach(function (x) { delete k.gelen[x]; });
      B.save(); paint();
      if (m.time * 1000 > Date.now() - 90000) {
        toast("💗 " + name(d.k) + " şu an seni düşünüyor");
        var el = B.app.querySelector("#heart"); if (el) B.hearts(el);
        try { if (navigator.vibrate) navigator.vibrate([40, 60, 40]); } catch (x) {}
      }
    }).catch(function () { B.save(); });
  }
  function connect() {
    if (!st.pw || !window.EventSource) return;
    if (es && es.readyState !== 2) return;
    channel().then(function (c) {
      if (es && es.readyState !== 2) return;
      es = new EventSource(SRV + c.veri + "/sse?since=" + (st.kalp.son || "12h"));
      es.onmessage = function (e) { try { onMsg(JSON.parse(e.data)); } catch (x) {} };
      opens.forEach(function (f) { try { f(); } catch (x) {} });
    });
  }
  // Telefon uykudan dönünce bağlantı kaldığı yerden yenilenir
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible" || !st.pw) return;
    if (es) { es.close(); es = null; }
    connect(); flush();
  });

  // ---------- Kart ----------
  function paint() {
    connect();
    var el = B.app.querySelector("#lv2");
    if (!el) return;
    var n = st.kalp.gelen[dayKey(Date.now())] || 0;
    el.textContent = n ? name(other()) + " bugün seni " + n + " kez düşündü 💗" : name(other()) + " seni düşündüğünde burada görünecek 🌸";
    // Telefonun sahibini değiştirme: başlığa 5 kez dokun ya da 1,5 sn basılı tut
    var h2 = B.app.querySelector(".love h2"), taps = 0, tt = null, hold = null;
    if (!h2) return;
    function swap() {
      taps = 0; st.ben = other(); st.kalp.gelen = {}; B.save();
      toast("Bu telefon: " + name(me())); paint();
    }
    h2.onclick = function () {
      taps++; clearTimeout(tt); tt = setTimeout(function () { taps = 0; }, 2000);
      if (taps >= 5) swap();
    };
    h2.onpointerdown = function () { clearTimeout(hold); hold = setTimeout(swap, 1500); };
    h2.onpointerup = h2.onpointerleave = h2.onpointercancel = function () { clearTimeout(hold); };
    h2.oncontextmenu = function (e) { e.preventDefault(); };
  }

  window.KALP = {
    tap: tap, paint: paint, send: send, notify: notify, toast: toast, me: me, other: other, name: name, dayKey: dayKey,
    // tip: mesaj türü; fn(veri, ntfyMesajı) karşı taraftan gelince çağrılır; open: her yeni bağlantıda çağrılır
    on: function (tip, fn, open) { handlers[tip] = fn; if (open) opens.push(open); }
  };
})();
