# Flashcards Front-End

A small jQuery + Bootstrap 5 SPA that consumes the [flashcards-back](https://github.com/leodwahhab/flashcards-back) REST API.

## Features

- Create, edit, and delete flashcards (text and/or image + answer)
- Create, rename, and delete groups
- Assign and unassign flashcards to/from groups
- Study mode with group filtering, answer reveal, and correct/incorrect submission
- Dominance level badges and per-card attempt counters
- Local settings for API base URL, auth token, and user ID

## Run it

No build step. Serve the folder with any static server, for example:

```bash
python -m http.server 5173
```

Then open http://localhost:5173 and click Settings to point at your API (default: `http://localhost:8000`).

If your API requires auth, paste a bearer token and/or user ID in Settings. They are stored in `localStorage` and sent as `Authorization: Bearer <token>` and `X-User-Id` headers.

## Project layout

```
index.html        Markup + Bootstrap layout
css/styles.css    Light custom styles
js/api.js         Thin API client wrapping the endpoints
js/app.js         UI controller (jQuery)
```

## Endpoints consumed

- `/flashcards` — list, create, get, update, delete
- `/groups` — list, create, get detail, update, delete
- `/groups/{group_id}/flashcards/{flashcard_id}` — add/remove assignment
- `/study/flashcards` — fetch study set (optional `group_id`, `limit`)
- `/study/flashcards/{id}/answer` — submit `{ "result": "correct" | "incorrect" }`
