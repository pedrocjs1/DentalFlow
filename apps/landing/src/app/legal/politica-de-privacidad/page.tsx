import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad — Dentiqa",
  description:
    "Política de privacidad de Dentiqa, la plataforma SaaS para clínicas dentales de Violet Wave IA.",
};

export default function PoliticaDePrivacidad() {
  return (
    <article className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-h1:text-3xl prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-p:text-gray-600 prose-li:text-gray-600 prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline">
      <h1>Política de Privacidad</h1>
      <p className="text-sm text-gray-400">Última actualización: 28 de marzo de 2026</p>

      <p>
        Violet Wave IA (&ldquo;nosotros&rdquo;, &ldquo;nuestro&rdquo;) opera la plataforma <strong>Dentiqa</strong> (
        <a href="https://dentiqa.app">dentiqa.app</a>), un software como servicio (SaaS) diseñado para la gestión
        integral de clínicas dentales en Latinoamérica. Esta Política de Privacidad describe cómo recopilamos, usamos,
        compartimos y protegemos la información personal de nuestros usuarios y de los pacientes gestionados a través de
        nuestra plataforma.
      </p>
      <p>
        Al utilizar Dentiqa, usted acepta las prácticas descritas en esta política. Si no está de acuerdo, le
        solicitamos que no utilice nuestros servicios.
      </p>

      <h2>1. Datos que Recopilamos</h2>

      <h3>1.1 Datos de la clínica y sus profesionales</h3>
      <ul>
        <li>Nombre de la clínica, dirección, país, zona horaria</li>
        <li>Nombre, email, teléfono y rol de cada usuario (propietario, administrador, dentista, recepcionista)</li>
        <li>Especialidades, horarios de trabajo y configuración profesional de los dentistas</li>
      </ul>

      <h3>1.2 Datos de pacientes</h3>
      <ul>
        <li>Nombre completo, teléfono, email, fecha de nacimiento, DNI/documento</li>
        <li>
          Historial médico: alergias, medicamentos, condiciones médicas, antecedentes familiares, factor RH, grupo
          sanguíneo
        </li>
        <li>Odontograma, periodontograma, planes de tratamiento, evoluciones clínicas</li>
        <li>Imágenes clínicas (radiografías, fotos intraorales)</li>
        <li>Recetas médicas y consentimientos informados</li>
        <li>Historial de citas y tratamientos realizados</li>
      </ul>

      <h3>1.3 Datos de comunicación</h3>
      <ul>
        <li>Mensajes enviados y recibidos a través de WhatsApp (integración con Meta Cloud API)</li>
        <li>Interacciones con el chatbot de inteligencia artificial</li>
        <li>Notificaciones y campañas de marketing enviadas</li>
      </ul>

      <h3>1.4 Datos de uso y técnicos</h3>
      <ul>
        <li>Registros de uso de la plataforma (interacciones IA, mensajes WhatsApp enviados)</li>
        <li>Dirección IP, agente de usuario del navegador (para seguridad y auditoría)</li>
        <li>Registros de seguridad (intentos de login, acciones administrativas)</li>
      </ul>

      <h3>1.5 Datos de facturación</h3>
      <ul>
        <li>Plan contratado, estado de suscripción, historial de pagos</li>
        <li>Los datos de pago (tarjeta de crédito) son procesados exclusivamente por Mercado Pago; Dentiqa no almacena
          datos de tarjetas</li>
      </ul>

      <h2>2. Cómo Recopilamos los Datos</h2>
      <ul>
        <li><strong>Registro:</strong> al crear una cuenta en Dentiqa, usted proporciona datos de la clínica y del
          usuario principal.</li>
        <li><strong>Uso de la plataforma:</strong> los datos de pacientes, citas y tratamientos son cargados por los
          profesionales de la clínica.</li>
        <li><strong>WhatsApp:</strong> los mensajes de pacientes llegan a través de la integración con Meta Cloud API
          (WhatsApp Business).</li>
        <li><strong>Integraciones:</strong> Google Calendar (sincronización de citas), Mercado Pago (procesamiento de
          pagos).</li>
        <li><strong>Automáticamente:</strong> datos de uso, logs de seguridad y registros de auditoría se generan
          durante el uso normal de la plataforma.</li>
      </ul>

      <h2>3. Para Qué Usamos los Datos</h2>
      <ul>
        <li>Proveer y mantener el servicio de gestión de clínicas dentales</li>
        <li>Gestionar citas, tratamientos, historiales clínicos y comunicaciones con pacientes</li>
        <li>Operar el chatbot de inteligencia artificial para responder consultas de pacientes</li>
        <li>Enviar recordatorios de citas, seguimientos post-tratamiento y campañas de marketing</li>
        <li>Procesar pagos y gestionar suscripciones</li>
        <li>Generar estadísticas y reportes para la clínica</li>
        <li>Garantizar la seguridad de la plataforma (detección de accesos no autorizados, rate limiting)</li>
        <li>Mejorar nuestros servicios y desarrollar nuevas funcionalidades</li>
        <li>Cumplir con obligaciones legales</li>
      </ul>

      <h2>4. Con Quién Compartimos los Datos</h2>
      <p>No vendemos datos personales a terceros. Compartimos datos únicamente con los siguientes proveedores de
        servicios, bajo acuerdos de confidencialidad:</p>
      <ul>
        <li><strong>Anthropic:</strong> procesamiento de lenguaje natural para el chatbot IA. Se envían mensajes de
          pacientes (sin datos identificatorios más allá del nombre de pila) para generar respuestas.</li>
        <li><strong>Meta (WhatsApp Cloud API):</strong> envío y recepción de mensajes de WhatsApp.</li>
        <li><strong>Supabase:</strong> almacenamiento de base de datos y archivos (imágenes clínicas). Servidores en
          Sudamérica (sa-east-1).</li>
        <li><strong>Mercado Pago:</strong> procesamiento de pagos de suscripciones.</li>
        <li><strong>Google:</strong> sincronización de citas con Google Calendar (solo si la clínica lo activa).</li>
        <li><strong>Resend:</strong> envío de emails transaccionales.</li>
        <li><strong>Vercel / Railway:</strong> hosting de la aplicación.</li>
      </ul>
      <p>También podremos divulgar datos cuando sea requerido por ley, orden judicial o autoridad competente.</p>

      <h2>5. Cómo Protegemos los Datos</h2>
      <ul>
        <li><strong>Encriptación en tránsito:</strong> toda la comunicación utiliza HTTPS/TLS.</li>
        <li><strong>Encriptación de tokens:</strong> los tokens de acceso de WhatsApp y Google Calendar se almacenan con
          encriptación AES-256-GCM.</li>
        <li><strong>Aislamiento de datos (tenant isolation):</strong> cada clínica solo puede acceder a sus propios
          datos. Todas las consultas a la base de datos incluyen filtrado por tenant.</li>
        <li><strong>Seguridad de acceso:</strong> autenticación JWT con roles (propietario, administrador, dentista,
          recepcionista), bloqueo de cuenta tras 5 intentos fallidos de login.</li>
        <li><strong>Headers de seguridad:</strong> Helmet (X-Frame-Options, HSTS, X-Content-Type-Options, etc.).</li>
        <li><strong>Rate limiting:</strong> límites de solicitudes para prevenir abuso.</li>
        <li><strong>Validación de archivos:</strong> verificación MIME y magic bytes en subidas de imágenes.</li>
        <li><strong>Protección anti-inyección:</strong> sanitización de inputs, detección de prompt injection en el
          chatbot IA.</li>
        <li><strong>Logs de seguridad:</strong> registro de eventos de seguridad con IP, endpoint y severidad.</li>
      </ul>

      <h2>6. Derechos del Usuario</h2>
      <p>Como usuario de Dentiqa, usted tiene derecho a:</p>
      <ul>
        <li><strong>Acceso:</strong> solicitar una copia de sus datos personales almacenados en la plataforma.</li>
        <li><strong>Rectificación:</strong> solicitar la corrección de datos inexactos o incompletos.</li>
        <li><strong>Eliminación:</strong> solicitar la eliminación de sus datos personales (ver nuestra{" "}
          <a href="/legal/eliminacion-de-datos">página de eliminación de datos</a>).</li>
        <li><strong>Portabilidad:</strong> solicitar la exportación de sus datos en un formato legible.</li>
        <li><strong>Oposición:</strong> oponerse al procesamiento de sus datos para fines de marketing.</li>
        <li><strong>Limitación:</strong> solicitar la limitación del procesamiento de sus datos en determinadas
          circunstancias.</li>
      </ul>
      <p>Para ejercer cualquiera de estos derechos, contacte a{" "}
        <a href="mailto:admin@dentiqa.app">admin@dentiqa.app</a>.</p>

      <h2>7. Cookies y Tecnologías de Rastreo</h2>
      <p>
        Dentiqa utiliza cookies esenciales para el funcionamiento de la plataforma (autenticación JWT, preferencias de
        sesión). No utilizamos cookies de terceros con fines publicitarios ni de rastreo.
      </p>
      <ul>
        <li><strong>Cookies esenciales:</strong> token de autenticación, preferencias de idioma y zona horaria.</li>
        <li><strong>Almacenamiento local:</strong> datos de sesión para mejorar la experiencia de usuario.</li>
      </ul>
      <p>No utilizamos Google Analytics, Facebook Pixel ni otras herramientas de tracking de terceros.</p>

      <h2>8. Retención de Datos</h2>
      <ul>
        <li><strong>Datos de la cuenta:</strong> se conservan mientras la cuenta esté activa. Tras la cancelación, los
          datos se retienen por 90 días antes de ser eliminados definitivamente.</li>
        <li><strong>Datos clínicos de pacientes:</strong> se conservan según las regulaciones locales de cada país
          (generalmente 10 años para registros médicos). La clínica es responsable de cumplir con la normativa de
          retención de su jurisdicción.</li>
        <li><strong>Logs de seguridad:</strong> se conservan por 12 meses.</li>
        <li><strong>Datos de facturación:</strong> se conservan según requisitos fiscales aplicables.</li>
      </ul>

      <h2>9. Datos de Menores</h2>
      <p>
        Dentiqa puede gestionar datos de pacientes menores de edad en el contexto de la atención dental. Estos datos son
        cargados exclusivamente por los profesionales de la clínica bajo el consentimiento del padre, madre o tutor
        legal del menor. Dentiqa no recopila datos directamente de menores.
      </p>

      <h2>10. Transferencias Internacionales</h2>
      <p>
        Los datos pueden ser procesados en servidores ubicados en diferentes regiones (Sudamérica y Estados Unidos) a
        través de nuestros proveedores de infraestructura. Garantizamos que todos los proveedores cumplen con estándares
        adecuados de protección de datos.
      </p>

      <h2>11. Cambios a esta Política</h2>
      <p>
        Nos reservamos el derecho de modificar esta Política de Privacidad en cualquier momento. Notificaremos cambios
        significativos a través de la plataforma o por email. El uso continuado de Dentiqa tras los cambios constituye
        aceptación de la política actualizada.
      </p>

      <h2>12. Contacto</h2>
      <p>
        Si tiene preguntas sobre esta Política de Privacidad o sobre cómo manejamos sus datos, puede contactarnos en:
      </p>
      <ul>
        <li><strong>Email:</strong> <a href="mailto:admin@dentiqa.app">admin@dentiqa.app</a></li>
        <li><strong>Empresa:</strong> Violet Wave IA</li>
        <li><strong>País:</strong> Argentina</li>
      </ul>
    </article>
  );
}
