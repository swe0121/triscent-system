# Triscent

A local full-stack scented candle ordering and store management system.

The project uses only Node.js built-in modules and SQLite through `node:sqlite`. There are no npm packages to install.

## Requirements

- Windows, macOS, or Linux
- Node.js 22 or newer

Check Node.js:

```bat
node -v
npm -v
```

## Run on Windows

1. Extract the ZIP.
2. Open the extracted folder. `package.json`, `server.js`, `db.js`, `views.js`, `run.bat`, and `public` should be visible.
3. Double-click `run.bat`, or open CMD in the folder and run:

```bat
npm start
```

4. Open `http://localhost:3000`.

## Customer Store

URL: `http://localhost:3000`

Customers can browse without an account. They create their own account when they want to order.

Customer functions include product browsing, search and filtering, product details, Scent Finder, cart, gift customization, checkout, payment reference submission, order history, order tracking, claim codes, reviews, and concerns.

## Owner / Staff Management Portal

URL: `http://localhost:3000/management/login`

Both Owner and Staff use the same login page, the same dashboard, the same navigation, and the same management features.

Initial accounts:

- Owner: `admin@triscent.local` / `Admin123!`
- Staff: `staff@triscent.local` / `Staff123!`

Management functions include overview, products and inventory, orders, customers, reviews and concerns, reports, live database viewer, and staff account management.

## Two-side system

The system has only two sides:

1. Customer Store
2. Owner / Staff Management

Old `/owner` and `/staff` links only redirect into the shared `/management` side. There are no separate Owner and Staff interfaces.

## Product photo upload

Upload these five JPG files to `public/assets/products/`:

- `baby-powder.jpg`
- `lavender.jpg`
- `warm-cotton.jpg`
- `sea-breeze.jpg`
- `pomegranate.jpg`

The database automatically assigns those images to every size of the matching scent. Vanilla, Coffee, Strawberry, and Cinnamon keep the default image until real photos are provided.

## Stop the server

In the CMD window running Triscent, press:

```text
Ctrl + C
```

If Windows asks `Terminate batch job (Y/N)?`, type `Y` and press Enter.

## Design direction

The storefront uses a warm cream, burnt orange, brown, and muted green visual style inspired by Triscent's social media aesthetic. The system functions, roles, checkout flow, payment verification, inventory logic, and portal permissions are unchanged.

## GitHub group workflow

This repository is intended to be shared by the Triscent project group.

### First-time local setup

1. Clone the repository.
2. Open the cloned folder.
3. Check Node.js with `node -v`. Use Node.js 22 or newer.
4. Run `npm start`.
5. Open `http://localhost:3000`.

There is no `npm install` step because the project uses Node.js built-in modules only.

### Updating your copy

Before working, run:

```bash
git pull
```

After making changes:

```bash
git add .
git commit -m "describe your changes"
git push
```

For group work, it is better to create a branch for each change and merge it after checking the work.

### GitHub Codespaces

If Codespaces is available on the GitHub account, open the repository, choose **Code > Codespaces > Create codespace on main**, then run:

```bash
npm start
```

Port 3000 is configured to forward automatically.

### Important

The SQLite database file is created locally at runtime and is ignored by Git. This prevents each group member's local test data from overwriting everyone else's copy.

## Railway deployment for beneficiary testing

The app is ready for Railway. The beneficiary does not need Node.js, CMD, or GitHub. They only open the public Railway URL.

### Deploy once

1. Push this folder to a GitHub repository.
2. In Railway, choose **New Project > Deploy from GitHub repo** and select the repository.
3. After the deployment succeeds, open **Settings > Networking > Generate Domain**.
4. Open the generated URL to confirm the site works.
5. For persistent SQLite data, add a Railway Volume mounted at `/data`.
6. Add the service variable `DB_PATH=/data/triscent.db`.
7. Redeploy once after adding the volume and variable.

After this, send the generated Railway URL to the beneficiary.

Customer: `https://YOUR-DOMAIN.up.railway.app`

Owner / Staff: `https://YOUR-DOMAIN.up.railway.app/management/login`

The application already reads Railway's `PORT` environment variable and supports `DB_PATH` for persistent SQLite storage.
