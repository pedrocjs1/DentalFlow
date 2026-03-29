import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos de Servicio — Dentiqa",
  description:
    "Términos y condiciones de uso de Dentiqa, la plataforma SaaS para clínicas dentales de Violet Wave IA.",
};

export default function TerminosDeServicio() {
  return (
    <article className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-h1:text-3xl prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-p:text-gray-600 prose-li:text-gray-600 prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline">
      <h1>Términos de Servicio</h1>
      <p className="text-sm text-gray-400">Última actualización: 28 de marzo de 2026</p>

      <p>
        Estos Términos de Servicio (&ldquo;Términos&rdquo;) regulan el acceso y uso de la plataforma{" "}
        <strong>Dentiqa</strong> (<a href="https://dentiqa.app">dentiqa.app</a>), operada por Violet Wave IA
        (&ldquo;nosotros&rdquo;, &ldquo;la empresa&rdquo;). Al registrarse o utilizar Dentiqa, usted acepta estos
        Términos en su totalidad.
      </p>

      <h2>1. Aceptación de los Términos</h2>
      <p>
        Al crear una cuenta, acceder o utilizar Dentiqa, usted declara que tiene capacidad legal para celebrar este
        acuerdo y que acepta quedar vinculado por estos Términos. Si utiliza Dentiqa en representación de una clínica u
        organización, declara tener autoridad para obligar a dicha entidad.
      </p>

      <h2>2. Descripción del Servicio</h2>
      <p>
        Dentiqa es una plataforma de software como servicio (SaaS) diseñada para la gestión integral de clínicas
        dentales. El servicio incluye, entre otras funcionalidades:
      </p>
      <ul>
        <li>Gestión de agenda y citas con integración de Google Calendar</li>
        <li>Historial clínico digital (odontograma, periodontograma, evoluciones, recetas)</li>
        <li>Comunicación con pacientes vía WhatsApp con chatbot de inteligencia artificial</li>
        <li>Pipeline CRM para seguimiento de pacientes</li>
        <li>Campañas de marketing y mensajería</li>
        <li>Estadísticas y reportes</li>
        <li>Gestión de equipo y roles</li>
      </ul>

      <h2>3. Registro y Cuentas</h2>
      <h3>3.1 Período de prueba</h3>
      <p>
        Dentiqa ofrece un período de prueba gratuito de 14 días a partir del registro. Durante este período, tendrá
        acceso completo a las funcionalidades de su plan. Al finalizar el período de prueba, deberá contratar un plan
        pago para continuar utilizando el servicio.
      </p>

      <h3>3.2 Datos de la cuenta</h3>
      <p>
        Usted es responsable de mantener la confidencialidad de sus credenciales de acceso y de toda la actividad que
        ocurra bajo su cuenta. Debe notificarnos inmediatamente ante cualquier uso no autorizado.
      </p>

      <h3>3.3 Precisión de la información</h3>
      <p>
        Usted se compromete a proporcionar información veraz, completa y actualizada al registrarse y durante el uso de
        la plataforma.
      </p>

      <h2>4. Planes y Precios</h2>
      <h3>4.1 Planes disponibles</h3>
      <ul>
        <li><strong>Starter (USD 99/mes):</strong> hasta 2 dentistas, 2.000 mensajes WhatsApp/mes, 2.000 interacciones
          IA/mes. Ideal para odontólogos independientes.</li>
        <li><strong>Professional (USD 199/mes):</strong> dentistas ilimitados, 5.000 mensajes WhatsApp/mes, 5.000
          interacciones IA/mes. Ideal para clínicas medianas.</li>
        <li><strong>Enterprise (USD 299/mes):</strong> dentistas ilimitados, 10.000 mensajes WhatsApp/mes, 10.000
          interacciones IA/mes. Ideal para clínicas grandes.</li>
      </ul>

      <h3>4.2 Fee de configuración</h3>
      <p>
        Se aplica un fee de configuración único de USD 499 que incluye la puesta en marcha de la plataforma, migración
        de datos y capacitación inicial. Este fee puede ser eximido a discreción de la empresa.
      </p>

      <h3>4.3 Facturación</h3>
      <p>
        Los precios se expresan en dólares estadounidenses (USD). El cobro se realiza en moneda local a través de
        Mercado Pago, con conversión automática al tipo de cambio vigente al momento de la suscripción. La facturación
        es mensual y recurrente.
      </p>

      <h3>4.4 Uso excedente</h3>
      <p>
        Si excede los límites de su plan (mensajes WhatsApp o interacciones IA), se cobrará USD 20 por cada 1.000
        interacciones adicionales. Nunca se bloqueará la atención a pacientes por exceso de uso.
      </p>

      <h2>5. Uso Aceptable</h2>
      <p>Usted se compromete a:</p>
      <ul>
        <li>Utilizar Dentiqa exclusivamente para la gestión de su clínica dental</li>
        <li>No compartir sus credenciales de acceso con terceros no autorizados</li>
        <li>No intentar acceder a datos de otras clínicas</li>
        <li>No utilizar el servicio para enviar spam o mensajes no solicitados</li>
        <li>No realizar ingeniería inversa, descompilar o intentar extraer el código fuente</li>
        <li>No utilizar la plataforma para actividades ilegales o que violen derechos de terceros</li>
        <li>No intentar sobrecargar, dañar o interferir con el funcionamiento del servicio</li>
        <li>Cumplir con las regulaciones sanitarias y de protección de datos de su jurisdicción</li>
      </ul>

      <h2>6. Datos y Privacidad</h2>
      <p>
        El tratamiento de datos personales se rige por nuestra{" "}
        <a href="/legal/politica-de-privacidad">Política de Privacidad</a>, que forma parte integral de estos Términos.
      </p>
      <p>
        Usted, como clínica, es responsable de obtener el consentimiento de sus pacientes para el tratamiento de sus
        datos a través de Dentiqa, y de cumplir con las leyes de protección de datos personales y de salud aplicables en
        su jurisdicción.
      </p>

      <h2>7. Propiedad Intelectual</h2>
      <p>
        Dentiqa, incluyendo su código, diseño, marca, logotipos, documentación y contenido, es propiedad exclusiva de
        Violet Wave IA. Se concede al usuario una licencia limitada, no exclusiva, no transferible y revocable para
        utilizar la plataforma durante la vigencia de su suscripción.
      </p>
      <p>
        Los datos cargados por la clínica (datos de pacientes, configuraciones, imágenes) son propiedad de la clínica.
        Violet Wave IA no reclama propiedad sobre estos datos.
      </p>

      <h2>8. Limitación de Responsabilidad</h2>
      <p>
        Dentiqa se proporciona &ldquo;tal cual&rdquo; y &ldquo;según disponibilidad&rdquo;. En la máxima medida
        permitida por la ley:
      </p>
      <ul>
        <li>No garantizamos que el servicio sea ininterrumpido, libre de errores o completamente seguro.</li>
        <li>No somos responsables de decisiones clínicas tomadas en base a la información gestionada en la
          plataforma.</li>
        <li>No somos responsables por la precisión de las respuestas generadas por el chatbot de inteligencia
          artificial.</li>
        <li>Nuestra responsabilidad total no excederá el monto pagado por el usuario en los últimos 12 meses.</li>
        <li>No seremos responsables por daños indirectos, incidentales, especiales o consecuentes.</li>
      </ul>

      <h2>9. Disponibilidad del Servicio</h2>
      <p>
        Nos esforzamos por mantener Dentiqa disponible las 24 horas del día, los 7 días de la semana. Sin embargo,
        pueden ocurrir interrupciones por mantenimiento programado, actualizaciones o circunstancias fuera de nuestro
        control. Notificaremos las interrupciones programadas con la mayor antelación posible.
      </p>

      <h2>10. Cancelación y Reembolsos</h2>
      <h3>10.1 Cancelación por el usuario</h3>
      <p>
        Puede cancelar su suscripción en cualquier momento desde la sección de Configuración &gt; Facturación de la
        plataforma. La cancelación será efectiva al final del período de facturación vigente. Tras la cancelación, su
        cuenta pasará a modo de solo lectura durante 90 días, tras los cuales los datos serán eliminados.
      </p>

      <h3>10.2 Cancelación por la empresa</h3>
      <p>
        Nos reservamos el derecho de suspender o cancelar cuentas que violen estos Términos, previo aviso de 15 días
        cuando sea posible. En casos de violación grave, la suspensión podrá ser inmediata.
      </p>

      <h3>10.3 Reembolsos</h3>
      <p>
        Dado que se ofrece un período de prueba gratuito de 14 días, no se otorgan reembolsos por los pagos realizados.
        El fee de configuración no es reembolsable una vez iniciada la puesta en marcha.
      </p>

      <h2>11. Modificaciones a los Términos</h2>
      <p>
        Nos reservamos el derecho de modificar estos Términos en cualquier momento. Notificaremos cambios significativos
        con al menos 30 días de anticipación a través de la plataforma o por email. El uso continuado de Dentiqa tras la
        entrada en vigor de los cambios constituye aceptación de los Términos modificados.
      </p>

      <h2>12. Ley Aplicable y Jurisdicción</h2>
      <p>
        Estos Términos se rigen por las leyes de la República Argentina. Cualquier controversia que surja en relación
        con estos Términos se someterá a la jurisdicción de los tribunales ordinarios de la Ciudad Autónoma de Buenos
        Aires, República Argentina, renunciando las partes a cualquier otro fuero que pudiera corresponderles.
      </p>

      <h2>13. Disposiciones Generales</h2>
      <ul>
        <li>Si alguna disposición de estos Términos resulta inválida, las demás disposiciones continuarán en pleno
          vigor.</li>
        <li>La falta de ejercicio de un derecho no constituye renuncia al mismo.</li>
        <li>Estos Términos constituyen el acuerdo completo entre las partes respecto del uso de Dentiqa.</li>
      </ul>

      <h2>14. Contacto</h2>
      <p>Para consultas sobre estos Términos de Servicio:</p>
      <ul>
        <li><strong>Email:</strong> <a href="mailto:admin@dentiqa.app">admin@dentiqa.app</a></li>
        <li><strong>Empresa:</strong> Violet Wave IA</li>
        <li><strong>País:</strong> Argentina</li>
      </ul>
    </article>
  );
}
