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

Configura estas variables en Amplify Console → App settings → Environment variables. Marca las variables sensibles como "Encrypted" cuando corresponda.

1) Variables de control de la pipeline
- AMPLIFY_USE_DEV  
  - Uso: si quieres forzar la ejecución de `npm run dev` en la pipeline (solo para pruebas).  
  - Valores: `true` (usar dev) / `false` o no definida (hacer build).  
  - Nota: no usar `dev` en producción.

- NODE_ENV  
  - Uso: indica el entorno Node.  
  - Valor típico: `production` para builds de producción.

2) Variables públicas (disponibles en el cliente)
- NEXT_PUBLIC_API_URL  
  - Uso: URL pública de tu API para llamadas desde el frontend.  
  - Ejemplo: `https://api.miapp.com`

- NEXT_PUBLIC_ANALYTICS_ID  
  - Uso: identificador público para analíticas (si aplica).

3) Variables secretas (no exponer en el cliente)
- NEXTAUTH_URL  
  - Uso: URL pública para callbacks de auth (si usas next-auth).  
  - Ejemplo: `https://miapp.com`

- DATABASE_URL  
  - Uso: cadena de conexión a la base de datos.  
  - Marcar como Encrypted.

- API_KEY, SECRET_KEY, NPM_TOKEN, etc.  
  - Uso: claves y tokens privados que necesita tu app o la pipeline.  
  - Marcar como Encrypted y no exponer en NEXT_PUBLIC_*.

4) Ejemplos mínimos para pruebas
- Para pruebas rápidas (no recomendadas en prod):  
  - AMPLIFY_USE_DEV = true  
  - NODE_ENV = production  
  - NEXT_PUBLIC_API_URL = https://dev-api.ejemplo.com

- Para despliegue (producción):  
  - NODE_ENV = production  
  - NEXT_PUBLIC_API_URL = https://api.miapp.com  
  - NEXTAUTH_URL = https://miapp.com  
  - DATABASE_URL = <tu-cadena-encrypted>  
  - API_KEY = <tu-api-key-encrypted>

Cómo añadirlas en Amplify
1. Entra a AWS Amplify → selecciona tu app → Branch settings (o App settings) → Environment variables.  
2. Añade cada key/value. Marca "Encrypted" para secretos.  
3. Guarda y vuelve a ejecutar el deploy.

## Nota sobre build y advertencia de lockfiles

El build de producción se ejecutó correctamente (next build) después de añadir una configuración explícita de Turbopack en next.config.js:

- next.config.js ahora contiene:
  turbopack: { root: path.resolve(__dirname) }

Si quieres evitar la advertencia inicial ("We detected multiple lockfiles..."), elimina el lockfile que no pertenece al proyecto (por ejemplo C:\Users\DELL\pnpm-lock.yaml) para dejar solo el lockfile del gestor que uses dentro de este repositorio. Alternativamente, mantener next.config.js con turbopack.root también silencia la advertencia.

## ¿Corre (cómo ejecutar)?

- Resultado del build: el comando `npm run build` se ejecutó correctamente y Next.js prerenderizó las rutas listadas (/, /_not-found, /print). Eso significa que la compilación fue exitosa y las páginas están listas.

- Ejecutar en desarrollo (local):
  - npm run dev
  - Abre http://localhost:3000

- Ejecutar el build en modo producción (local):
  1. npm run build
  2. npm run start
  - `npm run start` ejecuta `next start` y sirve el build optimizado en producción en el puerto configurado (por defecto 3000).

- Servir como sitio estático (opcional):
  - Si quieres un sitio 100% estático, puedes usar `next export` (requiere que tus páginas sean exportables) y luego subir la carpeta `out` a un hosting estático.
  - Comandos típicos:
    - npm run build
    - npx next export
    - Sirve la carpeta `out` con cualquier servidor estático.

- Nota sobre AWS Amplify:
  - Si usas Amplify Hosting en modo estático, usa `next export` y configura `.amplify.yml` para publicar la carpeta `out`.  
  - Si necesitas SSR (server-side rendering) en Amplify, asegúrate de que Amplify soporta la configuración de Next.js que usas o utiliza el hosting compatible con SSR. Nuestra `.amplify.yml` actual ejecuta el build por defecto; ajusta las fases si quieres ejecutar `next export` o un servidor.
