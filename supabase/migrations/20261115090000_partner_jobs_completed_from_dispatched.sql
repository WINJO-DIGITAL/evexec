-- Partner drivers (kind = 'partner') have no Driver App, so the office marks their jobs
-- Completed directly. A Dispatched job for a partner may now move straight to Completed.
-- Every other transition is unchanged. Applied to the live database on 15/11/2026 (owner approved).
create or replace function public.enforce_booking_status_transition()
 returns trigger
 language plpgsql
 set search_path to 'public', 'pg_temp'
as $function$
DECLARE
  allowed text[];
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  CASE OLD.status
    WHEN 'Unassigned' THEN
      allowed := ARRAY['Dispatched', 'Cancelled', 'Unassigned / Missed Call Recovery'];
    WHEN 'Unassigned / Missed Call Recovery' THEN
      allowed := ARRAY['Dispatched', 'Cancelled'];
    WHEN 'accepted', 'confirmed' THEN
      allowed := ARRAY['En Route', 'Dispatched', 'Cancelled'];
    WHEN 'Dispatched' THEN
      allowed := ARRAY['En Route', 'Cancelled', 'Unassigned'];
      -- Partner drivers have no Driver App, so the office marks their jobs Completed.
      IF EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = NEW.assigned_driver_id AND d.kind = 'partner') THEN
        allowed := allowed || ARRAY['Completed'];
      END IF;
    WHEN 'En Route', 'en_route' THEN
      allowed := ARRAY['Arrived', 'Passenger On Board', 'Cancelled', 'Dispatched', 'No Show'];
    WHEN 'Arrived', 'arrived' THEN
      allowed := ARRAY['Passenger On Board', 'Cancelled', 'En Route', 'No Show'];
    WHEN 'Active', 'active' THEN
      allowed := ARRAY['Arrived', 'Passenger On Board', 'Completed', 'Cancelled'];
    WHEN 'Passenger On Board' THEN
      allowed := ARRAY['Completed', 'Arrived', 'Cancelled', 'En Route'];
    WHEN 'Completed', 'completed' THEN
      IF NEW.status = 'Passenger On Board' THEN RETURN NEW; END IF;
      RAISE EXCEPTION 'Booking % is already Completed and cannot be changed.', NEW.id;
    WHEN 'Cancelled', 'cancelled', 'Canceled', 'canceled' THEN
      IF NEW.status = 'Unassigned' THEN RETURN NEW; END IF;
      RAISE EXCEPTION 'Booking % is already Cancelled and cannot be changed.', NEW.id;
    WHEN 'No Show', 'no show' THEN
      IF NEW.status = 'Unassigned' THEN RETURN NEW; END IF;
      RAISE EXCEPTION 'Booking % is already a No Show and cannot be changed.', NEW.id;
    WHEN 'CRITICAL_UNALLOCATED' THEN
      allowed := ARRAY['Dispatched', 'Cancelled'];
    ELSE
      RETURN NEW;
  END CASE;

  IF NOT (NEW.status = ANY(allowed)) THEN
    RAISE EXCEPTION 'Invalid status transition from "%" to "%". Allowed: %',
      OLD.status, NEW.status, array_to_string(allowed, ', ');
  END IF;

  RETURN NEW;
END;
$function$;
