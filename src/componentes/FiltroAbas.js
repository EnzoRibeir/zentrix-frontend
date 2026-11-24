/**
 * ============================================================
 * FILTRO_ABAS.JS — Componente de Abas/Tabs Horizontais
 * ============================================================
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTema } from '../contextos/TemaContexto';
import { TIPOGRAFIA } from '../constantes/tipografia';
import { ESPACAMENTOS } from '../constantes/espacamentos';

const FiltroAbas = ({ abas, abaSelecionada, aoSelecionarAba }) => {
  const { CORES } = useTema();
  const estilos = criarEstilos(CORES);

  return (
    <View style={estilos.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={estilos.scrollConteudo}
      >
        {abas.map((aba) => {
          const estaSelecionada = aba === abaSelecionada;
          return (
            <TouchableOpacity
              key={aba}
              style={[estilos.aba, estaSelecionada && estilos.abaSelecionada]}
              onPress={() => aoSelecionarAba(aba)}
              activeOpacity={0.7}
            >
              <Text
                numberOfLines={1}
                style={[
                  estilos.abaTexto,
                  estaSelecionada && estilos.abaTextoSelecionado,
                ]}
              >
                {aba}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const criarEstilos = (CORES) =>
  StyleSheet.create({
    container: {
      backgroundColor: CORES.branco,
      borderRadius: ESPACAMENTOS.raioBordaCompleto,
      padding: 4,
      marginBottom: ESPACAMENTOS.espacoEntreCards,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    scrollConteudo: {
      flexDirection: 'row',
      flexGrow: 1,
      justifyContent: 'space-between',
      gap: 4,
    },
    aba: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: ESPACAMENTOS.raioBordaCompleto,
      alignItems: 'center',
      justifyContent: 'center',
    },
    abaSelecionada: {
      backgroundColor: CORES.principal,
    },
    abaTexto: {
      ...TIPOGRAFIA.corpoPequeno,
      fontSize: 13,
      color: CORES.textoSecundario,
    },
    abaTextoSelecionado: {
      color: CORES.branco,
    },
  });

export default FiltroAbas;
