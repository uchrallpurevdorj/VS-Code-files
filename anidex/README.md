# Anidex

Anime info PWA (pure HTML/CSS/JS, no build step). Data by AniList.

## Run locally
    python3 -m http.server 8000   # then open http://localhost:8000

## Publish (GitHub Pages)
Push this folder to a repo, then Settings → Pages → Deploy from branch → `main` / root.
All paths are relative, so it works under `https://<user>.github.io/<repo>/`.

## AniList login (optional)
Register a client at https://anilist.co/settings/developer, set the redirect URL to the exact URL of the hosted app,
and put the client id in `js/config.js` (`ANILIST_CLIENT_ID`). Empty = the login button shows "coming soon".

## Updating
Bump `VERSION` in `sw.js` on every release so installed apps refresh their cached files.
