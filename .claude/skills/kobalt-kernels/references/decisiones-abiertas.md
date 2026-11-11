# Decisiones abiertas y supuestos por verificar

Un agente **no** resuelve estas decisiones por su cuenta: si su tarea depende de una, se detiene y la deja como pregunta para el usuario. Puede proponer opciones con sus consecuencias, pero la decisión es del usuario.

## Decisiones del usuario
1. **Privacidad frente a Google:** ¿cifrado Minimal con gestión de claves, o solo control de acceso de Drive?
2. **Cajeros:** ¿tienen cuenta Google propia (autoridad aplicable por Drive) o usan el dispositivo del dueño (autoridad solo dentro de la app)?
3. **Partición de ámbitos de stock** (por dueño o por bodega) según L20. Transferencias entre bodegas: ¿ámbito común o protocolo en dos pasos con estado «en tránsito»?
4. **Ventas sin conexión:** si se permiten, cuotas delegadas por dispositivo (L19).
5. **Canónico de persistencia:** (A) trayectoria canónica con estado derivado y snapshots [preferida para el inventario], o (B) estado canónico con evidencia. Lo que no se permite es que ambos evolucionen por separado.
6. **Una trayectoria o dos** para solicitudes y decisiones. Candidata actual: una trayectoria canónica de la matriz más una bandeja local de solicitudes en cada tienda.

## Google Drive como almacenamiento (estado de cada supuesto)
| Supuesto | Estado |
|---|---|
| Crear con ID pre‑generado (`generateIds`) ⇒ los reintentos reciben 409 | documentado |
| Usar ese 409 como reclamo exclusivo (cada compromiso `n` guarda el fileId reservado para `n+1`) | **inferencia: verificar** |
| v3 sin ETag/If‑Match por archivo | reportado por desarrolladores ⇒ **no usar archivos «cabeza» mutables** |
| `name contains` hace coincidencia por prefijo de término | documentado; con hex largo: **verificar** (alternativa: `appProperties`, ≤124 B clave+valor, ≤30 privadas por app) |
| `drive.file` no es sensible + Google Picker; `drive` completo es restringido | documentado |
| Acceso de un revendedor a una carpeta compartida vía Picker | **verificar** |
| Irradiación por sondeo con `changes.getStartPageToken` / `changes.list` (push necesita endpoint HTTPS propio) | documentado |
| Nombres duplicados: inocuos para versiones Minimal (huella en el nombre), peligrosos para punteros mutables | documentado |
| La autoridad material de escritura hoy la da el ACL de Drive (no hay firmas) | hecho |

## Próxima probeta propuesta: «Probeta 0 · Drive»
Con dos navegadores y dos cuentas: (1) 409 al crear el mismo ID reservado desde dos dispositivos; (2) `name contains` con hex de 70 caracteres; (3) acceso de `drive.file` vía Picker a una carpeta buzón compartida; (4) latencia de `changes.list` tras crear; (5) visibilidad en `files.list` justo después de crear.
