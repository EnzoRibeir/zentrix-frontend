/**
 * ============================================================
 * APP.JS — Entry Point do App Zentrix
 * ============================================================
 */

import React, { useEffect, useRef } from 'react';
import { StatusBar, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Itim_400Regular } from '@expo-google-fonts/itim';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/contextos/AuthContexto';
import { TransacoesProvider } from './src/contextos/TransacoesContexto';
import { TemaProvider, useTema } from './src/contextos/TemaContexto';
import { NotificacoesProvider } from './src/contextos/NotificacoesContexto';
import NavegacaoPrincipal from './src/navegacao/NavegacaoPrincipal';
import CarregandoIndicador from './src/componentes/CarregandoIndicador';

// Referência de navegação global para redirecionar ao tocar em notificações
export const navegacaoRef = React.createRef();

const AppContent = () => {
  const { isEscuro, CORES } = useTema();
  const notificacaoTocadaListener = useRef(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    // Listener: usuário TOCOU em uma notificação (app em background ou fechado)
    notificacaoTocadaListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const dados = response.notification.request.content.data;

        // Redireciona corretamente para a aba 'Transações' dentro da Stack 'Principal'
        if (dados?.tipo === 'transacao' || dados?.tipo === 'lote') {
          setTimeout(() => {
            navegacaoRef.current?.navigate?.('Principal', { screen: 'Transações' });
          }, 500);
        }
      }
    );

    return () => {
      notificacaoTocadaListener.current?.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isEscuro ? 'light-content' : 'dark-content'}
        backgroundColor={CORES.fundo}
      />
      <AuthProvider>
        <TransacoesProvider>
          <NotificacoesProvider>
            <NavegacaoPrincipal ref={navegacaoRef} />
          </NotificacoesProvider>
        </TransacoesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

const AppRoot = () => {
  const [fontesCarregadas, erroFonte] = useFonts({
    Itim_400Regular,
  });

  if (!fontesCarregadas && !erroFonte) {
    return <CarregandoIndicador mensagem="Carregando fontes..." />;
  }

  return <AppContent />;
};

export default function App() {
  return (
    <TemaProvider>
      <AppRoot />
    </TemaProvider>
  );
}
