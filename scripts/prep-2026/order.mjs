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
