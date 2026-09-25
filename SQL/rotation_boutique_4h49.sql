-- =====================================================================
--  Boutique du marchand : créneaux de 5 h calés sur 04 h 49 (heure de Paris),
--  pour correspondre au minuteur du bot Discord.
--  Créneaux : 04:49, 09:49, 14:49, 19:49, 00:49, 05:49… (ils glissent d'un
--  jour à l'autre, puisque 24 h n'est pas un multiple de 5 h).
--
--  À exécuter une fois dans Supabase > SQL Editor, AVANT 04 h 49.
-- =====================================================================
begin;

-- Début du créneau en cours : point de départ + un nombre entier de fois 5 h
create or replace function public.current_shop_slot()
returns timestamptz
language sql
stable
as $$
  select timestamptz '2026-09-25 04:49:00 Europe/Paris'
       + floor(extract(epoch from now() - timestamptz '2026-09-25 04:49:00 Europe/Paris') / 18000)
       * interval '5 hours';
$$;

-- Prochain renouvellement : fin du créneau en cours
create or replace function public.next_shop_refresh()
returns timestamptz
language sql
stable
as $$
  select public.current_shop_slot() + interval '5 hours';
$$;

-- La sélection actuelle a été enregistrée avec l'ancien découpage (créneau 22:00) :
-- on la rattache au nouveau créneau en cours pour qu'elle reste visible jusqu'à 04 h 49.
update public.daily_shop
set slot = public.current_shop_slot()
where slot = (select max(slot) from public.daily_shop)
  and slot <> public.current_shop_slot();

commit;

notify pgrst, 'reload schema';
