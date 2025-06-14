import { supabase } from './supabaseClient.js';

// --- ELEMENTOS DO DOM ---
const proximoColaboradorEl = document.getElementById('proximo-colaborador');
const listaRankingEl = document.getElementById('lista-ranking');
const listaHistoricoEl = document.getElementById('lista-historico');
const formSaida = document.getElementById('form-saida');
const colaboradoresDiv = document.getElementById('colaboradores');
const localidadeSelect = document.getElementById('localidade');
const observacaoSaidaInput = document.getElementById('observacao-saida');
const metricasContentEl = document.getElementById('metricas-content');
const resumoHorasContentEl = document.getElementById('resumo-horas-content');
const toastMessageEl = document.getElementById('toast-message');

// Top-level buttons
const btnRegistrarServico = document.getElementById('btn-registrar-servico');
const btnHistoricoGeral = document.getElementById('btn-historico-geral');
const btnAnaliseMicro = document.getElementById('btn-analise-micro');

// Tabs
const tabContents = document.querySelectorAll('.tab-content');

// --- DADOS GLOBAIS ---
let colaboradoresSelecionados = new Set();
let historicoDados = [];
let colaboradoresPulados = new Set();
let colaboradorSendoPulado = ''; // Armazena o nome de quem será pulado
const TODOS_COLABORADORES = ['Maviael', 'Raminho', 'Bruninho', 'Matheus', 'Isaac', 'Mikael'];
const COLABORADORES_ROTACAO = ['Maviael', 'Raminho', 'Bruninho', 'Matheus', 'Isaac'];
const LOCALIDADES_INVALIDAS_PARA_CONTAGEM = ['Sede', 'PULOU A VEZ'];

// --- FUNÇÃO PARA EXIBIR MENSAGEM DE FEEDBACK ---
function showToast(message) {
  if (!toastMessageEl) return;
  toastMessageEl.textContent = message;
  toastMessageEl.classList.add('show');
  setTimeout(() => {
    toastMessageEl.classList.remove('show');
  }, 3000);
}

// --- FUNÇÕES DE ATUALIZAÇÃO DA INTERFACE ---

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

function atualizarRanking(dados) {
  const umAnoAtras = new Date();
  umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
  const filtrados = dados.filter(d => new Date(d.data) >= umAnoAtras && !LOCALIDADES_INVALIDAS_PARA_CONTAGEM.includes(d.localidade));
  const contagem = {};
  TODOS_COLABORADORES.forEach(c => contagem[c] = 0);
  const nomeMap = new Map(TODOS_COLABORADORES.map(c => [c.toLowerCase(), c]));
  filtrados.forEach(({ nomes }) => {
    nomes.split(',').forEach(dbNome => {
      const officialNome = nomeMap.get(dbNome.trim().toLowerCase());
      if (officialNome) contagem[officialNome]++;
    });
  });
  const ranking = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
  const totalColaboradores = ranking.length;
  const table = document.createElement('table');
  table.className = 'data-table';
  table.innerHTML = `<thead><tr><th>Pos.</th><th>Nome</th><th>Total</th></tr></thead>`;
  const tbody = document.createElement('tbody');
  ranking.forEach(([nome, qtd], index) => {
    const tr = document.createElement('tr');
    if (index >= totalColaboradores - 2) tr.classList.add('baixa-atuacao');
    tr.innerHTML = `<td>${index === 0 ? '🏆 1º' : `${index + 1}º`}</td><td>${nome}</td><td>${qtd}</td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  listaRankingEl.innerHTML = '';
  listaRankingEl.appendChild(table);
}

function atualizarProximo(dados) {
  const nomeProximoEl = document.getElementById('nome-proximo');
  const btnPularEl = document.getElementById('btn-pular');

  const umAnoAtras = new Date();
  umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);

  const colaboradoresConsiderados = COLABORADORES_ROTACAO.filter(c => !colaboradoresPulados.has(c));

  if (colaboradoresConsiderados.length === 0) {
      nomeProximoEl.textContent = "Ninguém disponível";
      btnPularEl.classList.remove('visible');
      return;
  }

  const contagem = {};
  colaboradoresConsiderados.forEach(c => contagem[c] = 0);
  const nomeMap = new Map(colaboradoresConsiderados.map(c => [c.toLowerCase(), c]));
  
  dados.forEach(({ nomes, data, localidade }) => {
    if (new Date(data) >= umAnoAtras && !LOCALIDADES_INVALIDAS_PARA_CONTAGEM.includes(localidade)) {
        nomes.split(',').forEach(dbNome => {
            const officialNome = nomeMap.get(dbNome.trim().toLowerCase());
            if (officialNome) contagem[officialNome]++;
      });
    }
  });

  const minSaidas = Math.min(...Object.values(contagem));
  const empatados = Object.keys(contagem).filter(nome => contagem[nome] === minSaidas);

  let vencedor = '';

  if (empatados.length === 0) {
      vencedor = 'N/A';
  } else if (empatados.length === 1) {
    vencedor = empatados[0];
  } else {
    let dataMaisAntiga = new Date();
    const ultimasViagens = {};
    empatados.forEach(nome => {
        const ultimaViagem = dados.find(registro => 
            !LOCALIDADES_INVALIDAS_PARA_CONTAGEM.includes(registro.localidade) &&
            registro.nomes.split(',').map(n => n.trim()).includes(nome)
        );
        ultimasViagens[nome] = ultimaViagem ? new Date(ultimaViagem.data) : new Date(0);
    });

    for (const nome in ultimasViagens) {
        if (ultimasViagens[nome] <= dataMaisAntiga) {
            dataMaisAntiga = ultimasViagens[nome];
            vencedor = nome;
        }
    }
  }

  nomeProximoEl.textContent = vencedor;
  if (vencedor && vencedor !== 'N/A' && vencedor !== "Ninguém disponível") {
      btnPularEl.classList.add('visible');
  } else {
      btnPularEl.classList.remove('visible');
  }
}

function atualizarSaoDomingosInfo(historicoCompleto) {
  const ultimosTresEl = document.getElementById('ultimos-tres-sao-domingos');
  const equipeSugeridaEl = document.getElementById('equipe-sugerida-sao-domingos');
  const justificativaEl = document.getElementById('justificativa-sao-domingos');

  if (!historicoCompleto || !Array.isArray(historicoCompleto)) return;
  
  const historicoSetor = historicoCompleto.filter(d => d.localidade === 'São Domingos');
  
  if (historicoSetor.length === 0) {
    ultimosTresEl.innerHTML = '<li>Nenhum registro para este setor.</li>';
    equipeSugeridaEl.textContent = 'N/A';
    justificativaEl.textContent = 'Sem dados para gerar sugestão.';
    return;
  }

  ultimosTresEl.innerHTML = '';
  historicoSetor.slice(0, 3).forEach(r => ultimosTresEl.innerHTML += `<li>[${new Date(r.data).toLocaleDateString('pt-BR')}] - ${r.nomes}</li>`);
  
  const nomesUltimaVisita = historicoSetor[0].nomes.split(',').map(n => n.trim().toLowerCase());
  const colaboradoresElegiveis = COLABORADORES_ROTACAO.filter(c => !nomesUltimaVisita.includes(c.toLowerCase()));

  if (colaboradoresElegiveis.length < 2) {
    equipeSugeridaEl.textContent = 'Sugestão Indisponível';
    justificativaEl.innerHTML = `Não há colaboradores elegíveis suficientes para formar uma nova dupla, pois <strong>${historicoSetor[0].nomes}</strong> participou(ram) do último serviço.`;
    return;
  }

  const contagemVisitasSetor = {};
  colaboradoresElegiveis.forEach(nome => { contagemVisitasSetor[nome] = 0; });
  const nomeMapSetor = new Map(colaboradoresElegiveis.map(c => [c.toLowerCase(), c]));
  for (const registro of historicoSetor) {
    if (registro.nomes && typeof registro.nomes === 'string') {
      registro.nomes.split(',').forEach(nome => {
        const officialNome = nomeMapSetor.get(nome.trim().toLowerCase());
        if (officialNome) contagemVisitasSetor[officialNome]++;
      });
    }
  }

  const contagemGeral = {};
  colaboradoresElegiveis.forEach(nome => { contagemGeral[nome] = 0; });
  const nomeMapGeral = new Map(colaboradoresElegiveis.map(c => [c.toLowerCase(), c]));
  historicoCompleto.filter(d => !LOCALIDADES_INVALIDAS_PARA_CONTAGEM.includes(d.localidade)).forEach(({ nomes }) => {
    nomes.split(',').forEach(dbNome => {
        const officialNome = nomeMapGeral.get(dbNome.trim().toLowerCase());
        if (officialNome) contagemGeral[officialNome]++;
    });
  });

  const scores = colaboradoresElegiveis.map(nome => ({
    nome: nome,
    visitasSetor: contagemVisitasSetor[nome] || 0,
    saidasGerais: contagemGeral[nome] || 0
  }));

  scores.sort((a, b) => {
    if (a.visitasSetor !== b.visitasSetor) return a.visitasSetor - b.visitasSetor;
    return a.saidasGerais - b.saidasGerais;
  });

  const duplaSugerida = [scores[0], scores[1]];
  const nomesDupla = duplaSugerida.map(c => c.nome);

  equipeSugeridaEl.innerHTML = nomesDupla.join(' e ');
  justificativaEl.innerHTML = `Sugestão: <strong>${nomesDupla.join(' e ')}</strong>. <br>Justificativa: Colaborador(es) do último serviço (${historicoSetor[0].nomes}) foram desconsiderados. A dupla foi selecionada entre os demais com base nos critérios de justiça.`;
}

function exibirMetricasPorSetor(historicoCompleto) {
  if (!historicoCompleto || historicoCompleto.length === 0) {
    metricasContentEl.innerHTML = '<p>Não há dados de histórico para gerar métricas.</p>';
    abrirModal('modal-metricas');
    return;
  }
  const historicoExterno = historicoCompleto.filter(d => !LOCALIDADES_INVALIDAS_PARA_CONTAGEM.includes(d.localidade));
  const setores = [...new Set(historicoExterno.map(d => d.localidade))];
  if (setores.length === 0) {
    metricasContentEl.innerHTML = '<p>Nenhum serviço externo registrado para gerar métricas.</p>';
    abrirModal('modal-metricas');
    return;
  }
  let content = '<table class="data-table"><thead><tr><th>Setor</th><th>Colaborador Mais Ativo</th><th>Viagens</th></tr></thead><tbody>';
  setores.forEach(setor => {
    const contagemNomes = {};
    const registrosDoSetor = historicoExterno.filter(d => d.localidade === setor);
    registrosDoSetor.forEach(registro => {
      if (registro.nomes && typeof registro.nomes === 'string') {
        registro.nomes.split(',').forEach(nome => {
          const n = nome.trim();
          if (n) contagemNomes[n] = (contagemNomes[n] || 0) + 1;
        });
      }
    });
    if (Object.keys(contagemNomes).length > 0) {
      const maisAtivo = Object.entries(contagemNomes).sort((a, b) => b[1] - a[1])[0];
      content += `<tr><td>${setor}</td><td>${maisAtivo[0]}</td><td>${maisAtivo[1]}</td></tr>`;
    }
  });
  content += '</tbody></table>';
  metricasContentEl.innerHTML = content;
  abrirModal('modal-metricas');
}

async function exibirResumoHorasExtras() {
  resumoHorasContentEl.innerHTML = '<p>Carregando...</p>';
  abrirModal('modal-resumo-horas');
  const { data, error } = await supabase.from('banco_horas').select('colaborador_nome, horas_excedentes').eq('status', 'Pendente');
  if (error) {
    resumoHorasContentEl.innerHTML = `<p style="color: red;">Erro ao buscar dados: ${error.message}</p>`;
    return;
  }
  if (data.length === 0) {
    resumoHorasContentEl.innerHTML = '<p>Nenhum registro de horas extras pendentes encontrado.</p>';
    return;
  }
  const totais = {};
  TODOS_COLABORADORES.forEach(c => totais[c] = 0);
  data.forEach(r => {
    if (totais.hasOwnProperty(r.colaborador_nome)) totais[r.colaborador_nome] += r.horas_excedentes;
  });
  const totaisOrdenados = Object.entries(totais).sort((a, b) => b[1] - a[1]);
  let content = '<table class="data-table"><thead><tr><th>Colaborador</th><th>Horas Pendentes</th><th>Ação</th></tr></thead><tbody>';
  totaisOrdenados.forEach(([nome, total]) => {
    if (total > 0) {
      content += `<tr><td>${nome}</td><td>${total.toFixed(1)} horas</td><td><button class="btn btn-pagar" data-colaborador="${nome}">Registrar Pagamento</button></td></tr>`;
    }
  });
  content += '</tbody></table>';
  resumoHorasContentEl.innerHTML = content;
}

async function registrarPagamentoHoras(nomeColaborador) {
    if (!confirm(`Você confirma o pagamento de todas as horas extras pendentes de ${nomeColaborador}?`)) return;
    const { error } = await supabase.from('banco_horas').update({ status: 'Pago' }).eq('colaborador_nome', nomeColaborador).eq('status', 'Pendente');
    if (error) {
        alert(`Erro ao registrar pagamento: ${error.message}`);
    } else {
        showToast(`Pagamento de ${nomeColaborador} registrado!`);
        exibirResumoHorasExtras();
    }
}

function abrirModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'block';
}

function fecharModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'none';
}

async function carregarTudo() {
  const { data, error } = await supabase.from('historico').select('*').order('data', { ascending: false });
  if (error) {
    console.error('ERRO FATAL AO CARREGAR HISTÓRICO:', error);
    if(listaHistoricoEl) listaHistoricoEl.innerHTML = `<p style="color: red;">Falha grave ao carregar dados. Verifique o console (F12).</p>`;
    return;
  }
  
  historicoDados = data;
  
  atualizarRanking(historicoDados);
  atualizarProximo(historicoDados);
  
  if (document.getElementById('tab-sao-domingos')?.classList.contains('active')) {
    atualizarSaoDomingosInfo(historicoDados);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const selects = [document.getElementById('ponto-colaborador'), document.getElementById('horas-colaborador')];
  selects.forEach(select => {
    if (select) select.innerHTML = TODOS_COLABORADORES.map(nome => `<option value="${nome}">${nome}</option>`).join('');
  });

  ['ponto-data', 'horas-data'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.valueAsDate = new Date();
  });
  
  carregarTudo();

  btnRegistrarServico?.addEventListener('click', () => {
    colaboradoresSelecionados.clear();
    document.querySelectorAll('.botao-colaborador.selecionado').forEach(btn => btn.classList.remove('selecionado'));
    localidadeSelect.value = 'Sede';
    observacaoSaidaInput.value = '';
    abrirModal('modal-registrar-servico');
  });
  
  btnHistoricoGeral?.addEventListener('click', () => {
    exibirHistorico(historicoDados);
    abrirModal('modal-historico-geral');
  });

  btnAnaliseMicro?.addEventListener('click', () => exibirMetricasPorSetor(historicoDados));

  document.getElementById('btn-abrir-ponto')?.addEventListener('click', () => abrirModal('modal-ponto'));
  document.getElementById('btn-abrir-horas')?.addEventListener('click', () => abrirModal('modal-horas'));
  document.getElementById('btn-ver-resumo-horas')?.addEventListener('click', exibirResumoHorasExtras);
  
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => { if (e.target.classList.contains('modal-close')) fecharModal(e.target.dataset.modal); });
  });
  
  resumoHorasContentEl?.addEventListener('click', e => {
    if (e.target.classList.contains('btn-pagar')) registrarPagamentoHoras(e.target.dataset.colaborador);
  });
  
  document.querySelectorAll('.tab-link').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab-link').forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');

      if (tab.dataset.tab === 'tab-sao-domingos') atualizarSaoDomingosInfo(historicoDados);
      if (tab.dataset.tab === 'tab-ranking') atualizarRanking(historicoDados);
      if (tab.dataset.tab === 'tab-proximo') {
        colaboradoresPulados.clear();
        atualizarProximo(historicoDados);
      }
    });
  });

  document.getElementById('tab-link-proximo')?.click();

  localidadeSelect?.addEventListener('change', () => {
    if (localidadeSelect.value === 'São Domingos') {
      atualizarSaoDomingosInfo(historicoDados);
      document.getElementById('tab-link-sao-domingos')?.click();
    }
  });

  colaboradoresDiv?.addEventListener('click', e => {
    if (e.target.classList.contains('botao-colaborador')) {
      e.target.classList.toggle('selecionado');
      const nome = e.target.dataset.nome;
      colaboradoresSelecionados.has(nome) ? colaboradoresSelecionados.delete(nome) : colaboradoresSelecionados.add(nome);
    }
  });

  const btnPularEl = document.getElementById('btn-pular');
  const nomeProximoEl = document.getElementById('nome-proximo');
  btnPularEl?.addEventListener('click', () => {
    colaboradorSendoPulado = nomeProximoEl.textContent;
    if (colaboradorSendoPulado) {
      abrirModal('modal-pular-motivo');
    }
  });

  document.getElementById('form-pular-motivo')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const motivoText = document.getElementById('pular-motivo-texto').value;
      if (!motivoText.trim()) {
        alert('É obrigatório descrever o motivo.');
        return;
      }

      // Salva o motivo no histórico
      const { error } = await supabase.from('historico').insert([{
          nomes: colaboradorSendoPulado,
          localidade: 'PULOU A VEZ',
          data: new Date().toISOString(),
          observacao: motivoText
      }]);

      if (error) {
          alert('Erro ao registrar o motivo: ' + error.message);
      } else {
          showToast('Motivo registrado. Pulando colaborador...');
          document.getElementById('form-pular-motivo').reset();
          fecharModal('modal-pular-motivo');
          
          colaboradoresPulados.add(colaboradorSendoPulado);
          await carregarTudo(); // Recarrega os dados para incluir o novo registro de "pulo"
          atualizarProximo(historicoDados); // Recalcula o próximo
      }
  });

  formSaida?.addEventListener('submit', async (e) => {
    const colaboradoresSelecionadosInput = document.getElementById('colaboradoresSelecionados');
    colaboradoresSelecionadosInput.value = Array.from(colaboradoresSelecionados).join(', ');
    e.preventDefault();
    if (colaboradoresSelecionados.size === 0) { alert('Selecione pelo menos um colaborador.'); return; }
    const { error } = await supabase.from('historico').insert([{ 
      nomes: Array.from(colaboradoresSelecionados).join(', '), 
      localidade: localidadeSelect.value, 
      data: new Date().toISOString(),
      observacao: observacaoSaidaInput.value.trim()
    }]);
    if (error) { alert('Erro: ' + error.message); }
    else {
      showToast('Saída registrada com sucesso!');
      colaboradoresPulados.clear();
      colaboradoresSelecionadosInput.value = '';
      formSaida.reset();
      colaboradoresSelecionados.clear();
      document.querySelectorAll('.botao-colaborador.selecionado').forEach(btn => btn.classList.remove('selecionado'));
      carregarTudo();
      fecharModal('modal-registrar-servico');
    }
  });

  document.getElementById('form-ponto')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('registros_ponto').insert([{
        colaborador_nome: document.getElementById('ponto-colaborador').value,
        data: document.getElementById('ponto-data').value,
        tipo: document.getElementById('ponto-tipo').value,
        observacao: document.getElementById('ponto-obs').value
    }]);
    if (error) { alert('Erro: ' + error.message); }
    else { 
      showToast('Registro de ponto salvo!'); 
      document.getElementById('form-ponto').reset(); 
      fecharModal('modal-ponto'); 
    }
  });

  document.getElementById('form-horas')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('banco_horas').insert([{
        colaborador_nome: document.getElementById('horas-colaborador').value,
        data: document.getElementById('horas-data').value,
        horas_excedentes: document.getElementById('horas-excedentes').value,
        justificativa: document.getElementById('horas-justificativa').value
    }]);
    if (error) { alert('Erro: ' + error.message); }
    else { 
      showToast('Horas extras lançadas!');
      document.getElementById('form-horas').reset(); 
      fecharModal('modal-horas'); 
    }
  });
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}