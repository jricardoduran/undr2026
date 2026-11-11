# Configuración y supuestos empíricos por verificar

Según L31, las antiguas «decisiones del usuario» son **parámetros del contrato** con un valor inicial (ver `kobalt/CONSOLIDACION_Y_PLAN.md`, Parte III §13). No bloquean el desarrollo: el código cubre todas las posibilidades y la configuración elige.

| Parámetro (antes «decisión») | Posibilidades | Valor inicial |
|---|---|---|
| Privacidad frente al almacenamiento | Material en claro bajo ACL / sellado con Minimal (AES‑GCM, +28 B) | En claro bajo ACL |
| Identidad de los cajeros | Cuenta propia (autoridad aplicable por el almacenamiento) / dispositivo del dueño (autoridad solo en la app) | Dispositivo del dueño |
| Partición de existencias | Cualquier conjunto de ámbitos `{W_i}` (L20); traslado en dos pasos o ámbito común | `{W_1}` |
| Ventas sin conexión | Sin cuotas / cuotas delegadas `Σ Q_d ≤ H − A` (L19) | Sin cuotas |
| Solicitudes y decisiones | Una trayectoria / bandeja local + trayectoria de la matriz | Una trayectoria |

Lo único que **sí** detiene el trabajo son los supuestos empíricos sin verificar (abajo) y cualquier contradicción con una ley.

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
