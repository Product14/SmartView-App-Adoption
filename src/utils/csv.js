function cell(v) {
  if (v == null) v = ''
  v = String(v)
  if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"'
  return v
}

// columns: [{ label, csvValue?(row), key }], rows: object[]
export function downloadCsv(filename, columns, rows) {
  const header = columns.map((c) => cell(c.label)).join(',')
  const body = rows.map((r) =>
    columns.map((c) => cell(c.csvValue ? c.csvValue(r) : r[c.key])).join(','),
  )
  const csv = [header, ...body].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
