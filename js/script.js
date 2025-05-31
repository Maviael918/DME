import { supabase } from './supabaseClient.js';

// Constantes
const COLABORADORES_FIXOS = ["Maviael", "Raminho", "Bruninho", "Matheus", "isaac"];
const DIAS_PADRAO_FILTRO = 7;
const LIMITE_HISTORICO = 20;
const DIAS_RANKING_COMPLETO = 365; // 1 ano de histórico para o ranking

// Estado global
let estado = {
  historico: [],
  historicoFiltrado: [],
  historicoRanking: [], // Histórico completo para cálculo do ranking
  contagemSaidas: {},
  carregando: false
};

// Elementos DOM
const elementos = {
  form: document.getElementById("form-saida"),
  botoesColaboradores: document.querySelectorAll(".botao-colaborador"),
  inputColaboradoresSelecionados: document.getElementById("colaboradoresSelecionados"),
  selectLocalidade: document.getElementById("localidade"),
  listaHistorico: document.getElementById("lista-historico"),
  proximoColaborador: document.getElementById("proximo-colaborador"),
  btnPdf: document.getElementById("baixar-pdf"),
  dataInicio: document.getElementById("data-inicio"),
  dataFim: document.getElementById("data-fim"),
  listaRanking: document.getElementById("lista-ranking"),
  btnAtualizarRanking: document.getElementById("atualizar-ranking")
};

// Funções auxiliares
async function verificarAutenticacao() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      window.location.href = "login.html";
      return false;
    }
    return true;
  } catch (error) {
    console.error("Erro na verificação de autenticação:", error);
    window.location.href = "login.html";
    return false;
  }
}

async function atualizarEstadoBotao(botao, estado) {
  const originalText = botao.textContent;
  botao.disabled = estado === 'carregando';
  botao.textContent = estado === 'carregando' ? "Salvando..." : originalText;
}

function formatarData(data) {
  return new Date(data).toLocaleDateString("pt-BR");
}

function formatarHora(data) {
  return new Date(data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function mostrarAlertaSalvo() {
  const alerta = document.createElement('div');
  alerta.className = 'alerta-salvo';
  
  alerta.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path class="checkmark" fill="none" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
    </svg>
    <div class="texto">Salvo!</div>
  `;
  
  document.body.appendChild(alerta);
  
  setTimeout(() => {
    alerta.classList.add('fade-out');
    setTimeout(() => alerta.remove(), 600);
  }, 2500);
}

// Função para calcular a contagem de saídas considerando grupos
function calcularContagemSaidas() {
  const contagem = {};
  
  // Inicializa contagem para todos os colaboradores
  COLABORADORES_FIXOS.forEach(nome => {
    contagem[nome] = 0;
  });

  // Processa TODOS os registros para o ranking
  estado.historicoRanking.forEach(registro => {
    if (registro.nomes) {
      // Divide os nomes e conta cada um individualmente
      const nomes = registro.nomes.split(',')
                        .map(n => n.trim())
                        .filter(n => COLABORADORES_FIXOS.includes(n));
      
      nomes.forEach(nome => {
        contagem[nome]++;
      });
    }
  });

  estado.contagemSaidas = contagem;
}

function determinarProximoColaborador() {
  // Encontra o colaborador com menos saídas
  let menorContagem = Infinity;
  let candidatos = [];
  
  for (const nome in estado.contagemSaidas) {
    if (estado.contagemSaidas[nome] < menorContagem) {
      menorContagem = estado.contagemSaidas[nome];
      candidatos = [nome];
    } else if (estado.contagemSaidas[nome] === menorContagem) {
      candidatos.push(nome);
    }
  }

  // Se houver empate, escolhe aleatoriamente entre os candidatos
  return candidatos.length > 0 
    ? candidatos[Math.floor(Math.random() * candidatos.length)] 
    : "Todos têm a mesma quantidade de saídas";
}

function atualizarRanking() {
  elementos.listaRanking.innerHTML = "";
  
  // Converte para array, filtra e ordena
  const ranking = Object.entries(estado.contagemSaidas)
    .sort((a, b) => b[1] - a[1]);

  // Cabeçalho
  const header = document.createElement("li");
  header.innerHTML = `<span class="nome-colab">Colaborador</span><span class="total-saidas">Total</span>`;
  header.classList.add("cabecalho-ranking");
  elementos.listaRanking.appendChild(header);

  // Itens do ranking
  ranking.forEach(([nome, total]) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <span class="nome-colab">${nome}</span>
      <span class="total-saidas">${total}</span>
    `;
    
    // Destaque para quem tem menos saídas (próximos candidatos)
    if (total === Math.min(...Object.values(estado.contagemSaidas))) {
      item.classList.add("proximo-candidato");
    }
    
    elementos.listaRanking.appendChild(item);
  });
}

// Função principal para carregar dados - ATUALIZADA
async function carregarDados() {
  try {
    estado.carregando = true;
    
    // 1. Carrega TODOS os registros históricos sem filtro de data
    const { data: historicoCompleto, error: historicoError } = await supabase
      .from("historico")
      .select("*")
      .order("data", { ascending: false });

    if (historicoError) throw historicoError;

    // 2. Carrega os últimos registros para exibição na interface
    const { data: historicoRecente, error: recenteError } = await supabase
      .from("historico")
      .select("*")
      .order("data", { ascending: false })
      .limit(LIMITE_HISTORICO);

    if (recenteError) throw recenteError;

    // Atualiza o estado
    estado.historico = historicoRecente || [];
    estado.historicoRanking = historicoCompleto || []; // Usa todo o histórico para o ranking
    
    calcularContagemSaidas();
    atualizarUI();

  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    alert("Erro ao carregar o histórico completo.");
    throw error;
  } finally {
    estado.carregando = false;
  }
}
function atualizarUI() {
  atualizarHistorico();
  atualizarProximoColaborador();
  atualizarRanking();
}

function atualizarProximoColaborador() {
  elementos.proximoColaborador.textContent = determinarProximoColaborador();
}

function atualizarHistorico() {
  elementos.listaHistorico.innerHTML = "";
  estado.historicoFiltrado = [];

  const inicio = elementos.dataInicio.value 
    ? new Date(elementos.dataInicio.value) 
    : new Date(Date.now() - DIAS_PADRAO_FILTRO * 86400000);
  
  const fim = elementos.dataFim.value 
    ? new Date(elementos.dataFim.value + "T23:59:59") 
    : new Date();

  const filtrados = estado.historico.filter(h => {
    const data = new Date(h.data);
    return data >= inicio && data <= fim;
  });

  // Cabeçalho
  const header = document.createElement("li");
  header.innerHTML = `<strong>Colaboradores</strong> | <strong>Localidade</strong> | <strong>Data</strong> | <strong>Hora</strong>`;
  header.style.borderBottom = "1px solid #ccc";
  elementos.listaHistorico.appendChild(header);

  // Itens
  filtrados.slice(0, LIMITE_HISTORICO).forEach(h => {
    const li = document.createElement("li");
    li.textContent = `${h.nomes} | ${h.localidade} | ${formatarData(h.data)} | ${formatarHora(h.data)}`;
    elementos.listaHistorico.appendChild(li);

    estado.historicoFiltrado.push({
      nomes: h.nomes,
      localidade: h.localidade,
      data: formatarData(h.data),
      hora: formatarHora(h.data)
    });
  });
}

async function registrarSaida() {
  try {
    const submitBtn = elementos.form.querySelector('button[type="submit"]');
    await atualizarEstadoBotao(submitBtn, 'carregando');

    // Obter os nomes diretamente dos botões selecionados
    const nomesSelecionados = Array.from(document.querySelectorAll(".botao-colaborador.selecionado"))
      .map(botao => botao.textContent.trim());
    
    if (nomesSelecionados.length === 0) {
      alert("Selecione pelo menos um colaborador.");
      await atualizarEstadoBotao(submitBtn, 'pronto');
      return;
    }

    const data = new Date().toISOString();

    // Operação no Supabase
    const { error } = await supabase
      .from("historico")
      .insert({
        nomes: nomesSelecionados.join(','),
        localidade: elementos.selectLocalidade.value,
        data
      });
    
    if (error) throw error;

    // Resetar seleção
    elementos.botoesColaboradores.forEach(botao => botao.classList.remove("selecionado"));
    elementos.inputColaboradoresSelecionados.value = "";

    await carregarDados(); // Recarrega todos os dados, incluindo o ranking
    mostrarAlertaSalvo();
  } catch (error) {
    console.error("Erro ao registrar saída:", error);
    alert("Erro ao registrar saída.");
  } finally {
    const submitBtn = elementos.form.querySelector('button[type="submit"]');
    await atualizarEstadoBotao(submitBtn, 'pronto');
  }
}

async function gerarPDF() {
  try {
    await atualizarEstadoBotao(elementos.btnPdf, 'carregando');

    const { jsPDF } = await import('https://cdn.skypack.dev/jspdf@2.5.1');
    const doc = new jsPDF();

    doc.text("Histórico Filtrado de Saídas", 10, 10);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 10, 18);

    // Adiciona ranking
    doc.text("Ranking Completo de Saídas:", 10, 30);
    let y = 40;
    
    const ranking = Object.entries(estado.contagemSaidas)
      .sort((a, b) => b[1] - a[1]);
    
    ranking.forEach(([nome, count], index) => {
      doc.text(`${index + 1}. ${nome}: ${count} saída${count !== 1 ? 's' : ''}`, 10, y);
      y += 7;
    });

    y += 10;
    doc.text("Histórico Detalhado:", 10, y);
    y += 10;

    // Adiciona histórico
    estado.historicoFiltrado.forEach(item => {
      doc.text(`${item.data} ${item.hora} - ${item.nomes} (${item.localidade})`, 10, y);
      y += 7;

      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save(`historico_completo_${new Date().toISOString().split("T")[0]}.pdf`);
    mostrarAlertaSalvo();
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    alert("Erro ao gerar PDF.");
  } finally {
    await atualizarEstadoBotao(elementos.btnPdf, 'pronto');
  }
}

function configurarEventListeners() {
  // Configuração dos botões de colaborador
  elementos.botoesColaboradores.forEach(botao => {
    botao.addEventListener("click", () => {
      botao.classList.toggle("selecionado");
      elementos.inputColaboradoresSelecionados.value = 
        Array.from(document.querySelectorAll(".botao-colaborador.selecionado"))
          .map(b => b.textContent.trim())
          .join(",");
    });
  });

  // Configuração do formulário
  elementos.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await registrarSaida();
  });

  // Configuração do botão PDF
  elementos.btnPdf.addEventListener("click", gerarPDF);

  // Configuração dos filtros de data
  elementos.dataInicio.addEventListener("change", atualizarHistorico);
  elementos.dataFim.addEventListener("change", atualizarHistorico);

  // Botão para atualizar o ranking
  if (elementos.btnAtualizarRanking) {
    elementos.btnAtualizarRanking.addEventListener("click", async () => {
      await carregarDados();
      mostrarAlertaSalvo();
    });
  }
}

// Inicialização
document.addEventListener("DOMContentLoaded", async () => {
  const autenticado = await verificarAutenticacao();
  if (!autenticado) return;

  try {
    await carregarDados();
    configurarEventListeners();
    
    // Configuração inicial do campo de data início (últimos 7 dias)
    const dataInicioPadrao = new Date();
    dataInicioPadrao.setDate(dataInicioPadrao.getDate() - DIAS_PADRAO_FILTRO);
    elementos.dataInicio.valueAsDate = dataInicioPadrao;
    elementos.dataFim.valueAsDate = new Date();
    
  } catch (error) {
    console.error("Erro na inicialização:", error);
    alert("Erro ao carregar a aplicação.");
  }
});