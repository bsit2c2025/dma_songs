export default function DataTable({ columns, rows, rowKey, emptyMessage = "Nothing here yet." }) {
  if (!rows.length) {
    return <p className="py-10 text-center text-sm text-muted">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-primary/10">
      <table className="min-w-full divide-y divide-primary/10 text-sm">
        <thead className="bg-primary/5">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-2 text-left font-semibold text-primary">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-primary/10 bg-white">
          {rows.map((row) => (
            <tr key={row[rowKey]}>
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-2 align-middle text-primary">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
