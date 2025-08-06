import { supabase } from './supabaseClient.js';

// --- ELEMENTOS DO DOM (Dashboard) ---
const listaHistoricoEl = document.getElementById('lista-historico');
const metricasContentEl = document.getElementById('metricas-content');
const selectColaboradorHistorico = document.getElementById('select-colaborador-historico');
const listaRecusas = document.getElementById('lista-recusas');
const listaUltimosSetores = document.getElementById('lista-ultimos-setores');
const analiseContentEl = document.getElementById('analise-colaborador-content');
const toastMessageEl = document.getElementById('toast-message'); // Assuming toast is global

// --- DADOS GLOBAIS (Dashboard) ---
let historicoDados = [];
const TODOS_COLABORADORES = ['Maviael', 'Raminho', 'Bruninho', 'Matheus', 'Isaac', 'Mikael'];
const LOCALIDADES_INVALIDAS_PARA_CONTAGEM = ['PULOU A VEZ'];

// --- FUNÇÕES DE UTILIDADE (Duplicadas para Dashboard) ---
function showToast(message, type = 'info') {
  if (!toastMessageEl) return;

  let iconClass = '';
  if (type === 'success') {
    iconClass = 'fa-check-circle';
  } else if (type === 'error') {
    iconClass = 'fa-times-circle';
  } else {
    iconClass = 'fa-info-circle';
  }

  toastMessageEl.innerHTML = `<i class="fas ${iconClass}"></i> ${message}`;
  toastMessageEl.className = `toast-container ${type}`;

  toastMessageEl.classList.add('show');

  setTimeout(() => {
    toastMessageEl.classList.remove('show');
  }, 3000);
}

function openModal(modalElement) {
  modalElement.style.display = 'block';
  document.body.classList.add('modal-open');
}

function closeModal(modalElement) {
  modalElement.style.display = 'none';
  document.body.classList.remove('modal-open');
}

function popularColaboradores(selectElement) {
  selectElement.innerHTML = '';
  TODOS_COLABORADORES.forEach(colaborador => {
    const option = document.createElement('option');
    option.value = colaborador;
    option.textContent = colaborador;
    selectElement.appendChild(option);
  });
}

// --- FUNÇÕES DE LÓGICA DE NEGÓCIO (Dashboard) ---

async function carregarHistoricoColaborador(colaboradorNome) {
  // Recusas de Serviço (assumindo que são registradas no histórico com localidade 'PULOU A VEZ')
  const { data: recusas, error: errorRecusas } = await supabase
    .from('historico')
    .select('*')
    .eq('nomes', colaboradorNome)
    .eq('localidade', 'PULOU A VEZ')
    .order('data', { ascending: false });

  if (errorRecusas) {
    console.error('Erro ao carregar recusas:', errorRecusas);
    listaRecusas.innerHTML = '<li>Erro ao carregar recusas de serviço.</li>';
  } else {
    if (recusas.length > 0) {
      listaRecusas.innerHTML = recusas.map(r =>
        `<li>${new Date(r.data).toLocaleDateString('pt-BR')} - ${r.observacao || 'N/A'}</li>`
      ).join('');
    } else {
      listaRecusas.innerHTML = '<li>Nenhuma recusa de serviço registrada.</li>';
    }
  }

  // Últimos 10 Setores Visitados
  const { data: ultimosSetores, error: errorUltimosSetores } = await supabase
    .from('historico')
    .select('localidade, data')
    .like('nomes', `%${colaboradorNome}%`)
    .not('localidade', 'eq', 'PULOU A VEZ')
    .not('localidade', 'eq', 'Sede')
    .order('data', { ascending: false })
    .limit(10);

  if (errorUltimosSetores) {
    console.error('Erro ao carregar últimos setores:', errorUltimosSetores);
    listaUltimosSetores.innerHTML = '<li>Erro ao carregar últimos setores.</li>';
  } else {
    if (ultimosSetores.length > 0) {
      listaUltimosSetores.innerHTML = ultimosSetores.map(s =>
        `<li>${new Date(s.data).toLocaleDateString('pt-BR')} - ${s.localidade}</li>`
      ).join('');
    } else {
      listaUltimosSetores.innerHTML = '<li>Nenhum setor visitado recentemente.</li>';
    }
  }
}

async function carregarTudoDashboard() {
  const { data: historico, error: errorHistorico } = await supabase.from('historico').select('*').order('data', { ascending: false });
  if (errorHistorico) {
    console.error('ERRO FATAL AO CARREGAR DADOS DO HISTÓRICO:', errorHistorico);
    return;
  }
  historicoDados = historico;
}

function exibirHistorico(dados) {
  if (!dados || dados.length === 0) {
    listaHistoricoEl.innerHTML = '<p>Nenhum registro de histórico encontrado.</p>';
    return;
  }
  const table = document.createElement('table');
  table.className = 'data-table';
  table.innerHTML = `<thead><tr><th>Nome(s)</th><th>Localidade</th><th>Data</th><th>Observação</th></tr></thead>`;
  const tbody = document.createElement('tbody');
  dados.slice(0, 20).forEach((registro) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${registro.nomes}</td><td>${registro.localidade}</td><td>${new Date(registro.data).toLocaleString('pt-BR')}</td><td>${registro.observacao || 'N/A'}</td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  listaHistoricoEl.innerHTML = '';
  listaHistoricoEl.appendChild(table);
}

function atualizarAnaliseSetor(dados) {
  if (!metricasContentEl) return;

  const umAnoAtras = new Date();
  umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);

  const dadosFiltrados = dados.filter(d =>
    new Date(d.data) >= umAnoAtras &&
    !LOCALIDADES_INVALIDAS_PARA_CONTAGEM.includes(d.localidade)
  );

  if (dadosFiltrados.length === 0) {
    metricasContentEl.innerHTML = '<p>Não há dados suficientes para gerar a análise.</p>';
    return;
  }

  const contagemPorSetor = {};
  const contagemSedePorSetor = {};

  dadosFiltrados.forEach(registro => {
    const setor = registro.localidade;
    if (!contagemPorSetor[setor]) {
      contagemPorSetor[setor] = {};
      contagemSedePorSetor[setor] = {};
      TODOS_COLABORADORES.forEach(c => {
        contagemPorSetor[setor][c] = 0;
        contagemSedePorSetor[setor][c] = 0;
      });
    }

    const nomes = registro.nomes.split(',').map(n => n.trim());
    nomes.forEach(nome => {
      if (contagemPorSetor[setor][nome] !== undefined) {
        if (setor === 'Sede') {
          contagemSedePorSetor[setor][nome]++;
        } else {
          contagemPorSetor[setor][nome]++;
        }
      }
    });
  });

  for (const setor in contagemSedePorSetor) {
    for (const nome in contagemSedePorSetor[setor]) {
      contagemPorSetor[setor][nome] += Math.floor(contagemSedePorSetor[setor][nome] / 2);
    }
  }

  let html = '<div class="analise-setor-grid">';

  for (const setor in contagemPorSetor) {
    const contagemColaboradores = contagemPorSetor[setor];
    const maxSaidas = Math.max(...Object.values(contagemColaboradores));

    if (maxSaidas === 0) continue; // Não mostra setor sem saídas

    const maisAtivos = Object.keys(contagemColaboradores).filter(
      nome => contagemColaboradores[nome] === maxSaidas
    );

    html += `
      <div class="setor-card">
        <h4>${setor}</h4>
        <div class="colaborador-ativo">
          <i class="fa-solid fa-star"></i>
          <span>${maisAtivos.join(', ')}</span>
        </div>
        <span class="saidas-count">(${maxSaidas} saídas)</span>
      </div>
    `;
  }

  html += '</div>';
  metricasContentEl.innerHTML = html;
}

function atualizarAnaliseColaborador(dados) {
  if (!analiseContentEl) return;

  const umAnoAtras = new Date();
  umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);

  const dadosFiltrados = dados.filter(d => new Date(d.data) >= umAnoAtras);

  if (dadosFiltrados.length === 0) {
    analiseContentEl.innerHTML = '<p>Não há dados suficientes para gerar a análise.</p>';
    return;
  }

  const contagem = {};
  TODOS_COLABORADORES.forEach(c => {
    contagem[c] = {};
  });

  dadosFiltrados.forEach(registro => {
    const nomes = registro.nomes.split(',').map(n => n.trim());
    const setor = registro.localidade;

    nomes.forEach(nome => {
      if (contagem[nome]) {
        if (!contagem[nome][setor]) {
          contagem[nome][setor] = 0;
        }
        contagem[nome][setor]++;
      }
    });
  });

  let html = '<table class="data-table"><thead><tr><th>Colaborador</th><th>Setor</th><th>Viagens</th></tr></thead><tbody>';

  for (const colaborador in contagem) {
    const setores = Object.keys(contagem[colaborador]).sort();
    if (setores.length > 0) {
      setores.forEach((setor, index) => {
        html += `<tr>`;
        if (index === 0) {
          html += `<td rowspan="${setores.length}">${colaborador}</td>`;
        }
        html += `<td>${setor}</td><td>${contagem[colaborador][setor]}</td></tr>`;
      });
    } else {
      html += `<tr><td>${colaborador}</td><td>Nenhuma</td><td>0</td></tr>`;
    }
  }

  html += '</tbody></table>';
  analiseContentEl.innerHTML = html;
}

async function abrirModalHistoricoColaborador() {
  selectColaboradorHistorico.innerHTML = '';
  popularColaboradores(selectColaboradorHistorico); // Use the utility function
  openModal(document.getElementById('modal-historico-colaborador'));
  if (selectColaboradorHistorico.value) {
    carregarHistoricoColaborador(selectColaboradorHistorico.value);
  }
}

async function gerarPdfHistoricoColaborador(colaboradorNome) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text(`Histórico do Colaborador: ${colaboradorNome}`, 10, 10);

  let y = 20;

  const addSection = (title, listId) => {
    doc.setFontSize(12);
    doc.text(title, 10, y);
    y += 7;
    const listItems = document.getElementById(listId).getElementsByTagName('li');
    if (listItems.length > 0) {
      Array.from(listItems).forEach(item => {
        doc.text(`- ${item.textContent}`, 15, y);
        y += 7;
      });
    } else {
      doc.text('- Nenhum registro.', 15, y);
      y += 7;
    }
    y += 5;
  };

  addSection('Recusas de Serviço', 'lista-recusas');
  addSection('Últimos 10 Setores Visitados', 'lista-ultimos-setores');

  doc.save(`historico_${colaboradorNome}.pdf`);
}

// --- INICIALIZAÇÃO E EVENT LISTENERS (Dashboard) ---
document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }

  await carregarTudoDashboard(); // Load data for dashboard

  // Eventos de clique para abrir modais
  document.getElementById('btn-historico-geral')?.addEventListener('click', () => {
    exibirHistorico(historicoDados);
    openModal(document.getElementById('modal-historico-geral'));
  });

  document.getElementById('btn-analise-micro')?.addEventListener('click', () => {
    atualizarAnaliseSetor(historicoDados);
    openModal(document.getElementById('modal-metricas'));
  });

  document.getElementById('btn-historico-colaborador')?.addEventListener('click', () => {
    abrirModalHistoricoColaborador();
  });

  document.getElementById('btn-analise-colaborador')?.addEventListener('click', () => {
    atualizarAnaliseColaborador(historicoDados);
    openModal(document.getElementById('modal-analise-colaborador'));
  });

  selectColaboradorHistorico?.addEventListener('change', (e) => {
    carregarHistoricoColaborador(e.target.value);
  });

  document.getElementById('btn-download-historico')?.addEventListener('click', () => {
    const colaboradorSelecionado = selectColaboradorHistorico.value;
    if (colaboradorSelecionado) {
      gerarPdfHistoricoColaborador(colaboradorSelecionado);
    } else {
      alert('Selecione um colaborador para baixar o histórico.');
    }
  });

  // Event listener for all modal close buttons
  document.querySelectorAll('.modal-close').forEach(button => {
    button.addEventListener('click', () => {
      const modal = button.closest('.modal');
      if (modal) {
        closeModal(modal);
      }
    });
  });
});
