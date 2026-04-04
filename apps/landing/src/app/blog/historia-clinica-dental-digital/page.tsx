import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Historia Clinica Dental Digital: Ventajas del Odontograma y Periodontograma Online | Dentiqa",
  description:
    "Descubri por que la historia clinica digital supera al papel en seguridad, accesibilidad y eficiencia clinica.",
  keywords: [
    "historia clinica dental",
    "odontograma digital",
    "periodontograma digital",
    "ficha dental digital",
    "historia clinica odontologica",
    "software dental",
  ],
  openGraph: {
    type: "article",
    locale: "es_AR",
    url: "https://dentiqa.app/blog/historia-clinica-dental-digital",
    siteName: "Dentiqa",
    title: "Historia Clinica Dental Digital: Ventajas del Odontograma y Periodontograma Online",
    description:
      "Descubri por que la historia clinica digital supera al papel en seguridad, accesibilidad y eficiencia clinica.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Historia Clinica Dental Digital - Dentiqa" }],
  },
  alternates: { canonical: "https://dentiqa.app/blog/historia-clinica-dental-digital" },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Historia Clinica Dental Digital: Ventajas del Odontograma y Periodontograma Online",
  description:
    "Descubri por que la historia clinica digital supera al papel en seguridad, accesibilidad y eficiencia clinica.",
  author: { "@type": "Organization", name: "Dentiqa", url: "https://dentiqa.app" },
  publisher: { "@type": "Organization", name: "Violet Wave IA", url: "https://dentiqa.app" },
  datePublished: "2026-03-25",
  dateModified: "2026-03-25",
  mainEntityOfPage: "https://dentiqa.app/blog/historia-clinica-dental-digital",
};

export default function HistoriaClinicaDentalDigitalPage() {
  return (
    <>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      </head>

      <article className="min-h-screen bg-white">
        {/* Breadcrumb */}
        <nav className="max-w-3xl mx-auto px-4 pt-8 text-sm text-gray-500" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="https://dentiqa.app" className="hover:text-blue-600 transition-colors">
                Inicio
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/blog" className="hover:text-blue-600 transition-colors">
                Blog
              </Link>
            </li>
            <li>/</li>
            <li className="text-gray-800 font-medium">Historia Clinica Dental Digital</li>
          </ol>
        </nav>

        {/* Header */}
        <header className="max-w-3xl mx-auto px-4 pt-8 pb-10 border-b border-gray-100">
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
            <span>Equipo Dentiqa</span>
            <span>|</span>
            <time dateTime="2026-03-25">25 de marzo de 2026</time>
            <span>|</span>
            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
              11 min lectura
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            Historia Clinica Dental Digital: Ventajas del Odontograma y Periodontograma Online
          </h1>
        </header>

        {/* Body */}
        <div className="max-w-3xl mx-auto px-4 py-12 text-gray-700 leading-relaxed text-lg">
          <p className="text-xl text-gray-600 mb-8">
            La historia clinica dental es el documento mas importante de cualquier consultorio odontologico. Contiene
            toda la informacion del paciente: desde sus antecedentes medicos hasta cada tratamiento realizado. Sin
            embargo, muchas clinicas siguen dependiendo de carpetas de papel, fichas escritas a mano y archivadores
            que ocupan metros cuadrados de espacio. En esta guia vas a descubrir por que la transicion a una historia
            clinica digital no es solo una cuestion de modernidad, sino una necesidad clinica, legal y operativa.
          </p>

          {/* Seccion 1 */}
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-6">
            Que es una historia clinica dental digital
          </h2>
          <p className="mb-4">
            Una historia clinica dental digital es un registro electronico que almacena toda la informacion clinica de
            un paciente en un sistema informatico seguro. Incluye datos personales, antecedentes medicos, alergias,
            medicamentos, tratamientos realizados, radiografias, fotografias intraorales, odontogramas, periodontogramas,
            evoluciones clinicas y consentimientos informados.
          </p>
          <p className="mb-4">
            A diferencia de la ficha de papel, la historia clinica digital permite el acceso instantaneo a la informacion,
            la busqueda rapida de datos especificos, el registro automatico de fechas y profesionales que intervienen,
            y la posibilidad de compartir informacion entre distintos profesionales de la misma clinica de forma
            segura y ordenada.
          </p>
          <p className="mb-4">
            En el contexto de Latinoamerica, donde muchas clinicas aun funcionan con sistemas mixtos o directamente con
            papel, la digitalizacion de la historia clinica representa un salto cualitativo en la calidad de atencion.
            No se trata solo de tecnologia: se trata de poder tomar mejores decisiones clinicas porque tenes toda la
            informacion disponible en el momento exacto que la necesitas.
          </p>

          {/* Seccion 2 */}
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-6">
            Ventajas frente al papel
          </h2>
          <p className="mb-4">
            Las ventajas de la historia clinica digital sobre el papel son numerosas, y muchas van mas alla de lo
            obvio. Analicemos las principales:
          </p>
          <p className="mb-4">
            <strong>Accesibilidad inmediata.</strong> Cuando un paciente llega a tu consultorio, no necesitas buscar
            su carpeta en un archivo fisico. Con un par de clics tenes toda su historia desplegada: alertas medicas
            resaltadas, ultimo odontograma, evoluciones recientes, plan de tratamiento activo. Esto ahorra minutos
            preciosos en cada consulta y reduce la friccion en la atencion.
          </p>
          <p className="mb-4">
            <strong>Legibilidad garantizada.</strong> Uno de los problemas mas comunes con las fichas de papel es la
            letra ilegible. Un profesional que escribe rapido durante la consulta puede generar notas que ni el mismo
            entiende semanas despues. La historia clinica digital elimina este problema por completo: todo queda
            registrado de forma clara, estructurada y legible.
          </p>
          <p className="mb-4">
            <strong>Busqueda y filtrado.</strong> Necesitas saber cuando fue la ultima limpieza de un paciente? O si
            le indicaste amoxicilina alguna vez? En papel, eso implica revisar paginas y paginas de notas. En un
            sistema digital, una busqueda rapida te da la respuesta en segundos.
          </p>
          <p className="mb-4">
            <strong>Seguridad ante desastres.</strong> Un incendio, una inundacion, o incluso un simple cafe volcado
            pueden destruir anos de registros clinicos. La historia clinica digital, almacenada en la nube con respaldos
            automaticos, esta protegida contra estos riesgos. Tus datos existen en servidores seguros con redundancia
            geografica.
          </p>
          <p className="mb-4">
            <strong>Espacio fisico.</strong> Los archivadores de fichas ocupan espacio valioso en el consultorio. A
            medida que tu base de pacientes crece, necesitas mas y mas espacio. Con la historia clinica digital,
            miles de pacientes caben en una pantalla.
          </p>
          <p className="mb-4">
            <strong>Colaboracion entre profesionales.</strong> En clinicas con varios dentistas, la ficha de papel
            solo puede estar en un lugar a la vez. Si un colega necesita consultar la historia de un paciente que vos
            estas atendiendo, tiene que esperar. Con un sistema digital, multiples profesionales pueden acceder a la
            informacion simultaneamente, cada uno desde su computadora o tablet.
          </p>

          {/* Seccion 3 */}
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-6">
            Componentes de una historia clinica dental completa
          </h2>
          <p className="mb-4">
            Una historia clinica dental completa no es solo un formulario con datos basicos. Debe incluir multiples
            componentes que, en conjunto, ofrecen una vision integral del paciente. Veamos cada uno:
          </p>
          <p className="mb-4">
            <strong>Datos personales y de contacto.</strong> Nombre, documento, fecha de nacimiento, telefono, email,
            obra social o prepaga. Esta informacion basica es la puerta de entrada a la ficha del paciente.
          </p>
          <p className="mb-4">
            <strong>Antecedentes medicos generales.</strong> Enfermedades sistemicas (diabetes, hipertension, cardiopatias),
            alergias (especialmente a medicamentos y anestesicos), medicamentos actuales con dosis, cirugias previas,
            habitos como bruxismo o tabaquismo, y antecedentes familiares relevantes. El factor RH y el grupo sanguineo
            tambien son datos criticos que deben estar visibles.
          </p>
          <p className="mb-4">
            <strong>Odontograma.</strong> Representacion grafica de la dentadura donde se registran hallazgos clinicos:
            caries, restauraciones, ausencias, protesis, endodoncias, fracturas, y mas. Es la herramienta visual
            fundamental del odontologo.
          </p>
          <p className="mb-4">
            <strong>Periodontograma.</strong> Registro detallado del estado periodontal: profundidad de sondaje por
            sitio, sangrado al sondaje, nivel de insercion clinica, furca, supuracion, y indice de placa. Esencial
            para el seguimiento de enfermedad periodontal.
          </p>
          <p className="mb-4">
            <strong>Plan de tratamiento.</strong> Listado organizado de los procedimientos propuestos, con fases,
            prioridades, costos y estado de cada item. Permite al paciente entender que se va a hacer y al profesional
            llevar un seguimiento ordenado.
          </p>
          <p className="mb-4">
            <strong>Evoluciones clinicas.</strong> Registro cronologico de cada consulta: que se hizo, que se observo,
            que se indico. Cada evolucion debe estar firmada por el profesional actuante y vinculada al plan de
            tratamiento correspondiente.
          </p>
          <p className="mb-4">
            <strong>Imagenes diagnosticas.</strong> Radiografias panoramicas, periapicales, cefalometricas, fotografias
            intraorales y extraorales. La posibilidad de vincular imagenes a la ficha del paciente enriquece
            enormemente la historia clinica.
          </p>
          <p className="mb-4">
            <strong>Recetas y consentimientos.</strong> Prescripciones medicas con firma digital y consentimientos
            informados firmados por el paciente antes de procedimientos invasivos.
          </p>

          {/* Seccion 4 */}
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-6">
            Odontograma digital interactivo
          </h2>
          <p className="mb-4">
            El odontograma es probablemente la herramienta mas utilizada en odontologia. En su version tradicional,
            es un diagrama impreso donde el profesional dibuja o colorea con lapiz los hallazgos de cada diente. El
            problema es que estos dibujos son subjetivos, dificiles de estandarizar y practicamente imposibles de
            versionar.
          </p>
          <p className="mb-4">
            Un odontograma digital interactivo resuelve todos estos problemas. En lugar de dibujar a mano, el
            profesional hace clic en el diente y selecciona el tipo de hallazgo de un catalogo estandarizado. Cada
            hallazgo tiene un color y una representacion visual consistente, lo que elimina ambiguedades.
          </p>
          <p className="mb-4">
            Las caracteristicas mas valiosas de un odontograma digital incluyen la <strong>doble vista</strong> (frontal
            y oclusal), que permite registrar hallazgos tanto en las caras visibles del diente como en la superficie
            de masticacion. Tambien el soporte para <strong>denticion permanente y temporal</strong> (32 dientes vs 20),
            fundamental para odontopediatria.
          </p>
          <p className="mb-4">
            El <strong>versionado</strong> es otra ventaja critica. Cada vez que actualizas el odontograma, podes
            guardar una version (snapshot) que queda registrada con fecha y hora. Esto te permite comparar el estado
            de la boca del paciente en distintos momentos, evaluar la progresion de tratamientos y tener un respaldo
            historico ante cualquier eventualidad legal.
          </p>
          <p className="mb-4">
            Un buen sistema de odontograma digital debe ofrecer multiples <strong>zonas clickeables por diente</strong>
            (idealmente 5: mesial, distal, vestibular, lingual/palatino y oclusal/incisal) y un catalogo amplio de
            tipos de hallazgo: caries, obturacion, corona, puente, ausente, endodoncia, implante, fractura, sellante,
            protesis removible, entre otros. Cada tipo con su color distintivo para una lectura visual rapida.
          </p>

          {/* Seccion 5 */}
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-6">
            Periodontograma digital
          </h2>
          <p className="mb-4">
            El periodontograma es el registro sistematico del estado de los tejidos periodontales. Para muchos
            profesionales, completar un periodontograma en papel es una tarea tediosa que consume tiempo valioso.
            Los numeros son pequenos, los espacios reducidos, y un error de transcripcion puede alterar completamente
            la interpretacion del cuadro clinico.
          </p>
          <p className="mb-4">
            El periodontograma digital transforma esta experiencia. En lugar de escribir numeros minusculos en casillas
            de papel, el profesional ingresa los valores directamente en una interfaz visual que calcula automaticamente
            metricas clave como el <strong>porcentaje de sangrado al sondaje (BOP)</strong>, el <strong>nivel de
            insercion clinica (NIC)</strong> y el <strong>indice de placa</strong>.
          </p>
          <p className="mb-4">
            Asi como el odontograma, el periodontograma digital ofrece versionado. Podes comparar mediciones entre
            sesiones para evaluar la respuesta al tratamiento periodontal. Si un paciente tenia un BOP del 45% al
            inicio y despues de tres sesiones de raspaje bajo al 15%, el sistema te muestra esa progresion de forma
            clara y visual.
          </p>
          <p className="mb-4">
            Ademas, se pueden registrar datos especificos por sitio como <strong>furca</strong> (grado I, II o III) y
            <strong> supuracion</strong>, informacion critica para el diagnostico y plan de tratamiento periodontal.
            El registro digital de placa por superficie permite calcular indices de higiene y mostrar al paciente
            su evolucion a lo largo del tiempo, lo que funciona como herramienta motivacional.
          </p>

          {/* Seccion 6 */}
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-6">
            Evoluciones clinicas y firma digital
          </h2>
          <p className="mb-4">
            Las evoluciones clinicas son el registro cronologico de cada atencion. En el sistema tradicional, se
            escriben a mano en la ficha del paciente, muchas veces con abreviaturas que solo el profesional que las
            escribio entiende. Cuando otro odontologo necesita continuar el tratamiento, frecuentemente tiene que
            interpretar notas ambiguas.
          </p>
          <p className="mb-4">
            Un sistema de evoluciones digitales permite usar <strong>plantillas pre-llenables</strong> para los
            procedimientos mas comunes. Si hiciste una extraccion simple, la plantilla ya incluye los campos relevantes:
            pieza extraida, tipo de anestesia, tecnica utilizada, complicaciones (si las hubo), indicaciones
            postoperatorias. Solo completas los datos especificos y firmas.
          </p>
          <p className="mb-4">
            La <strong>firma digital</strong> es un componente fundamental. En un sistema bien implementado, el
            profesional firma cada evolucion con un trazo digital (canvas) que queda vinculado a su identidad y
            a la fecha y hora del registro. Esto tiene validez legal y evita la posibilidad de que alguien modifique
            una evolucion retroactivamente sin dejar rastro.
          </p>
          <p className="mb-4">
            Cada evolucion puede vincularse al <strong>plan de tratamiento</strong> correspondiente y al profesional
            actuante, creando una trazabilidad completa. Si en una auditoria o reclamo necesitas demostrar que se
            realizo determinado procedimiento, todo esta documentado, firmado y con fecha.
          </p>

          {/* Seccion 7 */}
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-6">
            Plan de tratamiento digital
          </h2>
          <p className="mb-4">
            El plan de tratamiento es el mapa de ruta clinico y economico de cada paciente. En papel, suele ser una
            lista escrita a mano que se va tachando a medida que se completan los procedimientos. Las limitaciones son
            evidentes: no se puede reorganizar facilmente, los precios se desactualizan, y calcular totales con
            descuentos requiere una calculadora aparte.
          </p>
          <p className="mb-4">
            Un plan de tratamiento digital ofrece una experiencia completamente diferente. Podes crear <strong>multiples
            planes</strong> para un mismo paciente (por ejemplo, un plan ideal y uno alternativo mas economico),
            organizarlos en <strong>secciones y fases</strong> (fase de urgencia, fase rehabilitadora, fase de
            mantenimiento), y asignar un estado a cada item (pendiente, en progreso, completado, rechazado).
          </p>
          <p className="mb-4">
            Los <strong>descuentos por item</strong> se calculan automaticamente, y el sistema muestra subtotales por
            seccion y totales generales actualizados en tiempo real. Cuando necesitas presentar un presupuesto al
            paciente, podes generar un documento profesional en segundos en lugar de escribirlo a mano en un
            formulario generico.
          </p>
          <p className="mb-4">
            La vinculacion entre plan de tratamiento y evoluciones clinicas cierra el circulo: cada procedimiento
            realizado se registra como evolucion y actualiza automaticamente el estado del item correspondiente en
            el plan.
          </p>

          {/* Seccion 8 */}
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-6">
            Seguridad y cumplimiento normativo
          </h2>
          <p className="mb-4">
            La historia clinica es un documento legal. En la mayoria de los paises de Latinoamerica, existen
            regulaciones que obligan a conservar las historias clinicas por periodos de 10 a 15 anos minimo. Con
            papel, esto implica espacios de almacenamiento enormes y riesgo de deterioro o perdida. Con un sistema
            digital, el cumplimiento es automatico.
          </p>
          <p className="mb-4">
            La seguridad de los datos es critica cuando se manejan historias clinicas. Un sistema serio debe incluir
            <strong> encriptacion de datos sensibles</strong> (tanto en transito como en reposo), <strong>control de
            acceso basado en roles</strong> (no todos los empleados de la clinica deben ver todo), <strong>registro
            de auditoria</strong> (quien accedio a que informacion y cuando), y <strong>respaldos automaticos</strong>.
          </p>
          <p className="mb-4">
            El control de acceso es especialmente importante. Un recepcionista necesita ver datos de contacto para
            gestionar turnos, pero no necesariamente los detalles de evoluciones clinicas. Un dentista necesita
            acceso completo a la historia clinica de sus pacientes, pero no a las estadisticas financieras de la
            clinica. Un sistema de permisos por rol garantiza que cada persona accede solo a la informacion que
            necesita para cumplir su funcion.
          </p>
          <p className="mb-4">
            La <strong>validacion de archivos</strong> tambien es un aspecto de seguridad que muchos sistemas ignoran.
            Cuando se suben imagenes diagnosticas, el sistema debe verificar no solo la extension del archivo sino
            tambien su contenido real (magic bytes) para prevenir la subida de archivos maliciosos disfrazados de
            imagenes.
          </p>

          {/* Seccion 9 */}
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-6">
            Como Dentiqa implementa la historia clinica digital
          </h2>
          <p className="mb-4">
            En <Link href="https://dentiqa.app" className="text-blue-600 hover:underline font-medium">Dentiqa</Link>,
            la historia clinica digital fue disenada pensando en el flujo de trabajo real de un consultorio dental
            latinoamericano. Cada paciente tiene una ficha completa con 8 pestanas especializadas que cubren todos los
            aspectos de la atencion odontologica.
          </p>
          <p className="mb-4">
            El <strong>odontograma dual</strong> ofrece vista frontal y oclusal, con 5 zonas clickeables por diente
            y 13 tipos de hallazgo con colores distintivos. Soporta denticion permanente (32 piezas) y temporal (20
            piezas), con versionado completo que permite guardar snapshots y restaurar versiones anteriores.
          </p>
          <p className="mb-4">
            El <strong>periodontograma</strong> calcula automaticamente BOP, NIC e indice de placa, con registro de
            furca y supuracion por sitio. El versionado permite comparar mediciones entre sesiones para evaluar la
            respuesta al tratamiento.
          </p>
          <p className="mb-4">
            La <strong>historia medica</strong> incluye grupo sanguineo, factor RH, alergias con nivel de severidad,
            medicamentos con dosis, condiciones con tratamiento, antecedentes familiares, y un registro de auditoria
            que documenta cada modificacion.
          </p>
          <p className="mb-4">
            Las <strong>evoluciones clinicas</strong> utilizan plantillas pre-llenables, firma digital por canvas, y
            vinculacion automatica al plan de tratamiento y al profesional actuante. La <strong>galeria de imagenes</strong>
            soporta drag-and-drop, categorias, zoom y rotacion, con validacion de tipo MIME y magic bytes.
          </p>
          <p className="mb-4">
            Todo esto se integra con el resto del ecosistema Dentiqa: la{" "}
            <Link href="https://dentiqa.app/blog/agenda-turnos-dentista-online" className="text-blue-600 hover:underline">
              agenda de turnos
            </Link>, el{" "}
            <Link href="https://dentiqa.app/blog/whatsapp-para-clinicas-dentales" className="text-blue-600 hover:underline">
              chatbot de WhatsApp
            </Link>, las campanas de marketing y las estadisticas. Una plataforma unificada donde toda la informacion
            del paciente vive en un solo lugar.
          </p>
          <p className="mb-4">
            El sistema de <strong>permisos por rol</strong> garantiza que los dentistas acceden a toda la informacion
            clinica, las recepcionistas solo ven un resumen, y los propietarios tienen visibilidad completa. Cada
            accion queda registrada en logs de seguridad para cumplimiento normativo.
          </p>

          {/* Seccion 10 */}
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-6">
            Preguntas frecuentes
          </h2>

          <div className="space-y-6 mb-12">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Es legal usar una historia clinica digital en lugar de papel?
              </h3>
              <p>
                Si. En la mayoria de los paises de Latinoamerica, la historia clinica digital tiene la misma validez
                legal que la de papel, siempre que cumpla con requisitos de integridad, confidencialidad, accesibilidad
                y conservacion. De hecho, la digital suele ser mas segura y auditable que el papel.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Puedo migrar mis fichas de papel a un sistema digital?
              </h3>
              <p>
                Si. El proceso tipico incluye la importacion de datos basicos de pacientes via CSV y la carga
                gradual de informacion clinica a medida que los pacientes vuelven a consulta. No necesitas digitalizar
                todo de golpe: podes empezar a registrar digitalmente desde hoy y consultar las fichas antiguas cuando
                sea necesario.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Que pasa si se cae internet en medio de una consulta?
              </h3>
              <p>
                Un buen software dental en la nube guarda los cambios de forma frecuente. Si se pierde la conexion
                momentaneamente, los datos ingresados hasta ese momento estan seguros en el servidor. Al recuperar la
                conexion, podes continuar normalmente.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Necesito capacitacion especial para usar un odontograma digital?
              </h3>
              <p>
                No. Si sabes usar un odontograma de papel, la version digital te va a resultar intuitiva. La interfaz
                es visual: haces clic en el diente, seleccionas el hallazgo y listo. La mayoria de los profesionales
                se adaptan en una o dos sesiones.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-8 md:p-12 text-center text-white mt-16">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Proba Dentiqa gratis por 14 dias
            </h2>
            <p className="text-blue-100 mb-8 text-lg max-w-xl mx-auto">
              Historia clinica digital completa, odontograma dual, periodontograma, evoluciones con firma digital y
              mucho mas. Sin tarjeta de credito.
            </p>
            <a
              href="https://dashboard.dentiqa.app/registro"
              className="inline-block bg-white text-blue-700 font-semibold px-8 py-4 rounded-xl text-lg hover:bg-blue-50 transition-colors shadow-lg"
            >
              Crear cuenta gratis
            </a>
          </div>

          {/* Related articles */}
          <div className="mt-16 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Articulos relacionados</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="https://dentiqa.app/blog/whatsapp-para-clinicas-dentales"
                  className="text-blue-600 hover:underline"
                >
                  WhatsApp para Clinicas Dentales: Como Automatizar la Comunicacion con Pacientes
                </Link>
              </li>
              <li>
                <Link
                  href="https://dentiqa.app/blog/agenda-turnos-dentista-online"
                  className="text-blue-600 hover:underline"
                >
                  Agenda de Turnos para Dentistas Online: Optimiza tu Consulta
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </article>
    </>
  );
}
