import { useEffect, useMemo, useRef, useState } from 'react'
import { downloadCsv } from '../utils/csv'

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' }

function getSortValue(col, row) {
  return col.sortValue ? col.sortValue(row) : row[col.key]
}

function compare(a, b) {
  if (a == null) a = ''
  if (b == null) b = ''
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

function SortIcon({ state }) {
  return (
    <span className="ml-1 inline-flex flex-col text-[7px] leading-[7px]">
      <span className={state === 'asc' ? 'text-indigo-600' : 'text-slate-300'}>▲</span>
      <span className={state === 'desc' ? 'text-indigo-600' : 'text-slate-300'}>▼</span>
    </span>
  )
}

function CsvButton({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
    >
      ↓ {label}
    </button>
  )
}

// Collapse the visible columns into header groups: runs of adjacent columns
// sharing the same `group` become one spanning cell, everything else stands
// alone. Returns null when no column declares a group, so the common case keeps
// its single header row untouched.
function buildGroups(cols) {
  if (!cols.some((c) => c.group)) return null
  const groups = []
  for (const col of cols) {
    const last = groups[groups.length - 1]
    if (col.group && last && last.group === col.group) last.cols.push(col)
    else groups.push({ group: col.group || null, cols: [col] })
  }
  return groups
}

/**
 * columns: [{ key, label, align?, sortable?, group?, render?(row), sortValue?(row), csvValue?(row), totalRender?(total) }]
 * group       — columns sharing this label render under one spanning header (two-row thead)
 * title       — render a card header (indigo accent bar + title) with the CSV button inline
 * headerExtra — extra node shown in the title header (left of the CSV button)
 * showRank    — prepend a "#" rank column
 * maxHeight   — make the body scrollable with a sticky header + sticky total row
 */
export default function DataTable({
  columns,
  rows,
  defaultSort,
  pageSize = 50,
  csvFilename,
  csvLabel = 'Download CSV',
  totalRow,
  rowKey,
  emptyText = 'No matching rows',
  title,
  headerExtra,
  showRank = false,
  maxHeight,
  unit,
  headerBg = 'bg-slate-50',
  headerText = 'text-slate-500',
}) {
  const [sort, setSort] = useState(defaultSort || null)
  const [page, setPage] = useState(0)
  const scrollRef = useRef(null)

  // Columns flagged `hidden` are excluded from the table but still exported to CSV.
  const visibleColumns = useMemo(() => columns.filter((c) => !c.hidden), [columns])
  const headerGroups = useMemo(() => buildGroups(visibleColumns), [visibleColumns])

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col) return rows
    const dir = sort.dir === 'desc' ? -1 : 1
    return [...rows].sort((a, b) => dir * compare(getSortValue(col, a), getSortValue(col, b)))
  }, [rows, sort, columns])

  useEffect(() => {
    setPage(0)
  }, [rows, sort])

  // Reset scroll to the top when the visible page changes.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [page, sort, rows])

  const paged = pageSize ? sorted.slice(page * pageSize, page * pageSize + pageSize) : sorted
  const pageCount = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1
  const rankOffset = pageSize ? page * pageSize : 0

  function toggleSort(col) {
    if (col.sortable === false) return
    setSort((prev) => {
      if (!prev || prev.key !== col.key) return { key: col.key, dir: 'desc' }
      return { key: col.key, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
    })
  }

  function exportCsv() {
    downloadCsv(csvFilename || 'export.csv', columns, sorted)
  }

  const sticky = maxHeight ? 'sticky top-0 z-10' : ''
  // Sub-header row sits directly below the group row; h-10 on both keeps the
  // 40px offset exact, so nothing overlaps or gaps while the body scrolls.
  const stickySub = maxHeight ? 'sticky top-10 z-10' : ''
  const stickyFoot = maxHeight ? 'sticky bottom-0 z-10' : ''
  const colSpan = visibleColumns.length + (showRank ? 1 : 0)

  // A normal sortable column header, shared by the flat and grouped layouts.
  function headerCell(col, extra = {}) {
    const active = sort && sort.key === col.key
    const { stickyClass = sticky, className = '', ...rest } = extra
    return (
      <th
        key={col.key}
        onClick={() => toggleSort(col)}
        className={`${stickyClass} h-10 whitespace-nowrap ${headerBg} px-4 py-3 text-xs font-semibold ${headerText} ${
          alignClass[col.align] || alignClass.left
        } ${col.sortable === false ? '' : 'cursor-pointer select-none hover:text-slate-900'} ${className}`}
        {...rest}
      >
        <span className={`inline-flex items-center ${col.align === 'right' ? 'justify-end' : ''}`}>
          {col.label}
          {col.sortable !== false && <SortIcon state={active ? sort.dir : null} />}
        </span>
      </th>
    )
  }

  const rankHeader = ({ className = '', ...rest } = {}) => (
    <th
      className={`${sticky} h-10 ${headerBg} px-4 py-3 text-left text-xs font-semibold ${headerText} ${className}`}
      {...rest}
    >
      #
    </th>
  )

  const thead = headerGroups ? (
    // Two-row header: grouped columns get a spanning banner, ungrouped ones
    // stretch across both rows so they still read as single headers.
    <thead>
      <tr>
        {showRank && rankHeader({ rowSpan: 2, className: 'border-b border-slate-200' })}
        {headerGroups.map((g) =>
          g.group ? (
            <th
              key={`group-${g.group}`}
              colSpan={g.cols.length}
              className={`${sticky} h-10 whitespace-nowrap border-x border-slate-300 ${headerBg} px-4 py-3 text-center text-xs font-semibold ${headerText}`}
            >
              {g.group}
            </th>
          ) : (
            headerCell(g.cols[0], { rowSpan: 2, className: 'border-b border-slate-200' })
          ),
        )}
      </tr>
      <tr>
        {headerGroups.flatMap((g) =>
          g.group
            ? g.cols.map((col, i) =>
                headerCell(col, {
                  stickyClass: stickySub,
                  // Bottom border lives on the cells, not the row: the ungrouped
                  // rowSpan=2 headers above sit outside this <tr>.
                  className: `border-b border-slate-200 ${i === 0 ? 'border-l border-slate-300' : ''} ${
                    i === g.cols.length - 1 ? 'border-r border-slate-300' : ''
                  }`,
                }),
              )
            : [],
        )}
      </tr>
    </thead>
  ) : (
    <thead>
      <tr className="border-b border-slate-200">
        {showRank && rankHeader()}
        {visibleColumns.map((col) => headerCell(col))}
      </tr>
    </thead>
  )

  const table = (
    <table className="min-w-full text-sm">
      {thead}
      <tbody>
        {paged.length === 0 && (
          <tr>
            <td colSpan={colSpan} className="px-4 py-10 text-center text-slate-400">
              {emptyText}
            </td>
          </tr>
        )}
        {paged.map((row, i) => (
          <tr
            key={rowKey ? rowKey(row) : i}
            className="border-b border-slate-100 last:border-0 even:bg-slate-50/60 hover:bg-indigo-50/50"
          >
            {showRank && <td className="px-4 py-3 text-left text-slate-400">{rankOffset + i + 1}</td>}
            {visibleColumns.map((col) => (
              <td
                key={col.key}
                className={`whitespace-nowrap px-4 py-3 text-slate-700 ${alignClass[col.align] || alignClass.left}`}
              >
                {col.render ? col.render(row) : row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      {totalRow && (
        <tfoot>
          <tr className="border-t-2 border-slate-200 font-semibold text-slate-800">
            {showRank && <td className={`${stickyFoot} bg-slate-100 px-4 py-3`} />}
            {visibleColumns.map((col, idx) => (
              <td
                key={col.key}
                className={`${stickyFoot} whitespace-nowrap bg-slate-100 px-4 py-3 ${
                  alignClass[col.align] || alignClass.left
                }`}
              >
                {col.totalRender ? col.totalRender(totalRow) : idx === 0 && !showRank ? 'Total' : ''}
              </td>
            ))}
          </tr>
        </tfoot>
      )}
    </table>
  )

  const pagination = pageSize && sorted.length > 0 && (
    <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
      <span>
        Showing {paged.length.toLocaleString('en-US')} of {sorted.length.toLocaleString('en-US')}
        {unit ? ` ${unit}` : ''}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
        >
          ← Prev
        </button>
        <span>
          Page {page + 1} of {pageCount}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          disabled={page >= pageCount - 1}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  )

  // Card-with-title mode (used by the Overview sections).
  if (title) {
    return (
      <div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="h-5 w-1.5 rounded-full bg-indigo-500" />
              <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            </div>
            <div className="flex items-center gap-3">
              {headerExtra}
              {csvFilename && <CsvButton onClick={exportCsv} label={csvLabel} />}
            </div>
          </div>
          <div ref={scrollRef} className={maxHeight ? 'overflow-auto' : 'overflow-x-auto'} style={maxHeight ? { maxHeight } : undefined}>
            {table}
          </div>
        </div>
        {pagination}
      </div>
    )
  }

  // Plain mode (used by Enterprise / Rooftop views).
  return (
    <div>
      {csvFilename && (
        <div className="mb-3 flex justify-end">
          <CsvButton onClick={exportCsv} label={csvLabel} />
        </div>
      )}
      <div
        ref={scrollRef}
        className={`rounded-xl border border-slate-200 bg-white shadow-sm ${maxHeight ? 'overflow-auto' : 'overflow-x-auto'}`}
        style={maxHeight ? { maxHeight } : undefined}
      >
        {table}
      </div>
      {pagination}
    </div>
  )
}
