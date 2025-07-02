import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://cqtxsyzuvlucxfbyxyhp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxdHhzeXp1dmx1Y3hmYnl4eWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyODk1MjQsImV4cCI6MjA2Mzg2NTUyNH0.zCC23y3KGvkjAqGFCopteAk5QV4JXkLeSonIjmFK1AM";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CURRENT_VERSION = "4.0";
const LAST_SEEN_VERSION_KEY = "lastSeenUpdateVersion";

const formLogin = document.getElementById("form-login");
const updateModal = document.getElementById("update-modal");
const updateVersionSpan = document.getElementById("update-version");
const btnCloseModal = document.getElementById("btn-close-modal");
const btnViewUpdates = document.getElementById("btn-view-updates");

function showUpdateModal() {
  updateVersionSpan.textContent = `v${CURRENT_VERSION}`;
  updateModal.style.display = "flex";
}

function hideUpdateModal() {
  updateModal.style.display = "none";
  localStorage.setItem(LAST_SEEN_VERSION_KEY, CURRENT_VERSION);
}

// Check if the update modal should be shown on page load
document.addEventListener("DOMContentLoaded", () => {
  const lastSeenVersion = localStorage.getItem(LAST_SEEN_VERSION_KEY);
  if (lastSeenVersion !== CURRENT_VERSION) {
    showUpdateModal();
  }
});

btnCloseModal.addEventListener("click", hideUpdateModal);

btnViewUpdates.addEventListener("click", () => {
  window.location.href = "updates.html";
});

formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) {
    alert("Erro no login: " + error.message);
  } else {
    // Login bem-sucedido, redireciona para a página principal
    window.location.href = "painel.html";
  }
});
