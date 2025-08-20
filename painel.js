import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    // Se não estiver logado, redireciona para login
    window.location.href = "login.html";
  }

  function updateDateTime() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    const dateTimeString = now.toLocaleDateString('pt-BR', options);
    document.getElementById('current-datetime').textContent = dateTimeString;
  }

  updateDateTime();
  setInterval(updateDateTime, 1000);
});