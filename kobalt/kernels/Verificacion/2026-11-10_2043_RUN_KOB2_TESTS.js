/** KOBALT — corredor añadido en la consolidación; no modifica releases originales.
 * Ejecutar desde cualquier directorio: node Verificacion/2026-11-10_2043_RUN_KOB2_TESTS.js
 */
'use strict';
const path = require('node:path');
const fs = require('node:fs');
const dir = path.resolve(__dirname, '..');
const K = require(path.join(dir, 'KOB2', '2026-09-18_0100_KOB2_KERNEL_9_0_1.js'));
const M = require(path.join(dir, 'KOB2', '2026-09-18_0100_KOBALT_MECHANISMS_1_0_0.js'));
(async () => {
  const kernel = await K.Tests.selfTest();
  const mechanisms = await M.Tests.selfTest();
  const knownAnswer = await K.Tests.knownAnswerTest();
  const report = {
    source: 'pruebas expuestas por los JavaScript originales; runner añadido por consolidación',
    node: process.version,
    kernel: {
      release: K.release, passed: kernel.passed, total: kernel.count, pass: kernel.pass,
      tests: kernel.tests.map(({name, pass, error}) => ({name, pass, ...(error ? {error} : {})})),
    },
    mechanisms: {
      release: M.release, passed: mechanisms.passed, total: mechanisms.count, pass: mechanisms.pass,
      tests: mechanisms.tests.map(({name, pass, error}) => ({name, pass, ...(error ? {error} : {})})),
    },
    knownAnswer: {pass: knownAnswer.pass, checks: knownAnswer.checks},
  };
  const out = path.join(__dirname, '2026-11-10_2043_KOB2_TEST_RESULTS.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  console.log(`KOB2 ${kernel.passed}/${kernel.count}, Mechanisms ${mechanisms.passed}/${mechanisms.count}, KAT ${knownAnswer.pass ? 'PASS' : 'FAIL'}`);
  if (!kernel.pass || !mechanisms.pass || !knownAnswer.pass) process.exitCode = 1;
})().catch(e => {console.error(e); process.exitCode = 1;});
