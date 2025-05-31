// Aguarda o DOM carregar
document.addEventListener("DOMContentLoaded", () => {
  const btnEngrenagem = document.getElementById("btn-config");
  const painelConfig = document.getElementById("painel-config");
  const temaToggle = document.getElementById("tema-toggle");

  // Alternar visibilidade do painel de configurações
  btnEngrenagem.addEventListener("click", () => {
    painelConfig.classList.toggle("visivel");
  });

  // Alternar entre tema claro e escuro
  temaToggle.addEventListener("change", () => {
    if (temaToggle.checked) {
      document.body.classList.add("dark");
      localStorage.setItem("tema", "escuro");
    } else {
      document.body.classList.remove("dark");
      localStorage.setItem("tema", "claro");
    }
  });

  // Carrega a preferência do tema do localStorage ao iniciar
  const temaSalvo = localStorage.getItem("tema");
  if (temaSalvo === "escuro") {
    document.body.classList.add("dark");
    temaToggle.checked = true;
  }
});
