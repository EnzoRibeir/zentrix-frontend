/**
 * ============================================================
 * TELA_LOGIN.JS — Autenticação Segura via Telegram (Mobile & Web/PWA)
 * ============================================================
 *
 * Fluxo Mobile (Expo Go / iOS / Android):
 *   1. Abre WebBrowser com ?action=telegram-login&app_redirect_uri=exp://...
 *   2. Backend valida HMAC-SHA256 e redireciona com auth_code temporário (SEC03)
 *   3. App troca auth_code por token_sessao via trocarCodigoPorToken()
 *
 * Fluxo Web / iOS PWA:
 *   1. Ao clicar em "Entrar com Telegram", navega para a página de autenticação
 *      passando a URL atual do PWA como app_redirect_uri
 *   2. Ao retornar com ?auth_code=..., captura os parâmetros da URL automaticamente,
 *      limpa o histórico com replaceState e salva a sessão.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import { useTema } from '../contextos/TemaContexto';
import { TIPOGRAFIA } from '../constantes/tipografia';
import { GRADIENTES } from '../constantes/cores';
import { useAuth } from '../contextos/AuthContexto';
import { AUTH_PAGE_URL_BASE, trocarCodigoPorToken } from '../servicos/api';

WebBrowser.maybeCompleteAuthSession();

const mostrarErro = (titulo, mensagem) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${titulo}: ${mensagem}`);
  } else {
    Alert.alert(titulo, mensagem);
  }
};

export default function TelaLogin() {
  const { CORES } = useTema();
  const estilos = criarEstilos(CORES);

  const [loading, setLoading] = useState(false);
  const [erroLogin, setErroLogin] = useState('');
  const [tentouAutoLogin, setTentouAutoLogin] = useState(false);
  const { login } = useAuth();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const usarNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: usarNativeDriver,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 550,
        useNativeDriver: usarNativeDriver,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, usarNativeDriver]);

  const processarCallback = useCallback(
    async (url) => {
      try {
        setLoading(true);
        setErroLogin('');

        const urlObj = new URL(url);
        const params = Object.fromEntries(urlObj.searchParams.entries());

        if (params.error) {
          const mensagens = {
            hash_invalido: 'Falha na verificação de segurança. Tente novamente.',
            expirado: 'A sessão do Telegram expirou. Tente novamente.',
            dados_incompletos: 'Dados de autenticação incompletos.',
          };
          throw new Error(mensagens[params.error] || 'Erro na autenticação.');
        }

        const authCode = params.auth_code;
        const userIdInterno = params.user_id_interno;
        const nome = params.nome || 'Usuário';

        if (!authCode || !userIdInterno) {
          throw new Error('Resposta de autenticação incompleta.');
        }

        const dadosToken = await trocarCodigoPorToken(authCode);
        const tokenSessao = dadosToken.token_sessao;

        if (!tokenSessao) {
          throw new Error('Token de sessão não recebido.');
        }

        const sucesso = await login({
          login: true,
          token_sessao: tokenSessao,
          user_id_interno: dadosToken.user_id_interno || userIdInterno,
          nome,
        });

        if (!sucesso) {
          throw new Error('Não foi possível salvar a sessão neste dispositivo.');
        }
      } catch (erro) {
        console.error('[Login] Erro ao processar callback:', erro.message);
        setErroLogin(erro.message || 'Ocorreu um erro na autenticação.');
        mostrarErro('Erro na Autenticação', erro.message || 'Ocorreu um erro. Tente novamente.');
      } finally {
        setLoading(false);
      }
    },
    [login]
  );

  // Na Web / PWA: verifica se retornou do Telegram com ?auth_code=... na própria URL
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const search = window.location.search;
      if (search && (search.includes('auth_code=') || search.includes('error='))) {
        const currentHref = window.location.href;
        // Limpa os parâmetros sensíveis da barra de endereço imediatamente
        window.history.replaceState({}, document.title, window.location.pathname);
        processarCallback(currentHref);
      }
    }
  }, [processarCallback]);

  const handleTelegramLogin = useCallback(async () => {
    if (loading) return;
    setErroLogin('');
    setLoading(true);

    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const callbackUrl = `${window.location.origin}${window.location.pathname}`;
        const authUrl = `${AUTH_PAGE_URL_BASE}&app_redirect_uri=${encodeURIComponent(callbackUrl)}`;
        window.location.href = authUrl;
        return;
      }

      const callbackUrl = Linking.createURL('auth/callback');
      const authUrl = `${AUTH_PAGE_URL_BASE}&app_redirect_uri=${encodeURIComponent(callbackUrl)}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, callbackUrl);

      if (result.type === 'success' && result.url) {
        await processarCallback(result.url);
      }
    } catch (error) {
      console.error('[Login] Erro:', error);
      setErroLogin('Não foi possível abrir o login do Telegram.');
      mostrarErro('Erro', 'Não foi possível abrir o login do Telegram. Verifique sua conexão.');
    } finally {
      if (Platform.OS !== 'web') {
        setLoading(false);
      }
    }
  }, [loading, processarCallback]);

  // Auto-open apenas em ambiente nativo (evita bloqueio de popups no Safari/Web)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!tentouAutoLogin) {
      setTentouAutoLogin(true);
      const timer = setTimeout(() => {
        handleTelegramLogin();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [tentouAutoLogin, handleTelegramLogin]);

  return (
    <LinearGradient colors={GRADIENTES.principal} style={estilos.container}>
      <Animated.View
        style={[
          estilos.conteudo,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* LOGO */}
        <View style={estilos.header}>
          <View style={estilos.logoCirculo}>
            <Feather name="trending-up" size={40} color={CORES.principal} />
          </View>
          <Text style={estilos.titulo}>Zentrix</Text>
          <Text style={estilos.subtitulo}>Inteligência no seu controle financeiro</Text>
        </View>

        {/* CARD */}
        <View style={estilos.glassCard}>
          <Text style={estilos.cardTitulo}>
            {loading ? 'Conectando...' : 'Bem-vindo'}
          </Text>
          <Text style={estilos.cardDescricao}>
            {loading
              ? 'Aguarde enquanto validamos sua identidade com segurança via Telegram.'
              : 'Entre com sua conta do Telegram para acessar seu painel financeiro personalizado.'}
          </Text>

          {!!erroLogin && (
            <View style={estilos.erroBox}>
              <Feather name="alert-circle" size={15} color="#FFD5D5" />
              <Text style={estilos.erroTexto}>{erroLogin}</Text>
            </View>
          )}

          {!loading && (
            <TouchableOpacity
              style={estilos.botaoTelegram}
              activeOpacity={0.8}
              onPress={handleTelegramLogin}
            >
              <FontAwesome5
                name="telegram-plane"
                size={24}
                color="#FFFFFF"
                style={estilos.iconeBotao}
              />
              <Text style={estilos.textoBotao}>Entrar com Telegram</Text>
            </TouchableOpacity>
          )}

          {loading && (
            <View style={estilos.loadingContainer}>
              <View style={estilos.loadingDot} />
              <Text style={estilos.loadingTexto}>Conectando ao Telegram...</Text>
            </View>
          )}

          <View style={estilos.infoSeguranca}>
            <Feather name="shield" size={14} color="rgba(255,255,255,0.6)" />
            <Text style={estilos.textoSeguranca}>
              Autenticação verificada via assinatura criptográfica HMAC-SHA256
            </Text>
          </View>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const criarEstilos = (CORES) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    conteudo: {
      width: '100%',
      maxWidth: 440,
      paddingHorizontal: 30,
      alignItems: 'center',
    },
    header: {
      alignItems: 'center',
      marginBottom: 44,
    },
    logoCirculo: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.2,
      shadowRadius: 15,
      elevation: 10,
    },
    titulo: {
      ...TIPOGRAFIA.tituloGrande,
      color: '#FFFFFF',
      fontSize: 48,
      letterSpacing: 2,
      marginBottom: 10,
    },
    subtitulo: {
      ...TIPOGRAFIA.corpo,
      color: '#A3CEF1',
      textAlign: 'center',
      opacity: 0.95,
    },
    glassCard: {
      width: '100%',
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      borderRadius: 24,
      padding: 30,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
      ...(Platform.OS === 'ios'
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
          }
        : {
            elevation: 5,
          }),
    },
    cardTitulo: {
      ...TIPOGRAFIA.tituloMedio,
      color: '#FFFFFF',
      marginBottom: 10,
    },
    cardDescricao: {
      ...TIPOGRAFIA.corpoPequeno,
      color: '#FFFFFF',
      textAlign: 'center',
      opacity: 0.85,
      marginBottom: 24,
      lineHeight: 22,
    },
    erroBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(229, 57, 53, 0.35)',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 16,
      gap: 8,
    },
    erroTexto: {
      ...TIPOGRAFIA.legenda,
      color: '#FFFFFF',
      flex: 1,
    },
    botaoTelegram: {
      width: '100%',
      height: 56,
      backgroundColor: '#0088cc',
      borderRadius: 16,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#0088cc',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    iconeBotao: {
      marginRight: 12,
    },
    textoBotao: {
      ...TIPOGRAFIA.subtitulo,
      color: '#FFFFFF',
      fontSize: 18,
    },
    loadingContainer: {
      alignItems: 'center',
      paddingVertical: 16,
    },
    loadingDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#0088cc',
      marginBottom: 12,
    },
    loadingTexto: {
      ...TIPOGRAFIA.corpoPequeno,
      color: 'rgba(255, 255, 255, 0.8)',
    },
    infoSeguranca: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 20,
      gap: 6,
    },
    textoSeguranca: {
      ...TIPOGRAFIA.legenda,
      color: 'rgba(255, 255, 255, 0.65)',
      textAlign: 'center',
      flexShrink: 1,
    },
  });
