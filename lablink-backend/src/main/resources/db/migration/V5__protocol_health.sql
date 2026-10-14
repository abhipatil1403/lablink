ALTER TABLE network_servers ADD COLUMN health_status VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN'
    CHECK (health_status IN ('UNKNOWN', 'ONLINE', 'OFFLINE'));
