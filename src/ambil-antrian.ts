(() => {
  const LOGIN_PAGE = "login.html";
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  if (!token || !role) {
    window.location.replace(LOGIN_PAGE);
    return;
  }

  const serviceList = document.getElementById("service-list") as HTMLDivElement;
  const empty = document.getElementById("service-empty") as HTMLParagraphElement;
  const receipt = document.getElementById("ticket-receipt") as HTMLElement;
  const receiptNumber = document.getElementById("receipt-number") as HTMLElement;
  const receiptDescription = document.getElementById("receipt-description") as HTMLParagraphElement;
  let lastSnapshot = "";

  document.getElementById("nama-user")!.textContent = localStorage.getItem("firstName") ?? "Pengunjung";
  document.getElementById("role-user")!.textContent = role;
  if (role !== "admin" && role !== "moderator") {
    document.querySelectorAll<HTMLElement>("[data-admin-only]").forEach((link) => link.hidden = true);
  }

  function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
      return entities[character];
    });
  }

  function render(): void {
    const services = getJenis().filter((service) => service.aktif);
    empty.hidden = services.length > 0;
    serviceList.innerHTML = services.map((service) => `
      <article class="service-card self-service-card">
        <div class="service-card-head">
          <div><p class="eyebrow">KODE ${escapeHtml(service.kode)}</p><h2>${escapeHtml(service.nama)}</h2></div>
          <span class="queue-count">${getJumlahMenunggu(service.kode)} menunggu</span>
        </div>
        <button class="button button-primary take-button" type="button" data-kode="${escapeHtml(service.kode)}" data-prioritas="Normal">Ambil nomor · Normal</button>
        <details class="priority-options">
          <summary>Pilih prioritas lain</summary>
          <div class="priority-buttons">
            <button class="button button-quiet" type="button" data-kode="${escapeHtml(service.kode)}" data-prioritas="Lansia">Lansia</button>
            <button class="button button-quiet" type="button" data-kode="${escapeHtml(service.kode)}" data-prioritas="Disabilitas">Disabilitas</button>
            <button class="button button-quiet" type="button" data-kode="${escapeHtml(service.kode)}" data-prioritas="VIP">VIP</button>
          </div>
        </details>
      </article>`).join("");
    lastSnapshot = getQueueSnapshot();
  }

  function refreshIfChanged(): void {
    if (getQueueSnapshot() !== lastSnapshot) render();
  }

  serviceList.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-kode]");
    if (!button) return;
    try {
      const ticket = buatTiket(button.dataset.kode ?? "", button.dataset.prioritas as Prioritas);
      const service = getJenis().find((item) => item.kode === ticket.kode);
      receiptNumber.textContent = ticket.nomor;
      receiptDescription.textContent = `${service?.nama ?? "Layanan"} · Prioritas ${ticket.prioritas}`;
      receipt.hidden = false;
      receipt.scrollIntoView({ behavior: "smooth", block: "nearest" });
      render();
    } catch (error) {
      receipt.hidden = false;
      receiptNumber.textContent = "Belum berhasil";
      receiptDescription.textContent = error instanceof Error ? error.message : "Tiket gagal dibuat. Silakan coba kembali.";
    }
  });

  document.getElementById("btn-logout")!.addEventListener("click", () => {
    ["token", "role", "firstName", "username"].forEach((key) => localStorage.removeItem(key));
    window.location.replace(LOGIN_PAGE);
  });

  window.addEventListener("storage", refreshIfChanged);
  window.setInterval(refreshIfChanged, 2500);
  render();
})();