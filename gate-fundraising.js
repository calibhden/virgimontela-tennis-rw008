/* Fundraising Gate Virgimontela — data dibaca dari Supabase.
 * Tabel: public.gate_fundraising_donations (tanggal, donatur, jumlah, is_sample)
 * Baris contoh ditandai is_sample = true; hapus baris contoh tersebut dari
 * Supabase (atau set false) begitu data aktual dimasukkan.
 */
(function () {
  "use strict";

  var SUPABASE_URL = "https://uakhvqjqyplkuxfleggk.supabase.co";
  var SUPABASE_KEY = "sb_publishable_5nSODU833YAt89vnbNaUGA_MtqGYGAR";

  var BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  function formatRupiah(nilai) {
    return "Rp" + new Intl.NumberFormat("id-ID").format(Number(nilai) || 0);
  }

  function formatTanggal(iso) {
    if (!iso) return "—";
    var parts = String(iso).slice(0, 10).split("-");
    if (parts.length !== 3) return String(iso);
    return Number(parts[2]) + " " + BULAN[Number(parts[1]) - 1] + " " + parts[0];
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function fetchDonations() {
    var res = await fetch(
      SUPABASE_URL + "/rest/v1/gate_fundraising_donations?select=tanggal,donatur,jumlah,is_sample&order=tanggal",
      { headers: { apikey: SUPABASE_KEY } }
    );
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  function isAllSample(rows) {
    return rows.length > 0 && rows.every(function (r) { return r.is_sample; });
  }

  function totalOf(rows) {
    return rows.reduce(function (sum, r) { return sum + (Number(r.jumlah) || 0); }, 0);
  }

  /* --- Halaman detail: /gate-fundraising --- */
  async function renderDetailTable() {
    var tbody = document.getElementById("fundraising-rows");
    var totalCell = document.getElementById("fundraising-total");
    var sampleNote = document.getElementById("fundraising-sample-note");
    if (!tbody || !totalCell) return;

    try {
      var rows = await fetchDonations();
      if (rows.length === 0) {
        tbody.innerHTML =
          '<tr><td class="fundraising-empty" colspan="3">Belum ada data donasi yang dipublikasikan.</td></tr>';
        totalCell.textContent = "Rp0";
      } else {
        tbody.innerHTML = rows.map(function (r) {
          return (
            "<tr><td>" + escapeHtml(formatTanggal(r.tanggal)) + "</td>" +
            "<td>" + escapeHtml(r.donatur) + "</td>" +
            '<td class="amount">' + escapeHtml(formatRupiah(r.jumlah)) + "</td></tr>"
          );
        }).join("");
        totalCell.textContent = formatRupiah(totalOf(rows));
      }
      if (sampleNote) sampleNote.hidden = !isAllSample(rows);
    } catch (err) {
      tbody.innerHTML =
        '<tr><td class="fundraising-empty" colspan="3">Data tidak dapat dimuat saat ini. Silakan coba lagi nanti.</td></tr>';
      totalCell.textContent = "—";
    }
  }

  /* --- Ringkasan di halaman utama gate: kartu "Sukarela" --- */
  async function renderSummary() {
    var totalEl = document.getElementById("fundraising-summary-total");
    var sampleEl = document.getElementById("fundraising-summary-sample");
    if (!totalEl) return;

    try {
      var rows = await fetchDonations();
      totalEl.textContent = formatRupiah(totalOf(rows));
      if (sampleEl) sampleEl.hidden = !isAllSample(rows);
    } catch (err) {
      totalEl.textContent = "—";
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderDetailTable();
    renderSummary();
  });
})();
