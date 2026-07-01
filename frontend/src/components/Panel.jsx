import React, { useState } from 'react'

export default function Panel({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`panel ${open ? 'panel-open' : ''}`}>
      <button className="panel-header" onClick={() => setOpen((o) => !o)}>
        <span>{title}</span>
        <span className="panel-chevron">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="panel-body">{children}</div>}
    </div>
  )
}
