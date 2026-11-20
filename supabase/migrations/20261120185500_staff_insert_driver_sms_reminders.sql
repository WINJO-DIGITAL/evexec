-- Staff can record a driver SMS handoff (driver_sms_reminders) as theirs to
-- create, mirroring staff_update_sms_reminders. Applied to the live database
-- from the SQL editor on 20/11/2026 (this file records it in the repo).
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'driver_sms_reminders' and policyname = 'staff_insert_sms_reminders') then
    create policy staff_insert_sms_reminders on public.driver_sms_reminders
      for insert with check (private.staff_for_tenant(tenant_id));
  end if;
end $$;
