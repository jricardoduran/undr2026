// Kobalt · núcleo · sha256 — FRONTERA CRIPTOGRÁFICA del núcleo.
//
// Correspondencia:  SHA‑256 (FIPS 180‑4) ↔ sha256(bytes) → Uint8Array(32)
//
// Es el único punto del núcleo que depende de una primitiva criptográfica. Todo 𝔇 pasa por aquí.
//
// Elección [D]: SHA‑256 SÍNCRONO, escrito en JavaScript puro (sin node:crypto ni crypto.subtle).
//   - 𝔇 forma parte del núcleo puro: `hashPaso`, la proyección incremental Π_cabeza (g_e(n,h) = (n+1, 𝔇(T_P,h,Enc(e))))
//     y la verificación de cadena son funciones puras. Con `crypto.subtle.digest` (solo asíncrono) toda función pura
//     que derive un hash se volvería una Promesa, y la materialidad tendría que esperar a WebCrypto: §5.5 de la spec
//     advierte que una transacción IndexedDB se cierra sola si espera a una promesa ajena.
//   - `node:crypto` es síncrono pero no existe en el navegador; usarlo exigiría dos realizaciones (y dos caminos que
//     podrían divergir) según el entorno.
//   - Una sola realización en JS puro se comporta igual en Node 22 y en el navegador, es determinista, no hace I/O y
//     se verifica contra `KOB2.View.derive` (WebCrypto) en las pruebas del contrato (200 entradas aleatorias + vectores).
// Si en el futuro se prefiere la primitiva nativa, basta sustituir ESTE archivo por otra realización de la misma
// función (misma firma); ningún otro módulo cambia.
//
// [L] Esta función no es de tiempo constante; el núcleo solo deriva hashes de datos públicos (cadena, sid, snapshots).

const K = new Int32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
const H0 = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
const W = new Int32Array(64); // espacio de trabajo; la función es reentrante porque es síncrona y no cede el control

/** SHA‑256(m) → 32 bytes. Pura y síncrona. */
export function sha256(m) {
  if (!(m instanceof Uint8Array)) throw new TypeError('sha256: se esperaban bytes');
  const largo = m.length;
  const bloques = Math.ceil((largo + 9) / 64);
  const buf = new Uint8Array(bloques * 64);
  buf.set(m);
  buf[largo] = 0x80;
  const dv = new DataView(buf.buffer);
  const bits = largo * 8; // < 2^56 porque largo es un entero seguro de un Uint8Array real
  dv.setUint32(buf.length - 8, Math.floor(bits / 0x100000000));
  dv.setUint32(buf.length - 4, bits >>> 0);

  let h0 = H0[0] | 0, h1 = H0[1] | 0, h2 = H0[2] | 0, h3 = H0[3] | 0, h4 = H0[4] | 0, h5 = H0[5] | 0, h6 = H0[6] | 0, h7 = H0[7] | 0;
  for (let off = 0; off < buf.length; off += 64) {
    for (let t = 0; t < 16; t++) W[t] = dv.getInt32(off + 4 * t);
    for (let t = 16; t < 64; t++) {
      const x = W[t - 15], y = W[t - 2];
      const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
      const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let t = 0; t < 64; t++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[t] + W[t]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }
  const out = new Uint8Array(32);
  const dvo = new DataView(out.buffer);
  [h0, h1, h2, h3, h4, h5, h6, h7].forEach((x, i) => dvo.setInt32(4 * i, x));
  return out;
}
