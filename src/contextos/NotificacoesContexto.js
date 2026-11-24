/**
 * ============================================================
 * NOTIFICACOES_CONTEXTO.JS — Estado Global de Notificações
 * ============================================================
 *
 * Gerencia o estado de notificações do app:
 * - Lê transações e perfil do TransacoesContexto automaticamente
 * - Classifica corretamente Receita/A receber (type === 'Emprestado') vs. Despesa
 * - Gera alertas reais de orçamento (80% e 100% do limite mensal)
 * - Persiste o estado de "lido/não lido" no AsyncStorage
 * - Dispara push notifications locais no celular via expo-notifications
 *   (com proteção segura para ambiente Web/PWA)
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { CORES_SEMANTICAS } from '../constantes/cores';
import { formatarMoeda, formatarHora } from '../utilitarios/formatadores';
import { calcularTotalGasto } from '../utilitarios/calculadores';
import { useTransacoes } from './TransacoesContexto';

const suportaNotificacoesNativas = Platform.OS !== 'web';

if (suportaNotificacoesNativas) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

const STORAGE_KEY = '@zentrix_notificacoes_lidas';
const NotificacoesContexto = createContext(null);

const gerarNotificacoesDasTransacoes = (transacoes) =>
  (transacoes || [])
    .filter((t) => t.status !== 'deleted')
    .slice(0, 12)
    .map((t) => {
      const ehReceita = t.type === 'Emprestado';
      return {
        id: `trans-${t.id}`,
        tipo: 'Transações',
        icone: ehReceita ? 'dollar-sign' : 'shopping-cart',
        corIcone: ehReceita ? CORES_SEMANTICAS.sucesso : CORES_SEMANTICAS.erro,
        titulo: ehReceita ? 'Valor a receber registrado' : 'Nova despesa registrada',
        descricao: `${t.description} — ${formatarMoeda(Math.abs(parseFloat(t.amount || 0)))}`,
        horario: formatarHora(t.created_at),
      };
    });

const gerarAlertasDinamicos = (transacoes, usuario) => {
  const alertas = [];
  const agora = new Date();
  const chaveMes = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
  const limite = parseFloat(usuario?.limite_mensal || 1000);
  const totalGasto = calcularTotalGasto(transacoes);

  if (limite > 0 && totalGasto >= limite) {
    alertas.push({
      id: `alerta-limite-100-${chaveMes}`,
      tipo: 'Alertas',
      icone: 'alert-octagon',
      corIcone: CORES_SEMANTICAS.erro,
      titulo: 'Limite mensal atingido!',
      descricao: `Seus gastos do mês (${formatarMoeda(totalGasto)}) atingiram o limite de ${formatarMoeda(limite)}.`,
      horario: 'Este mês',
    });
  } else if (limite > 0 && totalGasto >= limite * 0.8) {
    const pct = Math.round((totalGasto / limite) * 100);
    alertas.push({
      id: `alerta-limite-80-${chaveMes}`,
      tipo: 'Alertas',
      icone: 'alert-triangle',
      corIcone: CORES_SEMANTICAS.alerta,
      titulo: 'Atenção ao limite mensal',
      descricao: `Você já utilizou ${pct}% (${formatarMoeda(totalGasto)}) do seu limite de ${formatarMoeda(limite)}.`,
      horario: 'Este mês',
    });
  }

  if (usuario?.dia_vencimento_fatura) {
    const diaVenc = parseInt(usuario.dia_vencimento_fatura, 10);
    const diffDias = diaVenc - agora.getDate();
    if (diffDias >= 0 && diffDias <= 3) {
      alertas.push({
        id: `alerta-fatura-${chaveMes}-${diaVenc}`,
        tipo: 'Sistema',
        icone: 'calendar',
        corIcone: '#274C77',
        titulo: diffDias === 0 ? 'Sua fatura vence hoje!' : `Fatura vence em ${diffDias} dia(s)`,
        descricao: `O fechamento/vencimento configurado para o dia ${diaVenc} está próximo.`,
        horario: 'Lembrete',
      });
    }
  }

  alertas.push({
    id: 'sys-boas-vindas',
    tipo: 'Sistema',
    icone: 'shield',
    corIcone: '#274C77',
    titulo: 'Proteção Zentrix Ativa',
    descricao: 'Sessão protegida com criptografia e autenticação verificada pelo Telegram.',
    horario: 'Sistema',
  });

  return alertas;
};

async function solicitarPermissaoNotificacao() {
  if (!suportaNotificacoesNativas) return false;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('zentrix-transacoes', {
        name: 'Transações',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#274C77',
        sound: 'default',
      });
      await Notifications.setNotificationChannelAsync('zentrix-alertas', {
        name: 'Alertas',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });
    }

    const { status: statusExistente } = await Notifications.getPermissionsAsync();
    if (statusExistente === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('[Zentrix] Notificações nativas indisponíveis neste ambiente:', err?.message);
    return false;
  }
}

async function dispararNotificacaoLocal(titulo, corpo, dados = {}, canal = 'zentrix-transacoes') {
  if (!suportaNotificacoesNativas) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: titulo,
        body: corpo,
        data: dados,
        sound: 'default',
      },
      trigger: null,
      ...(Platform.OS === 'android' ? { channelId: canal } : {}),
    });
  } catch (err) {
    console.warn('[Zentrix] Falha ao disparar notificação local:', err);
  }
}

export const NotificacoesProvider = ({ children }) => {
  const [idsLidos, setIdsLidos] = useState(new Set());
  const [permissaoConcedida, setPermissaoConcedida] = useState(false);
  const { transacoes, usuario } = useTransacoes();
  const prevIdsRef = useRef(new Set());
  const primeiraCarregaRef = useRef(true);

  useEffect(() => {
    solicitarPermissaoNotificacao().then((concedida) => {
      setPermissaoConcedida(concedida);
    });
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((salvo) => {
        if (salvo) setIdsLidos(new Set(JSON.parse(salvo)));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const idsAtuais = new Set((transacoes || []).map((t) => `trans-${t.id}`));
    const idsNovos = [...idsAtuais].filter((id) => !prevIdsRef.current.has(id));

    if (idsNovos.length > 0) {
      setIdsLidos((prev) => {
        const novo = new Set(prev);
        idsNovos.forEach((id) => novo.delete(id));
        return novo;
      });

      if (!primeiraCarregaRef.current && permissaoConcedida) {
        const transacoesNovas = (transacoes || []).filter((t) =>
          idsNovos.includes(`trans-${t.id}`)
        );

        if (transacoesNovas.length === 1) {
          const t = transacoesNovas[0];
          const ehReceita = t.type === 'Emprestado';
          dispararNotificacaoLocal(
            ehReceita ? '💰 Novo valor a receber' : '💸 Nova despesa registrada',
            `${t.description} — ${formatarMoeda(Math.abs(parseFloat(t.amount || 0)))}`,
            { transacaoId: t.id, tipo: 'transacao' },
            'zentrix-transacoes'
          );
        } else if (transacoesNovas.length > 1) {
          dispararNotificacaoLocal(
            '📊 Zentrix atualizado',
            `${transacoesNovas.length} novas transações foram registradas.`,
            { tipo: 'lote' },
            'zentrix-transacoes'
          );
        }
      }
    }

    if (primeiraCarregaRef.current && (transacoes || []).length > 0) {
      primeiraCarregaRef.current = false;
    }

    prevIdsRef.current = idsAtuais;
  }, [transacoes, permissaoConcedida]);

  const salvarLidos = useCallback((novosLidos) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...novosLidos])).catch(() => {});
  }, []);

  const marcarComoLida = useCallback(
    (id) => {
      setIdsLidos((prev) => {
        const novo = new Set(prev);
        novo.add(id);
        salvarLidos(novo);
        return novo;
      });
    },
    [salvarLidos]
  );

  const notificacoesBase = useMemo(
    () => [
      ...gerarAlertasDinamicos(transacoes, usuario),
      ...gerarNotificacoesDasTransacoes(transacoes),
    ],
    [transacoes, usuario]
  );

  const marcarTodasComoLidas = useCallback(() => {
    const todos = new Set(notificacoesBase.map((n) => n.id));
    setIdsLidos(todos);
    salvarLidos(todos);
    if (suportaNotificacoesNativas) {
      Notifications.setBadgeCountAsync(0).catch(() => {});
    }
  }, [notificacoesBase, salvarLidos]);

  const notificacoes = useMemo(
    () => notificacoesBase.map((n) => ({ ...n, naoLido: !idsLidos.has(n.id) })),
    [notificacoesBase, idsLidos]
  );

  const naoLidosCount = useMemo(
    () => notificacoes.filter((n) => n.naoLido).length,
    [notificacoes]
  );

  useEffect(() => {
    if (suportaNotificacoesNativas && permissaoConcedida) {
      Notifications.setBadgeCountAsync(naoLidosCount).catch(() => {});
    }
  }, [naoLidosCount, permissaoConcedida]);

  return (
    <NotificacoesContexto.Provider
      value={{
        notificacoes,
        naoLidosCount,
        marcarComoLida,
        marcarTodasComoLidas,
        permissaoConcedida,
        dispararNotificacaoLocal,
      }}
    >
      {children}
    </NotificacoesContexto.Provider>
  );
};

export const useNotificacoes = () => {
  const ctx = useContext(NotificacoesContexto);
  if (!ctx) throw new Error('useNotificacoes deve ser usado dentro de um <NotificacoesProvider>');
  return ctx;
};
