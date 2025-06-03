import { supabase } from './supabaseClient.js';

const proximoColaboradorEl = document.getElementById('proximo-colaborador');
const listaRankingEl = document.getElementById('lista-ranking');
const listaHistoricoEl = document.getElementById('lista-historico');
const formSaida = document.getElementById('form-saida');
const colaboradoresDiv = document.getElementById('colaboradores');
const colaboradoresSelecionadosInput = document.getElementById('colaboradoresSelecionados');
const localidadeSelect = document.getElementById('localidade');

const saoDomingosInfoSection = document.getElementById('sao-domingos-info');
const ultimoSaoDomingosEl = document.getElementById('ultimo-sao-domingos');

let colaboradoresSelecionados = new Set();
let historicoDados = [];

async function carregarHistorico() {
  const { data, error } = await supabase
    .from('historico')
    .select('*')
    .order('data', { ascending: false });

  if (error) {
    console.error('Erro ao carregar histórico:', error);
    return;
  }

  historicoDados = data;
  exibirHistorico(data);
  atualizarRanking(data);
  atualizarProximo(data);
  atualizarSaoDomingosInfo(data);
}

function exibirHistorico(dados) {
  listaHistoricoEl.innerHTML = '';

  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Nome(s)', 'Localidade', 'Data'].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    th.style.border = '1px solid #ddd';
    th.style.padding = '8px';
    th.style.textAlign = 'left';
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  dados.slice(0, 20).forEach((registro) => {
    const tr = document.createElement('tr');

    const tdNomes = document.createElement('td');
    tdNomes.textContent = registro.nomes;
    tdNomes.style.border = '1px solid #ddd';
    tdNomes.style.padding = '8px';

    const tdLocalidade = document.createElement('td');
    tdLocalidade.textContent = registro.localidade;
    tdLocalidade.style.border = '1px solid #ddd';
    tdLocalidade.style.padding = '8px';

    const tdData = document.createElement('td');
    tdData.textContent = new Date(registro.data).toLocaleString();
    tdData.style.border = '1px solid #ddd';
    tdData.style.padding = '8px';

    tr.appendChild(tdNomes);
    tr.appendChild(tdLocalidade);
    tr.appendChild(tdData);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  listaHistoricoEl.appendChild(table);
}

function atualizarRanking(dados) {
  const umAnoAtras = new Date();
  umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);

  // Exclui localidade 'Sede' do ranking
  const filtrados = dados.filter(d => new Date(d.data) >= umAnoAtras && d.localidade !== 'Sede');

  const contagem = {};

  filtrados.forEach(({ nomes }) => {
    nomes.split(',').forEach(nome => {
      const n = nome.trim();
      if (n) contagem[n] = (contagem[n] || 0) + 1;
    });
  });

  const ranking = Object.entries(contagem)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  listaRankingEl.innerHTML = '';

  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  const thPos = document.createElement('th');
  thPos.textContent = 'Posição';
  thPos.style.border = '1px solid #ddd';
  thPos.style.padding = '8px';
  thPos.style.width = '60px';
  thPos.style.textAlign = 'center';
  headerRow.appendChild(thPos);

  const thNome = document.createElement('th');
  thNome.textContent = 'Nome';
  thNome.style.border = '1px solid #ddd';
  thNome.style.padding = '8px';
  thNome.style.textAlign = 'left';
  headerRow.appendChild(thNome);

  const thTotal = document.createElement('th');
  thTotal.textContent = 'Total';
  thTotal.style.border = '1px solid #ddd';
  thTotal.style.padding = '8px';
  thTotal.style.width = '80px';
  thTotal.style.textAlign = 'center';
  headerRow.appendChild(thTotal);

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  ranking.forEach(([nome, qtd], index) => {
    const tr = document.createElement('tr');

    const tdPos = document.createElement('td');
    tdPos.style.border = '1px solid #ddd';
    tdPos.style.padding = '8px';
    tdPos.style.textAlign = 'center';
    tdPos.textContent = index === 0 ? '🏆 1' : (index + 1).toString();

    const tdNome = document.createElement('td');
    tdNome.style.border = '1px solid #ddd';
    tdNome.style.padding = '8px';
    tdNome.textContent = nome;

    const tdTotal = document.createElement('td');
    tdTotal.style.border = '1px solid #ddd';
    tdTotal.style.padding = '8px';
    tdTotal.style.textAlign = 'center';
    tdTotal.textContent = qtd;

    tr.appendChild(tdPos);
    tr.appendChild(tdNome);
    tr.appendChild(tdTotal);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  listaRankingEl.appendChild(table);
}

function atualizarProximo(dados) {
  const umAnoAtras = new Date();
  umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);

  const colaboradores = ['Maviael', 'Raminho', 'Bruninho', 'Matheus', 'isaac'];

  const contagem = {};
  colaboradores.forEach(c => contagem[c] = 0);

  dados.forEach(({ nomes, data, localidade }) => {
    if (new Date(data) >= umAnoAtras && localidade !== 'Sede') {
      nomes.split(',').forEach(nome => {
        const n = nome.trim();
        if (contagem[n] !== undefined) contagem[n]++;
      });
    }
  });

  let minSaidas = Infinity;
  let proximo = 'N/A';
  for (const c of colaboradores) {
    if (contagem[c] < minSaidas) {
      minSaidas = contagem[c];
      proximo = c;
    }
  }

  proximoColaboradorEl.textContent = proximo;
}

function atualizarSaoDomingosInfo(dados) {
  const saoDomingosHistorico = dados
    .filter(d => d.localidade === 'São Domingos')
    .sort((a, b) => new Date(b.data) - new Date(a.data));

  if (saoDomingosHistorico.length === 0) {
    saoDomingosInfoSection.style.display = 'none';
    return;
  }

  saoDomingosInfoSection.style.display = 'block';

  const ultimoRegistro = saoDomingosHistorico[0];

  const nomesTexto = ultimoRegistro.nomes;

  ultimoSaoDomingosEl.innerHTML = '';
  const li = document.createElement('li');
  li.textContent = nomesTexto;
  ultimoSaoDomingosEl.appendChild(li);
}

colaboradoresDiv.addEventListener('click', (e) => {
  if (e.target.classList.contains('botao-colaborador')) {
    const nome = e.target.dataset.nome;
    if (colaboradoresSelecionados.has(nome)) {
      colaboradoresSelecionados.delete(nome);
      e.target.classList.remove('selecionado');
    } else {
      colaboradoresSelecionados.add(nome);
      e.target.classList.add('selecionado');
    }
    colaboradoresSelecionadosInput.value = Array.from(colaboradoresSelecionados).join(',');
  }
});

localidadeSelect.addEventListener('change', () => {
  if (localidadeSelect.value === 'São Domingos') {
    atualizarSaoDomingosInfo(historicoDados);
  } else {
    saoDomingosInfoSection.style.display = 'none';
  }
});

formSaida.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (colaboradoresSelecionados.size === 0) {
    alert('Selecione pelo menos um colaborador.');
    return;
  }

  const localidade = localidadeSelect.value;
  const colaboradoresStr = Array.from(colaboradoresSelecionados).join(',');

  const { data, error } = await supabase
    .from('historico')
    .insert([{ nomes: colaboradoresStr, localidade, data: new Date().toISOString() }]);

  if (error) {
    alert('Erro ao registrar saída: ' + error.message);
    return;
  }

  alert('Saída registrada com sucesso!');
  colaboradoresSelecionados.clear();
  colaboradoresSelecionadosInput.value = '';
  document.querySelectorAll('.botao-colaborador.selecionado').forEach(btn => btn.classList.remove('selecionado'));

  await carregarHistorico();
});

carregarHistorico();
