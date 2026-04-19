# CLAUDE.md — Guía de trabajo para Claude Code

Lee este archivo al inicio de cada sesión antes de tocar nada.

---

## Proyecto

**ATS Killer** — Herramienta gratuita de Manfred para analizar CVs contra sistemas ATS.
Next.js 14 (App Router) + Supabase + Gemini AI. Desplegado en **Railway**.

### Stack
- **Frontend/Backend**: Next.js 14.2 (App Router, `src/` directory)
- **Base de datos**: Supabase — tablas `feedback` e `issues`
- **IA**: Gemini — modelo **siempre `gemini-2.5-flash-preview`**, nunca modelos `2.0` (dan error)
- **Estilos**: Tailwind CSS con tokens de diseño Manfred (navy `#092c64`, teal `#0DA1A4`, neon `#01FFC6`)
- **Fuentes**: `Big Shoulders Display` solo para números/gráficos, nunca para headings

---

## Flujo de trabajo Git — OBLIGATORIO

### Ramas
- `master` → producción (Railway despliega desde aquí). **Nunca pushear directamente a master.**
- `dev` → rama de trabajo. Todo el código va aquí primero.

### Proceso para cada tarea
1. Asegurarse de estar en `dev` o crear rama desde `dev` si la tarea es grande
2. Hacer los cambios
3. Commit con **Conventional Commits** (ver formato abajo)
4. Push a `dev`
5. Abrir PR de `dev` → `master` con `gh pr create`
6. El usuario revisa y aprueba — **no mergear sin aprobación explícita**

```bash
# Flujo estándar
git checkout dev
git pull origin dev
# ... cambios ...
git add <archivos específicos>
git commit -m "fix: descripción del cambio"
git push origin dev
gh pr create --base master --head dev --title "..." --body "..."
```

### Formato de commits (Conventional Commits)
```
fix: corrección de bug
feat: nueva funcionalidad
improve: mejora de algo existente
security: cambio relacionado con seguridad
refactor: reorganización sin cambio funcional
docs: documentación
chore: tareas de mantenimiento
```

---

## Seguridad — REVISAR ANTES DE CADA COMMIT

### Reglas absolutas
- **NUNCA** hardcodear API keys, tokens, URLs de Supabase ni ningún secret en el código fuente
- **NUNCA** usar `NEXT_PUBLIC_` para variables sensibles (Supabase URL, service role key, etc.)
- **TODAS** las variables de entorno van en `.env.local` (ya en `.gitignore`) y en Railway
- **NUNCA** añadir `.env.local` ni ningún `.env*` al control de versiones

### Variables de entorno del proyecto
Todas deben leerse via `process.env.*` — nunca inline:
```
GEMINI_API_KEY          → clave de Gemini AI
SUPABASE_URL            → URL del proyecto Supabase (privada, no NEXT_PUBLIC)
SUPABASE_SERVICE_ROLE_KEY → clave de servicio Supabase
AUTH_USERNAME           → usuario del login de admin
AUTH_PASSWORD           → contraseña del login de admin
AUTH_SECRET             → secreto de sesión
```

### Checklist de seguridad antes de `git add`
```bash
# Ejecutar antes de cualquier commit:
grep -rn "eyJhbGci\|AIzaSy\|supabase\.co\|_KEY=\|_SECRET=" src/ --include="*.ts" --include="*.tsx"
# Si devuelve algo que NO es process.env → no commitear, corregir primero
```

---

## Arquitectura del proyecto

```
src/
├── app/
│   ├── admin/feedback/     → Panel de admin (feedback + issues)
│   ├── api/
│   │   ├── analyze/        → Análisis de CV con Gemini
│   │   ├── auth/           → Login/logout
│   │   ├── feedback/       → CRUD feedback (Supabase)
│   │   ├── issues/         → CRUD issues (Supabase) — auto-seed en primer GET
│   │   ├── match/          → Match CV-oferta con Gemini
│   │   └── linkedin/       → Análisis LinkedIn con Gemini
│   ├── editor/             → Editor de CV con plantilla Harvard
│   ├── match/              → Match CV-oferta (UI)
│   ├── linkedin/           → Análisis LinkedIn (UI)
│   └── results/            → Resultados del análisis ATS
├── components/
│   ├── Header.tsx          → Navegación principal (mobile: menú hamburguesa)
│   ├── LanguageSelector.tsx → Selector ES/EN (guarda en localStorage)
│   └── ...
└── lib/
    ├── history.ts          → Historial de análisis en localStorage (dedup por analyzedAt)
    ├── gemini*.ts          → Clientes Gemini (usar siempre gemini-2.5-flash-preview)
    └── ...
```

---

## Reglas de diseño

- El fondo del header debe mantener siempre el color original — **nunca navy**
- `Big Shoulders Display` solo para números y elementos gráficos, no para headings de texto
- Paleta Manfred: navy `#092c64`, teal `#0DA1A4`, neon `#01FFC6`, bg `#f0ede8`
- La app tiene login básico (admin/contraseña) — todo el contenido está protegido excepto `/login`, `/api/auth` y `/api/og`

---

## Sistema de Issues (admin)

`/admin/feedback` tiene tres pestañas:
- **Activos**: feedback sin resolver
- **Archivados**: feedback marcado como resuelto
- **Issues**: 32 issues generadas del análisis del feedback beta, organizadas en BUG-XX, UX-XX, IDEA-XX

### Proceso al corregir una issue
1. Implementar el fix en `dev`
2. Marcar el feedback vinculado como `procesado: true` + `resuelto: true` en Supabase
3. Marcar la issue como `resuelto` en Supabase
4. Commit + push a `dev` + PR

---

## Qué NO hacer

- No pushear a `master` directamente
- No hardcodear ningún valor de entorno
- No añadir features no pedidas al corregir un bug
- No añadir comentarios innecesarios al código
- No usar emojis en el código ni en los commits
- No asumir el proveedor de despliegue (es Railway, no Vercel)
- No mergear PRs sin aprobación explícita del usuario
