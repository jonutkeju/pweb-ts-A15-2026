/**
 * login.ts - Halaman Login (login.html)
 *
 * Kontrak Local Storage (dipakai semua halaman):
 *   "token"     -> accessToken dari dummyjson
 *   "role"      -> "admin" | "moderator" | "user"  (moderator = hak akses admin)
 *   "firstName" -> nama depan pengguna
 *   "username"  -> username pengguna
 *
 * Redirect:
 *   admin / moderator -> index.html
 *   user              -> operator.html
 *
 * Seluruh kode dibungkus IIFE agar tidak bentrok nama variabel global
 * dengan file .ts halaman lain (script dimuat tanpa type="module").
 */
(() => {
  type Role = "admin" | "moderator" | "user";

  interface LoginResponse {
    accessToken?: string;
    token?: string;
    username?: string;
    firstName?: string;
    role?: string;
    message?: string;
  }

  const LOGIN_API = "https://dummyjson.com/auth/login";
  const ADMIN_PAGE = "index.html";
  const USER_PAGE = "operator.html";

  const form = document.getElementById("login-form") as HTMLFormElement;
  const usernameInput = document.getElementById("username") as HTMLInputElement;
  const passwordInput = document.getElementById("password") as HTMLInputElement;
  const submitBtn = document.getElementById("submit-btn") as HTMLButtonElement;
  const btnText = document.getElementById("btn-text") as HTMLSpanElement;
  const spinner = document.getElementById("spinner") as HTMLSpanElement;
  const errorBox = document.getElementById("error-box") as HTMLDivElement;
  const togglePw = document.getElementById("toggle-pw") as HTMLButtonElement;

  function normalizeRole(raw: string | undefined): Role {
    const r = (raw ?? "").toLowerCase();
    if (r === "admin" || r === "moderator") return r;
    return "user";
  }

  function redirectByRole(role: Role): void {
    window.location.replace(role === "user" ? USER_PAGE : ADMIN_PAGE);
  }

  function setLoading(isLoading: boolean): void {
    submitBtn.disabled = isLoading;
    usernameInput.disabled = isLoading;
    passwordInput.disabled = isLoading;
    spinner.hidden = !isLoading;
    btnText.textContent = isLoading ? "Memverifikasi..." : "Masuk";
  }

  function showError(message: string): void {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function clearError(): void {
    errorBox.textContent = "";
    errorBox.hidden = true;
  }

  function saveSession(data: LoginResponse, role: Role): void {
    localStorage.setItem("token", data.accessToken ?? data.token ?? "");
    localStorage.setItem("role", role);
    localStorage.setItem("firstName", data.firstName ?? data.username ?? "Pengguna");
    localStorage.setItem("username", data.username ?? "");
  }

  async function handleLogin(event: Event): Promise<void> {
    event.preventDefault();
    clearError();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      showError("Username dan password wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(LOGIN_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data: LoginResponse = await response.json();

      if (!response.ok) {
        showError(
          response.status === 400
            ? "Username atau password salah."
            : data.message ?? "Login gagal. Silakan coba lagi."
        );
        return;
      }

      if (!(data.accessToken ?? data.token)) {
        showError("Respons server tidak valid: token tidak ditemukan.");
        return;
      }

      const role = normalizeRole(data.role);
      saveSession(data, role);
      redirectByRole(role);
    } catch (error) {
      console.error("Login error:", error);
      showError("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.");
    } finally {
      setLoading(false);
    }
  }

  function setupPasswordToggle(): void {
    togglePw.addEventListener("click", () => {
      const show = passwordInput.type === "password";
      passwordInput.type = show ? "text" : "password";
      togglePw.textContent = show ? "Sembunyikan" : "Tampilkan";
      togglePw.setAttribute("aria-pressed", String(show));
    });
  }

  function init(): void {
    // Jika sudah login, langsung arahkan sesuai role.
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (token && role) {
      redirectByRole(normalizeRole(role));
      return;
    }

    form.addEventListener("submit", handleLogin);
    setupPasswordToggle();
    usernameInput.addEventListener("input", clearError);
    passwordInput.addEventListener("input", clearError);
  }

  init();
})();
