/**
 * ============================================================
 * API.JS — Serviço de Comunicação com o Backend AWS Lambda
 * ============================================================
 *
 * Centraliza todas as chamadas HTTP para a API do Zentrix:
 * - GET    → Listar transações + perfil, Resumo IA (?action=summary), Troca SEC03 (?action=trocar-codigo)
 * - POST   → Criar transação via frase IA, Importar CSV C6 Bank, Autenticação Web Telegram
 * - PUT    → Atualizar transação ou perfil do usuário
 * - DELETE → Excluir transação por ID
 */

// ===========================================
// CONFIGURAÇÕES EXPORTADAS (Fonte Única)
// ===========================================

/** URL base da API no AWS API Gateway (região sa-east-1 — São Paulo) */
export const URL_BASE = 'https://agog0k90kc.execute-api.sa-east-1.amazonaws.com/default/api-financas-ia';

/** URL pública que serve a página HTML de login com o Telegram Widget */
export const AUTH_PAGE_URL_BASE = `${URL_BASE}?action=telegram-login`;

/** Tempo limite padrão para requisições (em milissegundos) */
const TIMEOUT_PADRAO_MS = 15000;

/** Tempo limite estendido para operações em lote com IA (CSV / Resumo IA) */
const TIMEOUT_IA_LOTE_MS = 45000;

// ===========================================
// ESTADO DE SESSÃO E INTERCEPTOR 401
// ===========================================

let globalTokenSessao = null;
let onNaoAutorizadoCallback = null;

export const setTokenSessaoAPI = (token) => {
  globalTokenSessao = token;
};

export const getTokenSessaoAPI = () => globalTokenSessao;

/**
 * Registra callback disparado automaticamente quando a API retorna 401
 * em rotas autenticadas (ex.: sessão de 7 dias expirada).
 */
export const setOnNaoAutorizado = (callback) => {
  onNaoAutorizadoCallback = callback;
};

/**
 * Faz o parse seguro da resposta JSON (suportando body duplo-encodado pelo Lambda).
 */
const extrairJsonResposta = async (resposta) => {
  const texto = await resposta.text();
  if (!texto) return {};
  try {
    const parsed = JSON.parse(texto);
    return typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
  } catch {
    return { raw: texto };
  }
};

/**
 * Wrapper para fetch com timeout, injeção automática de Bearer Token
 * e tratamento centralizado de sessão expirada (401).
 */
const fetchComTimeout = async (url, opcoes = {}, timeoutMs = TIMEOUT_PADRAO_MS, autenticado = true) => {
  const controlador = new AbortController();
  const idTimeout = setTimeout(() => controlador.abort(), timeoutMs);

  const headers = { ...(opcoes.headers || {}) };
  if (autenticado && globalTokenSessao) {
    headers['Authorization'] = `Bearer ${globalTokenSessao}`;
  }

  try {
    const resposta = await fetch(url, {
      ...opcoes,
      headers,
      signal: controlador.signal,
    });
    clearTimeout(idTimeout);

    if (autenticado && resposta.status === 401 && globalTokenSessao) {
      if (typeof onNaoAutorizadoCallback === 'function') {
        onNaoAutorizadoCallback();
      }
    }

    return resposta;
  } catch (erro) {
    clearTimeout(idTimeout);
    if (erro.name === 'AbortError') {
      throw new Error('Tempo limite da requisição excedido. Verifique sua conexão.');
    }
    throw erro;
  }
};

// ===========================================
// AUTENTICAÇÃO VIA TELEGRAM (SEC03 + Web)
// ===========================================

/**
 * SEC03: Troca o auth_code temporário recebido no deep link / callback URL
 * pelo token_sessao definitivo.
 */
export const trocarCodigoPorToken = async (authCode) => {
  if (!authCode) {
    throw new Error('Código de autenticação ausente.');
  }

  const url = `${URL_BASE}?action=trocar-codigo&code=${encodeURIComponent(authCode)}`;
  const resposta = await fetchComTimeout(url, { method: 'GET' }, TIMEOUT_PADRAO_MS, false);
  const jsonDados = await extrairJsonResposta(resposta);

  if (!resposta.ok) {
    throw new Error(jsonDados.erro || `Falha ao obter token de sessão (${resposta.status}).`);
  }

  return jsonDados;
};

/**
 * Envia os dados do Telegram Login Widget diretamente via POST (fluxo Web).
 */
export const autenticarComTelegram = async (dadosTelegram) => {
  try {
    const resposta = await fetchComTimeout(
      URL_BASE,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosTelegram),
      },
      TIMEOUT_PADRAO_MS,
      false
    );

    const jsonDados = await extrairJsonResposta(resposta);

    if (!resposta.ok) {
      throw new Error(jsonDados.erro || `Erro de autenticação: ${resposta.status}`);
    }

    return jsonDados;
  } catch (erro) {
    console.error('[API] Erro em autenticarComTelegram:', erro.message);
    throw erro;
  }
};

// ===========================================
// ENDPOINTS AUTENTICADOS
// ===========================================

/**
 * Busca todas as transações ativas e dados de perfil do usuário.
 */
export const buscarTransacoes = async (userId) => {
  if (!userId) {
    throw new Error('user_id é obrigatório para buscar transações.');
  }

  try {
    const url = `${URL_BASE}?user_id=${encodeURIComponent(userId)}`;
    const resposta = await fetchComTimeout(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const jsonDados = await extrairJsonResposta(resposta);

    if (!resposta.ok) {
      throw new Error(jsonDados.erro || `Erro ao buscar transações: ${resposta.status}`);
    }

    if (Array.isArray(jsonDados)) {
      return { transacoes: jsonDados, usuario: null };
    }

    const transacoesAtivas = (jsonDados.transacoes || []).filter(
      (t) => t.status !== 'deleted'
    );

    return {
      transacoes: transacoesAtivas,
      usuario: jsonDados.usuario || null,
    };
  } catch (erro) {
    console.error('[API] Erro em buscarTransacoes:', erro.message);
    throw erro;
  }
};

/**
 * Busca o resumo financeiro mensal consolidado + insight gerado pelo Google Gemini.
 */
export const buscarResumoIA = async (userId) => {
  if (!userId) {
    throw new Error('user_id é obrigatório para buscar o resumo.');
  }

  try {
    const url = `${URL_BASE}?action=summary&user_id=${encodeURIComponent(userId)}`;
    const resposta = await fetchComTimeout(
      url,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      },
      TIMEOUT_IA_LOTE_MS
    );

    const jsonDados = await extrairJsonResposta(resposta);

    if (!resposta.ok) {
      throw new Error(jsonDados.erro || `Erro ao gerar resumo IA: ${resposta.status}`);
    }

    return jsonDados;
  } catch (erro) {
    console.error('[API] Erro em buscarResumoIA:', erro.message);
    throw erro;
  }
};

/**
 * Cria uma nova transação enviando uma frase em linguagem natural para o Gemini.
 */
export const criarTransacaoPorFrase = async (userId, frase) => {
  if (!userId) {
    throw new Error('user_id é obrigatório para criar transação.');
  }

  try {
    const resposta = await fetchComTimeout(
      URL_BASE,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          frase,
        }),
      },
      TIMEOUT_IA_LOTE_MS
    );

    const jsonDados = await extrairJsonResposta(resposta);

    if (!resposta.ok) {
      throw new Error(jsonDados.erro || `Erro ao criar transação: ${resposta.status}`);
    }

    return jsonDados;
  } catch (erro) {
    console.error('[API] Erro em criarTransacaoPorFrase:', erro.message);
    throw erro;
  }
};

/**
 * Importa fatura CSV do C6 Bank autenticada via Bearer Token.
 * Compatível tanto com retorno JSON estruturado ({ count, importadas })
 * quanto com string legada ("N itens processados!").
 */
export const importarCSV = async (userId, csvText) => {
  if (!userId) {
    throw new Error('user_id é obrigatório para importar CSV.');
  }

  try {
    const resposta = await fetchComTimeout(
      URL_BASE,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          csv_text: csvText,
        }),
      },
      TIMEOUT_IA_LOTE_MS
    );

    const jsonDados = await extrairJsonResposta(resposta);

    if (!resposta.ok) {
      throw new Error(jsonDados.erro || jsonDados.error || `Erro ao importar CSV (${resposta.status}).`);
    }

    let quantidade = jsonDados?.count ?? jsonDados?.importadas;
    if (quantidade === undefined || quantidade === null) {
      const textoBase = typeof jsonDados?.raw === 'string'
        ? jsonDados.raw
        : typeof jsonDados === 'string'
        ? jsonDados
        : JSON.stringify(jsonDados);
      const match = textoBase.match(/(\d+)/);
      quantidade = match ? parseInt(match[1], 10) : 0;
    }

    return {
      count: quantidade,
      message: jsonDados?.message || `${quantidade} transação(ões) importada(s) com sucesso!`,
    };
  } catch (erro) {
    console.error('[API] Erro em importarCSV:', erro.message);
    throw erro;
  }
};

/**
 * Exclui uma transação pelo seu ID.
 */
export const excluirTransacao = async (userId, idTransacao) => {
  if (!userId) {
    throw new Error('user_id é obrigatório para excluir transação.');
  }

  try {
    const resposta = await fetchComTimeout(URL_BASE, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        id: idTransacao,
      }),
    });

    const jsonDados = await extrairJsonResposta(resposta);

    if (!resposta.ok) {
      throw new Error(jsonDados.erro || `Erro ao excluir transação: ${resposta.status}`);
    }

    return jsonDados;
  } catch (erro) {
    console.error('[API] Erro em excluirTransacao:', erro.message);
    throw erro;
  }
};

/**
 * Atualiza dados de uma transação (descrição, valor, categoria, tipo ou status).
 */
export const atualizarTransacao = async (userId, id, camposAtualizados) => {
  if (!userId) {
    throw new Error('user_id é obrigatório para atualizar transação.');
  }

  try {
    const resposta = await fetchComTimeout(URL_BASE, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        action: 'update_transaction',
        id,
        ...camposAtualizados,
      }),
    });

    const jsonDados = await extrairJsonResposta(resposta);

    if (!resposta.ok) {
      throw new Error(jsonDados.erro || `Erro ao atualizar transação: ${resposta.status}`);
    }

    return jsonDados;
  } catch (erro) {
    console.error('[API] Erro em atualizarTransacao:', erro.message);
    throw erro;
  }
};

/**
 * Atualiza o perfil financeiro do usuário (salário, limite mensal, dia de vencimento).
 */
export const atualizarUsuario = async (userId, dadosUsuario) => {
  if (!userId) {
    throw new Error('user_id é obrigatório para atualizar usuário.');
  }

  try {
    const resposta = await fetchComTimeout(URL_BASE, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        action: 'update_user',
        ...dadosUsuario,
      }),
    });

    const jsonDados = await extrairJsonResposta(resposta);

    if (!resposta.ok) {
      throw new Error(jsonDados.erro || `Erro ao atualizar usuário: ${resposta.status}`);
    }

    return jsonDados;
  } catch (erro) {
    console.error('[API] Erro em atualizarUsuario:', erro.message);
    throw erro;
  }
};
