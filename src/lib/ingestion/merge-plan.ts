import { createSlicer } from '@/lib/async'
import { coerceRow, coerceRows } from './unflatten'
import { mergeOrder, SCHEMAS, type RecordSchema, type RecordType } from './schemas'

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
 *
 * Two entry points, one set of rules. `planMerge` is synchronous and total;
 * `planMergeAsync` is the same decision made in slices so a 39,000-record book
 * can report progress instead of freezing the tab. The per-record judgement is
 * shared between them — two copies could disagree about what counts as a
 * rejection, and the funnel on screen has to reconcile.
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

/**
 * One axis, not two.
 *
 * Reporting "rows within this type" alongside "types finished" reads naturally
 * and cannot be turned into a percentage without double-counting the boundary
 * where both advance at once — the bar jumps forward, then back. Rows across
 * the whole import is monotonic by construction and lands on exactly 1.
 */
export interface PlanProgress {
  /** The type currently being judged, for the label. */
  type: RecordType
  /** Rows judged across every type, against the import's total. */
  rowsDone: number
  rowsTotal: number
}

type Coerced = { id: string } & Record<string, unknown>

/** What one record type accumulates as its rows are judged. */
interface TypeAcc {
  received: number
  accepted: Coerced[]
  reasons: Map<string, number>
  /** Ids already met in this file — a repeat is the later row winning. */
  seenInFile: Set<string>
  replacing: number
}

const newAcc = (): TypeAcc => ({
  received: 0,
  accepted: [],
  reasons: new Map(),
  seenInFile: new Set(),
  replacing: 0,
})

/**
 * The whole per-record judgement, in one place.
 *
 * Mutates the accumulator rather than returning a verdict, because a rejection
 * has to be *counted under its reason* as well as excluded — dropping a row
 * without saying why is the failure this function exists to prevent.
 */
function admit(
  record: Coerced,
  schema: RecordSchema,
  resolvable: Partial<Record<RecordType, Set<string>>>,
  existingForType: ReadonlySet<string>,
  acc: TypeAcc,
): void {
  acc.received += 1

  const note = (reason: string) =>
    acc.reasons.set(reason, (acc.reasons.get(reason) ?? 0) + 1)

  if (!record.id) {
    note('Missing id')
    return
  }

  for (const ref of schema.refs) {
    const value = record[ref.field]
    if (typeof value !== 'string' || !value) {
      note(`Missing ${ref.field}`)
      return
    }
    if (!resolvable[ref.to]?.has(value)) {
      note(`${ref.field} matches no ${SCHEMAS[ref.to].label.toLowerCase()} record`)
      return
    }
  }

  if (existingForType.has(record.id) && !acc.seenInFile.has(record.id)) {
    acc.replacing += 1
  }
  acc.seenInFile.add(record.id)
  acc.accepted.push(record)
}

/** Closes one type: its plan row, and the ids it makes resolvable for the next. */
function closeType(
  type: RecordType,
  acc: TypeAcc,
  resolvable: Partial<Record<RecordType, Set<string>>>,
): TypePlan {
  const pool = resolvable[type] ?? new Set<string>()
  for (const r of acc.accepted) pool.add(r.id)
  resolvable[type] = pool

  return {
    type,
    received: acc.received,
    accepted: acc.accepted,
    rejected: acc.received - acc.accepted.length,
    reasons: [...acc.reasons.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
    replacing: acc.replacing,
  }
}

/** Ids that will exist once earlier types in this same import are merged. */
function seedResolvable(existing: ExistingIds) {
  const resolvable: Partial<Record<RecordType, Set<string>>> = {}
  for (const [type, ids] of Object.entries(existing)) {
    resolvable[type as RecordType] = new Set(ids)
  }
  return resolvable
}

const totals = (byType: TypePlan[]): MergePlan => ({
  byType,
  totalReceived: byType.reduce((a, t) => a + t.received, 0),
  totalAccepted: byType.reduce((a, t) => a + t.accepted.length, 0),
  totalRejected: byType.reduce((a, t) => a + t.rejected, 0),
})

export function planMerge(
  grouped: Partial<Record<RecordType, Record<string, string>[]>>,
  existing: ExistingIds,
): MergePlan {
  const byType: TypePlan[] = []
  const resolvable = seedResolvable(existing)

  for (const type of mergeOrder(Object.keys(grouped) as RecordType[])) {
    const rows = grouped[type]
    if (!rows?.length) continue

    const { records } = coerceRows<Coerced>(type, rows)
    const schema = SCHEMAS[type]
    const acc = newAcc()
    const existingForType = resolvable[type] ?? new Set<string>()

    for (const record of records) {
      admit(record, schema, resolvable, existingForType, acc)
    }

    byType.push(closeType(type, acc, resolvable))
  }

  return totals(byType)
}

/**
 * The same plan, computed in slices.
 *
 * Coercion and judgement run in one pass here rather than the two the sync
 * version uses. Not a shortcut: coercing 39,000 rows into an array and only
 * then walking it doubles the peak memory for no benefit, and the intermediate
 * array is exactly what the sliced version has no reason to hold.
 */
export async function planMergeAsync(
  grouped: Partial<Record<RecordType, Record<string, string>[]>>,
  existing: ExistingIds,
  onProgress?: (progress: PlanProgress) => void,
): Promise<MergePlan> {
  const byType: TypePlan[] = []
  const resolvable = seedResolvable(existing)
  const order = mergeOrder(Object.keys(grouped) as RecordType[]).filter(
    (type) => grouped[type]?.length,
  )

  const slicer = createSlicer()
  const rowsTotal = order.reduce((sum, type) => sum + (grouped[type]?.length ?? 0), 0)
  let rowsDone = 0

  for (const type of order) {
    const rows = grouped[type] ?? []
    const schema = SCHEMAS[type]
    const acc = newAcc()
    const existingForType = resolvable[type] ?? new Set<string>()

    for (const row of rows) {
      if (slicer.expired()) {
        onProgress?.({ type, rowsDone, rowsTotal })
        await slicer.next()
      }
      const { record } = coerceRow<Coerced>(type, row)
      admit(record, schema, resolvable, existingForType, acc)
      rowsDone += 1
    }

    byType.push(closeType(type, acc, resolvable))
  }

  // Guarded: an import of nothing has no type to name, and the caller renders
  // this one straight into a label.
  const last = order[order.length - 1]
  if (last) onProgress?.({ type: last, rowsDone, rowsTotal })
  return totals(byType)
}
