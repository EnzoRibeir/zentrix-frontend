/**
 * ============================================================
 * CARTAO_RESUMO.JS — Card de Resumo Financeiro
 * ============================================================
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTema } from '../contextos/TemaContexto';
import { TIPOGRAFIA } from '../constantes/tipografia';
import { ESPACAMENTOS } from '../constantes/espacamentos';

const CartaoResumo = ({ icone, label, valor, corValor, corIcone, onPress }) => {
  const { CORES } = useTema();
  const estilos = criarEstilos(CORES);
  const corDoIcone = corIcone || CORES.principal;
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper style={estilos.container} onPress={onPress} activeOpacity={0.7}>
      <View style={[estilos.containerIcone, { backgroundColor: `${corDoIcone}15` }]}>
        <Feather name={icone} size={20} color={corDoIcone} />
      </View>

      <View style={estilos.containerTexto}>
        <Text style={estilos.label} numberOfLines={1}>
          {label}
        </Text>
        <Text
          style={[estilos.valor, corValor && { color: corValor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {valor}
        </Text>
      </View>
    </Wrapper>
  );
};

const criarEstilos = (CORES) =>
  StyleSheet.create({
    container: {
      backgroundColor: CORES.branco,
      borderRadius: ESPACAMENTOS.raioBorda,
      paddingHorizontal: 14,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      minWidth: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    containerIcone: {
      width: 38,
      height: 38,
      borderRadius: 11,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
      flexShrink: 0,
    },
    containerTexto: {
      flex: 1,
      minWidth: 0,
    },
    label: {
      ...TIPOGRAFIA.legenda,
      fontSize: 11,
      color: CORES.textoSecundario,
      marginBottom: 2,
    },
    valor: {
      ...TIPOGRAFIA.corpo,
      fontSize: 15,
      color: CORES.textoPrincipal,
    },
  });

export default CartaoResumo;
