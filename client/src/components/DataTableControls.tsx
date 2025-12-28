interface DataTableControlsProps {
  search: string
  onSearchChange: (value: string) => void
  pageSize: number
  onPageSizeChange: (value: number) => void
}

export default function DataTableControls({ search, onSearchChange, pageSize, onPageSizeChange }: DataTableControlsProps) {
  return (
    <div className="row g-2 align-items-center mb-3">
      <div className="col-12 col-md-6">
        <input
          type="search"
          className="form-control"
          placeholder="Search by SKU, name, or category"
          aria-label="Search products"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="col-8 col-md-6">
        <select
          className="form-control"
          aria-label="Rows per page"
          value={pageSize}
          onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
        >
          <option value={5}>5 per page</option>
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
        </select>
      </div>
    </div>
  )
}
