# Timely PWA — Control de Horas + Reembolsos

## Qué cambió en esta versión
- Campo "Área" reemplazado por "Concepto" (Trabajo / Reunión)
- Nueva sección de Reembolsos (concepto libre + monto), separada de las horas
- Tarifa por hora configurable individualmente por persona (ya existía)

## Pasos para desplegar

1. **Supabase → SQL Editor** → pega y ejecuta el contenido de `SUPABASE_SETUP.sql`
   (si ya tenías la tabla `records` de antes, este script la borra y la recrea —
   solo hazlo si no tenías datos reales guardados)

2. **Supabase → Authentication → Users** → crea los 8 usuarios si no existen

3. Sube esta carpeta a GitHub (reemplaza los archivos del repo anterior)

4. Vercel redesplegará automáticamente al detectar el push
