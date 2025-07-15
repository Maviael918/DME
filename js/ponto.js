import { supabase } from './supabaseClient.js';

// --- CONSTANTES GLOBAIS ---
const TODOS_COLABORADORES = ['Maviael', 'Raminho', 'Bruninho', 'Matheus', 'Isaac', 'Mikael'];

// --- ELEMENTOS DO DOM ---
const toastMessageEl = document.getElementById('toast-message');
const notificationSound = new Audio('js/notification.mp3'); // Adiciona o som de notificação

const mainActionButtons = document.querySelectorAll('.top-actions .btn');
const contentSections = document.querySelectorAll('.content-section');

const formPonto = document.getElementById('form-ponto');
const pontoColaboradorSelect = document.getElementById('ponto-colaborador');
const pontoDataInput = document.getElementById('ponto-data');
const pontoTipoSelect = document.getElementById('ponto-tipo');
const pontoObsTextarea = document.getElementById('ponto-obs');



const formHorasDevidas = document.getElementById('form-horas-devidas');
const devidasColaboradorSelect = document.getElementById('devidas-colaborador');
const devidasDataInput = document.getElementById('devidas-data');
const devidasQuantidadeInput = document.getElementById('devidas-quantidade');
const devidasJustificativaInput = document.getElementById('devidas-justificativa');

const bancoHorasColaboradorSelect = document.getElementById('banco-horas-colaborador-select');
const btnVerBancoHoras = document.getElementById('btn-ver-banco-horas');
const bancoHorasDetalhes = document.getElementById('banco-horas-detalhes');

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

async function registrarPonto(event) {
  event.preventDefault();
  const colaborador_nome = pontoColaboradorSelect.value;
  const data = pontoDataInput.value;
  const tipo = pontoTipoSelect.value;
  const observacao = pontoObsTextarea.value;

  console.log('Attempting to register ponto with:', { colaborador_nome, data, tipo, observacao });
  try {
    const { data: newPonto, error } = await supabase
      .from('registros_ponto')
      .insert([{ colaborador_nome, data, tipo, observacao }]);

    if (error) {
      console.error('Supabase error during ponto registration:', error);
      throw error;
    }

    console.log('Ponto registered successfully:', newPonto);
    showToast('Registro de ponto salvo com sucesso!', 'success');
    formPonto.reset();
  } catch (error) {
    console.error('Catch block error during ponto registration:', error);
    showToast('Erro ao salvar registro de ponto: ' + error.message, 'error');
  }
}



async function lancarHorasDevidas(event) {
  event.preventDefault();
  const colaborador_nome = devidasColaboradorSelect.value;
  const data = devidasDataInput.value;
  const quantidade = parseFloat(devidasQuantidadeInput.value);
  const justificativa = devidasJustificativaInput.value;

  if (isNaN(quantidade) || quantidade <= 0) {
    showToast('Por favor, insira um valor válido para horas devidas.', 'error');
    return;
  }

  console.log('Attempting to launch horas devidas with:', { colaborador_nome, data, quantidade, justificativa });
  try {
    const { data: newHorasDevidas, error } = await supabase
      .from('horas_devidas')
      .insert([{ colaborador_nome, data, quantidade, justificativa }]);

    if (error) {
      console.error('Supabase error during horas devidas launch:', error);
      throw error;
    }

    console.log('Horas devidas launched successfully:', newHorasDevidas);
    showToast('Horas devidas registradas com sucesso!', 'success');
    formHorasDevidas.reset();
  } catch (error) {
    console.error('Catch block error during horas devidas launch:', error);
    showToast('Erro ao registrar horas devidas: ' + error.message, 'error');
  }
}

async function carregarBancoHorasColaborador() {
  const colaboradorNome = bancoHorasColaboradorSelect.value;
  if (!colaboradorNome) {
    bancoHorasDetalhes.innerHTML = '<p>Selecione um colaborador para ver o banco de horas.</p>';
    return;
  }

  try {
    const { data: horasExtras, error: errorHorasExtras } = await supabase
      .from('horas_extras')
      .select('horas_excedentes')
      .eq('colaborador_nome', colaboradorNome);

    const { data: horasDevidas, error: errorHorasDevidas } = await supabase
      .from('horas_devidas')
      .select('quantidade')
      .eq('colaborador_nome', colaboradorNome);

    if (errorHorasExtras || errorHorasDevidas) {
      console.error('Erro ao carregar banco de horas:', errorHorasExtras || errorHorasDevidas);
      bancoHorasDetalhes.innerHTML = '<p>Erro ao carregar banco de horas.</p>';
      return;
    }

    let totalHorasExtras = horasExtras.reduce((sum, h) => sum + h.horas_excedentes, 0);
    let totalHorasDevidas = horasDevidas.reduce((sum, h) => sum + h.quantidade, 0);

    let saldo = totalHorasExtras - totalHorasDevidas;

    bancoHorasDetalhes.innerHTML = `
      <h4>Saldo de Horas para ${colaboradorNome}:</h4>
      <p>Horas Extras Acumuladas: ${formatDecimalToHoursMinutes(totalHorasExtras)}</p>
      <p>Horas Devidas Acumuladas: ${formatDecimalToHoursMinutes(totalHorasDevidas)}</p>
      <p><strong>Saldo Total: ${formatDecimalToHoursMinutes(saldo)}</strong></p>
    `;

  } catch (error) {
    showToast('Erro ao carregar banco de horas: ' + error.message, 'error');
    console.error('Erro ao carregar banco de horas:', error);
  }
}

// --- INICIALIZAÇÃO E EVENT LISTENERS ---

document.addEventListener('DOMContentLoaded', () => {
  // Autenticação
  supabase.auth.getUser().then(({ data }) => {
    if (!data.user) {
      window.location.href = "login.html";
    }
  });

  // Popula os selects de colaboradores
  popularColaboradores(pontoColaboradorSelect);
  
  popularColaboradores(devidasColaboradorSelect);
  popularColaboradores(bancoHorasColaboradorSelect);

  // Define a data atual
  const today = new Date().toISOString().split('T')[0];
  if (pontoDataInput) pontoDataInput.value = today;
  
  if (devidasDataInput) devidasDataInput.value = today;

  // Lógica para exibir/ocultar seções
  mainActionButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetSectionId = button.id.replace('btn-show-', 'section-');

      contentSections.forEach(section => {
        section.classList.remove('active');
      });

      document.getElementById(targetSectionId).classList.add('active');

      // Ações específicas ao exibir a seção
      } else if (targetSectionId === 'section-banco-horas') {
        // Opcional: carregar banco de horas automaticamente ao selecionar colaborador
        // carregarBancoHorasColaborador();
      }
    });
  });

  

  // Submissão de formulários
  formPonto?.addEventListener('submit', registrarPonto);
  
  formHorasDevidas?.addEventListener('submit', lancarHorasDevidas);

  // Evento para ver banco de horas
  btnVerBancoHoras?.addEventListener('click', carregarBancoHorasColaborador);

  // Ativa a primeira seção por padrão
  document.getElementById('section-registrar-ponto').classList.add('active');
});