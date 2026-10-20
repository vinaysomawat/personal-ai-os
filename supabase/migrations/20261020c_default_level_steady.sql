-- v4.2: Max (12h) is gone and Steady (6h) is the default load level — the
-- search may run 2–4 months. Existing rows keep their level (a stored 12
-- reads as Intense in code).
alter table prep_settings alter column hours_per_day set default 6;
