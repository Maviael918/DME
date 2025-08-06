import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://cqtxsyzuvlucxfbyxyhp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxdHhzeXp1dmx1Y3hmYnl4eWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyODk1MjQsImV4cCI6MjA2Mzg2NTUyNH0.zCC23y3KGvkjAqGFCopteAk5QV4JXkLeSonIjmFK1AM";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CURRENT_VERSION = "4.0";


const formLogin = document.getElementById("form-login");


// Check if the update modal should be shown on page load




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
