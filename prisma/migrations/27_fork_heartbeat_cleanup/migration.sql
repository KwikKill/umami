-- Fork only. Before the merge with upstream v3.5.0, a heartbeat (event_type 6)
-- received after the 30-minute visit window opened a new visit made of
-- heartbeats only. The collector no longer does that: remove those visits so
-- they are not counted as visits or visitors. No-op on databases without
-- heartbeats.
DELETE FROM "website_event" h
WHERE h."event_type" = 6
  AND NOT EXISTS (
    SELECT 1
    FROM "website_event" e
    WHERE e."website_id" = h."website_id"
      AND e."visit_id" = h."visit_id"
      AND e."event_type" <> 6
  );
