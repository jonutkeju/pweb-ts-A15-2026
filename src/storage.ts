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

function getJenis(): JenisAntrian[] {
  try {
    return JSON.parse(localStorage.getItem(KEY_JENIS) ?? "[]") as JenisAntrian[];
  } catch {
    return [];
  }
}

function saveJenis(data: JenisAntrian[]): void {
  localStorage.setItem(KEY_JENIS, JSON.stringify(data));
}

function getTiket(): Tiket[] {
  try {
    return JSON.parse(localStorage.getItem(KEY_TIKET) ?? "[]") as Tiket[];
  } catch {
    return [];
  }
}

function saveTiket(data: Tiket[]): void {
  localStorage.setItem(KEY_TIKET, JSON.stringify(data));
}

function getNomorTerakhir(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY_NOMOR) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

function saveNomorTerakhir(data: Record<string, number>): void {
  localStorage.setItem(KEY_NOMOR, JSON.stringify(data));
}

function buatTiket(kode: string, prioritas: Prioritas): Tiket {
  const nomorTerakhir = getNomorTerakhir();
  const nomorBaru = (nomorTerakhir[kode] ?? 0) + 1;
  nomorTerakhir[kode] = nomorBaru;
  saveNomorTerakhir(nomorTerakhir);

  const tiket: Tiket = {
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
function getAntrianMenunggu(kode: string): Tiket[] {
  return getTiket()
    .filter((t) => t.kode === kode && t.status === "menunggu")
    .sort((a, b) => {
      const selisih = BOBOT_PRIORITAS[b.prioritas] - BOBOT_PRIORITAS[a.prioritas];
      if (selisih !== 0) return selisih;
      return a.waktu - b.waktu;
    });
}
