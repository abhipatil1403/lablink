ALTER TABLE assignment_attempts ADD COLUMN execution_started_at TIMESTAMPTZ;
UPDATE assignment_attempts SET execution_started_at = started_at WHERE status = 'RUNNING';
CREATE INDEX running_attempts_lease_idx ON assignment_attempts(execution_started_at) WHERE status = 'RUNNING';
