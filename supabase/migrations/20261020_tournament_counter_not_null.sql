-- INV-01 follow-up from the 2026-10-19 consistency audit.
--
-- current_players was nullable: CHECK constraints do not reject NULL, so the
-- claim that the constraints make an overbooked counter unrepresentable had an
-- exception — a NULL counter was representable, and 'NULL + 1' stays NULL.
-- NOT NULL closes that hole; the counter can now be compared consistently.

ALTER TABLE tournaments
    ALTER COLUMN current_players SET NOT NULL;
