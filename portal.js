const legacyTennisHashes = new Set(["#jadwal", "#pemain", "#aturan", "#admin"]);

if (legacyTennisHashes.has(window.location.hash)) {
  window.location.replace(`/tennis${window.location.hash}`);
}
