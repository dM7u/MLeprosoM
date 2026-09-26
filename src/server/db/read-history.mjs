import 'server-only';

/** Append-only tables only. Exact totals detect inserts between offset pages.
 * UUID ordering is transport order, never a sporting/observation tie breaker.
 * Count and rows must come from the same PostgREST request snapshot.
 */
export async function readHistory(query, {pageSize = 100, maxPages = 1000} = {}) {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || !Number.isSafeInteger(maxPages) || maxPages < 1) throw new Error('INVALID_HISTORY_OPTIONS');
  const rows = [], ids = new Set();
  let total = null, previous = null;
  for (let page = 0; page < maxPages; page++) {
    const {data, error, count} = await query().order('id', {ascending:true}).range(rows.length, rows.length + pageSize - 1);
    if (error || !Array.isArray(data) || !Number.isSafeInteger(count) || count < 0) throw new Error('HISTORY_UNAVAILABLE');
    if (total !== null && total !== count) throw new Error('HISTORY_CHANGED');
    total = count;
    if (data.length > pageSize || rows.length + data.length > total || (!data.length && rows.length < total)) throw new Error('HISTORY_INCOMPLETE');
    for (const row of data) {
      if (typeof row?.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(row.id) || ids.has(row.id) || (previous !== null && row.id <= previous)) throw new Error('HISTORY_INVALID_ORDER');
      ids.add(row.id); previous = row.id; rows.push(row);
    }
    if (rows.length === total) return rows;
  }
  throw new Error('HISTORY_RESOURCE_LIMIT');
}
