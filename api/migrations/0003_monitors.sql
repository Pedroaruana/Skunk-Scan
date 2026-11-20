-- dominios acompanhados pelo cron; o token e o que permite apagar o monitor depois
CREATE TABLE IF NOT EXISTS monitors (
  token           TEXT PRIMARY KEY,
  domain          TEXT NOT NULL,
  webhook         TEXT,
  last_grade      TEXT CHECK (last_grade IN ('A', 'B', 'C', 'D')),
  last_checked_at INTEGER,
  created_at      INTEGER NOT NULL
);

-- o mesmo dominio com o mesmo destino nao entra duas vezes
CREATE UNIQUE INDEX IF NOT EXISTS idx_monitors_domain_webhook ON monitors (domain, IFNULL(webhook, ''));
CREATE INDEX IF NOT EXISTS idx_monitors_checked ON monitors (last_checked_at);
