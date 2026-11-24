import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PERIODOS_RELATORIO,
  obterValorNoMesEspecifico,
  obterValorNoMesAtual,
  calcularTotalGasto,
  calcularTotalRecebido,
  calcularSaldo,
  calcularGastosPorCategoria,
  calcularEvolucaoGastos,
  calcularComparativoGastos,
  filtrarPorTipo,
  filtrarPorCategoria,
} from '../src/utilitarios/calculadores.js';

import {
  formatarMoeda,
  formatarDataCurta,
  formatarHora,
  agruparPorData,
} from '../src/utilitarios/formatadores.js';

const DATA_REF = new Date('2026-11-24T12:00:00'); // Novembro/2026 (mês 10)

const TRANSACOES_MOCK = [
  {
    id: 'tx-avista-nov',
    description: 'iFood Jantar',
    amount: 80,
    category: 'Rangos',
    type: 'Débito',
    installments_total: 1,
    status: 'active',
    created_at: '2026-11-10T20:30:00',
  },
  {
    id: 'tx-parcelado-set',
    description: 'Fone Bluetooth',
    amount: 300,
    category: 'Compras e Mimos',
    type: 'Crédito Parcelado',
    installments_total: 3, // Set (1/3), Out (2/3), Nov (3/3) => R$ 100/mês
    status: 'active',
    created_at: '2026-09-15T14:00:00',
  },
  {
    id: 'tx-parcelado-expirado',
    description: 'Compra Antiga',
    amount: 200,
    category: 'Outros',
    type: 'Crédito Parcelado',
    installments_total: 2, // Jun e Jul => 0 em Nov
    status: 'active',
    created_at: '2026-06-05T10:00:00',
  },
  {
    id: 'tx-emprestado-out',
    description: 'Empréstimo João',
    amount: 400,
    category: 'A receber',
    type: 'Emprestado',
    installments_total: 2, // Out (200) e Nov (200)
    status: 'active',
    created_at: '2026-10-12T09:00:00',
  },
  {
    id: 'tx-outubro-avista',
    description: 'Uber Outubro',
    amount: 50,
    category: 'Transporte',
    type: 'Crédito à Vista',
    installments_total: 1,
    status: 'active',
    created_at: '2026-10-20T18:15:00',
  },
  {
    id: 'tx-nov-ano-passado',
    description: 'Supermercado 2025',
    amount: 200,
    category: 'Essencial',
    type: 'Débito',
    installments_total: 1,
    status: 'active',
    created_at: '2025-11-11T11:00:00',
  },
  {
    id: 'tx-deletada',
    description: 'Item Deletado',
    amount: 999,
    category: 'Outros',
    type: 'Débito',
    installments_total: 1,
    status: 'deleted',
    created_at: '2026-11-22T11:00:00',
  },
];

test('obterValorNoMesEspecifico e obterValorNoMesAtual rateiam parcelas e ignoram deletadas', () => {
  assert.equal(obterValorNoMesAtual(TRANSACOES_MOCK[0], DATA_REF), 80);
  assert.equal(obterValorNoMesAtual(TRANSACOES_MOCK[1], DATA_REF), 100);
  assert.equal(obterValorNoMesAtual(TRANSACOES_MOCK[2], DATA_REF), 0);
  assert.equal(obterValorNoMesAtual(TRANSACOES_MOCK[6], DATA_REF), 0);
  // Dezembro/2026: parcela 3/3 de Setembro já terá acabado
  assert.equal(obterValorNoMesEspecifico(TRANSACOES_MOCK[1], 2026, 11), 0);
});

test('calcularTotalGasto, calcularTotalRecebido e calcularSaldo separam Emprestado corretamente', () => {
  // Em Nov/2026: iFood (80) + Fone 3ª parcela (100) = 180 de gasto
  const gastoMes = calcularTotalGasto(TRANSACOES_MOCK, PERIODOS_RELATORIO.ESTE_MES, DATA_REF);
  assert.equal(gastoMes, 180);

  // Em Nov/2026: Empréstimo João 2ª parcela = 200 a receber
  const recebidoMes = calcularTotalRecebido(TRANSACOES_MOCK, PERIODOS_RELATORIO.ESTE_MES, DATA_REF);
  assert.equal(recebidoMes, 200);

  assert.equal(calcularSaldo(TRANSACOES_MOCK, PERIODOS_RELATORIO.ESTE_MES, DATA_REF), 20);
});

test('filtros por período (Últimos 3 meses, Este ano, Tudo) calculam somas exatas', () => {
  // Últimos 3 meses (Set, Out, Nov 2026):
  // iFood Nov (80) + Fone Set/Out/Nov (100*3=300) + Uber Out (50) = 430
  const gasto3Meses = calcularTotalGasto(
    TRANSACOES_MOCK,
    PERIODOS_RELATORIO.ULTIMOS_3_MESES,
    DATA_REF
  );
  assert.equal(gasto3Meses, 430);

  // Este ano (Jan..Nov 2026): 430 + Compra Antiga Jun/Jul (100*2=200) = 630
  const gastoAno = calcularTotalGasto(TRANSACOES_MOCK, PERIODOS_RELATORIO.ESTE_ANO, DATA_REF);
  assert.equal(gastoAno, 630);

  // Tudo (inclui Nov/2025 = 200): 630 + 200 = 830
  const gastoTudo = calcularTotalGasto(TRANSACOES_MOCK, PERIODOS_RELATORIO.TUDO, DATA_REF);
  assert.equal(gastoTudo, 830);
});

test('calcularComparativoGastos calcula variação real contra mês anterior e ano anterior', () => {
  const comp = calcularComparativoGastos(TRANSACOES_MOCK, DATA_REF);
  // Gasto Nov/2026 = 180
  // Gasto Out/2026 = Fone (100) + Uber (50) = 150 -> (180 - 150)/150 = +20%
  // Gasto Nov/2025 = Supermercado (200) -> (180 - 200)/200 = -10%
  assert.equal(comp.gastoAtual, 180);
  assert.equal(comp.mesAnterior.valorBase, 150);
  assert.equal(Math.round(comp.mesAnterior.variacaoPercentual), 20);
  assert.equal(comp.mesAnterior.subiu, true);

  assert.equal(comp.anoAnterior.valorBase, 200);
  assert.equal(Math.round(comp.anoAnterior.variacaoPercentual), -10);
  assert.equal(comp.anoAnterior.subiu, false);
});

test('calcularGastosPorCategoria e calcularEvolucaoGastos estruturam dados corretamente', () => {
  const cats = calcularGastosPorCategoria(TRANSACOES_MOCK, PERIODOS_RELATORIO.ESTE_MES, DATA_REF);
  assert.equal(cats.length, 2);
  assert.equal(cats[0].nome, 'Compras e Mimos');
  assert.equal(cats[0].valor, 100);
  assert.equal(cats[1].nome, 'Rangos');
  assert.equal(cats[1].valor, 80);

  const evol = calcularEvolucaoGastos(TRANSACOES_MOCK, PERIODOS_RELATORIO.ESTE_MES, DATA_REF);
  assert.deepEqual(evol.valores, [100, 180]);
});

test('filtrarPorTipo, filtrarPorCategoria e formatadores funcionam sem regressão', () => {
  const entradas = filtrarPorTipo(TRANSACOES_MOCK, 'entradas');
  assert.equal(entradas.length, 1);
  assert.equal(entradas[0].id, 'tx-emprestado-out');

  const rangos = filtrarPorCategoria(TRANSACOES_MOCK, 'Rangos');
  assert.equal(rangos.length, 1);

  assert.match(formatarMoeda(1234.5), /1\.234,50/);
  assert.equal(formatarDataCurta('2026-11-10T20:30:00'), '10/11/2026');
  assert.equal(formatarHora('2026-11-10T20:30:00'), '20:30');

  const grupos = agruparPorData(TRANSACOES_MOCK.slice(0, 2));
  assert.equal(grupos.length, 2);
});
