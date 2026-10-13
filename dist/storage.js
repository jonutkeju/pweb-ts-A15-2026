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
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isJenisAntrian(value) {
    return isRecord(value) &&
        typeof value.kode === "string" && /^[A-Z]$/.test(value.kode) &&
        typeof value.nama === "string" && value.nama.trim() !== "" &&
        typeof value.aktif === "boolean";
}
function isPrioritas(value) {
    return typeof value === "string" && Object.prototype.hasOwnProperty.call(BOBOT_PRIORITAS, value);
}
function isStatusTiket(value) {
    return value === "menunggu" || value === "dipanggil" || value === "selesai" || value === "dilewati";
}
function isTiket(value) {
    return isRecord(value) &&
        typeof value.nomor === "string" && typeof value.kode === "string" &&
        isPrioritas(value.prioritas) && isStatusTiket(value.status) &&
        typeof value.waktu === "number" && Number.isFinite(value.waktu);
}
function restoreStorage(key, value) {
    try {
        if (value === null)
            localStorage.removeItem(key);
        else
            localStorage.setItem(key, value);
    }
    catch {
        return;
    }
}
function getQueueSnapshot() {
    return (localStorage.getItem(KEY_JENIS) ?? "") + (localStorage.getItem(KEY_TIKET) ?? "");
}
function getJenis() {
    try {
        const parsed = JSON.parse(localStorage.getItem(KEY_JENIS) ?? "[]");
        return Array.isArray(parsed) ? parsed.filter(isJenisAntrian) : [];
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
        const parsed = JSON.parse(localStorage.getItem(KEY_TIKET) ?? "[]");
        return Array.isArray(parsed) ? parsed.filter(isTiket) : [];
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
        const parsed = JSON.parse(localStorage.getItem(KEY_NOMOR) ?? "{}");
        if (!isRecord(parsed))
            return {};
        return Object.fromEntries(Object.entries(parsed).filter(([kode, nomor]) => /^[A-Z]$/.test(kode) && typeof nomor === "number" && Number.isInteger(nomor) && nomor >= 0));
    }
    catch {
        return {};
    }
}
function saveNomorTerakhir(data) {
    localStorage.setItem(KEY_NOMOR, JSON.stringify(data));
}
function buatTiket(kode, prioritas) {
    const jenis = getJenis().find((item) => item.kode === kode && item.aktif);
    if (!jenis)
        throw new Error("Jenis antrian tidak tersedia atau sedang nonaktif.");
    if (!(prioritas in BOBOT_PRIORITAS))
        throw new Error("Prioritas tiket tidak valid.");
    const dataNomorSebelumnya = localStorage.getItem(KEY_NOMOR);
    const dataTiketSebelumnya = localStorage.getItem(KEY_TIKET);
    const nomorTerakhir = getNomorTerakhir();
    const nomorBaru = (nomorTerakhir[kode] ?? 0) + 1;
    nomorTerakhir[kode] = nomorBaru;
    const tiket = {
        nomor: kode + "-" + String(nomorBaru).padStart(3, "0"),
        kode: kode,
        prioritas: prioritas,
        status: "menunggu",
        waktu: Date.now(),
    };
    const semua = getTiket();
    semua.push(tiket);
    try {
        saveTiket(semua);
        saveNomorTerakhir(nomorTerakhir);
    }
    catch {
        restoreStorage(KEY_TIKET, dataTiketSebelumnya);
        restoreStorage(KEY_NOMOR, dataNomorSebelumnya);
        throw new Error("Tiket tidak dapat disimpan. Periksa ruang penyimpanan browser lalu coba lagi.");
    }
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
function getTiketDipanggil(kode) {
    return getTiket()
        .filter((tiket) => tiket.kode === kode && tiket.status === "dipanggil")
        .sort((a, b) => a.waktu - b.waktu)[0];
}
function getTiketBerikutnya(kode) {
    return getAntrianMenunggu(kode)[0];
}
function getJumlahMenunggu(kode) {
    return getAntrianMenunggu(kode).length;
}
function panggilBerikutnya(kode) {
    const semua = getTiket();
    semua.forEach((tiket) => {
        if (tiket.kode === kode && tiket.status === "dipanggil")
            tiket.status = "selesai";
    });
    const berikutnya = semua
        .filter((tiket) => tiket.kode === kode && tiket.status === "menunggu")
        .sort((a, b) => {
        const selisih = BOBOT_PRIORITAS[b.prioritas] - BOBOT_PRIORITAS[a.prioritas];
        return selisih || a.waktu - b.waktu;
    })[0];
    if (berikutnya)
        berikutnya.status = "dipanggil";
    saveTiket(semua);
    return berikutnya;
}
function ubahStatusTiket(nomor, status) {
    const semua = getTiket();
    const tiket = semua.find((item) => item.nomor === nomor);
    if (!tiket)
        return false;
    tiket.status = status;
    saveTiket(semua);
    return true;
}
function selesaikanTiket(nomor) {
    return ubahStatusTiket(nomor, "selesai");
}
function lewatiTiket(nomor) {
    return ubahStatusTiket(nomor, "dilewati");
}
