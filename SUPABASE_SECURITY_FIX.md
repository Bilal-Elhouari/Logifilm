# Fermer la faille d'accès à la base Supabase

## Le problème

Aujourd'hui, **n'importe qui** peut lire les tables `companies`, `jobs` et `crew_members` de la base de production **sans se connecter**. Il suffit de la clé publique de l'application, qui se trouve dans `.env.mac` et `.env.windows`, deux fichiers présents dans ce dépôt GitHub public.

`crew_members` contient des données personnelles : numéros de CIN, adresses, téléphones et comptes bancaires.

La cause : le script de sécurité `migrations/20260615_security_hardening.sql` n'a jamais été exécuté sur la base de production. Les règles d'accès (RLS, « Row Level Security ») ne sont donc pas en place.

> La clé publique (« anon key ») est faite pour être dans l'application : ce n'est pas elle le problème. Une fois les règles d'accès en place, elle ne donne plus accès à rien sans compte ni licence.

## Ce que font les deux scripts

| Script | Effet |
|---|---|
| `migrations/20260615_security_hardening.sql` (existant) | Active la sécurité sur toutes les tables. Chaque société a un propriétaire et des membres. Il faut être **connecté**, **membre de la société** et avoir une **licence active** pour voir ou modifier ses données, ses contrats et ses fichiers. |
| `migrations/20261120_company_roles_hardening.sql` (nouveau) | Corrige quatre défauts du script précédent : un admin pouvait se rendre propriétaire puis supprimer la société ; un admin pouvait créer ou retirer des propriétaires ; la création d'une société depuis l'app échouait ; n'importe quel compte pouvait savoir si un autre compte avait une licence. |

Les deux scripts ont été testés ensemble sur une copie locale de PostgreSQL, dans le même ordre que ci-dessous, avec des comptes fictifs (propriétaire, admin, membre, compte sans licence, inconnu, visiteur anonyme). Les 31 vérifications passent.

**Prévoyez 20 à 30 minutes.** Faites-le à un moment où personne n'utilise l'application : entre les étapes 4 et 6, certains utilisateurs peuvent ne plus voir leurs sociétés.

Toutes les requêtes se lancent dans **Supabase → SQL Editor → New query**.

---

## Étape 1 — Sauvegarder

Dans **Supabase → Database → Backups**, vérifiez qu'une sauvegarde récente existe.

Sur l'offre gratuite, il n'y a pas de sauvegarde automatique. Exportez alors au moins les tables `companies`, `jobs`, `crew_members` et `contracts` : **Table Editor → (table) → Export → CSV**. Gardez ces fichiers en lieu sûr : ils contiennent des données personnelles.

## Étape 2 — Faire le point (lecture seule)

```sql
-- Sécurité activée sur chaque table ? (rls_active = false signifie table ouverte)
select c.relname as table_name, c.relrowsecurity as rls_active
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('companies', 'jobs', 'crew_members', 'contracts', 'profiles',
                    'company_members', 'license_keys', 'license_activations')
order by 1;

-- Règles d'accès déjà présentes
select tablename, policyname, cmd from pg_policies where schemaname = 'public' order by 1, 2;
```

Gardez le résultat : il montre l'état avant la correction.

## Étape 3 — Choisir le propriétaire de chaque société

```sql
-- Les sociétés
select id, name, created_at from public.companies order by name;

-- Les comptes, avec leur licence
select u.email,
       u.created_at,
       exists (
         select 1
         from public.license_activations a
         join public.license_keys k on k.id = a.license_id
         where a.user_id = u.id
           and k.status = 'active'
           and (k.expires_at is null or k.expires_at > now())
       ) as licence_active
from auth.users u
order by u.created_at;
```

Pour chaque société, décidez quel compte en sera le **propriétaire**. Ce compte doit avoir une licence active (`licence_active = true`), sinon il ne verra rien après la correction.

## Étape 4 — Ajouter les propriétaires

Remplacez les adresses e-mail et les noms de sociétés, puis exécutez :

```sql
alter table public.companies
  add column if not exists owner_user_id uuid references auth.users(id) on delete restrict;

-- Une ligne par société :
update public.companies
set owner_user_id = (select id from auth.users where email = 'proprietaire@exemple.com')
where name = 'Nom de la société';

-- Ou, si une seule personne possède toutes les sociétés :
-- update public.companies
-- set owner_user_id = (select id from auth.users where email = 'proprietaire@exemple.com')
-- where owner_user_id is null;

-- Vérification : doit renvoyer 0
select count(*) as societes_sans_proprietaire from public.companies where owner_user_id is null;
```

Ne passez à l'étape 5 que si le résultat est **0**.

## Étape 5 — Installer la sécurité

1. Ouvrez `migrations/20260615_security_hardening.sql`, copiez **tout** le contenu dans une nouvelle requête et exécutez-la.
2. Ouvrez `migrations/20261120_company_roles_hardening.sql`, copiez **tout** le contenu dans une nouvelle requête et exécutez-la.

Si le premier script s'arrête avec le message *« Security policies not installed: assign owner_user_id… »*, une société n'a pas de propriétaire. Revenez à l'étape 4, puis relancez ce même script : il peut être exécuté plusieurs fois sans problème.

## Étape 6 — Ajouter les autres utilisateurs de chaque société

Le propriétaire est ajouté automatiquement. Les autres comptes qui doivent travailler sur une société doivent y être ajoutés, sinon ils ne la verront plus :

```sql
-- role : 'admin' (gère les membres et les projets) ou 'member' (travaille sur les données)
insert into public.company_members (company_id, user_id, role)
select c.id, u.id, 'member'
from public.companies c, auth.users u
where c.name = 'Nom de la société'
  and u.email = 'collegue@exemple.com'
on conflict (company_id, user_id) do nothing;

-- Vérification : qui a accès à quoi
select c.name as societe, u.email, m.role
from public.company_members m
join public.companies c on c.id = m.company_id
join auth.users u on u.id = m.user_id
order by c.name, m.role, u.email;
```

Chaque membre doit aussi avoir une **licence active** (voir l'étape 3).

## Étape 7 — Vérifier que la faille est fermée

```sql
-- En visiteur anonyme : chaque ligne doit afficher 0
begin;
set local role anon;
select 'companies' as table_name, count(*) from public.companies
union all select 'jobs', count(*) from public.jobs
union all select 'crew_members', count(*) from public.crew_members;
rollback;
```

Vérifiez ensuite dans l'application :
- un propriétaire et un membre voient bien leurs sociétés, leurs projets et leur équipe ;
- ils peuvent créer un projet, une fiche et un contrat ;
- un compte qui n'est pas membre ne voit aucune société.

## Si quelqu'un ne voit plus ses données

Dans l'ordre :
1. Le compte a-t-il une **licence active** ? (requête de l'étape 3)
2. Le compte est-il **membre** de la société ? (requête de vérification de l'étape 6) Sinon, ajoutez-le avec l'étape 6.

> **Ne désactivez pas la sécurité** (`disable row level security`) pour « dépanner » : cela rouvre immédiatement la faille.

## Après la correction

- **Vérifier l'historique d'accès.** Les données étaient lisibles sans connexion depuis la mise en ligne. Dans **Supabase → Logs → API**, cherchez des requêtes vers `/rest/v1/crew_members` (ou `companies`, `jobs`) qui ne viennent pas de l'application. L'historique conservé dépend de votre offre Supabase.
- **Obligations légales.** Les fiches contiennent des données personnelles de salariés et de prestataires (CIN, coordonnées bancaires). Au Maroc, la loi 09-08 encadre ces données, sous le contrôle de la CNDP. Si des accès suspects apparaissent, renseignez-vous sur vos obligations auprès d'un conseil juridique.
- **Fichier de test du dépôt.** `src/utils/payrollInvoice.test.ts` contient un nom, des ICE et un numéro de compte bancaire qui semblent réels. Remplacez-les par des données fictives. Comme le dépôt est public, il faut aussi les retirer de l'historique git.
- **Licences sur une base neuve.** Sur une base créée de zéro, `migrations/20260615_account_licenses.sql` écrit dans des colonnes `device_id` et `device_name` que `supabase_licenses_schema.sql` ne crée pas : l'activation de licence échouerait. La base de production, issue de l'ancien système de licence par appareil, n'est pas concernée. À corriger avant une nouvelle installation.

---

# Validation des nouveaux comptes par l'administrateur

Avec `migrations/20261121_account_approval.sql` :

1. Toute personne qui **s'inscrit** crée automatiquement une **demande d'accès**. Dans l'app, elle voit « Waiting for approval ».
2. L'**administrateur** voit à sa connexion une notification et une cloche **Requests** avec le nombre de demandes (vérifiées toutes les minutes).
3. Il choisit une **durée** (1 mois, 3 mois, 1 an ou illimitée), puis **Approve** ou **Decline**.
4. **Approve** crée une licence et l'**active directement** sur le compte : pas de clé à envoyer. La personne clique sur « Check again » (ou relance l'app) et entre.
5. **Decline** : la personne voit « Request declined ».

Les comptes existants **sans licence** apparaissent aussi dans la liste au moment de l'installation.

## Installation (une seule fois)

1. Supabase → SQL Editor : coller **tout** `migrations/20261121_account_approval.sql` → Run (à faire après les deux scripts de sécurité).
2. Te déclarer administrateur (remplace l'e-mail) :

   ```sql
   insert into public.platform_admins (user_id)
   select id from auth.users where email = 'ton-email@exemple.com'
   on conflict do nothing;
   ```

3. Vérifier :

   ```sql
   select u.email from public.platform_admins a join auth.users u on u.id = a.user_id;  -- les administrateurs
   select email, status, created_at from public.license_requests order by created_at desc;  -- les demandes
   ```

L'administrateur doit lui-même avoir une licence active pour utiliser l'app.

## Bon à savoir

- **Confirmation d'e-mail** : si *Authentication → Sign In / Providers → Email → Confirm email* est activé, Supabase envoie d'abord à la personne un e-mail de confirmation (c'est son propre e-mail, sans clé). La demande apparaît dès l'inscription, même avant cette confirmation.
- **Retirer un administrateur** : `delete from public.platform_admins where user_id = (select id from auth.users where email = '…');`
- **Revenir sur un refus** : `update public.license_requests set status = 'pending', decided_at = null, decided_by = null where email = '…';` (la demande réapparaît dans l'app).
