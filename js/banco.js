import { supabase } from './supabaseClient.js';

// --- CONSTANTES GLOBAIS ---
const TODOS_COLABORADORES = ['Maviael', 'Raminho', 'Bruninho', 'Matheus', 'Isaac', 'Mikael'];
const HORAS_DIARIAS_PADRAO = 8;

// --- ELEMENTOS DO DOM ---
const formBancoHoras = document.getElementById('form-banco-horas');
const bancoColaboradorSelect = document.getElementById('banco-colaborador');
const bancoDataInput = document.getElementById('banco-data');
const bancoEntradaInput = document.getElementById('banco-entrada');
const bancoSaidaInput = document.getElementById('banco-saida');
const bancoJustificativaInput = document.getElementById('banco-justificativa');
const btnRegistrarFalta = document.getElementById('btn-registrar-falta');

const buscaColaboradorSelect = document.getElementById('busca-colaborador-select');
const btnBuscarColaborador = document.getElementById('btn-buscar-colaborador');
const resultadoContainer = document.getElementById('resultado-container');
const tituloResultadoBusca = document.getElementById('titulo-resultado-busca');
const saldoGeralContainer = document.getElementById('saldo-geral-container');
const conteudoResultadoBusca = document.getElementById('conteudo-resultado-busca');
const btnPagarHoras = document.getElementById('btn-pagar-horas');
const btnDownloadPdf = document.getElementById('btn-download-pdf');
const toastMessageEl = document.getElementById('toast-message');
const notificationSound = new Audio('js/notification.mp3'); // Adiciona o som de notificação

// --- DADOS GLOBAIS ---
let colaboradorConsultado = '';

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

// --- FUNÇÕES DE LÓGICA ---

async function registrarHoras(event) {
    event.preventDefault();
    const nome = bancoColaboradorSelect.value;
    const data = bancoDataInput.value;
    const entrada = bancoEntradaInput.value;
    const saida = bancoSaidaInput.value;
    const justificativa = bancoJustificativaInput.value;

    if (!nome || !data || !entrada || !saida) {
        showToast('Por favor, preencha todos os campos de data e hora.', 'error');
        return;
    }

    const diff = new Date(`${data}T${saida}`) - new Date(`${data}T${entrada}`);
    const horasTrabalhadas = diff / (1000 * 60 * 60);
    const horasExcedentes = horasTrabalhadas - HORAS_DIARIAS_PADRAO;

    const { error } = await supabase.from('banco_horas').insert([{
        colaborador_nome: nome,
        data: data,
        horas_excedentes: horasExcedentes.toFixed(2),
        justificativa: justificativa || `Trabalho do dia ${new Date(data).toLocaleDateString('pt-BR')}`
    }]);

    if (error) {
        showToast('Erro ao salvar as horas: ' + error.message, 'error');
    } else {
        showToast('Horas registradas com sucesso!', 'success');
        formBancoHoras.reset();
        bancoDataInput.valueAsDate = new Date();
        if (colaboradorConsultado === nome) {
            buscarDadosColaborador(nome);
        }
    }
}

async function registrarFalta() {
    const nome = bancoColaboradorSelect.value;
    const data = bancoDataInput.value;
    const justificativa = bancoJustificativaInput.value;

    if (!nome || !data) {
        showToast('Selecione o colaborador e a data para registrar a falta.', 'error');
        return;
    }

    if (!confirm(`Confirmar registro de FALTA para ${nome} na data ${new Date(data).toLocaleDateString('pt-BR')}?`)) {
        return;
    }

    const { error } = await supabase.from('registros_ponto').insert([{
        colaborador_nome: nome,
        data: data,
        tipo: 'Falta',
        observacao: justificativa || 'Sem observação.'
    }]);

    if (error) {
        showToast('Erro ao registrar falta: ' + error.message, 'error');
    } else {
        showToast('Falta registrada com sucesso!', 'success');
        if (colaboradorConsultado === nome) {
            buscarDadosColaborador(nome);
        }
    }
}

// ATUALIZADO: Adiciona IDs únicos às tabelas geradas
async function buscarDadosColaborador(nome) {
    colaboradorConsultado = nome;
    resultadoContainer.style.display = 'block';
    tituloResultadoBusca.textContent = `Relatório de ${nome}`;
    conteudoResultadoBusca.innerHTML = '<p>Buscando dados...</p>';
    saldoGeralContainer.innerHTML = '';

    const { data: horas, error: errorHoras } = await supabase.from('banco_horas').select('*').eq('colaborador_nome', nome).order('data', { ascending: false });
    const { data: ponto, error: errorPonto } = await supabase.from('registros_ponto').select('*').eq('colaborador_nome', nome).order('data', { ascending: false });
    const { data: historico, error: errorHistorico } = await supabase.from('historico').select('*').ilike('nomes', `%${nome}%`).order('data', { ascending: false });

    if (errorHoras || errorPonto || errorHistorico) {
        conteudoResultadoBusca.innerHTML = `<p style="color: red;">Erro ao consultar dados.</p>`;
        return;
    }

    let saldoTotal = 0;
    if (horas) {
        horas.forEach(h => {
            if (h.status === 'Pendente') {
                saldoTotal += h.horas_excedentes;
            }
        });
    }
    saldoGeralContainer.innerHTML = `Saldo de Horas Pendente: <span class="${saldoTotal >= 0 ? 'saldo-positivo' : 'saldo-negativo'}">${saldoTotal.toFixed(2)} horas</span>`;

    let html = '';
    html += '<h4><i class="fa-solid fa-clock"></i> Banco de Horas (Positivo/Negativo)</h4>';
    if (horas && horas.length > 0) {
        html += `<div class="data-table-wrapper"><table class="data-table" id="pdf-table-horas"><thead><tr><th>Data</th><th>Balanço do Dia</th><th>Status</th><th>Justificativa</th></tr></thead><tbody>`;
        horas.forEach(h => {
            html += `<tr><td>${new Date(h.data).toLocaleDateString('pt-BR')}</td><td>${h.horas_excedentes.toFixed(2)}</td><td>${h.status}</td><td>${h.justificativa}</td></tr>`;
        });
        html += '</tbody></table></div>';
    } else {
        html += '<p>Nenhum registro de horas encontrado.</p>';
    }

    html += '<h4><i class="fa-solid fa-calendar-check"></i> Registros de Faltas</h4>';
    if (ponto && ponto.length > 0) {
        html += `<div class="data-table-wrapper"><table class="data-table" id="pdf-table-faltas"><thead><tr><th>Data</th><th>Ocorrência</th><th>Observação</th></tr></thead><tbody>`;
        ponto.forEach(p => {
            html += `<tr><td>${new Date(p.data).toLocaleDateString('pt-BR')}</td><td>${p.tipo}</td><td>${p.observacao || 'N/A'}</td></tr>`;
        });
        html += '</tbody></table></div>';
    } else {
        html += '<p>Nenhum registro de falta encontrado.</p>';
    }

    html += '<h4><i class="fa-solid fa-truck"></i> Histórico de Viagens</h4>';
    if (historico && historico.length > 0) {
        html += `<div class="data-table-wrapper"><table class="data-table" id="pdf-table-viagens"><thead><tr><th>Data</th><th>Localidade</th><th>Observação</th></tr></thead><tbody>`;
        historico.forEach(h => {
            html += `<tr><td>${new Date(h.data).toLocaleDateString('pt-BR')}</td><td>${h.localidade}</td><td>${h.observacao || 'N/A'}</td></tr>`;
        });
        html += '</tbody></table></div>';
    } else {
        html += '<p>Nenhum registro de viagem encontrado.</p>';
    }
    conteudoResultadoBusca.innerHTML = html;
}

async function pagarHoras() {
    if (!colaboradorConsultado) return;
    if (!confirm(`Você confirma o pagamento de todas as horas EXCEDENTES PENDENTES de ${colaboradorConsultado}?`)) return;

    const { error } = await supabase.from('banco_horas').update({ status: 'Pago' }).eq('colaborador_nome', colaboradorConsultado).eq('status', 'Pendente').gt('horas_excedentes', 0);

    if (error) {
        showToast(`Erro ao registrar pagamento: ${error.message}`, 'error');
    } else {
        showToast(`Pagamento registrado com sucesso!`, 'success');
        buscarDadosColaborador(colaboradorConsultado);
    }
}

// ATUALIZADO: Lógica de geração de PDF corrigida e mais robusta
async function gerarPDF() {
    if (!colaboradorConsultado) {
        showToast("Primeiro, consulte um colaborador para gerar o PDF.", 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const nome = colaboradorConsultado;
    const saldoHorasText = saldoGeralContainer.innerText;

    // Seleciona as tabelas por seus IDs únicos
    const tableHoras = document.getElementById('pdf-table-horas');
    const tableFaltas = document.getElementById('pdf-table-faltas');
    const tableViagens = document.getElementById('pdf-table-viagens');

    doc.setFontSize(18);
    doc.text(`Relatório do Colaborador: ${nome}`, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);

    let finalY = 30;

    // Helper para adicionar tabelas ao PDF somente se elas existirem no HTML
    const addTableToPdf = (title, tableElement, yPos) => {
        doc.setFontSize(14);
        doc.text(title, 14, yPos);
        yPos += 7;
        if (tableElement) {
            doc.autoTable({
                html: tableElement,
                startY: yPos,
                theme: 'striped',
                headStyles: { fillColor: [58, 80, 107] }
            });
            return doc.autoTable.previous.finalY + 10;
        } else {
            doc.setFontSize(11);
            doc.text("Nenhum registro encontrado para esta categoria.", 14, yPos);
            return yPos + 10;
        }
    };

    finalY = addTableToPdf("Banco de Horas", tableHoras, finalY);
    doc.setFontSize(12);
    doc.text(saldoHorasText, 14, finalY);
    finalY += 10;

    finalY = addTableToPdf("Registros de Faltas", tableFaltas, finalY);
    finalY = addTableToPdf("Histórico de Viagens", tableViagens, finalY);

    doc.save(`relatorio_${nome.toLowerCase().replace(' ', '_')}_${new Date().toISOString().slice(0,10)}.pdf`);
}

// --- INICIALIZAÇÃO E EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    const optionsHtml = TODOS_COLABORADORES.map(nome => `<option value="${nome}">${nome}</option>`).join('');
    bancoColaboradorSelect.innerHTML = optionsHtml;
    buscaColaboradorSelect.innerHTML = '<option value="" disabled selected>Selecione um nome</option>' + optionsHtml;
    bancoDataInput.valueAsDate = new Date();

    formBancoHoras.addEventListener('submit', registrarHoras);
    btnRegistrarFalta.addEventListener('click', registrarFalta);
    btnBuscarColaborador.addEventListener('click', () => {
        if (buscaColaboradorSelect.value) {
            buscarDadosColaborador(buscaColaboradorSelect.value);
        } else {
            showToast('Por favor, selecione um colaborador para ver o relatório.', 'error');
        }
    });
    btnPagarHoras.addEventListener('click', pagarHoras);
    btnDownloadPdf.addEventListener('click', gerarPDF);
});