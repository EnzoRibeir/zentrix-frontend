/**
 * ============================================================
 * TELA_PERFIL.JS — Tela de Perfil e Configurações do Usuário
 * ============================================================
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CORES_SEMANTICAS } from '../constantes/cores';
import { useTema } from '../contextos/TemaContexto';
import { TIPOGRAFIA } from '../constantes/tipografia';
import { ESPACAMENTOS } from '../constantes/espacamentos';
import { useTransacoes } from '../contextos/TransacoesContexto';
import { useAuth } from '../contextos/AuthContexto';
import { useNotificacoes } from '../contextos/NotificacoesContexto';
import { formatarMoeda } from '../utilitarios/formatadores';
import { calcularTotalGasto } from '../utilitarios/calculadores';
import CartaoResumo from '../componentes/CartaoResumo';
import ModalEditarPerfil from '../componentes/ModalEditarPerfil';

const LIMITE_PADRAO = 1000;
const SALARIO_PADRAO = 5000;

const TelaPerfil = ({ navigation }) => {
  const { CORES, isEscuro, alternarTema } = useTema();
  const insets = useSafeAreaInsets();
  const estilos = criarEstilos(CORES, insets);

  const { transacoes, usuario, carregar } = useTransacoes();
  const { usuario: usuarioAuth, logout } = useAuth();
  const { naoLidosCount } = useNotificacoes();
  const [modalPerfilVisivel, setModalPerfilVisivel] = useState(false);
  const [campoAlvo, setCampoAlvo] = useState(null);

  const salarioReal = usuario?.salario_mensal || SALARIO_PADRAO;
  const limiteReal = usuario?.limite_mensal || LIMITE_PADRAO;
  const totalGasto = calcularTotalGasto(transacoes);
  const saldo = salarioReal - totalGasto;

  const abrirModal = (campo) => {
    setCampoAlvo(campo);
    setModalPerfilVisivel(true);
  };

  const confirmarSaida = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm('Deseja realmente sair da sua conta?')) {
        logout();
      }
      return;
    }

    Alert.alert('Sair', 'Deseja realmente sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          logout();
        },
      },
    ]);
  };

  const ItemConfig = ({ icone, corIcone, titulo, descricao, aoClicar, componente }) => (
    <TouchableOpacity
      style={estilos.itemConfig}
      onPress={aoClicar}
      activeOpacity={aoClicar ? 0.7 : 1}
    >
      <View
        style={[
          estilos.itemConfigIcone,
          { backgroundColor: `${corIcone || CORES.principal}15` },
        ]}
      >
        <Feather name={icone} size={20} color={corIcone || CORES.principal} />
      </View>
      <View style={estilos.itemConfigTexto}>
        <Text style={estilos.itemConfigTitulo}>{titulo}</Text>
        <Text style={estilos.itemConfigDescricao}>{descricao}</Text>
      </View>
      {componente || <Feather name="chevron-right" size={20} color={CORES.textoSecundario} />}
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={estilos.container}
      contentContainerStyle={estilos.conteudo}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <View style={estilos.header}>
        <Text style={estilos.titulo}>Meu Perfil</Text>
        <View style={estilos.headerIcones}>
          <TouchableOpacity
            style={estilos.iconeBotao}
            onPress={() => navigation.navigate('Transações')}
          >
            <Feather name="search" size={22} color={CORES.principal} />
          </TouchableOpacity>
          <TouchableOpacity
            style={estilos.iconeBotao}
            onPress={() => navigation.navigate('Notificacoes')}
          >
            <Feather name="bell" size={22} color={CORES.principal} />
            {naoLidosCount > 0 && (
              <View style={estilos.badge}>
                <Text style={estilos.badgeTexto}>
                  {naoLidosCount > 9 ? '9+' : naoLidosCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* CARD: Dados do Usuário */}
      <View style={estilos.cardUsuario}>
        <View style={estilos.avatarCirculo}>
          <Feather name="user" size={24} color={CORES.principal} />
        </View>
        <View style={estilos.cardUsuarioInfo}>
          <Text style={estilos.nomeUsuario}>{usuarioAuth?.nome || 'Usuário'}</Text>
          <Text style={estilos.emailUsuario}>
            Conta Telegram • ID: {usuarioAuth?.user_id || '---'}
          </Text>
        </View>
      </View>

      {/* SEÇÃO: Resumo da Conta */}
      <Text style={estilos.secaoTitulo}>Resumo da sua conta (toque para editar)</Text>
      <View style={estilos.gridResumo}>
        <CartaoResumo
          icone="dollar-sign"
          label="Saldo s/ Salário"
          valor={formatarMoeda(saldo)}
          corValor={saldo >= 0 ? CORES_SEMANTICAS.sucesso : CORES_SEMANTICAS.erro}
          corIcone={CORES_SEMANTICAS.sucesso}
        />
        <View style={{ width: 10 }} />
        <CartaoResumo
          icone="arrow-down-left"
          label="Total Gasto"
          valor={formatarMoeda(totalGasto)}
          corValor={CORES_SEMANTICAS.erro}
          corIcone={CORES_SEMANTICAS.erro}
        />
      </View>
      <View style={[estilos.gridResumo, { marginTop: 10 }]}>
        <CartaoResumo
          icone="credit-card"
          label="Limite Mensal"
          valor={formatarMoeda(limiteReal)}
          corValor={CORES.textoPrincipal}
          corIcone={CORES.secundaria}
          onPress={() => abrirModal('limite')}
        />
        <View style={{ width: 10 }} />
        <CartaoResumo
          icone="briefcase"
          label="Salário"
          valor={formatarMoeda(salarioReal)}
          corValor={CORES_SEMANTICAS.sucesso}
          corIcone={CORES_SEMANTICAS.sucesso}
          onPress={() => abrirModal('salario')}
        />
      </View>
      <View style={[estilos.gridResumo, { marginTop: 10 }]}>
        <CartaoResumo
          icone="calendar"
          label="Dia do Vencimento"
          valor={
            usuario?.dia_vencimento_fatura
              ? `Dia ${usuario.dia_vencimento_fatura}`
              : 'Não definido'
          }
          corValor={CORES.textoPrincipal}
          corIcone={CORES.principal}
          onPress={() => abrirModal('vencimento')}
        />
        <View style={{ width: 10 }} />
        <View style={{ flex: 1 }} />
      </View>

      {/* SEÇÃO: Configurações */}
      <Text style={estilos.secaoTitulo}>Configurações</Text>
      <View style={estilos.cardConfig}>
        <ItemConfig
          icone="bell"
          titulo="Notificações"
          descricao="Gerencie seus alertas e avisos"
          aoClicar={() => navigation.navigate('Notificacoes')}
        />
        <View style={estilos.separador} />
        <ItemConfig
          icone="moon"
          titulo="Modo Escuro"
          descricao="Alterne entre o modo Claro e o Modo Escuro"
          aoClicar={alternarTema}
          componente={
            <Switch
              value={isEscuro}
              onValueChange={alternarTema}
              trackColor={{ false: CORES.borda, true: CORES.principal }}
              thumbColor={CORES.branco}
            />
          }
        />
      </View>

      {/* BOTÃO: Sair da Conta */}
      <TouchableOpacity style={estilos.botaoSair} onPress={confirmarSaida}>
        <View style={estilos.sairIcone}>
          <Feather name="log-out" size={20} color={CORES_SEMANTICAS.erro} />
        </View>
        <View style={estilos.sairTexto}>
          <Text style={estilos.sairTitulo}>Sair da conta</Text>
          <Text style={estilos.sairDescricao}>Encerrar sessão neste dispositivo</Text>
        </View>
        <Feather name="chevron-right" size={20} color={CORES.textoSecundario} />
      </TouchableOpacity>

      <ModalEditarPerfil
        visivel={modalPerfilVisivel}
        campoAlvo={campoAlvo}
        aoFechar={async (novosCampos) => {
          setModalPerfilVisivel(false);
          setCampoAlvo(null);
          if (novosCampos) {
            await carregar();
          }
        }}
        usuarioAtual={usuario}
      />
    </ScrollView>
  );
};

const criarEstilos = (CORES, insets) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: CORES.fundo },
    conteudo: {
      padding: ESPACAMENTOS.margemHorizontal,
      paddingTop: (insets?.top || 0) + 10,
      paddingBottom: 100,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    titulo: { ...TIPOGRAFIA.tituloMedio, color: CORES.textoPrincipal },
    headerIcones: { flexDirection: 'row', gap: 10 },
    iconeBotao: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: CORES.branco,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    badge: {
      position: 'absolute',
      top: 6,
      right: 6,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: '#E53935',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 3,
    },
    badgeTexto: { color: '#fff', fontSize: 9, fontWeight: '700' },
    cardUsuario: {
      backgroundColor: CORES.branco,
      borderRadius: ESPACAMENTOS.raioBorda,
      padding: ESPACAMENTOS.paddingCard,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    avatarCirculo: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: `${CORES.principal}18`,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    cardUsuarioInfo: { flex: 1 },
    nomeUsuario: {
      ...TIPOGRAFIA.subtitulo,
      color: CORES.textoPrincipal,
      marginBottom: 4,
    },
    emailUsuario: { ...TIPOGRAFIA.legenda, color: CORES.textoSecundario },
    secaoTitulo: {
      ...TIPOGRAFIA.subtitulo,
      color: CORES.textoPrincipal,
      marginBottom: 12,
      marginTop: 16,
    },
    gridResumo: { flexDirection: 'row' },
    cardConfig: {
      backgroundColor: CORES.branco,
      borderRadius: ESPACAMENTOS.raioBorda,
      padding: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    itemConfig: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    itemConfigIcone: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    itemConfigTexto: { flex: 1 },
    itemConfigTitulo: { ...TIPOGRAFIA.corpo, color: CORES.textoPrincipal },
    itemConfigDescricao: {
      ...TIPOGRAFIA.legenda,
      color: CORES.textoSecundario,
      marginTop: 2,
    },
    separador: { height: 1, backgroundColor: CORES.borda, marginLeft: 70 },
    botaoSair: {
      backgroundColor: CORES.branco,
      borderRadius: ESPACAMENTOS.raioBorda,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: ESPACAMENTOS.espacoEntreCards,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    sairIcone: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: `${CORES_SEMANTICAS.erro}15`,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    sairTexto: { flex: 1 },
    sairTitulo: { ...TIPOGRAFIA.corpo, color: CORES_SEMANTICAS.erro },
    sairDescricao: {
      ...TIPOGRAFIA.legenda,
      color: CORES.textoSecundario,
      marginTop: 2,
    },
  });

export default TelaPerfil;
