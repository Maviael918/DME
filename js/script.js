import { supabase } from './supabaseClient.js';

// --- ELEMENTOS DO DOM ---


const listaHistoricoEl = document.getElementById('lista-historico'); // Still needed for exibirHistorico
const formSaida = document.getElementById('form-saida');
const colaboradoresDiv = document.getElementById('colaboradores');
const localidadeSelect = document.getElementById('localidade');
const observacaoSaidaInput = document.getElementById('observacao-saida');
const metricasContentEl = document.getElementById('metricas-content'); // Still needed for atualizarAnaliseSetor
const toastMessageEl = document.getElementById('toast-message');
const notificationSound = new Audio('js/notification.mp3'); // Adiciona o som de notificação

const btnConfigAdmin = document.getElementById('btn-selecao-manual');

const btnRegistrarPonto = document.getElementById('btn-registrar-ponto'); // Still needed for ponto.html link

const btnVerTermos = document.getElementById('btn-ver-termos'); // Novo elemento
const btnDownloadTermosAssinatura = document.getElementById('btn-download-termos-assinatura'); // Novo elemento

const tabContentsMain = document.querySelectorAll('.tab-content');

// Novos elementos para o modal de alerta de registro recente
const modalAlertaRegistroRecente = document.getElementById('modal-alerta-registro-recente');
const alertaRegistroRecenteMensagem = document.getElementById('alerta-registro-recente-mensagem');
const btnAlertaRegistroRecenteSim = document.getElementById('btn-alerta-registro-recente-sim');
const btnAlertaRegistroRecenteNao = document.getElementById('btn-alerta-registro-recente-nao');


const btnLogout = document.getElementById('btn-logout'); // Novo botão de logout

// --- NOVOS ELEMENTOS PARA GERENCIAMENTO DE CARDS ---
const tabLinkGerenciarCards = document.getElementById('tab-link-gerenciar-cards');
const addCardForm = document.getElementById('addCardForm');
const cardTitleInput = document.getElementById('cardTitle');
const cardDescriptionInput = document.getElementById('cardDescription');
const cardImageUrlInput = document.getElementById('cardImageUrl');
const cardOrderInput = document.getElementById('cardOrder');
const cardIsActiveCheckbox = document.getElementById('cardIsActive');
const cardMessageEl = document.getElementById('cardMessage');
const cardsListDiv = document.getElementById('cardsList');

// --- DADOS GLOBAIS ---
let colaboradoresSelecionados = new Set();
let historicoDados = [];

let colaboradoresAusentesHoje = new Set();
let modoAdmin = false;

const TODOS_COLABORADORES = ['Maviael', 'Raminho', 'Matheus', 'Isaac', 'Mikael'];
const COLABORADORES_ROTACAO = ['Maviael', 'Raminho', 'Matheus', 'Isaac'];
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
  // A lógica de carregarProximoColaborador foi movida para atualizarProximo
}

function preencherSelectsColaboradores() {
  // This function is now primarily used by dashboard.js, but keeping a stub here if any painel.html specific select needs it.
  // For now, it's not directly called in painel.html's context after moving.
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

  // Verifica registros no mesmo setor (exceto Sede) no mesmo dia, apenas se não for um registro forçado
  if (!forceRegistration && localidade !== 'Sede') {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Define para o início do dia
    console.log(`Verificando registros para o setor ${localidade} hoje. Início do dia:`, hoje.toISOString());

    const { data: registrosDoDia, error: erroRegistros } = await supabase
      .from('historico')
      .select('nomes, localidade')
      .gte('data', hoje.toISOString()) // Registros a partir do início do dia de hoje
      .eq('localidade', localidade);   // Para a mesma localidade

    if (erroRegistros) {
      console.error('Erro ao verificar registros do dia:', erroRegistros);
      showToast('Erro ao verificar registros do dia: ' + erroRegistros.message, 'error');
      return;
    }

    console.log(`Registros encontrados para o setor ${localidade} hoje:`, registrosDoDia);

    let colaboradoresJaRegistrados = [];
    if (registrosDoDia && registrosDoDia.length > 0) {
      registrosDoDia.forEach(registro => {
        const nomesNoRegistro = registro.nomes.split(',').map(n => n.trim());
        const nomesComuns = Array.from(colaboradoresSelecionados).filter(selecionado => nomesNoRegistro.includes(selecionado));
        if (nomesComuns.length > 0) {
          colaboradoresJaRegistrados.push(...nomesComuns);
        }
      });
    }

    // Se encontramos algum colaborador que já saiu para o mesmo setor hoje
    if (colaboradoresJaRegistrados.length > 0) {
      const nomesUnicos = [...new Set(colaboradoresJaRegistrados)];
      alertaRegistroRecenteMensagem.innerHTML = `O(s) colaborador(es) <strong>${nomesUnicos.join(', ')}</strong> já foi(ram) registrado(s) para o setor <strong>${localidade}</strong> hoje. Deseja continuar?`;
      openModal(modalAlertaRegistroRecente);
      pendingRegistration = { nomes, localidade, observacao: observacaoFinal };
      console.log('Modal de alerta de registro no mesmo setor aberto.');
      return; // Interrompe o registro até a confirmação
    }
  }

  // Se chegou aqui, ou não há registro recente, ou o registro foi forçado
  console.log('Prosseguindo com o registro...');
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user ? user.email : 'desconhecido';
    const observacaoComRegistro = `${observacaoFinal} (Registrado por: ${userEmail})`.trim();

    const { error } = await supabase
      .from('historico')
      .insert([{ nomes, localidade, observacao: observacaoComRegistro, data: new Date().toISOString() }]);

    if (error) {
      console.error('Supabase insert error:', error);
      showToast('Falha ao inserir no banco de dados: ' + error.message, 'error');
      throw new Error('Falha ao inserir no banco de dados: ' + error.message);
    }

    showToast('Serviço registrado com sucesso!', 'success');

    // Removido: localStorage.setItem('ultima_saida_colaborador', proximoColaboradorSugerido);
    // Removido: localStorage.removeItem('ultimo_pulado_colaborador');

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
  
  
  atualizarStatusModalServico();
  
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

async function handleBackup() {
  try {
    const { data: historico, error } = await supabase
      .from('historico')
      .select('*')
      .order('data', { ascending: false });

    if (error) {
      console.error('Erro ao buscar histórico:', error);
      showToast('Erro ao buscar histórico para backup.', 'error');
      return;
    }

    if (!historico || historico.length === 0) {
      showToast('Não há dados de histórico para fazer backup.', 'info');
      return;
    }

    const csv = convertToCSV(historico);
    downloadCSV(csv, 'backup_historico.csv');

  } catch (error) {
    console.error('Erro ao fazer backup:', error);
    showToast('Ocorreu um erro ao gerar o backup.', 'error');
  }
}

function convertToCSV(data) {
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(header => JSON.stringify(row[header])).join(','));
  return [headers.join(','), ...rows].join('\n');
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const user = session.user;
  const userGreetingEl = document.getElementById('user-greeting');
  if (userGreetingEl && user && user.email) {
    const userEmail = user.email;
    const userName = userEmail.split('@')[0]; // Extrai o nome do email
    userGreetingEl.innerHTML = `<i class="fa-solid fa-user"></i> Olá, ${userName}!`;

    // --- VERIFICAÇÃO DE ACESSO ADMINISTRATIVO ---
    // Busca o perfil do usuário para verificar a função
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      console.error('Acesso negado: Usuário não é administrador ou perfil não encontrado.', profileError);
      // Redireciona para uma página de acesso negado ou para o login
      // Ou desabilita/esconde elementos administrativos
      alert('Acesso negado. Você não tem permissão para acessar esta área.');
      window.location.href = "login.html"; // Redireciona para o login
      return; // Impede o carregamento restante do painel
    }
    // Se chegou aqui, o usuário é admin e pode continuar
    console.log('Acesso administrativo concedido para:', user.email);
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

  // --- REALTIME SUBSCRIPTION ---
  // Função para ouvir mudanças na tabela de histórico
  const ouvirMudancasHistorico = () => {
    supabase
      .channel('historico_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'historico' }, payload => {
        console.log('Novo registro inserido:', payload.new);
        showToast('Novo registro de serviço recebido!', 'info');
        // Recarrega todos os dados para manter a interface sincronizada
        carregarTudo();
      })
      .subscribe();
  };

  // Inicia a escuta por mudanças em tempo real
  ouvirMudancasHistorico();


  

  

  // Eventos de clique para abrir modais
  btnVerTermos.addEventListener('click', async () => {
    await carregarTermosEAssinatura();
    openModal(document.getElementById('modal-termos-assinatura'));
  });

  // Evento para o botão Download Termos e Assinatura (PDF)
  btnDownloadTermosAssinatura.addEventListener('click', gerarPdfTermosEAssinatura);

  const btnBackup = document.getElementById('btn-backup');
  if (btnBackup) {
    btnBackup.addEventListener('click', handleBackup);
  }
  
  btnConfigAdmin.addEventListener('click', () => {
    // Registro Direto: Não é mais necessária senha para acesso administrativo.
    // O acesso é direto para fins de registro de serviço.
    modoAdmin = true;
    colaboradoresSelecionados.clear();
    document.querySelectorAll('.botao-colaborador.selecionado').forEach(btn => btn.classList.remove('selecionado'));
    openModal(document.getElementById('modal-registrar-servico'));
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

      
      if (tabId === 'tab-resumo-saida') 
      
      
      // Se a aba de gerenciar cards for ativada, carrega a lista
      if (tabId === 'tab-gerenciar-cards') {
          loadCards();
      }
      
    });
  });

  document.getElementById('tab-link-gerenciar-cards')?.click(); // Ativa a aba "Gerenciar Cards" por padrão

  

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

  

  // --- LÓGICA DE GERENCIAMENTO DE CARDS ---
  if (addCardForm) {
      addCardForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const title = cardTitleInput.value;
          const description = cardDescriptionInput.value;
          const imageUrl = cardImageUrlInput.value;
          const order = parseInt(cardOrderInput.value);
          const isActive = cardIsActiveCheckbox.checked;

          cardMessageEl.textContent = ''; // Limpa mensagens de erro anteriores

          const { data, error } = await supabase
              .from('app_cards')
              .insert([
                  { title: title, description: description, image_url: imageUrl, display_order: order, is_active: isActive }
              ]);

          if (error) {
              cardMessageEl.textContent = `Erro ao adicionar card: ${error.message}`;
              console.error('Erro ao adicionar card:', error);
          } else {
              cardMessageEl.textContent = 'Card adicionado com sucesso!';
              addCardForm.reset();
              loadCards(); // Recarregar a lista de cards
          }
      });
  }

  const loadCards = async () => {
      const { data, error } = await supabase
          .from('app_cards')
          .select('id, title, description, image_url, display_order, is_active')
          .order('display_order', { ascending: true });

      if (error) {
          cardsListDiv.innerHTML = `Erro ao carregar cards: ${error.message}`;
          console.error('Erro ao carregar cards:', error);
      } else {
          cardsListDiv.innerHTML = '';
          if (data.length === 0) {
              cardsListDiv.innerHTML = '<p>Nenhum card cadastrado ainda.</p>';
          } else {
              data.forEach(card => {
                  const cardElement = document.createElement('div');
                  cardElement.className = 'card-item'; // Você pode estilizar isso no CSS
                  cardElement.innerHTML = `
                      <h4>${card.title}</h4>
                      <p>${card.description || ''}</p>
                      ${card.image_url ? `<img src="${card.image_url}" alt="${card.title}" style="max-width: 100px; height: auto;">` : ''}
                      <p>Ordem: ${card.display_order} | Ativo: ${card.is_active ? 'Sim' : 'Não'}</p>
                      <button class="btn btn-sm btn-edit" data-id="${card.id}">Editar</button>
                      <button class="btn btn-sm btn-delete" data-id="${card.id}">Excluir</button>
                  `;
                  cardsListDiv.appendChild(cardElement);
              });

              // Adicionar listeners para botões de editar e excluir
              cardsListDiv.querySelectorAll('.btn-edit').forEach(button => {
                  button.addEventListener('click', (e) => {
                      const cardId = e.target.dataset.id;
                      // Lógica de edição (abrir modal de edição, preencher formulário)
                      alert(`Editar card com ID: ${cardId}`);
                  });
              });
              cardsListDiv.querySelectorAll('.btn-delete').forEach(button => {
                  button.addEventListener('click', async (e) => {
                      const cardId = e.target.dataset.id;
                      if (confirm('Tem certeza que deseja excluir este card?')) {
                          const { error: deleteError } = await supabase
                              .from('app_cards')
                              .delete()
                              .eq('id', cardId);
                          
                          if (deleteError) {
                              alert(`Erro ao excluir card: ${deleteError.message}`);
                              console.error('Erro ao excluir card:', deleteError);
                          } else {
                              alert('Card excluído com sucesso!');
                              loadCards(); // Recarregar a lista
                          }
                      }
                  });
              });
          }
      }
  };

  // --- LÓGICA DE LOGOUT ---
  if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
          const { error } = await supabase.auth.signOut();
          if (error) {
              console.error('Erro ao fazer logout:', error.message);
              showToast('Erro ao fazer logout. Tente novamente.', 'error');
          } else {
              showToast('Logout realizado. Redirecionando para o login...', 'info');
              window.location.href = 'login.html'; // Redireciona para a página de login
          }
      });
  }
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