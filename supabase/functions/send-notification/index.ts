import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import { GoogleAuth } from 'https://deno.land/x/google_auth_library/mod.ts';

// --- CONFIGURAÇÃO DE AUTENTICAÇÃO E CLIENTES ---

// Configuração do cliente de admin do Supabase
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Configuração de autenticação do Google para o Firebase
// ATENÇÃO: Você precisará configurar as variáveis de ambiente no Supabase
const googleAuth = new GoogleAuth({
  // O escopo necessário para enviar mensagens FCM
  scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  // As credenciais virão das variáveis de ambiente
  credentials: {
    client_email: Deno.env.get('FIREBASE_CLIENT_EMAIL') ?? '',
    private_key: Deno.env.get('FIREBASE_PRIVATE_KEY') ?? '',
  },
});

const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID') ?? '';

// --- LÓGICA PRINCIPAL DA FUNÇÃO ---

serve(async (req) => {
  try {
    // 1. Extrair o registro do corpo da requisição (enviado pelo trigger do DB)
    const payload = await req.json();
    const newRecord = payload.record;

    if (!newRecord) {
      throw new Error('Registro inválido recebido.');
    }

    // 2. Buscar todos os tokens FCM do banco de dados
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from('fcm_tokens')
      .select('token');

    if (tokensError) {
      throw new Error(`Erro ao buscar tokens FCM: ${tokensError.message}`);
    }

    if (!tokens || tokens.length === 0) {
      console.log('Nenhum token FCM encontrado para enviar notificação.');
      return new Response(JSON.stringify({ message: 'Nenhum token encontrado.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 3. Construir a mensagem da notificação
    const notificationTitle = 'Novo Serviço Registrado';
    const notificationBody = `${newRecord.nomes} registrou saída para ${newRecord.localidade}`;

    // 4. Obter o token de acesso do Google
    const accessToken = await googleAuth.getAccessToken();

    // 5. Enviar a notificação para cada token
    const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`;

    const sendPromises = tokens.map(item => {
      const message = {
        message: {
          token: item.token,
          notification: {
            title: notificationTitle,
            body: notificationBody,
          },
          android: {
            notification: {
              sound: 'default',
            },
          },
        },
      };

      return fetch(fcmEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(message),
      });
    });

    // Aguarda todas as requisições serem completadas
    const responses = await Promise.all(sendPromises);

    // Verifica se houve erros
    for (const res of responses) {
      if (!res.ok) {
        const errorBody = await res.json();
        console.error('Erro ao enviar FCM:', JSON.stringify(errorBody, null, 2));
      }
    }

    console.log(`Notificações enviadas para ${tokens.length} dispositivos.`);

    // 6. Retornar uma resposta de sucesso
    return new Response(JSON.stringify({ success: true, sent_to: tokens.length }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // Em caso de erro, loga e retorna uma resposta de erro
    console.error('Erro na Edge Function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
