import { coerceRows } from './unflatten'
import { mergeOrder, SCHEMAS, type RecordType } from './schemas'

/**
 * Decides what an import would write, before anything is written.
 *
 * The same propose-then-commit shape the rest of the platform uses: the plan is
 * computed and shown, and only then does a human commit it.
 *
 * Leads are validated by the existing ingestion pipeline, which owns the rules
 * for a contactable person. The other eleven types are not leads and must not be
 * forced through a lead validator — their rule is referential integrity: a row
 * whose foreign key resolves to nothing is rejected and counted, never silently
 * dropped.
 */

export interface TypePlan {
  type: RecordType
  received: number
  accepted: { id: string }[]
  rejected: number
  reasons: { reason: string; count: number }[]
  /** Rows whose id already exists, and which will therefore replace it. */
  replacing: number
}

export interface MergePlan {
  byType: TypePlan[]
  totalReceived: number
  totalAccepted: number
  totalRejected: number
}

/** Existing ids per type, so a foreign key can resolve against the book. */
export type ExistingIds = Partial<Record<RecordType, ReadonlySet<string>>>

export function planMerge(
  grouped: Partial<Record<RecordType, Record<string, string>[]>>,
  existing: ExistingIds,
): MergePlan {
  const byType: TypePlan[] = []

  // Ids that will exist once earlier types in this same import are merged —
  // an engagement may legitimately reference a lead arriving in this upload.
  const resolvable: Partial<Record<RecordType, Set<string>>> = {}
  for (const [type, ids] of Object.entries(existing)) {
    resolvable[type as RecordType] = new Set(ids)
  }

  for (const type of mergeOrder(Object.keys(grouped) as RecordType[])) {
    const rows = grouped[type]
    if (!rows?.length) continue

    const { records } = coerceRows<{ id: string } & Record<string, unknown>>(type, rows)
    const schema = SCHEMAS[type]
    const reasons = new Map<string, number>()
    const accepted: { id: string }[] = []
    const existingForType = resolvable[type] ?? new Set<string>()
    let replacing = 0

    // Within one file the same id twice is the later row winning, not two
    // records — the upsert would collapse them anyway, so count it here.
    const seenInFile = new Set<string>()

    for (const record of records) {
      if (!record.id) {
        reasons.set('Missing id', (reasons.get('Missing id') ?? 0) + 1)
        continue
      }

      let rejected: string | null = null
      for (const ref of schema.refs) {
        const value = record[ref.field]
        if (typeof value !== 'string' || !value) {
          rejected = `Missing ${ref.field}`
          break
        }
        if (!resolvable[ref.to]?.has(value)) {
          rejected = `${ref.field} matches no ${SCHEMAS[ref.to].label.toLowerCase()} record`
          break
        }
      }

      if (rejected) {
        reasons.set(rejected, (reasons.get(rejected) ?? 0) + 1)
        continue
      }

      if (existingForType.has(record.id) && !seenInFile.has(record.id)) replacing += 1
      seenInFile.add(record.id)
      accepted.push(record)
    }

    // Accepted ids become resolvable for the types that depend on this one.
    const pool = resolvable[type] ?? new Set<string>()
    for (const r of accepted) pool.add(r.id)
    resolvable[type] = pool

    byType.push({
      type,
      received: records.length,
      accepted,
      rejected: records.length - accepted.length,
      reasons: [...reasons.entries()]
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count),
      replacing,
    })
  }

  return {
    byType,
    totalReceived: byType.reduce((a, t) => a + t.received, 0),
    totalAccepted: byType.reduce((a, t) => a + t.accepted.length, 0),
    totalRejected: byType.reduce((a, t) => a + t.rejected, 0),
  }
}
