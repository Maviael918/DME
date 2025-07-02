-- Tabela para registrar o histórico de saídas dos colaboradores
CREATE TABLE public.historico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nomes TEXT NOT NULL, -- Nomes dos colaboradores que saíram (separados por vírgula)
    localidade TEXT NOT NULL, -- Localidade para onde o serviço foi
    data TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Data e hora do registro
    observacao TEXT -- Observações adicionais
);

-- Tabela para registrar ocorrências de ponto (faltas, atrasos)
CREATE TABLE public.registros_ponto (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    colaborador_nome TEXT NOT NULL, -- Nome do colaborador
    data DATE NOT NULL, -- Data da ocorrência
    tipo TEXT NOT NULL, -- Tipo de ocorrência (Falta, Falta Justificada, Atraso)
    observacao TEXT -- Observações adicionais
);

-- Tabela para registrar horas extras
CREATE TABLE public.horas_extras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    colaborador_nome TEXT NOT NULL, -- Nome do colaborador
    data DATE NOT NULL, -- Data da hora extra
    horas_excedentes NUMERIC(5, 2) NOT NULL, -- Quantidade de horas extras (ex: 999.99)
    justificativa TEXT -- Justificativa para as horas extras
);

-- Tabela para registrar horas devidas
CREATE TABLE public.horas_devidas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    colaborador_nome TEXT NOT NULL, -- Nome do colaborador
    data DATE NOT NULL, -- Data da hora devida
    quantidade NUMERIC(5, 2) NOT NULL, -- Quantidade de horas devidas (ex: 1.5)
    justificativa TEXT, -- Motivo das horas devidas
    status TEXT DEFAULT 'Pendente' -- Status da hora devida (Pendente, Pago)
);

-- Opcional: Adicionar índices para melhorar a performance de consulta
CREATE INDEX idx_historico_nomes ON public.historico (nomes);
CREATE INDEX idx_historico_localidade ON public.historico (localidade);
CREATE INDEX idx_historico_data ON public.historico (data DESC);
CREATE INDEX idx_registros_ponto_colaborador_data ON public.registros_ponto (colaborador_nome, data DESC);
CREATE INDEX idx_horas_extras_colaborador_data ON public.horas_extras (colaborador_nome, data DESC);
CREATE INDEX idx_horas_devidas_colaborador_data ON public.horas_devidas (colaborador_nome, data DESC);

-- Habilitar RLS e criar políticas para as tabelas

-- historico
ALTER TABLE public.historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated insert on historico" ON public.historico FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated select on historico" ON public.historico FOR SELECT TO authenticated USING (true);

-- registros_ponto
ALTER TABLE public.registros_ponto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated insert on registros_ponto" ON public.registros_ponto FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated select on registros_ponto" ON public.registros_ponto FOR SELECT TO authenticated USING (true);

-- horas_extras
ALTER TABLE public.horas_extras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated insert on horas_extras" ON public.horas_extras FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated select on horas_extras" ON public.horas_extras FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated update on horas_extras" ON public.horas_extras FOR UPDATE TO authenticated USING (true);

-- horas_devidas
ALTER TABLE public.horas_devidas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated insert on horas_devidas" ON public.horas_devidas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated select on horas_devidas" ON public.horas_devidas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated update on horas_devidas" ON public.horas_devidas FOR UPDATE TO authenticated WITH CHECK (true);