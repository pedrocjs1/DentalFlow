# Páginas Legales Dentiqa — Actualización Completa

## CONTEXTO
Dentiqa (antes DentalFlow) es un SaaS para clínicas dentales de Violet Wave IA. Necesitamos actualizar y crear las páginas legales requeridas por Meta para la app de Facebook/WhatsApp (ID: 1627937931777794).

Actualmente existe una página de política de privacidad en `https://www.violetwaveai.com/dentalflow/politica-de-privacidad`. Esa página pertenece al sitio de violetwaveai.com, NO al proyecto Dentiqa. Las páginas legales de Dentiqa deben vivir en la landing de Dentiqa (`apps/landing`), bajo la ruta `/legal/`.

## DATOS DE LA EMPRESA
- **Producto**: Dentiqa (NO DentalFlow, ese nombre ya no se usa)
- **Empresa**: Violet Wave IA
- **Dominio**: dentiqa.app
- **Landing**: apps/landing (Next.js 15)
- **Email de contacto**: admin@dentiqa.app
- **País**: Argentina
- **Tipo**: SaaS B2B para clínicas dentales en Latinoamérica
- **Datos que procesa**: datos de pacientes (nombre, teléfono, historial médico, odontograma, imágenes clínicas, recetas), datos de la clínica, datos de profesionales, mensajes de WhatsApp, citas, planes de tratamiento, facturación
- **Integraciones**: WhatsApp Cloud API, Google Calendar, Mercado Pago, Anthropic (IA), Resend (email), Supabase (storage)
- **Encriptación**: AES-256-GCM para tokens, HTTPS en todo, Helmet security headers

## TAREAS

### 1. Crear página de Política de Privacidad
- **Ruta**: `/legal/politica-de-privacidad`
- **URL final**: `https://dentiqa.app/legal/politica-de-privacidad`
- Debe decir "Dentiqa" en TODOS lados, NUNCA "DentalFlow"
- Contenido profesional y completo para un SaaS de salud dental
- Cubrir TODOS estos puntos (requerido por Meta + buenas prácticas):
  - Qué datos se recopilan (personales, clínicos, de uso)
  - Cómo se recopilan (formularios, WhatsApp, integraciones)
  - Para qué se usan los datos
  - Con quién se comparten (proveedores: Anthropic para IA, Meta para WhatsApp, Supabase para storage, Mercado Pago para pagos)
  - Cómo se protegen los datos (encriptación, HTTPS, tenant isolation)
  - Derechos del usuario (acceso, rectificación, eliminación)
  - Cookies y tecnologías de rastreo
  - Retención de datos
  - Datos de menores
  - Cambios a la política
  - Contacto
- Diseño consistente con la landing (mismo header/footer, estilo Tailwind)
- En español

### 2. Crear página de Términos de Servicio
- **Ruta**: `/legal/terminos-de-servicio`
- **URL final**: `https://dentiqa.app/legal/terminos-de-servicio`
- Contenido profesional para un SaaS B2B dental
- Cubrir:
  - Aceptación de los términos
  - Descripción del servicio (SaaS para gestión de clínicas dentales)
  - Registro y cuentas (trial 14 días, planes Starter/Professional/Enterprise)
  - Precios y facturación (USD, conversión local, Mercado Pago)
  - Uso aceptable (qué se puede y qué no)
  - Datos y privacidad (referencia a política de privacidad)
  - Propiedad intelectual
  - Limitación de responsabilidad
  - Disponibilidad del servicio (SLA básico)
  - Cancelación y reembolsos
  - Modificaciones a los términos
  - Ley aplicable (Argentina)
  - Contacto
- En español

### 3. Crear página de Eliminación de Datos
- **Ruta**: `/legal/eliminacion-de-datos`
- **URL final**: `https://dentiqa.app/legal/eliminacion-de-datos`
- **CRÍTICO**: Meta verifica que esta URL exista y sea accesible
- Contenido:
  - Título: "Solicitud de Eliminación de Datos"
  - Explicar que los usuarios pueden solicitar la eliminación de sus datos
  - Cómo solicitar: enviar email a admin@dentiqa.app con asunto "Solicitud de eliminación de datos"
  - Qué datos se eliminan: todos los datos personales asociados a la cuenta
  - Qué datos se retienen: datos anonimizados para fines estadísticos
  - Plazo: hasta 30 días hábiles
  - Confirmación: se enviará confirmación por email cuando se complete
  - Datos compartidos con terceros: se solicitará eliminación a proveedores (Meta, Supabase, etc.)
  - Contacto
- En español

### 4. Layout compartido para páginas legales
- Creá un layout o componente reutilizable para las 3 páginas legales
- Header y footer iguales a la landing
- Estilo limpio y legible (max-width contenido, tipografía clara)
- Navegación entre las 3 páginas legales
- Fecha de última actualización visible

### 5. Actualizar links
- En el footer de la landing, agregá links a las 3 páginas legales si no existen
- Verificá que no haya referencias a "DentalFlow" en ningún lado de apps/landing

### 6. Verificar build
- `cd apps/landing && npx next build` para verificar que compila
- `npx tsc --noEmit` sin errores

## URLs FINALES (para actualizar en Meta Developers)
Después de crear las páginas, las URLs que hay que poner en Meta son:
- Política de privacidad: `https://dentiqa.app/legal/politica-de-privacidad`
- Condiciones del servicio: `https://dentiqa.app/legal/terminos-de-servicio`  
- Eliminación de datos: `https://dentiqa.app/legal/eliminacion-de-datos`

## IMPORTANTE
- NO uses "DentalFlow" en NINGÚN lado, el producto se llama "Dentiqa"
- La empresa es "Violet Wave IA"
- Las páginas deben verse profesionales y ser legalmente sólidas
- Deben ser accesibles públicamente sin login
- El diseño debe ser consistente con el resto de la landing
- Todo en español
