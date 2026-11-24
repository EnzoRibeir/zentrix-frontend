/**
 * ============================================================
 * GRAFICO_EVOLUCAO.JS — Gráfico de Linha (Evolução de Gastos)
 * ============================================================
 *
 * Responsivo (useWindowDimensions) e compatível com Modo Claro/Escuro.
 */

import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTema } from '../contextos/TemaContexto';
import { TIPOGRAFIA } from '../constantes/tipografia';
import { ESPACAMENTOS } from '../constantes/espacamentos';

const GraficoEvolucao = ({ labels, valores, titulo }) => {
  const { CORES, isEscuro } = useTema();
  const { width: larguraJanela } = useWindowDimensions();
  const estilos = criarEstilos(CORES);

  if (!valores || valores.length === 0) {
    return (
      <View style={estilos.container}>
        <Text style={estilos.titulo}>{titulo}</Text>
        <Text style={estilos.semDados}>Sem dados para exibir neste período</Text>
      </View>
    );
  }

  const larguraGrafico = Math.max(
    240,
    larguraJanela - ESPACAMENTOS.margemHorizontal * 2 - ESPACAMENTOS.paddingCard * 2
  );

  // LineChart exige ao menos 2 pontos para desenhar curva suave sem NaN no SVG
  const labelsSeguro = valores.length === 1 ? [labels[0], labels[0]] : labels;
  const valoresSeguro = valores.length === 1 ? [0, valores[0]] : valores;

  const passo = Math.max(1, Math.floor(labelsSeguro.length / 6));
  const labelsReduzidos = labelsSeguro.map((lbl, i) =>
    i % passo === 0 || i === labelsSeguro.length - 1 ? lbl : ''
  );

  const corLinhaRGB = isEscuro ? '163, 206, 241' : '39, 76, 119';
  const corLabelRGB = isEscuro ? '160, 160, 160' : '138, 141, 141';

  return (
    <View style={estilos.container}>
      <Text style={estilos.titulo}>{titulo}</Text>

      <LineChart
        data={{
          labels: labelsReduzidos,
          datasets: [{ data: valoresSeguro }],
        }}
        width={larguraGrafico}
        height={200}
        yAxisLabel="R$"
        yAxisSuffix=""
        chartConfig={{
          backgroundColor: CORES.branco,
          backgroundGradientFrom: CORES.branco,
          backgroundGradientTo: CORES.branco,
          decimalPlaces: 0,
          color: (opacidade = 1) => `rgba(${corLinhaRGB}, ${opacidade})`,
          labelColor: (opacidade = 1) => `rgba(${corLabelRGB}, ${opacidade})`,
          style: { borderRadius: 16 },
          propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: CORES.principal,
          },
          propsForBackgroundLines: {
            strokeDasharray: '',
            stroke: CORES.borda,
            strokeWidth: 1,
          },
          fillShadowGradient: CORES.destaque,
          fillShadowGradientOpacity: 0.3,
        }}
        bezier
        style={estilos.grafico}
        withInnerLines={true}
        withOuterLines={false}
        withShadow={true}
      />
    </View>
  );
};

const criarEstilos = (CORES) =>
  StyleSheet.create({
    container: {
      backgroundColor: CORES.branco,
      borderRadius: ESPACAMENTOS.raioBorda,
      padding: ESPACAMENTOS.paddingCard,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    titulo: {
      ...TIPOGRAFIA.subtitulo,
      color: CORES.textoPrincipal,
      marginBottom: 16,
    },
    grafico: {
      borderRadius: 16,
      marginLeft: -16,
    },
    semDados: {
      ...TIPOGRAFIA.corpo,
      color: CORES.textoSecundario,
      textAlign: 'center',
      paddingVertical: 40,
    },
  });

export default GraficoEvolucao;
