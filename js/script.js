import { supabase } from './supabaseClient.js';

// --- ELEMENTOS DO DOM ---
const proximoColaboradorEl = document.getElementById('nome-proximo');
const listaRankingEl = document.getElementById('lista-ranking');
const listaHistoricoEl = document.getElementById('lista-historico');
const formSaida = document.getElementById('form-saida');
const colaboradoresDiv = document.getElementById('colaboradores');
const localidadeSelect = document.getElementById('localidade');
const observacaoSaidaInput = document.getElementById('observacao-saida');
const metricasContentEl = document.getElementById('metricas-content');
const toastMessageEl = document.getElementById('toast-message');
const notificationSound = new Audio('js/notification.mp3'); // Adiciona o som de notificação

const btnHistoricoGeral = document.getElementById('btn-historico-geral');
const btnAnaliseMicro = document.getElementById('btn-analise-micro');
const btnInformacoes = document.getElementById('btn-informacoes');
const btnAnaliseColaborador = document.getElementById('btn-analise-colaborador');
const btnConfigAdmin = document.getElementById('btn-selecao-manual');
const btnPularEl = document.getElementById('btn-pular');
const btnRegistrarProximoEl = document.getElementById('btn-registrar-proximo');
const btnHistoricoColaborador = document.getElementById('btn-historico-colaborador');
const btnRegistrarPonto = document.getElementById('btn-registrar-ponto');

const selectColaboradorHistorico = document.getElementById('select-colaborador-historico');
const listaHorasExtras = document.getElementById('lista-horas-extras');
const listaFaltas = document.getElementById('lista-faltas');
const listaRecusas = document.getElementById('lista-recusas');
const listaUltimosSetores = document.getElementById('lista-ultimos-setores');
const listaHorasDevidas = document.getElementById('lista-horas-devidas'); // Adicionado para exibir horas devidas no histórico do colaborador

const tabContentsMain = document.querySelectorAll('.tab-content');

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
  preencherSelectsColaboradores();
  await carregarProximoColaborador();
}

function preencherSelectsColaboradores() {
  const optionsHtml = TODOS_COLABORADORES.map(nome => `<option value="${nome}">${nome}</option>`).join('');
  if (selectColaboradorHistorico) selectColaboradorHistorico.innerHTML = '<option value="" disabled selected>Selecione um colaborador</option>' + optionsHtml;
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

async function registrarSaida(event) {
  event.preventDefault();

  const nomes = Array.from(colaboradoresSelecionados).join(', ');
  const localidade = localidadeSelect.value;
  const observacao = observacaoSaidaInput.value;

  let observacaoFinal = observacao;
  if (modoAdmin) {
    observacaoFinal = observacaoFinal ? `${observacaoFinal} (Registro Direto)` : 'Registro Direto';
  }

  if (colaboradoresSelecionados.size === 0) {
    showToast('Selecione pelo menos um colaborador.', 'error');
    return;
  }

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
  }
}

async function carregarHistoricoColaborador(colaboradorNome) {
  // Horas Extras
  const { data: horasExtras, error: errorHorasExtras } = await supabase
    .from('horas_extras')
    .select('*')
    .eq('colaborador_nome', colaboradorNome)
    .order('data', { ascending: false });

  if (errorHorasExtras) {
    console.error('Erro ao carregar horas extras:', errorHorasExtras);
    listaHorasExtras.innerHTML = '<li>Erro ao carregar horas extras.</li>';
  } else {
    if (horasExtras.length > 0) {
      listaHorasExtras.innerHTML = horasExtras.map(he =>
        `<li>${new Date(he.data).toLocaleDateString('pt-BR')} - ${formatDecimalToHoursMinutes(he.horas_excedentes)} (${he.justificativa})</li>`
      ).join('');
    } else {
      listaHorasExtras.innerHTML = '<li>Nenhuma hora extra registrada.</li>';
    }
  }

  // Faltas
  const { data: faltas, error: errorFaltas } = await supabase
    .from('registros_ponto')
    .select('*')
    .eq('colaborador_nome', colaboradorNome)
    .order('data', { ascending: false });

  if (errorFaltas) {
    console.error('Erro ao carregar faltas:', errorFaltas);
    listaFaltas.innerHTML = '<li>Erro ao carregar faltas.</li>';
  } else {
    if (faltas.length > 0) {
      listaFaltas.innerHTML = faltas.map(f =>
        `<li>${new Date(f.data).toLocaleDateString('pt-BR')} - ${f.tipo} (${f.observacao || 'N/A'})</li>`
      ).join('');
    } else {
      listaFaltas.innerHTML = '<li>Nenhuma falta registrada.</li>';
    }
  }

  // Horas Devidas
  const { data: horasDevidas, error: errorHorasDevidas } = await supabase
    .from('horas_devidas')
    .select('*')
    .eq('colaborador_nome', colaboradorNome)
    .order('data', { ascending: false });

  if (errorHorasDevidas) {
    console.error('Erro ao carregar horas devidas:', errorHorasDevidas);
    listaHorasDevidas.innerHTML = '<li>Erro ao carregar horas devidas.</li>';
  } else {
    if (horasDevidas.length > 0) {
      listaHorasDevidas.innerHTML = horasDevidas.map(hd =>
        `<li>${new Date(hd.data).toLocaleDateString('pt-BR')} - ${formatDecimalToHoursMinutes(hd.quantidade)} (${hd.justificativa})</li>`
      ).join('');
    } else {
      listaHorasDevidas.innerHTML = '<li>Nenhuma hora devida registrada.</li>';
    }
  }

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
  atualizarRanking(historicoDados);
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

  const pontuacao = {};
  TODOS_COLABORADORES.forEach(c => { pontuacao[c] = 0; });

  const contagemSede = {};
  TODOS_COLABORADORES.forEach(c => { contagemSede[c] = 0; });

  const nomeMap = new Map(TODOS_COLABORADORES.map(c => [c.toLowerCase(), c]));

  filtrados.forEach(({ nomes, localidade }) => {
    const nomesArray = nomes.split(',').map(n => n.trim().toLowerCase());
    nomesArray.forEach(nome => {
      const officialNome = nomeMap.get(nome);
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

  // Atualiza os elementos na página principal
  const mostProactiveNameEl = document.querySelector('#most-proactive-display .proactive-name');
  const leastProactiveNameEl = document.querySelector('#least-proactive-display .proactive-name');

  if (ranking.length > 0) {
    mostProactiveNameEl.textContent = ranking[0][0];

    // Filtra Mikael para determinar o menos proativo real
    const rankingSemMikael = ranking.filter(([nome]) => nome !== 'Mikael');
    if (rankingSemMikael.length > 0) {
      leastProactiveNameEl.textContent = rankingSemMikael[rankingSemMikael.length - 1][0];
    } else {
      leastProactiveNameEl.textContent = 'N/A';
    }
  } else {
    mostProactiveNameEl.textContent = 'N/A';
    leastProactiveNameEl.textContent = 'N/A';
  }

  const table = document.createElement('table');
  table.className = 'data-table';
  table.innerHTML = `<thead><tr><th>Pos.</th><th>Nome</th><th>Total de Pontos</th></tr></thead>`;
  const tbody = document.createElement('tbody');
  ranking.forEach(([nome, qtd], index) => {
    const tr = document.createElement('tr');
    let positionHtml = `<td>${index + 1}º</td>`;
    let nameHtml = `<td>${nome}</td>`;

    if (nome === 'Mikael') {
      nameHtml = `<td>${nome} (ADM) <i class="fas fa-user-shield"></i></td>`;
      // Garante que Mikael não receba classes de baixa atuação ou menos proativo
      tr.classList.remove('least-proactive');
      tr.classList.remove('baixa-atuacao');
    } else if (index === 0) {
      tr.classList.add('most-proactive');
      positionHtml = `<td><i class="fas fa-trophy"></i> 1º</td>`;
    } else if (index === ranking.length - 1 && nome === leastProactiveNameEl.textContent) { // Último colocado (e não é Mikael)
      tr.classList.add('least-proactive');
      nameHtml = `<td>${nome} <i class="fas fa-bed"></i></td>`;
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
  const analiseContentEl = document.getElementById('analise-colaborador-content');
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
  TODOS_COLABORADORES.forEach(colaborador => {
    const option = document.createElement('option');
    option.value = colaborador;
    option.textContent = colaborador;
    selectColaboradorHistorico.appendChild(option);
  });
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

  addSection('Horas Extras', 'lista-horas-extras');
  addSection('Faltas', 'lista-faltas');
  addSection('Recusas de Serviço', 'lista-recusas');
  addSection('Últimos 10 Setores Visitados', 'lista-ultimos-setores');
  addSection('Horas Devidas', 'lista-horas-devidas');

  doc.save(`historico_${colaboradorNome}.pdf`);
}

// --- INICIALIZAÇÃO E EVENT LISTENERS ---

document.addEventListener('DOMContentLoaded', async () => {
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    window.location.href = "login.html";
  }

  preencherSelectsColaboradores();
  await carregarTudo();

  // Evento para o botão Pular
  btnPularEl.addEventListener('click', () => {
    const proximoColaborador = proximoColaboradorEl.textContent.trim();
    if (proximoColaborador && proximoColaborador !== 'N/A' && proximoColaborador !== 'Ninguém disponível') {
      colaboradorParaPular = proximoColaborador;
      openModal(document.getElementById('modal-pular-motivo'));
    } else {
      showToast('Não há colaborador para pular.', 'info');
    }
  });

  // Eventos de clique para abrir modais
  btnHistoricoGeral.addEventListener('click', () => {
    exibirHistorico(historicoDados);
    openModal(document.getElementById('modal-historico-geral'));
  });
  btnAnaliseMicro.addEventListener('click', () => {
    atualizarAnaliseSetor(historicoDados);
    openModal(document.getElementById('modal-metricas'));
  });
  btnInformacoes.addEventListener('click', () => {
    openModal(document.getElementById('modal-informacoes'));
  });
  btnAnaliseColaborador.addEventListener('click', () => {
    atualizarAnaliseColaborador(historicoDados);
    openModal(document.getElementById('modal-analise-colaborador'));
  });
  btnHistoricoColaborador.addEventListener('click', () => {
    abrirModalHistoricoColaborador();
  });
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

  document.getElementById('form-pular-motivo')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const motivoText = document.getElementById('pular-motivo-texto').value;
    if (!motivoText.trim()) {
      alert('É obrigatório descrever o motivo.');
      return;
    }
    const { error } = await supabase.from('historico').insert([{
      nomes: colaboradorParaPular,
      localidade: 'PULOU A VEZ',
      data: new Date().toISOString(),
      observacao: motivoText
    }]);
    if (error) {
      alert('Erro ao registrar o motivo: ' + error.message);
    } else {
      showToast('Motivo registrado. Pulando colaborador...');
      document.getElementById('form-pular-motivo').reset();
      closeModal(document.getElementById('modal-pular-motivo'));
      colaboradoresPulados.add(colaboradorParaPular);
      const btnSkipped = document.querySelector(`.botao-colaborador[data-nome="${colaboradorParaPular}"]`);
      if (btnSkipped) {
        btnSkipped.classList.remove('selecionado');
        colaboradoresSelecionados.delete(colaboradorParaPular);
      }
      colaboradorParaPular = '';
      await carregarTudo();
    }
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
      if (tabId === 'tab-ranking') atualizarRanking(historicoDados);
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