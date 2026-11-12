// Kobalt — MUTANTES del modelo de dominio (fase 3). No es un archivo de pruebas: es un ejecutor manual.
//   node kobalt/tests/mutantes/dominio.mutantes.mjs [nombre…]
// Copia kobalt/tests/modelos/dominio.modelo.mjs a un directorio TEMPORAL, inyecta un error tradicional típico, y ejecuta
// kobalt/tests/leyes/dominio.leyes.test.mjs con KOBALT_DOMINIO_MODELO apuntando a la copia. Un mutante está DETECTADO si
// alguna prueba falla; se listan las leyes que lo detectan. El original nunca se modifica.
// En la fase 2 del verificador, los mismos errores se inyectan en una COPIA de kobalt/src/dominio/ y se ejecuta
// dominio.impl.test.mjs con KOBALT_DOMINIO_IMPL apuntando a la copia (los patrones dependen del código implementado).
// Proporcionalidad (CLAUDE.md): mutantes solo para las leyes críticas — conservación, doble descuento, autoridad,
// contadores / transiciones fuera de la Red — más las dos que pide la spec (guarda ≠ invariante, complemento con máscara).

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const MODELO = fileURLToPath(new URL('../modelos/dominio.modelo.mjs', import.meta.url));
const NUCLEO = pathToFileURL(fileURLToPath(new URL('../../src/nucleo/index.mjs', import.meta.url))).href;
const LEYES = fileURLToPath(new URL('../leyes/dominio.leyes.test.mjs', import.meta.url));

export const MUTANTES = [
  { nombre: 'dobleDescuento (Asignar no saca la demanda de P)', ley: 'L12', de: "mov([pend, aS], ['asig', aS], aQ)", a: "mov(['ext.D'], ['asig', aS], aQ)" },
  { nombre: 'descontarAlVender (Vender baja libre al registrar)', ley: 'L12 / VF6', de: "mov(['ext.D'], [pend, aS], aQ),", a: "mov(['ext.D'], [pend, aS], aQ), mov(['libre', wS, vS], ['ext.L'], aQ)," },
  { nombre: 'guardaComoInvariante (Contar restringido)', ley: 'L7', de: "restricción: 'ninguna', nulo: 'admitir'", a: "restricción: 'todas', nulo: 'admitir'" },
  { nombre: 'contarComoReinicio (H := h sin contrapartida)', ley: 'VF5 / VF6 / L35', de: "  for (const l of orden.values()) { const w = W.get(l.clave); if (w !== 0) δ[`m|${l.clave}`] = { '+': w }; }\n  return { δ };",
    a: "  for (const l of orden.values()) { const w = W.get(l.clave); if (w !== 0) δ[`m|${l.clave}`] = { '+': w }; }\n  if (t === 'Contar') { for (const k of Object.keys(δ)) delete δ[k]; δ[`m|${claveLugar('H', [as.w, as.v])}`] = { '=': as.h }; }\n  return { δ };" },
  { nombre: 'contadoresPorTipo (ID = contador del tipo)', ley: 'VF1 / L26 / L28', de: 'const id = [cx.i, cx.nacidos.length], k = kid(id);', a: 'const id = [1 + Object.values(Dc.ent).filter(x => x.tipo === τ).length + cx.nacidos.length, 0], k = kid(id);' },
  { nombre: 'transiciónFueraDeLaRed (semántica tomada de una constante)', ley: 'L35', de: 'const T = cx.𝒩.transiciones[t];', a: 'const T = RED_INICIAL.transiciones[t] ?? cx.𝒩.transiciones[t];' },
  { nombre: 'sinConservación (Ingresar crea holgura desde la especie U)', ley: 'VF5 / L35', de: "mov(['ext.L'], ['libre', aW, aV], aQ)] }),\n    Contar", a: "mov(['ext.U'], ['libre', aW, aV], aQ)] }),\n    Contar" },
  { nombre: 'libreSinRestringirEnAsignar (mutante de la spec §8 L35)', ley: 'L35 / L7', de: "const asignarDe = pend => trans({ args: ARGS_SQ,", a: "const asignarDe = pend => trans({ restricción: [pend], args: ARGS_SQ," },
  { nombre: 'loteSinTiposInternos (E4)', ley: 'L16', de: "export const tiposInternos = e => (e.tipo === 'Lote' ? e.args.acciones.map(a => a.tipo) : []);", a: 'export const tiposInternos = e => [];' },
  { nombre: 'sinAlcancePropio', ley: 'L16', de: "const alcanza = (par, u, tipo) => {", a: "const alcanza = (par, u, tipo) => { return false; " },
  { nombre: 'complementoSinMáscara', ley: 'L2', de: 'export const complemento = (F, U = F.conocidos) =>', a: 'export const complemento = (F, U = F.activos) =>' },
];

function ejecutar(ruta, extraEnv = {}) {
  const r = spawnSync(process.execPath, ['--test', LEYES], { env: { ...process.env, KOBALT_DOMINIO_MODELO: ruta, ...extraEnv }, encoding: 'utf8', maxBuffer: 1 << 28 });
  const fallos = [...r.stdout.matchAll(/^not ok \d+ - (.*)$/gm)].map(m => m[1]);
  const sub = [...r.stdout.matchAll(/^ {4}not ok \d+ - (.*)$/gm)].map(m => m[1]);
  return { fallos, sub, codigo: r.status };
}

const pedidos = process.argv.slice(2);
const base = readFileSync(MODELO, 'utf8').replace("from '../../src/nucleo/index.mjs'", `from '${NUCLEO}'`);
const dir = mkdtempSync(join(tmpdir(), 'kobalt-mut-dominio-'));
try {
  const original = join(dir, 'original.mjs');
  writeFileSync(original, base);
  const o = ejecutar(original);
  console.log(`modelo original (copia): ${o.fallos.length} pruebas fallan${o.fallos.length ? ': ' + o.fallos.join(' | ') : ''}`);
  let vivos = 0;
  for (const m of MUTANTES.filter(x => !pedidos.length || pedidos.some(p => x.nombre.startsWith(p)))) {
    const veces = base.split(m.de).length - 1;
    if (veces !== 1) { console.log(`✗ ${m.nombre}: el patrón aparece ${veces} veces (actualizar el mutante)`); vivos++; continue; }
    const ruta = join(dir, `mut-${MUTANTES.indexOf(m)}.mjs`);
    writeFileSync(ruta, base.replace(m.de, m.a));
    const r = ejecutar(ruta);
    if (r.fallos.some(f => f.endsWith('.test.mjs'))) { console.log(`✗ ${m.nombre}: el mutante no carga (error de sintaxis): INVÁLIDO`); vivos++; continue; }
    const det = r.fallos.length > 0;
    if (!det) vivos++;
    console.log(`${det ? 'DETECTADO' : 'VIVO     '} ${m.nombre} [${m.ley}] — ${r.fallos.length} pruebas fallan`);
    for (const f of r.fallos.slice(0, 6)) console.log(`      · ${f.slice(0, 150)}`);
    for (const f of r.sub.slice(0, 3)) console.log(`      ↳ ${f.slice(0, 150)}`);
  }
  console.log(vivos ? `${vivos} mutante(s) vivo(s)` : 'todos los mutantes detectados');
  process.exitCode = vivos ? 1 : 0;
} finally { rmSync(dir, { recursive: true, force: true }); }
