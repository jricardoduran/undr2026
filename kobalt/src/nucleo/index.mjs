// Kobalt · NÚCLEO GENERAL (fase 1) — punto de entrada.
// Specs: kobalt/specs/2026-11-11_fase1-nucleo.md (incluido su Anexo) y su enmienda E1–E8
// kobalt/specs/2026-11-11_fase1-enmienda-preguntas.md (con sus Anexos A y B).
// API: encabezado de kobalt/tests/leyes/nucleo.impl.test.mjs.
//
// El núcleo responde preguntas sobre trayectorias, contratos y diferencias; nunca sobre un dominio concreto. Las
// reglas (D_0, tipos, G_r, T_r, Σ_r, migraciones, estables, codD) las aporta cada instancia como DATOS.
//
// ═══════════════ Correspondencia objeto matemático ↔ símbolo de código ═══════════════
//   CV (codificación canónica, Teorema 4.1)        ↔ cv / decCV                               cv.mjs
//   SHA‑256                                        ↔ sha256 (frontera criptográfica)          sha256.mjs
//   Frame · 𝔇 · T_G, T_P, T_S, T_N                 ↔ frame · derivar · ETIQUETAS              derivacion.mjs
//   CV(g) · h_0 · Enc(e) · h_i · DeriveSid          ↔ encGenesis/decGenesis · hashGenesis · encEntrada/decEntrada · hashPaso · deriveSid
//   S = (n, ε, C_ε, sellado, Sids, D)              ↔ {n, epoca, parametros, sellado, sids, D}  contrato.mjs
//   S_0 · Accept (G0, G5, G1, G2, G3, G4, §5.2) · T · Fold ↔ estadoInicial · admitir · transformar · fold
//   tipos patrón (E3) · tiposInternos en G1 (E4) · P_sid sobre Γ (E2) ↔ validadorDe · autorizado · lect.estable
//   snapshot · S_k = Fold o snapshot validado (E5) ↔ crearSnapshot/restaurarSnapshot · estadoPorSnapshot   snapshot.mjs
//   Γ (valor) · Crear · AppendIfHead (decisión) · Incorporar (decisión) · Verificar · Resolver
//                                                  ↔ Trayectoria · nacer · decidirAnexo · decidirIncorporacion · verificar · resolver   secuencia.mjs
//   ¿re‑admitir? = nodo.verificarAlIncorporar (E6) ↔ readmitirDe(ctx)
//   materialidad §5.5 (M1 compare‑and‑append, M4)  ↔ crearAlmacenMemoria                      materialidad.mjs (adaptador)
//   Crear / AppendIfHead / Incorporar sobre la materialidad, réplica
//                                                  ↔ crear · appendIfHead · incorporar · leerCopia · leerTrayectoria · estado · apiReplica   constituyente.mjs
//   Π clásica (π, g) y Π monoidal (f, M, obs, leeEstado) con ventana (i, j] (E1) · aportes · resolución · corte cerrado
//   (NO_CONMUTATIVO) · Compose (STREAM_DUPLICADO, E8)
//                                                  ↔ PROYECCIONES · aportes · resolverProyeccion · esCerrado/cerrarCorte/proyectarCorte · componer   proyeccion.mjs
//   Δ(O, A), Conflictos, Exceso; ι = ι' ⟺ CV(ι) = CV(ι') (E7) ↔ diferencia               diferencia.mjs
//   regla nucleo.nodo@1 (configuración del nodo)   ↔ REGLA_NODO                               nodo.mjs
//
// Núcleo puro (sin I/O, sin reloj, sin azar): bytes, sha256, cv, derivacion, contrato, snapshot, secuencia, proyeccion,
// diferencia, nodo. Materialidad: materialidad (adaptador en memoria). Orquestación (lee, decide con el núcleo puro
// y escribe solo con compare‑and‑append): constituyente.
//
// Leyes cubiertas: L3, L4, L6, L7, L8, L9, L10, L13, L15, L16, L20, L21, L22, L23, L25, L26, L27, L30, L31 (detalle en
// cada módulo). Límites [L]: spec §9 (sin consenso ni exclusión entre dispositivos, sin durabilidad, `u` es una
// afirmación, CR de SHA‑256, inmutabilidad del registro de reglas no imponible por el núcleo).

export { cv, decCV } from './cv.mjs';
export {
  derivar, ETIQUETAS, encGenesis, decGenesis, hashGenesis, encEntrada, decEntrada, hashPaso, deriveSid,
} from './derivacion.mjs';
export { estadoInicial, admitir, transformar, fold, claseDe } from './contrato.mjs';
export { verificar, resolver } from './secuencia.mjs';
export { crearAlmacenMemoria } from './materialidad.mjs';
export { crear, appendIfHead, incorporar, leerCopia, leerTrayectoria, estado, apiReplica } from './constituyente.mjs';
export {
  PROYECCIONES, aportes, resolverProyeccion, esCerrado, cerrarCorte, proyectarCorte, componer,
} from './proyeccion.mjs';
export { crearSnapshot, restaurarSnapshot } from './snapshot.mjs';
export { diferencia } from './diferencia.mjs';
export { REGLA_NODO } from './nodo.mjs';
