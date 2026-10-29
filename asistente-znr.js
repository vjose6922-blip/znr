// asistente-znr.js — Asistente de FAQs de Z&R (autocontenido, sin backend)
//
// ────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────
//  PARTE 1 · DATOS
//  Para agregar preguntas: añade objetos a `entradas` con la forma
//  { c:'categoría', q:'pregunta', a:'respuesta' }.
//  El número de WhatsApp NO está aquí: lo resuelve el backend y se
//  aplica al <a class="floating-wa"> oculto (contacto_admin en RTDB).
// ────────────────────────────────────────────────────────────────────
(function () {
  'use strict';

  // ── Datos ─────────────────────────────────────────────────────
  const ZNR_FAQ = {
    categorias: [
      { id: 'general',   label: 'General',         emoji: 'ℹ️' },
      { id: 'comprador', label: 'Comprar',          emoji: '🛒' },
      { id: 'vendedor',  label: 'Vender',           emoji: '🏪' },
      { id: 'plus',      label: 'ZNR Plus',         emoji: '⭐' },
      { id: 'pagos',     label: 'Pagos y entregas', emoji: '💳' }
    ],
    entradas: [
      // ─── General ────────────────────────────────────────────────
      { c:'general', q:'¿Qué es ZNR y cómo funciona?', a:'ZNR es un marketplace que conecta a compradores y vendedores para facilitar el comercio local. Permite descubrir productos disponibles en tu ciudad y realizar solicitudes de compra directamente desde la plataforma. Para mostrarte artículos cercanos, es necesario seleccionar tu ciudad o permitir el acceso a tu ubicación cuando corresponda.' },
      { c:'general', q:'¿ZNR es una tienda en línea o un marketplace?', a:'ZNR es un marketplace que reúne productos de vendedores independientes en una misma plataforma. Además, cuenta con un catálogo propio de ropa.' },
      { c:'general', q:'¿Qué puedo encontrar en ZNR?', a:'En ZNR puedes descubrir una amplia variedad de productos, como ropa, artículos para el hogar, herramientas, electrodomésticos, autopartes y muchos otros artículos ofrecidos por vendedores de tu comunidad.' },
      { c:'general', q:'¿Necesito crear una cuenta para navegar por los productos?', a:'No. Puedes explorar el catálogo sin registrarte. Sin embargo, debes seleccionar tu ciudad para consultar los productos disponibles en tu zona. Para realizar una compra, sí necesitas una cuenta.' },
      { c:'general', q:'¿Es gratis utilizar ZNR?', a:'Sí. ZNR ofrece un plan gratuito para vendedores ocasionales y un plan Plus para quienes necesitan funciones adicionales y desean aprovechar más herramientas para su tienda. Puedes comenzar con el plan gratuito y actualizar a Plus si tus necesidades lo requieren.' },
      { c:'general', q:'¿ZNR vende directamente los productos o son de vendedores independientes?', a:'ZNR cuenta con un catálogo propio de ropa y también permite que vendedores independientes publiquen sus productos mediante el catálogo de la comunidad. Las condiciones de venta, atención y entrega pueden variar según el origen del producto.' },
      { c:'general', q:'¿Cómo puedo saber si un vendedor es confiable?', a:'ZNR utiliza una insignia de vendedor confiable para identificar a los vendedores que cuentan con un historial favorable y valoraciones positivas. Esta insignia puede ayudarte a tomar una decisión informada, aunque siempre es recomendable revisar las calificaciones, la información del perfil y los detalles del producto antes de comprar.' },
      { c:'general', q:'¿ZNR está disponible en todo México?', a:'ZNR está disponible en gran parte de México. La variedad de productos que puedes consultar depende de la cobertura y de los vendedores activos en cada ciudad.' },
      { c:'general', q:'¿Puedo utilizar ZNR desde mi celular?', a:'Sí. ZNR está diseñada para funcionar tanto en dispositivos móviles como en computadoras, para que puedas explorar productos y administrar tu tienda desde el dispositivo que prefieras.' },
      { c:'general', q:'¿Cómo puedo contactar al equipo de soporte de ZNR?', a:'Puedes comunicarte con el equipo de soporte a través del correo electrónico znrcomunity@gmail.com. También puedes enviar comentarios, reportar fallos o compartir sugerencias desde la sección Feedback, disponible en el panel de preferencias.' },
      { c:'general', q:'¿Cómo puedo reportar un error en la página?', a:'Puedes reportar errores desde la sección Feedback del panel de preferencias. Describe lo ocurrido e incluye los detalles necesarios para que el equipo de ZNR pueda investigar y atender el problema.' },
      { c:'general', q:'¿Qué hago si la página no carga o presenta problemas?', a:'Primero, intenta actualizar la página y verifica tu conexión a internet. Si el problema continúa, espera unos minutos y vuelve a intentarlo. Si la falla persiste durante más de 30 minutos, comunícate con soporte o envía un reporte desde la sección Feedback.' },

      // ─── Comprador ──────────────────────────────────────────────
      { c:'comprador', q:'¿Cómo puedo comprar un producto en ZNR?', a:'Selecciona el artículo que te interesa y presiona el botón Solicitar. Después, completa el formulario con la información solicitada. El vendedor deberá revisar tu solicitud y confirmar la disponibilidad antes de continuar con el proceso de compra, pago y entrega.' },
      { c:'comprador', q:'¿Necesito registrarme para realizar una compra?', a:'Sí. Para solicitar productos necesitas una cuenta y proporcionar los datos requeridos para gestionar tu pedido. Si solicitas una entrega a domicilio, deberás proporcionar la información de entrega correspondiente.' },
      { c:'comprador', q:'¿Puedo comprar productos de diferentes vendedores en un solo pedido?', a:'Sí. Puedes solicitar productos de diferentes vendedores sin un límite general establecido por esta función. Cada solicitud se gestiona con el vendedor correspondiente, por lo que la confirmación, el pago y la entrega pueden realizarse por separado.' },
      { c:'comprador', q:'¿Cómo sé si un producto todavía está disponible?', a:'Puedes consultar el inventario mostrado en la publicación. Sin embargo, la disponibilidad definitiva debe ser confirmada por el vendedor cuando revise tu solicitud. Espera esa confirmación antes de continuar con el pago y la coordinación de la entrega.' },
      { c:'comprador', q:'¿Los precios que aparecen en ZNR son definitivos?', a:'Los precios publicados son la referencia de compra indicada por el vendedor. Si existe alguna promoción, cambio de precio o condición especial, debe aclararse antes de concretar la operación. Cualquier modificación acordada directamente con el vendedor debe quedar clara para ambas partes.' },
      { c:'comprador', q:'¿Cómo contacto al vendedor antes de comprar?', a:'Ingresa al perfil del vendedor y consulta la sección de contacto para conocer los medios de comunicación que tiene disponibles.' },
      { c:'comprador', q:'¿Puedo comunicarme directamente con el vendedor por WhatsApp?', a:'Sí, siempre que el vendedor tenga habilitada esta opción en su perfil. Podrás utilizar el acceso a WhatsApp para realizar consultas sobre sus productos o coordinar detalles de la compra.' },
      { c:'comprador', q:'¿Cómo puedo compartir un producto con otra persona?', a:'En la tarjeta del artículo encontrarás el botón Compartir. Utilízalo para enviar el enlace del producto a tus contactos o compartirlo mediante las aplicaciones disponibles en tu dispositivo.' },
      { c:'comprador', q:'¿Qué hago si agregué un producto al carrito por error?', a:'Puedes ajustar las cantidades o retirar el artículo utilizando los controles del carrito. Si necesitas eliminarlo, utiliza el botón correspondiente para disminuir la cantidad hasta quitar el producto.' },
      { c:'comprador', q:'¿Por qué cambió el precio o la disponibilidad de un producto?', a:'El precio o la disponibilidad pueden variar cuando el vendedor actualiza su publicación, modifica su inventario o activa o desactiva una promoción. Antes de confirmar tu compra, revisa la información actualizada y espera la confirmación del vendedor.' },
      { c:'comprador', q:'¿Cómo puedo cancelar una compra?', a:'Puedes gestionar la cancelación desde Ajustes → Pedidos, siguiendo las opciones disponibles para tu solicitud. Si el pedido ya fue confirmado, pagado o está en proceso de entrega, podrían aplicarse condiciones adicionales. Revisa el estado del pedido antes de continuar.' },
      { c:'comprador', q:'¿Qué hago si el vendedor no responde?', a:'Si el vendedor no responde a tu solicitud, puedes cancelarla desde la sección de pedidos. Si consideras que hubo un incumplimiento o una conducta inadecuada, también puedes reportar al vendedor para que el equipo de ZNR revise el caso.' },
      { c:'comprador', q:'¿Cómo puedo reportar un producto engañoso o sospechoso?', a:'Utiliza el botón Reportar disponible en la tarjeta del artículo. Describe el motivo del reporte y proporciona la información que permita identificar el problema. El equipo de ZNR podrá revisar la publicación conforme a las políticas de la plataforma.' },
      { c:'comprador', q:'¿Cómo puedo calificar a un vendedor?', a:'Una vez que la compra haya sido entregada, podrás utilizar la opción de calificación cuando esté disponible en tu cuenta. Comparte una valoración honesta basada en tu experiencia con el producto, la comunicación y el cumplimiento del vendedor.' },
      { c:'comprador', q:'¿Qué hago si recibo un producto diferente al anunciado?', a:'Primero, contacta al vendedor para aclarar lo ocurrido e intentar resolverlo. Si no recibes una solución adecuada, puedes dejar una reseña de tu experiencia y reportar el caso a ZNR para que sea revisado.' },
      { c:'comprador', q:'¿ZNR ofrece garantía o protección al comprador?', a:'Los productos del catálogo propio de ZNR están sujetos a las condiciones de garantía o atención que correspondan a cada artículo. En los productos publicados por vendedores de la comunidad, cada vendedor es responsable de sus ventas, productos y condiciones de entrega. ZNR facilita el contacto y la gestión de solicitudes, pero no garantiza automáticamente todas las operaciones entre particulares.' },

      // ─── Vendedor ───────────────────────────────────────────────
      { c:'vendedor', q:'¿Cómo puedo convertirme en vendedor de ZNR?', a:'Para comenzar, regístrate en la plataforma y completa el formulario con la información solicitada. Proporcionar datos reales y mantener tu perfil actualizado ayuda a generar confianza entre los compradores y facilita la comunicación con tus clientes.' },
      { c:'vendedor', q:'¿Registrarse como vendedor es gratis?', a:'Sí. Puedes registrarte y comenzar a vender con el plan gratuito de ZNR. También tienes la opción de contratar ZNR Plus para acceder a beneficios y funciones adicionales.' },
      { c:'vendedor', q:'¿Qué necesito para crear mi perfil de vendedor?', a:'Necesitas proporcionar los datos solicitados durante el registro, incluido un número de WhatsApp para el proceso de confirmación cuando corresponda. Utiliza información real y actualizada para facilitar la comunicación con tus compradores.' },
      { c:'vendedor', q:'¿Cómo publico mi primer producto?', a:'Ingresa al Panel de Vendedor y busca la opción para agregar un producto. Completa la información solicitada, incorpora las imágenes correspondientes y envía la publicación para su revisión. Una vez aprobada, podrá mostrarse al público de acuerdo con la disponibilidad y las condiciones de ZNR.' },
      { c:'vendedor', q:'¿Cuántos productos puedo publicar gratuitamente?', a:'El plan gratuito permite publicar hasta 20 productos. Si necesitas administrar un catálogo más amplio, puedes consultar los beneficios del plan ZNR Plus.' },
      { c:'vendedor', q:'¿Cómo puedo editar la información de un producto?', a:'Ingresa al Panel de Vendedor y localiza el artículo que deseas modificar. Desde las opciones disponibles podrás editar su información o eliminarlo cuando sea necesario.' },
      { c:'vendedor', q:'¿Por qué mi producto todavía no aparece publicado?', a:'Las publicaciones pueden tardar aproximadamente entre 2 y 5 minutos en reflejarse debido a los procesos de actualización y caché. También debes verificar que el producto haya sido aprobado y no continúe pendiente de revisión. Si el tiempo de espera es mayor, comprueba su estado en tu panel.' },
      { c:'vendedor', q:'¿Qué significan los estados pendiente, aprobado y rechazado?', a:'Pendiente: el producto está a la espera de una revisión administrativa para verificar que cumpla las políticas de ZNR. Aprobado: el producto ha sido autorizado para mostrarse al público en la ciudad correspondiente. Rechazado: la publicación no cumple con una o varias de las políticas de ZNR y no puede publicarse en su estado actual.' },
      { c:'vendedor', q:'¿Por qué rechazaron mi producto?', a:'Un producto puede ser rechazado cuando su contenido, imágenes, descripción o características incumplen las políticas de publicación de ZNR. Revisa la información del artículo y corrige los aspectos necesarios antes de volver a enviarlo, si la plataforma permite hacerlo.' },
      { c:'vendedor', q:'¿Puedo agregar mi logotipo y una descripción a mi tienda?', a:'Puedes agregar una descripción para presentar tu negocio y explicar qué productos ofreces. La opción de personalizar tu tienda con un logotipo está disponible exclusivamente para los vendedores con el plan Plus.' },
      { c:'vendedor', q:'¿Cómo puedo destacar mis productos?', a:'La función para destacar productos es uno de los beneficios exclusivos de ZNR Plus. Si deseas aprovechar esta opción, consulta los beneficios del plan y las herramientas disponibles en tu Panel de Vendedor.' },
      { c:'vendedor', q:'¿Cómo puedo recibir más visitas en mi tienda?', a:'Comparte el enlace de tu tienda en tus redes sociales, grupos y canales de comunicación. Mantén tus publicaciones actualizadas, utiliza fotografías claras, redacta descripciones precisas y responde oportunamente a las consultas de tus posibles compradores.' },
      { c:'vendedor', q:'¿Puedo cambiar mi nombre, logotipo o información comercial?', a:'Sí. Puedes modificar la información disponible de tu perfil desde la sección Ajustes de cuenta, dentro del Panel de Vendedor. Algunas opciones de personalización, como el logotipo, pueden requerir una suscripción Plus vigente.' },
      { c:'vendedor', q:'¿Qué hago si olvidé cómo acceder a mi cuenta de vendedor?', a:'Utiliza la opción ¿Olvidaste tu contraseña? para iniciar el proceso de recuperación de acceso. También te recomendamos configurar una pregunta de seguridad, si esta opción está disponible en tu cuenta, para facilitar futuras verificaciones y evitar demoras en la recuperación.' },

      // ─── ZNR Plus ──────────────────────────────────────────────
      { c:'plus', q:'¿Qué es ZNR Plus?', a:'ZNR Plus es una suscripción diseñada para vendedores que desean aprovechar herramientas y beneficios adicionales para administrar y promocionar sus productos dentro de ZNR.' },
      { c:'plus', q:'¿Cuánto cuesta la suscripción Plus?', a:'Plus cuesta $149 MXN al mes (hasta 400 artículos) y Pro $299 MXN al mes (hasta 1,000 artículos). También puedes pagar un año completo en un solo pago con 2 meses gratis: Plus $1,490 y Pro $2,990.' },
      { c:'plus', q:'¿Qué es el plan Pro?', a:'Pro tiene todos los beneficios de Plus y sube tu límite a 1,000 artículos. Si ya eres Plus y te cambias a Pro, los días que te quedan se convierten por su valor y se suman a tu nuevo plan.' },
      { c:'plus', q:'¿Qué beneficios obtengo al contratar Plus?', a:'Con ZNR Plus puedes acceder a funciones adicionales para tu tienda, como herramientas de promoción y personalización, productos destacados y funciones exclusivas para vendedores Plus. Los beneficios disponibles dependen de las características habilitadas en tu cuenta.' },
      { c:'plus', q:'¿Qué diferencia existe entre el plan gratuito y Plus?', a:'El plan gratuito permite comenzar a vender en ZNR con un límite de 20 productos. Plus ofrece beneficios adicionales y un límite de 400 productos (1,000 con Pro) y las funciones ampliadas que estén habilitadas para tu cuenta.' },
      { c:'plus', q:'¿Cómo puedo contratar ZNR Plus?', a:'Ingresa a tu cuenta de vendedor y busca la opción para contratar o actualizar tu plan. Sigue las instrucciones de pago que aparecen en pantalla para completar la suscripción.' },
      { c:'plus', q:'¿Cómo puedo renovar mi suscripción Plus?', a:'Ingresa a tu cuenta de vendedor y selecciona la opción para renovar tu plan cuando esté disponible. Completa el proceso de pago y verifica que la nueva vigencia aparezca en tu cuenta.' },
      { c:'plus', q:'¿Cómo sé cuándo vence mi plan?', a:'Puedes consultar la información de tu suscripción desde tu panel de vendedor, donde se muestra el estado de tu plan y, cuando esté disponible, su fecha de vencimiento.' },
      { c:'plus', q:'¿Qué pasa cuando mi suscripción está por vencer?', a:'Si tu plan está próximo a vencer, revisa tu panel de vendedor para consultar su vigencia y la opción de renovación. Te recomendamos renovar antes de la fecha de vencimiento para evitar interrupciones en los beneficios Plus.' },
      { c:'plus', q:'¿Qué ocurre cuando vence mi plan Plus?', a:'Cuando vence tu suscripción, tu cuenta puede volver al plan gratuito y dejar de tener acceso a las funciones exclusivas de Plus. Las funciones sujetas a la suscripción estarán disponibles nuevamente cuando tengas un plan Plus vigente.' },
      { c:'plus', q:'¿Pierdo mis productos cuando termina mi suscripción?', a:'El vencimiento de Plus no debe interpretarse como una eliminación automática de tu cuenta o de tus datos. Sin embargo, si tienes más productos que el límite permitido en el plan gratuito, su disponibilidad o publicación puede estar sujeta a las reglas de ZNR. Revisa tu inventario antes de que venza tu suscripción.' },
      { c:'plus', q:'¿Puedo volver a contratar Plus después de que expire?', a:'Sí. Puedes volver a contratar ZNR Plus desde tu cuenta de vendedor cuando la opción de suscripción esté disponible. Una vez confirmado el pago y actualizada la vigencia, podrás utilizar nuevamente los beneficios incluidos en el plan.' },
      { c:'plus', q:'¿Cómo puedo comprobar si mi pago fue procesado?', a:'Revisa la confirmación y consulta el estado de tu suscripción en ZNR. Considera que un pago puede tardar un poco en reflejarse en tu cuenta.' },
      { c:'plus', q:'¿Qué hago si pagué, pero mi cuenta sigue mostrando el plan gratuito?', a:'Verifica primero que muestre el pago como aprobado. Después, actualiza tu panel de vendedor y comprueba el estado de tu suscripción. Si el problema continúa, contacta al soporte de ZNR y proporciona el comprobante o número de operación. No compartas contraseñas ni datos completos de tus tarjetas.' },
      { c:'plus', q:'¿Puedo solicitar un reembolso de mi suscripción?', a:'Si necesitas solicitar un reembolso, contacta al soporte de ZNR e incluye la información de tu pago. Cada solicitud deberá revisarse conforme a las condiciones de contratación y las disposiciones legales aplicables. La solicitud no garantiza por sí sola que el reembolso sea aprobado.' },
      { c:'plus', q:'¿La suscripción Plus se renueva automáticamente?', a:'Consulta las condiciones que se muestran al contratar tu plan para confirmar si existe renovación automática. No des por hecho que tu suscripción se renovará ni que se realizará un nuevo cobro sin verificar las condiciones del pago.' },

      // ─── Pagos, pedidos y entregas ─────────────────────────────
      { c:'pagos', q:'¿Qué métodos de pago acepta ZNR?', a:'Los métodos de pago disponibles dependen del proceso de compra y de las opciones habilitadas por el vendedor. Cuando el vendedor tiene pago en línea, puedes pagar con tarjeta, Apple Pay, Google Pay u OXXO (vía Stripe) o con Mercado Pago; también suele aceptar efectivo o transferencia.' },
      { c:'pagos', q:'¿Los pagos se realizan directamente en ZNR o con el vendedor?', a:'Depende del tipo de compra. En las operaciones que utilizan el sistema de pagos de ZNR, el pago se procesa mediante el proveedor de pago correspondiente. En otros casos, las condiciones y el método de pago pueden ser acordados directamente con el vendedor. Revisa las instrucciones antes de pagar.' },
      { c:'pagos', q:'¿Es seguro pagar a través de ZNR?', a:'ZNR utiliza herramientas tecnológicas para facilitar las operaciones de compra y venta. El proveedor gestiona la transacción conforme a sus propios mecanismos de seguridad. Compra únicamente mediante los canales indicados y evita compartir contraseñas o códigos de seguridad.' },
      { c:'pagos', q:'¿Cómo puedo confirmar que mi pago fue recibido?', a:'Consulta el estado de la operación en la plataforma de pago y revisa las notificaciones o confirmaciones de tu pedido en ZNR. Si pagaste directamente al vendedor, solicita una confirmación por el medio acordado.' },
      { c:'pagos', q:'¿Qué hago si mi pago aparece como pendiente?', a:'Espera a que el proveedor de pago actualice el estado de la operación. Evita realizar un segundo pago mientras el primero siga pendiente. Si el estado no cambia, consulta con el proveedor de pago y contacta al soporte de ZNR si tu pedido no se actualiza.' },
      { c:'pagos', q:'¿Qué hago si me cobraron, pero no recibí confirmación?', a:'Comprueba el estado de la operación en tu cuenta de pago y conserva el comprobante. Si el cobro aparece confirmado, pero ZNR no muestra tu pedido o la confirmación correspondiente, contacta al soporte de ZNR e incluye el número de operación y los datos de referencia de tu compra. No compartas información bancaria confidencial.' },
      { c:'pagos', q:'¿Cómo puedo solicitar un reembolso?', a:'Contacta al vendedor o al soporte de ZNR, según quién haya gestionado la operación. Proporciona el número de pedido, el comprobante de pago y el motivo de tu solicitud. La procedencia del reembolso dependerá de las condiciones de la compra, del método de pago y de las disposiciones legales aplicables.' },
      { c:'pagos', q:'¿Cómo funcionan las entregas de los productos?', a:'Las condiciones de entrega dependen del vendedor y del producto adquirido. Antes de completar tu compra, confirma el método de entrega, el tiempo estimado, el costo y cualquier requisito para recibir tu pedido.' },
      { c:'pagos', q:'¿ZNR realiza envíos o cada vendedor administra los suyos?', a:'Los métodos de entrega dependen de las opciones que ofrezca cada vendedor. No des por hecho que todos los productos cuentan con envío a domicilio. Consulta la publicación o contacta al vendedor para conocer las alternativas disponibles.' },
      { c:'pagos', q:'¿Cómo puedo conocer el costo de envío?', a:'Consulta la información de la publicación o pregunta directamente al vendedor antes de realizar el pago. El costo puede variar según el producto, la ubicación de entrega y el método de envío.' },
      { c:'pagos', q:'¿Puedo recoger mi pedido directamente con el vendedor?', a:'Puedes consultar con el vendedor si ofrece entrega en persona o recogida directa. Confirma previamente el lugar, el horario y las condiciones de entrega. Por seguridad, acuerda la entrega en un sitio adecuado y conserva la información de tu pedido.' },
      { c:'pagos', q:'¿Qué hago si mi pedido no llega?', a:'Primero, contacta al vendedor para verificar el estado de tu pedido y la fecha estimada de entrega. Si no recibes respuesta o no se resuelve el problema, contacta al soporte de ZNR con tu número de pedido y la información disponible sobre la compra.' },
      { c:'pagos', q:'¿Qué sucede si el vendedor cancela mi pedido?', a:'Solicita al vendedor el motivo de la cancelación y verifica el estado de tu pago. Si ya realizaste el pago, consulta el procedimiento de devolución aplicable a tu operación. Si el problema persiste, contacta al soporte de ZNR con los datos de tu pedido.' },
      { c:'pagos', q:'¿Cómo puedo reportar un problema con mi compra?', a:'Contacta al soporte de ZNR e incluye el número de pedido, el nombre o perfil del vendedor, una descripción del problema y las pruebas relevantes, como capturas de pantalla o comprobantes. Evita enviar contraseñas, códigos de seguridad o números completos de tarjetas.' }
    ]
  };


  const WA_MSG = 'Hola, necesito ayuda con un tema de ZNR';
  // ────────────────────────────────────────────────────────────────
  //  PARTE 2 · MOTOR DE BÚSQUEDA
  // ────────────────────────────────────────────────────────────────
  function normalizar(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9ñ\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const STOP = new Set((
    'de la el los las un una unos unas que y o a en con por para mi mis tu tus su sus ' +
    'es son al del se lo le ya mas pero muy este esta esto estos estas ese esa eso esos esas ' +
    'como cual cuales donde cuando cuanto cuanta cuantos cuantas puedo puede pueden hay tengo ' +
    'tiene hago hacer hace me te nos les si no ni tan solo tambien quiero queria necesito ' +
    'necesita saber dime dame'
  ).split(' '));

  function tokens(s) {
    return normalizar(s).split(' ').filter(t => t.length >= 3 && !STOP.has(t));
  }

  // Sinónimos: amplían la búsqueda con variantes coloquiales / conjugadas.
  const SIN = {
    comprar: ['compra', 'comprar', 'adquirir', 'pedir', 'pedido'],
    vender: ['vender', 'venta', 'vendedor', 'tienda', 'publicar'],
    cuenta: ['cuenta', 'registro', 'registrar', 'registrarme', 'usuario', 'perfil'],
    envio: ['envio', 'entrega', 'paqueteria', 'domicilio', 'mandar', 'recoger'],
    pago: ['pago', 'pagar', 'pague', 'tarjeta', 'mercadopago', 'stripe', 'paypal', 'oxxo', 'apple', 'efectivo', 'cobro'],
    precio: ['precio', 'costo', 'cuanto', 'cuesta', 'valor'],
    plus: ['plus', 'suscripcion', 'premium', 'plan', 'suscripción'],
    reembolso: ['reembolso', 'devolucion', 'devolución', 'regresar'],
    producto: ['producto', 'articulo', 'artículo', 'item', 'publicacion', 'publicación'],
    problema: ['problema', 'error', 'falla', 'queja', 'reportar', 'reporte', 'reclamar'],
    ciudad: ['ciudad', 'zona', 'region', 'región', 'local', 'ubicacion', 'ubicación'],
    cancelar: ['cancelar', 'cancelacion', 'cancelación', 'anular', 'eliminar'],
    calificar: ['calificar', 'calificacion', 'calificación', 'reseña', 'opinion', 'estrellas'],
    whatsapp: ['whatsapp', 'chat', 'mensaje', 'contacto', 'contactar'],
    stock: ['stock', 'inventario', 'existencia', 'disponible', 'disponibilidad'],
    garantia: ['garantia', 'garantía', 'proteccion', 'protección', 'devolver'],
    publicar: ['publicar', 'publicacion', 'agregar', 'subir', 'nuevo producto'],
    rechazo: ['rechazado', 'rechazo', 'rechazaron', 'rechazada', 'no aparece'],
    estado: ['pendiente', 'aprobado', 'rechazado', 'estado'],
    vencimiento: ['vence', 'vencimiento', 'vida', 'vigencia', 'expira']
  };

  function expandir(toks) {
    const out = new Set(toks);
    for (const t of toks) {
      for (const k in SIN) {
        if (t === k || SIN[k].includes(t)) {
          out.add(k);
          SIN[k].forEach(x => out.add(x));
        }
      }
    }
    return Array.from(out);
  }

  function buscar(query, topN = 6) {
    const qNorm = normalizar(query);
    if (!qNorm) return [];
    const qSet = new Set(expandir(tokens(query)));

    const scored = ZNR_FAQ.entradas.map(e => {
      const qE  = normalizar(e.q);
      const aE  = normalizar(e.a);
      const qTk = tokens(e.q);
      const aTk = tokens(e.a);
      let score = 0;

      if (qE === qNorm) score += 200;
      else if (qNorm.length >= 6 && qE.includes(qNorm)) score += 40;

      for (const t of qTk) if (qSet.has(t)) score += 4;
      const aSet = new Set(aTk);
      for (const t of qSet) if (aSet.has(t)) score += 1;

      const cat = ZNR_FAQ.categorias.find(c => c.id === e.c);
      if (cat && qSet.has(normalizar(cat.label))) score += 3;

      return { e, score };
    });

    return scored.filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .map(x => ({ ...x.e, _score: x.score }));
  }

  // ────────────────────────────────────────────────────────────────
  //  PARTE 3 · UI (botón + panel + chat)
  // ────────────────────────────────────────────────────────────────
  const ESTADO = {
  abierto: false,
  historial: [],
  preguntasRespondidas: 0,
  utilidadMostrada: false,
  waVisible: false
};
  let $panel, $body, $input, $form;

  const CSS = `
  .asistente-btn {
    position: fixed; right: 16px; bottom: 90px;
    width: 58px; height: 58px; border-radius: 50%;
    background: linear-gradient(135deg, var(--color-accent-solid, #e11d6a), #a855f7);
    color: #fff; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 6px 22px rgba(0,0,0,.25);
    z-index: 90; transition: transform .2s ease, box-shadow .2s ease;
  }
  .asistente-btn:hover { transform: scale(1.08); box-shadow: 0 10px 28px rgba(0,0,0,.35); }
  .asistente-btn svg { width: 28px; height: 28px; }

  .asistente-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,.5);
    backdrop-filter: blur(4px); z-index: 10000;
    display: none; align-items: flex-end; justify-content: center;
  }
  .asistente-overlay.open { display: flex; }
  @media (min-width: 600px) { .asistente-overlay { align-items: center; } }

  .asistente-sheet {
    width: 100%; max-width: 480px;
    height: min(85vh, 640px);
    background: var(--color-surface, #252831);
    color: var(--color-text-main, #fff);
    border-radius: 24px 24px 0 0;
    display: flex; flex-direction: column;
    box-shadow: 0 -10px 40px rgba(0,0,0,.5);
    animation: asst-in .25s ease;
    overflow: hidden;
  }
  @media (min-width: 600px) {
    .asistente-sheet { border-radius: 20px; height: 640px; }
  }
  @keyframes asst-in { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

  .asistente-header {
    display: flex; align-items: center; gap: 10px;
    padding: 14px 16px; border-bottom: 1px solid rgba(128,128,128,.15);
    flex-shrink: 0;
  }
  .asistente-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: linear-gradient(135deg, var(--color-accent-solid, #e11d6a), #a855f7);
    display: grid; place-items: center; color: #fff; font-weight: 800; font-size: 14px;
    flex-shrink: 0;
  }
  .asistente-titles { flex: 1; min-width: 0; }
  .asistente-titles b { display: block; font-size: 14px; }
  .asistente-titles span { display: block; font-size: 11.5px; opacity: .65; }
  .asistente-close {
    background: transparent; border: none; color: inherit;
    font-size: 22px; line-height: 1; cursor: pointer; padding: 6px; opacity: .7;
  }

  .asistente-body {
    flex: 1; overflow-y: auto; padding: 14px 14px 6px;
    display: flex; flex-direction: column; gap: 10px;
    overscroll-behavior: contain;
  }
  .asistente-msg {
    max-width: 85%; padding: 10px 13px; border-radius: 16px;
    font-size: 13.5px; line-height: 1.45;
    white-space: pre-wrap; word-wrap: break-word;
  }
  .asistente-msg.bot {
    background: rgba(128,128,128,.12); align-self: flex-start;
    border-bottom-left-radius: 4px;
  }
  .asistente-msg.user {
    background: linear-gradient(135deg, var(--color-accent-solid, #e11d6a), #a855f7);
    color: #fff; align-self: flex-end; border-bottom-right-radius: 4px;
  }
  .asistente-chips { display: flex; flex-wrap: wrap; gap: 6px; align-self: flex-start; max-width: 100%; }
  .asistente-chip {
    font-size: 12px; padding: 7px 12px; border-radius: 999px;
    background: rgba(128,128,128,.12); color: inherit;
    border: 1px solid rgba(128,128,128,.25);
    cursor: pointer; font-family: inherit;
    transition: background .15s;
    text-align: left; line-height: 1.3;
  }
  .asistente-chip:hover { background: rgba(128,128,128,.22); }
  .asistente-chip.cat {
    background: rgba(168,85,247,.12);
    border-color: rgba(168,85,247,.35);
  }

  .asistente-footer {
    padding: 10px 12px 12px; border-top: 1px solid rgba(128,128,128,.15);
    flex-shrink: 0;
  }
  .asistente-wa {
  display: none;                    /* ← oculto por defecto */
  align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 10px; border-radius: 12px;
  background: rgba(37,211,102,.12); color: #25D366;
  border: 1px solid rgba(37,211,102,.35);
  font-size: 13px; font-weight: 600;
  cursor: pointer; text-decoration: none; margin-bottom: 8px;
  font-family: inherit;
}
.asistente-wa.visible { display: flex; }   /* ← se revela aquí */

/* Chips de "¿Te resultó útil?" */
.asistente-utility-chips {
  display: flex; gap: 8px; align-self: flex-start; flex-wrap: wrap;
}
.asistente-utility-chip {
  padding: 8px 16px; border-radius: 999px; font-size: 13px; font-weight: 600;
  border: 1px solid rgba(128,128,128,.3); background: rgba(128,128,128,.08);
  color: inherit; cursor: pointer; font-family: inherit;
  transition: background .15s, border-color .15s;
}
.asistente-utility-chip.yes:hover { background: rgba(34,197,94,.15);  border-color: rgba(34,197,94,.4); }
.asistente-utility-chip.no:hover  { background: rgba(239,68,68,.15);  border-color: rgba(239,68,68,.4); }

@keyframes asst-pulse {
  0%, 100% { transform: scale(1);    box-shadow: 0 0 0 0  rgba(37,211,102,.4); }
  50%      { transform: scale(1.02); box-shadow: 0 0 0 8px rgba(37,211,102,0);  }
}
  .asistente-form { display: flex; gap: 8px; }
  .asistente-input {
    flex: 1; padding: 11px 14px; border-radius: 999px;
    border: 1px solid rgba(128,128,128,.3);
    background: rgba(128,128,128,.08); color: inherit;
    font-size: 13.5px; font-family: inherit; outline: none;
  }
  .asistente-input:focus { border-color: var(--color-accent-solid, #e11d6a); }
  .asistente-send {
    width: 42px; height: 42px; border-radius: 50%;
    background: linear-gradient(135deg, var(--color-accent-solid, #e11d6a), #a855f7);
    color: #fff; border: none; cursor: pointer;
    display: grid; place-items: center; flex-shrink: 0;
  }
  .asistente-typing { font-size: 12px; opacity: .6; font-style: italic; padding: 0 4px; }
  `;

  function inyectarCSS() {
    if (document.getElementById('asistente-znr-css')) return;
    const st = document.createElement('style');
    st.id = 'asistente-znr-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function crearBoton() {
    const b = document.createElement('button');
    b.type = 'button';
    b.id = 'floating-asistente-btn';
    b.className = 'asistente-btn';
    b.setAttribute('aria-label', 'Abrir asistente Z&R');
    b.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
    return b;
  }

  function crearPanel() {
    const ov = document.createElement('div');
    ov.className = 'asistente-overlay';
    ov.innerHTML = `
      <div class="asistente-sheet" role="dialog" aria-modal="true" aria-label="Asistente Z&R">
        <div class="asistente-header">
          <div class="asistente-avatar">Z&R</div>
          <div class="asistente-titles">
            <b>Asistente Z&R</b>
            <span>Respuestas rápidas 24/7</span>
          </div>
          <button type="button" class="asistente-close" aria-label="Cerrar">×</button>
        </div>
        <div class="asistente-body" id="asistente-body"></div>
        <div class="asistente-footer">
          <a class="asistente-wa" target="_blank" rel="noopener" href="#">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.549 4.107 1.51 5.833L.057 23.57a.75.75 0 0 0 .918.917l5.735-1.453A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.713 9.713 0 0 1-4.953-1.354l-.355-.21-3.676.932.948-3.557-.23-.368A9.714 9.714 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>
            Hablar con una persona
          </a>
          <form class="asistente-form" id="asistente-form">
            <input class="asistente-input" id="asistente-input" type="text" autocomplete="off"
                   placeholder="Escribe tu duda…" aria-label="Escribe tu duda">
            <button class="asistente-send" type="submit" aria-label="Enviar">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </form>
        </div>
      </div>`;
    document.body.appendChild(ov);
    return ov;
  }

  // ── Render del chat ──────────────────────────────────────────
  function addMsg(text, who) {
    ESTADO.historial.push({ text, who });
    renderHistorial();
  }
  function addChips(chips) {
    ESTADO.historial.push({ chips });
    renderHistorial();
  }
  function renderHistorial() {
    $body.innerHTML = '';
    for (const item of ESTADO.historial) {
      if (item.chips) {
        const wrap = document.createElement('div');
        wrap.className = 'asistente-chips';
        item.chips.forEach(c => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'asistente-chip' + (c.cat ? ' cat' : '');
          b.textContent = c.label;
          b.onclick = () => { if (c.onClick) c.onClick(); };
          wrap.appendChild(b);
        });
        $body.appendChild(wrap);
      } else {
        const d = document.createElement('div');
        d.className = 'asistente-msg ' + (item.who === 'user' ? 'user' : 'bot');
        d.textContent = item.text;
        $body.appendChild(d);
      }
    }
    $body.scrollTop = $body.scrollHeight;
  }

  // ── Flujos ───────────────────────────────────────────────────
  function mostrarBienvenida() {
    ESTADO.historial = [];
    addMsg('¡Hola! Soy el asistente de Z&R. Puedo responder dudas sobre compras, ventas, ZNR Plus, pagos y entregas. ¿Qué necesitas?', 'bot');
    addChips(ZNR_FAQ.categorias.map(c => ({
      label: c.emoji + ' ' + c.label,
      cat: true,
      onClick: () => mostrarCategoria(c.id)
    })));
  }

  function mostrarCategoria(catId) {
    const cat = ZNR_FAQ.categorias.find(c => c.id === catId);
    if (!cat) return;
    addMsg(cat.label, 'user');
    const preguntas = ZNR_FAQ.entradas.filter(e => e.c === catId);
    addMsg(`Estas son las preguntas más comunes sobre ${cat.label.toLowerCase()}:`, 'bot');
    addChips(preguntas.map(e => ({
      label: e.q,
      onClick: () => responderCon(e)
    })));
  }

  function responderCon(entrada) {
  addMsg(entrada.q, 'user');
  setTimeout(() => {
    addMsg(entrada.a, 'bot');
    registrarRespuesta();                 // ← NUEVA LÍNEA
    const relacionadas = ZNR_FAQ.entradas
      .filter(e => e.c === entrada.c && e.q !== entrada.q)
      .slice(0, 3);
      const chips = [{ label: '↩ Volver a categorías', cat: true, onClick: mostrarBienvenida }];
      relacionadas.forEach(e => chips.push({ label: e.q, onClick: () => responderCon(e) }));
      addChips(chips);
    }, 280);
  }

  function procesarBusqueda(query) {
    addMsg(query, 'user');
    const resultados = buscar(query, 6);
    const typing = document.createElement('div');
    typing.className = 'asistente-typing';
    typing.textContent = 'Buscando…';
    $body.appendChild(typing);
    $body.scrollTop = $body.scrollHeight;

    setTimeout(() => {
      typing.remove();
        if (!resultados.length) {
  addMsg('No encontré una respuesta exacta. Prueba con otras palabras, revisa las categorías, o escríbenos por WhatsApp.', 'bot');
   window._znrContextoWA = query;        
  mostrarWhatsAppBtn();
  addChips([
    { label: '↩ Ver categorías', cat: true, onClick: mostrarBienvenida },
    { label: '💬 Hablar con una persona', cat: true,
      onClick: () => abrirWhatsApp(query) }   // ← pasa lo que buscó
  ]);
  return;
}
      const top = resultados[0];
      const score2 = resultados[1] ? resultados[1]._score : 0;
      if (top._score >= 20 || top._score >= score2 * 1.8) {
        addMsg(top.a, 'bot');
        registrarRespuesta();
        const otras = resultados.slice(1, 4);
        const chips = [{ label: '↩ Volver a categorías', cat: true, onClick: mostrarBienvenida }];
        if (otras.length) {
          addMsg('También podrías preguntar:', 'bot');
          otras.forEach(e => chips.push({ label: e.q, onClick: () => responderCon(e) }));
        }
        addChips(chips);
      } else {
        addMsg('Encontré estas preguntas relacionadas:', 'bot');
        addChips([
          ...resultados.slice(0, 5).map(e => ({ label: e.q, onClick: () => responderCon(e) })),
          { label: '↩ Ver categorías', cat: true, onClick: mostrarBienvenida },
          { label: '💬 Hablar con una persona', cat: true, onClick: abrirWhatsApp }
        ]);
      }
    }, 350);
  }

 // Extrae solo el teléfono de un href tipo wa.me o api.whatsapp.com
function extraerTelefono(href) {
  try {
    const u = new URL(href, location.origin);
    const host = u.hostname.toLowerCase();
    if (!host.includes('wa.me') && !host.includes('whatsapp.com')) return null;

    // wa.me/521234567890  →  teléfono en el path
    const pathPhone = u.pathname.replace(/^\/+/, '').split('/')[0];
    if (pathPhone && /^\d+$/.test(pathPhone)) return pathPhone;

    // api.whatsapp.com/send?phone=521234567890  →  teléfono en query
    const qPhone = u.searchParams.get('phone');
    if (qPhone) return qPhone.replace(/\D/g, '');

    return null;
  } catch (_) { return null; }
}

function abrirWhatsApp(contexto) {
  // Si viene desde un onclick, llega un Event: lo ignoramos.
  if (contexto instanceof Event) contexto = null;

  // Arma el mensaje final (con contexto opcional entre comillas).
  let texto = WA_MSG;
  if (contexto && typeof contexto === 'string' && contexto.trim()) {
    texto += `\n\n(Consulta desde el asistente: "${contexto.trim()}")`;
  }
  const msg = encodeURIComponent(texto);

  const origWa = document.querySelector('.floating-wa');

  if (origWa) {
    const href = (origWa.getAttribute('href') || '').trim();

    // Caso 1: el backend ya seteó un href real (contacto_admin en RTDB)
    //         → extraemos su número y reconstruimos con NUESTRO mensaje.
    if (href && href !== '#' && !href.startsWith('javascript:')) {
      const phone = extraerTelefono(href);
      if (phone) {
        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank', 'noopener');
        return;
      }
      // Si no se pudo extraer el número, abrimos tal cual (mensaje del backend)
      window.open(href, '_blank', 'noopener');
      return;
    }

    // Caso 2: el backend usa un click handler (no controlamos su mensaje).
    //         Disparamos su click y listo — su texto será el que se use.
    const preventNav = (e) => e.preventDefault();
    origWa.addEventListener('click', preventNav, { capture: true, once: true });
    try {
      origWa.click();
      if (typeof origWa.onclick === 'function') {
        try {
          origWa.onclick(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        } catch (_) {}
      }
    } catch (_) {}
    return;
  }

  // Caso 3: no existe .floating-wa (el frontend aún no leyó contacto_admin
  //         o falló la sincronización). En vez de abrir una URL rota,
  //         avisamos en el propio chat con el correo de soporte.
  addMsg(
    'No pude abrir WhatsApp automáticamente en este momento. Escríbenos a znrcomunity@gmail.com y te ayudamos con tu caso.',
    'bot'
  );
  addChips([
    { label: '↩ Volver a categorías', cat: true, onClick: mostrarBienvenida }
  ]);
  return;
}


// ── Utilidad y escalado a WhatsApp ───────────────────────────
function registrarRespuesta() {
  if (ESTADO.waVisible || ESTADO.utilidadMostrada) return;
  ESTADO.preguntasRespondidas++;
  if (ESTADO.preguntasRespondidas >= 3) {
    setTimeout(mostrarPreguntaUtilidad, 500);
  }
}

function mostrarPreguntaUtilidad() {
  if (ESTADO.utilidadMostrada || ESTADO.waVisible) return;
  ESTADO.utilidadMostrada = true;
  addMsg('¿Te resultó útil el asistente?', 'bot');

  const wrap = document.createElement('div');
  wrap.className = 'asistente-utility-chips';

  const yes = document.createElement('button');
  yes.type = 'button';
  yes.className = 'asistente-utility-chip yes';
  yes.textContent = '👍 Sí, me sirvió';
  yes.onclick = () => {
    wrap.remove();
    addMsg('¡Genial! Sigo aquí por si necesitas algo más.', 'bot');
  };

  const no = document.createElement('button');
no.type = 'button';
no.className = 'asistente-utility-chip no';
no.textContent = '👎 No, necesito ayuda';
no.onclick = () => {
  wrap.remove();
  addMsg('Entiendo. Te conecto con una persona del equipo Z&R para ayudarte mejor.', 'bot');
  mostrarWhatsAppBtn();
  // Pasa la última pregunta que el bot respondió (si existe)
  const ult = [...ESTADO.historial].reverse()
    .find(h => h.who === 'user' && h.text);
  window._znrContextoWA = ult ? ult.text : null;
};

  wrap.appendChild(yes);
  wrap.appendChild(no);
  $body.appendChild(wrap);
  $body.scrollTop = $body.scrollHeight;
}

function mostrarWhatsAppBtn() {
  if (ESTADO.waVisible) return;
  ESTADO.waVisible = true;
  const waBtn = $panel.querySelector('.asistente-wa');
  if (waBtn) {
    waBtn.classList.add('visible');
    waBtn.style.animation = 'none';
    void waBtn.offsetWidth;             // reinicia la animación
    waBtn.style.animation = 'asst-pulse 1.2s ease 2';
  }
}
  

  // ── Abrir / cerrar ───────────────────────────────────────────
  function abrir() {
    if (ESTADO.abierto) return;
    ESTADO.abierto = true;
    $panel.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (!ESTADO.historial.length) mostrarBienvenida();
    setTimeout(() => $input.focus(), 120);
  }
  function cerrar() {
    ESTADO.abierto = false;
    $panel.classList.remove('open');
    document.body.style.overflow = '';
  }

// ── Instalación ──────────────────────────────────────────────
function instalar() {
  if (window._znrAsistenteInstalado) return;
  window._znrAsistenteInstalado = true;

  inyectarCSS();

  // Usa el botón del HTML si existe; si no, lo crea.
  // ⚠️ NUNCA reemplaza .floating-wa — el backend lo necesita intacto.
  let btn = document.getElementById('floating-asistente-btn');
  if (!btn) {
    btn = crearBoton();
    document.body.appendChild(btn);
  }
  btn.addEventListener('click', abrir);

  $panel = crearPanel();
  $body  = $panel.querySelector('#asistente-body');
  $input = $panel.querySelector('#asistente-input');
  $form  = $panel.querySelector('#asistente-form');

  // ── Botón verde "Hablar con una persona" ─────────────────
  // NO usa href fijo. Cada click pasa por abrirWhatsApp(), que:
  //   1) Lee el href real de .floating-wa (lo setea el backend)
  //   2) Si no hay href, dispara el .click() del original
  //   3) Si no existe, cae al número de respaldo ZNR_FAQ.wa
  const waLink = $panel.querySelector('.asistente-wa');
  waLink.removeAttribute('href');
  waLink.style.cursor = 'pointer';
  waLink.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    abrirWhatsApp(window._znrContextoWA);
  });

  // ── Listeners del panel ──────────────────────────────────
  $panel.addEventListener('click', e => { if (e.target === $panel) cerrar(); });
  $panel.querySelector('.asistente-close').addEventListener('click', cerrar);
  $form.addEventListener('submit', e => {
    e.preventDefault();
    const q = $input.value.trim();
    if (!q) return;
    $input.value = '';
    procesarBusqueda(q);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && ESTADO.abierto) cerrar();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', instalar);
} else {
  instalar();
}
  // Exponer por si se necesita abrir por código
  window.abrirAsistenteZNR = abrir;
})();
