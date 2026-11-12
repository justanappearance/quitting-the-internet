// Sets each day's status from Mike's Notion "Energy Tracker": a day is clean only if a row dated
// that day has "No Internet" in Potential Causes. Anything else - including a day with no row at
// all - counts as relapsed, which is how Mike logs it (Mike, 2026-11-12).
// Notion is the source of truth only from SYNC_START on; older days keep what /admin logged.
const NOTION_DATABASE_ID = '3737b954a45980d48a6cdc9a0623a045'
const CLEAN_CAUSE = 'No Internet'
const SYNC_START = '2026-10-20' // the second start date
const TIME_ZONE = 'America/Chicago'

async function cleanDatesFromNotion() {
  const clean = new Set()
  let cursor
  do {
    const resp = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: { property: 'Potential Causes', multi_select: { contains: CLEAN_CAUSE } },
        start_cursor: cursor,
        page_size: 100,
      }),
    })
    if (!resp.ok) throw new Error(`Notion ${resp.status}: ${await resp.text()}`)
    const page = await resp.json()
    for (const row of page.results) {
      const start = row.properties.Date?.date?.start
      if (start) clean.add(start.slice(0, 10))
    }
    cursor = page.has_more ? page.next_cursor : undefined
  } while (cursor)
  return clean
}

// Today is still in progress (and Vercel runs in UTC), so only days through yesterday in
// Mike's time zone are settled.
function settledDates() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date())
  const dates = []
  for (let d = new Date(`${SYNC_START}T00:00:00Z`); d.toISOString().slice(0, 10) < today; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

// No auth on purpose: it only copies Notion's answer onto the already-public calendar, so
// anyone triggering it early changes nothing. `?dry=1` reports without writing.
export default async function handler(req, res) {
  let clean
  try {
    clean = await cleanDatesFromNotion()
  } catch (e) {
    return res.status(502).json({ error: e.message })
  }

  const rows = settledDates().map(date => ({ date, relapsed: !clean.has(date) }))
  if (req.query.dry !== '1' && rows.length) {
    const resp = await fetch(`${process.env.SUPABASE_URL}/rest/v1/internet_entries`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(rows),
    })
    if (!resp.ok) return res.status(500).json({ error: 'Database error' })
  }

  res.status(200).json({
    written: req.query.dry !== '1',
    clean: rows.filter(r => !r.relapsed).map(r => r.date),
    relapsed: rows.filter(r => r.relapsed).map(r => r.date),
  })
}
