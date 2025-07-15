import { supabase } from './supabaseClient.js';

// --- ELEMENTOS DO DOM ---
const proximoColaboradorEl = document.getElementById('nome-proximo');
const listaRankingEl = document.getElementById('lista-resumo-saida');
const listaHistoricoEl = document.getElementById('lista-historico'); // Still needed for exibirHistorico
const formSaida = document.getElementById('form-saida');
const colaboradoresDiv = document.getElementById('colaboradores');
const localidadeSelect = document.getElementById('localidade');
const observacaoSaidaInput = document.getElementById('observacao-saida');
const metricasContentEl = document.getElementById('metricas-content'); // Still needed for atualizarAnaliseSetor
const toastMessageEl = document.getElementById('toast-message');
const notificationSound = new Audio('js/notification.mp3'); // Adiciona o som de notificação

const btnConfigAdmin = document.getElementById('btn-selecao-manual');
const btnPularEl = document.getElementById('btn-pular');
const btnRegistrarProximoEl = document.getElementById('btn-registrar-proximo');
const btnRegistrarPonto = document.getElementById('btn-registrar-ponto'); // Still needed for ponto.html link

const btnVerTermos = document.getElementById('btn-ver-termos'); // Novo elemento
const btnDownloadTermosAssinatura = document.getElementById('btn-download-termos-assinatura'); // Novo elemento

const tabContentsMain = document.querySelectorAll('.tab-content');

// Novos elementos para o modal de alerta de registro recente
const modalAlertaRegistroRecente = document.getElementById('modal-alerta-registro-recente');
const alertaRegistroRecenteMensagem = document.getElementById('alerta-registro-recente-mensagem');
const btnAlertaRegistroRecenteSim = document.getElementById('btn-alerta-registro-recente-sim');
const btnAlertaRegistroRecenteNao = document.getElementById('btn-alerta-registro-recente-nao');

// --- DADOS GLOBAIS ---
let colaboradoresSelecionados = new Set();
let historicoDados = [];
let colaboradoresPulados = new Set();
let colaboradorParaPular = '';
let colaboradoresAusentesHoje = new Set();
let modoAdmin = false;
const TODOS_COLABORADORES = ['Maviael', 'Raminho', 'Bruninho', 'Matheus', 'Isaac', 'Mikael'];
const COLABORADORES_ROTACAO = ['Maviael', 'Raminho', 'Bruninho', 'Matheus', 'Isaac'];
const LOCALIDADES_INVALIDAS_PARA_CONTAGEM = ['PULOU A VEZ'];

// Variável para armazenar a função de registro pendente
let pendingRegistration = null;

// --- FUNÇÕES DE UTILIDADE ---

function showToast(message, type = 'info') {
  if (!toastMessageEl) return;

  // Toca o som de notificação
  notificationSound.play();

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

function formatDecimalToHoursMinutes(decimalHours) {
  const sign = decimalHours < 0 ? '-' : '';
  const absHours = Math.abs(decimalHours);
  const hours = Math.floor(absHours);
  const minutes = Math.round((absHours - hours) * 60);
  if (hours > 0 && minutes > 0) {
    return `${sign}${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${sign}${hours}h`;
  } else if (minutes > 0) {
    return `${sign}${minutes}m`;
  } else {
    return '0h';
  }
}

// --- FUNÇÕES DE LÓGICA DE NEGÓCIO ---

async function carregarColaboradoresAtivos() {
  // preencherSelectsColaboradores(); // This is now handled by dashboard.js for its specific select
  await carregarProximoColaborador();
}

function preencherSelectsColaboradores() {
  // This function is now primarily used by dashboard.js, but keeping a stub here if any painel.html specific select needs it.
  // For now, it's not directly called in painel.html's context after moving.
}

async function carregarProximoColaborador() {
  let rotacao = JSON.parse(localStorage.getItem('rotacao_colaboradores')) || [...TODOS_COLABORADORES];
  let ultimaSaida = localStorage.getItem('ultima_saida_colaborador');
  let ultimoPulado = localStorage.getItem('ultimo_pulado_colaborador');

  if (rotacao.length === 0) {
    rotacao = [...TODOS_COLABORADORES];
    localStorage.setItem('rotacao_colaboradores', JSON.stringify(rotacao));
  }

  let startIndex = 0;
  if (ultimaSaida) {
    startIndex = rotacao.indexOf(ultimaSaida) + 1;
  } else if (ultimoPulado) {
    startIndex = rotacao.indexOf(ultimoPulado) + 1;
  }
  startIndex = startIndex % rotacao.length;

  let proximo = null;
  for (let i = 0; i < rotacao.length; i++) {
    const currentIndex = (startIndex + i) % rotacao.length;
    const candidato = rotacao[currentIndex];
    if (TODOS_COLABORADORES.includes(candidato)) {
      proximo = candidato;
      break;
    }
  }

  if (proximo) {
    proximoColaboradorEl.textContent = proximo;
  } else {
    proximoColaboradorEl.textContent = 'Nenhum colaborador disponível';
    btnPularEl.style.display = 'none';
  }
}

async function registrarSaida(event, forceRegistration = false) {
  event.preventDefault();

  const nomes = Array.from(colaboradoresSelecionados).join(', ');
  const localidade = localidadeSelect.value;
  const observacao = observacaoSaidaInput.value;

  console.log('*** Início da função registrarSaida ***');
  console.log('Colaboradores Selecionados:', Array.from(colaboradoresSelecionados));
  console.log('Localidade:', localidade);
  console.log('Force Registration:', forceRegistration);

  let observacaoFinal = observacao;
  if (modoAdmin) {
    observacaoFinal = observacaoFinal ? `${observacaoFinal} (Registro Direto)` : 'Registro Direto';
  }

  if (colaboradoresSelecionados.size === 0) {
    showToast('Selecione pelo menos um colaborador.', 'error');
    console.log('Nenhum colaborador selecionado. Abortando.');
    return;
  }

  // Verifica registros recentes apenas se não for um registro forçado
  if (!forceRegistration) {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - (10 * 60 * 1000));
    console.log('Verificando registros recentes. Timestamp 10 minutos atrás:', tenMinutesAgo.toISOString());

    const { data: recentRecords, error: recentError } = await supabase
      .from('historico')
      .select('nomes, localidade, data')
      .gte('data', tenMinutesAgo.toISOString());

    if (recentError) {
      console.error('Erro ao verificar registros recentes:', recentError);
      showToast('Erro ao verificar registros recentes: ' + recentError.message, 'error');
      return;
    }

    console.log('Registros recentes do Supabase:', recentRecords);

    let foundRecent = false;
    let recentColaboradores = [];
    recentRecords.forEach(record => {
      console.log('Analisando registro:', record);
      const recordNames = record.nomes.split(',').map(n => n.trim());
      const commonNames = Array.from(colaboradoresSelecionados).filter(name => recordNames.includes(name));
      console.log('Nomes do registro:', recordNames);
      console.log('Nomes em comum:', commonNames);

      if (commonNames.length > 0 && record.localidade === localidade) {
        foundRecent = true;
        recentColaboradores.push(...commonNames);
        console.log('Registro recente encontrado para o mesmo setor!');
      }
    });

    if (foundRecent) {
      const uniqueRecentColaboradores = [...new Set(recentColaboradores)];
      alertaRegistroRecenteMensagem.innerHTML = `O(s) colaborador(es) <strong>${uniqueRecentColaboradores.join(', ')}</strong> já foi(ram) registrado(s) recentemente para o setor <strong>${localidade}</strong>. Deseja continuar?`;
      openModal(modalAlertaRegistroRecente);
      pendingRegistration = { nomes, localidade, observacao: observacaoFinal };
      console.log('Modal de alerta de registro recente aberto.');
      return; // Interrompe o registro até a confirmação
    }
  }

  // Se chegou aqui, ou não há registro recente, ou o registro foi forçado
  console.log('Prosseguindo com o registro...');
  try {
    const { error } = await supabase
      .from('historico')
      .insert([{ nomes, localidade, observacao: observacaoFinal, data: new Date().toISOString() }]);

    if (error) {
      console.error('Supabase insert error:', error);
      showToast('Falha ao inserir no banco de dados: ' + error.message, 'error');
      throw new Error('Falha ao inserir no banco de dados: ' + error.message);
    }

    showToast('Serviço registrado com sucesso!', 'success');

    const proximoColaboradorSugerido = proximoColaboradorEl.textContent.trim();
    if (!modoAdmin && localidade !== 'Sede' && colaboradoresSelecionados.has(proximoColaboradorSugerido)) {
        localStorage.setItem('ultima_saida_colaborador', proximoColaboradorSugerido);
        localStorage.removeItem('ultimo_pulado_colaborador');
    }

    closeModal(document.getElementById('modal-registrar-servico'));
    formSaida.reset();
    colaboradoresSelecionados.clear();
    document.querySelectorAll('.botao-colaborador.selecionado').forEach(btn => btn.classList.remove('selecionado'));

    await carregarTudo();

  } catch (error) {
    console.error('Erro no registro:', error);
    showToast('Ocorreu um erro ao registrar o serviço: ' + error.message, 'error');
  } finally {
    modoAdmin = false;
    pendingRegistration = null; // Limpa o registro pendente
    console.log('*** Fim da função registrarSaida ***');
  }
}

async function carregarTudo(skipRotationUpdate = false) {
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
  atualizarResumoSaida(historicoDados);
  if (!skipRotationUpdate) {
    atualizarProximo(historicoDados);
  }
  atualizarStatusModalServico();
  if (document.getElementById('tab-sao-domingos')?.classList.contains('active')) {
    atualizarSaoDomingosInfo(historicoDados);
  }
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
    let displayNomes = registro.nomes;

    if (registro.observacao && registro.observacao.includes('cedeu a vez a')) {
      const regex = /(.*) cedeu a vez a (.*)/;
      const match = registro.observacao.match(regex);
      if (match && match.length === 3) {
        const cedeu = match[1].trim();
        const recebeu = match[2].trim();
        displayNomes = `${cedeu} <i class="fa-solid fa-exchange-alt"></i> ${recebeu}`;
      }
    }

    tr.innerHTML = `<td>${displayNomes}</td><td>${registro.localidade}</td><td>${new Date(registro.data).toLocaleString('pt-BR')}</td><td>${registro.observacao || 'N/A'}</td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  listaHistoricoEl.innerHTML = '';
  listaHistoricoEl.appendChild(table);
}

function atualizarResumoSaida(dados) {
  const umAnoAtras = new Date();
  umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
  const filtrados = dados.filter(d => new Date(d.data) >= umAnoAtras && !LOCALIDADES_INVALIDAS_PARA_CONTAGEM.includes(d.localidade));

  const pontuacao = {};
  TODOS_COLABORADORES.forEach(c => { pontuacao[c] = 0; });

  const contagemSede = {};
  TODOS_COLABORADORES.forEach(c => { contagemSede[c] = 0; });

  const nomeMap = new Map(TODOS_COLABORADORES.map(c => [c.toLowerCase(), c]));

  filtrados.forEach(({ nomes, localidade }) => {
    let collaboratorsToCount = [];

    if (localidade === 'REMANEJAR SAIDA') {
      // O campo 'nomes' já contém o colaborador que recebeu a vez
      collaboratorsToCount.push(nomes);
    } else {
      // Existing logic for other localities
      collaboratorsToCount = nomes.split(',').map(n => n.trim());
    }

    collaboratorsToCount.forEach(nome => {
      const officialNome = nomeMap.get(nome.toLowerCase()); // Use toLowerCase for lookup
      if (officialNome) {
        if (localidade === 'Sede') {
          contagemSede[officialNome]++;
        } else {
          pontuacao[officialNome]++;
        }
      }
    });
  });

  for (const nome in contagemSede) {
    pontuacao[nome] += Math.floor(contagemSede[nome] / 2);
  }

  const ranking = Object.entries(pontuacao).sort((a, b) => b[1] - a[1]);
  const totalColaboradores = ranking.length;

  const table = document.createElement('table');
  table.className = 'data-table';
  table.innerHTML = `<thead><tr><th>Pos.</th><th>Nome</th><th>Total de Saídas</th></tr></thead>`;
  const tbody = document.createElement('tbody');
  ranking.forEach(([nome, qtd], index) => {
    const tr = document.createElement('tr');
    let positionHtml = `<td>${index + 1}º</td>`;
    let nameHtml = `<td>${nome}</td>`;

    if (nome === 'Mikael') {
      nameHtml = `<td>${nome} (ADM) <i class="fas fa-user-shield"></i></td>`;
    } else if (index >= ranking.length - 2) {
      tr.classList.add('baixa-atuacao');
    }

    tr.innerHTML = `${positionHtml}${nameHtml}<td>${qtd}</td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  listaRankingEl.innerHTML = '';
  listaRankingEl.appendChild(table);
}

function atualizarProximo(dados) {
  const nomeProximoEl = document.getElementById('nome-proximo');
  const umAnoAtras = new Date();
  umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);

  // 1. Define a lista inicial de colaboradores que podem sair (não estão ausentes ou foram pulados)
  let colaboradoresConsiderados = COLABORADORES_ROTACAO.filter(c =>
    !colaboradoresPulados.has(c) && !colaboradoresAusentesHoje.has(c)
  );

  // 2. Regra de Negócio: Determinar elegibilidade com base nas saídas do dia
  const hoje = new Date().toISOString().slice(0, 10);
  const viagensHoje = dados.filter(d => d.data.startsWith(hoje) && !LOCALIDADES_INVALIDAS_PARA_CONTAGEM.includes(d.localidade));

  const contagemViagensHoje = {};
  COLABORADORES_ROTACAO.forEach(c => {
    contagemViagensHoje[c] = { sede: 0, outros: 0 };
  });

  viagensHoje.forEach(registro => {
    registro.nomes.split(',').map(n => n.trim()).forEach(nome => {
      const officialNome = COLABORADORES_ROTACAO.find(c => c.toLowerCase() === nome.toLowerCase());
      if (officialNome) {
        if (registro.localidade === 'Sede') {
          contagemViagensHoje[officialNome].sede++;
        } else {
          contagemViagensHoje[officialNome].outros++;
        }
      }
    });
  });

  colaboradoresConsiderados = colaboradoresConsiderados.filter(c => {
    const trips = contagemViagensHoje[c];
    // Colaborador não é elegível se:
    // 1. Tem 2 ou mais saídas para 'Sede' hoje.
    // 2. Tem 1 ou mais saídas para 'outros' setores hoje.
    if (trips.sede >= 2 || trips.outros >= 1) {
      return false;
    }
    return true;
  });

  // 3. Se não sobrar ninguém, exibe a mensagem e encerra
  if (colaboradoresConsiderados.length === 0) {
      nomeProximoEl.textContent = "Ninguém disponível";
      btnPularEl.style.display = 'none';
      btnRegistrarProximoEl.style.display = 'none';
      return;
  }

  // 4. Determina a data da última viagem (não-Sede) para cada colaborador considerado
  const ultimasViagens = {};
  colaboradoresConsiderados.forEach(nome => {
    const ultimaViagemNaoSede = dados.find(registro =>
      !LOCALIDADES_INVALIDAS_PARA_CONTAGEM.includes(registro.localidade) &&
      registro.localidade !== 'Sede' && // Excluir viagens para Sede
      registro.nomes.split(',').map(n => n.trim()).includes(nome)
    );
    ultimasViagens[nome] = ultimaViagemNaoSede ? new Date(ultimaViagemNaoSede.data) : new Date(0); // Usar new Date(0) para quem nunca teve uma viagem não-Sede
  });

  // 5. Encontra o(s) colaborador(es) com a data de última viagem mais antiga
  let dataMaisAntiga = new Date(); // Inicializa com a data atual (futuro)
  let empatadosPorData = [];

  colaboradoresConsiderados.forEach(nome => {
    if (ultimasViagens[nome] < dataMaisAntiga) {
      dataMaisAntiga = ultimasViagens[nome];
      empatadosPorData = [nome];
    } else if (ultimasViagens[nome].getTime() === dataMaisAntiga.getTime()) {
      empatadosPorData.push(nome);
    }
  });

  let vencedor = '';
  if (empatadosPorData.length === 0) {
    vencedor = 'N/A';
  } else if (empatadosPorData.length === 1) {
    vencedor = empatadosPorData[0];
  } else {
    // Desempate por ranking (menor pontuação)
    const contagem = {};
    const contagemSede = {};
    const nomeMap = new Map(empatadosPorData.map(c => [c.toLowerCase(), c]));

    empatadosPorData.forEach(c => {
      contagem[c] = 0;
      contagemSede[c] = 0;
    });

    dados.forEach(({ nomes, data, localidade }) => {
      if (new Date(data) >= umAnoAtras && !LOCALIDADES_INVALIDAS_PARA_CONTAGEM.includes(localidade)) {
        nomes.split(',').forEach(dbNome => {
          const officialNome = nomeMap.get(dbNome.trim().toLowerCase());
          if (officialNome && empatadosPorData.includes(officialNome)) { // Apenas para os empatados
            if (localidade === 'Sede') {
              contagemSede[officialNome]++;
            } else {
              contagem[officialNome]++;
            }
          }
        });
      }
    });

    for (const nome in contagemSede) {
      contagem[nome] += Math.floor(contagemSede[nome] / 2);
    }

    const minSaidas = Math.min(...Object.values(contagem));
    const empatadosPorRanking = empatadosPorData.filter(nome => contagem[nome] === minSaidas);

    if (empatadosPorRanking.length === 1) {
      vencedor = empatadosPorRanking[0];
    } else {
      // Desempate por menor número de idas à Sede
      const contagemSedeEmpatados = {};
      empatadosPorRanking.forEach(nome => {
        contagemSedeEmpatados[nome] = contagemSede[nome] || 0;
      });

      const minSede = Math.min(...Object.values(contagemSedeEmpatados));
      const menosIdasSede = empatadosPorRanking.filter(nome => contagemSedeEmpatados[nome] === minSede);

      // Se ainda houver empate, escolhe o primeiro da lista (ordem alfabética implícita ou ordem original)
      vencedor = menosIdasSede[0];
    }
  }

  // 7. Exibe o resultado
  nomeProximoEl.textContent = vencedor;
  if (vencedor && vencedor !== 'N/A' && vencedor !== "Ninguém disponível") {
    btnPularEl.classList.add('visible');
    btnRegistrarProximoEl.classList.add('visible');
  } else {
    btnPularEl.classList.remove('visible');
    btnRegistrarProximoEl.classList.remove('visible');
  }
}

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

async function carregarTermosEAssinatura() {
  const termosContentModal = document.querySelector('#modal-termos-assinatura .termos-content-modal');
  const assinaturaRegistradaImg = document.getElementById('assinatura-registrada');
  const statusAssinaturaP = document.getElementById('status-assinatura');

  // Carregar o conteúdo dos termos de uso do termos.html
  try {
    const response = await fetch('termos.html');
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    const termosContent = doc.querySelector('.termos-content'); // Seleciona o div com a classe termos-content
    if (termosContent) {
      termosContentModal.innerHTML = termosContent.innerHTML;
    } else {
      termosContentModal.innerHTML = '<p>Não foi possível carregar os termos de uso.</p>';
    }
  } catch (error) {
    console.error('Erro ao carregar termos.html:', error);
    termosContentModal.innerHTML = '<p>Erro ao carregar os termos de uso.</p>';
  }

  // Buscar a assinatura do usuário no Supabase
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('Erro ao obter usuário ou usuário não logado:', userError?.message);
    assinaturaRegistradaImg.style.display = 'none';
    statusAssinaturaP.textContent = 'Você precisa estar logado para ver sua assinatura.';
    return;
  }

  const { data, error } = await supabase
    .from('user_signatures')
    .select('signature_image')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Erro ao buscar assinatura:', error.message);
    assinaturaRegistradaImg.style.display = 'none';
    statusAssinaturaP.textContent = 'Erro ao carregar sua assinatura.';
  } else if (data && data.length > 0) {
    assinaturaRegistradaImg.src = data[0].signature_image;
    assinaturaRegistradaImg.style.display = 'block';
    statusAssinaturaP.textContent = 'Esta é a sua assinatura registrada.';
  } else {
    assinaturaRegistradaImg.style.display = 'none';
    statusAssinaturaP.textContent = 'Nenhuma assinatura encontrada para este usuário.';
  }
}

async function gerarPdfTermosEAssinatura() {
  let jsPDFConstructor;

  // Tenta obter jsPDF de window.jsPDF primeiro
  if (typeof window.jsPDF === 'function') {
    jsPDFConstructor = window.jsPDF;
  }
  // Se não encontrado, tenta window.jspdf.jsPDF (comum em algumas versões/builds)
  else if (typeof window.jspdf === 'object' && typeof window.jspdf.jsPDF === 'function') {
    jsPDFConstructor = window.jspdf.jsPDF;
  }

  // Se ainda não for uma função, registra um erro e retorna
  if (typeof jsPDFConstructor !== 'function') {
    console.error('Biblioteca jsPDF não encontrada ou não é um construtor. Certifique-se de que jspdf.umd.min.js está carregado corretamente.');
    console.error('Tipo de window.jsPDF:', typeof window.jsPDF);
    console.error('Tipo de window.jspdf:', typeof window.jspdf);
    if (window.jspdf) {
      console.error('Tipo de window.jspdf.jsPDF:', typeof window.jspdf.jsPDF);
    }
    showToast('Erro: Biblioteca jsPDF não carregada ou inválida. Verifique o console para mais detalhes.', 'error');
    return;
  }

  const doc = new jsPDFConstructor();

  const termosContentModal = document.querySelector('#modal-termos-assinatura .termos-content-modal');
  const assinaturaRegistradaImg = document.getElementById('assinatura-registrada');

  doc.setFontSize(16);
  doc.text('Termos de Uso e Assinatura Digital', 10, 10);

  let y = 20;

  // Adicionar o conteúdo dos termos
  const termosText = termosContentModal.innerText;
  const splitText = doc.splitTextToSize(termosText, 180); // 180 é a largura máxima da linha
  doc.setFontSize(10);
  doc.text(splitText, 10, y);
  y += (splitText.length * 7) + 10; // 7 é a altura da linha, 10 é um espaçamento extra

  // Adicionar a assinatura
  if (assinaturaRegistradaImg.src && assinaturaRegistradaImg.style.display !== 'none') {
    doc.setFontSize(12);
    doc.text('Sua Assinatura Registrada:', 10, y);
    y += 10;

    const imgData = assinaturaRegistradaImg.src;
    const imgWidth = 60; // Largura desejada da imagem no PDF
    const imgHeight = (assinaturaRegistradaImg.naturalHeight * imgWidth) / assinaturaRegistradaImg.naturalWidth;

    // Verificar se a imagem cabe na página atual, senão adicionar nova página
    if (y + imgHeight > doc.internal.pageSize.height - 20) { // 20 de margem inferior
      doc.addPage();
      y = 10; // Resetar y para o topo da nova página
    }

    doc.addImage(imgData, 'PNG', 10, y, imgWidth, imgHeight);
    y += imgHeight + 10;
  } else {
    doc.setFontSize(12);
    doc.text('Nenhuma assinatura encontrada para este usuário.', 10, y);
    y += 10;
  }

  doc.save('termos_e_assinatura.pdf');
}

// --- INICIALIZAÇÃO E EVENT LISTENERS ---

document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }

  // Função para atualizar a data e hora
  function updateDateTime() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    const dateTimeString = now.toLocaleDateString('pt-BR', options);
    const dateTimeElement = document.getElementById('current-datetime');
    if (dateTimeElement) {
      dateTimeElement.textContent = dateTimeString;
    }
  }

  // Chama a função uma vez para exibir imediatamente e depois a cada segundo
  updateDateTime();
  setInterval(updateDateTime, 1000);

  // preencherSelectsColaboradores(); // This is now handled by dashboard.js for its specific select
  await carregarTudo();

  // Evento para o botão Pular
  btnPularEl.addEventListener('click', () => {
    const proximoColaborador = proximoColaboradorEl.textContent.trim();
    if (proximoColaborador && proximoColaborador !== 'N/A' && proximoColaborador !== 'Ninguém disponível') {
      colaboradorParaPular = proximoColaborador;
      populateColaboradorTrocaVezSelect(proximoColaborador);
      openModal(document.getElementById('modal-pular-motivo'));
    } else {
      showToast('Não há colaborador para remanejar a saída.', 'info');
    }
  });

  function populateColaboradorTrocaVezSelect(colaboradorAtual) {
    const selectEl = document.getElementById('colaborador-troca-vez');
    selectEl.innerHTML = '<option value="">-- Selecione --</option>';
    TODOS_COLABORADORES.forEach(colaborador => {
      if (colaborador !== colaboradorAtual) {
        const option = document.createElement('option');
        option.value = colaborador;
        option.textContent = colaborador;
        selectEl.appendChild(option);
      }
    });
  }

  // Eventos de clique para abrir modais
  btnVerTermos.addEventListener('click', async () => {
    await carregarTermosEAssinatura();
    openModal(document.getElementById('modal-termos-assinatura'));
  });

  // Evento para o botão Download Termos e Assinatura (PDF)
  btnDownloadTermosAssinatura.addEventListener('click', gerarPdfTermosEAssinatura);
  
  btnConfigAdmin.addEventListener('click', () => {
    // Registro Direto: Não é mais necessária senha para acesso administrativo.
    // O acesso é direto para fins de registro de serviço.
    modoAdmin = true;
    colaboradoresSelecionados.clear();
    document.querySelectorAll('.botao-colaborador.selecionado').forEach(btn => btn.classList.remove('selecionado'));
    openModal(document.getElementById('modal-registrar-servico'));
  });

  btnRegistrarProximoEl.addEventListener('click', () => {
    const proximoColaborador = proximoColaboradorEl.textContent.trim();
    if (proximoColaborador && proximoColaborador !== 'N/A' && proximoColaborador !== 'Ninguém disponível') {
      colaboradoresSelecionados.clear();
      colaboradoresSelecionados.add(proximoColaborador);
      document.querySelectorAll('.botao-colaborador').forEach(btn => {
        if (btn.dataset.nome === proximoColaborador) {
          btn.classList.add('selecionado');
        } else {
          btn.classList.remove('selecionado');
        }
      });
      openModal(document.getElementById('modal-registrar-servico'));
    }
  });

  // Seleção de colaboradores no modal de serviço
  colaboradoresDiv?.addEventListener('click', (event) => {
    if (event.target.classList.contains('botao-colaborador')) {
      const nome = event.target.dataset.nome;

      if (event.target.classList.contains('ausente-modal')) {
        alert(`Este colaborador não pode ser selecionado pois está com falta registrada para hoje.`);
        return;
      }

      // Se estiver no modo admin, a seleção é livre
      if (modoAdmin) {
        event.target.classList.toggle('selecionado');
        if (colaboradoresSelecionados.has(nome)) {
          colaboradoresSelecionados.delete(nome);
        } else {
          colaboradoresSelecionados.add(nome);
        }
        return; // Encerra a função para não aplicar a lógica padrão
      }

      // Lógica padrão para seleção
      const isSuggested = (nome === proximoColaboradorEl.textContent.trim());
      const isSelected = colaboradoresSelecionados.has(nome);

      if (isSuggested && !isSelected) {
        // Se é o sugerido e não está selecionado, seleciona
        event.target.classList.add('selecionado');
        colaboradoresSelecionados.add(nome);
      } else if (isSuggested && isSelected) {
        // Se é o sugerido e já está selecionado, abre o modal para pular
        colaboradorParaPular = nome;
        populateColaboradorTrocaVezSelect(colaboradorParaPular);
        openModal(document.getElementById('modal-pular-motivo'));
      } else {
        // Para os demais, a seleção é livre
        event.target.classList.toggle('selecionado');
        if (isSelected) {
          colaboradoresSelecionados.delete(nome);
        } else {
          colaboradoresSelecionados.add(nome);
        }
      }
    }
  });

  // Submissão de formulários
  formSaida?.addEventListener('submit', registrarSaida);

  // Event listeners para o modal de alerta de registro recente
  btnAlertaRegistroRecenteSim.addEventListener('click', () => {
    console.log('Botão SIM clicado. Tentando registrar novamente...');
    closeModal(modalAlertaRegistroRecente);
    if (pendingRegistration) {
      // Chama a função de registro novamente, forçando o registro
      registrarSaida(new Event('submit'), true); 
    }
  });

  btnAlertaRegistroRecenteNao.addEventListener('click', () => {
    console.log('Botão NÃO clicado. Cancelando registro.');
    closeModal(modalAlertaRegistroRecente);
    pendingRegistration = null; // Cancela o registro pendente
    showToast('Registro cancelado.', 'info');
  });

  document.getElementById('form-pular-motivo')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    // A submissão real será feita pelos botões, este listener apenas previne o comportamento padrão
  });

  document.getElementById('btn-confirmar-troca')?.addEventListener('click', async () => {
    await handleRemanejarSaida();
  });

  async function handleRemanejarSaida() {
    const observacaoText = document.getElementById('observacao-pular-trocar').value;
    const proximoColaborador = proximoColaboradorEl.textContent.trim();
    const colaboradorTrocaVezEl = document.getElementById('colaborador-troca-vez');
    const colaboradorSelecionadoParaTroca = colaboradorTrocaVezEl.value;

    const localidadeRemanejamento = document.getElementById('localidade-remanejamento').value;

    if (!colaboradorSelecionadoParaTroca) {
      showToast('Selecione um colaborador para remanejar a saída.', 'error');
      return;
    }

    const nomesParaHistorico = colaboradorSelecionadoParaTroca; // O colaborador que recebeu a vez
    const localidadeParaHistorico = localidadeRemanejamento; // A localidade de destino
    const observacaoBase = `${proximoColaborador} cedeu a vez a ${colaboradorSelecionadoParaTroca}`;
    const finalObservacao = observacaoText ? `${observacaoText} (${observacaoBase})` : observacaoBase;

    const { error } = await supabase.from('historico').insert([{
      nomes: nomesParaHistorico,
      localidade: localidadeParaHistorico,
      data: new Date().toISOString(),
      observacao: finalObservacao
    }]);

    if (error) {
      console.error('Erro ao registrar o remanejamento de saída:', error.message);
      showToast('Erro ao registrar o remanejamento de saída: ' + error.message, 'error');
    } else {
      showToast('Remanejamento de saída registrado com sucesso!', 'success');
      document.getElementById('form-pular-trocar-vez').reset();
      closeModal(document.getElementById('modal-pular-motivo'));
      
      const btnColaborador = document.querySelector(`.botao-colaborador[data-nome="${proximoColaborador}"]`);
      if (btnColaborador) {
        btnColaborador.classList.remove('selecionado');
        colaboradoresSelecionados.delete(proximoColaborador);
      }
      colaboradorParaPular = ''; // Resetar após a ação
      await carregarTudo();
    }
  }

  // Lógica das abas principais
  document.querySelectorAll('.tab-link').forEach(tabLink => {
    tabLink.addEventListener('click', function() {
      const tabId = this.dataset.tab;

      tabContentsMain.forEach(content => {
        content.classList.remove('active');
      });
      document.querySelectorAll('.tab-link').forEach(link => {
        link.classList.remove('active');
      });

      document.getElementById(tabId).classList.add('active');
      this.classList.add('active');

      if (tabId === 'tab-sao-domingos') atualizarSaoDomingosInfo(historicoDados);
      if (tabId === 'tab-resumo-saida') atualizarResumoSaida(historicoDados);
      if (tabId === 'tab-proximo') {
        colaboradoresPulados.clear();
        carregarTudo();
      }
      
    });
  });

  document.getElementById('tab-link-proximo')?.click();

  // Event listener for all modal close buttons
  document.querySelectorAll('.modal-close').forEach(button => {
    button.addEventListener('click', () => {
      const modal = button.closest('.modal');
      if (modal) {
        closeModal(modal);
        if (modal.id === 'modal-registrar-servico') {
          modoAdmin = false; // Reseta o modo admin ao fechar o modal de registro
        }
      }
    });
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