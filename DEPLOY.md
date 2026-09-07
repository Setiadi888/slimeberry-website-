# Deploying Slimeberry Lab

Target: a Linux host running the app on **port 3000** behind **Caddy**, which
already terminates HTTP/HTTPS on that box.

Requires **Node 20.9+** (Next.js 16). Check with `node -v` before starting.

## First deploy

```bash
# on the server
sudo mkdir -p /srv/slimeberry && sudo chown "$USER" /srv/slimeberry
git clone https://github.com/Setiadi888/slimeberry-website-.git /srv/slimeberry
cd /srv/slimeberry

npm ci                 # install exactly what package-lock.json pins
npm run build          # produces .next/
npm run start -- -p 3000   # smoke test, then Ctrl-C
```

Then install the service and the proxy:

```bash
sudo cp deploy/slimeberry.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now slimeberry
systemctl status slimeberry --no-pager
```

Add the site block from `deploy/Caddyfile.example` to `/etc/caddy/Caddyfile`,
then:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## Updating an existing deploy

```bash
cd /srv/slimeberry
git pull
npm ci
npm run build
sudo systemctl restart slimeberry
```

`npm ci` is deliberate over `npm install` — it installs the locked versions and
fails loudly if `package-lock.json` and `package.json` disagree, rather than
silently resolving something different from what was tested.

## Checks

```bash
curl -I http://127.0.0.1:3000        # app is up on loopback
systemctl status slimeberry          # service is healthy
journalctl -u slimeberry -n 50 --no-pager   # recent logs
```

## Notes

- The app binds to `127.0.0.1` only. Port 3000 is deliberately not public —
  Caddy is the entry point. Do not open 3000 in the firewall.
- The build needs roughly 1 GB of free RAM. On a small VPS, add swap or run
  `npm run build` locally and rsync the `.next` directory up instead.
- `NODE_ENV=production` is set by the unit; `npm run start` will not serve a
  development build.
