-- Ficha interna de continuação: motivos das leituras anteriores
ALTER TABLE fichas ADD COLUMN IF NOT EXISTS context TEXT;

