(function () {
  "use strict";

  var DAYS = [
    {
      day: "Minggu", date: "22 Nov",
      A: [
        { t: "Emy", s: 6.0, e: 7.0, c: "inc" },
        { t: "Ika/Haykel", s: 7.0, e: 8.0, c: "p2" },
        { t: "Budhi SS", s: 8.0, e: 9.0, c: "p2" },
        { t: "Alin", s: 16.5, e: 18.5, c: "p2" }
      ],
      B: [
        { t: "VTC C", s: 6.0, e: 9.0, c: "p1" },
        { t: "VTC C", s: 9.0, e: 10.0, c: "inc" },
        { t: "Niken", s: 16.0, e: 18.0, c: "p2" }
      ]
    },
    {
      day: "Senin", date: "23 Nov",
      A: [
        { t: "Budhi SS", s: 5.5, e: 6.5, c: "p2" },
        { t: "Fifin", s: 7.25, e: 8.25, c: "p2" },
        { t: "Fanny/Helena", s: 18.0, e: 20.0, c: "p2" }
      ],
      B: [
        { t: "VTC A (Tony)", s: 6.0, e: 9.0, c: "p1" },
        { t: "VTC B (Budi)", s: 9.0, e: 10.5, c: "p1" },
        { t: "Chandra/Etho", s: 16.0, e: 18.0, c: "p2" },
        { t: "VTC Sore (Retha)", s: 18.0, e: 20.0, c: "p1" }
      ]
    },
    {
      day: "Selasa", date: "24 Nov",
      A: [
        { t: "Hanny", s: 6.0, e: 7.0, c: "p2" },
        { t: "VTC B (Budi)", s: 7.0, e: 9.0, c: "p1" },
        { t: "Budhi SS", s: 16.0, e: 18.0, c: "p2" },
        { t: "Dina", s: 18.0, e: 20.0, c: "p2" }
      ],
      B: [
        { t: "Fifin", s: 6.0, e: 7.0, c: "p2" },
        { t: "VTC B (Budi)", s: 7.0, e: 10.0, c: "p1" },
        { t: "Chandra/Jave", s: 16.0, e: 17.5, c: "p2" },
        { t: "Emy", s: 17.5, e: 19.5, c: "p2" }
      ]
    },
    {
      day: "Rabu", date: "25 Nov",
      A: [
        { t: "Marlon", s: 7.0, e: 8.5, c: "p2" },
        { t: "Fanny/Helena", s: 18.0, e: 19.0, c: "p2" },
        { t: "Reynaldo", s: 19.0, e: 20.0, c: "p2" }
      ],
      B: [
        { t: "VTC A (Tony)", s: 6.0, e: 9.0, c: "p1" },
        { t: "Robert", s: 9.0, e: 10.0, c: "p2" },
        { t: "Chandra/Etho", s: 16.0, e: 18.0, c: "p2" },
        { t: "Marlon", s: 18.5, e: 20.5, c: "inc" }
      ]
    },
    {
      day: "Kamis", date: "26 Nov",
      A: [
        { t: "Yudi", s: 6.0, e: 7.0, c: "p2" },
        { t: "Riny", s: 8.0, e: 9.0, c: "p2" },
        { t: "Budhi SS", s: 16.0, e: 17.0, c: "p2" },
        { t: "Emy", s: 17.0, e: 19.0, c: "p2" }
      ],
      B: [
        { t: "Fifin", s: 6.0, e: 7.0, c: "p2" },
        { t: "VTC B (Budi)", s: 7.0, e: 10.0, c: "p1" },
        { t: "Dina", s: 16.0, e: 18.0, c: "p2" },
        { t: "VTC Sore (Retha)", s: 18.0, e: 20.0, c: "p1" }
      ]
    },
    {
      day: "Jumat", date: "27 Nov",
      A: [
        { t: "Budhi SS", s: 5.5, e: 6.5, c: "p2" },
        { t: "Marlon", s: 6.5, e: 8.5, c: "p2" },
        { t: "Chandra/Etho", s: 16.5, e: 18.5, c: "p2" }
      ],
      B: [
        { t: "VTC A (Tony)", s: 6.0, e: 9.0, c: "p1" },
        { t: "VTC B (Budi)", s: 9.0, e: 10.5, c: "p1" },
        { t: "Fifin", s: 16.0, e: 18.0, c: "p2" },
        { t: "Marlon", s: 18.5, e: 20.5, c: "inc" }
      ]
    },
    {
      day: "Sabtu", date: "28 Nov",
      A: [
        { t: "Aditya", s: 6.0, e: 7.0, c: "p2" },
        { t: "Yutaka", s: 7.0, e: 9.0, c: "p2" },
        { t: "Budhi SS", s: 15.0, e: 16.0, c: "p2" },
        { t: "Retha", s: 16.0, e: 18.0, c: "p2" },
        { t: "Shinta", s: 18.0, e: 19.0, c: "p2" }
      ],
      B: [
        { t: "VTC A (Tony)", s: 6.0, e: 9.0, c: "p1" },
        { t: "Emy", s: 16.0, e: 17.0, c: "p2" },
        { t: "VTC C", s: 17.0, e: 20.0, c: "p1" }
      ]
    }
  ];

  function fmt(h) {
    var hr = Math.floor(h);
    var mn = Math.round((h - hr) * 60);
    return String(hr).padStart(2, "0") + ":" + String(mn).padStart(2, "0");
  }

  function headerHtml(subtitle) {
    return (
      '<div class="sched-head">' +
        '<div>' +
          '<div class="sched-brand">Virgimontela · Tennis RW 008</div>' +
          '<div class="sched-title">Booking Lapangan · 22–28 Nov 2026</div>' +
          '<div class="sched-sub">' + subtitle + '</div>' +
        '</div>' +
        '<div class="legend">' +
          '<span><i class="p1"></i>Prioritas 1</span>' +
          '<span><i class="p2"></i>Prioritas 2</span>' +
          '<span><i class="p3"></i>Prioritas 3</span>' +
          '<span><i class="inc"></i>Insidental</span>' +
          '<span><i class="bsk"></i>Basket</span>' +
        '</div>' +
      '</div>'
    );
  }

  function renderSessionGantt(title, badge, minH, maxH, filterFn) {
    var span = maxH - minH;
    var hours = [];
    for (var h = Math.ceil(minH); h <= maxH; h++) hours.push(h);

    var html =
      '<div class="gantt-box">' +
        '<div class="session-bar"><strong>' + title + '</strong><span>' + badge + '</span></div>' +
        '<div class="gantt-grid-head">' +
          '<div class="corner">Hari · Ct</div>' +
          '<div class="axis">' +
            hours.map(function (hr) {
              var left = ((hr - minH) / span) * 100;
              var cls = hr === maxH ? "axis-tick end" : "axis-tick";
              return '<span class="' + cls + '" data-left="' + left + '">' + String(hr).padStart(2, "0") + ':00</span>';
            }).join("") +
          '</div>' +
        '</div>';

    DAYS.forEach(function (d, idx) {
      ["A", "B"].forEach(function (ct, cIdx) {
        var items = d[ct].filter(filterFn);
        var cls = "gantt-row" + (idx % 2 === 1 ? " shaded" : "") + (cIdx === 0 && idx > 0 ? " day-sep" : "");
        html +=
          '<div class="' + cls + '">' +
            '<div class="day-cell">' +
              '<div><div class="day-name">' + d.day.slice(0, 3) + '</div><div class="day-date">' + d.date + '</div></div>' +
              '<span class="ct-badge ' + (ct === "A" ? "ct-a" : "ct-b") + '">' + ct + '</span>' +
            '</div>' +
            '<div class="lane">' +
              hours.map(function (hr) {
                var left = ((hr - minH) / span) * 100;
                return '<span class="grid-line" data-left="' + left + '"></span>';
              }).join("") +
              items.map(function (b) {
                var left = ((b.s - minH) / span) * 100;
                var width = ((b.e - b.s) / span) * 100;
                return (
                  '<div class="slot ' + b.c + '" data-left="' + left + '" data-width="' + width + '" data-inset="1">' +
                    '<div class="slot-title">' + b.t + '</div>' +
                    '<div class="slot-time">' + fmt(b.s) + '–' + fmt(b.e) + '</div>' +
                  '</div>'
                );
              }).join("") +
            '</div>' +
          '</div>';
      });
    });

    html += '</div>';
    return html;
  }

  function renderOpt1() {
    return (
      headerHtml("Opsi 1 · Split Pagi & Sore (rasio portrait ramping, teks ~2× lebih besar di WA)") +
      '<div class="session-stack">' +
        renderSessionGantt("Sesi Pagi", "05:30 – 11:00 WIB", 5.25, 11.0, function (b) { return b.s < 12; }) +
        renderSessionGantt("Sesi Sore & Malam", "15:00 – 21:00 WIB", 15.0, 21.0, function (b) { return b.s >= 12; }) +
      '</div>'
    );
  }

  function renderOpt2() {
    var html =
      headerHtml("Opsi 2 · Tabel Agenda Harian (semua nama & jam terbaca utuh tanpa pernah terpotong)") +
      '<div class="agenda-box">' +
        '<div class="agenda-head"><div>Hari</div><div>Lapangan A</div><div>Lapangan B</div></div>';

    DAYS.forEach(function (d, idx) {
      function renderCell(list) {
        var pagi = list.filter(function (b) { return b.s < 12; });
        var sore = list.filter(function (b) { return b.s >= 12; });
        function pill(b) {
          return '<div class="pill ' + b.c + '"><b>' + b.t + '</b><span>' + fmt(b.s) + '–' + fmt(b.e) + '</span></div>';
        }
        var out = "";
        if (pagi.length) out += '<div class="agenda-group"><div class="agenda-label">Pagi</div>' + pagi.map(pill).join("") + '</div>';
        if (sore.length) out += '<div class="agenda-group"><div class="agenda-label">Sore</div>' + sore.map(pill).join("") + '</div>';
        return out;
      }
      html +=
        '<div class="agenda-row' + (idx % 2 === 1 ? " shaded" : "") + '">' +
          '<div class="agenda-day"><strong>' + d.day + '</strong><span>' + d.date + '</span></div>' +
          '<div class="agenda-col">' + renderCell(d.A) + '</div>' +
          '<div class="agenda-col">' + renderCell(d.B) + '</div>' +
        '</div>';
    });

    html += '</div>';
    return html;
  }

  function renderOpt3() {
    function mapPos(h) {
      if (h <= 10.5) return ((h - 5.25) / 11.45) * 100;
      if (h >= 15.0) return ((5.25 + 0.45 + (h - 15.0)) / 11.45) * 100;
      return (5.47 / 11.45) * 100;
    }
    var ticks = [6, 7, 8, 9, 10, 15, 16, 17, 18, 19, 20];
    var breakLeft = mapPos(10.5);
    var breakWidth = mapPos(15.0) - breakLeft;

    var html =
      headerHtml("Opsi 3 · Timeline 1 Baris Ringkas (jam kosong siang & malam dipadatkan)") +
      '<div class="gantt-box">' +
        '<div class="gantt-grid-head">' +
          '<div class="corner">Hari · Ct</div>' +
          '<div class="axis">' +
            '<div class="midday-break" data-left="' + breakLeft + '" data-width="' + breakWidth + '">SIANG</div>' +
            ticks.map(function (hr) {
              return '<span class="axis-tick mid" data-left="' + mapPos(hr) + '">' + String(hr).padStart(2, "0") + '</span>';
            }).join("") +
          '</div>' +
        '</div>';

    DAYS.forEach(function (d, idx) {
      ["A", "B"].forEach(function (ct, cIdx) {
        var cls = "gantt-row" + (idx % 2 === 1 ? " shaded" : "") + (cIdx === 0 && idx > 0 ? " day-sep" : "");
        html +=
          '<div class="' + cls + '">' +
            '<div class="day-cell">' +
              '<div><div class="day-name">' + d.day.slice(0, 3) + '</div><div class="day-date">' + d.date + '</div></div>' +
              '<span class="ct-badge ' + (ct === "A" ? "ct-a" : "ct-b") + '">' + ct + '</span>' +
            '</div>' +
            '<div class="lane compact">' +
              '<div class="midday-break" data-left="' + breakLeft + '" data-width="' + breakWidth + '"></div>' +
              ticks.map(function (hr) {
                return '<span class="grid-line" data-left="' + mapPos(hr) + '"></span>';
              }).join("") +
              d[ct].map(function (b) {
                var l = mapPos(b.s);
                var w = mapPos(b.e) - l;
                return (
                  '<div class="slot ' + b.c + '" data-left="' + l + '" data-width="' + w + '" data-inset="1">' +
                    '<div class="slot-title">' + b.t + '</div>' +
                    '<div class="slot-time">' + fmt(b.s) + '–' + fmt(b.e) + '</div>' +
                  '</div>'
                );
              }).join("") +
            '</div>' +
          '</div>';
      });
    });

    html += '</div>';
    return html;
  }

  function applyPositions(root) {
    root.querySelectorAll("[data-left]").forEach(function (el) {
      var left = Number(el.dataset.left);
      if (el.dataset.inset) {
        el.style.left = "calc(" + left + "% + 1px)";
      } else {
        el.style.left = left + "%";
      }
      if (el.dataset.width !== undefined) {
        var width = Number(el.dataset.width);
        if (el.dataset.inset) {
          el.style.width = "calc(" + width + "% - 2px)";
        } else {
          el.style.width = width + "%";
        }
      }
    });
  }

  var currentTab = "opt1";
  var isWaSim = false;

  function render() {
    var root = document.getElementById("preview-root");
    var wrap = document.getElementById("stage-wrap");
    if (currentTab === "opt1") root.innerHTML = renderOpt1();
    else if (currentTab === "opt2") root.innerHTML = renderOpt2();
    else root.innerHTML = renderOpt3();
    applyPositions(root);
    wrap.className = isWaSim ? "phone-frame" : "";
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".tab-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        currentTab = btn.dataset.tab;
        document.querySelectorAll(".tab-btn").forEach(function (b) {
          b.classList.toggle("active", b.dataset.tab === currentTab);
        });
        render();
      });
    });

    var btnDesk = document.getElementById("mode-desktop");
    var btnWa = document.getElementById("mode-wa");
    btnDesk.addEventListener("click", function () {
      isWaSim = false;
      btnDesk.classList.add("active");
      btnWa.classList.remove("active");
      render();
    });
    btnWa.addEventListener("click", function () {
      isWaSim = true;
      btnWa.classList.add("active");
      btnDesk.classList.remove("active");
      render();
    });

    render();
  });
})();
