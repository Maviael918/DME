-- Tabela para registrar o histórico de saídas dos colaboradores
CREATE TABLE public.historico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nomes TEXT NOT NULL, -- Nomes dos colaboradores que saíram (separados por vírgula)
    localidade TEXT NOT NULL, -- Localidade para onde o serviço foi
    data TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Data e hora do registro
    observacao TEXT -- Observações adicionais
);

-- Opcional: Adicionar índices para melhorar a performance de consulta
CREATE INDEX idx_historico_nomes ON public.historico (nomes);
CREATE INDEX idx_historico_localidade ON public.historico (localidade);
CREATE INDEX idx_historico_data ON public.historico (data DESC);

-- Habilitar RLS e criar políticas para as tabelas

-- historico
ALTER TABLE public.historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated insert on historico" ON public.historico FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated select on historico" ON public.historico FOR SELECT TO authenticated USING (true);

-- Tabela para armazenar as assinaturas digitais dos usuários
CREATE TABLE public.user_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id), -- Chave estrangeira para a tabela de usuários do Supabase
    signature_image TEXT NOT NULL, -- Imagem da assinatura em formato base64
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() -- Data e hora da assinatura
);

-- Habilitar RLS para user_signatures
ALTER TABLE public.user_signatures ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários autenticados insiram suas próprias assinaturas
CREATE POLICY "Allow authenticated insert for own signature" ON public.user_signatures FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Política para permitir que usuários autenticados selecionem suas próprias assinaturas (opcional, dependendo da necessidade)
CREATE POLICY "Allow authenticated select for own signature" ON public.user_signatures FOR SELECT TO authenticated USING (auth.uid() = user_id);


-- =================================================================
-- Tabelas para Rastreamento de Localização
-- =================================================================

-- Tabela para armazenar as rotas/sessoes de rastreamento
CREATE TABLE IF NOT EXISTS public.routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ
);

COMMENT ON TABLE public.routes IS 'Armazena cada sessão de rastreamento de rota.';

-- Tabela para armazenar os pontos de localizacao de cada rota
CREATE TABLE IF NOT EXISTS public.location_points (
    id BIGSERIAL PRIMARY KEY,
    route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accuracy DOUBLE PRECISION,
    speed DOUBLE PRECISION
);

COMMENT ON TABLE public.location_points IS 'Armazena os pontos de coordenadas geográficas para cada rota.';

-- Ativar Row Level Security (RLS)
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_points ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança para a tabela 'routes'
DROP POLICY IF EXISTS "Users can insert their own routes" ON public.routes;
CREATE POLICY "Users can insert their own routes"
ON public.routes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own routes" ON public.routes;
CREATE POLICY "Users can view their own routes"
ON public.routes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own routes" ON public.routes;
CREATE POLICY "Users can update their own routes"
ON public.routes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Políticas de Segurança para a tabela 'location_points'
DROP POLICY IF EXISTS "Users can insert their own location points" ON public.location_points;
CREATE POLICY "Users can insert their own location points"
ON public.location_points FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT user_id FROM public.routes WHERE id = route_id) = auth.uid()
);

DROP POLICY IF EXISTS "Users can view their own location points" ON public.location_points;
CREATE POLICY "Users can view their own location points"
ON public.location_points FOR SELECT
TO authenticated
USING (
  (SELECT user_id FROM public.routes WHERE id = route_id) = auth.uid()
);

-- =================================================================
-- Tabela para os cards informativos do aplicativo
-- =================================================================
CREATE TABLE public.app_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    dispaly_order INTEGER DEFAULT 0, -- Usando o nome com o typo, como informado
    is_active BOOLEAN DEFAULT TRUE
);

-- Habilitar RLS
ALTER TABLE public.app_cards ENABLE ROW LEVEL SECURITY;

-- Política para permitir que todos leiam os cards
CREATE POLICY "Allow all users to read cards"
ON public.app_cards
FOR SELECT USING (true);

-- Política para permitir que admins criem, atualizem e deletem cards
-- (Assumindo que a tabela profiles e a role 'admin' existem)
CREATE POLICY "Allow admins full access to cards"
ON public.app_cards
FOR ALL
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' )
WITH CHECK ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );
