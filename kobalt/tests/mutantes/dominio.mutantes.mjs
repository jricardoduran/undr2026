// Kobalt — MUTANTES del modelo de dominio (fase 3, con el Anexo C). No es un archivo de pruebas: es un ejecutor manual.
//   node kobalt/tests/mutantes/dominio.mutantes.mjs [prefijo-de-nombre…]
// Copia kobalt/tests/modelos/dominio.modelo.mjs a un directorio TEMPORAL, inyecta un error tradicional típico y ejecuta
// kobalt/tests/leyes/dominio.leyes.test.mjs con KOBALT_DOMINIO_MODELO apuntando a la copia. Un mutante está DETECTADO si
// alguna prueba falla; se listan las que lo detectan. El original nunca se modifica. Un mutante que no carga se marca
// INVÁLIDO (no cuenta como detectado).
// En la fase 2 del verificador, los mismos errores se inyectan en una COPIA de kobalt/src/dominio/ y se ejecuta
// dominio.impl.test.mjs con KOBALT_DOMINIO_IMPL apuntando a la copia (los patrones dependen del código implementado).
// Proporcionalidad (CLAUDE.md): mutantes solo para las leyes críticas — conservación, doble descuento, guarda universal,
// autoridad, contadores / transiciones fuera de la Red — más lo nuevo del Anexo C (efecto que lanza, actividad incrustada,
// segundo evaluador, desbordamiento silencioso, índices en G^par, búsqueda sin hasOwn).

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const URL_DE = r => pathToFileURL(fileURLToPath(new URL(r, import.meta.url))).href;
const MODELO = fileURLToPath(new URL('../modelos/dominio.modelo.mjs', import.meta.url));
const LEYES = fileURLToPath(new URL('../leyes/dominio.leyes.test.mjs', import.meta.url));
const NUCLEO = URL_DE('../../src/nucleo/index.mjs');
const PREGUNTAS = URL_DE('../../src/preguntas/index.mjs');

const SUMA_W = "  for (const l of orden.values()) { const w = W.get(l.clave); if (w !== 0) δ[`m|${l.clave}`] = { '+': w }; }\n  return δ;";
const REINICIO = "  for (const l of orden.values()) { const w = W.get(l.clave); if (w !== 0) δ[`m|${l.clave}`] = { '+': w }; }\n"
  + "  if (t === 'Contar') { for (const k of Object.keys(δ)) delete δ[k]; δ[`m|${claveLugar('H', [as.w, as.v])}`] = { '=': as.h }; }\n  return δ;";
const T_QUE_LANZA = "    T: (D, e, par) => { const g = guardaCon(typeof opciones.guardaAdicional === 'function' ? opciones.guardaAdicional : null)(D, e, par); "
  + "if (g !== 'ok') throw new Error(g); return T(D, e, par); }, sigma: SIGMA, guardaPar, codD: D => D,";
const SEGUNDO_EVALUADOR = "const evaluar = (x, a) => { if (x?.op === '−' && x.de?.length === 1) return null; if (x?.op === '+') { let s = 0; "
  + "for (const d of x.de) { const y = evaluar(d, a); if (!Number.isSafeInteger(y)) return null; s += y; if (!Number.isSafeInteger(s)) return null; } return s; } return P.evaluar(x, a); };";

export const MUTANTES = [
  // ── leyes críticas ──
  { nombre: 'dobleDescuento (Asignar no saca la demanda de P)', ley: 'L12', de: "mov([pend, aS], ['asig', aS], aQ)", a: "mov(['ext.D'], ['asig', aS], aQ)" },
  { nombre: 'descontarAlVender (Vender baja libre al registrar)', ley: 'L12 / VF6', de: "mov(['ext.D'], [pend, aS], aQ),", a: "mov(['ext.D'], [pend, aS], aQ), mov(['libre', wS, vS], ['ext.L'], aQ)," },
  { nombre: 'guardaComoInvariante (Contar restringido)', ley: 'L7', de: "restricción: 'ninguna', nulo: 'admitir'", a: "restricción: 'todas', nulo: 'admitir'" },
  { nombre: 'contarComoReinicio (H := h sin contrapartida)', ley: 'VF5 / VF6 / L35', de: SUMA_W, a: REINICIO },
  { nombre: 'contadoresPorTipo (ID = contador del tipo)', ley: 'VF1 / L26 / L28', todas: true, de: 'const id = [cx.i, cx.nacidos.length];',
    a: 'const id = [1 + Object.values(Dc.ent).filter(x => x.tipo === a.tipo.slice(6)).length + cx.nacidos.length, 0];' },
  { nombre: 'transiciónFueraDeLaRed (semántica tomada de una constante)', ley: 'L35', todas: true, de: 'const T = propio(cx.𝒩.transiciones, t);', a: 'const T = propio(RED_INICIAL.transiciones, t) ?? propio(cx.𝒩.transiciones, t);' },
  { nombre: 'sinConservación (Ingresar crea holgura desde la especie U)', ley: 'VF5 / L35', de: "mov(['ext.L'], ['libre', aW, aV], aQ)] }),\n    Contar", a: "mov(['ext.U'], ['libre', aW, aV], aQ)] }),\n    Contar" },
  { nombre: 'libreSinRestringirEnAsignar (mutante de la spec §8 L35)', ley: 'L35 / L7', de: 'const asignarDe = pend => trans({ args: ARGS_SQ,', a: 'const asignarDe = pend => trans({ restricción: [pend], args: ARGS_SQ,' },
  { nombre: 'loteSinTiposInternos (E4)', ley: 'L16', de: "export const tiposInternos = e => (e.tipo === 'Lote' ? e.args.acciones.map(a => a.tipo) : []);", a: 'export const tiposInternos = e => [];' },
  { nombre: 'sinAlcancePropio', ley: 'L16', de: 'const alcanza = (par, u, tipo) => {', a: 'const alcanza = (par, u, tipo) => { return false; ' },
  { nombre: 'complementoSinMáscara', ley: 'L2', de: 'export const complemento = (F, U = F.conocidos) =>', a: 'export const complemento = (F, U = F.activos) =>' },
  // ── Anexo C (lo nuevo) ──
  { nombre: 'efectoQueLanza (T pasa por la guarda)', ley: 'C.1 / L7 / Teorema 2', de: '    T, sigma: SIGMA, guardaPar, codD: D => D,', a: T_QUE_LANZA },
  { nombre: 'actividadIncrustada (estado = activo como convención de código)', ley: 'C.2 / VF10', de: 'export function activaAcc(acc, Φ, k) {',
    a: "export function activaAcc(acc, Φ, k) { { const v0 = efectiva(acc, Φ, k, 'estado'); return v0 === undefined ? true : v0 === 'activo'; }" },
  { nombre: 'segundoEvaluador (sin −x unario ni exactitud)', ley: 'C.4 / L32', de: 'const evaluar = (x, a) => P.evaluar(x, a);', a: SEGUNDO_EVALUADOR },
  { nombre: 'desbordamientoSilencioso (depósitos con + de JS)', ley: 'C.6', de: "sumaExacta(actual ?? 0, el['+']); return v === 0", a: "(actual ?? 0) + el['+']; return v === 0" },
  { nombre: 'G^parSinÍndices (reordenar índices con marcado)', ley: 'C.7', de: "if (!igual(F2.índices, F?.índices)) return 'redCambiaÍndices';", a: '' },
  { nombre: 'búsquedaSinHasOwn (tipos por propiedad heredada)', ley: 'C.8', de: 'export const tipoDe = (Φ, τ) => { const t = propio(Φ?.tipos, τ);', a: 'export const tipoDe = (Φ, τ) => { const t = Φ?.tipos?.[τ];' },
];

function ejecutar(ruta) {
  const r = spawnSync(process.execPath, ['--test', LEYES], { env: { ...process.env, KOBALT_DOMINIO_MODELO: ruta }, encoding: 'utf8', maxBuffer: 1 << 28 });
  const fallos = [...r.stdout.matchAll(/^not ok \d+ - (.*)$/gm)].map(m => m[1]);
  const sub = [...r.stdout.matchAll(/^ {4}not ok \d+ - (.*)$/gm)].map(m => m[1]);
  return { fallos, sub, codigo: r.status };
}

const pedidos = process.argv.slice(2);
const base = readFileSync(MODELO, 'utf8').replace("from '../../src/nucleo/index.mjs'", `from '${NUCLEO}'`).replace("from '../../src/preguntas/index.mjs'", `from '${PREGUNTAS}'`);
const dir = mkdtempSync(join(tmpdir(), 'kobalt-mut-dominio-'));
try {
  const original = join(dir, 'original.mjs');
  writeFileSync(original, base);
  const o = ejecutar(original);
  console.log(`modelo original (copia): ${o.fallos.length} pruebas fallan${o.fallos.length ? ': ' + o.fallos.join(' | ') : ''}`);
  let vivos = 0;
  for (const m of MUTANTES.filter(x => !pedidos.length || pedidos.some(p => x.nombre.startsWith(p)))) {
    const veces = base.split(m.de).length - 1;
    if (veces < 1 || (veces !== 1 && !m.todas)) { console.log(`✗ ${m.nombre}: el patrón aparece ${veces} veces (actualizar el mutante)`); vivos++; continue; }
    const ruta = join(dir, `mut-${MUTANTES.indexOf(m)}.mjs`);
    writeFileSync(ruta, m.todas ? base.split(m.de).join(m.a) : base.replace(m.de, m.a));
    const r = ejecutar(ruta);
    if (r.fallos.some(f => f.endsWith('.test.mjs'))) { console.log(`✗ INVÁLIDO ${m.nombre}: el mutante no carga (error de sintaxis)`); vivos++; continue; }
    const det = r.fallos.length > 0;
    if (!det) vivos++;
    console.log(`${det ? 'DETECTADO' : 'VIVO     '} ${m.nombre} [${m.ley}] — ${r.fallos.length} pruebas fallan`);
    for (const f of r.fallos.slice(0, 5)) console.log(`      · ${f.slice(0, 150)}`);
    for (const f of r.sub.slice(0, 2)) console.log(`      ↳ ${f.slice(0, 150)}`);
  }
  console.log(vivos ? `${vivos} mutante(s) vivo(s) o inválido(s)` : 'todos los mutantes detectados');
  process.exitCode = vivos ? 1 : 0;
} finally { rmSync(dir, { recursive: true, force: true }); }
