ALTER TABLE assignment_attempts ADD COLUMN evaluation_plan JSONB NOT NULL DEFAULT '[]';
ALTER TABLE submission_test_results ADD COLUMN evaluated_name VARCHAR(255);
ALTER TABLE submission_test_results ADD COLUMN evaluated_weight INTEGER;
ALTER TABLE submission_test_results ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'FAILED';
UPDATE submission_test_results r SET evaluated_name = t.name, evaluated_weight = t.weight,
 status = CASE WHEN r.passed THEN 'PASSED' ELSE 'FAILED' END
 FROM assignment_test_cases t WHERE t.id = r.test_case_id;
ALTER TABLE submission_test_results ALTER COLUMN evaluated_name SET NOT NULL;
ALTER TABLE submission_test_results ALTER COLUMN evaluated_weight SET NOT NULL;
ALTER TABLE submission_test_results ADD CONSTRAINT result_status_check CHECK(status IN ('PASSED','FAILED','ERROR'));
UPDATE assignments SET metadata = jsonb_set(metadata,'{capabilityApi}',
 to_jsonb((metadata->>'capabilityApi') || ' decodeBase64(text) decodes base64 file data.'));
UPDATE assignment_test_cases SET configuration = configuration || '{"check":"lookup"}'::jsonb WHERE name = 'DNS investigation';
UPDATE assignment_test_cases SET configuration = configuration || '{"check":"probe"}'::jsonb WHERE name = 'Reachability evidence';
UPDATE assignment_test_cases SET configuration = configuration || '{"check":"diagnosis"}'::jsonb WHERE name = 'Diagnosis and repair recommendation';
