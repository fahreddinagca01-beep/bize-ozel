/* "Bugün" sekmesinin her gün değişen parçaları:
   günün kartı (kazı-aç), ortak görev, ortak seri, karşı tarafın ruh hâli, aynı anda dokunma kutlaması,
   haftalık özet ve saate göre değişen tema ile selam satırı.
   Ortak durum (görev, seri, ruh hâli) kalp kanalından "durum" mesajıyla şifreli gider.
   "ack": gönderen karşı tarafın o günkü durumunu almış mı; almamışsa karşı taraf kendi durumunu bir kez yeniden yollar. */
(function () {
  "use strict";
  var B = window.BZ, K = window.KALP, DAY = 86400000;
  var st = B.state;
  if (!st.gun) st.gun = {};

  var KARTLAR = [
    ["💌", "İltifat", "Gülüşün, en yorgun günü bile güzelleştirmeye yeter."],
    ["🎯", "Mini görev", "Sevgiline bugün onu neden sevdiğini tek cümleyle yaz."],
    ["🌼", "Küçük not", "Nergisler kışın açar; en soğuk günde bile umut vardır."],
    ["😂", "Gülümse", "Penguenler sevdiklerine en güzel çakıl taşını hediye eder. Bugün sen de bir 'çakıl taşı' gönder: bir emoji."],
    ["📸", "Anı", "Telefonundaki en eski ortak fotoğrafınızı bul ve ona gönder."],
    ["🎵", "Şarkı", "Bugün aklına gelen ilk aşk şarkısını sevgiline gönder."],
    ["☕", "Mola", "Bir kahve ya da çay al, beş dakikayı sadece kendine ayır. Hak ediyorsun."],
    ["💭", "Hayal", "Kavuşunca yapacağınız ilk üç şeyi kafanda sırala."],
    ["💌", "İltifat", "Senin varlığın birinin her gününü daha güzel yapıyor."],
    ["🎯", "Mini görev", "Ona bugün bir sesli mesaj gönder; sadece 'seni düşündüm' de."],
    ["🔢", "Biliyor muydun?", "Birbirine bakan iki kişinin kalp atışları bir süre sonra uyumlanabilir."],
    ["🌙", "Gece için", "Bu akşam uyumadan önce ona 'iyi ki varsın' yaz."],
    ["🍫", "Tatlı an", "Bugün kendine küçük bir tatlı al; yerken onu düşün."],
    ["🗺️", "Plan", "Birlikte gideceğiniz bir sonraki yeri seçin ve Planlar listesine ekleyin."],
    ["💌", "İltifat", "Kalbin o kadar güzel ki yanındaki herkes kendini evinde hisseder."],
    ["🎯", "Mini görev", "Ona bugün sevdiğin bir özelliğini hatırlat."],
    ["😂", "Gülümse", "Ahtapotların üç kalbi var. Sende bir tane var ama o da onun."],
    ["📖", "Hatırla", "İlk konuşmanızı düşün. O gün ne hissettiğini ona anlat."],
    ["🌈", "Pozitif", "Bugün iyi giden üç şeyi say. Biri mutlaka o olsun."],
    ["🎁", "Sürpriz", "Ona küçük bir sürpriz düşün; büyük olması gerekmez, düşünülmüş olması yeter."],
    ["💌", "İltifat", "Seninle konuşmak, günün en sevilen kısmı."],
    ["🎯", "Mini görev", "Bugün birbirinize bulunduğunuz yerden bir fotoğraf atın."],
    ["🔢", "Biliyor muydun?", "Sarılmak stresi azaltan oksitosin hormonunu artırır. Bir dahaki sefere uzun sarılın."],
    ["🌻", "Kendin için", "Bugün aynaya bak ve kendine güzel bir şey söyle."],
    ["🎬", "Film gecesi", "Bu akşam aynı anda aynı filmi açın, mesajlaşarak izleyin."],
    ["💌", "İltifat", "Uzaklık sadece kilometre; kalp hep aynı yerde."],
    ["🎯", "Mini görev", "Ona bir 'Beni ne kadar tanıyorsun' sorusu sor."],
    ["😂", "Gülümse", "Su samurları uyurken kaybolmamak için el ele tutuşur. Siz de bu akşam 'el ele' yazışın."],
    ["🌟", "Gelecek", "Birlikte bir yıl sonra nerede olmak istediğinizi bir cümleyle yazın."],
    ["🍳", "Tarif", "Birlikte yapmak istediğiniz bir yemeği seçin; kavuşunca ilk iş o."],
    ["💌", "İltifat", "Seni tanımak, hayatın verdiği en güzel hediyelerden biri."],
    ["🎯", "Mini görev", "Bugün ona en sevdiği emojiyi tahmin et ve gönder."],
    ["📝", "Liste", "Onunla ilgili en sevdiğin beş küçük şeyi aklından geçir; birini ona söyle."],
    ["🌧️", "Yağmur", "Yağmur yağarsa pencereden bak ve onu düşün; o da seni düşünüyor."],
    ["🎶", "Çalma listesi", "Ortak bir çalma listesi başlatın; bugün ikiniz de birer şarkı ekleyin."],
    ["💌", "İltifat", "Sabırlı, şefkatli ve çok güzelsin; bunu bilmeni istiyorum."],
    ["🎯", "Mini görev", "Ona bugün 'Seninle gurur duyuyorum' de."],
    ["🔢", "Biliyor muydun?", "İnsanlar mutlu oldukları anları, birlikte güldükleri kişilerle daha net hatırlar."],
    ["💤", "Dinlen", "Bu gece erken uyu; rüyanda buluşursunuz belki."],
    ["🎈", "Oyun", "Sürpriz sekmesinden bir oyunu birlikte oynayın."]
  ];
  var GOREVLER = [
    ["📸", "Birbirinize şu an bulunduğunuz yerden bir fotoğraf gönderin."],
    ["🎙️", "Birbirinize 'günaydın' ya da 'iyi geceler' diyen bir sesli mesaj atın."],
    ["🎵", "Birbirinize bugünün şarkısını gönderin."],
    ["💬", "Birbirinize iltifat dolu üç kelime yazın."],
    ["😄", "En komik ortak anınızı birbirinize hatırlatın."],
    ["🍽️", "Bugün ne yediğinizin fotoğrafını paylaşın."],
    ["🌅", "Gökyüzünün fotoğrafını çekip birbirinize gönderin."],
    ["🎮", "Sürpriz sekmesinden bir oyunu birlikte oynayın."],
    ["📞", "En az beş dakika görüntülü konuşun."],
    ["📝", "Planlar listesine birlikte yapmak istediğiniz yeni bir şey ekleyin."],
    ["🤳", "Aynı yüz ifadesiyle bir özçekim (selfie) gönderin: bugün 'şaşkın'."],
    ["💌", "Birbirinize kısa bir mektup cümlesi yazın: 'Sevgili …, bugün…'"],
    ["🎬", "Birlikte izleyeceğiniz bir film seçin."],
    ["🌼", "Bir çiçek ya da yeşil bir şey bulup fotoğrafını gönderin."],
    ["🧠", "Birbirinize birer bilmece sorun."],
    ["🗓️", "Kavuşunca yapacağınız ilk günü birlikte planlayın."],
    ["👕", "Bugün ne giydiğinizi birbirinize gösterin."],
    ["😍", "Birbirinizin en sevdiğiniz fotoğrafını gönderin."],
    ["🎤", "Bir şarkının bir dizesini söyleyip sesli mesaj atın."],
    ["☕", "Aynı anda bir şey için: çay, kahve ya da su. 'Şerefe' fotoğrafı atın."],
    ["📚", "Birbirinize bir kitap, dizi ya da podcast önerin."],
    ["🌙", "Uyumadan önce birbirinize günün en güzel anını yazın."],
    ["💪", "Birbirinize bu hafta başarmak istediğiniz bir şeyi söyleyin ve destek olun."],
    ["🧁", "Birbirinize bir tatlı emojisi ve nedenini gönderin."],
    ["🔤", "İsminizin harfleriyle birbirinize birer iltifat yazın."],
    ["🖼️", "Bir eşyanızı gösterip hikâyesini anlatın."],
    ["🎨", "Birbirinizi 30 saniyede çizip fotoğrafını atın."],
    ["🌍", "Birlikte gitmek istediğiniz bir ülkeyi seçin."],
    ["🙏", "Birbirinize bugün minnettar olduğunuz bir şeyi söyleyin."],
    ["💞", "Birbirinize 'Seni seviyorum' demenin farklı bir yolunu bulun."]
  ];
  var ANLAR = {
    sabah: ["Günaydın ☀️ Bugün harika bir gün olacak.", "Günaydın! İlk düşüncen o olsun 💗", "Kahven sıcak, günün güzel olsun ☕", "Yeni gün, yeni bir sürpriz seni bekliyor 🌼"],
    gun: ["Günün yarısı geçti, bir kalp gönder 💗", "Biraz mola ver, sürprizlere bak 🎁", "Bugünün görevini unutma 🎯", "Biri şu an seni düşünüyor olabilir 💭"],
    aksam: ["İyi akşamlar 🌆 Günün nasıl geçti?", "Akşam oldu, günün sorusunu cevapladın mı? 💬", "Bir sesli mesaj tam zamanı 🎙️", "Güneş battı ama sen hâlâ parlıyorsun ✨"],
    gece: ["İyi geceler 🌙 Rüyanda buluşalım.", "Yıldızlar senin için yanıyor ✨", "Uyumadan bir kalp bırak 💗", "Tatlı rüyalar, yarın yeni bir gün 🌙"]
  };

  // ---------- Yardımcılar ----------
  function today() { return K.dayKey(Date.now()); }
  function keyOf(t) { return K.dayKey(t); }
  function tOf(g) { var p = g.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]).getTime(); }
  function dayNo(g) { return Math.round((tOf(g) - new Date(2026, 0, 1).getTime()) / DAY); }
  function pick(list, g, salt) { var n = dayNo(g) * 7 + (salt || 0); return list[((n % list.length) + list.length) % list.length]; }
  function rec(g) { return st.gun[g] || (st.gun[g] = {}); }
  function trim() {
    var keys = Object.keys(st.gun).sort(function (a, b) { return tOf(a) - tOf(b); });
    if (keys.length > 70) keys.slice(0, keys.length - 70).forEach(function (x) { delete st.gun[x]; });
  }
  function other() { return K.name(K.other()); }
  function part() { var h = new Date().getHours(); return h >= 5 && h < 11 ? "sabah" : h < 17 && h >= 11 ? "gun" : h >= 17 && h < 21 ? "aksam" : "gece"; }

  function celebrate(text) {
    var d = document.createElement("div");
    d.className = "celebrate"; d.innerHTML = '<div class="cele-box"><div class="cele-ico">💞</div><b>' + B.esc(text) + '</b></div>';
    document.body.appendChild(d);
    var box = d.querySelector(".cele-ico");
    [0, 300, 600, 900].forEach(function (ms) { setTimeout(function () { B.hearts(box); }, ms); });
    try { if (navigator.vibrate) navigator.vibrate([60, 80, 60, 80, 120]); } catch (x) {}
    d.onclick = function () { d.remove(); };
    setTimeout(function () { d.classList.add("out"); setTimeout(function () { d.remove(); }, 400); }, 2600);
  }

  // ---------- Ortak durum ----------
  function sendDurum(g, force) {
    var r = rec(g), mood = (st.mood || {})[g];
    if (!r.aktifBen && !r.gorevBen && mood === undefined && !force) return;
    K.send({ k: K.me(), tip: "durum", g: g, aktif: !!r.aktifBen, gorev: !!r.gorevBen, mood: mood === undefined ? null : mood, ack: !!r.onunVar })
      .catch(function () {});
  }
  K.on("durum", function (d, m) {
    if (!d.g) return;
    var r = rec(d.g), live = m.time * 1000 > Date.now() - 90000 && d.g === today();
    var hadGorev = r.gorevOnun, oldMood = r.moodOnun;
    r.onunVar = 1;
    if (d.aktif) r.aktifOnun = 1;
    if (d.gorev) r.gorevOnun = 1;
    if (typeof d.mood === "number") r.moodOnun = d.mood;
    trim(); B.save();
    if (!d.ack) sendDurum(d.g, true);
    paint();
    if (!live) return;
    if (d.gorev && !hadGorev) {
      if (r.gorevBen) celebrate("Günün görevi tamam! 🎯");
      else K.toast("🎯 " + other() + " günün görevini yaptı");
    }
    var moods = (B.C && B.C.ruh_halleri) || [];
    if (typeof d.mood === "number" && d.mood !== oldMood && moods[d.mood]) K.toast(moods[d.mood].ikon + " " + other() + " bugün " + moods[d.mood].ad.toLocaleLowerCase("tr"));
  }, function () {
    sendDurum(today());
    var y = keyOf(Date.now() - DAY); if (st.gun[y] && !st.gun[y].onunVar) sendDurum(y);
  });

  function aktif() {
    var r = rec(today());
    if (!r.aktifBen) { r.aktifBen = 1; B.save(); sendDurum(today()); }
    paintSeri(); paintHafta();
  }

  // Ortak seri: ikimizin de bir şey yaptığı art arda günler. Bugün henüz tamamlanmadıysa dünden geriye sayılır.
  function seri() {
    var n = 0, t = Date.now(), r = st.gun[keyOf(t)];
    var todayDone = r && r.aktifBen && r.aktifOnun;
    if (!todayDone) t -= DAY;
    for (var i = 0; i < 400; i++) {
      var x = st.gun[keyOf(t - i * DAY)];
      if (x && x.aktifBen && x.aktifOnun) n++; else break;
    }
    return { n: n, todayDone: !!todayDone, ben: !!(r && r.aktifBen), onun: !!(r && r.aktifOnun) };
  }
  function paintSeri() {
    var el = B.app.querySelector("#seri");
    if (!el) return;
    var s = seri();
    el.innerHTML = '🔥 <b>' + s.n + '</b> gün';
    el.className = "seri" + (s.todayDone ? " lit" : "");
    el.title = "Ortak seri";
  }

  // ---------- Kartlar ----------
  function paintKart() {
    var box = B.app.querySelector("#kart");
    if (!box) return;
    var g = today(), c = pick(KARTLAR, g), r = rec(g);
    box.innerHTML = '<h2>Günün kartı</h2><div class="kart-in"><div class="kart-face"><span class="kart-ico">' + c[0] + '</span><small>' + B.esc(c[1]) +
      '</small><p>' + B.esc(c[2]) + '</p></div>' + (r.kart ? "" : '<canvas class="scratch" data-sc="kart"></canvas>') + '</div>' +
      (r.kart ? "" : '<p class="muted center hint">Parmağınla kazı ✨</p>');
    var cv = box.querySelector("canvas");
    if (cv) B.scratch(cv, function () { r.kart = 1; B.save(); aktif(); var h = box.querySelector(".hint"); if (h) h.remove(); });
  }
  function paintGorev() {
    var box = B.app.querySelector("#gorev");
    if (!box) return;
    var g = today(), t = pick(GOREVLER, g, 3), r = rec(g), both = r.gorevBen && r.gorevOnun;
    box.innerHTML = '<h2>Ortak görev</h2><div class="gorev-row"><span class="gorev-ico">' + t[0] + '</span><p>' + B.esc(t[1]) + '</p></div>' +
      '<div class="chips"><span class="chip' + (r.gorevBen ? " ok" : "") + '">' + (r.gorevBen ? "✓" : "⏳") + ' Sen</span>' +
      '<span class="chip' + (r.gorevOnun ? " ok" : "") + '">' + (r.gorevOnun ? "✓" : "⏳") + ' ' + B.esc(other()) + '</span></div>' +
      (both ? '<p class="done-line">Görev tamam! İkiniz de yaptınız 🎉</p>' : r.gorevBen ? "" : '<button class="btn" id="gorevOk">Yaptım ✓</button>');
    var bt = box.querySelector("#gorevOk");
    if (bt) bt.onclick = function () {
      r.gorevBen = 1; B.save(); aktif(); sendDurum(g);
      K.notify("Günün görevini yaptı 🎯");
      if (r.gorevOnun) celebrate("Günün görevi tamam! 🎯"); else B.hearts(bt);
      paint();
    };
  }
  function paintMood() {
    var box = B.app.querySelector("#onunMood");
    if (!box) return;
    var r = st.gun[today()] || {}, moods = (B.C && B.C.ruh_halleri) || [], m = moods[r.moodOnun];
    box.innerHTML = m ? '<div class="their-mood"><span>' + B.esc(m.ikon) + '</span><div><small>' + B.esc(other()) + ' bugün</small><b>' + B.esc(m.ad) + '</b></div></div>' : "";
  }

  // Haftalık özet: pazartesiden bugüne
  function paintHafta() {
    var box = B.app.querySelector("#hafta");
    if (!box) return;
    var now = new Date(), wd = (now.getDay() + 6) % 7, start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - wd).getTime();
    var sent = 0, got = 0, soru = 0, gorev = 0, ayni = 0, days = wd + 1, mc = {}, mo = {};
    for (var i = 0; i < days; i++) {
      var g = keyOf(start + i * DAY + 3600000), r = st.gun[g] || {}, s = (st.soru || {})[g];
      sent += (st.love || {})[g] || 0; got += ((st.kalp || {}).gelen || {})[g] || 0;
      if (s && s.ben && s.onun) soru++;
      if (r.gorevBen && r.gorevOnun) gorev++;
      ayni += r.ayniAn || 0;
      if ((st.mood || {})[g] !== undefined) mc[st.mood[g]] = (mc[st.mood[g]] || 0) + 1;
      if (r.moodOnun !== undefined) mo[r.moodOnun] = (mo[r.moodOnun] || 0) + 1;
    }
    var moods = (B.C && B.C.ruh_halleri) || [];
    function top(o) { var b = null; Object.keys(o).forEach(function (k) { if (b === null || o[k] > o[b]) b = k; }); return b === null ? null : moods[b]; }
    var tm = top(mc), to = top(mo), s2 = seri();
    function tile(ico, v, l) { return '<div class="tile"><span>' + ico + '</span><b>' + v + '</b><small>' + l + '</small></div>'; }
    box.innerHTML = '<h2>' + (wd === 6 ? "Haftanın özeti 🎀" : "Bu haftanın karnesi") + '</h2><div class="tiles">' +
      tile("💗", sent, "gönderdiğin kalp") + tile("💞", got, "gelen kalp") + tile("🔥", s2.n, "gün ortak seri") +
      tile("💬", soru + "/" + days, "soru birlikte") + tile("🎯", gorev + "/" + days, "görev birlikte") + tile("⚡", ayni, "aynı anda dokunuş") + '</div>' +
      (tm || to ? '<div class="moods-week">' + (tm ? '<span>Sen en çok: ' + B.esc(tm.ikon + " " + tm.ad) + '</span>' : "") +
        (to ? '<span>' + B.esc(other()) + ' en çok: ' + B.esc(to.ikon + " " + to.ad) + '</span>' : "") + '</div>' : "") +
      '<p class="muted center">Seri için bugün: ' + (s2.ben ? "✓ Sen" : "⏳ Sen") + ' · ' + (s2.onun ? "✓ " : "⏳ ") + B.esc(other()) + '</p>';
  }

  // Saate göre tema ve selam satırı
  function theme() {
    var p = part();
    document.body.classList.remove("t-sabah", "t-gun", "t-aksam", "t-gece");
    document.body.classList.add("t-" + p);
    var mt = document.querySelector('meta[name="theme-color"]');
    if (mt) mt.setAttribute("content", p === "gece" ? "#2a1631" : "#ffe3ec");
    var el = B.app.querySelector("#an");
    if (el) el.textContent = pick(ANLAR[p], today(), 1);
  }
  setInterval(theme, 60000);

  function paint() {
    theme(); paintSeri(); paintKart(); paintGorev(); paintMood(); paintHafta();
  }

  window.BUGUN = {
    paint: paint,
    aktif: aktif,
    refresh: function () { paintSeri(); paintHafta(); },
    mood: function () { aktif(); sendDurum(today()); },
    ayniAn: function () {
      var r = rec(today()); r.ayniAn = (r.ayniAn || 0) + 1; B.save();
      celebrate("Aynı anda düşündünüz!");
      paintHafta();
    }
  };
})();
