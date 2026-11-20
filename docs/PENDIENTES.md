# Datos pendientes de confirmar con Ochentos

El contenido inicial se transcribió del PDF **MENU.OCTUBRE.2026.ESPAÑOL.OCHENTOS** (16 páginas, todas son imágenes; no tienen texto seleccionable). No se inventó ningún precio, ingrediente ni producto. Estos puntos necesitan confirmación; todos se corrigen desde el Excel sin tocar código.

## Requieren decisión del restaurante

| Producto (id) | Qué dice el PDF | Qué hice | Qué confirmar |
|---|---|---|---|
| Shots (`coctel-shots`) | «Tequila $150 // $250», «Mezcal $150 // $250», sin decir qué distingue cada precio | Variantes «Tequila · opción A/B», «Mezcal · opción A/B» | Nombre real de cada opción (¿casa / premium?, ¿sencillo / doble?) |
| Frutti di Mare (`pasta-frutti-vino-blanco`, `pasta-frutti-pomodoro`) | Dos versiones con viñeta, $460 y $480, sin nombre propio | Dos productos: «· al vino blanco» y «· pomodoro», nombrados por su salsa | Nombre con que las piden los meseros |
| Medalla (`cerveza-chivito-lai`, `cerveza-ochentos`) | Ícono de medalla junto al nombre, sin explicación | Etiqueta `medalla`, se muestra el mismo ícono sin texto | ¿Qué premio es? Se puede agregar al campo «detalle» |
| Nombres en verde | Alitas vegetarianas, pizza Vegetariana, Margarita y Tre Formaggi aparecen en verde | No se marcaron como vegetarianos (sería una suposición) | Si verde = vegetariano, poner `vegetariano` en la columna etiquetas |
| Asterisco (*) | Algunos cocteles y ensaladas llevan «*» antes del nombre | No se muestra | ¿Qué significa? |
| Bandera de México | Junto a Patriota (coctel y pizza) y Mexicana | No se muestra | Se puede agregar como etiqueta si se desea |
| Pan (`extra-orden-pan` y nota de Pastas) | Pastas: «pan ciabatta»; Extras: «pan de la casa»; ambos $45 | Se respetó cada texto | ¿Es el mismo pan? |
| Orden de pollo / camarón | Aparece en Ensaladas y en Extras con el mismo precio | Se conservaron ambos, como en el PDF | ¿Dejar solo en Extras? (poner `publicado = no` en el otro) |
| Docena surtida (`postre-docena-surtida`) | «Docena surtida $200» seguida de 4 galletas | Un producto con las 4 galletas como opciones | ¿La docena combina las 4? |
| Old Fashion, Mohito, Peliroja | Así escritos en el PDF | Se respetaron (pueden ser nombres de la casa) | ¿Old Fashioned, Mojito, Pelirroja? |

## Correcciones ortográficas aplicadas

Para que el menú digital no herede erratas evidentes del PDF, se corrigió: Campary → Campari · Bayleiys → Baileys · Kahlua → Kahlúa · chedar → cheddar · mozarella → mozzarella · ricota → ricotta · fortina → fontina · praline → praliné · pate → paté · garnitura → guarnición · syrope → syrup · cema carbonara → crema carbonara · porkbelly → pork belly · cilanto → cilantro · Zuccini → Zucchini · Fambruesa → Frambuesa · Chardonay → Chardonnay · Topochico → Topo Chico · 400Conejos → 400 Conejos · «con con» → «con» · respondabilidad → responsabilidad (texto de portada).

Si alguna era intencional, se revierte en el Excel.

## Contenido que el PDF no incluye

- **Fotografías de los platillos.** No existe ninguna foto de producto en el PDF ni en ochentos.com (el sitio solo tiene una foto del lugar y una de una pizza sin identificar). El menú funciona sin fotos y cada foto se sube desde el panel cuando esté lista. No se generaron fotos artificiales.
- **Horario.** No se pudo leer de la ficha de Google Maps; si se desea en el pie del menú, se agrega en `src/config/brand.ts`.
- **Menú en inglés.** ochentos.com también publica un PDF en inglés. El sistema actual es en español; una versión bilingüe es una ampliación posible.
