# KOBALT — ATLAS TÉCNICO Y CONCEPTUAL DE LOS TRES ENFOQUES

**KOB2 9.0.1 · Kobalt Minimal Flat 1.0.0 · Kobalt Exacto (contrato conceptual)**  
**Edición de consolidación:** 2026-11-10 20:43, UTC−5 / America/Bogota  
**Tipo:** lectura técnica integral, comparativa, auditada contra los ejecutables recuperados.  
**Advertencia de versión:** esta consolidación **no altera** las releases originales ni confiere automáticamente a ellas ideas posteriores. El código ejecutable determina qué está efectivamente implementado.

> **La distinción central:** Exacto pregunta «¿qué material exacto es este?»; Minimal Flat pregunta «¿cómo ubico y versiono material de manera compacta bajo una jurisdicción?»; KOB2 pregunta «¿cómo reconozco, sigo y compongo identidades y realizaciones mediante una gramática mínima?». Estas no son tres APIs intercambiables ni tres releases equivalentes.

---

## 0. Guía de lectura, fuentes y grado de certeza

### 0.1 Estados de verdad de este documento

Usaremos etiquetas rigurosas:

- **[E] Ejecutado / implementado:** aparece en el JavaScript recuperado de la release indicada; donde se anotan pruebas, se ejecutaron también las pruebas correspondientes.
- **[D] Documentado / doctrinal:** consta en documentación histórica o se deriva de la estructura conceptual, pero puede requerir un mecanismo exterior que no está en el kernel puro.
- **[P] Propuesta / diseño:** opción arquitectónica razonable para desarrollos posteriores, **no una capacidad atribuible al código**.
- **[L] Límite:** aquello que no puede inferirse de la release ni de sus pruebas.

**No confundir:** demostración de una relación matemática dentro de un programa; verificación por pruebas automatizadas; seguridad criptográfica formal; tolerancia distribuida; y validación empírica en producción. Son afirmaciones de naturaleza distinta.

### 0.2 Inventario y autenticidad de las releases

| Enfoque | Material ejecutable recuperado | Edición/versión | Estado |
|---|---|---|---|
| KOB2 puro | `KOB2/2026-09-18_0100_KOB2_KERNEL_9_0_1.js` | `9.0.1` | [E] JavaScript ejecutable y 26 pruebas internas |
| KOB2 mecanismos | `KOB2/2026-09-18_0100_KOBALT_MECHANISMS_1_0_0.js` | `1.0.0` | [E] Biblioteca derivada y 11 pruebas internas |
| Minimal Flat | `Minimal/2026-09-11_0014_kobalt-minimal-flat-1.0.0.js` | `1.0.0` | [E] JavaScript browser-native; probeta histórica 38/38 según expediente documental |
| Exacto | `Exacto/2026-11-10_1914_KOBALT_EXACTO_CONTRATO_CONCEPTUAL_NO_RELEASE.md` | Sin release independiente verificada | [D] Contrato, no ejecutable |

**SHA-256 del material original, verificado nuevamente al armar este paquete:**

```text
c4edb6f057f73ed1d1b5eff7965271ba1a854578dc8061e01c85708256d2f1c2  KOB2/2026-09-18_0100_KOB2_KERNEL_9_0_1.js
d0e81211c367d36c7036127c2f4bf2a246539a65bd28b9ba265319b1212e4c8e  KOB2/2026-09-18_0100_KOBALT_MECHANISMS_1_0_0.js
9e3a9839d42fce7f85556046c13d266587f136712a98023bac37451686999ce8  Minimal/2026-09-11_0014_kobalt-minimal-flat-1.0.0.js
```

La identidad de estos archivos depende de sus bytes, no del nombre humano de versión. Los hashes anteriores corresponden a los manifiestos históricos recuperados. Los informes y documentos nuevos de este ZIP tienen hashes propios en `SHA256SUMS.txt`.

### 0.3 Fuentes históricas consideradas

1. `unificado_2026-09-18_0108_KOB2_9_0_1_KERNEL_Y_MECHANISMS_COMPLETO_20260922_143303.txt`: release KOB2 9.0.1, atlas de mecanismos, documentación y probetas.
2. `unificado_2026-09-18_1119_KOBALT_MINIMAL_FLAT_PAQUETE_COMPLETO_20260918_123138.txt`: release Minimal 1.0.0 y aclaraciones matemáticas posteriores.
3. `2026-11-10_1236_KOBALT_FIBRA_ANCLAJE_CAUCE_CONSOLIDADO_CONCEPTUAL.md`: separación entre materialidad exacta, autoridad, identidades y proyecciones; expresamente no certifica un «Exacto» autónomo.
4. `2026-11-09_1613_KOBALT_MINIMAL_DISENO_ADQUISICION_COMPLETITUD_Y_COMERCIO.md`: materialidad local, adquisición, completitud y comercio, en estado de diseño candidato.
5. Archivo de síntesis `Exacto/2026-11-10_1914_KOBALT_EXACTO_CONTRATO_CONCEPTUAL_NO_RELEASE.md` recuperado del paquete precedente.
6. Código JavaScript **íntegro**, no solo descripciones o fragmentos.

---

## 1. Glosario transversal — antes de comparar

| Término | Significado preciso | Confusión que debe evitarse |
|---|---|---|
| **Bytes** `B` | Sucesión finita de octetos `B ∈ {0,…,255}*` | No supone formato JSON ni significado humano |
| **Identidad longitudinal** `I` | Referente que continúa siendo el mismo sujeto a través de realizaciones sucesivas | No equivale a un hash de su estado actual |
| **Contenido exacto** `Q` | Identificador derivado de bytes bajo una ley y una vista concretas | No equivale necesariamente a `SHA256(B)` puro |
| **Name** `N` | Coordenada/dirección de un objeto en el espacio nominal pertinente | No es título de propiedad ni autorización |
| **View** | Régimen de derivación y reconocimiento: claro o bajo clave en KOB2 | No equivale directamente a una interfaz visual |
| **Cell** | Palabra material tipada por descriptor y referente en KOB2 | Descriptor no significa automáticamente MIME |
| **Trajectory** `Γ` | Historia ordenada de realizaciones exactas de una continuidad | No es un árbol espacial |
| **Index** | Composición ordenada de referencias por posiciones | No es un historial temporal |
| **Current** | Última realización reconocida en una historia válida, bajo la evidencia disponible | No es, por sí solo, una garantía de verdad mundial o autoridad |
| **Coproducto** | Composición disjunta de ámbitos conservando procedencia | No es consenso ni transacción global |
| **Source** | Lugar o canal del que llega una observación material | No es una fuente automática de autoridad semántica |
| **Storage / adapter** | Realización de lectura, escritura, búsqueda y retención de material | No es el kernel ni el decisor de legitimidad |
| **Fingerprint** | Resumen abreviado (Minimal: 8 bytes) usado en una coordenada | No es una prueba infalible de unicidad ni firma digital |
| **Commitment** | Compromiso criptográfico del plaintext del envelope KOB2 | No es por sí solo un contrato jurídico/autorización |
| **D** en Minimal | Clave de derivación de 16 bytes usada por HMAC y cifrado | No es necesariamente `Domain Continuity` de KOB2 |
| **Descriptor** | Identidad de significado asociada a slot en una tabla externa, de la que se deriva el operador | No es un `switch` central de «tipo de archivo» |

### 1.1 Invariantes de diseño compartidos, pero no idénticos en código

1. **Identidad ≠ coordenada.** Un slot, URL, nombre o ruta no constituye por sí mismo la identidad plena de un sujeto. [D]
2. **Materialización ≠ autoridad.** Copiar datos, cifrarlos, guardarlos en IndexedDB o ponerlos en un servidor no confiere legitimidad para modificarlos. [D]
3. **Persistir causas; reconstruir consecuencias.** Índices, vistas, agregados, filtrados y cachés se pueden reconstruir desde material válido cuando las dependencias y la autoridad están bien especificadas. [D]
4. **Procedencia explícita cuando importa.** Dos ámbitos pueden reutilizar una coordenada local numéricamente idéntica sin designar el mismo sujeto. [D]
5. **No introducir semántica en el kernel sin demostrar irreducibilidad.** El núcleo no debe saber qué es un producto, un CSS, una App o un almacén, salvo las leyes materiales estrictamente necesarias. [D]
6. **Las garantías distribuidas necesitan un contrato adicional.** Reconocimiento, verificación local o append-only no prueban consenso, exclusión mutua global ni disponibilidad permanente. [L]

---

# PARTE I — KOBALT EXACTO

## 2. Identidad del enfoque y problema raíz

**Estado:** [D] contrato conceptual; **no se localizó un JavaScript autónomo publicado o verificado llamado Kobalt Exacto**. Una implementación futura debe definir explícitamente sus funciones, etiquetas, versiones de formato y pruebas. Este apartado **no pretende que tales métodos ya existan**.

**Pregunta raíz:** «Dado un material binario, ¿cómo identificar exactamente cuál es la realización recibida, de forma que pueda verificarse y reutilizarse, sin atribuirle automáticamente historia, propietario o autoridad?».

La ontología comienza con:

```text
Bytes B  ──contrato de derivación──►  Q
                         Q reconoce la realización material
```

Una forma abstracta del compromiso es:

\[
B\in\mathbb B^*,\qquad Q=ContentId_{\mathcal D}(B),
\]

con `𝒟` un **contrato de derivación** (dominio/etiqueta/vista, algoritmo, encuadre). Para una misma pareja `(𝒟,B)`, el identificador debe ser reproducible. Esta ecuación **no congela** un algoritmo particular para «Exacto» autónomo.

## 3. Propiedades y leyes de Exacto

### 3.1 Exactitud relativa a un contrato

- **[D] Determinismo:** `ContentId_𝒟(B)` es una función de los mismos bytes y del mismo contexto contractual.
- **[D] Re-verificación:** al adquirir un candidato `B'`, recalcular `ContentId_𝒟(B')` permite contrastar `Q` esperado con el recibido.
- **[D] Independencia física:** la misma realización exacta puede estar replicada en varios nodos o medios sin convertirse en múltiples identidades materiales semánticamente distintas.
- **[D] Inmutabilidad por referencia:** cuando se designa un `Q` concreto, cambiar los bytes corresponde conceptualmente a otra realización, no a actualizar esa realización manteniendo intacta su referencia.
- **[D] Reutilización y deduplicación:** referencias iguales bajo el mismo contrato permiten almacenar o descargar una realización una sola vez; la política de retención queda fuera.
- **[D] Composición opcional:** un documento o índice puede describir otras realizaciones exactas, siempre que la forma, orden y contrato de esas referencias se definan externamente. Esto no crea automáticamente la gramática KOB2.
- **[L] No unicidad absoluta matemática:** un hash finito puede colisionar; seguridad práctica depende de algoritmo, tamaño y amenazas.
- **[L] No identidad semántica:** dos JPEG distintos de la misma fotografía son bytes distintos; dos serializaciones de un objeto lógico pueden ser distintos `Q`.
- **[L] No autoridad:** poseer `Q` o `B` no autoriza operaciones sobre el sujeto representado.

### 3.2 Diferencia fundamental entre sujeto y realización

```text
Producto X (identidad longitudinal I_X)
  ├── estado exacto B0 → Q0
  ├── estado exacto B1 → Q1
  └── estado exacto B2 → Q2
```

`Q0`, `Q1`, `Q2` identifican realizaciones; `I_X` identifica el sujeto continuado. La relación temporal entre ellas **no se deduce** de `Q0,Q1,Q2`: requiere otro contrato, como una continuidad KOB2 o un esquema de versión Minimal. Esta distinción evita reemplazar la realidad del producto por el hash de su último registro.

### 3.3 Derivación, canonicalización y delimitación de partes

Exacto **no equivale** a `JSON.stringify(x)`, porque un objeto semánticamente equivalente puede serializarse de varias formas. Antes de decir que dos realizaciones son exactamente la misma es preciso definir **qué bytes se identifican**.

- Exactitud de bytes sin canonicalización: `Q` corresponde a la sucesión exacta; cambios de espacios, orden de campos o compresión cambian normalmente `Q`.
- Exactitud semántica de un objeto: necesitaría un canonicalizador y una ley explícita de equivalencia, que **no forman parte del contrato mínimo de Exacto**.
- Vectores o partes: para no confundir `[ab,c]` con `[a,bc]`, la derivación compuesta necesita encuadre inyectivo si opera sobre partes.
- Cambiar de contrato de derivación o de vista puede cambiar `Q` **aunque `B` no cambie**.
- Un hash criptográfico no prueba quién produjo `B`, si su uso estaba permitido o si está vigente.

### 3.4 Correspondencias con APIs efectivamente disponibles

Aunque Exacto no sea una tercera implementación autónoma, KOB2 **sí implementa** una operación de contenido exacto:

```js
// Operación REAL de KOB2 9.0.1, no API de un kernel Exacto autónomo.
const view = KOB2.View.clear();
const B = KOB2.Bytes.utf8('estado');
const Q = await KOB2.Derivation.contentId(view, B);
const realization = KOB2.Cell.emit(Q);
```

En KOB2 9.0.1 la fórmula concreta **no** es `SHA256(B)` sin más:

```text
Clear: SHA256(Frame([tag_clear_derive, tag_content, B]))
Keyed: HMAC-SHA256(view.key, Frame([tag_content, B]))
```

Además `name(view,cell)` deriva el nombre de la **Cell**, no únicamente del cuerpo. Minimal Flat usa, por su parte, un fingerprint HMAC de 8 bytes de un estado dentro de una coordenada de versión. **Ni uno ni otro debe presentarse como ejecutable de «Kobalt Exacto»**.

### 3.5 Capacidades que Exacto no tiene por definición

- No obtiene la versión más reciente ni crea `Current`.
- No establece causalidad temporal, autor ni orden de edición.
- No define el espacio de nombres completo ni un sistema de rutas.
- No resuelve concurrencia, divergencias o conflictos.
- No prueba validez jurídica, autorización o pertenencia a una jurisdicción.
- No implementa almacenamiento, CDN, red, RPC, réplica, limpieza de caché, disponibilidad offline ni sincronización.
- No define automáticamente la estructuración de un árbol, índice o grafo.
- No proporciona su propio cifrado o firma por el mero nombre «Exacto».
- No ha sido objeto de una suite de conformidad autónoma identificada en el expediente.

### 3.6 Casos de uso correctos [P, encima del contrato]

1. Biblioteca de fotos: bytes de imagen -> referencia exacta -> caché compartida por catálogo, POS y sitio web.
2. Documentos auditables: identidad de bytes del documento que se firmará o verificará mediante **un mecanismo exterior**.
3. Recursos repetidos: deduplicación de CSS, JS, plantillas, medios y assets estáticos.
4. Contenido offline: un nodo conserva realizaciones exactas requeridas por un conjunto finito de dependencias y reconoce qué le falta.
5. Historial derivado: los `Q` pueden ser elementos de un sistema de continuidad externo; por sí solos no construyen el historial.

---

# PARTE II — KOBALT MINIMAL FLAT 1.0.0

## 4. Identidad, filosofía y pregunta raíz

**Estado:** [E] kernel JavaScript ejecutable. Fecha de la release: 2026-09-11 00:14 UTC−5. No debe entenderse como una versión «recortada» sin más de KOB2: ataca otro problema matemático.

**Pregunta raíz:** «¿Cómo representar de manera muy compacta un espacio local denso de usuarios, nodos, aplicaciones y continuidades, con nombres navegables por prefijo y versiones protegidas, sin asignador global de coordenadas ni dependencia de un servidor?».

\[
K_{Minimal}=Coordinate+Version+Transform.
\]

Cadena conceptual:

```text
Clave D de jurisdicción (16 B)
  ↓ HMAC-SHA256 y etiquetas de dominio
Identidades estables de 32 B
  ↓ tablas vectoriales append / lookup
Slots locales de pequeño tamaño
  ↓ concatenación nominal canónica
Nombres prefijables
  ↓ timestamp local + huella de estado
Versiones en la rama nominal
  ↓ AES-GCM, AAD = nombre
Materialidad protegida por transformaciones
```

Es **byte-native**, **browser-native** y admite funcionamiento **offline-first** porque el núcleo no exige red ni servidor. Esto no implica que una aplicación completa ya posea sincronización, almacenamiento persistente o recuperación ante fallos.

## 5. Modelo matemático de las cinco coordenadas

La estructura declarada es:

\[
(U,N,A,C,V)
\]

con:

```text
U = (registrarPrefix, userSlot)
N = nodeId
A = appSlot
C = continuitySlot
V = (localTimestamp, stateFingerprint)
```

`U`, `N`, `A`, `C`, `V` son coordenadas **de localización material**; el mismo número de slot bajo otro registrador, usuario o nodo no identifica necesariamente el mismo objeto.

### 5.1 Geometría física y tamaños [E]

| Elemento | Tamaño | Función / condición |
|---|---:|---|
| `D` | 16 B | Clave de derivación (no identidad del usuario) |
| HMAC-SHA256 completo | 32 B | Identidad estable en la jurisdicción |
| `registrarPrefix` | 8 B | Primeros 8 B de una identidad HMAC del registrador/nodo |
| `nodeId` | 8 B | Identificador aleatorio de nodo generado por WebCrypto |
| `userSlot` | Varuint canónico | 1-based; `0` reservado para `UserTable` |
| `appSlot` | Varuint canónico | 1-based; `0` reservado para tablas |
| `continuitySlot` | Varuint canónico | 1-based; `0` reservado para tabla |
| `timestamp` | 8 B | Uint64 big endian; monotónico **local** si se usa el generador como corresponde |
| `stateFingerprint` | 8 B | Truncamiento de un HMAC sobre `baseName` y `payload` |
| `V` | 16 B | 8 B de tiempo + 8 B de fingerprint |
| IV AES-GCM | 12 B | Aleatorio para cada `seal` |
| Tag AES-GCM | 16 B | Autenticación de GCM; tag de 128 bits |
| Overhead de `seal` | 28 B | IV (12) + tag (16), sin contar el contenido |

La función `identity` usa separación de dominio por etiquetas `REGISTRAR=0x11`, `USER=0x12`, `APP=0x13`, `CONTINUITY=0x14`, `STATE=0x15`, `ENC_KEY=0x16`, `AAD=0x17`; usa HMAC-SHA256 sobre partes enmarcadas por longitudes y una etiqueta. **No todas esas etiquetas tienen exactamente la misma aplicación**: el `AAD` se emplea como byte adicional en el cifrado y otras se usan en derivaciones HMAC.

### 5.2 Forma exacta del nombre versionado [E]

```text
storageName = registrarPrefix
           || varuint(userSlot)
           || nodeId
           || varuint(appSlot)
           || varuint(continuitySlot)
           || uint64be(localTimestamp)
           || stateFingerprint[8]
```

La longitud **no es fija** por culpa de los `varuint`. El prefijo para una continuidad es el nombre sin sus 16 bytes de versión. Los nombres se pueden recorrer con `list(prefix)` si un adapter respeta comparaciones binarias por prefijo.

Los `varuint` usan codificación base 128 con bit de continuación y **rechazan representaciones no canónicas**. No se aceptan enteros negativos ni superiores a `Number.MAX_SAFE_INTEGER` en los slots representados mediante esta codificación. `timestamp` se maneja como `BigInt`/uint64 para preservar precisión.

### 5.3 Tres tablas reservadas y sus coordenadas [E]

```text
registrarPrefix || varuint(0)
    → UserTable del registrador

registrarPrefix || varuint(userSlot) || nodeId || varuint(0) || varuint(0)
    → AppTable del nodo

registrarPrefix || varuint(userSlot) || nodeId || varuint(appSlot) || varuint(0)
    → ContinuityTable de la App
```

**Nota importante:** `UserTable`, `AppTable` y `ContinuityTable` son *formas nominales reservadas*. La release no crea por sí sola una base de datos persistente. Corresponde a la aplicación almacenar sus bytes utilizando un adapter.

### 5.4 Identidades, tablas y slots [E]

- `identity.generic(D,tag,...atoms)`: HMAC-SHA256 del mensaje etiquetado y enmarcado.
- `identity.user(DRegistry,userAtom)`: identidad del usuario para esa jurisdicción.
- `identity.app(DUser,appAtom)`: identidad de la aplicación dentro de usuario.
- `identity.continuity(DUser,appHmac,continuityAtom)`: continuidad relacionada con la identidad de la App.
- `registrarPrefix(DRegistry,registrarNodeId)`: obtiene 8 bytes, no confundir con identidad global completa.
- `table.empty()` produce vector de 0 B.
- `table.count/get/find/ensure` tratan `Table` como **vector plano de registros HMAC de stride 32 B**, con slots **1-based**; `ensure` añade si no existe y devuelve `{table, slot, added}` sin mutar en sitio la tabla anterior.
- La posición de tabla es coordenada **espacial**. No es tiempo, ni `Current`, ni prueba de legitimidad.
- Los prefijos de registradores, los node IDs aleatorios y los fingerprints truncados tienen probabilidad de colisión no nula: no son prueba matemática de unicidad universal.

### 5.5 Construcción y versión [E]

Sea `baseName` la concatenación hasta `continuitySlot` y `payload` el estado binario. Entonces:

```text
stateFingerprint(DUser, baseName, payload)
  = first8(HMAC_DUser(Frame([TAG.STATE, baseName, payload])))

versionCoordinate = uint64be(timestamp) || stateFingerprint
versionName       = baseName || versionCoordinate
```

`version.nextTimestamp(previous, wallClockMs)` toma el máximo práctico entre reloj local y `previous+1`. Eso hace la sucesión estrictamente creciente **cuando el mismo escritor conserva el último timestamp y lo pasa correctamente**. No garantiza orden global entre nodos, ni monotonía si se pierde el estado anterior.

`names.latestVersion(names,baseName)` filtra nombres de longitud y prefijo correcto, elige el mayor timestamp y, ante empate, desempata lexicográficamente por fingerprint. **Ese desempate no representa causalidad ni autoridad;** el propio código advierte que dos escritores correctos del mismo nodo no deberían empatar.

`names.decode(name)` reconoce nombres completos de tabla, base y versión; no está diseñado para aceptar cualquier prefijo de exploración incompleto como si ya fuese una entidad decodificable.

### 5.6 `Transform` y cifrado [E]

```text
key = import AES-256-GCM(HMAC_D(TAG.ENC_KEY))
iv  = 12 bytes aleatorios mediante crypto.getRandomValues
AAD = byte(TAG.AAD) || name
envelope = iv || AES-GCM(key, iv, AAD, payload)
```

- `seal(D,name,payload)` genera bytes protegidos mediante AES-256-GCM.
- `open(D,name,envelope)` verifica autenticidad bajo el mismo `D`, `name` y sobre; si falla la autenticación debe fallar la apertura.
- La clave `D` mide **16 B**, pero la clave AES derivada tiene **32 B**. No son la misma secuencia.
- El nombre queda **autenticado como AAD**, no cifrado; el propio nombre puede exponer estructura/coordenadas y longitud.
- La confidencialidad de los bytes depende de la protección de `D`, la generación de IV y las propiedades de AES-GCM.
- La API `seal` recibe un `name` ya construido: **no verifica automáticamente** que el fingerprint incrustado en ese nombre corresponda al `payload`. Tal coherencia debe imponerse por contrato exterior o mediante una verificación adicional. Tampoco verifica permisos de escritura.
- No hay firmantes, firmas públicas, ACLs ni ledger criptográfico de autoridad implementados en este kernel.

### 5.7 Coproductos y separación de escritores [D, estructura soportada]

El espacio nominal permite separar trayectorias de diferentes registradores, usuarios y nodos, por ejemplo:

\[
\mathcal U=\coprod_r\mathbb N_r,
\qquad World_U=\coprod_n World_{U,n}.
\]

El sentido práctico es **evitar conflictos al asignar coordenadas cuando cada escritor opera en su región**, antes que intentar resolver todo mediante un contador o un consenso global. Eso **no proporciona** control efectivo de exclusividad del mismo recurso ni merge automático entre nodos.

### 5.8 API pública completa por familias [E]

```text
KobaltMinimalFlat.VERSION
KobaltMinimalFlat.CONSTANTS
KobaltMinimalFlat.identity.generic | user | app | continuity
KobaltMinimalFlat.randomNodeId
KobaltMinimalFlat.registrarPrefix
KobaltMinimalFlat.table.empty | count | get | find | ensure
KobaltMinimalFlat.varuint.encode | decode | decodeAt
KobaltMinimalFlat.names.userTable | userPrefix | nodePrefix | appPrefix
                        | appTable | continuityTable | continuityBase
                        | version | decode | latestVersion
KobaltMinimalFlat.version.nextTimestamp | stateFingerprint
                         | coordinate | encodeTimestamp | decodeTimestamp
KobaltMinimalFlat.seal | open
```

La API se registra en `globalThis.KobaltMinimalFlat` mediante una IIFE; no requiere un empaquetador, Node ni un servidor para el navegador objetivo, siempre que esté disponible `crypto.subtle`.

### 5.9 Flujo de operación típico [P sobre API real]

```text
(1) Disponer de DRegistry, DUser protegidos exteriormente
(2) Obtener registrarPrefix y un nodeId
(3) Resolver o añadir las identidades HMAC en UserTable, AppTable y ContinuityTable
(4) Componer continuityBaseName con slots estables
(5) Consultar nombres anteriores por prefix y determinar el tiempo local siguiente
(6) Calcular versionName desde timestamp y payload
(7) seal(DUser, versionName, payload)
(8) Adapter.put(versionName, envelope)
(9) Para leer: Adapter.list(basePrefix) → latestVersion → Adapter.get → open
```

En este flujo, `Adapter`, gestión de claves, atomicidad de tabla, control de concurrencia y reglas de legitimidad son exteriores; no están implementados en el kernel. Conservar un `previousTimestamp` consistente es una obligación del proceso que publica.

### 5.10 Propiedades que NO garantiza Minimal [L]

- No da consenso, ni `single-writer` técnicamente impuesto, ni resolución distribuida de escrituras en conflicto.
- No sabe qué son usuarios humanos, tiendas, aplicaciones concretas o permisos comerciales.
- No implementa `get/put/list` ni R2, Drive, IndexedDB, SQLite, HTTP o filesystem.
- No integra automáticamente un libro de evidencia o un grafo de aparición comparable con KOB2.
- No tiene `FOLLOW`, `EXPAND`, `EMIT` como gramática de recorrido del kernel Minimal 1.0.0.
- No representa una historia longitudinal por `Trajectory` KOB2; seleccionar un nombre mayor por timestamp es otro mecanismo temporal.
- No posee pruebas formales de disponibilidad offline o réplica multi-nodo: solo independencia de red del código del núcleo.
- No convierte la posición de tabla en autoridad de escritura; esa regla corresponde a la constitución operacional.
- No prueba confidencialidad del espacio de nombres (los nombres no son secretos por diseño).

### 5.11 Escenarios apropiados

Ideal para catálogos densos, cientos o miles de entidades locales, coordenadas compactas, dispositivos que trabajan parcialmente offline, cachés versionadas, listas rápidas por prefijo y aplicaciones que prefieren separar storage de lógica. Es especialmente útil cuando interesa el costo de un slot local frente a repetir cientos de veces una identidad criptográfica completa. Este potencial depende del número de entidades y de las operaciones del adapter real, no de un benchmark incluido en el kernel.

---
# PARTE III — KOB2 9.0.1 (VALIENTE–GUADUA)

## 6. Identidad y reducción constitucional

**Estado:** [E] release ejecutable `9.0.1`, 2026-09-18, separada de la biblioteca `KobaltMechanisms 1.0.0`. No hay obligación de compatibilidad contractual con KOB2 9.0.0, y **no debe trasladarse automáticamente documentación de 9.0.0 como si describiera 9.0.1**.

**Pregunta raíz:** «¿Cómo reconocer y reconstruir realizaciones, continuidad histórica y composición espacial a partir de una gramática material muy pequeña, sin cargar el núcleo con semántica de aplicaciones, almacenamiento, mundos o autoridades?».

El mínimo implementado es:

```text
Frame + View + Derivation + Cell + CellVector
      + Grammar + Recognition + Resolution
```

La pieza conceptual característica es la **interpretación de tres operadores**, no un árbol codificado de tipos de archivo:

```text
EMIT(Q)    → contenido exacto, hoja; no se expande estructuralmente
EXPAND(Q)  → contenido exacto interpretado como Index(Cell*)
FOLLOW(I)  → identidad longitudinal cuya trayectoria resuelve la actualidad
```

Esta lectura permite tratar una `App`, una tabla, un grafo, un documento o una lista de imágenes como realidades **externas a la ley del kernel**.

## 7. Formatos materiales y constantes exactas [E]

| Elemento | Tamaño/valor | Significado |
|---|---:|---|
| `I` (Identity) | 32 B | Identidad longitudinal derivada |
| `Q` (ContentId) | 32 B | Identidad material de bytes bajo View |
| `N` (Name) | 32 B | Nombre derivado de la Cell |
| `DescriptorSlot` | 4 B | `uint32be` que apunta a gramática del descriptor |
| `Referent` | 32 B | Identidad o ContentId según operador |
| `Cell` | **36 B** | `descriptorSlot(4) || referent(32)` |
| `CellVector` | `36n` B | Vector plano de `n` celdas |
| `Frame` | `4 + Σ(8 + |atom_i|)` B | Conteo `uint32be` y cada longitud `uint64be` |
| Magic del envelope | 4 B | ASCII `KOB2` |
| Versión exterior de envelope | 2 B | `uint16be(3)`; **no equivale al número 9.0.1** |
| Tipo de vista | 1 B | 0 = CLEAR; 1 = KEYED |
| Commitment | 32 B | Compromiso del plaintext contextualizado |
| Cabecera total | 39 B | 4 + 2 + 1 + 32 |
| Cell en plaintext | 36 B | Primeros 36 bytes del plaintext |
| Tag GCM | 16 B | 128 bits |
| Nonce GCM | 12 B | Derivado determinísticamente (no almacenado explícitamente) |
| Envelope CLEAR | **75 + |B|** B | 39 B cabecera + 36 B Cell + `B` |
| Envelope KEYED | **91 + |B|** B | 39 + (36 + `B` + tag de 16) |

**Corrección histórica importante:** los 75/91 bytes son la gramática de la implementación **9.0.1** que está dentro de este ZIP. No debe copiarse el overhead de KOB2 9.0.0 ni el de KOB1/8.3.2.

### 7.1 Ejemplo material de Cell

```text
00000000 || 32 bytes de Q  → EMIT(Q)
00000001 || 32 bytes de Q  → EXPAND(Q)
00000002 || 32 bytes de I  → FOLLOW(I)
```

Los números `0`,`1`,`2` son **slots de génesis**, interpretados por el resolver inicial. No son «tags de CSS, HTML o JPG». Más descriptores pueden remitir al mismo operador si una tabla de descriptores válida los constituye y un resolver externo los reconoce.

### 7.2 Frame: fronteras conservadas

`Frame.frame([A,B])` no equivale a `A || B`; introduce conteo y longitudes para que secuencias de partes distintas no se confundan por concatenación. La implementación rechaza frames truncados, bytes sobrantes y longitudes que no pueda materializar de forma segura en JavaScript. La identidad de una secuencia de átomos depende, por tanto, de **átomos y fronteras**.

\[
Frame([a_1,\dots,a_n])=uint32be(n)\Vert\prod_i(uint64be(|a_i|)\Vert a_i)
\]

### 7.3 View: claro frente a clave

```text
View = Clear ⊔ Keyed(B^32)
Clear:  sin clave secreta; derivaciones públicas reproducibles
Keyed:  clave de 32 bytes; HMAC-SHA256 para derivaciones etiquetadas
```

`Clear` no proporciona secreto. `Keyed` exige una clave de 32 bytes, y una clave distinta constituye normalmente otro espacio de derivación. **La pertenencia a una vista no es una ACL ni demuestra que el actor esté autorizado a publicar.**

## 8. Identidades, nombres y contenido exacto [E]

El kernel usa etiquetas de dominio ASCII distintas para identidad, contenido, nombres, commitments, clave AEAD y nonce AEAD. Las funciones públicas relevantes son:

```js
const v = KOB2.View.clear();
const I = await KOB2.Derivation.identity(v, [KOB2.Bytes.utf8('producto'), KOB2.Bytes.utf8('SKU-1')]);
const B = KOB2.Bytes.utf8('estado');
const Q = await KOB2.Derivation.contentId(v, B);
const C = KOB2.Cell.emit(Q);
const N = await KOB2.Derivation.name(v, C);
```

**Ley de contenido** (con tags concretos de KOB2):

```text
ContentId_Clear(B) = SHA256(Frame([TAG_CLEAR_DERIVE, TAG_CONTENT, B]))
ContentId_Keyed(B) = HMAC_key(Frame([TAG_CONTENT, B]))
Name_View(C)       = View.derive(TAG_NAME, [encodeCell(C)])
```

- El mismo contenido bajo el mismo régimen de vista produce el mismo `Q`.
- La derivación utiliza dominios y framing, no hash sin contexto.
- La Cell forma parte del nombre: `EMIT(Q)` y `EXPAND(Q)` tienen nombres distintos para el mismo `Q`.
- El nombre de `FOLLOW(I)` permanece asociado a su Cell incluso cuando se publican nuevas trayectorias para `I`.
- Un `Q` exacto no decide si debe leerse como una hoja o como un índice; eso lo decide **el operador de la Cell**.

### 8.1 Distinción entre `Q`, `I`, `N` y `Cell`

| Elemento | Responde a | Ejemplo conceptual |
|---|---|---|
| `Q` | ¿Qué realización binaria exacta es esta? | Estado del producto a las 10:00 |
| `I` | ¿Qué sujeto longitudinal reconocemos? | Producto SKU-1 |
| `Cell` | ¿Qué operación se aplicará al referente? | `FOLLOW(I)` o `EMIT(Q)` |
| `N` | ¿En qué nombre se observa/materializa esta Cell? | Nombre derivado de `FOLLOW(I)` |
| Envelope | ¿Qué evidencia binaria contiene la Cell y los bytes validados bajo la View? | Un envelope de trayectoria o contenido |

No debe identificarse automáticamente una identidad del sujeto con un hash de estado ni una clave nominal con el sujeto al que se refiere.

## 9. Gramática, Descriptor y `CellVector` [E + mecanismos derivados]

### 9.1 Ley de resolución de operador

```text
operator(descriptorSlot, resolver)
    → EMIT | EXPAND | FOLLOW
```

El kernel expone un resolver de génesis para slots 0 a 2. Para cualquier otro slot, exige un `resolver` que devuelva uno de los tres operadores; si no se reconoce, falla explícitamente con `E_DESCRIPTOR_UNKNOWN` (u otro error contractual de operador). **No interpreta por su cuenta una tabla global escondida.**

### 9.2 DescriptorTable viva [E como mecanismo, no como primitiva]

`KobaltMechanisms.DescriptorTable` permite:

- Derivar identidad de la tabla y de cada descriptor.
- Construir génesis con identidades para `emit`, `expand`, `follow`.
- Publicar estados de descriptores representados en índices.
- Compilar un resolver externo recorriendo la historia válida de cada descriptor.
- Verificar correspondencia de los slots génesis `0..2`.
- Rechazar una mutación histórica del operador declarado por un descriptor.

**Invariante clave:** una posición constituida en una tabla de identidades no debe apuntar más tarde a otra identidad. El significado funcional depende del descriptor, y la tabla puede crecer sin agregar nuevas instrucciones elementales al kernel.

### 9.3 Carrier frente a interpretación

`CellVector` es un `Uint8Array` cuyo tamaño es múltiplo de 36. Permite `from`, `at`, `append`, `last`, `isPrefix`, `commonPrefix`. **El vector por sí mismo no es tiempo ni espacio:** `Trajectory` e `Index` imponen interpretaciones distintas sobre el mismo soporte.

Esto es una decisión matemática central: **no crear dos formatos binarios incompatibles cuando basta distinguir el contrato de interpretación**.

## 10. `Trajectory`: continuidad histórica [E]

\[
\Gamma_I = [r_0,r_1,\dots,r_n], \qquad r_i\in ExactCell
\]

- `Trajectory` sólo admite celdas con operador **EMIT o EXPAND** bajo el resolver correspondiente.
- Una trayectoria puede estar vacía; en ese caso no hay última realización/actualidad.
- `Trajectory.last(Γ)` devuelve el último elemento solo cuando existe.
- La extensión válida es por **prefijo conservativo**: una historia ya constituida puede crecer sin modificar su pasado.
- `FOLLOW` está **prohibido dentro de la trayectoria** para impedir confundir la historia de realizaciones con otra identidad que deba seguirse.
- `Current(I)` se **deriva de la historia reconocida**, no es un tipo de Cell especial ni un registro global mágico.
- Dos trayectorias incomparables representan divergencia, no una historia ordenable por una preferencia arbitraria.

Ejemplo:

```text
Γ0 = [EMIT(Q0)]
Γ1 = [EMIT(Q0), EXPAND(Q1)]

Γ0 ⪯ Γ1 → Γ1 extiende Γ0; Current = EXPAND(Q1)

Γa = [EMIT(Q0), EMIT(Q2)]
Γb = [EMIT(Q0), EMIT(Q3)]

Γa y Γb no son comparables por prefijo → FORK
```

Aquí `Q1` podría representar una composición, mientras que `Q2` y `Q3` son realizaciones alternativas. La regla no implica que `Q2` sea «falso», ni hace merge automático.

## 11. `Index`: composición espacial [E]

\[
Index = [c_0,c_1,\dots,c_n],\qquad c_i\in Cell
\]

`Index` admite `FOLLOW`, `EXPAND` y `EMIT` interpretados bajo la gramática. Cada posición identifica una **coordenada de composición**; su orden no equivale al orden de publicación.

```text
Index de una ficha:
  slot 0 → EMIT(Q_nombre)
  slot 1 → EMIT(Q_descripcion)
  slot 2 → FOLLOW(I_precio)
  slot 3 → EXPAND(Q_imagenes)
```

Este es un **ejemplo de modelado exterior**, no una categoría comercial codificada por KOB2. La semántica de cada posición requeriría un contrato de descriptor/aplicación y potencialmente otros niveles de índice.

### 11.1 Por qué separar historia y composición

- `Trajectory` responde **qué realizó el mismo sujeto en orden causal reconocido**.
- `Index` responde **qué referencias forman una estructura y en qué posiciones**.
- La misma secuencia material `Cell*` se interpreta de forma distinta según su contrato.
- Una tabla de identidades o de referencias puede ser un `Index` y su **evolución temporal** puede ser una `Trajectory` de índices sucesivos. Son dos ejes que se componen, no que se confunden.

## 12. Envelope: material reconocido, seguridad y determinismo [E]

### 12.1 Forma externa

```text
[ MAGIC="KOB2" (4) ][ VERSION=3 (2) ][ VIEW_KIND (1) ][ COMMITMENT (32) ]
[ Clear: CELL (36) || B ]
     o
[ Keyed: AES-GCM(CELL (36) || B) + TAG (16) ]
```

El `commitment` está calculado sobre el plaintext `P = encodeCell(C) || B`, el tipo de View y la versión exterior. En `Keyed`, la clave y el nonce de AEAD se **derivan del commitment y la View**, de manera que la operación es determinista para igual contenido y contexto.

### 12.2 `Envelope.seal` [E]

1. Recibe View, Cell y bytes `B`.
2. Revisa que la Cell tenga un operador reconocible.
3. Si `EMIT` o `EXPAND`, recalcula `ContentId_View(B)` y exige que sea igual al `referent`.
4. Si `EXPAND`, valida que `B` sea un `Index` de Cells.
5. Si `FOLLOW`, valida que `B` sea una `Trajectory` de Cells exactas.
6. Construye `P = Cell || B` y su commitment.
7. En modo Clear deja `P` visible; en Keyed lo cifra/autentica mediante AES-GCM, con la cabecera como AAD.
8. Devuelve `{viewKind,cell,operator,contentId,name,nameHex,commitment,envelope}`.

### 12.3 `Envelope.open` [E]

1. Comprueba Magic, versión de sobre y tipo de View.
2. En Keyed autentica y descifra; en Clear toma el cuerpo sin secreto.
3. Comprueba compromiso del plaintext.
4. Decodifica la Cell y valida el tipo de cuerpo exigido por su operador.
5. Recalcula `Q` para referencias exactas y exige coincidencia.
6. Devuelve Cell, operador, bytes `content`, nombre y metadatos verificables.

**Consecuencia:** una envoltura que afirma `EMIT(Q)` pero contiene bytes de otro `Q` debe ser rechazada bajo una derivación y View correctas.

### 12.4 Alcance criptográfico y límites [L]

- **Clear:** integridad de contenido respecto a un identificador/compromiso verificado; no confidencialidad ni autenticación de autor.
- **Keyed:** secreto y autenticación del sobre para quien no conoce la clave, sujeto a implementación, gestión de secretos y supuestos criptográficos.
- **Determinismo:** KOB2 9.0.1 usa una construcción AEAD determinista con material derivado de commitments. **No equivale automáticamente a una garantía de seguridad formal de una AEAD resistente al mal uso de nonces**; requeriría revisión criptográfica específica.
- **Convergencia de contenido:** un mismo objeto exacto puede producir la misma envoltura bajo contexto estable; este determinismo puede revelar igualdad de objetos a observadores que ven sobres repetidos.
- **Sin firma:** un sobre válido no prueba **qué persona** lo publicó.
- **Sin autorización:** conocer la View o poder construir bytes válidos no acredita derecho de actualización.
- **Sin disponibilidad:** la existencia de un nombre derivado no obliga a ningún almacenamiento a devolver material.
- **Sin atomicidad distribuida:** publicar dos sobres en orden no crea un commit atómico ante caídas parciales.

## 13. `Recognition`: observación frente a aceptación [E]

`Recognition.recognize(view,expectedCell,envelopes,resolver)` recibe candidatos observados y devuelve tres grupos explícitos:

```text
accepted   → sobres que abren correctamente y cuya Cell coincide con la esperada
otherCell  → sobres que abren correctamente, pero pertenecen a otra Cell
rejected   → sobres que no abren/validan, con código y mensaje de error
```

No debe confundirse **«lo encontré en una Source»** con **«es evidencia válida de este nombre/Cell bajo este contrato»**. La operación tampoco asume que la Source sea honesta ni que todos los datos observados sean completos.

## 14. `Resolution`: exactitud, actualidad y divergencias [E]

`ResolveKind` contiene exactamente:

```text
NO_EVIDENCE | UNRECOGNIZED | EXACT | EMPTY | CHAIN | FORK
```

| Resultado | Significado |
|---|---|
| `NO_EVIDENCE` | No se proporcionó ningún candidato para consultar el referente |
| `UNRECOGNIZED` | Había candidatos, pero ninguno quedó reconocido como la Cell esperada |
| `EXACT` | Se recuperó un contenido exacto válido asociado a una Cell EMIT/EXPAND |
| `EMPTY` | Se reconoció la historia de `FOLLOW(I)`, pero es vacía |
| `CHAIN` | Trayectorias reconocidas comparables por prefijo; hay máxima y actualidad |
| `FORK` | Trayectorias reconocidas no comparables por prefijo; no se elige silenciosamente una |

La resolución de historias primero deduplica secuencias materiales, luego comprueba si existe una historia máxima que extienda a todas las observadas; si no, genera `FORK` y expone el prefijo común. `forkFrontier` puede identificar las Cells finales de trayectorias que no fueron extendidas por otras de la misma colección.

**Principio epistemológico:** ausencia de observación no es prueba de inexistencia; una Source parcial no establece completitud global; escoger el dato «más nuevo» por heurística sin una relación causal sería abandonar la ley de prefijo de KOB2.

## 15. Biblioteca Kobalt Mechanisms 1.0.0 [E]

Esta biblioteca **no amplía las primitivas irreducibles del núcleo**. Deriva operaciones de aplicación a partir de `Frame, View, Cell, Trajectory, Index, Recognition, Resolution` e inyecta los efectos externos. Está cargada **después** del kernel KOB2 y se publica como `globalThis.KobaltMechanisms` (también `module.exports`).

### 15.1 `Continuity`

Métodos:

```text
openTrajectory · openExact · state · openAt · openCurrent · planUpdate
```

- `openTrajectory` consulta el nombre de `FOLLOW(I)` por `query(name)`.
- `openExact` consulta la realización exacta de una Cell.
- `state` traduce el resultado `FOLLOW` a estados de mecanismo: `NO_EVIDENCE`, `UNRECOGNIZED`, `EMPTY`, `FORK`, `CURRENT`.
- `openAt` recupera la realización en una posición histórica reconocida y devuelve `CONTENT_MISSING` si falta su material.
- `openCurrent` selecciona la última realización de la historia reconocida y solicita el contenido exacto.
- `planUpdate` construye una nueva Cell exacta, la trayectoria extendida, y **dos objetos a publicar** (realización y FOLLOW). No realiza escritura de red/almacenamiento por sí sola.

### 15.2 `Publication`

`Publication.publish(plan,put)` impone secuencia:

```text
(1) put(realization.name, realization.envelope, step)
(2) put(follow.name, follow.envelope, step)
```

El segundo paso ocurre después del primero en el mismo flujo asíncrono. **No constituye** una transacción atómica entre dos storages ni garantiza que otros lectores observen un snapshot único; `put` es inyectado por el ambiente y puede fallar, duplicarse o tardar.

La ley causal deseada es:

\[
Realization \prec FOLLOW
\]

La aplicación debe resolver reintentos, idempotencia, autorización y manejo de errores externos.

### 15.3 `CoordinateTable`

Métodos:

```text
state · identities · slotOf · at · append · isExtension
assertExtension · coordinate · encodeCoordinate
```

Implementa una tabla de identidades `I_i` materializada como índice de `FOLLOW(I_i)` sin duplicados. Sus slots preservan posiciones por extensión de prefijo. Es la noción de **tabla de coordenadas** de KOB2, que no debe confundirse sin más con el vector HMAC de 32 bytes de Minimal.

### 15.4 `Coproduct`

Métodos `inject`, `encode`, `key` materializan una inyección con contexto y valor local, de modo que coordenadas iguales bajo contextos diferentes sigan siendo distinguibles. El coproducto conserva procedencia; no es coordinación global, autorización ni solución mágica para transacciones inter-ámbito.

### 15.5 `Evidence`

Métodos:

```text
found · absent · noClaim · report · normalize
 envelopes · support · book · at
```

Tipos de observación:

```text
FOUND  → el canal reporta material, con COMPLETE o PARTIAL
ABSENT → el canal afirma ausencia bajo su pregunta/alcance
NO_CLAIM → el canal no afirma existencia ni ausencia
```

La evidencia se relaciona con un nombre/pregunta y un conjunto de bases consultadas. `EvidenceBook` agrupa resultados indexados por nombre; no debe mezclar evidencia de preguntas diferentes. `FOUND/PARTIAL` **no significa** que la búsqueda esté completa. Ni `ABSENT` equivale necesariamente a inexistencia mundial.

### 15.6 `MemorySource`

Métodos `create`, `collect`, `query` sirven como adapter **de probeta en memoria** para consultar objetos por nombres. Su existencia es útil para validar interfaces de consulta, pero no demuestra persistencia tras cierre de pestaña, protección frente a corrupción ni durabilidad física.

### 15.7 `DescriptorTable`

Métodos:

```text
identity · descriptorIdentity · coreIdentities · genesis · compile
```

Constituyen la gramática extensible y compilan un resolver que conoce el operador de cada descriptor desde su historia. Se verifica génesis y no cambio del operador histórico. Un descriptor desconocido no se interpreta por adivinación.

### 15.8 `Closure`

`Closure.walk({view,root,query,resolver,maxCells,maxDepth})` realiza una exploración estructural de `FOLLOW`, `EXPAND` y `EMIT` con:

```text
root · vertices · edges · frontier · complete
```

- `FOLLOW`: visita la Cell actual si hay `CHAIN`; registra `FORK` o evidencia insuficiente en frontera.
- `EXPAND`: abre Index y encola cada hijo de la composición.
- `EMIT`: reconoce el contenido como hoja terminal del recorrido estructural.
- Ciclos: mapa de visitados por clave de Cell evita visitas repetidas.
- Presupuestos: parámetros `maxCells` (por defecto 4096) y `maxDepth` (por defecto 256) limitan recorrido y registran frontera de presupuesto.
- `complete=true` **solo** significa que no quedó frontera sin resolver bajo **esa consulta, View, presupuesto y representación**; no asegura que se ejecutaron comandos de negocio ni que se descargaron todas las posibles representaciones del mundo.

**Distinción de la etapa Hodor:** una clausura de evidencia es un recorrido de reconocimiento; no es un ejecutor de funciones ordenadas y no otorga por sí misma atomicidad a un flujo de operaciones externas.

### 15.9 `Principal`, `Domain`, `Authority`

Métodos:

```text
Principal.origin
Domain.identity · effectiveView · audience
Authority.identity · admit
```

Constituyen identidades derivadas para origen, dominio efectivo y autoridad, usando entradas/funciones inyectadas como `constituter` o `verify`. **No** implementan un sistema general de permisos verificable por sí solo, ni un registro civil, ni una PKI, ni garantías de aceptación de políticas no suministradas.

### 15.10 Lista completa de mecanismos como jurisdicciones

```text
KobaltMechanisms
 ├─ MechanismResult
 ├─ Continuity      (6 métodos)
 ├─ Publication     (1)
 ├─ CoordinateTable (9)
 ├─ Coproduct       (3)
 ├─ Evidence        (9)
 ├─ MemorySource    (3)
 ├─ DescriptorTable (5)
 ├─ Closure         (1)
 ├─ Principal       (1)
 ├─ Domain          (3)
 ├─ Authority       (2)
 └─ Tests           (selfTest)
```

## 16. API pública de KOB2 pura, exhaustiva por familias [E]

```text
KOB2.release · KOB2.grammar · KOB2.Operator · KOB2.GenesisSlot
KOB2.ViewKind · KOB2.ResolveKind · KOB2.KobaltError

KOB2.Bytes
    ascii · utf8 · bytes · concat · equal · compareLex · slice
    bytesToHex · hexToBytes · uint16be · uint32be · uint64be

KOB2.Frame
    frame · unframe

KOB2.View
    clear · keyed · assert · derive

KOB2.Derivation
    identity · contentId · name

KOB2.Cell
    make · assert · encode · decode · equal · key
    emit · expand · follow · exact · operatorOf

KOB2.Vector
    assert · from · length · at · append · last · isPrefix · commonPrefix

KOB2.Trajectory
    assert · from · length · at · append · last · isPrefix · commonPrefix

KOB2.Index
    assert · from · length · at

KOB2.Grammar
    genesisResolver · operator · operatorOf

KOB2.Envelope
    seal · open · parse

KOB2.Recognition
    recognize

KOB2.Resolution
    trajectories · exact · follow · evaluate · forkFrontier · match

KOB2.Tests
    knownAnswerVector · knownAnswerTest · selfTest
```

**Dependencias:** WebCrypto (`crypto.subtle`) y `TextEncoder`. KOB2 admite ejecución en navegador y Node con WebCrypto; no necesita que el kernel sepa nada de la Source concreta.

## 17. Flujo mínimo de KOB2 de extremo a extremo [E + adapter inyectado]

### 17.1 Publicación de la primera realización

```text
(1) View ← View.keyed(secret32) o View.clear()
(2) I ← Derivation.identity(View, atomsDelSujeto)
(3) B0 ← bytes del primer estado
(4) Q0 ← Derivation.contentId(View, B0)
(5) Cell0 ← EMIT(Q0) o EXPAND(Q0) según contenido
(6) Γ0 ← Trajectory.from([Cell0])
(7) E0 ← Envelope.seal(View, Cell0, B0)
(8) EF ← Envelope.seal(View, FOLLOW(I), Γ0)
(9) put(E0.name,E0.envelope)
(10) put(EF.name,EF.envelope)
```

El mecanismo `Continuity.planUpdate` abstrae partes de los pasos 3–8 y `Publication.publish` inyecta 9–10. El kernel **no constituye permisos** para escribir esos nombres.

### 17.2 Lectura de la actualidad

```text
(1) Calcular Name(FOLLOW(I)) bajo View
(2) Consultar todos los envelopes candidatos disponibles para ese nombre
(3) Recognition → aceptar/rechazar candidatos
(4) Resolution.follow → NO_EVIDENCE / UNRECOGNIZED / EMPTY / CHAIN / FORK
(5) Si CHAIN: Current = última Cell de la trayectoria máxima por prefijo
(6) Calcular Name(Current) y consultar material exacto
(7) Resolution.exact → bytes reconocidos o situación no resuelta
```

**Precondición:** `query` debe representar claramente los candidatos que realmente observó y si la consulta es o no completa. Un retorno sin sobres no permite inferir que no exista material en ninguna otra fuente.

### 17.3 Aparición de una composición

```text
FOLLOW(I_ficha)
    ↓ historia
EXPAND(Q_ficha)
    ↓ Index
[ EMIT(Q_titulo), FOLLOW(I_precio), EXPAND(Q_medios) ]
       ↓                  ↓                  ↓
  bytes título      precio actual       otras Cells
```

Esta figura muestra por qué **historia temporal**, **composición espacial**, **bytes terminales** y **políticas de aplicación** no deben fundirse en una sola entidad de almacenamiento.

## 18. Invariantes, controles y errores importantes [E]

- Toda `Cell` tiene `referent` de **exactamente 32 bytes** y `descriptorSlot` `uint32`.
- Todo `Vector` mide múltiplo de 36 bytes.
- Toda `Trajectory` es un vector cuyas Cells son exactas (`EMIT`/`EXPAND`).
- Todo `Index` es un vector cuyas Cells tienen operador válido bajo resolver.
- `EMIT/EXPAND` solo se admiten con `Q` correspondiente a `ContentId(B)`.
- `FOLLOW` lleva contenido material de `Trajectory` válida, no una llamada informal a una identidad.
- El nombre de una Cell se deriva de ella en una View.
- El sobre reconoce su versión exterior y View y comprueba commitment.
- Un descriptor no reconocido es error, **no** una hoja interpretada por defecto.
- Dos historias no comparables producen `FORK`.
- `Publication` respeta orden realización antes de referencia mutable.
- `CoordinateTable` exige identidades sin duplicados y extensión conservativa.
- El módulo de mecanismos trata `NO_EVIDENCE`, `UNRECOGNIZED`, `EMPTY`, `FORK` y `CONTENT_MISSING` como estados distinguibles.

### 18.1 Propiedades **no** demostradas por el kernel [L]

El ejecutable **no contiene** como primitivas: `World`, `Principal`, `Authority A`, `Table`, coproducto, `Domain D` como continuidad, motor de reglas, control de transacciones, Storage, Relay, HTTP, MIME, UI, usuario, App, políticas comerciales, relojes globales, almacenamiento persistente o elección de gobernanza. Algunas nociones se derivan en `Mechanisms`, pero continúan sujetas a entradas y efectos externos.

Tampoco se han probado mediante la suite 26+11:

- acuerdo entre réplicas hostiles o consenso de red;
- seguridad formal del protocolo de cifrado en todos los modelos de ataque;
- firmas o identidad de autores;
- semántica de precios, inventario, contabilidad o propiedad;
- commit transaccional en distintos servicios;
- durabilidad física bajo fallas;
- completitud universal de adquisición offline;
- memoria/agencia autónoma correcta;
- validación de todos los posibles descriptores futuros.

---

# PARTE IV — COMPARACIÓN Y DECISIONES DE ARQUITECTURA

## 19. Tabla comparativa estricta

| Propiedad | Exacto (conceptual) | Minimal Flat 1.0.0 | KOB2 9.0.1 |
|---|---|---|---|
| Pregunta principal | Qué bytes son | Dónde/versionar material compacto | Cómo seguir y componer identidades |
| Release JS propia | **No verificada** | Sí | Sí |
| Identidad de material exacto | Sí, contrato abstracto `Q` | Fingerprint corto dentro de versión, no `Q` global como API | `Derivation.contentId` de 32 B |
| Identidad longitudinal | No, externa | HMAC estable de continuidad | `Derivation.identity` + `FOLLOW(I)` |
| Coordenadas compactas | No inherentes | Sí, slots varuint y tablas de stride 32 | `DescriptorSlot` 4 B y tablas de mecanismo, no mismo esquema |
| Estructura temporal | No | Nombre versionado por timestamp local | `Trajectory` de Cells exactas |
| `Current` | No | Selección del mayor nombre versionado | Derivado de trayectoria máxima reconocida por prefijo |
| Composición espacial | Externa | No hay gramática universal `Index` en release | `Index` / `EXPAND` |
| Hoja terminal de material | Exterior | Payload de versión, sin `EMIT` | `EMIT(Q)` |
| Seguir sujeto mutable | Exterior | Resolución nominal de versiones | `FOLLOW(I)` |
| Descriptor extensible | No definido | No definido por la release | Génesis en kernel + DescriptorTable en mecanismos |
| Cifrado nativo | No definido | AES-256-GCM, IV aleatorio, AAD nombre | Clear o Keyed, Keyed determinista AES-GCM |
| Nombres navegables por prefijo | No definido | Sí, composición binaria prefijable | Nombres de Cell de 32 B; las relaciones vienen por índice/trayectoria |
| Búsqueda/réplica en red | No | Adapter exterior | Query/put exterior |
| Historial auditable | No | Versiones nominales, no libro de evidencia propio | Historial y evidencia derivados; no garantía global de completitud |
| Conflicto explícito | No definido | Orden/tie-break local, sin detector `FORK` KOB2 | `FORK` ante trayectorias no comparables |
| Autoridad/ACL/propiedad | No | Exterior | Exterior; mecanismos admiten verificador inyectado |
| Permisos y leyes comerciales | No | No | No |
| Uso offline sin servidor obligatorio | Conceptualmente sí | Sí para el núcleo | Sí para el núcleo |

## 20. Cuándo elegir cada enfoque

### 20.1 Preferir materialidad exacta cuando...

- Lo central sea conservar y reconocer imágenes, documentos, scripts o contenido inmutable.
- Varias pantallas o aplicaciones puedan reutilizar los mismos bytes.
- Interese comparar igualdad material sin introducir historia ni dueño.

**Pero:** debe elegirse un algoritmo y contrato de derivación real; no existe aquí un `.js` «Exacto» autónomo listo para producción.

### 20.2 Preferir Minimal Flat cuando...

- Hay muchos objetos locales y merece la pena comprimir identidad en slots.
- Se necesitan nombres estructurados con `list(prefix)`.
- Cada nodo tiene una región de escritura bien delimitada.
- El costo de acceso y el funcionamiento local-first pesan más que un motor general de reconstrucción grafológica.

**Pero:** resolver conflictos y validar autoridad, coherencia de fingerprints y persistencia depende de capas exteriores.

### 20.3 Preferir KOB2 cuando...

- Se necesita distinguir rigurosamente sujeto, realización, trayectoria y composición.
- Un documento, producto o App puede representarse recursivamente mediante hojas, índices y referencias a identidades mutables.
- Se deben distinguir observaciones válidas, incompletas, material faltante y forks.
- La extensibilidad de descriptores y la derivación de mecanismos son más importantes que reducir todo a una única coordenada plana.

**Pero:** la riqueza del reconocimiento aumenta el costo conceptual y operacional; un `Index` no es una query SQL ni una semántica de negocio ya definida.

## 21. Convergencia posible sin fusionar las leyes [P]

La arquitectura coherente sería **componer jurisdicciones** sin forzar al kernel Minimal a volverse KOB2 ni viceversa:

```text
                         ENTIDADES REALES
                (productos, inventarios, documentos)
                               │
                     CONTRATOS EXTERIORES
            (autoridad, semántica, compromisos, políticas)
                               │
                  ┌────────────┴────────────┐
                  │                         │
          Vía KOB2                    Vía Minimal
     identidad/historia/             slots, prefijos,
     composición/evidencia           versiones locales
                  │                         │
                  └────────────┬────────────┘
                               │
                       MATERIAL EXACTO
                       bytes verificables
                               │
           Storages, cachés, IndexedDB, R2, Drive, FS...
                         (adaptadores)
```

**Esto es una forma de coexistencia conceptual, no un adaptador bidireccional implementado.** Las versiones, funciones de derivación, geometrías, pruebas y modelos de tiempo son distintos. La equivalencia de representaciones debe especificarse y verificarse caso por caso.

### 21.1 Entidad individual, totalidad y parámetros específicos [P]

Una aplicación comercial puede requerir simultáneamente:

1. **Representación por entidad:** ficha de un producto con identidad longitudinal y relaciones a sus variables.
2. **Representación de totalidad:** región de catálogo, inventario de una bodega o colección completa de SKUs.
3. **Representación por parámetro:** vectores densos de precios, existencias, colores, estados, categorías o índices de búsqueda.

No son tres verdades independientes. Son **proyecciones/contratos distintos** que deben exponer dependencia, procedencia, versión y autoridad. Si una existencia se calcula de transacciones, persistir además el vector de stock por rendimiento no convierte al vector en escritor autorizado. Ninguno de los tres kernels de este ZIP trae implementada toda esa disciplina comercial.

### 21.2 Proyección derivada ≠ historia autoritativa

```text
Hechos válidos + contrato de autoridad
           ↓
    actualización de continuidad
           ↓
    proyecciones derivadas
           ├── ficha de un SKU
           ├── vector de stock
           ├── listado por categoría
           ├── conteo de catálogo
           └── vista HTML/PWA
```

El hecho de tener una vista rápida o un agregado local **no** autoriza a editar directamente su valor si no existe un contrato de escritura legítimo para esa realidad.

### 21.3 Cooperación y ámbitos independientes

La combinación de coproductos y coordenadas locales sirve para distinguir un stock de bodega A de uno de bodega B, incluso si ambos tienen `slot=1`. La suma para mostrar stock total es una **proyección**. Reservar unidades para un pedido entre las dos bodegas exige compromisos legítimos en cada ámbito; no está resuelto por la suma ni por el simple `Index` que las menciona.

### 21.4 Completitud offline y caché [P]

«Todo en caché» solo es una afirmación precisa respecto a **una clausura finita de dependencias, un ámbito, una vista y una versión**. Un nodo puede conocer `Q`, pero no tener los bytes; puede tener bytes exactos, pero no conocer la actualidad; puede tener actualidad local, pero no información sobre otras fuentes más recientes. Esto exige distinguir:

```text
Existente / Reconocido / Materializado / Retenido / Adquirible / Vigente / Autorizado
```

No debe atribuirse a `Closure.complete` una garantía universal de disponibilidad offline ni a la tabla Minimal un acuerdo distribuido sobre qué se debe cachear.

## 22. Riesgos comunes y cómo evitar inferencias incorrectas

| Riesgo | Afirmación incorrecta | Afirmación correcta |
|---|---|---|
| Identidad de bytes | «Hash = identidad del producto» | Hash = identidad de una realización; continuidad requiere otro contrato |
| Cifrado | «Cifrado = propietario legítimo» | Cifrado = protección/autenticación bajo clave; propiedad/autoridad se valida aparte |
| Listado por prefijo | «Mayor timestamp = verdad de todo el sistema» | Mayor timestamp es criterio de versión local bajo ese orden nominal |
| Trayectoria KOB2 | «`FOLLOW(I)` siempre encuentra una actualidad única» | Puede faltar evidencia, estar vacía o haber `FORK` |
| Descriptor | «Slot 17 = tipo CSS del kernel» | Slot se interpreta mediante Descriptor/Resolver externo |
| Replicación | «Dos copias = consenso» | Dos copias son ocurrencias; consistencia/autorización son contratos distintos |
| Índice | «Índice de SKU = información completa» | Índice puede mencionar material no adquirido, viejo o fuera de ámbito |
| Publicación | «Dos `put()` ordenados = transacción atómica» | Orden causal no implica atomicidad ante fallos |
| Test | «26/26 PASS = seguridad de producción» | Pruebas internas validan escenarios concretos, no todas las amenazas |
| Exacto | «Existe el tercer kernel JavaScript Exacto» | Se dispone de un contrato conceptual, no release independiente verificada |
| Versiones | «9.0.1 y 1.0.0 son interoperables» | Son APIs y gramáticas diferentes: requieren contrato de compatibilidad |

## 23. Verificación reproducible

### 23.1 KOB2 y mecanismos: resultados comprobados en Node 22

Para los dos JavaScript íntegros de este ZIP se ejecutaron:

```js
const K = require('./KOB2/2026-09-18_0100_KOB2_KERNEL_9_0_1.js');
const M = require('./KOB2/2026-09-18_0100_KOBALT_MECHANISMS_1_0_0.js');
const kernel = await K.Tests.selfTest();
const mechanisms = await M.Tests.selfTest();
const kat = await K.Tests.knownAnswerTest();
```

Resultado de esta consolidación:

```text
Kernel 9.0.1:       26/26 PASS
Mechanisms 1.0.0:   11/11 PASS
Known-answer 9.0.1: PASS
```

El archivo `Verificacion/2026-11-10_2043_KOB2_TEST_RESULTS.json` contiene el resultado material de la ejecución. El archivo `Verificacion/2026-11-10_2043_RUN_KOB2_TESTS.js` permite repetirla desde la raíz del ZIP con Node moderno.

### 23.2 Minimal Flat 1.0.0

El expediente oficial del paquete Minimal documenta **38/38** verificaciones; esas verificaciones pertenecen a su release browser-native original y **no son la suite `KOB2.Tests`**. El archivo de este ZIP conserva el ejecutable original exacto; se añade una probeta básica en navegador solo como apoyo, sin presentar su resultado como sustituto del test histórico completo. Para una auditoría exhaustiva debe utilizarse también la probeta oficial de Minimal Flat (el paquete histórico contiene `2026-09-11_0014_kobalt-minimal-flat-1.0.0-verify.html`).

### 23.3 Exacto

No existen en este ZIP tests autónomos de conformidad de «Kobalt Exacto» porque **no existe una implementación independiente acreditada**. Las pruebas de `Derivation.contentId` de KOB2 validan la función KOB2, no una release futura «Exacto».

### 23.4 Comprobación de SHA-256

Desde la raíz del paquete, con una herramienta `sha256sum`, comparar los hashes de los `.js` con los valores del apartado 0.2. Las entradas de documentación y resultados tienen sus propios hashes en el manifiesto. Hashes iguales acreditan coincidencia **de bytes** con el material indicado, no ausencia de vulnerabilidades.

---

## 24. Contratos y pruebas que faltaría cerrar antes de un sistema de producción [P]

1. **Jurisdicción de autoridad:** quién puede producir el próximo hecho válido y cómo se verifica esa competencia para ese ámbito y época.
2. **Atomicidad de operaciones:** qué es un compromiso indivisible; qué sucede ante caída entre realización y `FOLLOW`, o entre stock y pedido.
3. **Durabilidad:** sincronización real de disco, recuperación de transacciones, corrupción y respaldo.
4. **Concurrencia:** exclusión efectiva de escrituras incompatibles, orden causal y resolución de conflictos.
5. **Criptografía:** modelo de amenazas, revisión de la construcción deterministic AEAD de KOB2, rotación de claves, no reutilización peligrosa de IV en Minimal y exposición de metadatos.
6. **Canonicalización:** qué igualdad se desea (binaria o semántica) y cómo se mantiene en codificadores diferentes.
7. **Interoperabilidad:** mapeo explícito entre slots Minimal, identidades KOB2 y materiales exactos; no asumir correspondencia implícita.
8. **Completitud/adquisición:** objetivos finitos, versión/basis, dependencias, presupuesto local, política de retención y salida offline definida.
9. **Modelos de proyección:** conservar origen y tiempo de cada producto, bodega, precio y existencia; distinguir valores materializados de hechos autoritativos.
10. **Conformidad y pruebas adversariales:** vectores de compatibilidad, forks, datos inválidos, inyección de Sources falsas, colisiones nominales, truncamiento y concurrencia real.

## 25. Síntesis conceptual final

Los tres enfoques pueden formularse como **tres preguntas irreducibles**:

\[
\boxed{\text{Exacto: } Q=ContentId_{\mathcal D}(B)}
\]

\[
\boxed{\text{Minimal Flat: } (U,N,A,C,V)\mapsto Name\mapsto Material}
\]

\[
\boxed{\text{KOB2: }Cell=(DescriptorSlot,Referent),\quad\{EMIT,EXPAND,FOLLOW\}}
\]

Pero también responden a **tres responsabilidades distintas**:

- **Materialidad:** reconocer el conjunto exacto de bytes y sus ocurrencias.
- **Coordenadas y versionado:** localizar realizaciones bajo ámbitos y tiempos locales específicos.
- **Historia y composición:** seguir identidad, reconocer evolución, recorrer índices y distinguir evidencia de especulación.

La regla de diseño más profunda no es seleccionar un kernel ganador en abstracto, sino **no introducir en ninguno aquello que pertenece causal o semánticamente a otro nivel**. En particular:

> Una identidad no es su coordenada. Una realización exacta no es el sujeto continuo. Un almacenamiento no es la autoridad. Una proyección no es un nuevo hecho por el solo hecho de persistir. Un resultado de pruebas no sustituye a un contrato formal de seguridad o consistencia.

---

## Apéndice A — Inventario físico del paquete

```text
KOBALT_TRES_KERNELS_COMPLETO/
├── README.md
├── Documentacion/
│   └── 2026-11-10_2043_KOBALT_TRES_KERNELS_ATLAS_TECNICO_COMPLETO.md
├── KOB2/
│   ├── 2026-09-18_0100_KOB2_KERNEL_9_0_1.js
│   └── 2026-09-18_0100_KOBALT_MECHANISMS_1_0_0.js
├── Minimal/
│   └── 2026-09-11_0014_kobalt-minimal-flat-1.0.0.js
├── Exacto/
│   └── 2026-11-10_1914_KOBALT_EXACTO_CONTRATO_CONCEPTUAL_NO_RELEASE.md
├── Verificacion/
│   ├── 2026-11-10_2043_KOB2_TEST_RESULTS.json
│   └── 2026-11-10_2043_RUN_KOB2_TESTS.js
└── SHA256SUMS.txt
```

**Última distinción de procedencia:** los tres `.js` son el material ejecutable original conservado; el documento `Exacto/*.md` es una recuperación conceptual anterior; el presente atlas, `README`, runner y verificación son nuevos artefactos de la consolidación. Ningún archivo nuevo es una release nueva del kernel.
