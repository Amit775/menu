# Deployment and CI services

What runs where, and the one-time steps a human does in web consoles. Agents cannot do these: they need your accounts.

| Piece                | Where                       | Deployed by                           |
| -------------------- | --------------------------- | ------------------------------------- |
| Web app (`apps/web`) | Firebase Hosting            | `.github/workflows/deploy-web.yml`    |
| API (`apps/api`)     | Cloud Run, behind `/api/**` | `.github/workflows/deploy-api.yml`    |
| Postgres             | Cloud SQL for PostgreSQL    | Migrations in `deploy-api.yml`        |
| CI task cache        | GitHub Actions cache        | `.github/workflows/ci.yml` (ADR 0018) |

## 1. CI cache

Nothing to set up. CI keeps Nx's local cache (`.nx/cache`) in the GitHub Actions cache. Nx Cloud was dropped on 2026-10-28 when the free plan ran out (ADR 0018).

## 2. Create the Firebase project

1. Go to https://console.firebase.google.com, **Create a project** (for example `menu`). Google Analytics is optional; you can skip it. Note the **project id** (it may get a suffix, like `menu-1a2b3`).
2. Plan: the free **Spark** plan covers Hosting. The API on Cloud Run and a Cloud SQL database will need **Blaze** (pay as you go). If you upgrade, set a budget alert under **Billing > Budgets & alerts** in Google Cloud.
3. Open **Build > Hosting > Get started** and click through. Skip the CLI steps it shows; this repo already has `firebase.json`.

## 3. Install the Firebase CLI locally

```bash
npm install -g firebase-tools   # 15.x; not a workspace dependency (ADR 0002)
firebase login
firebase use --add              # pick the project; or edit .firebaserc by hand
```

The project id (`menu-b29eb`) is already in `.firebaserc`; a project id is not a secret.

Try it locally: `pnpm nx build web && firebase emulators:start --only hosting`, then open http://localhost:5002.

## 4. Let GitHub Actions deploy

1. In https://console.cloud.google.com/iam-admin/serviceaccounts?project=menu-b29eb (the Google Cloud project behind your Firebase project, same id; do not create a new Cloud project), **Create service account** named `github-deployer` with these roles: **Firebase Hosting Admin**, **Service Usage Consumer** (without it deploys fail with `USER_PROJECT_DENIED`), **Cloud Run Viewer** (Hosting reads the `/api/**` Cloud Run target), **API Keys Viewer**. Section 5 adds the API roles.
2. Open the account, **Keys > Add key > Create new key > JSON**. A file downloads.
3. In GitHub, **Settings > Secrets and variables > Actions**:
   - **Secrets** tab: `FIREBASE_SERVICE_ACCOUNT` = the whole JSON file contents.
   - **Variables** tab: `FIREBASE_PROJECT_ID` = your project id.
4. Delete the downloaded JSON file.
5. Optional: in **Settings > Environments**, add required reviewers to `production` so deploys to the live site wait for your approval. The workflow already uses the `production` and `preview` environments.
6. **Sign-in on previews.** Firebase Auth only accepts sign-ins from its authorized domains and takes no wildcards, so the `auth-domains` job in `deploy-web.yml` adds each preview channel's domain (`menu-b29eb--pr<n>-...web.app`) after the deploy, deletes the PR's channel and its domain when the PR closes or loses the `preview` label, and drops expired channels' domains daily. It only touches `menu-b29eb--*.web.app` entries. Give `github-deployer` permission to edit the list with a custom role, narrower than **Firebase Authentication Admin** (which also manages users):
   - https://console.cloud.google.com/iam-admin/roles/create?project=menu-b29eb: title `Auth Domains Editor`, ID `authDomainsEditor`, stage **General Availability**, **Add permissions**: `firebaseauth.configs.get` and `firebaseauth.configs.update`. Create.
   - https://console.cloud.google.com/iam-admin/iam?project=menu-b29eb: edit `github-deployer`, **Add another role** > `Auth Domains Editor`. Save.
   - Listing and deleting channels is already covered by **Firebase Hosting Admin**. Until the role is granted, the job fails with `403` and previews still deploy.
   - To run it by hand: **Actions > Deploy web > Run workflow**.

Shortcut: `firebase init hosting:github` creates the service account and uploads a secret for you, but it names the secret `FIREBASE_SERVICE_ACCOUNT_<PROJECT_ID>` and writes its own workflow files. If you use it, rename the secret to `FIREBASE_SERVICE_ACCOUNT` and delete the workflows it generates.

Once both are set, every merge to `main` deploys the live site, and a same-repo PR gets a preview channel and a URL comment once it has the `preview` label. Adding the label deploys right away and every push after that redeploys; removing it deletes the channel. PRs without the label get no preview, so a stack of small PRs does not create one channel each. Until then the deploy workflow is skipped and shows as such.

## 5. Run the API on Cloud Run with Cloud SQL

Needs the Blaze plan. Everything goes in project `menu-b29eb`, region **`europe-west1`** (Belgium). The region is written in `firebase.json` and `deploy-api.yml`; to use another one, change both before you create anything. Names below (`menu-db`, `menu-api`, `menu`) are what the workflow expects.

Rough cost: about $10 to $13 a month for the smallest Cloud SQL instance and its storage. Cloud Run scales to zero and usually stays in the free tier; Artifact Registry and Secret Manager cost cents.

1. **Budget alert**: https://console.cloud.google.com/billing/budgets, create one for the project (for example $20 a month, alerts at 50%, 90%, 100%).
2. **Enable APIs**: https://console.cloud.google.com/flows/enableapi?apiid=run.googleapis.com,sqladmin.googleapis.com,secretmanager.googleapis.com,artifactregistry.googleapis.com&project=menu-b29eb
3. **Cloud SQL instance**: https://console.cloud.google.com/sql/instances?project=menu-b29eb, **Create instance > PostgreSQL**.
   - Edition **Enterprise** (not Enterprise Plus; only Enterprise has the small shared-core machines), preset **Sandbox**. Alternatively, the 30-day **free trial** instance (Enterprise Plus, 8 vCPU, 64 GB) works the same way; before it ends, move to Enterprise with a shared-core machine, or the bill jumps to hundreds of dollars a month.
   - Version **PostgreSQL 18** (same major version as `docker-compose.yml`). Instance ID `menu-db`. Set a `postgres` password and keep it in your password manager.
   - Region `europe-west1`, **Single zone**.
   - Machine: **Shared core, 1 vCPU, 0.614 GB**. Storage: SSD, 10 GB.
   - Connections: keep **Public IP** on and add **no** authorized networks. Cloud Run and the CI proxy connect through the IAM-checked Cloud SQL connection, so nothing else can reach it.
   - Keep automated backups on. Create, and wait a few minutes.
   - In the instance: **Databases > Create database** `menu`. **Users > Add user account**, built-in authentication, user `menu`, a generated password (letters and digits only, so it needs no URL encoding).
   - Copy the **Connection name** from **Overview**: `menu-b29eb:europe-west1:menu-db`.
4. **Database URL secret**: https://console.cloud.google.com/security/secret-manager?project=menu-b29eb, **Create secret** named `DATABASE_URL` with this value (your password in place of `PASSWORD`):
   ```
   postgresql://menu:PASSWORD@localhost/menu?host=/cloudsql/menu-b29eb:europe-west1:menu-db
   ```
   The `host` parameter is the Unix socket Cloud Run mounts for the instance; CI's proxy serves the same path, so one secret works for both.
5. **Image repository**: https://console.cloud.google.com/artifacts?project=menu-b29eb, **Create repository** named `menu`, format **Docker**, region `europe-west1`. Optional: a cleanup policy that keeps the 10 most recent versions.
6. **Runtime service account** (what the API runs as): in https://console.cloud.google.com/iam-admin/serviceaccounts?project=menu-b29eb, create `menu-api` with the role **Cloud SQL Client**. Then open the `DATABASE_URL` secret, **Permissions > Grant access**: `menu-api@menu-b29eb.iam.gserviceaccount.com`, role **Secret Manager Secret Accessor**.
7. **API deployer service account**, separate from `github-deployer` so pull requests (which get the Hosting key for previews) can never reach the database:
   - In https://console.cloud.google.com/iam-admin/serviceaccounts?project=menu-b29eb, create `api-deployer` with the roles **Cloud Run Admin** (deploys, and makes the service public for Hosting), **Artifact Registry Writer** and **Cloud SQL Client** (migrations go through the proxy).
   - On the `DATABASE_URL` secret, **Permissions > Grant access**: `api-deployer@menu-b29eb.iam.gserviceaccount.com`, role **Secret Manager Secret Accessor**.
   - On the `menu-api` service account, **Permissions > Grant access**: `api-deployer`, role **Service Account User** (lets it deploy a service that runs as `menu-api`).
   - Open `api-deployer`, **Keys > Add key > Create new key > JSON**.
   - In GitHub, **Settings > Environments > production**: set **Deployment branches and tags** to **Selected branches**, add `main`. Then **Environment secrets > Add secret** `GCP_DEPLOY_SERVICE_ACCOUNT` = the whole JSON file. Delete the file.
8. **Placeholder service**, so the Hosting rewrite has a target before the first API deploy: https://console.cloud.google.com/run/create?project=menu-b29eb
   - **Deploy one revision from an existing container image**: `us-docker.pkg.dev/cloudrun/container/hello`.
   - Service name `menu-api`, region `europe-west1`, **Allow public access** (unauthenticated).
   - Under **Containers, volumes, networking, security > Security**, service account `menu-api`. Create.
9. **GitHub variable**: **Settings > Secrets and variables > Actions > Variables**, `CLOUD_SQL_INSTANCE` = `menu-b29eb:europe-west1:menu-db`. This turns on the deploy steps.

After that, every merge to `main` builds the image, applies Prisma migrations, deploys Cloud Run and checks `/api/health`. Check it yourself at https://menu-b29eb.web.app/api/health. Pull requests only build and smoke-test the image.

Preview channels use the same `/api/**` rewrite, so PR previews talk to the production API and database. A staging service can come later.

## 6. Turn on sign-in (done 2026-10-23)

The web app signs in with Firebase Authentication (ADR 0007) and reads its config from Hosting's `/__/firebase/init.json`, so nothing is copied into the repo.

1. https://console.firebase.google.com/project/menu-b29eb/authentication/providers: enable **Google** and **Phone**.
2. **Project settings > General > Your apps**: register a web app. Hosting serves its config.
3. **Authentication > Settings > Authorized domains** already lists `menu-b29eb.web.app` and `localhost`; add a custom domain here when there is one.
4. Optional, for manual checks: **Phone > Phone numbers for testing** adds a number with a fixed code. Keep the code out of the repo and out of tests.

## 7. Store entry photos in Cloud Storage (done 2026-10-24)

Photos (ADR 0011) live in the project's default Firebase Storage bucket, `menu-b29eb.firebasestorage.app`. Only the API touches it, through the Admin SDK; browsers get photos from `/api/photos/...`. Until this is done, uploading a photo fails with a 500 and everything else works.

1. **Create the bucket**: https://console.firebase.google.com/project/menu-b29eb/storage, **Get started**, **Start in production mode** (the default rules refuse every client, which is what we want), location **`europe-west1`**.
2. **Let the API use it**: https://console.cloud.google.com/storage/browser?project=menu-b29eb, open `menu-b29eb.firebasestorage.app`, **Permissions > Grant access**: `menu-api@menu-b29eb.iam.gserviceaccount.com`, role **Storage Object Admin**.

A different bucket can be set with `PHOTO_BUCKET` on the Cloud Run service. Locally and in e2e, `PHOTO_DIR` keeps photos in a folder instead.

## 8. Make yourself the first Admin

Admins approve venues and items, edit tags and grant roles; after the first one, Admins promote others in the app (**Manage > People**).

1. Sign in once on https://menu-b29eb.web.app.
2. https://console.firebase.google.com/project/menu-b29eb/authentication/users: copy your **User UID**.
3. https://console.cloud.google.com/run/detail/europe-west1/menu-api/revisions?project=menu-b29eb, **Edit & deploy new revision > Variables & Secrets > Add variable**: `ADMIN_FIREBASE_UIDS` = your UID (comma-separated for several). Deploy. Later deploys from CI keep the variable.
4. Reload the site: your next request makes you an Admin and **Manage** appears.

A UID in that list is an Admin on every request, so another Admin cannot take the role away while it is listed. Remove it from the list once other Admins exist if you want that.

## 9. Later

- Custom domain: **Hosting > Add custom domain**.
- Keyless deploys: replace the JSON key with Workload Identity Federation (`google-github-actions/auth` supports both).
- Staging API and database for previews.
