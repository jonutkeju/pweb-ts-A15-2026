(() => {
  const LOGIN_PAGE = "login.html";
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  if (!token || (role !== "admin" && role !== "moderator")) {
    window.location.replace(LOGIN_PAGE);
    return;
  }

  const panel = document.getElementById("panel-operator") as HTMLDivElement;
  const empty = document.getElementById("operator-kosong") as HTMLParagraphElement;
  const summary = document.getElementById("ringkasan") as HTMLSpanElement;
  const updatedAt = document.getElementById("waktu-update") as HTMLTimeElement;
  const soundButton = document.getElementById("btn-suara") as HTMLButtonElement;
  const logoutButton = document.getElementById("btn-logout") as HTMLButtonElement;
  const soundKey = "suaraPanggilan";
  let soundEnabled = localStorage.getItem(soundKey) !== "false";
  let lastSnapshot = "";

  document.getElementById("nama-user")!.textContent = localStorage.getItem("firstName") ?? "Admin";
  document.getElementById("role-user")!.textContent = role;

  function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
      return entities[character];
    });
  }

  function updateSoundButton(): void {
    soundButton.textContent = `Suara panggilan: ${soundEnabled ? "aktif" : "nonaktif"}`;
    soundButton.setAttribute("aria-pressed", String(soundEnabled));
  }

  function announce(ticket: Tiket): void {
    if (!soundEnabled || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const announcement = new SpeechSynthesisUtterance(`Nomor antrian ${ticket.nomor}, silakan menuju ${getJenis().find((jenis) => jenis.kode === ticket.kode)?.nama ?? "loket"}.`);
    announcement.lang = "id-ID";
    announcement.rate = 0.9;
    window.speechSynthesis.speak(announcement);
  }

  function render(): void {
    const jenis = getJenis();
    const tickets = getTiket();
    empty.hidden = jenis.length > 0;
    panel.innerHTML = jenis.map((service) => {
      const current = getTiketDipanggil(service.kode);
      const next = getTiketBerikutnya(service.kode);
      const waiting = getJumlahMenunggu(service.kode);
      const serviceName = escapeHtml(service.nama);
      const serviceCode = escapeHtml(service.kode);
      const currentNumber = current ? escapeHtml(current.nomor) : "-";
      const nextNumber = next ? escapeHtml(next.nomor) : "-";
      return `
        <article class="operator-card" data-kode="${serviceCode}">
          <div class="service-card-head">
            <div><p class="eyebrow">LAYANAN ${serviceCode}</p><h2>${serviceName}</h2></div>
            <span class="queue-count">${waiting} menunggu</span>
          </div>
          <div class="ticket-pair">
            <div class="ticket-slot current-slot">
              <span class="slot-label">SEDANG DIPANGGIL</span>
              <strong>${currentNumber}</strong>
              ${current ? `<span class="priority-pill">${escapeHtml(current.prioritas)}</span>` : `<span class="slot-empty">Belum ada panggilan</span>`}
            </div>
            <div class="ticket-slot next-slot">
              <span class="slot-label">BERIKUTNYA</span>
              <strong>${nextNumber}</strong>
              ${next ? `<span class="priority-pill">Prioritas ${escapeHtml(next.prioritas)}</span>` : `<span class="slot-empty">Antrean kosong</span>`}
            </div>
          </div>
          <div class="operator-actions">
            <button class="button button-primary" type="button" data-action="call" data-kode="${serviceCode}" ${next ? "" : "disabled"}>Panggil berikutnya</button>
            <button class="button button-quiet" type="button" data-action="done" data-nomor="${current ? escapeHtml(current.nomor) : ""}" ${current ? "" : "disabled"}>Selesai</button>
            <button class="button button-danger" type="button" data-action="skip" data-nomor="${current ? escapeHtml(current.nomor) : ""}" ${current ? "" : "disabled"}>Lewati</button>
          </div>
          ${service.aktif ? "" : `<p class="service-note">Layanan nonaktif, tiket yang tersisa tetap dapat diproses.</p>`}
        </article>`;
    }).join("");

    const waitingTotal = tickets.filter((ticket) => ticket.status === "menunggu").length;
    summary.textContent = `${jenis.length} layanan · ${waitingTotal} tiket menunggu`;
    updatedAt.textContent = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date());
    lastSnapshot = getQueueSnapshot();
  }

  function refreshIfChanged(): void {
    if (getQueueSnapshot() !== lastSnapshot) render();
  }

  panel.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "call") {
      const called = panggilBerikutnya(button.dataset.kode ?? "");
      if (called) announce(called);
    } else if (action === "done") {
      selesaikanTiket(button.dataset.nomor ?? "");
    } else if (action === "skip") {
      lewatiTiket(button.dataset.nomor ?? "");
    }
    render();
  });

  soundButton.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem(soundKey, String(soundEnabled));
    updateSoundButton();
  });

  logoutButton.addEventListener("click", () => {
    ["token", "role", "firstName", "username"].forEach((key) => localStorage.removeItem(key));
    window.location.replace(LOGIN_PAGE);
  });

  window.addEventListener("storage", refreshIfChanged);
  window.setInterval(refreshIfChanged, 2500);
  updateSoundButton();
  render();
})();