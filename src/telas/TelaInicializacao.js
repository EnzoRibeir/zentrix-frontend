/**
 * ============================================================
 * TELA_INICIALIZACAO.JS — Splash Screen Animada do Zentrix
 * ============================================================
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTema } from '../contextos/TemaContexto';
import { TIPOGRAFIA } from '../constantes/tipografia';

const TelaInicializacao = () => {
  const { CORES } = useTema();
  const estilos = criarEstilos(CORES);

  const opacidade = useRef(new Animated.Value(0)).current;
  const escala = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacidade, {
        toValue: 1,
        duration: 800,
        useNativeDriver: PlatformUsesNativeDriver,
      }),
      Animated.spring(escala, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: PlatformUsesNativeDriver,
      }),
    ]).start();
  }, [opacidade, escala]);

  return (
    <View style={estilos.container}>
      <Animated.View
        style={[
          estilos.containerLogo,
          {
            opacity: opacidade,
            transform: [{ scale: escala }],
          },
        ]}
      >
        <View style={estilos.logoIcone}>
          <Feather name="trending-up" size={40} color={CORES.branco} />
        </View>
        <Text style={estilos.logoTexto}>Zentrix</Text>
        <Text style={estilos.logoSubtexto}>Controle Financeiro Inteligente</Text>
      </Animated.View>
    </View>
  );
};

const PlatformUsesNativeDriver = typeof document === 'undefined';

const criarEstilos = (CORES) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: CORES.fundo,
      justifyContent: 'center',
      alignItems: 'center',
    },
    containerLogo: {
      alignItems: 'center',
    },
    logoIcone: {
      width: 80,
      height: 80,
      borderRadius: 20,
      backgroundColor: CORES.principal,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
      shadowColor: CORES.principal,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
    },
    logoTexto: {
      ...TIPOGRAFIA.valorDestaque,
      color: CORES.principal,
      letterSpacing: 2,
    },
    logoSubtexto: {
      ...TIPOGRAFIA.corpoPequeno,
      color: CORES.textoSecundario,
      marginTop: 8,
    },
  });

export default TelaInicializacao;
