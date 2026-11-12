// Kobalt — ORÁCULO DE ACEPTACIÓN de la fase 3 (no es un archivo de pruebas: lo registran dominio.leyes.test.mjs contra el
// modelo y dominio.impl.test.mjs contra la implementación).
// Spec: kobalt/specs/2026-11-11_fase3-forma-y-flujo.md, Anexo B (50 escenarios del núcleo v2 + flujos F0–F9) y Anexo
// «un solo verbo» (modalidades de venta de la v3 y lectura físico/libre/prudente sin evento).
// Los escenarios están redactados con palabras propias a partir de la tabla de la spec: no se copia código ni texto de los
// paquetes v2/v3 del usuario. Los cambios deliberados respecto de la v2 llevan su marca [C1]…[C8].
//
// `Dom` es el módulo de dominio (modelo o implementación) con la API del encabezado de dominio.impl.test.mjs.
// Las solicitudes se construyen con los ayudantes del modelo (plantillas, capacidades): son datos de la puerta.

import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import * as C from './dominio.comun.mjs';
import * as Ref from '../modelos/dominio.modelo.mjs';

const N = C.N;
const igual = isDeepStrictEqual;
const K = id => `${id[0]}.${id[1]}`;
const hex = b => Buffer.from(b).toString('hex');
const te = new TextEncoder();
const { S, proponer, nacer, fijar, añadir, quitar, disparar, lote, fijarParametro } = C;
const CONTENIDO = 'kobalt:prueba:contenido:1'; // [L] ContentId de la fase 5 todavía no existe: se usa 𝔇 del núcleo con una etiqueta de prueba

/**
 * Registra el oráculo. `obtener()` devuelve el módulo de dominio o lanza (assert.fail) si no existe.
 */
export function registrarAceptacion(test, obtener, etiqueta) {
  const dom = () => (typeof obtener === 'function' ? obtener() : obtener);
  const reg = Dom => ({ [Dom.ID_REGLA]: Dom.REGLA });
  const ok = (Γ, sol, msg = '') => C.comprometer(assert, Γ, sol, msg);
  const rechazo = (Γ, sol, esperado, msg = '') => {
    const n = Γ.entradas.length;
    const r = proponer(Γ, sol);
    assert.deepEqual({ resultado: r.resultado, ...(r.motivo !== undefined ? { motivo: r.motivo } : {}) }, esperado, msg);
    assert.equal(Γ.entradas.length, n, `${msg}: un rechazo no puede anexar nada`);
  };
  const lect = (Dom, Γ) => {
    const St = S(Γ), D = St.D, par = St.parametros;
    return {
      D, par,
      carac: (id, c) => Dom.carac(D, par, id, c),
      slot: id => Dom.slot(D, par, id),
      T: () => Dom.coordenadas(D, par),
      disp: (w, v) => Dom.disponibilidad(D, par, w, v),
      lugar: (f, idx) => Dom.valorLugar(D, f, idx),
      aud: () => Dom.auditoria(D, par),
      ent: () => Dom.entidades(D),
    };
  };
  const v2genesis = (Dom, C0extra = {}) => C.genesis(Dom, { 'dominio.liberaciones': [], ...C0extra });

  // ═════════════════════════ B.2 · los 50 escenarios del núcleo v2 (una sola historia, en orden) ═════════════════════════
  test(`Oráculo v2 [${etiqueta}] B.2 · 50 escenarios del núcleo v2 sobre Forma + Red (perfil v2: sin liberaciones)`, async t => {
    const Dom = dom();
    const R = reg(Dom);
    const Γ = C.cauce(R, v2genesis(Dom));
    const L = () => lect(Dom, Γ);
    const W = [1, 0], P1 = [2, 0], v1 = [2, 1], v2 = [3, 0], S1 = [7, 1], U1u = [12, 0], S2 = [14, 1], C1 = [15, 0], R1 = [17, 0], S3 = [20, 1];
    let nTras2 = 0;
    const paso = (nombre, f) => t.test(nombre, f);

    await paso('#1 estado comercial vacío: con solo la bodega, q_T = [] y el catálogo no tiene productos', () => {
      assert.equal(ok(Γ, nacer('dueño', 'bodega', { nombre: 'principal' })), 1);
      assert.deepEqual(C.consultar(Γ, Dom.PROYECCIONES.T), []);
      assert.equal(Object.values(C.consultar(Γ, Dom.PROYECCIONES.catalogo)).filter(s => s.tipo === 'producto').length, 0);
    });
    await paso('#2 alta de producto y variante en UN compromiso (lote); nombre(P1) = Camiseta; slot(v1) = 1', () => {
      const n = ok(Γ, lote('dueño',
        nacer('dueño', 'producto', { nombre: 'Camiseta', descripción: 'Camiseta básica', categoría: 'Ropa', costo: 12000, precio: 35000, descuento: 30000, público: true, 'comercio:marca': 'Kobalt' }),
        nacer('dueño', 'variante', { producto: { nacido: 0 }, sku: 'P1-V', color: 'Azul', talla: '4' })));
      assert.equal(n, 2, 'una sola entrada');
      nTras2 = n;
      assert.equal(L().carac(P1, 'nombre'), 'Camiseta');
      assert.equal(L().slot(v1), 1);
    });
    await paso('#3 [C1] |T| = 1 y el cliente no propone IDs ni slots: la identidad es (i, j) y el slot el rango', () => {
      assert.deepEqual(L().T(), [v1]);
      for (const e of Γ.entradas) assert.ok(!JSON.stringify(e.args).includes('"slot"'), 'ninguna solicitud lleva slot');
    });
    await paso('#4 precio rebajado y costo diferenciados (y la variante hereda el precio del producto)', () => {
      assert.deepEqual([L().carac(P1, 'descuento'), L().carac(P1, 'costo'), L().carac(v1, 'precio')], [30000, 12000, 35000]);
    });
    await paso('#5 característica con espacio de nombres: comercio:marca = Kobalt', () => { assert.equal(L().carac(P1, 'comercio:marca'), 'Kobalt'); });
    await paso('#6 [C2] característica sin espacio de nombres y no declarada ⇒ característicaDesconocida', () => {
      rechazo(Γ, fijar('dueño', 'producto', 'temporada', P1, '2026'), { resultado: 'INADMISIBLE', motivo: 'característicaDesconocida' });
    });
    await paso('#7 agregar una variante no reordena: slot(v2) = 2; colores independientes', () => {
      assert.equal(ok(Γ, nacer('dueño', 'variante', { producto: P1, sku: 'P1-A', color: 'Rojo', talla: '6' })), 3);
      assert.deepEqual([L().slot(v1), L().slot(v2), L().carac(v1, 'color'), L().carac(v2, 'color')], [1, 2, 'Azul', 'Rojo']);
    });
    await paso('#8 [L29] físico cero al crear, sin ninguna acción de existencias', () => { assert.equal(L().disp(W, v2).H, 0); });
    await paso('#9 conteo absoluto: H(v1) = 10; descuadre = −10 (sobrante: carga inicial, §9.7)', () => {
      ok(Γ, disparar('dueño', 'Contar', { w: W, v: v1, h: 10 }));
      assert.deepEqual([L().disp(W, v1).H, L().disp(W, v1).descuadre], [10, -10]);
    });
    await paso('#10 ingreso sin tocar el catálogo: H = 15; nombre(P1) igual', () => {
      ok(Γ, disparar('dueño', 'Ingresar', { w: W, v: v1, q: 5 }));
      assert.deepEqual([L().disp(W, v1).H, L().carac(P1, 'nombre')], [15, 'Camiseta']);
    });
    await paso('#11 Flat de dos slots: [15, 0]', () => { assert.deepEqual(C.consultar(Γ, Dom.PROYECCIONES.flat(W)).valores, [15, 0]); });
    await paso('#12 umbral y alerta: v1 ∈ «bajo umbral» (libre 15 < 16); v2 sin umbral no', () => {
      ok(Γ, fijar('dueño', 'variante', 'umbral', v1, 16));
      const φ = { op: '<', de: [{ lee: 'disp.libre@1', con: [{ x: 'e' }] }, { lee: 'carac@1', con: [{ x: 'e' }, { v: 'umbral' }] }] };
      assert.deepEqual(Dom.filtrar(L().D, L().par, 'variante', φ), [v1]);
    });
    await paso('#13 venta sin salida física: H = 15, P = 3', () => {
      assert.equal(ok(Γ, lote('dueño', nacer('dueño', 'pedido', { canal: 'POS' }), nacer('dueño', 'venta', { pedido: { nacido: 0 }, variante: v1, bodega: W, precio: 29000 }), disparar('dueño', 'Vender', { s: { nacido: 1 }, q: 3 }))), 7);
      assert.deepEqual([L().disp(W, v1).H, L().disp(W, v1).P], [15, 3]);
    });
    await paso('#14 [L12] reserva sin doble descuento: D_prudente igual (12); A = 2; P = 1', () => {
      const antes = L().disp(W, v1).prudente;
      ok(Γ, disparar('dueño', 'Asignar', { s: S1, q: 2 }));
      const d = L().disp(W, v1);
      assert.deepEqual([antes, d.prudente, d.A, d.P], [12, 12, 2, 1]);
    });
    await paso('#15 despacho consume físico: libre igual (13); desp = 2; asig = 0; H = 13', () => {
      const antes = L().disp(W, v1).libre;
      ok(Γ, disparar('dueño', 'Despachar', { s: S1, q: 2 }));
      assert.deepEqual([antes, L().disp(W, v1).libre, L().lugar('desp', [S1]), L().lugar('asig', [S1]), L().disp(W, v1).H], [13, 13, 2, 0, 13]);
    });
    await paso('#16 no despachar sin asignación ⇒ asig[S1] bajaría de 0', () => {
      rechazo(Γ, disparar('dueño', 'Despachar', { s: S1, q: 1 }), { resultado: 'INADMISIBLE', motivo: `negativo:asig[${K(S1)}]` });
    });
    await paso('#17 el precio acordado se conserva: precio(S1) = 29000; precio(P1) = 40000', () => {
      ok(Γ, lote('dueño', fijar('dueño', 'producto', 'precio', P1, 40000), fijar('dueño', 'producto', 'descuento', P1, 0)));
      assert.deepEqual([L().carac(S1, 'precio'), L().carac(P1, 'precio')], [29000, 40000]);
    });
    await paso('#18 cambiar el color no afecta a las existencias', () => {
      ok(Γ, fijar('dueño', 'variante', 'color', v1, 'Verde'));
      assert.deepEqual([L().carac(v1, 'color'), L().disp(W, v1).H], ['Verde', 13]);
    });
    await paso('#19 crear un usuario vendedor: dos compromisos (registro de la persona + capacidades por contrato)', () => {
      assert.equal(ok(Γ, nacer('dueño', 'usuario', { nombre: 'Tienda A', principal: 'U1', papel: 'vendedor' })), 12);
      ok(Γ, fijarParametro('dueño', { 'nucleo.capacidades': { 'dueño': ['*'], U1: Ref.CAPACIDADES.vendedor }, 'dominio.alcancePropio': { U1: Ref.ALCANCE.vendedor } }));
      assert.equal(S(Γ).epoca, 1);
      assert.equal(L().carac(U1u, 'principal'), 'U1');
    });
    await paso('#20 el vendedor no puede contar ⇒ NO_AUTORIZADO', () => { rechazo(Γ, disparar('U1', 'Contar', { w: W, v: v1, h: 999 }), { resultado: 'NO_AUTORIZADO' }); });
    await paso('#21 el vendedor sí registra una venta (Web, con referencia de canal); creador(S2) = U1', () => {
      assert.equal(ok(Γ, lote('U1', nacer('U1', 'pedido', { canal: 'Web', 'canal:ref': 'W1' }), nacer('U1', 'venta', { pedido: { nacido: 0 }, variante: v1, bodega: W, precio: 35000 }), disparar('U1', 'Vender', { s: { nacido: 1 }, q: 1 }))), 14);
      assert.equal(L().ent().find(x => igual(x.id, S2)).creador, 'U1');
      assert.equal(L().carac([14, 0], 'canal:ref'), 'W1', 'la referencia de canal vive en el pedido (familia *:*)');
      assert.equal(L().carac(S2, 'canal'), 'Web', 'la venta hereda el canal del pedido');
      assert.equal(L().ent().find(x => igual(x.id, S2)).padre.join('.'), '14.0');
    });
    await paso('#22 el vendedor no puede reservar ⇒ NO_AUTORIZADO', () => { rechazo(Γ, disparar('U1', 'Asignar', { s: S2, q: 1 }), { resultado: 'NO_AUTORIZADO' }); });
    await paso('#23 cliente con identidad propia', () => {
      assert.equal(ok(Γ, nacer('dueño', 'cliente', { nombre: 'Cliente ejemplo', contacto: 'contacto de prueba' })), 15);
      assert.equal(L().carac(C1, 'nombre'), 'Cliente ejemplo');
    });
    await paso('#24 pago manual: cobrado[S1] = 87000', () => {
      ok(Γ, disparar('dueño', 'Cobrar', { s: S1, x: 87000 }));
      assert.deepEqual([L().lugar('cobrado', [S1]), L().lugar('porCobrar', [S1])], [87000, 0]);
    });
    await paso('#25 no cobrar más del total ⇒ porCobrar bajaría de 0', () => {
      rechazo(Γ, disparar('dueño', 'Cobrar', { s: S1, x: 1 }), { resultado: 'INADMISIBLE', motivo: `negativo:porCobrar[${K(S1)}]` });
    });
    await paso('#26 devolución parcial: sol[R1] = 1; cupo[R1] = 29000', () => {
      assert.equal(ok(Γ, lote('dueño', nacer('dueño', 'devolución', { venta: S1 }), disparar('dueño', 'Devolver', { d: { nacido: 0 }, q: 1 }))), 17);
      assert.deepEqual([L().lugar('sol', [R1]), L().lugar('cupo', [R1])], [1, 29000]);
    });
    await paso('#27 no devolver más de lo despachado ⇒ desp[S1] bajaría de 0; el lote no compromete nada', () => {
      rechazo(Γ, lote('dueño', nacer('dueño', 'devolución', { venta: S1 }), disparar('dueño', 'Devolver', { d: { nacido: 0 }, q: 2 })), { resultado: 'INADMISIBLE', motivo: `negativo:desp[${K(S1)}]` });
    });
    await paso('#28 recepción revendible: H + 1', () => {
      ok(Γ, disparar('dueño', 'Recibir.apto', { d: R1, q: 1 }));
      assert.equal(L().disp(W, v1).H, 14);
    });
    await paso('#29 no recibir dos veces ⇒ sol bajaría de 0', () => { rechazo(Γ, disparar('dueño', 'Recibir.apto', { d: R1, q: 1 }), { resultado: 'INADMISIBLE', motivo: `negativo:sol[${K(R1)}]` }); });
    await paso('#30 reembolso ligado: cupoUsado = 29000; reembolsado[S1] = 29000', () => {
      ok(Γ, disparar('dueño', 'Reembolsar', { d: R1, x: 29000 }));
      assert.deepEqual([L().lugar('cupoUsado', [R1]), L().lugar('reembolsado', [S1]), L().lugar('cobrado', [S1])], [29000, 29000, 58000]);
    });
    await paso('#31 no reembolsar de más ⇒ cupo bajaría de 0', () => { rechazo(Γ, disparar('dueño', 'Reembolsar', { d: R1, x: 1 }), { resultado: 'INADMISIBLE', motivo: `negativo:cupo[${K(R1)}]` }); });
    await paso('#32 lote de venta inmediata con conteo intermedio: UNA entrada; H(v2) = 1; desp = 1', () => {
      assert.equal(ok(Γ, lote('dueño', nacer('dueño', 'pedido', { canal: 'Mostrador' }), nacer('dueño', 'venta', { pedido: { nacido: 0 }, variante: v2, bodega: W, precio: 10000 }), disparar('dueño', 'Vender', { s: { nacido: 1 }, q: 1 }),
        disparar('dueño', 'Contar', { w: W, v: v2, h: 2 }), disparar('dueño', 'Asignar', { s: { nacido: 1 }, q: 1 }), disparar('dueño', 'Despachar', { s: { nacido: 1 }, q: 1 }))), 20);
      assert.deepEqual([L().disp(W, v2).H, L().lugar('desp', [S3])], [1, 1]);
    });
    await paso('#33 [L28] un lote fallido no cambia el estado ni consume slots: referenciaInexistente', () => {
      const T0 = L().T();
      rechazo(Γ, lote('dueño', nacer('dueño', 'producto', { nombre: 'Fallido', público: true }), nacer('dueño', 'variante', { producto: { nacido: 0 }, sku: 'F-1' }),
        disparar('dueño', 'Contar', { w: W, v: [99, 0], h: 10 })), { resultado: 'INADMISIBLE', motivo: 'referenciaInexistente' });
      assert.deepEqual(L().T(), T0);
    });
    await paso('#34 [C1] retirar no reutiliza coordenadas: estado(P1) = retirado; |T| = 2; la siguiente variante tendría slot 3', () => {
      ok(Γ, fijar('dueño', 'producto', 'estado', P1, 'retirado'));
      assert.equal(L().carac(P1, 'estado'), 'retirado');
      assert.equal(L().T().length, 2);
      const Γb = C.bifurcar(Γ);
      const n = ok(Γb, nacer('dueño', 'variante', { producto: P1, sku: 'P1-Z' }));
      assert.equal(lect(Dom, Γb).slot([n, 0]), 3);
    });
    const copiaDe = Γx => ({ streamId: Γx.streamId, gBytes: N.encGenesis(Γx.g), bloques: Γx.bloques, cabeza: C.cabeza(Γx) });
    await paso('#35 verificación de hashes: verificar(Γ) = OK(n, h_n)', () => {
      assert.deepEqual(N.verificar(copiaDe(Γ)), { resultado: 'OK', ...C.cabeza(Γ) });
    });
    await paso('#36 alterar un evento rompe la cadena ⇒ DISCONTINUIDAD en e_1', () => {
      const b = Uint8Array.from(Γ.bloques[0]); b[b.length - 1] ^= 1;
      const r = N.verificar({ ...copiaDe(Γ), bloques: [b, ...Γ.bloques.slice(1)] });
      assert.deepEqual([r.resultado, r.i], ['DISCONTINUIDAD', 1]);
    });
    await paso('#37 versión desconocida: época alterada con cadena recalculada ⇒ DISCONTINUIDAD(ÉPOCA); regla no registrada ⇒ FijarParámetro rechazado', () => {
      const e2 = { ...Γ.entradas[1], epoca: 5 };
      const bl = [Γ.bloques[0], N.encEntrada(e2)];
      let h = Γ.hashes[0]; for (const b of bl) h = N.hashPaso(h, b);
      const r = N.verificar({ streamId: Γ.streamId, gBytes: N.encGenesis(Γ.g), bloques: bl, cabeza: { n: 2, h } });
      assert.deepEqual([r.resultado, r.i, r.motivo], ['DISCONTINUIDAD', 2, 'ÉPOCA']);
      rechazo(Γ, fijarParametro('dueño', { 'nucleo.regla': 'kobalt.dominio@9' }), { resultado: 'INADMISIBLE', motivo: 'fueraDeDominio' });
    });
    await paso('#38 [L4] misma secuencia, mismo estado: Fold dos veces da lo mismo', () => {
      const S0 = N.estadoInicial(Γ.g, R);
      assert.deepEqual(N.fold(S0, Γ.entradas, R), N.fold(N.estadoInicial(Γ.g, R), Γ.entradas, R));
      assert.deepEqual(N.fold(S0, Γ.entradas, R), S(Γ));
    });
    await paso('#39 [L9] incremental = completa: q_cat y q_flat actualizados desde el checkpoint 5 = reconstrucción', () => {
      for (const proy of [Dom.PROYECCIONES.catalogo, Dom.PROYECCIONES.flat(W)]) {
        const g5 = C.resolverP(Γ, proy, 5);
        const inc = C.resolverP(Γ, proy, Γ.entradas.length, { acum: g5.acum, checkpoint: g5.checkpoint });
        assert.equal(inc.accion, 'ACTUALIZAR');
        assert.deepEqual(inc.Y, C.consultar(Γ, proy));
      }
    });
    await paso('#40 #41 [C4] contenido exacto: mismos bytes ⇒ misma Q (64 hex); bytes distintos ⇒ otra Q', () => {
      const b = te.encode('foto'), b2 = te.encode('foto recomprimida');
      const Q = N.derivar(CONTENIDO, b);
      assert.match(Q, /^[0-9a-f]{64}$/);
      assert.equal(N.derivar(CONTENIDO, Uint8Array.from(b)), Q);
      assert.notEqual(N.derivar(CONTENIDO, b2), Q);
    });
    const el = (Q, creador, propósito, audiencia, permitidos = []) => ({ Q, creador, propósito, audiencia, permitidos });
    const Qs = [1, 2, 3, 4].map(i => N.derivar(CONTENIDO, Uint8Array.of(i)));
    await paso('#42–#45 visibilidad de medios por actor (pregunta, no guarda)', () => {
      ok(Γ, añadir('dueño', 'producto', 'galería', P1, el(Qs[0], 'dueño', 'página', 'público')));
      ok(Γ, añadir('dueño', 'producto', 'galería', P1, el(Qs[1], 'dueño', 'página', 'creador')));
      ok(Γ, añadir('dueño', 'producto', 'galería', P1, el(Qs[2], 'dueño', 'página', 'usuarios', ['U1'])));
      ok(Γ, añadir('U1', 'producto', 'galería', P1, el(Qs[3], 'U1', 'vendedor', 'creador')));
      const gal = L().carac(P1, 'galería');
      assert.equal(gal.length, 4);
      const vis = Q => Dom.visible(L().D, L().par, 'U1', P1, gal.find(x => x.Q === Q));
      assert.equal(vis(Qs[0]), true, '#42 pública visible');
      assert.equal(vis(Qs[1]), false, '#43 privada del propietario no visible');
      assert.equal(vis(Qs[3]), true, '#44 el creador ve su medio');
      assert.equal(vis(Qs[2]), true, '#45 seleccionada respeta permitidos');
      rechazo(Γ, añadir('U1', 'producto', 'galería', P1, el(Qs[3], 'U1', 'vendedor', 'público')), { resultado: 'INADMISIBLE', motivo: 'admite' }, 'el vendedor no publica en un producto ajeno');
    });
    await paso('#46 un corte conserva el estado histórico: tras el lote del #2, color(v1) = Azul y |T| = 1', () => {
      const cat = C.consultar(Γ, Dom.PROYECCIONES.catalogo, nTras2);
      assert.equal(cat[K(v1)].propia.color, 'Azul');
      assert.deepEqual(C.consultar(Γ, Dom.PROYECCIONES.T, nTras2), [v1]);
    });
    await paso('#47 una cabecera divergente no es prefijo: FORK (nunca CADENA)', () => {
      const Γf = C.bifurcar(Γ);
      Γf.entradas.pop(); Γf.bloques.pop(); Γf.hashes.pop(); Γf.estados.pop();
      ok(Γf, nacer('dueño', 'cliente', { nombre: 'Rama' }));
      const r = N.resolver(Γ.hashes, Γf.hashes);
      assert.ok(['FORK', 'SIN_EVIDENCIA'].includes(r.resultado), JSON.stringify(r));
    });
    await paso('#48 [L25] una Γ nueva (otro StreamID) empieza en (1, 0) en SU trayectoria: no se identifica con la (1, 0) de esta', () => {
      const Γc = C.cauce(R, { ...v2genesis(Dom), streamId: C.STREAM_B });
      assert.equal(ok(Γc, nacer('dueño', 'cliente', { nombre: 'Otra' })), 1);
      assert.deepEqual(lect(Dom, Γc).ent()[0].id, [1, 0]);
      assert.notEqual(Γc.streamId, Γ.streamId);
      assert.notEqual(lect(Dom, Γc).ent()[0].tipo, L().ent()[0].tipo);
    });
    await paso('#49 acción desconocida ⇒ INADMISIBLE(forma) (G5)', () => { rechazo(Γ, { u: 'dueño', tipo: 'VENTA_MAGICA', args: {} }, { resultado: 'INADMISIBLE', motivo: 'forma' }); });
    await paso('#50 usuario 1 ≠ cliente 1: posiciones distintas por construcción (VF1)', () => {
      assert.notDeepEqual(U1u, C1);
      assert.equal(L().ent().find(x => igual(x.id, U1u)).tipo, 'usuario');
      assert.equal(L().ent().find(x => igual(x.id, C1)).tipo, 'cliente');
      assert.deepEqual(L().aud(), [], 'auditoría vacía al final de la historia');
    });
  });

  // ═════════════════════════ B.3 · flujos F0–F9 ═════════════════════════
  test(`Oráculo v2 [${etiqueta}] B.3 · flujos F0–F7 y F9 (F8 es de la fase 6)`, async t => {
    const Dom = dom();
    const R = reg(Dom);
    const alta = Γ => {
      ok(Γ, nacer('dueño', 'bodega', { nombre: 'principal' }));
      ok(Γ, lote('dueño', nacer('dueño', 'producto', { nombre: 'Camiseta', precio: 35000, público: true }), nacer('dueño', 'variante', { producto: { nacido: 0 }, sku: 'P1-V', color: 'Azul' })));
      return { W: [1, 0], P1: [2, 0], v1: [2, 1] };
    };
    await t.test('F0 génesis sin entradas: q_T = [], cabeza (0, h_0), verificar = OK', () => {
      const Γ = C.cauce(R, v2genesis(Dom));
      assert.deepEqual(C.consultar(Γ, Dom.PROYECCIONES.T), []);
      assert.deepEqual(C.consultar(Γ, Dom.PROYECCIONES.flat([1, 0])).valores, []);
      assert.deepEqual(C.cabeza(Γ), { n: 0, h: N.hashGenesis(Γ.g) });
      assert.equal(N.verificar({ streamId: Γ.streamId, gBytes: N.encGenesis(Γ.g), bloques: [], cabeza: C.cabeza(Γ) }).resultado, 'OK');
    });
    await t.test('F1 alta y dos orientaciones: F_Azul ∋ v1; tras Fijar(v1, color, Verde) F_Azul ∌ v1 y F_Verde ∋ v1; slot igual; leer filtros no compromete', () => {
      const Γ = C.cauce(R, v2genesis(Dom));
      const { P1, v1 } = alta(Γ);
      const F = c => Dom.fibra(S(Γ).D, S(Γ).parametros, 'color', c);
      assert.deepEqual(F('Azul').miembros, [v1]);
      ok(Γ, fijar('dueño', 'producto', 'comercio:temporada', P1, '2026'));
      ok(Γ, fijar('dueño', 'variante', 'color', v1, 'Verde'));
      const n = Γ.entradas.length;
      assert.deepEqual([F('Azul').miembros, F('Verde').miembros], [[], [v1]]);
      assert.deepEqual(C.consultar(Γ, Dom.PROYECCIONES.fibra('color', 'Verde')).miembros, [v1]);
      assert.equal(Dom.slot(S(Γ).D, S(Γ).parametros, v1), 1);
      assert.equal(Γ.entradas.length, n, 'ningún compromiso extra para el filtro');
    });
    await t.test('F2 imagen exacta: misma Q para los mismos bytes; visibilidad por actor; bytes recomprimidos ⇒ otra Q', () => {
      const Γ = C.cauce(R, v2genesis(Dom, { 'nucleo.capacidades': { 'dueño': ['*'], U1: Ref.CAPACIDADES.vendedor } }));
      const { P1 } = alta(Γ);
      const Q = N.derivar(CONTENIDO, te.encode('bytes-de-la-foto'));
      ok(Γ, añadir('dueño', 'producto', 'galería', P1, { Q, creador: 'dueño', propósito: 'página', audiencia: 'público', permitidos: [] }));
      ok(Γ, añadir('dueño', 'producto', 'galería', P1, { Q, creador: 'dueño', propósito: 'página', audiencia: 'creador', permitidos: [] }));
      const gal = Dom.carac(S(Γ).D, S(Γ).parametros, P1, 'galería');
      assert.deepEqual(gal.map(x => x.Q), [Q, Q], 'mismo contenido, dos vínculos con identidad distinta');
      const vis = (u, x) => Dom.visible(S(Γ).D, S(Γ).parametros, u, P1, x);
      assert.deepEqual(gal.map(x => vis('U1', x)).sort(), [false, true]);
      assert.deepEqual(gal.map(x => vis('dueño', x)), [true, true]);
      assert.notEqual(N.derivar(CONTENIDO, te.encode('bytes-de-la-foto ')), Q);
    });
    await t.test('F3–F6 conteo y Flat; precio histórico; asignación y despacho; devolución independiente (igual que la v2)', () => {
      const Γ = C.cauce(R, v2genesis(Dom));
      const { W, P1, v1 } = alta(Γ);
      const d = () => Dom.disponibilidad(S(Γ).D, S(Γ).parametros, W, v1);
      const lugar = (f, id) => Dom.valorLugar(S(Γ).D, f, [id]);
      ok(Γ, disparar('dueño', 'Contar', { w: W, v: v1, h: 10 }));
      const nContar = Γ.entradas.length;
      ok(Γ, disparar('dueño', 'Ingresar', { w: W, v: v1, q: 3 }));
      assert.deepEqual(C.consultar(Γ, Dom.PROYECCIONES.flat(W)).valores, [13], 'F3');
      assert.deepEqual(C.consultar(Γ, Dom.PROYECCIONES.flat(W), nContar).valores, [10], 'F3: pregunta en el corte anterior');
      const S1 = [ok(Γ, lote('dueño', nacer('dueño', 'pedido', { canal: 'POS' }), nacer('dueño', 'venta', { pedido: { nacido: 0 }, variante: v1, bodega: W, precio: 32000 }), disparar('dueño', 'Vender', { s: { nacido: 1 }, q: 2 }))), 1];
      ok(Γ, fijar('dueño', 'producto', 'precio', P1, 40000));
      assert.deepEqual([lugar('porCobrar', S1), d().H, d().P, Dom.carac(S(Γ).D, S(Γ).parametros, S1, 'precio')], [64000, 13, 2, 32000], 'F4');
      const libre0 = d().libre;
      ok(Γ, disparar('dueño', 'Asignar', { s: S1, q: 2 }));
      assert.deepEqual([d().A, d().P, d().H, d().libre], [2, 0, 13, 11], 'F5 asignar');
      ok(Γ, disparar('dueño', 'Despachar', { s: S1, q: 2 }));
      assert.deepEqual([d().A, d().H, d().libre, libre0], [0, 11, 11, 13], 'F5 despachar');
      rechazo(Γ, disparar('dueño', 'Despachar', { s: S1, q: 1 }), { resultado: 'INADMISIBLE', motivo: `negativo:asig[${K(S1)}]` }, 'F5');
      const R1 = [ok(Γ, lote('dueño', nacer('dueño', 'devolución', { venta: S1 }), disparar('dueño', 'Devolver', { d: { nacido: 0 }, q: 1 }))), 0];
      ok(Γ, disparar('dueño', 'Recibir.apto', { d: R1, q: 1 }));
      assert.equal(d().H, 12, 'F6 recepción');
      ok(Γ, disparar('dueño', 'Cobrar', { s: S1, x: 64000 }));
      ok(Γ, disparar('dueño', 'Reembolsar', { d: R1, x: 32000 }));
      rechazo(Γ, lote('dueño', nacer('dueño', 'devolución', { venta: S1 }), disparar('dueño', 'Devolver', { d: { nacido: 0 }, q: 2 })), { resultado: 'INADMISIBLE', motivo: `negativo:desp[${K(S1)}]` }, 'F6 exceso de devolución');
      rechazo(Γ, disparar('dueño', 'Reembolsar', { d: R1, x: 1 }), { resultado: 'INADMISIBLE', motivo: `negativo:cupo[${K(R1)}]` }, 'F6 exceso de reembolso');
      assert.deepEqual(Dom.auditoria(S(Γ).D, S(Γ).parametros), []);
    });
    await t.test('F7 [C5] idempotencia y autoridad sobre la materialidad: mismo sid ⇒ YA_COMPROMETIDO(i) aunque cambie el contenido; vendedor ⇒ NO_AUTORIZADO; verificar = OK', async () => {
      const g = v2genesis(Dom, { 'nucleo.capacidades': { 'dueño': ['*'], U1: Ref.CAPACIDADES.vendedor } });
      const a = await N.crearAlmacenMemoria();
      assert.equal((await N.crear(a, g, R)).resultado, 'CREADO');
      const ap = async sol => N.appendIfHead(a, g.streamId, await a.cabeza(g.streamId), 'dueño', { deps: [], ...sol }, { registro: R });
      assert.equal((await ap({ ...nacer('dueño', 'bodega', { nombre: 'principal' }), sid: '01' })).resultado, 'COMPROMETIDO');
      assert.equal((await ap({ ...lote('dueño', nacer('dueño', 'producto', { nombre: 'X', público: true }), nacer('dueño', 'variante', { producto: { nacido: 0 }, sku: 'x' })), sid: '02' })).resultado, 'COMPROMETIDO');
      const sid = hex(te.encode('demo-1'));
      const contar = h => ({ ...disparar('dueño', 'Contar', { w: [1, 0], v: [2, 1], h }), sid });
      const r1 = await ap(contar(10));
      assert.equal(r1.resultado, 'COMPROMETIDO');
      assert.deepEqual(await ap(contar(10)), { resultado: 'YA_COMPROMETIDO', i: r1.n });
      assert.deepEqual(await ap(contar(999)), { resultado: 'YA_COMPROMETIDO', i: r1.n }, 'C5: el núcleo no compara contenidos; la puerta (fase 6) informa CONFLICTO_SID');
      assert.equal((await ap({ ...disparar('U1', 'Contar', { w: [1, 0], v: [2, 1], h: 1 }), sid: '03' })).resultado, 'NO_AUTORIZADO');
      assert.equal(N.verificar(await N.leerCopia(a, g.streamId)).resultado, 'OK');
    });
    await t.test('F9 recuperación: copia (g, bloques) ⇒ crear + incorporar da la misma cabeza y el mismo q_cat; otra Γ ⇒ GÉNESIS_DISTINTA / CABEZA_CAMBIADA; respaldo sin derivación registrada ⇒ rechazo', async () => {
      const Γ = C.cauce(R, v2genesis(Dom));
      const { W, v1 } = alta(Γ);
      ok(Γ, disparar('dueño', 'Ingresar', { w: W, v: v1, q: 4 }));
      const a = await N.crearAlmacenMemoria();
      assert.equal((await N.crear(a, Γ.g, R)).resultado, 'CREADO');
      const inc = await N.incorporar(a, Γ.streamId, { n: 0, h: Γ.hashes[0] }, Γ.bloques, C.cabeza(Γ), { registro: R });
      assert.deepEqual({ resultado: inc.resultado, n: inc.n, h: inc.h }, { resultado: 'INCORPORADO', ...C.cabeza(Γ) });
      const Γr = await N.leerTrayectoria(a, Γ.streamId);
      const cat = N.resolverProyeccion({ proy: Dom.PROYECCIONES.catalogo, guardado: null, trayectoria: Γr, m: Γr.entradas.length, registro: R }).Y;
      assert.deepEqual(cat, C.consultar(Γ, Dom.PROYECCIONES.catalogo));
      const otra = C.cauce(R, { ...v2genesis(Dom, { 'dominio.lote': { máximo: 7, guarda: 'cadaPaso' } }) });
      ok(otra, nacer('dueño', 'bodega', { nombre: 'otra' }));
      assert.equal(N.resolver(Γ.hashes, otra.hashes).resultado, 'GÉNESIS_DISTINTA');
      const mezcla = await N.incorporar(a, Γ.streamId, { n: 0, h: otra.hashes[0] }, otra.bloques, C.cabeza(otra), { registro: R });
      assert.equal(mezcla.resultado, 'CABEZA_CAMBIADA');
      assert.equal((await N.crear(await N.crearAlmacenMemoria(), v2genesis(Dom, { 'nucleo.derivación': 'sha256/256' }), R)).resultado, 'INADMISIBLE');
    });
  });

  // ═════════════════════════ cambios deliberados C3, C6, C7, C8 ═════════════════════════
  test(`Oráculo v2 [${etiqueta}] cambios deliberados C3 (Cancelar parcial), C6 (identidad del vínculo), C7 (varias variantes / producto sin variantes), C8 (transferencia y liberación por canal)`, async t => {
    const Dom = dom();
    const R = reg(Dom);
    const base = (C0 = {}) => {
      const Γ = C.cauce(R, v2genesis(Dom, C0));
      ok(Γ, nacer('dueño', 'bodega', { nombre: 'W' }));
      ok(Γ, lote('dueño', nacer('dueño', 'producto', { nombre: 'P', precio: 100, público: true }), nacer('dueño', 'variante', { producto: { nacido: 0 }, sku: 'S' })));
      ok(Γ, disparar('dueño', 'Ingresar', { w: [1, 0], v: [2, 1], q: 10 }));
      return { Γ, W: [1, 0], P: [2, 0], v: [2, 1] };
    };
    await t.test('C3 Cancelar parcial: con algo despachado y cobrado ≤ despachado·p se cancela lo pendiente y lo asignado (la v2 lo rechazaba)', () => {
      const { Γ, W, v } = base();
      const s = [ok(Γ, { u: 'dueño', ...Ref.plantillaLínea({ canal: 'POS' }, { variante: v, bodega: W, precio: 100, cantidad: 3, modalidad: 'pedido' }) }), 1];
      ok(Γ, disparar('dueño', 'Asignar', { s, q: 2 }));
      ok(Γ, disparar('dueño', 'Despachar', { s, q: 1 }));
      ok(Γ, disparar('dueño', 'Cobrar', { s, x: 100 }));
      ok(Γ, disparar('dueño', 'Cancelar', { s }), 'C3');
      const lugar = f => Dom.valorLugar(S(Γ).D, f, [s]);
      assert.deepEqual([lugar('pend'), lugar('asig'), lugar('desp'), lugar('cancel'), lugar('porCobrar'), lugar('cobrado'), lugar('anulado')], [0, 0, 1, 2, 0, 100, 200]);
      const d = Dom.disponibilidad(S(Γ).D, S(Γ).parametros, W, v);
      assert.deepEqual([d.H, d.A, d.P, d.libre], [9, 0, 0, 9]);
    });
    await t.test('C3 frontera: si lo cobrado supera lo despachado·p, Cancelar se rechaza (porCobrar restringido)', () => {
      const { Γ, W, v } = base();
      const s = [ok(Γ, { u: 'dueño', ...Ref.plantillaLínea({ canal: 'POS' }, { variante: v, bodega: W, precio: 100, cantidad: 3, modalidad: 'pedido' }) }), 1];
      ok(Γ, disparar('dueño', 'Cobrar', { s, x: 300 }));
      rechazo(Γ, disparar('dueño', 'Cancelar', { s }), { resultado: 'INADMISIBLE', motivo: `negativo:porCobrar[${K(s)}]` });
    });
    await t.test('C6 la identidad de un vínculo de galería es [Q, creador, propósito, audiencia] para añadir y para quitar', () => {
      const { Γ, P } = base();
      const Q = N.derivar(CONTENIDO, Uint8Array.of(7));
      ok(Γ, añadir('dueño', 'producto', 'galería', P, { Q, creador: 'dueño', propósito: 'página', audiencia: 'usuarios', permitidos: ['U1'] }));
      rechazo(Γ, añadir('dueño', 'producto', 'galería', P, { Q, creador: 'dueño', propósito: 'página', audiencia: 'usuarios', permitidos: [] }), { resultado: 'INADMISIBLE', motivo: 'yaPresente' }, 'misma identidad');
      ok(Γ, añadir('dueño', 'producto', 'galería', P, { Q, creador: 'dueño', propósito: 'vendedor', audiencia: 'usuarios', permitidos: [] }), 'otro propósito = otro vínculo');
      ok(Γ, quitar('dueño', 'producto', 'galería', P, { Q, creador: 'dueño', propósito: 'página', audiencia: 'usuarios', permitidos: [] }), 'se quita por la misma clave');
      assert.deepEqual(Dom.carac(S(Γ).D, S(Γ).parametros, P, 'galería').map(x => x.propósito), ['vendedor']);
      rechazo(Γ, quitar('dueño', 'producto', 'galería', P, { Q, creador: 'dueño', propósito: 'página', audiencia: 'usuarios', permitidos: [] }), { resultado: 'INADMISIBLE', motivo: 'ausente' });
    });
    await t.test('C7 varias variantes en un solo lote de nacimiento; un producto sin variantes es representable', () => {
      const { Γ } = base();
      const n = ok(Γ, lote('dueño', nacer('dueño', 'producto', { nombre: 'Multi', público: true }), nacer('dueño', 'variante', { producto: { nacido: 0 }, sku: 'M1' }),
        nacer('dueño', 'variante', { producto: { nacido: 0 }, sku: 'M2' }), nacer('dueño', 'variante', { producto: { nacido: 0 }, sku: 'M3' })));
      assert.deepEqual(Dom.coordenadas(S(Γ).D, S(Γ).parametros).slice(-3), [[n, 1], [n, 2], [n, 3]]);
      const m = ok(Γ, nacer('dueño', 'producto', { nombre: 'Sin variantes', público: false }));
      assert.equal(Dom.entidades(S(Γ).D).find(x => igual(x.id, [m, 0])).tipo, 'producto');
      assert.equal(Dom.carac(S(Γ).D, S(Γ).parametros, [m, 0], 'nombre'), 'Sin variantes');
    });
    await t.test('C8 transferencia en dos pasos (tránsito visible) y liberación por canal POS (no existen en la v2)', () => {
      const { Γ, W, v } = base({ 'dominio.liberaciones': Ref.LIBERACIONES_INICIAL });
      const W2 = [ok(Γ, nacer('dueño', 'bodega', { nombre: 'W2' })), 0];
      ok(Γ, disparar('dueño', 'Transferir.salida', { w: W, w2: W2, v, q: 4 }));
      assert.equal(Dom.valorLugar(S(Γ).D, 'tránsito', [W, W2, v]), 4);
      ok(Γ, disparar('dueño', 'Transferir.llegada', { w: W, w2: W2, v, q: 4 }));
      const d = w => Dom.disponibilidad(S(Γ).D, S(Γ).parametros, w, v);
      assert.deepEqual([d(W).H, d(W2).H, d(W2).libre], [6, 4, 4]);
      ok(Γ, { u: 'dueño', ...Ref.plantillaLínea({ canal: 'POS' }, { variante: v, bodega: W2, precio: 100, cantidad: 6, modalidad: 'entregarAhora' }) }, 'POS liberado: se vende más de lo que hay');
      assert.deepEqual([d(W2).H, d(W2).déficit], [-2, 2]);
      rechazo(Γ, { u: 'dueño', ...Ref.plantillaLínea({ canal: 'Web' }, { variante: v, bodega: W2, precio: 100, cantidad: 1, modalidad: 'entregarAhora' }) }, { resultado: 'INADMISIBLE', motivo: `negativo:libre[${K(W2)},${K(v)}]` });
      assert.deepEqual(Dom.auditoria(S(Γ).D, S(Γ).parametros), []);
    });
  });

  // ═════════════════════════ Anexo · modalidades de venta de la v3 y lectura sin evento ═════════════════════════
  test(`Oráculo v3 [${etiqueta}] modalidades de venta (solo registro, demanda suave, asignación firme, inmediata) como plantillas; físico/libre/prudente sin evento`, async t => {
    const Dom = dom();
    const R = reg(Dom);
    const Γ = C.cauce(R, v2genesis(Dom, { 'nucleo.capacidades': { 'dueño': ['*'], U1: Ref.CAPACIDADES.vendedor } }));
    ok(Γ, nacer('dueño', 'bodega', { nombre: 'principal' }));
    ok(Γ, lote('dueño', nacer('dueño', 'producto', { nombre: 'P1', precio: 35000, público: true }), nacer('dueño', 'variante', { producto: { nacido: 0 }, sku: 'P1-V', color: 'verde' })));
    const W = [1, 0], P1 = [2, 0], v = [2, 1];
    const d = () => Dom.disponibilidad(S(Γ).D, S(Γ).parametros, W, v);
    const leer = () => { const x = d(); return { físico: x.H, libre: x.noAsignada, prudente: x.prudente, H: x.H, A: x.A, P: x.P }; };
    const vender = (modo, q, u = 'dueño', pedido = null) => Ref.idLínea(ok(Γ, { u, ...Ref.plantillaLínea({ canal: 'POS' }, { variante: v, bodega: W, precio: 35000, cantidad: q, modalidad: modo }, pedido) }, modo), pedido);
    const ventas = () => Dom.entidades(S(Γ).D).filter(x => x.tipo === 'venta').length;
    let sSuave, nAntesInmediata;
    await t.test('probeta 1: Contar 10 ⇒ físico = libre = prudente = 10; leer las tres no añade compromisos', () => {
      ok(Γ, disparar('dueño', 'Contar', { w: W, v, h: 10 }));
      const n = Γ.entradas.length;
      assert.deepEqual([leer().físico, leer().libre, leer().prudente], [10, 10, 10]);
      C.consultar(Γ, Dom.PROYECCIONES.disponibilidad(W, v));
      assert.equal(Γ.entradas.length, n, 'una pregunta no produce evento');
    });
    await t.test('probeta 2: «solo registro» 2 ⇒ H = 10, A = 0, P = 0 (pendientes en pend⁰, no elegibles); las tres lecturas siguen en 10', () => {
      const s = vender('registrar', 2);
      assert.deepEqual(leer(), { físico: 10, libre: 10, prudente: 10, H: 10, A: 0, P: 0 });
      assert.equal(Dom.valorLugar(S(Γ).D, 'pend⁰', [s]), 2);
      assert.equal(Dom.carac(S(Γ).D, S(Γ).parametros, s, 'precio'), 35000);
    });
    await t.test('probeta 3: «demanda suave» 3 ⇒ P = 3; físico 10, libre 10, prudente 7', () => {
      sSuave = vender('pedido', 3);
      assert.deepEqual(leer(), { físico: 10, libre: 10, prudente: 7, H: 10, A: 0, P: 3 });
    });
    await t.test('probeta 4: «asignación firme» 4 = UN compromiso (lote venta + asignación) ⇒ A = 4; libre 6; prudente 3', () => {
      const n = Γ.entradas.length;
      vender('apartar', 4);
      assert.equal(Γ.entradas.length, n + 1);
      assert.deepEqual(Γ.entradas.at(-1).args.acciones.map(a => a.tipo), ['Nacer:pedido', 'Nacer:venta', 'Disparar:Vender', 'Disparar:Asignar']);
      assert.deepEqual(leer(), { físico: 10, libre: 6, prudente: 3, H: 10, A: 4, P: 3 });
    });
    await t.test('probeta 5: «inmediata» 2 (crear + asignar + despachar indivisible) ⇒ H = 8, A = 4, P = 3; libre 4; prudente 1; sin cobro inventado', () => {
      nAntesInmediata = Γ.entradas.length;
      const s = vender('entregarAhora', 2);
      assert.deepEqual(leer(), { físico: 8, libre: 4, prudente: 1, H: 8, A: 4, P: 3 });
      assert.deepEqual([Dom.valorLugar(S(Γ).D, 'cobrado', [s]), Dom.valorLugar(S(Γ).D, 'porCobrar', [s]), Dom.valorLugar(S(Γ).D, 'desp', [s])], [0, 70000, 2]);
    });
    await t.test('probeta 6: demanda suave 100 existe sin reserva (P = 103, prudente 0, H = 8); una venta firme de 5 se rechaza sin evento ni venta', () => {
      vender('pedido', 100);
      assert.deepEqual([leer().P, leer().prudente, leer().H], [103, 0, 8]);
      const n = ventas();
      rechazo(Γ, { u: 'dueño', ...Ref.plantillaLínea({ canal: 'POS' }, { variante: v, bodega: W, precio: 35000, cantidad: 5, modalidad: 'apartar' }) }, { resultado: 'INADMISIBLE', motivo: `negativo:libre[${K(W)},${K(v)}]` });
      assert.equal(ventas(), n);
    });
    await t.test('probeta 7 [L12]: asignar 2 desde la demanda suave de 3 ⇒ A 4 → 6, P 103 → 101, prudente sigue en 0 (sin doble descuento); el vendedor no puede', () => {
      ok(Γ, disparar('dueño', 'Asignar', { s: sSuave, q: 2 }));
      assert.deepEqual([leer().A, leer().P, leer().prudente, leer().libre], [6, 101, 0, 2]);
      rechazo(Γ, disparar('U1', 'Asignar', { s: sSuave, q: 1 }), { resultado: 'NO_AUTORIZADO' });
    });
    await t.test('probeta 8: cambiar el precio sugerido no reescribe los precios acordados', () => {
      ok(Γ, fijar('dueño', 'producto', 'precio', P1, 40000));
      const precios = Dom.entidades(S(Γ).D).filter(x => x.tipo === 'venta').map(x => Dom.carac(S(Γ).D, S(Γ).parametros, x.id, 'precio'));
      assert.ok(precios.every(p => p === 35000));
      assert.equal(Dom.carac(S(Γ).D, S(Γ).parametros, v, 'precio'), 40000);
    });
    await t.test('probeta 9: un corte anterior a la venta inmediata reconstruye H = 10; la cabeza vuelve a H = 8 sin cambiar Γ', () => {
      const n = Γ.entradas.length;
      assert.equal(C.consultar(Γ, Dom.PROYECCIONES.disponibilidad(W, v), nAntesInmediata).H, 10);
      assert.equal(C.consultar(Γ, Dom.PROYECCIONES.disponibilidad(W, v)).H, 8);
      assert.equal(Γ.entradas.length, n);
    });
    await t.test('probeta 11: repetir con el mismo sid y la misma carga ⇒ YA_COMPROMETIDO (idempotencia)', () => {
      const sol = { ...disparar('dueño', 'Ingresar', { w: W, v, q: 1 }), sid: 'abcd01' };
      const r = proponer(Γ, sol);
      assert.equal(r.resultado, 'COMPROMETIDO');
      assert.deepEqual(proponer(Γ, sol), { resultado: 'YA_COMPROMETIDO', i: r.n });
    });
    await t.test('probeta 13: el vendedor registra demanda suave en un producto visible; no puede contar ni reservar en firme', () => {
      vender('pedido', 1, 'U1');
      rechazo(Γ, disparar('U1', 'Contar', { w: W, v, h: 0 }), { resultado: 'NO_AUTORIZADO' });
      rechazo(Γ, { u: 'U1', ...Ref.plantillaLínea({ canal: 'POS' }, { variante: v, bodega: W, precio: 35000, cantidad: 1, modalidad: 'apartar' }) }, { resultado: 'NO_AUTORIZADO' });
      assert.deepEqual(Dom.auditoria(S(Γ).D, S(Γ).parametros), []);
    });
  });

  // ═════════════════════════ Anexo D · pedido, segunda línea y las cuatro modalidades ═════════════════════════
  test(`Oráculo D [${etiqueta}] pedido con varias líneas (rama «siguiente»), cuatro modalidades (tabla D.3), total y fibra del pedido`, async t => {
    const Dom = dom();
    const R = reg(Dom);
    const Γ = C.cauce(R, v2genesis(Dom, { 'nucleo.capacidades': { 'dueño': ['*'], caja: Ref.CAPACIDADES.cajero }, 'dominio.alcancePropio': { caja: Ref.ALCANCE.cajero } }));
    ok(Γ, nacer('dueño', 'bodega', { nombre: 'principal' }));
    ok(Γ, lote('dueño', nacer('dueño', 'producto', { nombre: 'P1', precio: 100, público: true }), nacer('dueño', 'variante', { producto: { nacido: 0 }, sku: 'A' }), nacer('dueño', 'variante', { producto: { nacido: 0 }, sku: 'B' })));
    const W = [1, 0], va = [2, 1], vb = [2, 2];
    ok(Γ, nacer('dueño', 'cliente', { nombre: 'Cliente' }));
    const cli = [3, 0];
    ok(Γ, disparar('dueño', 'Contar', { w: W, v: va, h: 20 }));
    ok(Γ, disparar('dueño', 'Contar', { w: W, v: vb, h: 20 }));
    const d = v => Dom.disponibilidad(S(Γ).D, S(Γ).parametros, W, v);
    const lug = (f, id) => Dom.valorLugar(S(Γ).D, f, [id]);
    let ρ, l1, l2, l3, l4;
    await t.test('primera línea: Lote[Nacer:pedido, Nacer:venta, …]; el pedido es @0 (i, 0) y la venta @1 (i, 1); el canal, el cliente y el actor viven en el pedido', () => {
      const n = ok(Γ, { u: 'dueño', ...Ref.plantillaLínea({ canal: 'POS', cliente: cli, actor: 'Tienda A' }, { variante: va, bodega: W, precio: 100, cantidad: 2, modalidad: 'entregarAhora' }) });
      ρ = [n, 0]; l1 = [n, 1];
      assert.deepEqual(Γ.entradas.at(-1).args.acciones.map(a => a.tipo), ['Nacer:pedido', 'Nacer:venta', 'Disparar:Vender', 'Disparar:Asignar', 'Disparar:Despachar']);
      const lec = lect(Dom, Γ);
      assert.deepEqual([lec.carac(l1, 'canal'), lec.carac(l1, 'cliente'), lec.carac(l1, 'actor')], ['POS', cli, 'Tienda A'], 'heredados del padre');
      assert.deepEqual(lec.ent().find(x => igual(x.id, l1)).padre, ρ);
      assert.equal(Dom.seccionPropia(S(Γ).D, l1).canal, undefined, 'VF12: la sección propia de la línea no tiene canal');
      assert.deepEqual([d(va).H, lug('desp', l1)], [18, 2]);
    });
    await t.test('segunda línea (rama «siguiente»): Lote[Nacer:venta{pedido: ρ}, …]; la venta es @0; canal y cliente NO se repiten', () => {
      const n = ok(Γ, { u: 'dueño', ...Ref.plantillaLínea(null, { variante: vb, bodega: W, precio: 50, cantidad: 3, modalidad: 'apartar' }, ρ) });
      l2 = Ref.idLínea(n, ρ);
      assert.deepEqual(l2, [n, 0]);
      assert.deepEqual(Γ.entradas.at(-1).args.acciones.map(a => a.tipo), ['Nacer:venta', 'Disparar:Vender', 'Disparar:Asignar']);
      assert.deepEqual(Dom.entidades(S(Γ).D).filter(x => x.tipo === 'pedido').length, 1, 'no hay un segundo pedido');
      assert.equal(lect(Dom, Γ).carac(l2, 'canal'), 'POS');
      assert.deepEqual([d(vb).A, d(vb).libre], [3, 17]);
    });
    await t.test('modalidades pedido y registrar en el mismo pedido (tabla D.3)', () => {
      l3 = Ref.idLínea(ok(Γ, { u: 'dueño', ...Ref.plantillaLínea(null, { variante: va, bodega: W, precio: 100, cantidad: 4, modalidad: 'pedido' }, ρ) }), ρ);
      l4 = Ref.idLínea(ok(Γ, { u: 'dueño', ...Ref.plantillaLínea(null, { variante: va, bodega: W, precio: 100, cantidad: 5, modalidad: 'registrar' }, ρ) }), ρ);
      const x = d(va);
      assert.deepEqual([x.H, x.P, x.P0, x.A, x.libre, x.prudente, x.noAsignada], [18, 4, 5, 0, 18, 14, 18]);
      assert.deepEqual([lug('pend', l3), lug('pend⁰', l4)], [4, 5]);
    });
    await t.test('total(ρ) = Σ q·p de los Vender; hijos(ρ, venta, pedido, F) devuelve las cuatro líneas; fibra(pedido, ρ, venta) = líneas de ρ', () => {
      const F = ['porCobrar', 'cobrado', 'reembolsado', 'anulado'];
      const h = C.consultar(Γ, Dom.PROYECCIONES.hijos(ρ, 'venta', 'pedido', F));
      assert.deepEqual(h.hijos, [l1, l2, l3, l4]);
      const total = Object.values(h.suma).reduce((a, b) => a + b, 0);
      assert.equal(total, 2 * 100 + 3 * 50 + 4 * 100 + 5 * 100);
      assert.deepEqual(h.sección, { canal: 'POS', cliente: cli, actor: 'Tienda A' });
      assert.deepEqual(Dom.fibra(S(Γ).D, S(Γ).parametros, 'pedido', ρ, 'venta').miembros, [l1, l2, l3, l4]);
      ok(Γ, disparar('dueño', 'Cobrar', { s: l1, x: 200 }));
      ok(Γ, disparar('dueño', 'Cancelar', { s: l3 }));
      const h2 = C.consultar(Γ, Dom.PROYECCIONES.hijos(ρ, 'venta', 'pedido', F));
      assert.equal(Object.values(h2.suma).reduce((a, b) => a + b, 0), total, 'cobrar y cancelar redistribuyen el valor entre las cuatro familias, no lo cambian');
      assert.deepEqual([h2.suma.cobrado, h2.suma.anulado], [200, 400]);
      assert.deepEqual(Dom.auditoria(S(Γ).D, S(Γ).parametros), []);
    });
    await t.test('el cajero opera su propio pedido y no el de otro; el propietario añade una línea al pedido de la caja y la línea sigue siendo de la caja', () => {
      const n = ok(Γ, { u: 'caja', ...Ref.plantillaLínea({ canal: 'Web' }, { variante: va, bodega: W, precio: 10, cantidad: 1, modalidad: 'pedido' }) });
      const ρc = [n, 0], lc = [n, 1];
      rechazo(Γ, { u: 'caja', ...Ref.plantillaLínea(null, { variante: va, bodega: W, precio: 10, cantidad: 1, modalidad: 'pedido' }, ρ) }, { resultado: 'INADMISIBLE', motivo: 'ajeno' }, 'una línea en el pedido del propietario');
      const m = ok(Γ, { u: 'dueño', ...Ref.plantillaLínea(null, { variante: va, bodega: W, precio: 10, cantidad: 1, modalidad: 'pedido' }, ρc) });
      assert.equal(Dom.dueño(S(Γ).D, [m, 0]), 'caja');
      assert.equal(Dom.entidades(S(Γ).D).find(x => igual(x.id, [m, 0])).creador, 'dueño');
      ok(Γ, disparar('caja', 'Cobrar', { s: [m, 0], x: 5 }));
      rechazo(Γ, disparar('caja', 'Cobrar', { s: l1, x: 1 }), { resultado: 'INADMISIBLE', motivo: 'ajeno' });
      assert.ok(lc);
    });
  });
}
