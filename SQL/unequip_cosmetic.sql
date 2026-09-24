-- =====================================================================
--  unequip_cosmetic : retire le cosmétique équipé (bannière, titre ou thème)
--  du joueur connecté. À exécuter une fois dans Supabase > SQL Editor.
-- =====================================================================
create or replace function public.unequip_cosmetic(p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Connecte-toi d''abord.';
  end if;

  if p_kind = 'banner' then
    update players set banner_item_id = null where user_id = auth.uid();
  elsif p_kind = 'title' then
    update players set title_item_id = null where user_id = auth.uid();
  elsif p_kind = 'theme' then
    update players set theme_item_id = null where user_id = auth.uid();
  else
    raise exception 'Type de cosmétique inconnu : %', p_kind;
  end if;
end;
$$;

revoke all on function public.unequip_cosmetic(text) from public, anon;
grant execute on function public.unequip_cosmetic(text) to authenticated;
