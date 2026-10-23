# Deployment and CI services

What runs where, and the one-time steps a human does in web consoles. Agents cannot do these: they need your accounts, and `cloud.nx.app` is not reachable from agent sandboxes.

| Piece                    | Where                               | Deployed by                          |
| ------------------------ | ----------------------------------- | ------------------------------------ |
| Web app (`apps/web`)     | Firebase Hosting                    | `.github/workflows/deploy-web.yml`   |
| API (`apps/api`)         | Cloud Run (ADR 0002)                | Follow-up PR                         |
| Postgres                 | Cloud SQL for PostgreSQL (ADR 0002) | Follow-up PR                         |
| CI cache and e2e sharing | Nx Cloud                            | `.github/workflows/ci.yml` (nx.json) |

## 1. Connect Nx Cloud (done 2026-10-23)

1. Sign in at https://cloud.nx.app with GitHub and choose **Connect a repository**, then pick `Amit775/menu`. It opens a PR that adds `nxCloudId` to `nx.json`. Merge it. (Alternative from your machine: `pnpm nx connect`, then commit the `nx.json` change.)
2. In the Nx Cloud workspace settings, keep the GitHub integration on so PRs get the Nx Cloud run summary comment.
3. If Nx Cloud shows a CI access token for this workspace, add it as the repository secret `NX_CLOUD_ACCESS_TOKEN` (GitHub repo, **Settings > Secrets and variables > Actions**). Without one, runs still read from the cache.
4. Tell Claude it is connected. CI then uses the atomized `e2e-ci` target, which splits Playwright files into parallel, separately cached tasks.

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

1. In https://console.cloud.google.com/iam-admin/serviceaccounts (same project), **Create service account** named `github-deployer` with these roles: **Firebase Hosting Admin**, **Cloud Run Viewer** (needed once Hosting rewrites to Cloud Run), **API Keys Viewer**.
2. Open the account, **Keys > Add key > Create new key > JSON**. A file downloads.
3. In GitHub, **Settings > Secrets and variables > Actions**:
   - **Secrets** tab: `FIREBASE_SERVICE_ACCOUNT` = the whole JSON file contents.
   - **Variables** tab: `FIREBASE_PROJECT_ID` = your project id.
4. Delete the downloaded JSON file.
5. Optional: in **Settings > Environments**, add required reviewers to `production` so deploys to the live site wait for your approval. The workflow already uses the `production` and `preview` environments.

Shortcut: `firebase init hosting:github` creates the service account and uploads a secret for you, but it names the secret `FIREBASE_SERVICE_ACCOUNT_<PROJECT_ID>` and writes its own workflow files. If you use it, rename the secret to `FIREBASE_SERVICE_ACCOUNT` and delete the workflows it generates.

Once both are set, every same-repo PR gets a preview URL comment and every merge to `main` deploys the live site. Until then the deploy workflow is skipped and shows as such.

## 5. Later

- Custom domain: **Hosting > Add custom domain**.
- API and database: see `docs/decisions/0002-host-on-firebase.md`.
