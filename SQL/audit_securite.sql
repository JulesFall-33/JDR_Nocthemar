-- =====================================================================
--  Audit de sécurité Supabase — LECTURE SEULE, ne modifie rien.
--  À coller dans Supabase > SQL Editor, puis lancer chaque bloc (Run)
--  et envoyer les résultats pour analyse.
-- =====================================================================

-- 1) Tables sans RLS (Row Level Security) : n'importe qui avec la clé publique
--    peut les lire ET les modifier. Doit renvoyer 0 ligne.
select tablename as table_sans_rls
from pg_tables
where schemaname = 'public' and not rowsecurity;


-- 2) Règles d'accès (policies) de chaque table.
--    À surveiller : une règle UPDATE/INSERT/ALL sur players, wallets, inventory,
--    transactions ou daily_shop ouverte aux joueurs (roles = {authenticated} ou {public}) :
--    un joueur pourrait alors se donner des pièces ou le rôle MJ directement.
select tablename, policyname, cmd, roles, qual as condition, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd;


-- 3) Fonctions SECURITY DEFINER (elles s'exécutent avec tous les droits).
--    Chacune doit fixer search_path (colonne config non vide), sinon elle est détournable.
select p.proname as fonction,
       p.proconfig as config,
       has_function_privilege('anon', p.oid, 'execute') as appelable_sans_connexion
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
order by p.proname;
