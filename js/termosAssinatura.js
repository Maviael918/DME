import { supabase } from './supabaseClient.js';

async function carregarTermosEAssinaturaParaDisplay() {
  const termosContentPlaceholder = document.getElementById('termos-content-placeholder');
  const assinaturaRegistradaImg = document.getElementById('assinatura-registrada-display');
  const statusAssinaturaP = document.getElementById('status-assinatura-display');

  // Carregar o conteúdo dos termos de uso do termos.html
  try {
    const response = await fetch('termos.html');
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    const termosContent = doc.querySelector('.termos-content'); // Seleciona o div com a classe termos-content
    if (termosContent) {
      termosContentPlaceholder.innerHTML = termosContent.innerHTML;
    } else {
      termosContentPlaceholder.innerHTML = '<p>Não foi possível carregar os termos de uso.</p>';
    }
  } catch (error) {
    console.error('Erro ao carregar termos.html:', error);
    termosContentPlaceholder.innerHTML = '<p>Erro ao carregar os termos de uso.</p>';
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
  console.log("Função gerarPdfTermosEAssinatura chamada.");
  const jsPDF = window.jsPDF;
  if (!jsPDF) {
    console.error("jsPDF não está carregado.");
    alert("Erro: Biblioteca jsPDF não carregada. O download do PDF não pode ser realizado.");
    return;
  }
  const doc = new jsPDF();

  const termosContentPlaceholder = document.getElementById('termos-content-placeholder');
  const assinaturaRegistradaImg = document.getElementById('assinatura-registrada-display');

  doc.setFontSize(16);
  doc.text('Termos de Uso e Assinatura Digital', 10, 5); // Título mais para cima

  let y = 15; // Conteúdo começa mais para cima

  // Adicionar o conteúdo dos termos
  const termosText = termosContentPlaceholder.innerText;
  console.log("Conteúdo dos termos (primeiros 100 chars):", termosText.substring(0, 100));
  const splitText = doc.splitTextToSize(termosText, 180); // 180 é a largura máxima da linha
  doc.setFontSize(7); // Reduzido para 7
  doc.text(splitText, 10, y);
  y += (splitText.length * 5) + 5; // 5 é a altura da linha, 5 é um espaçamento extra

  // Adicionar a assinatura
  if (assinaturaRegistradaImg.src && assinaturaRegistradaImg.style.display !== 'none') {
    doc.setFontSize(12);
    doc.text('Sua Assinatura Registrada:', 10, y);
    y += 5; // Reduzido para 5

    const imgData = assinaturaRegistradaImg.src;
    console.log("Dados da imagem da assinatura (primeiros 50 chars):", imgData.substring(0, 50));
    const imgWidth = 50; // Largura desejada da imagem no PDF
    const imgHeight = (assinaturaRegistradaImg.naturalHeight * imgWidth) / assinaturaRegistradaImg.naturalWidth;

    // Verificar se a imagem cabe na página atual, senão adicionar nova página
    if (y + imgHeight > doc.internal.pageSize.height - 10) { // 10 de margem inferior
      doc.addPage();
      y = 10; // Resetar y para o topo da nova página
    }

    doc.addImage(imgData, 'PNG', 10, y, imgWidth, imgHeight);
    y += imgHeight + 10;
  } else {
    console.log("Nenhuma assinatura encontrada ou visível.");
    doc.setFontSize(12);
    doc.text('Nenhuma assinatura encontrada para este usuário.', 10, y);
    y += 10;
  }

  doc.save('termos_e_assinatura.pdf');
  console.log("Tentativa de salvar o PDF.");
}

document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }

  await carregarTermosEAssinaturaParaDisplay();

  const btnGerarPdf = document.getElementById('btn-gerar-pdf');
  if (btnGerarPdf) {
    btnGerarPdf.addEventListener('click', gerarPdfTermosEAssinatura);
  }
});