// sebelum script halaman <script src="dist/storage.js" defer></script>

type Prioritas = "Normal" | "Lansia" | "Disabilitas" | "VIP";
type StatusTiket = "menunggu" | "dipanggil" | "selesai" | "dilewati";

interface JenisAntrian {
  kode: string;
  nama: string;
  aktif: boolean;
}

interface Tiket {
  nomor: string;
  kode: string;
  prioritas: Prioritas;
  status: StatusTiket;
  waktu: number;
}

const KEY_JENIS = "jenisAntrian";
const KEY_TIKET = "tiketAntrian";
const KEY_NOMOR = "nomorTerakhir";

// semakin besar semakin didahulukan
const BOBOT_PRIORITAS: Record<Prioritas, number> = {
  VIP: 3,
  Disabilitas: 2,
  Lansia: 1,
  Normal: 0,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJenisAntrian(value: unknown): value is JenisAntrian {
  return isRecord(value) &&
    typeof value.kode === "string" && /^[A-Z]$/.test(value.kode) &&
    typeof value.nama === "string" && value.nama.trim() !== "" &&
    typeof value.aktif === "boolean";
}

function isPrioritas(value: unknown): value is Prioritas {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(BOBOT_PRIORITAS, value);
}

function isStatusTiket(value: unknown): value is StatusTiket {
  return value === "menunggu" || value === "dipanggil" || value === "selesai" || value === "dilewati";
}

function isTiket(value: unknown): value is Tiket {
  return isRecord(value) &&
    typeof value.nomor === "string" && typeof value.kode === "string" &&
    isPrioritas(value.prioritas) && isStatusTiket(value.status) &&
    typeof value.waktu === "number" && Number.isFinite(value.waktu);
}

function restoreStorage(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    return;
  }
}

function getQueueSnapshot(): string {
  return (localStorage.getItem(KEY_JENIS) ?? "") + (localStorage.getItem(KEY_TIKET) ?? "");
}

function getJenis(): JenisAntrian[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY_JENIS) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isJenisAntrian) : [];
  } catch {
    return [];
  }
}

function saveJenis(data: JenisAntrian[]): void {
  localStorage.setItem(KEY_JENIS, JSON.stringify(data));
}

function getTiket(): Tiket[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY_TIKET) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isTiket) : [];
  } catch {
    return [];
  }
}

function saveTiket(data: Tiket[]): void {
  localStorage.setItem(KEY_TIKET, JSON.stringify(data));
}

function getNomorTerakhir(): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY_NOMOR) ?? "{}");
    if (!isRecord(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([kode, nomor]) =>
      /^[A-Z]$/.test(kode) && typeof nomor === "number" && Number.isInteger(nomor) && nomor >= 0
    )) as Record<string, number>;
  } catch {
    return {};
  }
}

function saveNomorTerakhir(data: Record<string, number>): void {
  localStorage.setItem(KEY_NOMOR, JSON.stringify(data));
}

function buatTiket(kode: string, prioritas: Prioritas): Tiket {
  const jenis = getJenis().find((item) => item.kode === kode && item.aktif);
  if (!jenis) throw new Error("Jenis antrian tidak tersedia atau sedang nonaktif.");
  if (!(prioritas in BOBOT_PRIORITAS)) throw new Error("Prioritas tiket tidak valid.");

  const dataNomorSebelumnya = localStorage.getItem(KEY_NOMOR);
  const dataTiketSebelumnya = localStorage.getItem(KEY_TIKET);
  const nomorTerakhir = getNomorTerakhir();
  const nomorBaru = (nomorTerakhir[kode] ?? 0) + 1;
  nomorTerakhir[kode] = nomorBaru;
  const tiket: Tiket = {
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
  } catch {
    restoreStorage(KEY_TIKET, dataTiketSebelumnya);
    restoreStorage(KEY_NOMOR, dataNomorSebelumnya);
    throw new Error("Tiket tidak dapat disimpan. Periksa ruang penyimpanan browser lalu coba lagi.");
  }
  return tiket;
}

// prioritas lebih tinggi duluan, kalau sama yang datang duluan
function getAntrianMenunggu(kode: string): Tiket[] {
  return getTiket()
    .filter((t) => t.kode === kode && t.status === "menunggu")
    .sort((a, b) => {
      const selisih = BOBOT_PRIORITAS[b.prioritas] - BOBOT_PRIORITAS[a.prioritas];
      if (selisih !== 0) return selisih;
      return a.waktu - b.waktu;
    });
}

function getTiketDipanggil(kode: string): Tiket | undefined {
  return getTiket()
    .filter((tiket) => tiket.kode === kode && tiket.status === "dipanggil")
    .sort((a, b) => a.waktu - b.waktu)[0];
}

function getTiketBerikutnya(kode: string): Tiket | undefined {
  return getAntrianMenunggu(kode)[0];
}

function getJumlahMenunggu(kode: string): number {
  return getAntrianMenunggu(kode).length;
}

function panggilBerikutnya(kode: string): Tiket | undefined {
  const semua = getTiket();
  semua.forEach((tiket) => {
    if (tiket.kode === kode && tiket.status === "dipanggil") tiket.status = "selesai";
  });

  const berikutnya = semua
    .filter((tiket) => tiket.kode === kode && tiket.status === "menunggu")
    .sort((a, b) => {
      const selisih = BOBOT_PRIORITAS[b.prioritas] - BOBOT_PRIORITAS[a.prioritas];
      return selisih || a.waktu - b.waktu;
    })[0];

  if (berikutnya) berikutnya.status = "dipanggil";
  saveTiket(semua);
  return berikutnya;
}

function ubahStatusTiket(nomor: string, status: StatusTiket): boolean {
  const semua = getTiket();
  const tiket = semua.find((item) => item.nomor === nomor);
  if (!tiket) return false;
  tiket.status = status;
  saveTiket(semua);
  return true;
}

function selesaikanTiket(nomor: string): boolean {
  return ubahStatusTiket(nomor, "selesai");
}

function lewatiTiket(nomor: string): boolean {
  return ubahStatusTiket(nomor, "dilewati");
}
