-- um registro por varredura concluida; e o que a pagina /r/:id le
CREATE TABLE IF NOT EXISTS scans (
  id         TEXT PRIMARY KEY,
  domain     TEXT NOT NULL,
  grade      TEXT NOT NULL CHECK (grade IN ('A', 'B', 'C', 'D')),
  grave      INTEGER NOT NULL,
  medio      INTEGER NOT NULL,
  findings   TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- historico e evolucao de um dominio, do mais novo pro mais antigo
CREATE INDEX IF NOT EXISTS idx_scans_domain_created ON scans (domain, created_at DESC);
-- limpeza dos relatorios vencidos
CREATE INDEX IF NOT EXISTS idx_scans_created ON scans (created_at);
