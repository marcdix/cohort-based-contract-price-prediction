SELECT *
FROM contracts
WHERE settings LIKE '%icon%' -- LOL, easiest way to find a lunch contract w/o joins or subqueries
  AND deleted_at IS NULL
  AND status = 'accepted'
  AND (end_date IS NULL OR end_date > NOW())
  AND partner_id NOT IN (137, 11);