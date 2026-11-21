/* Günün sorusu: her gün ikimize aynı soru gelir. İkimiz de cevaplayınca cevaplar iki ekranda birden açılır.
   Cevaplar kalp kanalından (kalp.js) şifreli gider. Ücretsiz sunucu mesajı ~12 saat tutar; bu yüzden
   uygulama her açılışta, karşı tarafta olmayan cevabını yeniden gönderir ("has" alanı: "senin cevabın bende var"). */
(function () {
  "use strict";
  var B = window.BZ, K = window.KALP, DAY = 86400000, KEEP = 60;
  var Q = [
    "Beni ilk gördüğünde aklından geçen ilk şey neydi?",
    "Birlikte gitmek istediğin bir şehir hangisi, neden?",
    "Bugün seni en çok ne gülümsetti?",
    "Benimle ilgili en sevdiğin küçük alışkanlık ne?",
    "Bir gün boyunca istediğimiz her şeyi yapabilsek nasıl bir gün planlardın?",
    "Sana söylediğim hangi söz aklında kaldı?",
    "Çocukken en sevdiğin oyun neydi?",
    "Kavuştuğumuzda ilk yapmak istediğin şey ne?",
    "Bizim şarkımız olsa hangisi olurdu?",
    "En sevdiğin anımız hangisi?",
    "Beni üç kelimeyle anlat.",
    "Hangi yemeği birlikte yapmak isterdin?",
    "Seni en çok ne rahatlatır?",
    "Bir film çekseler bizim hikâyemizin adı ne olurdu?",
    "Sana hiç söylemediğim ama söylememi istediğin bir şey var mı?",
    "Hayalindeki sabah kahvaltısı nasıl?",
    "Benimle ilgili seni en çok şaşırtan şey ne oldu?",
    "On yıl sonra bir pazar gününü nasıl hayal ediyorsun?",
    "En son ne zaman kahkahalarla güldün?",
    "Sana en çok yakışan renk sence hangisi?",
    "Bir süper gücün olsa ne olurdu?",
    "Beni özlediğinde ne yapıyorsun?",
    "Birlikte öğrenmek istediğin bir şey var mı?",
    "Bugün kendine bir iltifat et.",
    "En sevdiğin mevsim hangisi, neden?",
    "Bir haftalık tatil: deniz mi, dağ mı, şehir mi?",
    "İlk mesajlaşmamızı hatırlıyor musun? Ne hissetmiştin?",
    "Seni en iyi anlatan şarkı sözü hangisi?",
    "Bana bir lakap taksan ne olurdu?",
    "Hayatında minnettar olduğun üç şey ne?",
    "Birlikte izlemek istediğin bir film ya da dizi var mı?",
    "En sevdiğin çiçeğin kokusu sana neyi hatırlatıyor?",
    "Kötü bir günde benden ne duymak istersin?",
    "Hiç unutamadığın bir rüya anlatır mısın?",
    "Evimizde mutlaka olmasını istediğin bir şey ne?",
    "Sence en güzel özelliğin ne?",
    "Benim en komik hâlim hangisi?",
    "Bir gün sadece ikimiz için bir bayram olsa adı ne olurdu?",
    "Çocukluğundan en sevdiğin tat hangisi?",
    "Şu an yanında olsam ne yapıyor olurduk?",
    "Birlikte gerçekleştirmek istediğin bir hayal ne?",
    "Seni en çok heyecanlandıran sürpriz ne olurdu?",
    "Bizi bir renkle anlatsan hangi renk olurdu?",
    "Bana öğretmek istediğin bir şey var mı?",
    "En sevdiğin hafta sonu planı ne?",
    "Seni tanımayan birine beni nasıl anlatırdın?",
    "Hayatında seni en çok etkileyen kişi kim?",
    "Bu hafta seni ne yordu, ne iyi geldi?",
    "Birlikte yaşlandığımızı düşünsen aklına ne geliyor?",
    "Yağmurlu bir akşam için ideal plan ne?",
    "Bana yazacağın kısa bir şiirin ilk satırı ne olurdu?",
    "Hangi konuda benden tavsiye almak istersin?",
    "Sence ilişkimizin en güzel yanı ne?",
    "Sana iyi gelen küçük bir ritüelin var mı?",
    "Bir hayvan olsaydın ne olurdun, ben ne olurdum?",
    "Seni gerçekten anladığımı hissettiğin bir an oldu mu?",
    "Bu yıl kendinle gurur duyduğun bir şey ne?",
    "Bir gün dünyanın neresinde uyanmak isterdin?",
    "Yarın için kendine küçük bir dilek tut.",
    "Bana bugün söylemek istediğin tek cümle ne?"
  ];

  var st = B.state;
  if (!st.soru) st.soru = {};
  function today() { return K.dayKey(Date.now()); }
  function qFor(g) {
    var p = g.split("-"), t = new Date(+p[0], +p[1] - 1, +p[2]).getTime();
    var n = Math.round((t - new Date(2026, 0, 1).getTime()) / DAY);
    return Q[((n % Q.length) + Q.length) % Q.length];
  }
  function rec(g) { return st.soru[g] || (st.soru[g] = {}); }
  function trim() {
    var keys = Object.keys(st.soru);
    if (keys.length > KEEP) keys.sort(function (a, b) { return dk(a) - dk(b); }).slice(0, keys.length - KEEP).forEach(function (x) { delete st.soru[x]; });
  }
  function dk(g) { var p = g.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]).getTime(); }
  function push(g) {
    var r = st.soru[g];
    if (!r || !r.ben) return Promise.resolve();
    return K.send({ k: K.me(), tip: "soru", g: g, c: r.ben, has: !!r.onun });
  }

  // Karşı taraftan cevap gelince
  K.on("soru", function (d, m) {
    if (!d.g || typeof d.c !== "string") return;
    var r = rec(d.g), first = !r.onun;
    r.onun = d.c.slice(0, 600); trim(); B.save();
    if (r.ben && !d.has) push(d.g);
    paint();
    if (first && m.time * 1000 > Date.now() - 90000 && d.g === today()) {
      K.toast(r.ben ? "💬 " + K.name(d.k) + " cevapladı, cevaplar açıldı!" : "💬 " + K.name(d.k) + " günün sorusunu cevapladı");
      var el = B.app.querySelector("#soru"); if (el) B.hearts(el);
    }
  }, function () {
    // Yeni bağlantıda: karşı tarafta olmayabilecek cevaplarımı yeniden gönder
    Object.keys(st.soru).forEach(function (g) { var r = st.soru[g]; if (r.ben && !r.onun && Date.now() - dk(g) < 3 * DAY) push(g); });
  });

  function bubble(who, text) {
    return '<div class="ans"><small>' + B.esc(who) + '</small><p>' + B.esc(text) + '</p></div>';
  }
  function paint() {
    var box = B.app.querySelector("#soru");
    if (!box) return;
    var g = today(), r = st.soru[g] || {}, o = K.name(K.other());
    var h = '<h2>Günün sorusu 💬</h2><div class="q">' + B.esc(qFor(g)) + '</div>';
    if (r.ben && r.onun) {
      h += '<div class="answers">' + bubble("Sen", r.ben) + bubble(o, r.onun) + '</div>';
    } else if (r.ben) {
      h += '<div class="answers">' + bubble("Sen", r.ben) + '</div><p class="muted center">' + B.esc(o) + ' henüz cevaplamadı ⏳<br><small>Cevaplayınca ikisi birden görünecek</small></p>';
    } else {
      h += '<textarea id="soruCevap" maxlength="300" rows="3" placeholder="Cevabını yaz…">' + B.esc(st.soruTaslak || "") + '</textarea>' +
        '<button class="btn" id="soruGonder">Cevabımı gönder</button>' +
        '<p class="muted center"><small>' + (r.onun ? "🔒 " + B.esc(o) + " cevapladı. Sen de cevaplayınca ikisi birden açılır." :
          "🔒 İkiniz de cevaplayınca cevaplar birlikte açılır.") + '</small></p>';
    }
    // Önceki günler
    var past = Object.keys(st.soru).filter(function (x) { return x !== g && (st.soru[x].ben || st.soru[x].onun); })
      .sort(function (a, b) { return dk(b) - dk(a); }).slice(0, 14);
    if (past.length) {
      h += '<details class="past-q"><summary>Önceki sorular</summary>' + past.map(function (x) {
        var p = st.soru[x], d = new Date(dk(x));
        return '<div class="pq"><small>' + d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" }) + '</small><b>' + B.esc(qFor(x)) + '</b>' +
          (p.ben ? bubble("Sen", p.ben) : "") + (p.onun ? (p.ben ? bubble(o, p.onun) : '<p class="muted"><small>' + B.esc(o) + ' cevaplamıştı; sen cevaplamadığın için gizli 🔒</small></p>') : "") + '</div>';
      }).join("") + '</details>';
    }
    box.innerHTML = h;

    var ta = box.querySelector("#soruCevap"), bt = box.querySelector("#soruGonder");
    if (ta) ta.oninput = function () { st.soruTaslak = ta.value; B.save(); };
    if (bt) bt.onclick = function () {
      var v = ta.value.trim();
      if (!v) { ta.focus(); return; }
      var r2 = rec(g); r2.ben = v.slice(0, 300); delete st.soruTaslak; trim(); B.save();
      paint(); B.hearts(box);
      push(g).then(function () { K.notify("Günün sorusunu cevapladı 💬"); })
        .catch(function () { K.toast("İnternet gelince gönderilecek 🌸"); });
    };
  }

  window.SORU = { paint: paint };
})();
