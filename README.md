This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Troubleshooting Amplify build ("pnpm: command not found")

If you see an Amplify build error like "pnpm: command not found", Amplify's build image may not have pnpm installed. To fix this, add a project-level Amplify build configuration that uses npm (or installs pnpm first). This repository includes a .amplify.yml that runs npm install and npm run build by default.

If you prefer pnpm, update the preBuild commands in .amplify.yml to install pnpm first, for example:
```bash
npm install -g pnpm
pnpm install
pnpm run build
```

## Variables de entorno recomendadas para Amplify

Configura estas variables en Amplify Console > App settings > Environment variables (asegúrate de marcar las sensibles como "Encrypted" cuando corresponda).

Variables mínimas recomendadas
- AMPLIFY_USE_DEV
  - Uso: Si quieres que la pipeline ejecute `npm run dev` en lugar de `npm run build` (solo para pruebas).
  - Valores: "true" (dev) / "false" o no definida (build por defecto).
  - Nota: No se recomienda usar `dev` en producción.

- NODE_ENV
  - Uso: Indica el entorno de Node.
  - Valor típico: `production` para builds.

Variables comunes de aplicación (ajusta según tu proyecto)
- NEXT_PUBLIC_API_URL
  - Uso: URL pública de tu API que necesita el cliente.
  - Ejemplo: `https://api.example.com`

- NEXTAUTH_URL
  - Uso: URL pública para NextAuth (si usas next-auth).
  - Ejemplo: `https://mi-app.example.com`

Variables secretas (no visibles públicamente)
- NPM_TOKEN
  - Uso: Token para acceder a paquetes privados desde la pipeline.
- DATABASE_URL, API_KEY, SECRET_KEY, etc.
  - Uso: Cadenas de conexión y claves sensibles necesarias en runtime/build.

Cómo añadirlas en Amplify
1. Entra a la consola AWS Amplify → selecciona tu app → Branch settings (o App settings) → Environment variables.
2. Añade cada key/value. Marca "Encrypted" para secretos.
3. Guarda y vuelve a ejecutar un deploy.

Ejemplo mínimo para pruebas
- AMPLIFY_USE_DEV = true
- NODE_ENV = production
- NEXT_PUBLIC_API_URL = https://dev-api.example.com

Recuerda revisar qué variables necesita tu aplicación (por ejemplo auth, APIs, tokens) y sólo exponer en NEXT_PUBLIC_* las variables que deben estar disponibles en el navegador.
