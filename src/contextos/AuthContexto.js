/**
 * ============================================================
 * AUTH_CONTEXTO.JS — Estado Global de Autenticação
 * ============================================================
 *
 * Provider que centraliza o estado de autenticação do app:
 * - Sessão do usuário autenticado via Telegram
 * - SEC05: Persistência com expo-secure-store no iOS/Android (Keychain/Keystore)
 *   e fallback seguro para AsyncStorage na Web / PWA
 * - Auto-logout automático quando o backend retorna 401 (sessão expirada)
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setTokenSessaoAPI, setOnNaoAutorizado } from '../servicos/api';

const STORAGE_KEYS = {
  TOKEN_SESSAO: 'zentrix_token_sessao',
  USER_ID: 'zentrix_user_id',
  NOME_USUARIO: 'zentrix_nome_usuario',
};

const AuthContexto = createContext(null);

const usarWebStorage = Platform.OS === 'web';

async function salvarSeguro(key, value) {
  if (value === null || value === undefined) {
    return deletarSeguro(key);
  }
  const strVal = String(value);
  if (usarWebStorage) {
    await AsyncStorage.setItem(key, strVal);
  } else {
    await SecureStore.setItemAsync(key, strVal);
  }
}

async function lerSeguro(key) {
  if (usarWebStorage) {
    return await AsyncStorage.getItem(key);
  }
  return await SecureStore.getItemAsync(key);
}

async function deletarSeguro(key) {
  if (usarWebStorage) {
    await AsyncStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [verificandoSessao, setVerificandoSessao] = useState(true);

  const logout = useCallback(async () => {
    try {
      await Promise.all([
        deletarSeguro(STORAGE_KEYS.TOKEN_SESSAO),
        deletarSeguro(STORAGE_KEYS.USER_ID),
        deletarSeguro(STORAGE_KEYS.NOME_USUARIO),
      ]);
      setUsuario(null);
      setTokenSessaoAPI(null);
    } catch (erro) {
      console.error('[Auth] Erro ao fazer logout:', erro.message);
    }
  }, []);

  useEffect(() => {
    setOnNaoAutorizado(() => {
      logout();
    });
    return () => setOnNaoAutorizado(null);
  }, [logout]);

  useEffect(() => {
    verificarSessaoExistente();
  }, []);

  const verificarSessaoExistente = async () => {
    try {
      const [tokenSessao, userId, nomeUsuario] = await Promise.all([
        lerSeguro(STORAGE_KEYS.TOKEN_SESSAO),
        lerSeguro(STORAGE_KEYS.USER_ID),
        lerSeguro(STORAGE_KEYS.NOME_USUARIO),
      ]);

      if (tokenSessao && userId) {
        setTokenSessaoAPI(tokenSessao);
        setUsuario({
          token_sessao: tokenSessao,
          user_id: userId,
          nome: nomeUsuario || 'Usuário',
        });
      }
    } catch (erro) {
      console.error('[Auth] Erro ao verificar sessão existente:', erro.message);
    } finally {
      setVerificandoSessao(false);
    }
  };

  const login = useCallback(async (dadosLogin) => {
    try {
      const { token_sessao, user_id_interno, nome } = dadosLogin;
      if (!token_sessao || !user_id_interno) {
        return false;
      }

      await Promise.all([
        salvarSeguro(STORAGE_KEYS.TOKEN_SESSAO, token_sessao),
        salvarSeguro(STORAGE_KEYS.USER_ID, user_id_interno),
        salvarSeguro(STORAGE_KEYS.NOME_USUARIO, nome || 'Usuário'),
      ]);

      setTokenSessaoAPI(token_sessao);
      setUsuario({
        token_sessao,
        user_id: user_id_interno,
        nome: nome || 'Usuário',
      });

      return true;
    } catch (erro) {
      console.error('[Auth] Erro ao salvar sessão:', erro.message);
      return false;
    }
  }, []);

  const valor = {
    usuario,
    logado: !!usuario,
    verificandoSessao,
    login,
    logout,
  };

  return (
    <AuthContexto.Provider value={valor}>
      {children}
    </AuthContexto.Provider>
  );
};

export const useAuth = () => {
  const contexto = useContext(AuthContexto);
  if (!contexto) {
    throw new Error('useAuth deve ser usado dentro de um <AuthProvider>');
  }
  return contexto;
};
