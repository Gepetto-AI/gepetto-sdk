# Gepetto SDK

[![npm](https://img.shields.io/npm/v/@gepetto/sdk)](https://www.npmjs.com/package/@gepetto/sdk)

The official TypeScript / JavaScript SDK of the [Gepetto API v2](https://docs.gepettoapp.com): real estate photo editing. Enhance a photo, declutter a room, furnish it, change the sky, restyle it, repaint walls and floors, upscale. One call, an image URL in return.

```bash
npm install @gepetto/sdk
```

Node 20 or later (also Bun, Deno and serverless runtimes with `fetch`). Zero dependencies. ESM and CommonJS. Fully typed.

## Quickstart

```ts
import { Gepetto } from '@gepetto/sdk';

const gepetto = new Gepetto(); // reads GEPETTO_API_KEY

const job = await gepetto.furnish({
  url: 'https://assets.gepettoapp.com/raw-images/b85e2aa5-ac29-44a0-93eb-2de0a40f7905.png',
  roomId: 'living_room',
  styleId: 'scandinave',
});

console.log(job.output); // https://assets.gepettoapp.com/api/v2/jobs/.../output.jpg
```

No key yet? A free test key (200 real renders, no watermark) in two commands:

```bash
npx @gepetto/cli login   # opens a page: check the code, click "Authorize"
npx @gepetto/cli init    # writes GEPETTO_API_KEY to .env
```

CommonJS: `const { Gepetto } = require('@gepetto/sdk');`

## What you get

- **The method waits for the image.** Each tool resolves with the finished job, whose `output` is the image URL (typed as a `string`, never `null`). A failed render throws, and is never charged.
- **Your editor knows the ids.** `roomId`, `styleId`, `skyId`, `furnitureId`, `wallType`, `floorType` and `finishId` are suggested as you type, and any other string is still accepted, so an id added on the server works before the SDK is updated.
- **Wrong combinations do not compile.** A mask with neither `roomId` nor `furnitureId`, a `floorType` on `surface: 'walls'`, a typo in a field: TypeScript says so before the API does.
- **Retries are safe.** Every render is sent with an idempotency key (yours, or one generated). A network error, a `429` or a `5xx` is retried with the same key: a render is never started, nor billed, twice.
- **Long renders just work.** If the connection drops while the image is being made, the SDK picks up the same job and waits for it.
- **The names are those of the API.** What the [docs](https://docs.gepettoapp.com) say of an endpoint is true of the method: same fields, same ids, same error codes.

## Tools

The `url` (and `mask`) of every tool is a public http(s) URL of a JPEG, PNG, WebP or HEIC image: upload the photo to your own storage first. The output URL is public too; copy the image if you keep it.

| Method | What it does |
| --- | --- |
| `enhance({ url, straighten? })` | Light and colours corrected at the size of the photo, nothing redrawn |
| `declutter({ url, keepKitchen?, keepBathroom?, keepFireplace? })` | The whole room emptied |
| `declutter({ url, mask })` | What the mask covers removed |
| `furnish({ url, roomId, styleId })` | The whole room furnished |
| `furnish({ url, mask, roomId, styleId })` | The zone of the mask furnished as a room |
| `furnish({ url, mask, furnitureId, styleId? })` | One piece of furniture in the zone |
| `sunshine({ url, skyId, lightProjection?, poolLight?, addLeafs? })` | A blue sky and the matching light |
| `creativeRedesign({ url, roomId, styleId, preserveFloor? })` | The room redesigned in a style |
| `surfaces({ url, surface: 'walls', wallType, customWallColor?, preserveCeiling? })` | Walls repainted |
| `surfaces({ url, surface: 'floor', floorType, includeBaseboard? })` | Floor changed |
| `surfaces({ url, surface: 'finish', finishId })` | A finish applied |
| `upscale({ url, resolution? })` | Enlarged to about 4 (`2k`) or 16 megapixels (`4k`, default) |

A mask is a black image with the zone painted in white, drawn on the photo. Output sizes are in the docs (Images and masks).

Every tool takes a second argument:

```ts
await gepetto.enhance(
  { url, straighten: true },
  {
    idempotencyKey: `${photo.id}:enhance`, // one key per photo and per tool
    timeout: 120_000,         // ms, for this call (default: the client's, 10 minutes)
    signal,                   // an AbortSignal: stops waiting (the render goes on)
  },
);
```

A key always answers the job it first started, whatever the tool and even if that render failed: use one key per photo and per tool, and a new key to try a failed render again.

## Lists

The valid ids, with their names in French, English, Spanish, Portuguese and German:

```ts
await gepetto.listRooms();      // [{ id: 'living_room', name_en: 'Living room', modes: ['auto', 'zone'], ... }]
await gepetto.listStyles();
await gepetto.listFurnitures(); // grouped by type: { interior: [...], kitchen: [...], ... }
await gepetto.listSkies();
await gepetto.listSurfaces();   // { walls, floors, finishes }
```

A room with the `auto` mode can be furnished whole; with `zone`, it can furnish the zone of a mask.

## Errors

Everything throws a `GepettoError`. Its `message` says what to do next, its `code` is stable:

```ts
import { Gepetto, GepettoError } from '@gepetto/sdk';

try {
  await gepetto.furnish({ url, roomId: 'bedrom', styleId: 'modern' });
} catch (e) {
  if (e instanceof GepettoError) {
    e.code;    // 'unknown_room'
    e.message; // 'No room "bedrom". The list, with the modes of each room, is on GET /v2/rooms.'
    e.param;   // 'roomId'
    e.status;  // 400
    e.jobId;   // set when the error concerns a render (failed renders are not charged)
  }
}
```

The codes are listed in the docs (Errors). The SDK adds `connection_error`, `timeout`, `aborted`, `invalid_response` and `invalid_signature`.

## Webhooks

To send many photos, do not hold a connection per render: pass a `webhook`. The method then returns at once with the job in `pending`, and Gepetto POSTs the finished job (success or failure) to your URL.

```ts
const job = await gepetto.enhance({ url, webhook: 'https://your-server.com/gepetto-webhook' });
job.status; // 'pending'
```

Check that a webhook comes from Gepetto with the raw body:

```ts
import express from 'express';
import { verifyWebhook } from '@gepetto/sdk';

app.post('/gepetto-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const job = await verifyWebhook({
    body: req.body,                           // the raw body, not parsed
    signature: req.get('Gepetto-Signature'),
    secret: process.env.GEPETTO_WEBHOOK_SECRET, // webhook_secret of gepetto.account()
  });
  if (job.status === 'success') save(job.output);
  res.sendStatus(200);
});
```

Test and live keys have different webhook secrets. `npx @gepetto/cli webhook test <url>` sends a signed success and a signed failure to your endpoint.

## Jobs, account

```ts
await gepetto.getJob(id);                   // a job as it is now
await gepetto.waitForJob(id);               // until it is finished (throws if the render failed)
await gepetto.listJobs({ status: 'error' }); // the latest failures, with their reason
await gepetto.account();                     // key type, test renders left, webhook secret
await gepetto.usage();                       // renders and consumption of the period
await gepetto.subscribe();                   // the payment link of the subscription
gepetto.isTest;                              // true with a test key
```

## Options

```ts
new Gepetto({
  apiKey: 'live_...',  // default: GEPETTO_API_KEY
  timeout: 600_000,    // ms per call, waiting included (default 10 minutes)
  maxRetries: 2,       // on a network error, a 429 or a 5xx (default 2)
});
```

Keep the key on your server: it gives access to your account and bills it. The SDK refuses to run in a web page.

## Pricing

Test keys are free: 200 renders per account. Live keys: 100 € excl. tax per month including 100 € of renders, then the price of each render. Only successful renders are charged. Details: [docs.gepettoapp.com](https://docs.gepettoapp.com).
