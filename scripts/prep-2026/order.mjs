// Sets sort_order on an existing category from an explicit importance list
// (no rows inserted). Throws if the list and the category drift apart, so a
// new or renamed question can't silently fall out of the order.
export const orderPatch = (category, ORDER) => async db => {
  const { data, error } = await db.from('coding_questions').select('id, title').eq('category', category)
  if (error) throw new Error(error.message)
  const byTitle = new Map(data.map(r => [r.title, r.id]))
  const dupes = ORDER.filter((t, i) => ORDER.indexOf(t) !== i)
  const missing = ORDER.filter(t => !byTitle.has(t))
  const unordered = data.filter(r => !ORDER.includes(r.title)).map(r => r.title)
  if (dupes.length || missing.length || unordered.length) throw new Error(`${category} order out of sync — dupes: ${dupes.join(', ')} · missing: ${missing.join(', ')} · unordered: ${unordered.join(', ')}`)
  for (const [i, title] of ORDER.entries()) {
    const res = await db.from('coding_questions').update({ sort_order: i + 1 }).eq('id', byTitle.get(title))
    if (res.error) throw new Error(`${title}: ${res.error.message}`)
  }
  return ORDER.length
}

// Deletes the DROP titles from a category (and the old Coding-module picks
// that reference them without a cascade), then applies orderPatch.
export const dropAndOrderPatch = (category, DROP, ORDER) => async db => {
  const { data, error } = await db.from('coding_questions').select('id').eq('category', category).in('title', DROP)
  if (error) throw new Error(error.message)
  const ids = data.map(r => r.id)
  if (ids.length) {
    const picks = await db.from('coding_daily_questions').delete().in('question_id', ids)
    if (picks.error) throw new Error(picks.error.message)
    const del = await db.from('coding_questions').delete().in('id', ids)
    if (del.error) throw new Error(del.error.message)
  }
  return orderPatch(category, ORDER)(db)
}
