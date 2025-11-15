CREATE TABLE IF NOT EXISTS public.expenses (
    id SERIAL PRIMARY KEY,
    expense_ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    amount NUMERIC(12,2) NOT NULL,
    description TEXT NOT NULL,
    method TEXT NOT NULL,
    tag TEXT NOT NULL,
    category TEXT NOT NULL,
    installments INT NULL,
    parsed BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT chk_installments_pos CHECK (installments IS NULL OR installments >= 1),
    CONSTRAINT chk_method_enum CHECK (
        method IN ('Pix','Cartão de Crédito','Cartão de Débito','Boleto')
    ),
    CONSTRAINT chk_tag_enum CHECK (
        tag IN ('Gastos Pessoais','Gastos do Casal','Gastos de Casa')
    ),
    CONSTRAINT chk_category_enum CHECK (
        category IN (
            'Alimentação','Assinatura','Casa','Compras','Educação','Eletrônicos',
            'Lazer','Operação bancária','Outros','Pix','Saúde','Serviços',
            'Supermercado','Transporte','Vestuário','Viagem'
        )
    )
);

CREATE INDEX IF NOT EXISTS ix_expenses_ts ON public.expenses (expense_ts);
CREATE INDEX IF NOT EXISTS ix_expenses_method ON public.expenses (method);
CREATE INDEX IF NOT EXISTS ix_expenses_tag ON public.expenses (tag);
CREATE INDEX IF NOT EXISTS ix_expenses_category ON public.expenses (category);
