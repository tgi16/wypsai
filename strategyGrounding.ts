export type StrategyWebSource = {
  title: string;
  url: string;
};

export const extractStrategyWebSources = (response: any): StrategyWebSource[] => {
  const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks)) return [];
  const seen = new Set<string>();
  return chunks.map((chunk: any) => ({
    title: String(chunk?.web?.title || 'Source').replace(/[\[\]\n\r]/g, ' ').trim().slice(0, 120),
    url: String(chunk?.web?.uri || '').trim(),
  })).filter((source: StrategyWebSource) => {
    if (!/^https?:\/\//i.test(source.url) || seen.has(source.url)) return false;
    seen.add(source.url);
    return true;
  }).slice(0, 8);
};

export const appendStrategySources = (text: string, sources: StrategyWebSource[]) => {
  if (!sources.length) return text;
  return `${text.trim()}\n\n**Web Sources**\n${sources.map((source) => `- [${source.title}](${source.url.replace(/\)/g, '%29')})`).join('\n')}`;
};
