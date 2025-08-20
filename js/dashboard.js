import { supabase } from './supabaseClient.js';

let map = null; // Variável global para o mapa

// Mapeamento de Nomes para Emails (AJUSTAR CONFORME NECESSÁRIO)
// O ideal é ter essa informação no banco de dados, em uma tabela de "perfis".
const colaboradorEmailMap = {
    'Maviael': 'maviael2013@gmail.com',
    'Raminho': 'raminho@example.com',
    'Matheus': 'matheus@example.com',
    'Isaac': 'isaac@example.com',
    'Mikael': 'mikael@example.com',
    'Bruninho': 'bruninho@example.com',
    // Adicione outros colaboradores e seus emails aqui
};


// --- ELEMENTOS DO DOM (Dashboard) ---
const listaHistoricoEl = document.getElementById('lista-historico');
const metricasContentEl = document.getElementById('metricas-content');
const selectColaboradorHistorico = document.getElementById('select-colaborador-historico');
const listaRecusas = document.getElementById('lista-recusas');
const listaUltimosSetores = document.getElementById('lista-ultimos-setores');
const analiseContentEl = document.getElementById('analise-colaborador-content');
const toastMessageEl = document.getElementById('toast-message');

// --- DADOS GLOBAIS (Dashboard) ---
let historicoDados = [];
const TODOS_COLABORADORES = ['Maviael', 'Raminho', 'Bruninho', 'Matheus', 'Isaac', 'Mikael'];
const LOCALIDADES_INVALIDAS_PARA_CONTAGEM = ['PULOU A VEZ'];

// --- FUNÇÕES DE UTILIDADE ---
function showToast(message, type = 'info') {
    if (!toastMessageEl) return;
    let iconClass = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-times-circle' : 'fa-info-circle';
    toastMessageEl.innerHTML = `<i class="fas ${iconClass}"></i> ${message}`;
    toastMessageEl.className = `toast-container ${type} show`;
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

async function carregarMapaTrajeto(colaboradorNome) {
    if (typeof L === 'undefined') {
        console.error("Biblioteca Leaflet não foi carregada.");
        showToast("Erro ao carregar o mapa.", "error");
        return;
    }

    const email = colaboradorEmailMap[colaboradorNome];
    if (!email) {
        showToast(`Email para ${colaboradorNome} não encontrado no mapeamento.`, "error");
        return;
    }

    showToast(`Buscando trajeto para ${colaboradorNome}...`, 'info');

    // 1. Buscar o ID do usuário pelo email na tabela 'profiles'
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

    if (profileError || !profile) {
        showToast(`Perfil para ${colaboradorNome} não encontrado.`, "error");
        console.error("Erro ao buscar perfil:", profileError);
        return;
    }
    const userId = profile.id;

    // 2. Buscar o trajeto do usuário
    const { data: locations, error: locationsError } = await supabase
        .from('location_tracking')
        .select('latitude, longitude')
        .eq('user_id', userId)
        .order('tracked_at', { ascending: true });

    if (locationsError) {
        showToast("Erro ao buscar o trajeto.", "error");
        console.error("Erro ao buscar localizações:", locationsError);
        return;
    }

    if (map) {
        map.remove();
    }
    map = L.map('map').setView([-7.23, -35.88], 13); // Coordenadas de Campina Grande, PB

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const distanciaEl = document.getElementById('distancia-percorrida');

    if (!locations || locations.length < 2) {
        distanciaEl.innerHTML = '<strong>Dados de trajeto insuficientes.</strong>';
        showToast("Não há dados de trajeto suficientes para exibir.", "info");
        map.remove();
        map = null;
        return;
    }

    const latlngs = locations.map(loc => [loc.latitude, loc.longitude]);

    const polyline = L.polyline(latlngs, { color: 'blue' }).addTo(map);
    L.marker(latlngs[0]).addTo(map).bindPopup('Início do Trajeto');
    L.marker(latlngs[latlngs.length - 1]).addTo(map).bindPopup('Fim do Trajeto');
    map.fitBounds(polyline.getBounds());

    let totalDistance = 0;
    for (let i = 0; i < latlngs.length - 1; i++) {
        totalDistance += map.distance(latlngs[i], latlngs[i + 1]);
    }

    distanciaEl.innerHTML = `<strong>${(totalDistance / 1000).toFixed(2)} km</strong>`;
    showToast("Trajeto carregado com sucesso!", "success");
}


async function carregarHistoricoColaborador(colaboradorNome) {
    const { data: recusas, error: errorRecusas } = await supabase.from('historico').select('*').eq('nomes', colaboradorNome).eq('localidade', 'PULOU A VEZ').order('data', { ascending: false });
    if (errorRecusas) {
        console.error('Erro ao carregar recusas:', errorRecusas);
        listaRecusas.innerHTML = '<li>Erro ao carregar recusas.</li>';
    } else {
        listaRecusas.innerHTML = recusas.length > 0 ? recusas.map(r => `<li>${new Date(r.data).toLocaleDateString('pt-BR')} - ${r.observacao || 'N/A'}</li>`).join('') : '<li>Nenhuma recusa registrada.</li>';
    }

    const { data: ultimosSetores, error: errorUltimosSetores } = await supabase.from('historico').select('localidade, data').like('nomes', `%${colaboradorNome}%`).not('localidade', 'in', '("PULOU A VEZ", "Sede")').order('data', { ascending: false }).limit(10);
    if (errorUltimosSetores) {
        console.error('Erro ao carregar últimos setores:', errorUltimosSetores);
        listaUltimosSetores.innerHTML = '<li>Erro ao carregar setores.</li>';
    } else {
        listaUltimosSetores.innerHTML = ultimosSetores.length > 0 ? ultimosSetores.map(s => `<li>${new Date(s.data).toLocaleDateString('pt-BR')} - ${s.localidade}</li>`).join('') : '<li>Nenhum setor visitado.</li>';
    }
}

async function carregarTudoDashboard() {
    const { data, error } = await supabase.from('historico').select('*').order('data', { ascending: false });
    if (error) {
        console.error('ERRO AO CARREGAR HISTÓRICO:', error);
        return;
    }
    historicoDados = data;
}

function exibirHistorico(dados) {
    if (!dados || dados.length === 0) {
        listaHistoricoEl.innerHTML = '<p>Nenhum registro encontrado.</p>';
        return;
    }
    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `<thead><tr><th>Nome(s)</th><th>Localidade</th><th>Data</th><th>Observação</th></tr></thead>`;
    const tbody = document.createElement('tbody');
    dados.slice(0, 20).forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${r.nomes}</td><td>${r.localidade}</td><td>${new Date(r.data).toLocaleString('pt-BR')}</td><td>${r.observacao || 'N/A'}</td>`;
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
    const dadosFiltrados = dados.filter(d => new Date(d.data) >= umAnoAtras && !LOCALIDADES_INVALIDAS_PARA_CONTAGEM.includes(d.localidade));
    if (dadosFiltrados.length === 0) {
        metricasContentEl.innerHTML = '<p>Não há dados suficientes.</p>';
        return;
    }
    const contagemPorSetor = {};
    dadosFiltrados.forEach(r => {
        if (!contagemPorSetor[r.localidade]) contagemPorSetor[r.localidade] = {};
        r.nomes.split(',').map(n => n.trim()).forEach(nome => {
            if (TODOS_COLABORADORES.includes(nome)) {
                contagemPorSetor[r.localidade][nome] = (contagemPorSetor[r.localidade][nome] || 0) + 1;
            }
        });
    });
    let html = '<div class="analise-setor-grid">';
    for (const setor in contagemPorSetor) {
        const contagem = contagemPorSetor[setor];
        const maxSaidas = Math.max(0, ...Object.values(contagem));
        if (maxSaidas === 0) continue;
        const maisAtivos = Object.keys(contagem).filter(nome => contagem[nome] === maxSaidas);
        html += `<div class="setor-card"><h4>${setor}</h4><div class="colaborador-ativo"><i class="fa-solid fa-star"></i><span>${maisAtivos.join(', ')}</span></div><span class="saidas-count">(${maxSaidas} saídas)</span></div>`;
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
        analiseContentEl.innerHTML = '<p>Não há dados suficientes.</p>';
        return;
    }
    const contagem = {};
    TODOS_COLABORADORES.forEach(c => { contagem[c] = {}; });
    dadosFiltrados.forEach(r => {
        r.nomes.split(',').map(n => n.trim()).forEach(nome => {
            if (contagem[nome]) {
                contagem[nome][r.localidade] = (contagem[nome][r.localidade] || 0) + 1;
            }
        });
    });
    let html = '<table class="data-table"><thead><tr><th>Colaborador</th><th>Setor</th><th>Viagens</th><th>Ações</th></tr></thead><tbody>';
    for (const colaborador in contagem) {
        const setores = Object.keys(contagem[colaborador]).sort();
        if (setores.length > 0) {
            setores.forEach((setor, index) => {
                html += `<tr>`;
                if (index === 0) {
                    html += `<td rowspan="${setores.length}">${colaborador}</td>`;
                }
                html += `<td>${setor}</td><td>${contagem[colaborador][setor]}</td>`;
                if (index === 0) {
                    html += `<td rowspan="${setores.length}"><button class="btn btn-small btn-ver-trajeto" data-colaborador="${colaborador}"><i class="fa-solid fa-route"></i> Ver Trajeto</button></td>`;
                }
                html += `</tr>`;
            });
        } else {
            html += `<tr><td>${colaborador}</td><td>Nenhuma</td><td>0</td><td>-</td></tr>`;
        }
    }
    html += '</tbody></table>';
    analiseContentEl.innerHTML = html;
}


// --- INICIALIZAÇÃO E EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = "login.html";
        return;
    }

    await carregarTudoDashboard();

    document.getElementById('btn-historico-geral')?.addEventListener('click', () => {
        exibirHistorico(historicoDados);
        openModal(document.getElementById('modal-historico-geral'));
    });

    document.getElementById('btn-analise-micro')?.addEventListener('click', () => {
        atualizarAnaliseSetor(historicoDados);
        openModal(document.getElementById('modal-metricas'));
    });

    document.getElementById('btn-analise-colaborador')?.addEventListener('click', () => {
        atualizarAnaliseColaborador(historicoDados);
        openModal(document.getElementById('modal-analise-colaborador'));
    });

    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) closeModal(modal);
        });
    });

    analiseContentEl.addEventListener('click', (e) => {
        const target = e.target.closest('.btn-ver-trajeto');
        if (target) {
            const nome = target.dataset.colaborador;
            carregarMapaTrajeto(nome);
        }
    });
});
