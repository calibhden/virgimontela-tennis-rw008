const SUPABASE_URL = "https://uakhvqjqyplkuxfleggk.supabase.co";
const SUPABASE_KEY = "sb_publishable_5nSODU833YAt89vnbNaUGA_MtqGYGAR";
const SESSION_KEY = "virgimontela_admin_session";
const JAKARTA_TZ = "Asia/Jakarta";
const HOUR_WIDTH = 72;
const PX_PER_MINUTE = HOUR_WIDTH / 60;

const state = {
  weekStart: startOfWeek(new Date()),
  bookings: [],
  bookingMap: new Map(),
  players: [],
  showAllPlayers: false,
  session: readSession(),
  profile: null,
  adminBookings: [],
  adminPlayers: [],
};

const el = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindEvents();
  setBookingDateDefault();
  await Promise.all([loadSchedule(), loadPlayers()]);
  if (state.session) await restoreAdminSession();
}

function bindEvents() {
  el("prev-week").addEventListener("click", () => shiftWeek(-7));
  el("next-week").addEventListener("click", () => shiftWeek(7));
  el("current-week").addEventListener("click", () => {
    state.weekStart = startOfWeek(new Date());
    loadSchedule();
  });
  el("player-search").addEventListener("input", renderPlayers);
  el("show-all-players").addEventListener("click", () => {
    state.showAllPlayers = true;
    renderPlayers();
  });
  el("schedule-canvas").addEventListener("click", onScheduleClick);
  el("booking-detail").addEventListener("click", onBookingPlayerClick);

  el("open-login").addEventListener("click", () => el("login-dialog").showModal());
  el("open-admin").addEventListener("click", () => el("admin").scrollIntoView({ behavior: "smooth" }));
  el("login-form").addEventListener("submit", login);
  el("signup-form").addEventListener("submit", signup);
  el("logout").addEventListener("click", logout);

  document.querySelectorAll(".admin-tab").forEach((button) => {
    button.addEventListener("click", () => selectAdminTab(button.dataset.adminTab));
  });
  el("booking-form").addEventListener("submit", saveBooking);
  el("reset-booking-form").addEventListener("click", resetBookingForm);
  el("refresh-admin-bookings").addEventListener("click", loadAdminBookings);
  el("admin-booking-list").addEventListener("click", onAdminBookingAction);
  el("player-form").addEventListener("submit", savePlayer);
  el("reset-player-form").addEventListener("click", resetPlayerForm);
  el("refresh-admin-players").addEventListener("click", loadAdminPlayers);
  el("admin-player-search").addEventListener("input", renderAdminPlayers);
  el("admin-player-list").addEventListener("click", onAdminPlayerAction);
  el("refresh-access").addEventListener("click", loadAccessList);
  el("access-list").addEventListener("click", onAccessAction);
}

function startOfWeek(date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function jakartaDateKey(value) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatDate(date, options = {}) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  }).format(date);
}

function formatTime(value) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: JAKARTA_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value)).replace(".", ":");
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: JAKARTA_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function dateTimeWithJakartaOffset(date, time) {
  return new Date(`${date}T${time}:00+07:00`).toISOString();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initials(name) {
  return String(name).trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("");
}

function shiftWeek(days) {
  state.weekStart = addDays(state.weekStart, days);
  loadSchedule();
}

async function api(path, { method = "GET", body, prefer, authenticated = false, retry = true } = {}) {
  const headers = { apikey: SUPABASE_KEY };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (prefer) headers.Prefer = prefer;
  if (authenticated && state.session?.access_token) headers.Authorization = `Bearer ${state.session.access_token}`;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && authenticated && retry && state.session?.refresh_token) {
    const refreshed = await refreshSession();
    if (refreshed) return api(path, { method, body, prefer, authenticated, retry: false });
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }
  if (!response.ok) {
    const error = new Error(payload?.message || payload?.msg || `Permintaan gagal (${response.status})`);
    error.status = response.status;
    error.code = payload?.code;
    error.details = payload?.details;
    throw error;
  }
  return payload;
}

async function authRequest(path, body, token) {
  const headers = { apikey: SUPABASE_KEY, "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: "POST",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.msg || payload.message || "Autentikasi gagal");
  return payload;
}

function readSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}

function saveSession(session) {
  state.session = session;
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

async function refreshSession() {
  try {
    const session = await authRequest("token?grant_type=refresh_token", { refresh_token: state.session.refresh_token });
    saveSession(session);
    return true;
  } catch {
    saveSession(null);
    showSignedOut();
    return false;
  }
}

async function loadSchedule() {
  const loading = el("schedule-loading");
  const errorBox = el("schedule-error");
  const scroller = el("schedule-scroll");
  loading.classList.remove("hidden");
  errorBox.classList.add("hidden");
  scroller.classList.add("hidden");

  const end = addDays(state.weekStart, 7);
  el("week-label").textContent = `${formatDate(state.weekStart)} – ${formatDate(addDays(end, -1))}`;
  try {
    const startFilter = encodeURIComponent(`${dateKey(state.weekStart)}T00:00:00+07:00`);
    const endFilter = encodeURIComponent(`${dateKey(end)}T00:00:00+07:00`);
    const query = `bookings?select=id,court_id,title,booking_type,priority,resident_ratio,start_at,end_at,status,notes&start_at=gte.${startFilter}&start_at=lt.${endFilter}&status=eq.confirmed&order=start_at.asc`;
    state.bookings = await api(query);
    state.bookingMap = new Map(state.bookings.map((booking) => [booking.id, booking]));
    renderSchedule();
    loading.classList.add("hidden");
    scroller.classList.remove("hidden");
    if (state.profile && state.profile.role !== "pending") await loadAdminBookings();
  } catch (error) {
    loading.classList.add("hidden");
    errorBox.textContent = `Jadwal belum dapat dimuat: ${error.message}`;
    errorBox.classList.remove("hidden");
  }
}

function renderSchedule() {
  const canvas = el("schedule-canvas");
  const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
  let html = `<div class="schedule-header"><div class="schedule-corner">Hari · Court</div><div class="time-axis">`;
  for (let hour = 5; hour <= 22; hour += 1) {
    html += `<span class="time-label" data-left="${(hour - 5) * HOUR_WIDTH}">${String(hour).padStart(2, "0")}:00</span>`;
  }
  html += `</div></div>`;

  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    const date = addDays(state.weekStart, dayIndex);
    const key = dateKey(date);
    for (const court of ["A", "B"]) {
      const rowBookings = state.bookings.filter((booking) => booking.court_id === court && jakartaDateKey(booking.start_at) === key);
      html += `<div class="schedule-row">
        <div class="row-label"><div><strong>${days[dayIndex]}</strong><span>${formatDate(date, { year: undefined })}</span></div><b>${court}</b></div>
        <div class="timeline-row">`;
      for (const booking of rowBookings) html += bookingBlock(booking);
      html += `</div></div>`;
    }
  }
  canvas.innerHTML = html;
  applySchedulePositions(canvas);
}

function applySchedulePositions(canvas) {
  canvas.querySelectorAll(".time-label[data-left]").forEach((label) => {
    label.style.left = `${Number(label.dataset.left)}px`;
  });
  canvas.querySelectorAll(".booking-block[data-left][data-width]").forEach((booking) => {
    booking.style.left = `${Number(booking.dataset.left)}px`;
    booking.style.width = `${Number(booking.dataset.width)}px`;
  });
}

function bookingBlock(booking) {
  const start = new Date(booking.start_at);
  const end = new Date(booking.end_at);
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: JAKARTA_TZ, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(start);
  const hour = Number(parts.find((part) => part.type === "hour").value);
  const minute = Number(parts.find((part) => part.type === "minute").value);
  const startMinutes = hour * 60 + minute - 5 * 60;
  const durationMinutes = Math.round((end - start) / 60000);
  const className = booking.priority ? `priority-${booking.priority}` : booking.booking_type === "basket" ? "basket" : "incidental";
  return `<button class="booking-block ${className}" type="button" data-booking-id="${escapeHtml(booking.id)}" data-left="${startMinutes * PX_PER_MINUTE}" data-width="${Math.max(durationMinutes * PX_PER_MINUTE, 11)}" aria-label="${escapeHtml(booking.title)}, ${formatTime(booking.start_at)} sampai ${formatTime(booking.end_at)}">
    <strong>${escapeHtml(booking.title)}</strong><span>${formatTime(booking.start_at)}–${formatTime(booking.end_at)}</span>
  </button>`;
}

function onScheduleClick(event) {
  const button = event.target.closest("[data-booking-id]");
  if (!button) return;
  const booking = state.bookingMap.get(button.dataset.bookingId);
  if (!booking) return;
  const labels = {
    mabar_warga: "Mabar warga",
    private: "Private / coaching",
    non_warga: "Mabar non-warga",
    incidental: "Insidental",
    basket: "Basket",
  };
  const matchedPlayers = bookingPlayers(booking);
  el("booking-detail").innerHTML = `
    <p class="eyebrow dark">Lapangan ${escapeHtml(booking.court_id)}</p>
    <h2>${escapeHtml(booking.title)}</h2>
    ${matchedPlayers.length ? `
      <div class="booking-players">
        <p class="booking-players-label">Pemain · ketuk nama untuk melihat alamat</p>
        <div class="booking-player-list">
          ${matchedPlayers.map((player) => `
            <div class="booking-player-entry">
              <button class="booking-player-button" type="button" data-player-address="${escapeHtml(player.id)}" aria-expanded="false" aria-controls="booking-player-address-${escapeHtml(player.id)}">
                <span class="booking-player-initial">${escapeHtml(initials(player.full_name))}</span>
                <span>${escapeHtml(player.full_name)}</span>
                <span aria-hidden="true">⌄</span>
              </button>
              <div class="booking-player-address hidden" id="booking-player-address-${escapeHtml(player.id)}">${escapeHtml(playerAddressLabel(player))}</div>
            </div>`).join("")}
        </div>
      </div>` : `<p class="booking-player-unmatched">Nama booking ini belum terhubung dengan database pemain.</p>`}
    <div class="booking-detail-grid">
      <div class="booking-detail-item"><span>Waktu</span><strong>${escapeHtml(formatDateTime(booking.start_at))}–${escapeHtml(formatTime(booking.end_at))}</strong></div>
      <div class="booking-detail-item"><span>Jenis</span><strong>${escapeHtml(labels[booking.booking_type] || booking.booking_type)}</strong></div>
      <div class="booking-detail-item"><span>Prioritas</span><strong>${booking.priority ? `Prioritas ${booking.priority}` : "Tidak berlaku"}</strong></div>
      <div class="booking-detail-item"><span>Komposisi</span><strong>${booking.resident_ratio === "gte_50" ? "≥ 50% warga" : booking.resident_ratio === "lt_50" ? "< 50% warga" : "Tidak berlaku"}</strong></div>
    </div>
    ${booking.notes ? `<p class="detail-notes"><strong>Catatan:</strong> ${escapeHtml(booking.notes)}</p>` : ""}`;
  el("booking-dialog").showModal();
}

function bookingPlayers(booking) {
  const normalize = (value) => String(value || "")
    .toLocaleLowerCase("id-ID")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const title = normalize(booking.title);
  const candidates = state.players.filter((player) => !normalize(player.full_name).startsWith("vtc "));
  const exact = candidates.filter((player) => normalize(player.full_name) === title);
  if (exact.length === 1) return exact;

  const ignored = new Set(["vtc", "court", "lapangan", "mabar", "warga", "private", "coaching"]);
  const tokens = [...new Set(title.split(" ").filter((token) => token.length >= 3 && !ignored.has(token)))];
  const matches = [];
  tokens.forEach((token) => {
    const firstNameMatches = candidates.filter((player) => {
      const firstName = normalize(player.full_name).split(" ")[0];
      return firstName === token || (token.length >= 4 && (firstName.startsWith(token) || token.startsWith(firstName)));
    });
    const exactWordMatches = candidates.filter((player) => normalize(player.full_name).split(" ").includes(token));
    const prefixMatches = exactWordMatches.length ? [] : candidates.filter((player) =>
      token.length >= 4 && normalize(player.full_name).split(" ").some((word) => word.startsWith(token) || token.startsWith(word))
    );
    const tokenMatches = firstNameMatches.length === 1 ? firstNameMatches : exactWordMatches.length === 1 ? exactWordMatches : prefixMatches.length === 1 ? prefixMatches : [];
    tokenMatches.forEach((player) => {
      if (!matches.some((match) => String(match.id) === String(player.id))) matches.push(player);
    });
  });
  return matches;
}

function onBookingPlayerClick(event) {
  const button = event.target.closest("[data-player-address]");
  if (!button) return;
  const address = el(`booking-player-address-${button.dataset.playerAddress}`);
  if (!address) return;
  const willOpen = address.classList.contains("hidden");
  address.classList.toggle("hidden", !willOpen);
  button.setAttribute("aria-expanded", String(willOpen));
  button.classList.toggle("open", willOpen);
}

async function loadPlayers() {
  try {
    state.players = await api("players?select=id,full_name,block,house_number&is_active=eq.true&order=full_name.asc");
    renderPlayers();
  } catch (error) {
    el("player-grid").innerHTML = `<p class="empty-state">Daftar pemain belum dapat dimuat: ${escapeHtml(error.message)}</p>`;
  }
}

function renderPlayers() {
  const query = el("player-search").value.trim().toLocaleLowerCase("id-ID");
  const filtered = state.players.filter((player) => `${player.full_name} ${player.block || ""} ${player.house_number || ""}`.toLocaleLowerCase("id-ID").includes(query));
  const visible = query || state.showAllPlayers ? filtered : filtered.slice(0, 24);
  el("player-count").textContent = state.players.length || "—";
  el("player-grid").innerHTML = visible.length
    ? visible.map((player) => `<div class="player-chip"><span class="player-initial">${escapeHtml(initials(player.full_name))}</span><span class="player-name">${escapeHtml(player.full_name)}</span><span class="player-address">${escapeHtml(playerAddressLabel(player))}</span></div>`).join("")
    : `<p class="empty-state">Tidak ada nama yang cocok.</p>`;
  el("show-all-players").classList.toggle("hidden", Boolean(query) || state.showAllPlayers || filtered.length <= 24);
}

function playerAddressLabel(player) {
  if (player.block && player.house_number) return `Blok ${player.block} · No. ${player.house_number}`;
  if (player.block) return `Blok ${player.block}`;
  if (player.house_number) return `No. ${player.house_number}`;
  return "Alamat belum dicatat";
}

async function login(event) {
  event.preventDefault();
  const message = el("login-message");
  setMessage(message, "Memeriksa akun…");
  try {
    const session = await authRequest("token?grant_type=password", {
      email: el("login-email").value.trim(),
      password: el("login-password").value,
    });
    saveSession(session);
    await restoreAdminSession();
    el("login-dialog").close();
    el("admin").scrollIntoView({ behavior: "smooth" });
    setMessage(message, "");
  } catch (error) {
    setMessage(message, translateAuthError(error.message), true);
  }
}

async function signup(event) {
  event.preventDefault();
  const message = el("signup-message");
  setMessage(message, "Mendaftarkan akun…");
  try {
    const response = await authRequest("signup", {
      email: el("signup-email").value.trim(),
      password: el("signup-password").value,
      data: { full_name: el("signup-name").value.trim() },
    });
    if (response.access_token) {
      saveSession(response);
      await restoreAdminSession();
      el("login-dialog").close();
      el("admin").scrollIntoView({ behavior: "smooth" });
    } else {
      setMessage(message, "Akun dibuat. Periksa email untuk konfirmasi, lalu login. Setelah itu Admin Global perlu mengaktifkan akses Anda.");
    }
  } catch (error) {
    setMessage(message, translateAuthError(error.message), true);
  }
}

function translateAuthError(message) {
  const lower = String(message).toLowerCase();
  if (lower.includes("invalid login")) return "Email atau password tidak sesuai.";
  if (lower.includes("email not confirmed")) return "Silakan konfirmasi email terlebih dahulu.";
  if (lower.includes("already registered")) return "Email ini sudah terdaftar. Silakan login.";
  return message;
}

async function restoreAdminSession() {
  if (!state.session?.user?.id) return showSignedOut();
  try {
    const profiles = await api(`profiles?id=eq.${encodeURIComponent(state.session.user.id)}&select=id,email,full_name,role,is_active`, { authenticated: true });
    if (!profiles?.length) throw new Error("Profil admin belum tersedia");
    state.profile = profiles[0];
    showAdmin();
  } catch (error) {
    if (error.status === 401) return showSignedOut();
    toast(error.message);
  }
}

function showAdmin() {
  const isAdmin = ["scheduling_admin", "global_admin"].includes(state.profile.role) && state.profile.is_active;
  const isGlobal = state.profile.role === "global_admin" && state.profile.is_active;
  el("open-login").classList.add("hidden");
  el("open-admin").classList.remove("hidden");
  el("admin").classList.remove("hidden");
  el("admin-identity").textContent = `${state.profile.full_name || state.profile.email} · ${roleLabel(state.profile.role)}`;
  el("pending-card").classList.toggle("hidden", isAdmin);
  el("admin-workspace").classList.toggle("hidden", !isAdmin);
  document.querySelectorAll(".global-only").forEach((node) => node.classList.toggle("hidden", !isGlobal));
  if (isAdmin) {
    Promise.all([loadAdminBookings(), loadAdminPlayers()]);
    if (isGlobal) loadAccessList();
  }
}

function showSignedOut() {
  state.profile = null;
  el("open-login").classList.remove("hidden");
  el("open-admin").classList.add("hidden");
  el("admin").classList.add("hidden");
}

async function logout() {
  if (state.session?.access_token) {
    try { await authRequest("logout", undefined, state.session.access_token); } catch { /* local logout still applies */ }
  }
  saveSession(null);
  showSignedOut();
  location.hash = "atas";
}

function roleLabel(role) {
  return { pending: "Menunggu aktivasi", scheduling_admin: "Admin Penjadwalan", global_admin: "Admin Global" }[role] || role;
}

function selectAdminTab(tab) {
  document.querySelectorAll(".admin-tab").forEach((button) => button.classList.toggle("active", button.dataset.adminTab === tab));
  document.querySelectorAll(".admin-pane").forEach((pane) => pane.classList.toggle("hidden", pane.dataset.adminPane !== tab));
}

function setBookingDateDefault() {
  el("booking-date").value = dateKey(new Date());
  el("booking-start").value = "08:00";
  el("booking-end").value = "09:00";
}

async function loadAdminBookings() {
  if (!state.profile || state.profile.role === "pending") return;
  const end = addDays(state.weekStart, 7);
  const startFilter = encodeURIComponent(`${dateKey(state.weekStart)}T00:00:00+07:00`);
  const endFilter = encodeURIComponent(`${dateKey(end)}T00:00:00+07:00`);
  try {
    state.adminBookings = await api(`bookings?select=*&start_at=gte.${startFilter}&start_at=lt.${endFilter}&order=start_at.asc`, { authenticated: true });
    renderAdminBookings();
  } catch (error) {
    el("admin-booking-list").innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
  }
}

function renderAdminBookings() {
  const list = el("admin-booking-list");
  if (!state.adminBookings.length) {
    list.innerHTML = `<p class="empty-state">Belum ada booking pada minggu ini.</p>`;
    return;
  }
  list.innerHTML = state.adminBookings.map((booking) => `
    <div class="admin-list-item">
      <div class="admin-list-main">
        <div><strong>${escapeHtml(booking.title)}</strong><p>${escapeHtml(formatDateTime(booking.start_at))}–${escapeHtml(formatTime(booking.end_at))} · Lapangan ${escapeHtml(booking.court_id)}</p></div>
        <span class="badge ${booking.status === "confirmed" ? "" : "cancelled"}">${escapeHtml(booking.status)}</span>
      </div>
      <div class="admin-list-actions">
        <button class="mini-button" type="button" data-edit-booking="${escapeHtml(booking.id)}">Edit</button>
        ${booking.status === "confirmed" ? `<button class="mini-button danger" type="button" data-cancel-booking="${escapeHtml(booking.id)}">Batalkan</button>` : ""}
      </div>
    </div>`).join("");
}

async function saveBooking(event) {
  event.preventDefault();
  const message = el("booking-message");
  const date = el("booking-date").value;
  const start = el("booking-start").value;
  const end = el("booking-end").value;
  if (end <= start) return setMessage(message, "Waktu selesai harus setelah waktu mulai.", true);

  const payload = {
    title: el("booking-title").value.trim(),
    court_id: el("booking-court").value,
    booking_type: el("booking-type").value,
    priority: el("booking-priority").value ? Number(el("booking-priority").value) : null,
    resident_ratio: el("booking-ratio").value,
    start_at: dateTimeWithJakartaOffset(date, start),
    end_at: dateTimeWithJakartaOffset(date, end),
    status: "confirmed",
    notes: el("booking-notes").value.trim() || null,
    updated_by: state.session.user.id,
  };
  const id = el("booking-id").value;
  if (!id) payload.created_by = state.session.user.id;

  setMessage(message, "Menyimpan…");
  try {
    if (id) await api(`bookings?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: payload, authenticated: true });
    else await api("bookings", { method: "POST", body: payload, authenticated: true });
    setMessage(message, "Booking berhasil disimpan.");
    resetBookingForm();
    await loadSchedule();
    toast("Jadwal berhasil diperbarui");
  } catch (error) {
    const friendly = error.code === "23P01" ? "Waktu tersebut berbenturan dengan booking lain pada lapangan yang sama." : error.message;
    setMessage(message, friendly, true);
  }
}

function onAdminBookingAction(event) {
  const edit = event.target.closest("[data-edit-booking]");
  const cancel = event.target.closest("[data-cancel-booking]");
  if (edit) editBooking(edit.dataset.editBooking);
  if (cancel) cancelBooking(cancel.dataset.cancelBooking);
}

function editBooking(id) {
  const booking = state.adminBookings.find((item) => item.id === id);
  if (!booking) return;
  el("booking-id").value = booking.id;
  el("booking-title").value = booking.title;
  el("booking-court").value = booking.court_id;
  el("booking-date").value = jakartaDateKey(booking.start_at);
  el("booking-start").value = formatTime(booking.start_at);
  el("booking-end").value = formatTime(booking.end_at);
  el("booking-type").value = booking.booking_type;
  el("booking-priority").value = booking.priority || "";
  el("booking-ratio").value = booking.resident_ratio;
  el("booking-notes").value = booking.notes || "";
  el("booking-form-title").textContent = "Edit booking";
  el("reset-booking-form").classList.remove("hidden");
  el("booking-form").scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetBookingForm() {
  el("booking-form").reset();
  el("booking-id").value = "";
  el("booking-form-title").textContent = "Tambah booking";
  el("reset-booking-form").classList.add("hidden");
  setBookingDateDefault();
}

async function cancelBooking(id) {
  if (!confirm("Batalkan booking ini? Jadwal akan langsung hilang dari tampilan publik.")) return;
  try {
    await api(`bookings?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { status: "cancelled", updated_by: state.session.user.id },
      authenticated: true,
    });
    await loadSchedule();
    toast("Booking dibatalkan");
  } catch (error) { toast(error.message); }
}

async function loadAdminPlayers() {
  if (!state.profile || state.profile.role === "pending") return;
  try {
    const [players, privateRows] = await Promise.all([
      api("players?select=id,full_name,is_active,block,house_number&order=full_name.asc", { authenticated: true }),
      api("player_private?select=player_id,booking_reputation,email,phone,player_status,in_whatsapp", { authenticated: true }),
    ]);
    const privateMap = new Map(privateRows.map((row) => [row.player_id, row]));
    state.adminPlayers = players.map((player) => ({ ...player, ...(privateMap.get(player.id) || {}) }));
    renderAdminPlayers();
  } catch (error) {
    el("admin-player-list").innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
  }
}

function renderAdminPlayers() {
  const query = el("admin-player-search").value.trim().toLocaleLowerCase("id-ID");
  const rows = state.adminPlayers.filter((player) => `${player.full_name} ${player.block || ""} ${player.house_number || ""} ${player.player_status || ""} ${player.email || ""} ${player.phone || ""}`.toLocaleLowerCase("id-ID").includes(query));
  el("admin-player-list").innerHTML = rows.length ? rows.map((player) => `
    <div class="admin-list-item">
      <div class="admin-list-main">
        <div>
          <strong>${escapeHtml(player.full_name)}</strong>
          <p>${escapeHtml(playerAddressLabel(player))} · ${escapeHtml(player.email || "Email belum dicatat")}</p>
          <p>${escapeHtml(player.phone || "No. HP belum dicatat")} · ${escapeHtml(player.booking_reputation || "Clear")}</p>
        </div>
        <span class="badge ${player.player_status ? "" : "pending"}">${escapeHtml(playerStatusLabel(player.player_status))}</span>
      </div>
      <div class="admin-list-actions"><button class="mini-button" type="button" data-edit-player="${escapeHtml(player.id)}">Edit data</button></div>
    </div>`).join("") : `<p class="empty-state">Tidak ada data yang cocok.</p>`;
}

function playerStatusLabel(status) {
  return { pemilik: "Pemilik", penyewa: "Penyewa", pelatih: "Pelatih" }[status] || "Status belum dicatat";
}

function onAdminPlayerAction(event) {
  const button = event.target.closest("[data-edit-player]");
  if (button) editPlayer(button.dataset.editPlayer);
}

function editPlayer(id) {
  const player = state.adminPlayers.find((item) => String(item.id) === String(id));
  if (!player) return;
  el("player-id").value = player.id;
  el("player-name").value = player.full_name || "";
  el("player-block").value = player.block || "";
  el("player-house-number").value = player.house_number || "";
  el("player-status").value = player.player_status || "";
  el("player-email").value = player.email || "";
  el("player-phone").value = player.phone || "";
  el("player-reputation").value = player.booking_reputation || "Clear";
  el("player-whatsapp").value = player.in_whatsapp == null ? "" : String(player.in_whatsapp);
  el("player-form-title").textContent = "Edit pemain";
  el("player-submit-label").textContent = "Simpan perubahan";
  el("reset-player-form").classList.remove("hidden");
  setMessage(el("player-message"), "");
  el("player-form").scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetPlayerForm() {
  el("player-form").reset();
  el("player-id").value = "";
  el("player-reputation").value = "Clear";
  el("player-form-title").textContent = "Tambah pemain";
  el("player-submit-label").textContent = "Tambah pemain";
  el("reset-player-form").classList.add("hidden");
  setMessage(el("player-message"), "");
}

async function savePlayer(event) {
  event.preventDefault();
  const message = el("player-message");
  setMessage(message, "Menyimpan…");
  try {
    const existingId = el("player-id").value;
    const playerPayload = {
      full_name: el("player-name").value.trim(),
      block: el("player-block").value.trim() || null,
      house_number: el("player-house-number").value.trim() || null,
    };
    let playerId = existingId;
    if (existingId) {
      await api(`players?id=eq.${encodeURIComponent(existingId)}`, {
        method: "PATCH",
        body: playerPayload,
        authenticated: true,
      });
    } else {
      const created = await api("players?select=id,full_name,block,house_number", {
        method: "POST",
        body: playerPayload,
        prefer: "return=representation",
        authenticated: true,
      });
      playerId = created[0].id;
    }
    await api("player_private?on_conflict=player_id", {
      method: "POST",
      body: {
        player_id: Number(playerId),
        player_status: el("player-status").value || null,
        email: el("player-email").value.trim() || null,
        phone: el("player-phone").value.trim() || null,
        booking_reputation: el("player-reputation").value.trim() || "Clear",
        in_whatsapp: el("player-whatsapp").value === "" ? null : el("player-whatsapp").value === "true",
      },
      prefer: "resolution=merge-duplicates,return=minimal",
      authenticated: true,
    });
    const successMessage = existingId ? "Data pemain berhasil diperbarui." : "Pemain berhasil ditambahkan.";
    resetPlayerForm();
    await Promise.all([loadPlayers(), loadAdminPlayers()]);
    setMessage(message, successMessage);
  } catch (error) {
    setMessage(message, error.code === "23505" ? "Nama pemain sudah terdaftar." : error.message, true);
  }
}

async function loadAccessList() {
  if (state.profile?.role !== "global_admin") return;
  try {
    const profiles = await api("profiles?select=id,email,full_name,role,is_active&order=created_at.asc", { authenticated: true });
    el("access-list").innerHTML = profiles.map((profile) => `
      <div class="admin-list-item">
        <div class="admin-list-main">
          <div><strong>${escapeHtml(profile.full_name || profile.email)}</strong><p>${escapeHtml(profile.email)}</p></div>
          <span class="badge ${profile.role === "pending" ? "pending" : ""}">${escapeHtml(roleLabel(profile.role))}</span>
        </div>
        <div class="admin-list-actions">
          <select class="role-select" data-role-for="${escapeHtml(profile.id)}" aria-label="Peran untuk ${escapeHtml(profile.email)}">
            <option value="pending" ${profile.role === "pending" ? "selected" : ""}>Menunggu</option>
            <option value="scheduling_admin" ${profile.role === "scheduling_admin" ? "selected" : ""}>Admin Penjadwalan</option>
            <option value="global_admin" ${profile.role === "global_admin" ? "selected" : ""}>Admin Global</option>
          </select>
          <button class="mini-button" type="button" data-save-role="${escapeHtml(profile.id)}">Simpan akses</button>
        </div>
      </div>`).join("");
  } catch (error) {
    el("access-list").innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
  }
}

async function onAccessAction(event) {
  const button = event.target.closest("[data-save-role]");
  if (!button) return;
  const userId = button.dataset.saveRole;
  const select = document.querySelector(`[data-role-for="${CSS.escape(userId)}"]`);
  button.disabled = true;
  try {
    await api("rpc/set_user_access", {
      method: "POST",
      body: { target_user_id: userId, new_role: select.value, new_is_active: true },
      authenticated: true,
    });
    toast("Hak akses diperbarui");
    await loadAccessList();
  } catch (error) { toast(error.message); }
  finally { button.disabled = false; }
}

function setMessage(node, message, error = false) {
  node.textContent = message;
  node.classList.toggle("error", error);
}

let toastTimer;
function toast(message) {
  const node = el("toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("show"), 3200);
}
