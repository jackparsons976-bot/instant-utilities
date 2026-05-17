-- DB-level rate limit guard for SOS events: max 3 per user per 60 seconds.
-- The API route enforces this too; the trigger is a belt-and-suspenders backstop.

create or replace function emergency.check_sos_rate_limit()
returns trigger
language plpgsql
security definer
as $$
declare
  recent_count integer;
begin
  select count(*)
    into recent_count
    from emergency.sos_events
   where user_id    = new.user_id
     and facility_id = new.facility_id
     and created_at  > now() - interval '60 seconds';

  if recent_count >= 3 then
    raise exception 'rate_limit_exceeded'
      using detail = 'Maximum 3 SOS events per 60 seconds per user',
            errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sos_rate_limit on emergency.sos_events;

create trigger trg_sos_rate_limit
  before insert on emergency.sos_events
  for each row execute function emergency.check_sos_rate_limit();
