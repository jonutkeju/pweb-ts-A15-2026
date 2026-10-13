"use strict";
(() => {
    const LOGIN_PAGE = "login.html";
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token || !role) {
        window.location.replace(LOGIN_PAGE);
        return;
    }
    const screenList = document.getElementById("screen-list");
    const empty = document.getElementById("screen-empty");
    const updatedAt = document.getElementById("screen-updated");
    const fullscreenButton = document.getElementById("btn-fullscreen");
    let lastSnapshot = "";
    document.getElementById("nama-user").textContent = localStorage.getItem("firstName") ?? "Pengunjung";
    document.getElementById("role-user").textContent = role;
    if (role !== "admin" && role !== "moderator") {
        document.querySelectorAll("[data-admin-only]").forEach((link) => link.hidden = true);
    }
    function escapeHtml(value) {
        return value.replace(/[&<>"']/g, (character) => {
            const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
            return entities[character];
        });
    }
    function render() {
        const services = getJenis().filter((service) => service.aktif);
        empty.hidden = services.length > 0;
        screenList.innerHTML = services.map((service) => {
            const current = getTiketDipanggil(service.kode);
            const waiting = getJumlahMenunggu(service.kode);
            return `
        <article class="screen-card ${current ? "is-calling" : ""}">
          <div class="screen-card-head">
            <div><p class="eyebrow">LAYANAN ${escapeHtml(service.kode)}</p><h2>${escapeHtml(service.nama)}</h2></div>
            <span class="screen-status ${current ? "status-calling" : ""}">${current ? "DIPANGGIL" : "SIAP"}</span>
          </div>
          <div class="screen-number" aria-label="Nomor yang sedang dipanggil">${current ? escapeHtml(current.nomor) : "—"}</div>
          <p class="screen-message">${current ? `Prioritas ${escapeHtml(current.prioritas)} · Silakan menuju loket` : "Belum ada nomor dipanggil"}</p>
          <div class="screen-waiting"><span>Antrean menunggu</span><strong>${waiting}</strong></div>
        </article>`;
        }).join("");
        updatedAt.textContent = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date());
        lastSnapshot = getQueueSnapshot();
    }
    function refreshIfChanged() {
        if (getQueueSnapshot() !== lastSnapshot)
            render();
    }
    function syncFullscreenButton() {
        const isFullscreen = Boolean(document.fullscreenElement);
        fullscreenButton.textContent = isFullscreen ? "Keluar layar penuh" : "Layar penuh";
        fullscreenButton.setAttribute("aria-pressed", String(isFullscreen));
    }
    fullscreenButton.addEventListener("click", async () => {
        try {
            if (document.fullscreenElement)
                await document.exitFullscreen();
            else
                await document.documentElement.requestFullscreen();
            syncFullscreenButton();
        }
        catch (error) {
            console.error("Fullscreen tidak dapat diaktifkan:", error);
        }
    });
    document.addEventListener("fullscreenchange", syncFullscreenButton);
    syncFullscreenButton();
    document.getElementById("btn-logout").addEventListener("click", () => {
        ["token", "role", "firstName", "username"].forEach((key) => localStorage.removeItem(key));
        window.location.replace(LOGIN_PAGE);
    });
    window.addEventListener("storage", refreshIfChanged);
    window.setInterval(refreshIfChanged, 2500);
    render();
})();
