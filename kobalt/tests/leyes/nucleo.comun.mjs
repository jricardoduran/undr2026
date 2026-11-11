// Kobalt — utilidades comunes de las pruebas del núcleo (no es un archivo de pruebas).
// Generador con semilla (KOBALT_SEED), escenarios de trayectorias y ejecutores contra
// el modelo puro o contra cualquier API sobre materialidad (modelo o implementación).

export const SEMILLA = Number(process.env.KOBALT_SEED ?? 20261111);
export const CASOS = Number(process.env.KOBALT_CASOS ?? 150);

export function prng(seed) { // mulberry32
  return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const elegir = (r, xs) => xs[Math.floor(r() * xs.length)];
export const entero = (r, a, b) => a + Math.floor(r() * (b - a + 1));

export const STREAM_X = '0a'.repeat(16);
export const STREAM_Y = '0b'.repeat(16);
export const STREAM_Z = '0c'.repeat(16);
export const sidDe = i => (i + 1).toString(16).padStart(4, '0');
export const HASH_FALSO = 'ff'.repeat(32);

export const CAPS_X = { 'dueño': ['*'], cajero: ['sumar'], config: ['FijarParámetro:límite', 'FijarParámetro:defecto', 'FijarParámetro:factor'] };
export const genesisX = (C0extra = {}) => ({ streamId: STREAM_X, predecesor: null,
  C0: { 'nucleo.regla': 'contador@1', 'nucleo.constituyente': 'dueño', 'nucleo.capacidades': CAPS_X, ...C0extra } });
export const genesisY = () => ({ streamId: STREAM_Y, predecesor: null,
  C0: { 'nucleo.regla': 'contador@1', 'nucleo.constituyente': 'dueño', 'límite': 'ninguno' } });

const CLAVES = ['a', 'b', 'c', 'd'];
const MS = [
  { 'límite': 'ninguno' }, { 'límite': 'ninguno' }, { 'límite': '≥0' }, { defecto: 0 }, { defecto: 1 }, { defecto: -1 },
  { defecto: 'desconocido' }, { 'nucleo.regla': 'contador@2' }, { 'nucleo.regla': 'contador@2' }, { 'nucleo.regla': 'conjunto@1' },
  { factor: 3 }, { 'límite': 'ninguno', defecto: 2 },
  { 'nucleo.capacidades': { 'dueño': ['*'], config: CAPS_X.config } },
  { 'nucleo.capacidades': CAPS_X },
  { 'nucleo.capacidades': { cajero: ['sumar'] } },
  { 'nucleo.constituyente': 'otro' }, { 'nucleo.constituyente': 'dueño' }, { 'nucleo.constituyente': 'dueño' },
  { inventado: 1 }, { 'nucleo.derivación': 'otra' },
  { 'límite': 'ninguno', 'nucleo.capacidades': { ...CAPS_X, config: ['*'] } }, // escalada: exige capacidad para CADA parámetro
];

function proponerDominio(r, hashesY) {
  const tipo = elegir(r, ['sumar', 'sumar', 'sumar', 'sumar', 'fijar', 'fijar', 'fijar', 'duplicar', 'duplicar', 'añadir']);
  const clave = elegir(r, CLAVES);
  let args = tipo === 'sumar' ? { clave, q: entero(r, -3, 4) } : tipo === 'fijar' ? { clave, v: entero(r, -2, 5) }
    : tipo === 'duplicar' ? { clave } : { x: clave };
  let deps = [];
  const x = r();
  if (hashesY && (x < 0.2) && (tipo === 'sumar' || tipo === 'fijar' || x < 0.05)) {
    const nY = hashesY.length - 1;
    const y = r();
    const k = y < 0.05 ? nY + entero(r, 1, 3) : entero(r, 0, nY);
    const h = y < 0.05 ? HASH_FALSO : y < 0.15 ? elegir(r, [HASH_FALSO, hashesY[(k + 1) % hashesY.length]]) : hashesY[k];
    deps = [{ stream: STREAM_Y, k, h }];
    if (x < 0.15 && (tipo === 'sumar' || tipo === 'fijar')) args = { ...args, requiere: { stream: STREAM_Y, clave: elegir(r, CLAVES) } };
  }
  return { tipo, args, deps };
}

/** Propuesta (puede ser inadmisible, no autorizada, duplicada, de época vieja o sobre cabeza vieja: a propósito). */
function proponer(r, hashesY) {
  const x = r();
  let sol;
  if (x < 0.003) sol = { u: 'dueño', tipo: 'Sellar', args: null };
  else if (x < 0.16) sol = { u: elegir(r, ['dueño', 'dueño', 'config', 'config', 'intruso', 'cajero']), tipo: 'FijarParámetro', args: structuredClone(elegir(r, MS)) };
  else { const d = proponerDominio(r, hashesY); sol = { u: elegir(r, ['dueño', 'dueño', 'dueño', 'dueño', 'dueño', 'dueño', 'dueño', 'cajero', 'cajero', 'config', 'intruso']), ...d }; }
  sol.sid = sidDe(entero(r, 0, 23));
  if (sol.deps === undefined) sol.deps = [];
  if (r() < 0.1) sol.epocaEsperada = entero(r, 0, 3);
  const c = r();
  const cabeza = c < 0.85 ? { modo: 'actual' } : c < 0.95 ? { modo: 'atras', j: entero(r, 1, 3) } : { modo: 'falsa' };
  const mecanismo = r() < 0.94 ? 'dueño' : 'otro';
  return { mecanismo, sol, cabeza };
}

/** Escenario: Y (dependencia) y X (principal). Las propuestas de X citan hashes reales de Y. */
export function generarEscenario(M, seed, largo) {
  const r = prng(seed);
  const R = M.REGISTRO_JUGUETE;
  const propY = [];
  let ΓY = M.trayectoriaNueva(genesisY(), R).Γ;
  const nY = entero(r, 2, 10);
  for (let i = 0; i < nY; i++) {
    const p = { mecanismo: 'dueño', cabeza: { modo: 'actual' }, sol: { u: 'dueño', sid: sidDe(100 + i), deps: [], ...(r() < 0.5 ? { tipo: 'sumar', args: { clave: elegir(r, CLAVES), q: entero(r, -2, 3) } } : { tipo: 'fijar', args: { clave: elegir(r, CLAVES), v: entero(r, -2, 3) } }) } };
    propY.push(p);
    const res = M.comprometer(ΓY, M.cabezaDe(ΓY), 'dueño', p.sol, { registro: R, conocidas: {} });
    if (res.Γ) ΓY = res.Γ;
  }
  const L = largo ?? entero(prng(seed ^ 0x9e37), 0, 70);
  const propX = [];
  for (let i = 0; i < L; i++) propX.push(proponer(r, ΓY.hashes));
  return { gY: genesisY(), propY, gX: genesisX(), propX };
}

export const cabezaPara = (modo, hashes) => {
  const n = hashes.length - 1;
  if (modo.modo === 'actual') return { n, h: hashes[n] };
  if (modo.modo === 'atras') { const k = Math.max(0, n - modo.j); return { n: k, h: hashes[k] }; }
  return { n, h: HASH_FALSO };
};
const sinΓ = r => { const { Γ, ...x } = r; return x; };

/** Ejecuta el escenario con el modelo PURO (valores Γ). */
export function ejecutarPuro(M, esc, opciones = {}) {
  const R = opciones.registro ?? M.REGISTRO_JUGUETE;
  let ΓY = M.trayectoriaNueva(esc.gY, R).Γ;
  const logY = [], logX = [];
  for (const p of esc.propY) {
    const res = M.comprometer(ΓY, cabezaPara(p.cabeza, ΓY.hashes), p.mecanismo, p.sol, { registro: R, conocidas: {} });
    if (res.Γ) ΓY = res.Γ; logY.push(sinΓ(res));
  }
  let ΓX = M.trayectoriaNueva(esc.gX, R).Γ;
  for (const p of esc.propX) {
    const res = M.comprometer(ΓX, cabezaPara(p.cabeza, ΓX.hashes), p.mecanismo, p.sol, { registro: R, conocidas: { [STREAM_Y]: ΓY } });
    if (res.Γ) ΓX = res.Γ; logX.push(sinΓ(res));
  }
  return { ΓY, ΓX, logY, logX };
}

/** Ejecuta el escenario con una API sobre materialidad (modelo o implementación). Todo con await. */
export async function ejecutarAlmacen(api, esc, opciones = {}) {
  const R = opciones.registro;
  const almacen = opciones.almacen ?? await api.crearAlmacenMemoria();
  const logY = [], logX = [];
  const c1 = await api.crear(almacen, esc.gY, R); if (c1.resultado !== 'CREADO') throw new Error(`crear Y: ${JSON.stringify(c1)}`);
  for (const p of esc.propY) {
    const Γ = await api.leerTrayectoria(almacen, STREAM_Y, R);
    logY.push(await api.appendIfHead(almacen, STREAM_Y, cabezaPara(p.cabeza, Γ.hashes), p.mecanismo, p.sol, { registro: R }));
  }
  const c2 = await api.crear(almacen, esc.gX, R); if (c2.resultado !== 'CREADO') throw new Error(`crear X: ${JSON.stringify(c2)}`);
  for (const p of esc.propX) {
    const Γ = await api.leerTrayectoria(almacen, STREAM_X, R);
    logX.push(await api.appendIfHead(almacen, STREAM_X, cabezaPara(p.cabeza, Γ.hashes), p.mecanismo, p.sol, { registro: R }));
  }
  return { almacen, logY, logX };
}

// ─────────── Valores CV aleatorios y clave estructural (para inyectividad) ───────────
const TEXTOS = ['', 'a', 'ab', 'b', 'ñ', '€', '𝔇', 'clave', 'x y', '\u0000', 'Ω', 'aa', 'é'];
export function valorCV(r, prof = 0) {
  const t = entero(r, 0, prof > 2 ? 6 : 9);
  switch (t) {
    case 0: return null;
    case 1: return r() < 0.5;
    case 2: return entero(r, 0, 300);
    case 3: return -entero(r, 1, 300);
    case 4: return elegir(r, [0, 127, 128, 16383, 16384, 2 ** 31, 2 ** 53 - 1, -(2 ** 53 - 1), -128]);
    case 5: return Uint8Array.from({ length: entero(r, 0, 4) }, () => entero(r, 0, 255));
    case 6: return elegir(r, TEXTOS) + (r() < 0.3 ? elegir(r, TEXTOS) : '');
    case 7: return Array.from({ length: entero(r, 0, 3) }, () => valorCV(r, prof + 1));
    default: { const m = {}; for (let i = entero(r, 0, 3); i > 0; i--) m[elegir(r, TEXTOS)] = valorCV(r, prof + 1); return m; }
  }
}
export function claveEstructural(v) {
  if (v === null) return 'N';
  if (typeof v === 'boolean') return v ? 'T' : 'F';
  if (typeof v === 'number') return `I${String(v)}`;
  if (v instanceof Uint8Array) return `B${Buffer.from(v).toString('hex')}`;
  if (typeof v === 'string') return `S${JSON.stringify(v)}`;
  if (Array.isArray(v)) return `L[${v.map(claveEstructural).join(',')}]`;
  return `M{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${claveEstructural(v[k])}`).join(',')}}`;
}
export const hex = b => Buffer.from(b).toString('hex');
export const deHex = h => Uint8Array.from(Buffer.from(h, 'hex'));

// Vectores completos de génesis y entrada que el verificador publica en la fase 1 (spec §4.2).
export const VECTORES = Object.freeze({
  genesis: { g: { streamId: '01'.repeat(16), predecesor: null, C0: { 'nucleo.constituyente': 'u0', 'nucleo.regla': 'r@1' } },
    cv: '070305100101010101010101010101010101010100080206146e75636c656f2e636f6e737469747579656e746506027530060c6e75636c656f2e7265676c610603724031',
    h0: '7f850ba38d5905a33f77ef7ee87486574015ca4e5d32696661dbacbde7703b8f' },
  genesisConPredecesor: { h0: '73e07046034c52ad6ae010a8b98d900491d7a6d66959178d39381b682cb21540' },
  entrada: { e: { epoca: 0, u: 'u0', sid: '00ff', deps: [{ stream: '02'.repeat(16), k: 1, h: '03'.repeat(32) }], clase: 'dominio', tipo: 't', args: { k: -1, b: Uint8Array.of(1, 2) } },
    enc: '0707030006027530050200ff070107030510020202020202020202020202020202020301052003030303030303030303030303030303030303030303030303030303030303030607646f6d696e696f06017408020601620502010206016b0401',
    h1: '6714cbf1be378ca2c0bc6cc31f75e2433a6383fc7d6263649abd805363143cf4' },
  deriveSid: { dom: 'dom', v: [1, 'a'], sid: '4e82c204abd690eb45ee71dd0b9af278c8d3ea919aaa07f42c5384e82b8a3e26' },
});

/** Escenario con la SEGUNDA regla (conjunto@1) en X: prueba que el núcleo es paramétrico en la regla (Teorema 7.11). */
export function generarEscenarioConjunto(M, seed) {
  const r = prng(seed);
  const gX = { streamId: STREAM_X, predecesor: null, C0: { 'nucleo.regla': 'conjunto@1', 'nucleo.constituyente': 'dueño', 'nucleo.capacidades': { 'dueño': ['*'], cajero: ['añadir'] } } };
  const propX = [];
  for (let i = entero(r, 0, 50); i > 0; i--) {
    const x = r();
    const sol = x < 0.12 ? { u: elegir(r, ['dueño', 'cajero']), tipo: 'FijarParámetro', args: { 'máximo': elegir(r, ['ilimitado', 0, 2, 3]) } }
      : { u: elegir(r, ['dueño', 'dueño', 'cajero', 'intruso']), tipo: elegir(r, ['añadir', 'añadir', 'quitar', 'sumar']), args: { x: elegir(r, CLAVES) } };
    sol.sid = sidDe(entero(r, 0, 30)); sol.deps = [];
    propX.push({ mecanismo: 'dueño', sol, cabeza: r() < 0.9 ? { modo: 'actual' } : { modo: 'atras', j: 1 } });
  }
  return { gY: genesisY(), propY: [], gX, propX };
}
