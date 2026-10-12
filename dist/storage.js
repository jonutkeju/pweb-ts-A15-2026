"use strict";
// sebelum script halaman <script src="dist/storage.js" defer></script>
const KEY_JENIS = "jenisAntrian";
const KEY_TIKET = "tiketAntrian";
const KEY_NOMOR = "nomorTerakhir";
// semakin besar semakin didahulukan
const BOBOT_PRIORITAS = {
    VIP: 3,
    Disabilitas: 2,
    Lansia: 1,
    Normal: 0,
};
function getJenis() {
    try {
        return JSON.parse(localStorage.getItem(KEY_JENIS) ?? "[]");
    }
    catch {
        return [];
    }
}
function saveJenis(data) {
    localStorage.setItem(KEY_JENIS, JSON.stringify(data));
}
function getTiket() {
    try {
        return JSON.parse(localStorage.getItem(KEY_TIKET) ?? "[]");
    }
    catch {
        return [];
    }
}
function saveTiket(data) {
    localStorage.setItem(KEY_TIKET, JSON.stringify(data));
}
function getNomorTerakhir() {
    try {
        return JSON.parse(localStorage.getItem(KEY_NOMOR) ?? "{}");
    }
    catch {
        return {};
    }
}
function saveNomorTerakhir(data) {
    localStorage.setItem(KEY_NOMOR, JSON.stringify(data));
}
function buatTiket(kode, prioritas) {
    const nomorTerakhir = getNomorTerakhir();
    const nomorBaru = (nomorTerakhir[kode] ?? 0) + 1;
    nomorTerakhir[kode] = nomorBaru;
    saveNomorTerakhir(nomorTerakhir);
    const tiket = {
        nomor: kode + "-" + String(nomorBaru).padStart(3, "0"),
        kode: kode,
        prioritas: prioritas,
        status: "menunggu",
        waktu: Date.now(),
    };
    const semua = getTiket();
    semua.push(tiket);
    saveTiket(semua);
    return tiket;
}
// prioritas lebih tinggi duluan, kalau sama yang datang duluan
function getAntrianMenunggu(kode) {
    return getTiket()
        .filter((t) => t.kode === kode && t.status === "menunggu")
        .sort((a, b) => {
        const selisih = BOBOT_PRIORITAS[b.prioritas] - BOBOT_PRIORITAS[a.prioritas];
        if (selisih !== 0)
            return selisih;
        return a.waktu - b.waktu;
    });
}
