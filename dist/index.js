"use strict";
(() => {
    const LOGIN_PAGE = "login.html";
    // auth guard & role guard
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token || (role !== "admin" && role !== "moderator")) {
        window.location.replace(LOGIN_PAGE);
        return;
    }
    const namaUser = document.getElementById("nama-user");
    const roleUser = document.getElementById("role-user");
    const btnLogout = document.getElementById("btn-logout");
    const btnReset = document.getElementById("btn-reset");
    const formJenis = document.getElementById("form-jenis");
    const inputKode = document.getElementById("input-kode");
    const inputNama = document.getElementById("input-nama");
    const pesanJenis = document.getElementById("pesan-jenis");
    const listJenis = document.getElementById("list-jenis");
    const formTiket = document.getElementById("form-tiket");
    const selectJenis = document.getElementById("select-jenis");
    const selectPrioritas = document.getElementById("select-prioritas");
    const pesanTiket = document.getElementById("pesan-tiket");
    const listTiket = document.getElementById("list-tiket");
    function tampilPesan(el, teks, isError = true) {
        el.textContent = teks;
        el.className = isError ? "pesan error" : "pesan sukses";
        el.hidden = teks === "";
    }
    namaUser.textContent = localStorage.getItem("firstName") ?? "Admin";
    roleUser.textContent = role;
    btnLogout.addEventListener("click", () => {
        // yang dihapus hanya data sesi, data antrian tetap
        ["token", "role", "firstName", "username"].forEach((key) => localStorage.removeItem(key));
        window.location.replace(LOGIN_PAGE);
    });
    btnReset.addEventListener("click", () => {
        if (!confirm("Reset antrian? Semua tiket akan dihapus dan nomor dimulai lagi dari 001."))
            return;
        saveTiket([]);
        saveNomorTerakhir({});
        tampilPesan(pesanTiket, "Antrian berhasil direset.", false);
        render();
    });
    inputKode.addEventListener("input", () => {
        inputKode.value = inputKode.value.toUpperCase();
    });
    formJenis.addEventListener("submit", (e) => {
        e.preventDefault();
        const kode = inputKode.value.trim().toUpperCase();
        const nama = inputNama.value.trim().toUpperCase();
        if (!/^[A-Z]$/.test(kode)) {
            tampilPesan(pesanJenis, "Kode harus 1 huruf kapital (A-Z).");
            return;
        }
        if (!/^[A-Z0-9 -]{2,30}$/.test(nama)) {
            tampilPesan(pesanJenis, "Nama layanan 2-30 karakter (huruf, angka, spasi, atau -).");
            return;
        }
        const jenis = getJenis();
        if (jenis.some((j) => j.kode.toUpperCase() === kode)) {
            tampilPesan(pesanJenis, `Kode ${kode} sudah dipakai.`);
            return;
        }
        if (jenis.some((j) => j.nama.toLowerCase() === nama.toLowerCase())) {
            tampilPesan(pesanJenis, `Nama ${nama} sudah dipakai.`);
            return;
        }
        jenis.push({ kode, nama, aktif: true });
        saveJenis(jenis);
        formJenis.reset();
        tampilPesan(pesanJenis, `Jenis antrian ${nama} berhasil ditambahkan.`, false);
        render();
    });
    function renderJenis() {
        const jenis = getJenis();
        if (jenis.length === 0) {
            listJenis.innerHTML = `<p class="kosong">Belum ada jenis antrian.</p>`;
            return;
        }
        listJenis.innerHTML = jenis
            .map((j) => {
            const jumlahMenunggu = getAntrianMenunggu(j.kode).length;
            return `
          <div class="item-jenis ${j.aktif ? "" : "nonaktif"}">
            <div>
              <b>${j.nama}</b> <span class="kode">(${j.kode})</span>
              <small>${jumlahMenunggu} menunggu${j.aktif ? "" : " - nonaktif"}</small>
            </div>
            <div class="aksi">
              <button class="btn-kecil" data-aksi="toggle" data-kode="${j.kode}">
                ${j.aktif ? "Nonaktifkan" : "Aktifkan"}
              </button>
              <button class="btn-kecil merah" data-aksi="hapus" data-kode="${j.kode}">Hapus</button>
            </div>
          </div>`;
        })
            .join("");
    }
    listJenis.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn)
            return;
        const kode = btn.dataset.kode ?? "";
        const jenis = getJenis();
        if (btn.dataset.aksi === "toggle") {
            saveJenis(jenis.map((j) => (j.kode === kode ? { ...j, aktif: !j.aktif } : j)));
        }
        if (btn.dataset.aksi === "hapus") {
            if (!confirm(`Hapus jenis antrian ${kode}? Tiket dengan kode ini juga ikut terhapus.`))
                return;
            saveJenis(jenis.filter((j) => j.kode !== kode));
            saveTiket(getTiket().filter((t) => t.kode !== kode));
            const nomor = getNomorTerakhir();
            delete nomor[kode];
            saveNomorTerakhir(nomor);
        }
        render();
    });
    function renderPilihanJenis() {
        const dipilih = selectJenis.value;
        const jenisAktif = getJenis().filter((j) => j.aktif);
        selectJenis.innerHTML =
            `<option value="">Pilih jenis antrian</option>` +
                jenisAktif.map((j) => `<option value="${j.kode}">${j.nama} (${j.kode})</option>`).join("");
        if (jenisAktif.some((j) => j.kode === dipilih)) {
            selectJenis.value = dipilih;
        }
    }
    formTiket.addEventListener("submit", (e) => {
        e.preventDefault();
        const kode = selectJenis.value;
        const prioritas = selectPrioritas.value;
        const jenis = getJenis().find((j) => j.kode === kode);
        if (!jenis || !jenis.aktif) {
            tampilPesan(pesanTiket, "Pilih jenis antrian yang aktif terlebih dahulu.");
            return;
        }
        const tiket = buatTiket(kode, prioritas);
        tampilPesan(pesanTiket, `Tiket ${tiket.nomor} (${prioritas}) berhasil diterbitkan.`, false);
        render();
    });
    function barisTiket(t) {
        const tombol = t.status === "dipanggil"
            ? `<button class="btn-link hijau" data-aksi="selesai" data-nomor="${t.nomor}">Selesai</button>`
            : `<button class="btn-link" data-aksi="panggil" data-nomor="${t.nomor}">Panggil</button>
           <button class="btn-link merah" data-aksi="lewati" data-nomor="${t.nomor}">Lewati</button>`;
        return `
      <div class="tiket ${t.status}">
        <div>
          <b>${t.nomor}</b>
          <span class="label">${t.prioritas}</span>
          <span class="label">${t.status === "dipanggil" ? "Dipanggil" : "Menunggu"}</span>
        </div>
        <div class="aksi">${tombol}</div>
      </div>`;
    }
    function renderTiket() {
        const jenis = getJenis();
        const tiket = getTiket();
        if (jenis.length === 0) {
            listTiket.innerHTML = `<p class="kosong">Tambahkan jenis antrian terlebih dahulu.</p>`;
            return;
        }
        listTiket.innerHTML = jenis
            .map((j) => {
            const dipanggil = tiket.filter((t) => t.kode === j.kode && t.status === "dipanggil");
            const daftar = [...dipanggil, ...getAntrianMenunggu(j.kode)];
            const isi = daftar.length === 0
                ? `<p class="kosong">Belum ada tiket.</p>`
                : daftar.map(barisTiket).join("");
            return `<div class="grup"><h3>${j.nama}</h3>${isi}</div>`;
        })
            .join("");
    }
    listTiket.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn)
            return;
        const tiket = getTiket();
        const target = tiket.find((t) => t.nomor === btn.dataset.nomor);
        if (!target)
            return;
        switch (btn.dataset.aksi) {
            case "panggil":
                // tiket yang sedang dipanggil di layanan yang sama jadi selesai
                tiket.forEach((t) => {
                    if (t.kode === target.kode && t.status === "dipanggil")
                        t.status = "selesai";
                });
                target.status = "dipanggil";
                break;
            case "lewati":
                target.status = "dilewati";
                break;
            case "selesai":
                target.status = "selesai";
                break;
        }
        saveTiket(tiket);
        render();
    });
    let dataTerakhir = "";
    function ambilSnapshot() {
        return (localStorage.getItem(KEY_JENIS) ?? "") + (localStorage.getItem(KEY_TIKET) ?? "");
    }
    function render() {
        renderJenis();
        renderPilihanJenis();
        renderTiket();
        dataTerakhir = ambilSnapshot();
    }
    // cek tiap 3 detik supaya tiket dari halaman ambil-antrian langsung muncul
    setInterval(() => {
        if (ambilSnapshot() !== dataTerakhir)
            render();
    }, 3000);
    render();
})();
