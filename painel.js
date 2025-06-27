import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    // Se não estiver logado, redireciona para login
    window.location.href = "login.html";
  }
});
