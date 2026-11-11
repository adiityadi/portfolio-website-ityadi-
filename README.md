# ADI — Form & Dimension

Independent Next.js portfolio for Aditya Rathore with a private owner studio at /studio. No ChatGPT account, Sites backend, Cloudflare binding, or OpenAI service is required at runtime.

## Local preview

Use Node.js 22.13+ (Node 22 LTS recommended).

```sh
npm ci
npm run dev
```

Open http://localhost:3000. The bundled portfolio works without database credentials. Saving projects, uploads and owner login require the environment setup below.

## Hostinger through GitHub

1. Use a Hostinger plan with Node.js application support (Business or Cloud).
2. Create a MySQL database and user in hPanel. Keep the full prefixed database and username. Import the schema in db/schema.sql using phpMyAdmin.
3. Generate an owner password hash with `npm run password:hash`. Supply a long unique password through the script prompt. Never commit the password or local environment files.
4. Set the environment variables from .env.example in Hostinger's application settings. Use the actual HTTPS site origin for APP_URL. The password helper also prints a new random SESSION_SECRET. For local .env.local, escape each $ in the scrypt hash as \$; use the raw unescaped hash in Hostinger environment settings. Use APP_URL=http://localhost:3000 for a local authenticated preview.
5. Add a Node.js application, connect the GitHub repository, and select the main branch and repository root.
6. Select Next.js, Node 22, installation `npm ci`, build `npm run build`, and start `npm start`. The build uses webpack for Hostinger compatibility; the start script binds 0.0.0.0 and respects PORT (default 3000).
7. Deploy, open /studio/login, and sign in to manage projects, publication, order, colors, About text, logo and portrait. Pushes to the connected GitHub branch can trigger future deployments.

The application stores project metadata and uploaded images/GLB files in MySQL. This keeps uploads outside Hostinger's overwritten release folders. Each uploaded file is limited to 8 MiB by the app. Hostinger request limits and MySQL max_allowed_packet must also allow the upload; verify a near-limit file after deployment. Back up the database before major changes; it contains your live portfolio edits and media. For larger models use the model URL field with a durable HTTPS URL.

## Validation

```sh
npm run typecheck
npm test
npm run build
```

## Artwork and attribution

Artwork and original portrait belong to Aditya Rathore and were recovered from his original portfolio. Bundled scene attribution is retained in public/credits.html and public/THREEUI-LICENSE.txt. The optional interactive GLB viewer loads Google's model-viewer; fonts load from Google Fonts. These services are independent of ChatGPT.

## Hosting references

- https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/
- https://www.hostinger.com/support/connecting-a-hostinger-mysql-database-to-a-node-js-application/
- https://www.hostinger.com/support/how-to-fix-next-js-16-turbopack-build-errors-on-hostinger/
