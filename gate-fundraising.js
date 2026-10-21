/* Transparansi dana Gate Virgimontela — data dibaca dari catatan publik dengan fallback Supabase.
 * Penerimaan: gate-fundraising-donations.json; fallback public.gate_fundraising_donations
 * Pengeluaran: public.gate_fundraising_expenses
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
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function optionalText(value) {
    var text = String(value == null ? "" : value).trim();
    return text ? escapeHtml(text) : "—";
  }

  async function fetchJson(path) {
    var res = await fetch(SUPABASE_URL + path, {
      headers: { apikey: SUPABASE_KEY }
    });
    if (!res.ok) {
      var error = new Error("HTTP " + res.status);
      error.status = res.status;
      throw error;
    }
    return res.json();
  }

  async function fetchPublishedDonations() {
    var res = await fetch("/gate-fundraising-donations.json?v=20261021-2");
    if (!res.ok) throw new Error("HTTP " + res.status);
    var data = await res.json();
    return Array.isArray(data) ? data : (data.rows || []);
  }

  async function fetchDonations() {
    try {
      var publishedRows = await fetchPublishedDonations();
      if (publishedRows.length > 0) return publishedRows;
    } catch (error) {
      // Gunakan database lama jika catatan publik belum dapat dimuat.
    }

    return fetchJson(
      "/rest/v1/gate_fundraising_donations" +
      "?select=tanggal,donatur,jumlah,is_sample&order=tanggal,id"
    );
  }

  async function fetchPublishedExpenses() {
    var res = await fetch("/gate-fundraising-expenses.json?v=20261019-1");
    if (!res.ok) throw new Error("HTTP " + res.status);
    var data = await res.json();
    return Array.isArray(data) ? data : (data.rows || []);
  }

  async function fetchExpenses() {
    var databaseRows = null;
    try {
      databaseRows = await fetchJson(
        "/rest/v1/gate_fundraising_expenses" +
        "?select=tanggal,uraian,penerima,jumlah,keterangan,bukti_url,is_sample&order=tanggal,id"
      );
    } catch (error) {
      databaseRows = null;
    }

    if (databaseRows && databaseRows.length > 0) {
      return { available: true, rows: databaseRows };
    }

    var publishedRows = await fetchPublishedExpenses();
    return { available: true, rows: publishedRows };
  }

  function isAllSample(rows) {
    return rows.length > 0 && rows.every(function (row) { return row.is_sample; });
  }

  function totalOf(rows) {
    return rows.reduce(function (sum, row) {
      return sum + (Number(row.jumlah) || 0);
    }, 0);
  }

  function setAmount(element, text, pending) {
    if (!element) return;
    element.textContent = text;
    element.classList.toggle("pending", Boolean(pending));
  }

  function renderDonationTable(rows, failed) {
    var tbody = document.getElementById("fundraising-rows");
    var totalCell = document.getElementById("fundraising-total");
    var sampleNote = document.getElementById("fundraising-sample-note");
    if (!tbody || !totalCell) return;

    if (failed) {
      tbody.innerHTML = '<tr><td class="fundraising-empty" colspan="3">Data sumbangan tidak dapat dimuat saat ini. Silakan coba lagi nanti.</td></tr>';
      totalCell.textContent = "—";
      return;
    }

    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td class="fundraising-empty" colspan="3">Belum ada data sumbangan yang dipublikasikan.</td></tr>';
    } else {
      tbody.innerHTML = rows.map(function (row) {
        return (
          "<tr><td>" + escapeHtml(formatTanggal(row.tanggal)) + "</td>" +
          "<td>" + optionalText(row.donatur) + "</td>" +
          '<td class="amount">' + escapeHtml(formatRupiah(row.jumlah)) + "</td></tr>"
        );
      }).join("");
    }

    totalCell.textContent = formatRupiah(totalOf(rows));
    if (sampleNote) sampleNote.hidden = !isAllSample(rows);
  }

  function evidenceHtml(row) {
    var parts = [];
    var url = String(row.bukti_url || "").trim();
    if (/^https:\/\//i.test(url)) {
      parts.push('<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">Lihat bukti</a>');
    }
    if (String(row.keterangan || "").trim()) {
      parts.push("<span>" + escapeHtml(row.keterangan) + "</span>");
    }
    return parts.length ? parts.join("<br>") : "—";
  }

  function renderExpenseTable(expenses, failed) {
    var tbody = document.getElementById("expense-rows");
    var totalCell = document.getElementById("expenses-total");
    var sampleNote = document.getElementById("expenses-sample-note");
    if (!tbody || !totalCell) return;

    if (failed) {
      tbody.innerHTML = '<tr><td class="fundraising-empty" colspan="5">Data pengeluaran tidak dapat dimuat saat ini. Silakan coba lagi nanti.</td></tr>';
      totalCell.textContent = "—";
      return;
    }

    if (!expenses.available) {
      tbody.innerHTML = '<tr><td class="fundraising-empty" colspan="5">Rincian pengeluaran belum dipublikasikan oleh pengurus.</td></tr>';
      totalCell.textContent = "Belum tersedia";
      return;
    }

    if (expenses.rows.length === 0) {
      tbody.innerHTML = '<tr><td class="fundraising-empty" colspan="5">Belum ada pengeluaran yang tercatat.</td></tr>';
    } else {
      tbody.innerHTML = expenses.rows.map(function (row) {
        return (
          "<tr><td>" + escapeHtml(formatTanggal(row.tanggal)) + "</td>" +
          "<td>" + optionalText(row.uraian) + "</td>" +
          "<td>" + optionalText(row.penerima) + "</td>" +
          '<td class="amount">' + escapeHtml(formatRupiah(row.jumlah)) + "</td>" +
          "<td>" + evidenceHtml(row) + "</td></tr>"
        );
      }).join("");
    }

    totalCell.textContent = formatRupiah(totalOf(expenses.rows));
    if (sampleNote) sampleNote.hidden = !isAllSample(expenses.rows);
  }

  function renderCashflow(donations, donationFailed, expenses, expenseFailed) {
    var donationsEl = document.getElementById("cashflow-donations-total");
    var expensesEl = document.getElementById("cashflow-expenses-total");
    var balanceEl = document.getElementById("cashflow-balance-total");
    var statusNote = document.getElementById("cashflow-status-note");
    if (!donationsEl && !expensesEl && !balanceEl) return;

    var expensesReady = !expenseFailed && expenses.available;
    setAmount(donationsEl, donationFailed ? "Tidak tersedia" : formatRupiah(totalOf(donations)), donationFailed);
    setAmount(expensesEl, expensesReady ? formatRupiah(totalOf(expenses.rows)) : "Belum tersedia", !expensesReady);

    if (!donationFailed && expensesReady) {
      setAmount(balanceEl, formatRupiah(totalOf(donations) - totalOf(expenses.rows)), false);
      if (statusNote) statusNote.hidden = true;
    } else {
      setAmount(balanceEl, "Menunggu data", true);
      if (statusNote) statusNote.hidden = false;
    }
  }

  function renderHomeSummary(donations, donationFailed, expenses, expenseFailed) {
    var totalEl = document.getElementById("fundraising-summary-total");
    var expensesEl = document.getElementById("fundraising-summary-expenses");
    var balanceEl = document.getElementById("fundraising-summary-balance");
    var sampleEl = document.getElementById("fundraising-summary-sample");
    if (!totalEl) return;

    var expensesReady = !expenseFailed && expenses.available;
    totalEl.textContent = donationFailed ? "Tidak tersedia" : formatRupiah(totalOf(donations));
    if (expensesEl) expensesEl.textContent = expensesReady ? formatRupiah(totalOf(expenses.rows)) : "Belum tersedia";
    if (balanceEl) {
      balanceEl.textContent = !donationFailed && expensesReady
        ? formatRupiah(totalOf(donations) - totalOf(expenses.rows))
        : "Menunggu data";
    }
    if (sampleEl) sampleEl.hidden = !isAllSample(donations);
  }

  async function loadFinancialData() {
    var donationState = { rows: [], failed: false };
    var expenseState = { data: { available: false, rows: [] }, failed: false };

    await Promise.all([
      fetchDonations().then(function (rows) {
        donationState.rows = rows;
      }).catch(function () {
        donationState.failed = true;
      }),
      fetchExpenses().then(function (data) {
        expenseState.data = data;
      }).catch(function () {
        expenseState.failed = true;
      })
    ]);

    renderDonationTable(donationState.rows, donationState.failed);
    renderExpenseTable(expenseState.data, expenseState.failed);
    renderCashflow(
      donationState.rows,
      donationState.failed,
      expenseState.data,
      expenseState.failed
    );
    renderHomeSummary(
      donationState.rows,
      donationState.failed,
      expenseState.data,
      expenseState.failed
    );
  }

  document.addEventListener("DOMContentLoaded", loadFinancialData);
})();
