/**
 * ============================================================
 * MODAL_NOVA_TRANSACAO.JS — Modal para Adicionar Transação
 * ============================================================
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CORES_SEMANTICAS } from '../constantes/cores';
import { useTema } from '../contextos/TemaContexto';
import { TIPOGRAFIA } from '../constantes/tipografia';
import { ESPACAMENTOS } from '../constantes/espacamentos';
import { useTransacoes } from '../contextos/TransacoesContexto';

const notificarAlerta = (titulo, mensagem) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${titulo}: ${mensagem}`);
  } else {
    Alert.alert(titulo, mensagem);
  }
};

const ModalNovaTransacao = ({ visivel, aoFechar }) => {
  const { CORES } = useTema();
  const estilos = criarEstilos(CORES);

  const [frase, setFrase] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erroLocal, setErroLocal] = useState('');

  const { adicionar } = useTransacoes();

  const aoEnviar = async () => {
    if (!frase.trim()) {
      setErroLocal('Digite uma frase descrevendo sua transação.');
      return;
    }

    setErroLocal('');
    setEnviando(true);
    try {
      const sucesso = await adicionar(frase.trim());
      if (sucesso) {
        setFrase('');
        aoFechar();
        notificarAlerta('Sucesso', 'Transação registrada com sucesso!');
      } else {
        setErroLocal('Não foi possível registrar a transação. Verifique o valor informado e tente novamente.');
      }
    } catch (erro) {
      setErroLocal(erro.message || 'Ocorreu um erro ao processar sua transação.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      visible={visivel}
      animationType="slide"
      transparent={true}
      onRequestClose={aoFechar}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={estilos.overlay}
      >
        <TouchableOpacity
          style={estilos.fundoEscuro}
          activeOpacity={1}
          onPress={aoFechar}
        />

        <View style={estilos.container}>
          <View style={estilos.barraArrasto} />

          <View style={estilos.header}>
            <Text style={estilos.titulo}>Nova Transação</Text>
            <TouchableOpacity onPress={aoFechar} disabled={enviando}>
              <Feather name="x" size={24} color={CORES.textoSecundario} />
            </TouchableOpacity>
          </View>

          <Text style={estilos.instrucao}>
            Descreva sua transação em linguagem natural. A IA vai processar automaticamente.
          </Text>

          <View style={estilos.containerExemplos}>
            <Text style={estilos.exemploLabel}>Exemplos:</Text>
            <Text style={estilos.exemploTexto}>• "comprei um lanche de 25 reais no débito"</Text>
            <Text style={estilos.exemploTexto}>• "emprestei 500 pra João em 6 vezes"</Text>
            <Text style={estilos.exemploTexto}>• "paguei 120 de gasolina no pix"</Text>
          </View>

          <TextInput
            style={[estilos.input, !!erroLocal && { borderColor: CORES_SEMANTICAS.erro }]}
            placeholder="Digite aqui sua transação..."
            placeholderTextColor={CORES.textoSecundario}
            value={frase}
            onChangeText={(t) => {
              setFrase(t);
              if (erroLocal) setErroLocal('');
            }}
            multiline
            numberOfLines={3}
            editable={!enviando}
            autoFocus
          />

          {!!erroLocal && (
            <Text style={estilos.erroTexto}>{erroLocal}</Text>
          )}

          <TouchableOpacity
            style={[estilos.botaoEnviar, enviando && estilos.botaoDesabilitado]}
            onPress={aoEnviar}
            disabled={enviando}
            activeOpacity={0.8}
          >
            {enviando ? (
              <ActivityIndicator color={CORES.branco} />
            ) : (
              <>
                <Feather name="send" size={20} color={CORES.branco} />
                <Text style={estilos.botaoTexto}>Registrar Transação</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const criarEstilos = (CORES) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    fundoEscuro: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    container: {
      backgroundColor: CORES.branco,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: ESPACAMENTOS.margemHorizontal,
      paddingBottom: 40,
      paddingTop: 12,
    },
    barraArrasto: {
      width: 40,
      height: 4,
      backgroundColor: CORES.borda,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    titulo: {
      ...TIPOGRAFIA.tituloMedio,
      color: CORES.textoPrincipal,
    },
    instrucao: {
      ...TIPOGRAFIA.corpoPequeno,
      color: CORES.textoSecundario,
      marginBottom: 12,
      lineHeight: 20,
    },
    containerExemplos: {
      backgroundColor: `${CORES.destaque}15`,
      borderRadius: ESPACAMENTOS.raioBorda,
      padding: 14,
      marginBottom: 16,
    },
    exemploLabel: {
      ...TIPOGRAFIA.corpoPequeno,
      color: CORES.principal,
      marginBottom: 6,
    },
    exemploTexto: {
      ...TIPOGRAFIA.legenda,
      color: CORES.secundaria,
      marginBottom: 4,
      lineHeight: 18,
    },
    input: {
      ...TIPOGRAFIA.corpo,
      backgroundColor: CORES.fundo,
      borderRadius: ESPACAMENTOS.raioBorda,
      padding: 16,
      minHeight: 80,
      textAlignVertical: 'top',
      color: CORES.textoPrincipal,
      borderWidth: 1,
      borderColor: CORES.borda,
      marginBottom: 12,
    },
    erroTexto: {
      ...TIPOGRAFIA.legenda,
      color: CORES_SEMANTICAS.erro,
      marginBottom: 12,
    },
    botaoEnviar: {
      backgroundColor: CORES.principal,
      borderRadius: ESPACAMENTOS.raioBorda,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    botaoDesabilitado: {
      opacity: 0.6,
    },
    botaoTexto: {
      ...TIPOGRAFIA.corpo,
      color: CORES.branco,
      marginLeft: 10,
    },
  });

export default ModalNovaTransacao;
