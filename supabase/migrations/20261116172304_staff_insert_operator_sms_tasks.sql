-- Staff may add a customer text for their own business (they could already read and update them).
-- Lets the Operator app queue the quote-price and booking-confirmed texts under the signed-in
-- staff member's own access. Reversible: drop policy staff_insert_operator_sms_tasks on public.operator_sms_tasks;
create policy staff_insert_operator_sms_tasks on public.operator_sms_tasks
  for insert
  with check (private.staff_for_tenant(tenant_id));
