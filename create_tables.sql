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
