"use strict";
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
 *   user              -> ambil-antrian.html
 *
 * Seluruh kode dibungkus IIFE agar tidak bentrok nama variabel global
 * dengan file .ts halaman lain (script dimuat tanpa type="module").
 */
(() => {
    const LOGIN_API = "https://dummyjson.com/auth/login";
    const LOGIN_TIMEOUT_MS = 12000;
    const ADMIN_PAGE = "index.html";
    const USER_PAGE = "ambil-antrian.html";
    const form = document.getElementById("login-form");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const submitBtn = document.getElementById("submit-btn");
    const btnText = document.getElementById("btn-text");
    const spinner = document.getElementById("spinner");
    const errorBox = document.getElementById("error-box");
    const togglePw = document.getElementById("toggle-pw");
    function normalizeRole(raw) {
        const r = (raw ?? "").toLowerCase();
        if (r === "admin" || r === "moderator")
            return r;
        return "user";
    }
    function redirectByRole(role) {
        window.location.replace(role === "user" ? USER_PAGE : ADMIN_PAGE);
    }
    function setLoading(isLoading) {
        submitBtn.disabled = isLoading;
        usernameInput.disabled = isLoading;
        passwordInput.disabled = isLoading;
        spinner.hidden = !isLoading;
        btnText.textContent = isLoading ? "Memverifikasi..." : "Masuk";
    }
    function showError(message) {
        errorBox.textContent = message;
        errorBox.hidden = false;
    }
    function clearError() {
        errorBox.textContent = "";
        errorBox.hidden = true;
    }
    function saveSession(data, role) {
        try {
            localStorage.setItem("token", data.accessToken ?? data.token ?? "");
            localStorage.setItem("role", role);
            localStorage.setItem("firstName", data.firstName ?? data.username ?? "Pengguna");
            localStorage.setItem("username", data.username ?? "");
        }
        catch {
            try {
                ["token", "role", "firstName", "username"].forEach((key) => localStorage.removeItem(key));
            }
            catch {
            }
            throw new Error("Login berhasil, tetapi sesi tidak dapat disimpan di browser.");
        }
    }
    async function handleLogin(event) {
        event.preventDefault();
        clearError();
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        if (!username || !password) {
            showError("Username dan password wajib diisi.");
            return;
        }
        if (!navigator.onLine) {
            showError("Tidak ada koneksi internet. Periksa jaringan lalu coba lagi.");
            return;
        }
        setLoading(true);
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);
        try {
            const response = await fetch(LOGIN_API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
                signal: controller.signal,
            });
            let data;
            try {
                const payload = await response.json();
                if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
                    showError("Server mengirim respons yang tidak valid. Silakan coba lagi.");
                    return;
                }
                data = payload;
            }
            catch {
                showError("Server mengirim respons yang tidak valid. Silakan coba lagi.");
                return;
            }
            if (!response.ok) {
                showError(response.status === 400
                    ? "Username atau password salah."
                    : data.message ?? "Login gagal. Silakan coba lagi.");
                return;
            }
            if (!(data.accessToken ?? data.token)) {
                showError("Respons server tidak valid: token tidak ditemukan.");
                return;
            }
            const role = normalizeRole(data.role);
            saveSession(data, role);
            redirectByRole(role);
        }
        catch (error) {
            console.error("Login error:", error);
            if (controller.signal.aborted) {
                showError("Koneksi terlalu lambat. Periksa jaringan lalu coba lagi.");
            }
            else if (error instanceof Error && error.message.startsWith("Login berhasil, tetapi sesi")) {
                showError(error.message);
            }
            else if (!navigator.onLine) {
                showError("Koneksi terputus. Periksa jaringan lalu coba lagi.");
            }
            else {
                showError("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.");
            }
        }
        finally {
            window.clearTimeout(timeoutId);
            setLoading(false);
        }
    }
    function setupPasswordToggle() {
        togglePw.addEventListener("click", () => {
            const show = passwordInput.type === "password";
            passwordInput.type = show ? "text" : "password";
            togglePw.textContent = show ? "Sembunyikan" : "Tampilkan";
            togglePw.setAttribute("aria-pressed", String(show));
        });
    }
    function init() {
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
