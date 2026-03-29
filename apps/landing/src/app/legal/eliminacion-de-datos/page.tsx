import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Solicitud de Eliminación de Datos — Dentiqa",
  description:
    "Instrucciones para solicitar la eliminación de datos personales de Dentiqa, la plataforma SaaS para clínicas dentales.",
};

export default function EliminacionDeDatos() {
  return (
    <article className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-h1:text-3xl prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-p:text-gray-600 prose-li:text-gray-600 prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline">
      <h1>Solicitud de Eliminación de Datos</h1>
      <p className="text-sm text-gray-400">Última actualización: 28 de marzo de 2026</p>

      <p>
        En <strong>Dentiqa</strong> (operado por Violet Wave IA) respetamos su derecho a controlar sus datos personales.
        Esta página describe cómo puede solicitar la eliminación de sus datos de nuestra plataforma.
      </p>

      <h2>1. Cómo Solicitar la Eliminación</h2>
      <p>
        Para solicitar la eliminación de sus datos, envíe un email a{" "}
        <a href="mailto:admin@dentiqa.app?subject=Solicitud%20de%20eliminaci%C3%B3n%20de%20datos">
          admin@dentiqa.app
        </a>{" "}
        con el asunto <strong>&ldquo;Solicitud de eliminación de datos&rdquo;</strong>.
      </p>
      <p>En el email, incluya la siguiente información para que podamos identificar y procesar su solicitud:</p>
      <ul>
        <li>Nombre completo del titular de la cuenta o del paciente</li>
        <li>Email asociado a la cuenta (si es usuario de Dentiqa)</li>
        <li>Nombre de la clínica (si corresponde)</li>
        <li>Número de teléfono asociado (si se comunicó vía WhatsApp)</li>
        <li>Descripción de los datos que desea eliminar</li>
      </ul>

      <h2>2. Qué Datos se Eliminan</h2>
      <p>Según el tipo de solicitud, se eliminarán:</p>

      <h3>2.1 Para usuarios (clínicas)</h3>
      <ul>
        <li>Datos de la cuenta de usuario (nombre, email, credenciales)</li>
        <li>Configuración de la clínica</li>
        <li>Datos de profesionales</li>
        <li>Datos de pacientes y sus historiales clínicos</li>
        <li>Mensajes de WhatsApp y conversaciones</li>
        <li>Imágenes clínicas almacenadas</li>
        <li>Campañas y registros de envío</li>
        <li>Estadísticas y registros de uso</li>
      </ul>

      <h3>2.2 Para pacientes (que se comunicaron vía WhatsApp)</h3>
      <ul>
        <li>Datos personales (nombre, teléfono)</li>
        <li>Historial de conversaciones con el chatbot y la clínica</li>
        <li>Datos clínicos asociados a su ficha de paciente</li>
      </ul>

      <h2>3. Qué Datos se Retienen</h2>
      <p>
        Tras la eliminación, podremos retener ciertos datos en forma anonimizada y no identificable con fines
        estadísticos y de mejora del servicio. Estos datos anonimizados no pueden vincularse a ninguna persona o clínica
        específica.
      </p>
      <p>
        Asimismo, podremos retener datos cuando sea requerido por obligaciones legales, fiscales o regulatorias
        (por ejemplo, registros de facturación según normativa fiscal vigente).
      </p>

      <h2>4. Plazo de Procesamiento</h2>
      <p>
        Su solicitud será procesada en un plazo máximo de <strong>30 días hábiles</strong> desde la recepción del email.
        Recibirá una confirmación por email cuando la eliminación se haya completado.
      </p>

      <h2>5. Datos Compartidos con Terceros</h2>
      <p>
        Cuando eliminemos sus datos de Dentiqa, también solicitaremos la eliminación a nuestros proveedores de
        servicios, incluyendo:
      </p>
      <ul>
        <li><strong>Meta (WhatsApp):</strong> historial de mensajes procesado a través de la API.</li>
        <li><strong>Supabase:</strong> datos almacenados en la base de datos e imágenes en el storage.</li>
        <li><strong>Anthropic:</strong> no almacena conversaciones de forma persistente; los datos de las interacciones
          con el chatbot no son retenidos por el proveedor de IA.</li>
      </ul>

      <h2>6. Consecuencias de la Eliminación</h2>
      <p>Tenga en cuenta que la eliminación de datos es <strong>irreversible</strong>. Una vez completada:</p>
      <ul>
        <li>No podrá acceder a su cuenta ni a los datos eliminados</li>
        <li>Los historiales clínicos eliminados no podrán recuperarse</li>
        <li>Las imágenes clínicas eliminadas no podrán recuperarse</li>
        <li>Si desea volver a usar Dentiqa, deberá crear una cuenta nueva</li>
      </ul>

      <h2>7. Contacto</h2>
      <p>Si tiene preguntas sobre el proceso de eliminación de datos:</p>
      <ul>
        <li>
          <strong>Email:</strong>{" "}
          <a href="mailto:admin@dentiqa.app">admin@dentiqa.app</a>
        </li>
        <li><strong>Empresa:</strong> Violet Wave IA</li>
        <li><strong>País:</strong> Argentina</li>
      </ul>
      <p>
        Para más información sobre cómo manejamos sus datos, consulte nuestra{" "}
        <a href="/legal/politica-de-privacidad">Política de Privacidad</a>.
      </p>
    </article>
  );
}
