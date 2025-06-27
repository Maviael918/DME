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
const toastMessageEl = document.getElementById('toast-message');

const btnRegistrarServico = document.getElementById('btn-registrar-servico');
const btnHistoricoGeral = document.getElementById('btn-historico-geral');
const btnAnaliseMicro = document.getElementById('btn-analise-micro');
// O botão para 'Ponto e Horas' agora é um link direto para banco.html, não precisa de event listener aqui.

const tabContents = document.querySelectorAll('.tab-content');

// --- DADOS GLOBAIS ---
let colaboradoresSelecionados = new Set();
let historicoDados = [];
let colaboradoresPulados = new Set();
let colaboradorSendoPulado = '';
let colaboradoresAusentesHoje = new Set();
const TODOS_COLABORADORES = ['Maviael', 'Raminho', 'Bruninho', 'Matheus', 'Isaac', 'Mikael'];
const COLABORADORES_ROTACAO = ['Maviael', 'Raminho', 'Bruninho', 'Matheus', 'Isaac'];
const LOCALIDADES_INVALIDAS_PARA_CONTAGEM = ['Sede', 'PULOU A VEZ'];

function showToast(message) {
  if (!toastMessageEl) return;
  toastMessageEl.textContent = message;
  toastMessageEl.classList.add('show');
  setTimeout(() => {
    toastMessageEl.classList.remove('show');
  }, 3000);
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

  // Encontra o(s) último(s) colaborador(es) a sair (excluindo Sede e pulos)
  const ultimoHistoricoValido = dados.find(d => !LOCALIDADES_INVALIDAS_PARA_CONTAGEM.includes(d.localidade));
  const ultimosColaboradores = ultimoHistoricoValido ? ultimoHistoricoValido.nomes.split(',').map(n => n.trim()) : [];

  const colaboradoresConsiderados = COLABORADORES_ROTACAO.filter(c => 
    !colaboradoresPulados.has(c) && !colaboradoresAusentesHoje.has(c)
  );

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
  
  // --- LÓGICA FINAL: MENOR PONTUAÇÃO, MAS NÃO SEQUENCIAL ---
  const pontuacoesUnicas = [...new Set(Object.values(contagem))].sort((a, b) => a - b);
  let candidatos;

  // Itera sobre os níveis de pontuação (do menor para o maior) para encontrar um candidato válido
  for (let i = 0; i < pontuacoesUnicas.length; i++) {
    const nivelDePontuacao = pontuacoesUnicas[i];
    const candidatosNesteNivel = Object.keys(contagem).filter(nome => contagem[nome] === nivelDePontuacao);
    
    // Filtra para remover quem foi na última viagem
    const candidatosValidos = candidatosNesteNivel.filter(c => !ultimosColaboradores.includes(c));
    
    // Se encontrou candidatos que não foram na última viagem, usa eles e para a busca
    if (candidatosValidos.length > 0) {
      candidatos = candidatosValidos;
      break; 
    }
  }

  // Se, após todos os loops, nenhum candidato for encontrado (caso raro onde todos os disponíveis foram na última),
  // reverte para o grupo com a menor pontuação, ignorando a regra anti-sequencial para não travar o sistema.
  if (!candidatos || candidatos.length === 0) {
    if (pontuacoesUnicas.length > 0) {
        const minSaidas = pontuacoesUnicas[0];
        candidatos = Object.keys(contagem).filter(nome => contagem[nome] === minSaidas);
    } else {
        candidatos = [];
    }
  }
  // --- FIM DA LÓGICA ---

  let vencedor = '';
  if (!candidatos || candidatos.length === 0) {
      vencedor = 'N/A';
  } else if (candidatos.length === 1) {
    vencedor = candidatos[0];
  } else {
    // Lógica de desempate por data da última viagem (inalterada)
    const ultimasViagens = {};
    candidatos.forEach(nome => {
        const ultimaViagem = dados.find(registro => 
            !LOCALIDADES_INVALIDAS_PARA_CONTAGEM.includes(registro.localidade) &&
            registro.nomes.split(',').map(n => n.trim()).includes(nome)
        );
        ultimasViagens[nome] = ultimaViagem ? new Date(ultimaViagem.data) : new Date(0);
    });
    
    const candidatosOrdenados = Object.keys(ultimasViagens).sort((a,b) => ultimasViagens[a] - ultimasViagens[b]);
    vencedor = candidatosOrdenados[0];
  }

  nomeProximoEl.textContent = vencedor;
  if (vencedor && vencedor !== 'N/A' && vencedor !== "Ninguém disponível") {
      btnPularEl.classList.add('visible');
  } else {
      btnPularEl.classList.remove('visible');
  }
}

/**
 * ATUALIZADO: Apenas aplica a classe visual, mas não desabilita o botão.
 */
function atualizarStatusModalServico() {
    const botoesColaboradores = document.querySelectorAll('#colaboradores .botao-colaborador');
    botoesColaboradores.forEach(btn => {
        const nome = btn.dataset.nome;
        const estaAusente = colaboradoresAusentesHoje.has(nome);

        btn.classList.remove('ausente-modal');
        const statusSpan = btn.querySelector('.status-falta');
        if (statusSpan) {
            statusSpan.remove();
        }

        if (estaAusente) {
            btn.classList.add('ausente-modal');
            btn.insertAdjacentHTML('beforeend', ' <span class="status-falta">F</span>');
        }
    });
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
    justificativaEl.innerHTML = `Não há colaboradores elegíveis suficientes para formar uma nova dupla.`;
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
  justificativaEl.innerHTML = `Sugestão baseada no menor número de visitas ao setor e, como critério de desempate, o menor número de saídas gerais.`;
}

async function carregarTudo() {
  const hoje = new Date().toISOString().slice(0, 10);
  const [historicoResponse, faltasResponse] = await Promise.all([
    supabase.from('historico').select('*').order('data', { ascending: false }),
    supabase.from('registros_ponto').select('colaborador_nome').eq('data', hoje).like('tipo', '%Falta%')
  ]);
  const { data: historico, error: errorHistorico } = historicoResponse;
  const { data: faltasDeHoje, error: errorFaltas } = faltasResponse;
  if (errorHistorico || errorFaltas) {
    console.error('ERRO FATAL AO CARREGAR DADOS:', errorHistorico || errorFaltas);
    return;
  }
  historicoDados = historico;
  colaboradoresAusentesHoje = new Set(faltasDeHoje.map(f => f.colaborador_nome));
  atualizarRanking(historicoDados);
  atualizarProximo(historicoDados);
  atualizarStatusModalServico();
  if (document.getElementById('tab-sao-domingos')?.classList.contains('active')) {
    atualizarSaoDomingosInfo(historicoDados);
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

document.addEventListener('DOMContentLoaded', () => {
    carregarTudo();

    btnRegistrarServico?.addEventListener('click', () => {
        atualizarStatusModalServico();
        abrirModal('modal-registrar-servico');
    });
  
    btnHistoricoGeral?.addEventListener('click', () => {
        exibirHistorico(historicoDados);
        abrirModal('modal-historico-geral');
    });

    btnAnaliseMicro?.addEventListener('click', () => {
        abrirModal('modal-metricas');
    });
  
    // Removida a lógica de event listener para modais de ponto/horas que foram movidos
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', e => { 
            if (e.target.classList.contains('modal-close')) {
                fecharModal(e.target.dataset.modal);
            }
        });
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
                carregarTudo();
            }
        });
    });

    document.getElementById('tab-link-proximo')?.click();

    /**
     * ATUALIZADO: Verifica se o botão clicado é de um colaborador ausente
     * e mostra um alerta em vez de selecionar.
     */
    colaboradoresDiv?.addEventListener('click', e => {
        const clickedButton = e.target.closest('.botao-colaborador');
        if (!clickedButton) return;

        if (clickedButton.classList.contains('ausente-modal')) {
            alert(`Este colaborador não pode ser selecionado pois está com falta registrada para hoje.`);
            return;
        }

        clickedButton.classList.toggle('selecionado');
        const nome = clickedButton.dataset.nome;
        if (colaboradoresSelecionados.has(nome)) {
            colaboradoresSelecionados.delete(nome);
        } else {
            colaboradoresSelecionados.add(nome);
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
            await carregarTudo();
        }
    });

    formSaida?.addEventListener('submit', async (e) => {
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
            formSaida.reset();
            document.querySelectorAll('.botao-colaborador.selecionado').forEach(btn => btn.classList.remove('selecionado'));
            colaboradoresSelecionados.clear();
            carregarTudo();
            fecharModal('modal-registrar-servico');
        }
    });
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful');
      })
      .catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}