-- =====================================================================
--  Nouvelle bannière de profil en boutique : « Les Veines »
--  Même réglages que « Sommets glacés » (boutique du profil, 150 pièces).
--  À exécuter une fois dans Supabase > SQL Editor. Relançable sans doublon.
-- =====================================================================
insert into public.items (name, description, price, shop, kind, payload, min_stock, max_stock, is_available)
select 'Bannière « Les Veines »', 'Bannière de profil.', 150, 'fun', 'banner',
       '{"image": "img/Bannière/Bannière-Les-Veines.webp"}', 1, 5, true
where not exists (select 1 from public.items where name = 'Bannière « Les Veines »');

select id, name, price, payload from public.items where kind = 'banner' order by id;
