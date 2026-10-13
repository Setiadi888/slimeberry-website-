# Running Slimeberry Lab on Windows

The project has no platform-specific code — the npm scripts are plain
`next dev` / `next build` / `next start`, there are no shell scripts in the dev
path, and nothing needs a `.env` file. Windows needs two installs and nothing
else.

## One-time setup

1. **Node.js 20.9 or newer** (Next.js 16's minimum). The LTS installer from
   [nodejs.org](https://nodejs.org) is the simplest; `winget install
   OpenJS.NodeJS.LTS` does the same from a terminal.
2. **Git for Windows** from [git-scm.com](https://git-scm.com/download/win).
   The installer's defaults are fine — the repo's `.gitattributes` keeps line
   endings as LF whatever Git's own setting is.

## First clone

In PowerShell or Windows Terminal:

```powershell
git clone https://github.com/Setiadi888/slimeberry-website-.git
cd slimeberry-website-
npm install
```

`npm install` takes a few minutes the first time. It only needs running again
when `package.json` changes.

## Every time after

```powershell
cd slimeberry-website-
npm run dev
```

Then open <http://localhost:3000>. `Ctrl-C` in the terminal stops it. The dev
server hot-reloads, so files changed while it runs — including by `git pull` —
show up in the browser on their own.

A production check is `npm run build` followed by `npm run start`.

## Picking up changes made on the Mac

Development happens on the Mac and is pushed to GitHub. To bring this machine
up to date:

```powershell
git pull
```

Only pull here, rather than editing on both machines: editing the same files in
two places is what makes a pull stop on a conflict. If `package.json` changed in
what you pulled, run `npm install` once before `npm run dev`.

## Pushing from Windows

Cloning over HTTPS needs no login. Pushing does. The simplest is an SSH key, the
same way the Mac is set up:

```powershell
ssh-keygen -t ed25519 -C "your-github-name-windows"
type $env:USERPROFILE\.ssh\id_ed25519.pub
```

Add the printed line at <https://github.com/settings/ssh/new>, then point the
remote at SSH:

```powershell
git remote set-url origin git@github.com:Setiadi888/slimeberry-website-.git
```

## The `?room=` switch

Phones open in SB Mart and desktops in the Lab. Either room can be forced from
the address bar: <http://localhost:3000/?room=mart> or `?room=lab`.
