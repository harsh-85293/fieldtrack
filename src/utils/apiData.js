/**
 * Normalize API list payloads.
 * Backend paginateResult shape: { results, total, page, limit, pages }
 */
export function extractList(responseOrData, ...extraKeys) {
  const body = responseOrData?.data ?? responseOrData;
  const data = body?.data ?? body;

  if (Array.isArray(data)) return data;

  const keys = ['results', 'items', 'rows', ...extraKeys];
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  return [];
}

export function extractPagination(responseOrData) {
  const body = responseOrData?.data ?? responseOrData;
  const data = body?.data ?? body;

  return {
    page: data?.page || 1,
    pages: data?.pages || data?.totalPages || 1,
    total: data?.total || 0,
    limit: data?.limit || 20,
  };
}
