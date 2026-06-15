# Licences et securite Logifilm

## Installation initiale

Executez `supabase_licenses_schema.sql` une seule fois dans le SQL Editor
Supabase, puis `supabase_contracts_schema.sql`.

Pour une base deja installee avec les anciennes licences par appareil,
executez `migrations/20260615_account_licenses.sql`.

Executez ensuite `migrations/20260615_security_hardening.sql`. Cette migration :

- exige une licence active pour les donnees metier ;
- isole les compagnies et leurs contrats par utilisateur ;
- installe une recherche serveur limitee ;
- lie une licence au compte utilisateur, utilisable sur tous ses ordinateurs ;
- empeche deux activations simultanees de depasser la limite de comptes.

Si des compagnies existent deja sans proprietaire, la premiere execution
prepare la base puis s'arrete avant de changer les politiques. Attribuez chaque
compagnie a son proprietaire, puis executez la migration une seconde fois :

```sql
update public.companies
set owner_user_id = (
  select id from auth.users where email = 'proprietaire@example.com'
)
where name = 'Nom de la compagnie';
```

## Creer une licence

Dans le SQL Editor Supabase :

```sql
select public.admin_create_license(
  'Nom du client',
  1,
  now() + interval '1 year'
);
```

La valeur retournee est la cle a transmettre au client. Elle ne sera plus
visible ensuite : seule son empreinte SHA-256 est stockee. Le deuxieme
parametre est le nombre maximal de comptes utilisateurs, sans limite de PC par
compte.

## Administrer une licence

Voir les licences :

```sql
select id, label, status, max_accounts, expires_at, created_at
from public.license_keys
order by created_at desc;
```

Suspendre une licence :

```sql
update public.license_keys
set status = 'suspended'
where id = 'ID_DE_LA_LICENCE';
```

Reactiver une licence :

```sql
update public.license_keys
set status = 'active'
where id = 'ID_DE_LA_LICENCE';
```

Revoquer definitivement une licence :

```sql
update public.license_keys
set status = 'revoked'
where id = 'ID_DE_LA_LICENCE';
```

Liberer les comptes d'une licence :

```sql
delete from public.license_activations
where license_id = 'ID_DE_LA_LICENCE';
```

## Protections appliquees

- validation de licence dans Supabase, jamais uniquement dans l'application ;
- cles stockees sous forme de hash SHA-256 ;
- expiration, suspension, revocation et limite de comptes ;
- un compte active fonctionne sur tous ses ordinateurs ;
- routes metier bloquees sans authentification et licence active ;
- isolation du contexte Electron, sandbox, Node.js desactive dans l'interface ;
- nouvelles fenetres, navigations externes et scripts non autorises bloques.

## Limites importantes

- Rendez le depot source GitHub prive. Une licence ne protege pas un code
  publie publiquement.
- Une application JavaScript peut toujours etre modifiee par un attaquant
  avance. La securite des donnees doit aussi etre imposee par les politiques
  RLS Supabase.
- La cle anonyme Supabase est publique par conception. Ne placez jamais une
  `service_role` ou un secret administrateur dans l'application.
