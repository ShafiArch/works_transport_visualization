# Transport Visualization

Animation renders by Shafiul Islam, hosted on YouTube and shown on one page:
https://shafiarch.github.io/works_transport_visualization/

## Publish

Settings, Pages, Build and deployment: Deploy from a branch, `main`, folder `/ (root)`.
No build step; `.nojekyll` makes GitHub serve the files as they are.

## Adding a render

Open `manage.html` (the "Manage videos" link at the bottom of the page):

1. Paste one or more YouTube links and press Add. youtu.be, watch, shorts and embed links all
   work; the title is filled in from YouTube.
2. Add tags (Bridge, Rain, Night ...). Tags become the filter buttons on the page.
3. Order the list by dragging or with the arrows; new renders go to the top. The starred render
   is shown large at the top of the page (without a star, the first one is).
4. Publish. The first time, connect GitHub with a fine-grained token for this repository only
   (Contents: read and write); the dialog walks through it, and the token stays in that
   browser. Or Download videos.json and upload it into `content/`.

The draft stays in the browser until it is published or discarded.

## What is where

| What | Where |
| --- | --- |
| The list of videos, their order, titles and tags | `content/videos.json` |
| The page | `index.html`, `assets/site.css`, `assets/site.js` |
| The manager | `manage.html`, `assets/manage.css`, `assets/manage.js`, `assets/github.js` |

The page loads only the YouTube thumbnails; the player (youtube-nocookie.com) is made when a
video is opened, so 30 or more renders stay light. Each video has its own link, `#v=` and its
YouTube id. Themes Trace, Night and Clay are shared with the other ShafiArch sites.

## Rules

- No em dashes or en dashes in text, code comments or docs.
- Commits are authored and committed as Shafiul Islam
  (`145989139+ShafiArch@users.noreply.github.com`), with no co-author lines.
- Whenever a `.css` or `.js` file changes, raise `?v=N` on its tags in `index.html` and `manage.html`.
