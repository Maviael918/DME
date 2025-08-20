import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Configuração do Supabase
const SUPABASE_URL = "https://cqtxsyzuvlucxfbyxyhp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxdHhzeXp1dmx1Y3hmYnl4eWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyODk1MjQsImV4cCI6MjA2Mzg2NTUyNH0.zCC23y3KGvkjAqGFCopteAk5QV4JXkLeSonIjmFK1AM";

// Cria e exporta o cliente Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Teste de conexão inicial
supabase.from('historico').select('*').limit(1)
  .then(({ data, error }) => {
    if (error) {
      console.error("Erro na conexão com Supabase:", error);
    } else {
      console.log("Conexão com Supabase estabelecida com sucesso!");
    }
  });