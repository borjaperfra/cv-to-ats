# ATSKiller — Manfred

Herramienta gratuita para analizar CVs contra sistemas ATS (Applicant Tracking Systems). Desarrollada por Manfred para ayudar a candidatos a mejorar sus CVs antes de que lleguen a un proceso de selección.

## Qué hace

- **Análisis ATS completo**: sube un CV en PDF y obtén una puntuación detallada por categorías (keywords, formato, experiencia, educación, contacto, longitud)
- **Feedback accionable**: sugerencias concretas organizadas por categoría, con pasos específicos para cada mejora
- **Detección de alertas críticas**: columnas múltiples, tablas complejas, caracteres decorativos que rompen el parsing ATS
- **Match con oferta**: pega el texto, una URL o sube un archivo de la oferta y calcula el encaje del CV con la posición; incluye keywords presentes y faltantes
- **Análisis de LinkedIn**: analiza perfiles de LinkedIn completos con puntuación por categorías (titular, resumen, experiencia, habilidades, formación, completitud) y sugerencias accionables
- **Editor de CV**: editor visual con plantilla Harvard; exporta a PDF (captura pixel-perfect) o Markdown; soporta importar el CV analizado y aplicar las recomendaciones ATS con IA
- **Traducción de CV**: traduce el contenido del CV entre inglés y español con IA, manteniendo datos personales y habilidades intactos
- **Historial**: guarda automáticamente los últimos análisis en el navegador
- **Multiidioma**: detecta si el CV está en español o inglés y responde en el mismo idioma; selector manual disponible

## Stack

- **Next.js 14** (App Router) — frontend y API routes
- **Gemini 2.5 Flash** — motor de análisis, feedback, match, LinkedIn y editor
- **Supabase** — almacenamiento de feedback e issues de beta
- **pdf-parse** — extracción de texto de PDFs (límite: 3 MB, 3 páginas)
- **html2canvas + jsPDF** — exportación PDF pixel-perfect desde el editor
- **Tailwind CSS** — sistema de diseño basado en la identidad de Manfred
- **Railway** — despliegue en producción

## Variables de entorno

```bash
GEMINI_API_KEY=              # Clave de Google AI Studio
SUPABASE_URL=                # URL del proyecto Supabase (privada)
SUPABASE_SERVICE_ROLE_KEY=   # Clave de servicio Supabase
AUTH_USERNAME=               # Usuario para el login de admin
AUTH_PASSWORD=               # Contraseña para el login de admin
AUTH_SECRET=                 # Secreto para firmar la cookie de sesión
```

## Desarrollo local

```bash
npm install
npm run dev
```

La app arranca en `http://localhost:3000`.

El panel de administración está en `/admin/feedback` (requiere login).

## Seguridad y límites

- Subida de CVs limitada a PDF, máximo 3 MB y 3 páginas
- Rate limiting en todos los endpoints de análisis (10 req/min por IP; 5 req/3min en login)
- Timeout de 50 s en llamadas a Gemini para evitar bloqueos en Railway (plan Hobby, límite 60 s)
- Variables sensibles nunca expuestas al cliente (`NEXT_PUBLIC_` no se usa para secrets)
