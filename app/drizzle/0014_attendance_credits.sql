-- Preserve existing attendance grants when unifying the credit balance.
INSERT OR IGNORE INTO ledger(id,owner,asset_id,delta,created)
SELECT 'attendance:'||owner||':'||day,owner,'attendance:'||owner||':'||day,grapes,created FROM attendance;
