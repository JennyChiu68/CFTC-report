// Adapt the existing UI's two read-only requests to one coherent Pages snapshot.
export function createPagesDataClient(base, fetcher = globalThis.fetch.bind(globalThis)) {
  let snapshot;
  return async function fetchData(input, options = {}) {
    const url = new URL(input, 'https://preview.invalid');
    if (!['/api/cftc-market', '/api/cftc-history'].includes(url.pathname)) {
      return Response.json({ error: 'Unsupported preview request' }, { status: 404 });
    }
    if (!snapshot || url.pathname === '/api/cftc-market') {
      snapshot = fetcher(base + 'data/market.json', { ...options, cache: 'no-cache' })
        .then(async response => {
          if (!response.ok) throw new Error('CFTC preview data unavailable');
          const data = await response.json();
          if (!data.histories || !Object.keys(data.histories).length) throw new Error('Empty CFTC data');
          return data;
        });
    }
    const data = await snapshot;
    if (url.pathname === '/api/cftc-market') {
      return Response.json({ ...data, histories: Object.fromEntries(
        Object.entries(data.histories).map(([symbol, points]) => [symbol, points.slice(0, 26)])
      ) });
    }
    const symbol = url.searchParams.get('symbol')?.toUpperCase();
    if (!Object.hasOwn(data.histories, symbol)) {
      return Response.json({ error: '不支持的品种' }, { status: 400 });
    }
    return Response.json({ symbol, snapshots: data.histories[symbol], source: data.source, syncedAt: data.syncedAt });
  };
}
