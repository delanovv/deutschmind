const ARTICLE_PATTERN = /^(der|die|das|den|dem|des|ein|eine|einen|einem|einer)\s+/i;

export function normalizeText(text = "") {
  return text
    .toLowerCase()
    .replace(/[^a-zäöüß0-9\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text) {
  const normalized = normalizeText(text);
  return normalized ? normalized.split(" ") : [];
}

function nodeAliases(node) {
  const label = normalizeText(node.label);
  const withoutArticle = label.replace(ARTICLE_PATTERN, "");
  return [...new Set([label, withoutArticle, normalizeText(node.id.replaceAll("-", " "))])].filter(Boolean);
}

export function matchTokensToNodes(tokens, graph) {
  const tokenMatches = new Map();
  graph.nodes.filter((node) => node.type !== "topic").forEach((node) => {
    nodeAliases(node).filter((alias) => !alias.includes(" ")).forEach((alias) => {
      if (!tokenMatches.has(alias)) tokenMatches.set(alias, node);
    });
  });
  return tokens.map((token) => ({ text: token, node: tokenMatches.get(token) || null }));
}

export function matchPhrases(text, graph) {
  const normalized = normalizeText(text);
  const matches = [];
  graph.nodes.filter((node) => node.type !== "topic").forEach((node) => {
    const candidates = [
      ...nodeAliases(node),
      ...(node.collocations || []).map((item) => normalizeText(item.de))
    ].filter((candidate) => candidate.includes(" "));
    if (candidates.some((candidate) => normalized.includes(candidate))) {
      matches.push(node);
    }
  });
  return [...new Map(matches.map((node) => [node.id, node])).values()];
}

export function analyzeText(text, graph) {
  const tokens = tokenize(text);
  const matched = matchTokensToNodes(tokens, graph);
  const matchedPhrases = matchPhrases(text, graph);
  const phraseNodeIds = new Set(matchedPhrases.map((node) => node.id));
  const uniqueNodes = [...new Map(
    [...matched.map((item) => item.node).filter(Boolean), ...matchedPhrases]
      .map((node) => [node.id, node])
  ).values()];
  const knownWords = uniqueNodes.filter((node) => node.status === "known");
  const boundaryWords = uniqueNodes.filter((node) => node.status === "boundary");
  const graphUnknownWords = uniqueNodes.filter((node) => node.status === "unknown");
  const unmatchedTokens = [...new Set(matched.filter((item) => !item.node).map((item) => item.text))]
    .filter((token) => token.length > 2);
  const unknownWords = [
    ...graphUnknownWords,
    ...unmatchedTokens.map((token) => ({
      id: null,
      label: token,
      status: "unknown",
      translationRu: "Нет в текущей карте"
    }))
  ];
  const recommendedWords = [...boundaryWords, ...graphUnknownWords].slice(0, 8);
  return {
    knownWords,
    boundaryWords,
    unknownWords,
    matchedPhrases: matchedPhrases.map((node) => ({
      node,
      collocations: node.collocations || [],
      matchedAsPhrase: phraseNodeIds.has(node.id)
    })),
    recommendedWords,
    summary: {
      totalTokens: tokens.length,
      knownCount: matched.filter((item) => item.node?.status === "known").length,
      boundaryCount: matched.filter((item) => item.node?.status === "boundary").length,
      unknownCount: matched.filter((item) => !item.node || item.node.status === "unknown").length
    },
    highlightedTokens: matched.map(({ text: token, node }) => ({
      text: token,
      status: node?.status || "unknown",
      nodeId: node?.id || null
    }))
  };
}
