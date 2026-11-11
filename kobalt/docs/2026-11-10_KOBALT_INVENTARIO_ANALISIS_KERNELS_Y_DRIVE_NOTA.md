# Kobalt inventario — nota de análisis: kernels, matemática y realización en navegador + Google Drive

**Fecha:** 2026-11-10 · **Tipo:** memoria de trabajo del proyecto (no es una release ni una especificación cerrada).

## Fuentes analizadas
- Conversación «Reconstruir Kernels Kobalt» (2026-11-10, 10:25–19:08): Fibra, Contrato (antes Anclaje), Cauce, trayectoria append-only, tiempo, solicitudes vs compromisos, disponibilidad firme/prudente, flujos de alta e importación, dualidad entidad/transversal.
- «Kobalt Minimal: consolidación integral…» (adjunto): single-writer, coproducto, geometría de impacto, Flat de stock, IDs compactos, adquisición y completitud.
- ZIP «KOBALT_TRES_KERNELS_ATLAS_COMPLETO»: código íntegro de KOB2 9.0.1, Kobalt Mechanisms 1.0.0, Minimal Flat 1.0.0; contrato conceptual de Exacto (sin release); atlas técnico.

## Verificado en esta sesión
- SHA-256 del paquete: todos OK. KOB2 26/26, Mechanisms 11/11, KAT PASS (Node 22).
- Minimal en Node: tabla, varuint, seal/open (+28 B), timestamp monotónico: OK.
- Varuint canónico Minimal: 1 B hasta 127, 2 B hasta 16.383, 3 B hasta 2.097.151; rechaza formas no canónicas.
- Minimal `open` acepta un sobre cuyo payload no corresponde a la huella del nombre → hay que recomprobar `stateFingerprint` al leer.
- Coste KOB2: cada FOLLOW reescribe la trayectoria completa (36 B por acción). Publicando cada acción: 18.250 acciones (≈50/día·1 año) → último FOLLOW 642 KB, ≈6 GB escritos en total. Requiere segmentar o usar cadena de hashes.
- `D = max(0, H−A)` no es actualizable desde sí misma (contraejemplo: (H2,A5) y (H3,A3) dan D=0; tras ingresar 2 dan 0 y 2).
- Asignar una solicitud pendiente no cambia la disponibilidad prudente.

## Reducción matemática (resultados)
1. Incidencia = función parcial f: E×K ⇀ V; sección y columna son sus dos currificaciones; fibra = preimagen de una columna; filtros = álgebra booleana de vectores de bits sobre coordenadas estables (500 variantes → 63 B por fibra). El complemento exige máscara de «conocidos».
2. Trayectoria Γ ∈ A* (monoide libre); Fold es una acción del monoide → los snapshots son correctos por construcción.
3. **Guardas ≠ invariantes:** H ≥ A es guarda de asignar, no invariante (el conteo puede violarlo; el déficit es representable).
4. Una proyección es incremental sin consultar el estado si y solo si su núcleo es una congruencia para todas las acciones. El estado mínimo suficiente es el cociente de Myhill–Nerode respecto de las preguntas; P agregado no basta si las acciones nombran solicitudes concretas (hace falta el mapa de solicitudes abiertas).
5. Arbitraje necesario ⟺ la restricción compartida no se descompone en restricciones locales. Cuotas delegadas (escrow): Σ Q_d ≤ H − A ⇒ cada dispositivo vende con guarda local sin coordinar.
6. Criterio de partición en ámbitos de compromiso: dos hechos van en la misma trayectoria si alguna acción debe leerlos/escribirlos atómicamente (componentes conexas del grafo de co-acceso). Esto sustituye la elección «producto canónico vs vector canónico».
7. Entre ámbitos: orden parcial; un conjunto de checkpoints es válido si es un corte causalmente cerrado.

## Dicotomía Minimal aplicada al stock
- Un nodo lógico con varios dispositivos ⇒ necesita compromiso exclusivo.
- Un nodo por dispositivo ⇒ necesita particionar el recurso (cuotas).

## Google Drive como almacenamiento (estado de cada supuesto)
- Crear con ID pre-generado (`generateIds`) → reintentos posteriores reciben 409: **documentado**. Uso como reclamo exclusivo entre dispositivos (cada compromiso n guarda el fileId reservado para n+1): **inferencia, verificar**.
- v3 sin ETag/If-Match por archivo: **reportado por desarrolladores; no usar archivos «cabeza» mutables**.
- `name contains` hace coincidencia por prefijo de término: **documentado**; con nombres hex largos: **verificar** (alternativa: prefijos en `appProperties`, ≤124 B clave+valor, ≤30 privadas por app).
- `drive.file` no sensible + Google Picker; `drive` completo restringido: **documentado**. Acceso de un revendedor a carpeta compartida vía Picker: **verificar**.
- `changes.getStartPageToken` / `changes.list` para irradiación por sondeo (push requiere endpoint HTTPS propio).
- Drive admite nombres duplicados: inocuo para versiones Minimal (huella en el nombre), peligroso para punteros mutables.
- Ningún kernel trae firmas: hoy la autoridad material de escritura la da el ACL de Drive.

## Decisiones abiertas (del usuario)
1. ¿Privacidad frente a Google (cifrado Minimal, gestión de claves) o solo control de acceso de Drive?
2. ¿Cajeros con cuenta Google propia (autoridad aplicable por Drive) o dispositivo del dueño (autoridad solo en la app)?
3. Partición de ámbitos de stock (por dueño, por bodega) según el criterio de co-acceso; transferencias entre bodegas: ámbito común o protocolo en dos pasos con «en tránsito».
4. ¿Ventas sin conexión? → cuotas delegadas por dispositivo.

## Próxima probeta propuesta: «Probeta 0 · Drive»
Verificar con dos navegadores y dos cuentas: (1) 409 al crear el mismo ID reservado desde dos dispositivos; (2) `name contains` con hex de 70 caracteres; (3) acceso de `drive.file` vía Picker a una carpeta buzón compartida; (4) latencia de `changes.list` tras crear; (5) visibilidad en `files.list` justo después de crear.
