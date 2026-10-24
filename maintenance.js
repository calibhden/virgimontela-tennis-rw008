/* Halaman Maintenance — daftar aset yang dirawat + riwayat servis/perbaikan.
 * Data: public.maintenance_assets dan public.maintenance_logs (Supabase, public read).
 */
(function () {
  "use strict";

  var SUPABASE_URL = "https://uakhvqjqyplkuxfleggk.supabase.co";
  var SUPABASE_KEY = "sb_publishable_5nSODU833YAt89vnbNaUGA_MtqGYGAR";
  var BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  var CATEGORY_LABEL = { ac: "Air Conditioning" };
  var UNIT_TYPE_LABEL = {
    split_wall: "Split wall",
    split_standing: "Split standing",
    cassette: "Cassette",
    window: "Window",
    portable: "Portable",
    central: "Central"
  };
  var SERVICE_TYPE_LABEL = {
    pembersihan_rutin: "Pembersihan rutin",
    service_berkala: "Service berkala",
    perbaikan: "Perbaikan",
    penggantian_sparepart: "Penggantian sparepart",
    inspeksi: "Inspeksi",
    instalasi: "Instalasi",
    lainnya: "Lainnya"
  };
  var STATUS_LABEL = { active: "Aktif", inactive: "Nonaktif", retired: "Ditarik" };

  function escapeHtml(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function textOrDash(value) {
    var text = String(value == null ? "" : value).trim();
    return text ? escapeHtml(text) : "—";
  }

  function formatRupiah(nilai) {
    if (nilai == null || nilai === "") return "—";
    return "Rp" + new Intl.NumberFormat("id-ID").format(Number(nilai) || 0);
  }

  function formatTanggal(iso) {
    if (!iso) return "—";
    var parts = String(iso).slice(0, 10).split("-");
    if (parts.length !== 3 || !BULAN[Number(parts[1]) - 1]) return escapeHtml(String(iso));
    return Number(parts[2]) + " " + BULAN[Number(parts[1]) - 1] + " " + parts[0];
  }

  function formatKapasitas(asset) {
    var parts = [];
    if (asset.capacity_pk != null && asset.capacity_pk !== "") {
      parts.push(String(Number(asset.capacity_pk)).replace(".", ",") + " PK");
    }
    if (asset.capacity_btu != null && asset.capacity_btu !== "") {
      parts.push(new Intl.NumberFormat("id-ID").format(Number(asset.capacity_btu)) + " BTU");
    }
    return parts.length ? parts.join(" · ") : null;
  }

  async function fetchRows(table, select, order) {
    var res = await fetch(
      SUPABASE_URL + "/rest/v1/" + table + "?select=" + select + "&order=" + order,
      { headers: { apikey: SUPABASE_KEY } }
    );
    if (!res.ok) {
      var error = new Error("HTTP " + res.status);
      error.status = res.status;
      throw error;
    }
    return res.json();
  }

  function setStat(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function renderStats(assets, logs) {
    var active = assets.filter(function (a) { return a.status === "active"; }).length;
    setStat("stat-units", String(assets.length));
    setStat("stat-active", String(active));
    setStat("stat-logs", String(logs.length));

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var upcoming = logs
      .map(function (l) { return l.next_service_due; })
      .filter(function (d) { return d && new Date(d + "T00:00:00") >= today; })
      .sort();
    setStat("stat-next", upcoming.length ? formatTanggal(upcoming[0]) : "—");
  }

  function specRow(label, value) {
    if (value == null || String(value).trim() === "") return "";
    return "<div><dt>" + escapeHtml(label) + "</dt><dd>" + escapeHtml(String(value)) + "</dd></div>";
  }

  function renderAssetCard(asset, assetLogs) {
    var status = asset.status || "active";
    var specs = "";
    specs += specRow("Nama aset", asset.name);
    specs += specRow("Lokasi", asset.location);
    specs += specRow("Merek", asset.brand);
    specs += specRow("Model", asset.model);
    specs += specRow("Tipe unit", UNIT_TYPE_LABEL[asset.unit_type] || asset.unit_type);
    specs += specRow("Kapasitas", formatKapasitas(asset));
    specs += specRow("Refrigeran", asset.refrigerant);
    specs += specRow("No. seri indoor", asset.indoor_serial);
    specs += specRow("No. seri outdoor", asset.outdoor_serial);
    specs += specRow("Terpasang", asset.installed_on ? formatTanggal(asset.installed_on) : null);
    specs += specRow("Garansi s/d", asset.warranty_until ? formatTanggal(asset.warranty_until) : null);
    specs += specRow("Catatan", asset.notes);

    var logRows = assetLogs.map(function (log) {
      return "<tr>" +
        "<td class=\"date\">" + formatTanggal(log.service_date) + "</td>" +
        "<td><span class=\"service-type\">" + escapeHtml(SERVICE_TYPE_LABEL[log.service_type] || log.service_type) + "</span></td>" +
        "<td>" + textOrDash(log.description) + "</td>" +
        "<td>" + textOrDash(log.technician) + "</td>" +
        "<td class=\"num\">" + formatRupiah(log.cost) + "</td>" +
        "<td class=\"date\">" + formatTanggal(log.next_service_due) + "</td>" +
        "</tr>";
    }).join("");

    var logTable = assetLogs.length
      ? "<div class=\"table-wrap\"><table class=\"log-table\">" +
        "<thead><tr><th scope=\"col\">Tanggal</th><th scope=\"col\">Jenis</th><th scope=\"col\">Deskripsi</th>" +
        "<th scope=\"col\">Teknisi / Vendor</th><th scope=\"col\" class=\"num\">Biaya</th><th scope=\"col\">Berikutnya</th></tr></thead>" +
        "<tbody>" + logRows + "</tbody></table></div>"
      : "<p class=\"empty-state\">Belum ada riwayat servis untuk unit ini.</p>";

    return "<details class=\"asset-card\">" +
      "<summary>" +
        "<span class=\"asset-code\">" + escapeHtml(asset.asset_code || "—") + "</span>" +
        "<span class=\"asset-summary-main\"><strong>" + escapeHtml(asset.name || "Tanpa nama") + "</strong>" +
        "<span>" + escapeHtml(asset.location || "") + "</span></span>" +
        "<span class=\"asset-status " + escapeHtml(status) + "\">" + escapeHtml(STATUS_LABEL[status] || status) + "</span>" +
        "<span class=\"asset-toggle\" aria-hidden=\"true\">▾</span>" +
      "</summary>" +
      "<div class=\"asset-body\">" +
        "<dl class=\"spec-grid\">" + specs + "</dl>" +
        "<h4 class=\"asset-log-title\">Riwayat servis &amp; perbaikan</h4>" +
        logTable +
      "</div>" +
    "</details>";
  }

  function renderAssets(assets, logs) {
    var container = document.getElementById("asset-groups");
    if (!assets.length) {
      container.innerHTML = "<p class=\"empty-state\">Belum ada data aset. Pengurus akan mengisi daftar aset yang dirawat di sini.</p>";
      return;
    }

    var logsByAsset = {};
    logs.forEach(function (log) {
      (logsByAsset[log.asset_id] = logsByAsset[log.asset_id] || []).push(log);
    });
    Object.keys(logsByAsset).forEach(function (assetId) {
      logsByAsset[assetId].sort(function (a, b) {
        return String(b.service_date).localeCompare(String(a.service_date));
      });
    });

    var categories = [];
    assets.forEach(function (asset) {
      var cat = asset.category || "ac";
      if (categories.indexOf(cat) === -1) categories.push(cat);
    });

    container.innerHTML = categories.map(function (cat) {
      var catAssets = assets.filter(function (a) { return (a.category || "ac") === cat; });
      var cards = catAssets.map(function (asset) {
        return renderAssetCard(asset, logsByAsset[asset.id] || []);
      }).join("");
      return "<div class=\"category-block\">" +
        "<div class=\"category-title\"><h3>" + escapeHtml(CATEGORY_LABEL[cat] || cat) + "</h3>" +
        "<span class=\"count\">" + catAssets.length + " unit</span></div>" +
        cards +
      "</div>";
    }).join("");
  }

  function renderCombinedLog(logs, assetsById) {
    var tbody = document.getElementById("log-rows");
    if (!logs.length) {
      tbody.innerHTML = "<tr><td colspan=\"7\" class=\"empty-state\">Belum ada riwayat servis.</td></tr>";
      return;
    }
    tbody.innerHTML = logs.slice(0, 100).map(function (log) {
      var asset = assetsById[log.asset_id] || {};
      var assetName = [asset.asset_code, asset.name].filter(Boolean).join(" — ");
      return "<tr>" +
        "<td class=\"date\">" + formatTanggal(log.service_date) + "</td>" +
        "<td>" + escapeHtml(assetName || "—") + "</td>" +
        "<td><span class=\"service-type\">" + escapeHtml(SERVICE_TYPE_LABEL[log.service_type] || log.service_type) + "</span></td>" +
        "<td>" + textOrDash(log.description) + "</td>" +
        "<td>" + textOrDash(log.technician) + "</td>" +
        "<td class=\"num\">" + formatRupiah(log.cost) + "</td>" +
        "<td class=\"date\">" + formatTanggal(log.next_service_due) + "</td>" +
        "</tr>";
    }).join("");
  }

  function renderError() {
    var container = document.getElementById("asset-groups");
    container.innerHTML = "<p class=\"error-state\">Data maintenance tidak dapat dimuat saat ini. Coba muat ulang halaman.</p>";
    var tbody = document.getElementById("log-rows");
    tbody.innerHTML = "<tr><td colspan=\"7\" class=\"error-state\">Riwayat tidak dapat dimuat.</td></tr>";
    ["stat-units", "stat-active", "stat-logs", "stat-next"].forEach(function (id) { setStat(id, "—"); });
  }

  async function init() {
    try {
      var assets = await fetchRows(
        "maintenance_assets",
        "id,asset_code,category,name,location,brand,model,unit_type,capacity_pk,capacity_btu,refrigerant,indoor_serial,outdoor_serial,installed_on,warranty_until,status,notes",
        "asset_code"
      );
      var logs = await fetchRows(
        "maintenance_logs",
        "id,asset_id,service_date,service_type,description,technician,cost,next_service_due",
        "service_date.desc,id.desc"
      );
      var assetsById = {};
      assets.forEach(function (a) { assetsById[a.id] = a; });

      renderStats(assets, logs);
      renderAssets(assets, logs);
      renderCombinedLog(logs, assetsById);
    } catch (error) {
      renderError();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
