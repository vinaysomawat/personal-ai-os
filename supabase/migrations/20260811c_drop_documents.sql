-- Documents module removed entirely (UI, actions, Telegram bot module, AI
-- doc-qa feature) per direct user request. Unlike this session's other
-- removed-feature tables (e.g. goals), this one is fully dropped rather
-- than left as orphaned schema -- explicit user decision, data loss
-- acknowledged and accepted (3 rows existed at drop time).

drop table if exists documents;
