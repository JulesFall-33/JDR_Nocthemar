-- =====================================================================
--  Nouvelle bannière de profil en boutique : « Premiers Personnages »
--  (Dalek et Kaéliss). Mêmes réglages que les autres bannières (150 pièces).
--  "ratio" : proportions de l'image (2172 × 724) ; le cadre du profil prend
--  cette forme pour afficher l'image en entier, sans la rogner.
--  À exécuter une fois dans Supabase > SQL Editor. Relançable sans doublon.
-- =====================================================================
insert into public.items (name, description, price, shop, kind, payload, min_stock, max_stock, is_available)
select 'Bannière « Premiers Personnages »', 'Bannière de profil.', 150, 'fun', 'banner',
       '{"image": "img/Bannière/Bannière-PremierPersonnages.webp", "ratio": "2172 / 724"}', 1, 5, true
where not exists (select 1 from public.items where name = 'Bannière « Premiers Personnages »');

select id, name, price, payload from public.items where kind = 'banner' order by id;
