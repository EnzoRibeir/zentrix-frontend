/**
 * ============================================================
 * NAVEGACAO_PRINCIPAL.JS — Configuração de Navegação do App
 * ============================================================
 *
 * Navegação reativa ao estado de autenticação (AuthContexto):
 * - Durante verificação inicial → TelaInicializacao (Splash)
 * - Usuário deslogado (ou sessão expirada 401) → TelaLogin
 * - Usuário autenticado → Stack Principal + Telas internas
 */

import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTema } from '../contextos/TemaContexto';
import { useAuth } from '../contextos/AuthContexto';
import { TIPOGRAFIA } from '../constantes/tipografia';

// Telas
import TelaInicializacao from '../telas/TelaInicializacao';
import TelaLogin from '../telas/TelaLogin';
import TelaInicial from '../telas/TelaInicial';
import TelaTransacoes from '../telas/TelaTransacoes';
import TelaRelatorios from '../telas/TelaRelatorios';
import TelaPerfil from '../telas/TelaPerfil';
import TelaDetalhesTransacao from '../telas/TelaDetalhesTransacao';
import TelaNotificacoes from '../telas/TelaNotificacoes';
import TelaCategorias from '../telas/TelaCategorias';

// Componentes
import ModalNovaTransacao from '../componentes/ModalNovaTransacao';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TelaVazia = () => null;

const BotaoCentralTabBar = ({ aoClicar }) => {
  const { CORES } = useTema();
  const estilos = criarEstilos(CORES);

  return (
    <TouchableOpacity
      style={estilos.botaoCentral}
      onPress={aoClicar}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Nova Transação"
    >
      <View style={estilos.botaoCentralInterno}>
        <Feather name="plus" size={28} color={CORES.principal} />
      </View>
    </TouchableOpacity>
  );
};

const TabNavigator = () => {
  const { CORES } = useTema();
  const insets = useSafeAreaInsets();
  const [modalVisivel, setModalVisivel] = useState(false);

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: CORES.branco,
          tabBarInactiveTintColor: CORES.destaque,
          tabBarLabelStyle: {
            ...TIPOGRAFIA.legenda,
            fontSize: 11,
            lineHeight: 14,
            marginTop: 2,
          },
          tabBarStyle: {
            backgroundColor: CORES.principal,
            borderTopWidth: 0,
            height: 66 + Math.max(8, insets.bottom),
            paddingTop: 6,
            paddingBottom: Math.max(10, insets.bottom),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 10,
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={TelaInicial}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Feather name="home" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Transações"
          component={TelaTransacoes}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Feather name="list" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="NovaTransacao"
          component={TelaVazia}
          options={{
            tabBarLabel: () => null,
            tabBarIcon: () => null,
            tabBarButton: () => (
              <BotaoCentralTabBar aoClicar={() => setModalVisivel(true)} />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setModalVisivel(true);
            },
          }}
        />
        <Tab.Screen
          name="Relatórios"
          component={TelaRelatorios}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Feather name="pie-chart" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Perfil"
          component={TelaPerfil}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Feather name="user" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>

      <ModalNovaTransacao
        visivel={modalVisivel}
        aoFechar={() => setModalVisivel(false)}
      />
    </>
  );
};

const NavegacaoPrincipal = React.forwardRef((props, ref) => {
  const { logado, verificandoSessao } = useAuth();
  const [exibindoSplash, setExibindoSplash] = useState(true);

  useEffect(() => {
    if (verificandoSessao) return;
    const timer = setTimeout(() => {
      setExibindoSplash(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, [verificandoSessao]);

  if (verificandoSessao || exibindoSplash) {
    return <TelaInicializacao />;
  }

  return (
    <NavigationContainer ref={ref}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {!logado ? (
          <Stack.Screen name="Login" component={TelaLogin} options={{ animation: 'fade' }} />
        ) : (
          <>
            <Stack.Screen name="Principal" component={TabNavigator} options={{ animation: 'fade' }} />
            <Stack.Screen name="DetalhesTransacao" component={TelaDetalhesTransacao} />
            <Stack.Screen name="Notificacoes" component={TelaNotificacoes} />
            <Stack.Screen name="Categorias" component={TelaCategorias} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
});

NavegacaoPrincipal.displayName = 'NavegacaoPrincipal';

const criarEstilos = (CORES) =>
  StyleSheet.create({
    botaoCentral: {
      top: -20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    botaoCentralInterno: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: CORES.destaque,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: CORES.branco,
      shadowColor: CORES.principal,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
  });

export default NavegacaoPrincipal;
