-- Permanent record of the first time a question's model answer or key
-- points were revealed. Once set, that question's rating is excluded from
-- Coverage/readiness/gates (QuestionsTab.tsx gates the reveal buttons behind
-- a real attempt; actions.ts answerQuestion() sets this, never clears it).
alter table question_progress add column if not exists revealed_at timestamptz;
