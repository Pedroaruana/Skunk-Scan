-- respostas da IA ja geradas, pra pergunta repetida nao gastar a cota gratis do Workers AI
CREATE TABLE IF NOT EXISTS ask_cache (
  key        TEXT PRIMARY KEY,
  answer     TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ask_cache_created ON ask_cache (created_at);
