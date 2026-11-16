-- Formato de entrega do atendimento (ex.: Foto e audio, Video gravado)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "deliveryFormat" TEXT;
