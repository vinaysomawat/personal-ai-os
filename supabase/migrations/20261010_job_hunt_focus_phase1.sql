-- v4.0 Job Hunt Focus, Phase 1 (additive): liquid savings for the Finance
-- Runway stat (runway = liquid_savings ÷ rolling 3-month average spend).
alter table finance_profile add column if not exists liquid_savings numeric;
