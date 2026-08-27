<p align="center">
  <img src="https://content.umami.is/website/images/umami-logo.png" alt="Umami Logo" width="100">
</p>

<h1 align="center">Umami</h1>

<p align="center">
  <i>Umami is a privacy-first analytics platform. Traffic, campaigns, behavior, conversions, and revenue in one place. No cookies, no surveillance, self-hosted or in the cloud.</i>
</p>

<p align="center">
  <a href="https://github.com/KwikKill/umami/blob/master/LICENSE"><img src="https://img.shields.io/github/license/KwikKill/umami.svg" alt="MIT License" /></a>
  <a href="https://github.com/KwikKill/umami/actions/workflows/docker-publish.yml"><img src="https://img.shields.io/github/actions/workflow/status/KwikKill/umami/docker-publish.yml" alt="Build Status" /></a>
  <a href="https://github.com/KwikKill/umami/pkgs/container/umami"><img src="https://img.shields.io/badge/GHCR-ghcr.io%2Fkwikkill%2Fumami-blue?logo=docker" alt="GHCR Image" /></a>
</p>

---

## 🍴 About this fork

This repository is a **personal fork** of [umami-software/umami](https://github.com/umami-software/umami), maintained by [@KwikKill](https://github.com/KwikKill) to run a self-hosted Umami instance across several personal websites. It is **not affiliated with or endorsed by Umami Software, Inc.**. For the official project, documentation, and support, go to [umami.is](https://umami.is) and [umami-software/umami](https://github.com/umami-software/umami).

Unlike upstream, development here happens directly on a single `master` branch: every push is tested, built, and published as a Docker image automatically (see [CI/CD](#-cicd) below).

### ✨ Added on top of upstream Umami

- **Cross-site dashboard** (`/dashboard`): aggregated stats across every registered website: combined totals, a composite time-series chart (one color per site), a per-site table with trend indicators, and a cross-site top-pages leaderboard, all with period-over-period comparisons.
- **Accurate SPA bounce & duration tracking**: a lightweight heartbeat ping keeps long single-page-app sessions from being misreported as bounces or under-timed.
- **Chart annotations**: pin notes (deployments, incidents, campaigns...) directly on a website's traffic chart, with hover tooltips and click-to-edit.
- **API keys** (`Settings → Security`): generate keys scoped to `read` and/or `write` permissions, usable against both the REST API and the MCP server with the same `Authorization: Bearer` header as a session token. Keys can be rotated (new secret, same name/permissions) without disrupting integrations that just need to know a key exists.
- **MCP server** (`/api/mcp`): exposes Umami to LLM agents over the [Model Context Protocol](https://modelcontextprotocol.io): list/create websites, fetch tracking snippets, and pull single-site or cross-site stats and top-pages. Authenticated the same way as the REST API (session token or API key), scoped by the same read/write permissions.
- **Relative date ranges** (`?sinceMs=N`): every stats/events/sessions endpoint that takes a date range (per-website and the cross-site `/api/websites/overview*` routes alike) now also accepts `sinceMs` (milliseconds, same unit/granularity as `startAt`/`endAt`) as an alternative to `startAt`+`endAt` or `startDate`+`endDate` - the API computes "now" and "now minus sinceMs" itself, so callers don't have to compute an absolute range client-side.
- **GHCR-based CI/CD**: every push to `master` runs the test suite, builds a `linux/amd64` image, and publishes it to `ghcr.io/kwikkill/umami`, with an automatic cleanup job keeping the 10 most recent image versions.

For everything not listed above (general configuration, tracking, reports, self-hosting concepts) the upstream [umami.is/docs](https://umami.is/docs/) still applies.

---

## 🚀 Getting Started

A detailed getting started guide can be found at [umami.is/docs](https://umami.is/docs/).

---

## 🛠 Installing from Source

### Requirements

- A server with Node.js version 22+.
- A PostgreSQL database version v12.14+.

### Get the source code and install packages

```bash
git clone https://github.com/KwikKill/umami.git
cd umami
pnpm install
```

### Configure Umami

Create an `.env` file with the following:

```bash
DATABASE_URL=connection-url
```

Optional: set `API_URL` to change the base URL used by internal UI API calls.
Relative paths are served under `BASE_PATH`; absolute URLs are proxied through the local `/api` route.
For example, `API_URL=/internal-api` or `API_URL=https://api.example.com/api`.

Optional: set `TWO_FACTOR_ENCRYPTION_KEY` to a 64-character hex string to enable two-factor
authentication. Generate one with `openssl rand -hex 32`. Two-factor authentication is unavailable
and cannot be required until this key is set.

The connection URL format:

```bash
postgresql://username:mypassword@localhost:5432/mydb
```

### Build the Application

```bash
pnpm run build
```

The build step will create tables in your database if you are installing for the first time. It will also create a login user with username **admin** and password **umami**.

### Start the Application

```bash
pnpm run start
```

By default, this will launch the application on `http://localhost:3000`. You will need to either [proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/) requests from your web server or change the [port](https://nextjs.org/docs/api-reference/cli#production) to serve the application directly.

---

## 🐳 Installing with Docker

This fork publishes a ready-to-use Docker image on every push to `master` (see [CI/CD](#-cicd)).

Docker image:

```bash
docker pull ghcr.io/kwikkill/umami:latest
```

Docker compose (Runs Umami with a PostgreSQL database):

```bash
docker compose up -d
```

---

## 🔁 CI/CD

Every push to `master` triggers [`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml), which:

1. Installs dependencies, runs the test suite, and does a production build.
2. Builds a `linux/amd64` image and pushes it to `ghcr.io/kwikkill/umami` tagged `latest` and `sha-<short-sha>`.
3. Prunes old GHCR image versions, keeping the 10 most recent (when a `PACKAGE_TOKEN` secret with the `delete:packages` scope is configured).

---

## 🔄 Getting Updates

To get the latest features, simply do a pull, install any new dependencies, and rebuild:

```bash
git pull
pnpm install
pnpm build
```

To update the Docker image, simply pull the new image and recreate the container:

```bash
docker compose pull
docker compose up --force-recreate -d
```

---

## 🛟 Support

This is a personal fork with no dedicated support channel. For general Umami questions, documentation, and community support, use the upstream project's channels:

<p align="center">
  <a href="https://github.com/umami-software/umami"><img src="https://img.shields.io/badge/GitHub--blue?style=social&logo=github" alt="GitHub" /></a>
  <a href="https://twitter.com/umami_software"><img src="https://img.shields.io/badge/Twitter--blue?style=social&logo=twitter" alt="Twitter" /></a>
  <a href="https://linkedin.com/company/umami-software"><img src="https://img.shields.io/badge/LinkedIn--blue?style=social&logo=linkedin" alt="LinkedIn" /></a>
  <a href="https://umami.is/discord"><img src="https://img.shields.io/badge/Discord--blue?style=social&logo=discord" alt="Discord" /></a>
</p>

For bugs or questions about the fork-specific features listed above, use [this repository's issues](https://github.com/KwikKill/umami/issues).

[license-shield]: https://img.shields.io/github/license/KwikKill/umami.svg
[license-url]: https://github.com/KwikKill/umami/blob/master/LICENSE
[build-shield]: https://img.shields.io/github/actions/workflow/status/KwikKill/umami/docker-publish.yml
[build-url]: https://github.com/KwikKill/umami/actions/workflows/docker-publish.yml
[ghcr-url]: https://github.com/KwikKill/umami/pkgs/container/umami
[github-shield]: https://img.shields.io/badge/GitHub--blue?style=social&logo=github
[github-url]: https://github.com/umami-software/umami
[twitter-shield]: https://img.shields.io/badge/Twitter--blue?style=social&logo=twitter
[twitter-url]: https://twitter.com/umami_software
[linkedin-shield]: https://img.shields.io/badge/LinkedIn--blue?style=social&logo=linkedin
[linkedin-url]: https://linkedin.com/company/umami-software
[discord-shield]: https://img.shields.io/badge/Discord--blue?style=social&logo=discord
[discord-url]: https://discord.com/invite/4dz4zcXYrQ
