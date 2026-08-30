'use client'

import { useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  CircleCheck,
  Copy,
  Database,
  Download,
  Info,
  ShieldCheck,
  TriangleAlert,
  Upload
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatTile } from '@/components/shared/stat-tile'
import {
  runIngestionPipeline,
  selectBatch,
  selectIngestionSources,
  type IngestionSourceId,
  type PipelineRun,
} from '@/lib/selectors/ingestion'
import { formatNumber } from '@/lib/format'
import { salesforceCrm } from '@/lib/crm/salesforce-crm'
import { useCrmStore } from '@/store/crm-store'
import { cn } from '@/lib/utils'

/**
 * Data ingestion console.
 *
 * Demonstration only — nothing streams in real time. It pulls a batch from the
 * seeded book and runs it through the same EAI and sanitization steps the
 * architecture page draws, so the pipeline is operable rather than illustrative.
 *
 * The funnel is computed before anything is committed and has to reconcile:
 * received = duplicates + rejected + written. Only the survivors are ingested,
 * which is what makes the numbers mean something.
 */

const BATCH_SIZE = 1000

export function IngestionConsole() {
  const leads = useCrmStore((s) => s.leads)
  const engagements = useCrmStore((s) => s.engagements)
  const ingestedLeadIds = useCrmStore((s) => s.ingestedLeadIds)

  const [sourceId, setSourceId] = useState<IngestionSourceId>('salesforce')
  const [preview, setPreview] = useState<PipelineRun | null>(null)
  const [committed, setCommitted] = useState<number | null>(null)

  /*
   * The upload control.
   *
   * The file is genuinely read — name, size, row count and column headers all
   * come from what the user picked, so the panel responds to their data rather
   * than playing a canned animation. Nothing is merged: no lead is created and
   * the store is never touched. The result panel says so in as many words,
   * because a control this convincing has to be unambiguous about what it did
   * not do.
   */
  const fileRef = useRef<HTMLInputElement>(null)
  const [upload, setUpload] = useState<{
    name: string
    sizeKb: number
    rows: number
    columns: string[]
  } | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
      const header = lines[0]?.split(',').map((h) => h.trim().replace(/^"|"$/g, '')) ?? []
      setUpload({
        name: file.name,
        sizeKb: Math.max(1, Math.round(file.size / 1024)),
        // First line is the header, so the body is what would be ingested.
        rows: Math.max(0, lines.length - 1),
        columns: header.slice(0, 8),
      })
    }
    reader.readAsText(file)
  }

  const sources = useMemo(
    () => selectIngestionSources({ leads, engagements, ingestedLeadIds }),
    [leads, engagements, ingestedLeadIds],
  )

  const active = sources.find((s) => s.id === sourceId)
  const totalPending = leads.length - ingestedLeadIds.length

  function handlePull() {
    const batch = selectBatch({
      leads,
      engagements,
      ingestedLeadIds,
      sourceId,
      size: BATCH_SIZE,
    })
    setPreview(runIngestionPipeline(batch))
    setCommitted(null)
  }

  function handleCommit() {
    if (!preview) return
    // Only the survivors. Duplicates and rejects never reach the CRM, which is
    // the whole point of showing the funnel before writing it.
    salesforceCrm.ingestSanitizedData(preview.writtenIds)
    setCommitted(preview.written)
    setPreview(null)
  }

  return (
    <div className="animate-fade-in space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile
          label="Awaiting ingestion"
          value={formatNumber(totalPending)}
          sub="Records not yet through EAI"
          icon={Download}
        />
        <StatTile
          label="Ingested"
          value={formatNumber(ingestedLeadIds.length)}
          sub="Eligible for DICE reasoning"
          icon={CircleCheck}
          accent="text-kpmg-teal"
          accentBg="bg-kpmg-teal/10"
        />
        <StatTile
          label="Connected sources"
          value={`${sources.filter((s) => s.pending + s.ingested > 0).length}`}
          sub={`of ${sources.length} configured`}
          icon={Database}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[340px_minmax(0,1fr)]">
        {/* Sources */}
        <Card className="flex min-w-0 flex-col">
          <CardHeader>
            <CardTitle>Source systems</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul>
              {sources.map((source) => {
                const selected = source.id === sourceId
                return (
                  <li key={source.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSourceId(source.id)
                        setPreview(null)
                        setCommitted(null)
                      }}
                      className={cn(
                        'flex w-full items-center gap-2.5 border-b border-slate-100 px-4 py-2.5 text-left transition-colors last:border-0',
                        selected ? 'bg-kpmg-blue/[0.06]' : 'hover:bg-slate-50',
                      )}
                    >
                      <span
                        className={cn(
                          'size-2 shrink-0 rounded-full',
                          source.pending > 0
                            ? 'bg-kpmg-teal'
                            : 'bg-slate-300',
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-semibold text-slate-900">
                          {source.label}
                        </span>
                        <span className="block truncate text-[11px] text-slate-500">
                          {source.sublabel}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="nums block text-[12.5px] font-bold text-slate-900">
                          {formatNumber(source.pending)}
                        </span>
                        <span className="block text-[10px] uppercase tracking-wider text-slate-400">
                          pending
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>

        {/* Bring your own file — visible, and honest about being a demonstration */}
      <Card className="lg:col-start-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            <Upload className="size-4 text-kpmg-blue" />
            Import a file
          </CardTitle>
          <span className="text-[10.5px] font-medium text-slate-400">
            CSV · demonstration
          </span>
        </CardHeader>
        <CardContent className="pb-4">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="hidden"
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload />
            Choose a CSV file
          </Button>

          {upload && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Validated &mdash; not merged
              </p>
              <p className="nums mt-1.5 text-[12.5px] font-semibold text-slate-800">
                {upload.name}
              </p>
              <p className="nums mt-0.5 text-[11.5px] text-slate-500">
                {formatNumber(upload.rows)} row(s) · {formatNumber(upload.sizeKb)} KB ·{' '}
                {upload.columns.length} column(s) detected
              </p>
              {upload.columns.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {upload.columns.map((c) => (
                    <span
                      key={c}
                      className="rounded-full bg-white px-2 py-0.5 text-[10.5px] font-medium text-slate-600 ring-1 ring-slate-200"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2.5 text-[11.5px] leading-relaxed text-slate-600">
                This is a demonstration environment. The file was read to show
                what an import would carry — nothing has been written, no lead
                was created, and the figures on every other screen are unchanged.
              </p>
            </div>
          )}

          {!upload && (
            <p className="mt-2.5 text-[11.5px] leading-relaxed text-slate-500">
              Shows what a customer file would bring in. Records are read and
              reported, never merged into the demonstration book.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pipeline */}
        <Card className="flex min-w-0 flex-col">
          <CardHeader>
            <CardTitle>EAI &rarr; sanitization &rarr; CRM</CardTitle>
            <span className="text-[10.5px] font-medium text-slate-400">
              Batch of {formatNumber(BATCH_SIZE)}
            </span>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handlePull} disabled={!active?.pending}>
                <Download />
                {active?.pending
                  ? `Pull batch from ${active.label}`
                  : 'Nothing pending on this source'}
              </Button>
              {preview && (
                <Button variant="outline" onClick={handleCommit}>
                  <ShieldCheck />
                  Write {formatNumber(preview.written)} to CRM
                </Button>
              )}
            </div>

            {committed !== null && (
              <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-kpmg-teal/25 bg-kpmg-teal/[0.05] p-3">
                <CircleCheck
                  className="mt-0.5 size-4 shrink-0 text-kpmg-teal"
                  strokeWidth={2.3}
                />
                <p className="text-[12px] leading-relaxed text-slate-600">
                  {formatNumber(committed)} record(s) written to Salesforce and
                  logged to the CRM activity feed. They are now eligible for DICE
                  reasoning — Next Best Action and the copilots can act on them.
                </p>
              </div>
            )}

            {preview && (
              <>
                <ol className="mt-3 space-y-2">
                  <Stage
                    icon={Download}
                    label="Received via EAI"
                    value={preview.received}
                    note="Connectors, event routing, rate and retry handling"
                  />
                  <Stage
                    icon={Copy}
                    label="De-duplication"
                    value={preview.duplicates}
                    note="Colliding phone or email against records already seen"
                    tone="amber"
                  />
                  <Stage
                    icon={ShieldCheck}
                    label="PII masked"
                    value={preview.piiFieldsMasked}
                    note="Phone and email values masked on the way in"
                  />
                  <Stage
                    icon={TriangleAlert}
                    label="Validation rejected"
                    value={preview.rejected}
                    note={
                      preview.rejectionReasons.length
                        ? preview.rejectionReasons
                            .map((r) => `${r.reason} (${formatNumber(r.count)})`)
                            .join(' · ')
                        : 'Every record passed the validation rules'
                    }
                    tone="amber"
                  />
                  <Stage
                    icon={CircleCheck}
                    label="Written to CRM"
                    value={preview.written}
                    note="Cleaned records landing in Salesforce as native objects"
                    tone="teal"
                  />
                </ol>

                <p className="nums mt-2.5 text-[11px] text-slate-400">
                  {formatNumber(preview.received)} received ={' '}
                  {formatNumber(preview.duplicates)} duplicates +{' '}
                  {formatNumber(preview.rejected)} rejected +{' '}
                  {formatNumber(preview.written)} written
                </p>
              </>
            )}

            {!preview && committed === null && (
              <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
                Pull a batch to see what the EAI layer would deliver and what
                sanitization would do to it. Nothing is written until you commit
                it.
              </p>
            )}

            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-kpmg-blue/20 bg-kpmg-blue/[0.04] p-3">
              <Info
                className="mt-0.5 size-4 shrink-0 text-kpmg-blue"
                strokeWidth={2.1}
              />
              <p className="text-[12px] leading-relaxed text-slate-600">
                Demonstration pipeline. Records are pulled from the seeded book
                rather than streamed from a live system, but every count is
                computed from the records in the batch — duplicates from
                colliding contact details, rejections from conflicts already
                recorded against the lead.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Stage({
  icon: Icon,
  label,
  value,
  note,
  tone = 'slate',
}: {
  icon: typeof Download
  label: string
  value: number
  note: string
  tone?: 'slate' | 'amber' | 'teal'
}) {
  const ink =
    tone === 'teal'
      ? 'text-kpmg-teal'
      : tone === 'amber' && value > 0
        ? 'text-amber-600'
        : 'text-slate-400'

  return (
    <li className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white p-2.5">
      <Icon className={cn('mt-0.5 size-4 shrink-0', ink)} strokeWidth={2.1} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[12.5px] font-semibold text-slate-900">{label}</p>
          <p className="nums shrink-0 text-[13px] font-bold text-slate-900">
            {formatNumber(value)}
          </p>
        </div>
        <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{note}</p>
      </div>
      <ArrowRight className="sr-only" aria-hidden />
    </li>
  )
}
