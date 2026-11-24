/**
 * ============================================================
 * CALCULADORES.JS — Motor de Cálculo Financeiro do Zentrix
 * ============================================================
 *
 * Funções puras (sem dependências de UI) para:
 * - Rateio mensal de compras parceladas e empréstimos
 * - Filtragem por período ('Este mês', 'Últimos 3 meses', 'Este ano', 'Tudo')
 * - Totais de gastos, valores a receber, saldo e média diária
 * - Agrupamento por categoria e evolução acumulada
 * - Comparativos reais (mês atual vs. mês anterior e vs. mesmo mês do ano anterior)
 */

import { CORES_CATEGORIAS } from '../constantes/cores.js';

export const PERIODOS_RELATORIO = {
  ESTE_MES: 'Este mês',
  ULTIMOS_3_MESES: 'Últimos 3 meses',
  ESTE_ANO: 'Este ano',
  TUDO: 'Tudo',
};

/**
 * Calcula quanto uma transação impacta em um mês/ano específico (mesAlvo: 0..11).
 *
 * - Débito / Crédito à Vista: conta 100% apenas no mês/ano exato de criação.
 * - Crédito Parcelado / Emprestado (parcelas > 1):
 *   conta `amount / installments_total` nos `installments_total` meses a partir da compra.
 */
export const obterValorNoMesEspecifico = (transacao, anoAlvo, mesAlvo) => {
  if (!transacao || transacao.status === 'deleted') return 0;

  const dataTransacao = new Date(transacao.created_at);
  if (isNaN(dataTransacao.getTime())) return 0;

  const valorTotal = parseFloat(transacao.amount || 0);
  if (isNaN(valorTotal) || valorTotal <= 0) return 0;

  const diffMeses =
    (anoAlvo - dataTransacao.getFullYear()) * 12 +
    (mesAlvo - dataTransacao.getMonth());

  const parcelas = Math.max(1, parseInt(transacao.installments_total || 1, 10));
  const tipo = transacao.type;

  if ((tipo === 'Crédito Parcelado' || tipo === 'Emprestado') && parcelas > 1) {
    if (diffMeses >= 0 && diffMeses < parcelas) {
      return valorTotal / parcelas;
    }
    return 0;
  }

  return diffMeses === 0 ? valorTotal : 0;
};

/**
 * Mantém compatibilidade direta para cálculos do mês corrente.
 */
export const obterValorNoMesAtual = (transacao, dataReferencia = new Date()) => {
  return obterValorNoMesEspecifico(
    transacao,
    dataReferencia.getFullYear(),
    dataReferencia.getMonth()
  );
};

/**
 * Retorna a lista de pares { ano, mes } que compõem o período selecionado.
 */
const obterMesesDoPeriodo = (periodo, dataReferencia = new Date()) => {
  const anoAtual = dataReferencia.getFullYear();
  const mesAtual = dataReferencia.getMonth();

  if (periodo === PERIODOS_RELATORIO.ULTIMOS_3_MESES) {
    const meses = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(anoAtual, mesAtual - i, 1);
      meses.push({ ano: d.getFullYear(), mes: d.getMonth() });
    }
    return meses;
  }

  if (periodo === PERIODOS_RELATORIO.ESTE_ANO) {
    const meses = [];
    for (let m = 0; m <= mesAtual; m++) {
      meses.push({ ano: anoAtual, mes: m });
    }
    return meses;
  }

  // Padrão: 'Este mês'
  return [{ ano: anoAtual, mes: mesAtual }];
};

/**
 * Calcula o valor efetivo de uma transação dentro do período selecionado.
 */
export const obterValorNoPeriodo = (
  transacao,
  periodo = PERIODOS_RELATORIO.ESTE_MES,
  dataReferencia = new Date()
) => {
  if (!transacao || transacao.status === 'deleted') return 0;

  if (periodo === PERIODOS_RELATORIO.TUDO) {
    const val = parseFloat(transacao.amount || 0);
    return isNaN(val) || val <= 0 ? 0 : val;
  }

  const meses = obterMesesDoPeriodo(periodo, dataReferencia);
  return meses.reduce(
    (acc, { ano, mes }) => acc + obterValorNoMesEspecifico(transacao, ano, mes),
    0
  );
};

// ===========================================
// CÁLCULOS DE TOTAIS (Suportam período opcional)
// ===========================================

export const calcularTotalGasto = (
  transacoes,
  periodo = PERIODOS_RELATORIO.ESTE_MES,
  dataReferencia = new Date()
) => {
  return (transacoes || [])
    .filter((t) => t.type !== 'Emprestado' && t.status !== 'deleted')
    .reduce((soma, t) => soma + obterValorNoPeriodo(t, periodo, dataReferencia), 0);
};

export const calcularTotalRecebido = (
  transacoes,
  periodo = PERIODOS_RELATORIO.ESTE_MES,
  dataReferencia = new Date()
) => {
  return (transacoes || [])
    .filter((t) => t.type === 'Emprestado' && t.status !== 'deleted')
    .reduce((soma, t) => soma + obterValorNoPeriodo(t, periodo, dataReferencia), 0);
};

export const calcularSaldo = (
  transacoes,
  periodo = PERIODOS_RELATORIO.ESTE_MES,
  dataReferencia = new Date()
) => {
  return (
    calcularTotalRecebido(transacoes, periodo, dataReferencia) -
    calcularTotalGasto(transacoes, periodo, dataReferencia)
  );
};

export const calcularMediaDiaria = (
  transacoes,
  periodo = PERIODOS_RELATORIO.ESTE_MES,
  dataReferencia = new Date()
) => {
  const totalGasto = calcularTotalGasto(transacoes, periodo, dataReferencia);
  if (totalGasto === 0) return 0;

  let dias = Math.max(1, dataReferencia.getDate());

  if (periodo === PERIODOS_RELATORIO.ULTIMOS_3_MESES) {
    const inicio = new Date(dataReferencia.getFullYear(), dataReferencia.getMonth() - 2, 1);
    dias = Math.max(1, Math.ceil((dataReferencia - inicio) / (1000 * 60 * 60 * 24)) + 1);
  } else if (periodo === PERIODOS_RELATORIO.ESTE_ANO) {
    const inicioAno = new Date(dataReferencia.getFullYear(), 0, 1);
    dias = Math.max(1, Math.ceil((dataReferencia - inicioAno) / (1000 * 60 * 60 * 24)) + 1);
  } else if (periodo === PERIODOS_RELATORIO.TUDO) {
    const datasValidas = (transacoes || [])
      .map((t) => new Date(t.created_at))
      .filter((d) => !isNaN(d.getTime()));
    if (datasValidas.length > 0) {
      const menorData = new Date(Math.min(...datasValidas));
      dias = Math.max(1, Math.ceil((dataReferencia - menorData) / (1000 * 60 * 60 * 24)) + 1);
    }
  }

  return totalGasto / dias;
};

// ===========================================
// CÁLCULOS POR CATEGORIA
// ===========================================

export const calcularGastosPorCategoria = (
  transacoes,
  periodo = PERIODOS_RELATORIO.ESTE_MES,
  dataReferencia = new Date()
) => {
  const agrupado = {};

  (transacoes || [])
    .filter((t) => t.type !== 'Emprestado' && t.status !== 'deleted')
    .forEach((t) => {
      const valorPeriodo = obterValorNoPeriodo(t, periodo, dataReferencia);
      if (valorPeriodo > 0) {
        const categoria = t.category || 'Outros';
        agrupado[categoria] = (agrupado[categoria] || 0) + valorPeriodo;
      }
    });

  const totalGeral = Object.values(agrupado).reduce((soma, v) => soma + v, 0);

  return Object.entries(agrupado)
    .map(([nome, valor]) => ({
      nome,
      valor,
      porcentagem: totalGeral > 0 ? (valor / totalGeral) * 100 : 0,
      cor: CORES_CATEGORIAS[nome] || CORES_CATEGORIAS['Outros'],
    }))
    .sort((a, b) => b.valor - a.valor);
};

// ===========================================
// CÁLCULOS PARA GRÁFICO DE EVOLUÇÃO
// ===========================================

export const calcularEvolucaoGastos = (
  transacoes,
  periodo = PERIODOS_RELATORIO.ESTE_MES,
  dataReferencia = new Date()
) => {
  const despesasPeriodo = (transacoes || [])
    .filter((t) => t.type !== 'Emprestado' && t.status !== 'deleted')
    .map((t) => ({
      ...t,
      valorPeriodo: obterValorNoPeriodo(t, periodo, dataReferencia),
    }))
    .filter((t) => t.valorPeriodo > 0)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  if (despesasPeriodo.length === 0) {
    return { labels: [], valores: [] };
  }

  const labels = [];
  const valores = [];
  let acumulado = 0;

  despesasPeriodo.forEach((t) => {
    acumulado += t.valorPeriodo;
    const data = new Date(t.created_at);
    const label = `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`;
    labels.push(label);
    valores.push(Number(acumulado.toFixed(2)));
  });

  return { labels, valores };
};

// ===========================================
// COMPARATIVO REAL (Mês Anterior e Ano Anterior)
// ===========================================

export const calcularComparativoGastos = (transacoes, dataReferencia = new Date()) => {
  const anoAtual = dataReferencia.getFullYear();
  const mesAtual = dataReferencia.getMonth();

  const dataMesAnterior = new Date(anoAtual, mesAtual - 1, 1);
  const anoMesAnterior = dataMesAnterior.getFullYear();
  const mesAnterior = dataMesAnterior.getMonth();

  const despesas = (transacoes || []).filter(
    (t) => t.type !== 'Emprestado' && t.status !== 'deleted'
  );

  const gastoAtual = despesas.reduce(
    (s, t) => s + obterValorNoMesEspecifico(t, anoAtual, mesAtual),
    0
  );
  const gastoMesAnterior = despesas.reduce(
    (s, t) => s + obterValorNoMesEspecifico(t, anoMesAnterior, mesAnterior),
    0
  );
  const gastoAnoAnterior = despesas.reduce(
    (s, t) => s + obterValorNoMesEspecifico(t, anoAtual - 1, mesAtual),
    0
  );

  const montarComparacao = (atual, base, labelPeriodo) => {
    if (base <= 0) {
      return {
        valorBase: 0,
        variacaoPercentual: null,
        subiu: atual > 0,
        semHistorico: true,
        descricao: atual > 0
          ? `Sem registros em ${labelPeriodo} para comparar`
          : `Sem gastos registrados nos dois períodos`,
      };
    }

    const variacao = ((atual - base) / base) * 100;
    const subiu = variacao > 0;
    return {
      valorBase: base,
      variacaoPercentual: variacao,
      subiu,
      semHistorico: false,
      descricao:
        Math.abs(variacao) < 0.1
          ? `Gasto estável em relação a ${labelPeriodo}`
          : subiu
          ? `Você gastou mais que ${labelPeriodo}`
          : `Você economizou em relação a ${labelPeriodo}`,
    };
  };

  return {
    gastoAtual,
    mesAnterior: montarComparacao(gastoAtual, gastoMesAnterior, 'o mês anterior'),
    anoAnterior: montarComparacao(gastoAtual, gastoAnoAnterior, 'o ano anterior'),
  };
};

// ===========================================
// FILTROS DE TRANSAÇÕES
// ===========================================

export const filtrarPorTipo = (transacoes, filtro) => {
  const ativas = (transacoes || []).filter((t) => t.status !== 'deleted');
  switch (filtro) {
    case 'entradas':
      return ativas.filter((t) => t.type === 'Emprestado');
    case 'saidas':
      return ativas.filter((t) => t.type !== 'Emprestado');
    default:
      return ativas;
  }
};

export const filtrarPorCategoria = (transacoes, categoria) => {
  const ativas = (transacoes || []).filter((t) => t.status !== 'deleted');
  if (categoria === 'todas' || !categoria) return ativas;
  return ativas.filter((t) => t.category === categoria);
};

export const filtrarMesAtual = (transacoes, dataReferencia = new Date()) => {
  return (transacoes || []).filter(
    (t) => t.status !== 'deleted' && obterValorNoMesAtual(t, dataReferencia) > 0
  );
};
