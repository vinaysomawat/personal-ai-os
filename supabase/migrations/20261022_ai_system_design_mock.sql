-- AI system design Mock Round format (Senior Frontend → AI Product Engineer):
-- one AI system-design question + MCP & A2A, AI product UX and evals questions.
alter table mock_rounds drop constraint if exists mock_rounds_format_check;
alter table mock_rounds add constraint mock_rounds_format_check
  check (format in ('screen', 'behavioral', 'system-design', 'machine-coding', 'code-review', 'ai-assisted', 'ai-system-design'));
