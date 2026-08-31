'use client';

import { useEffect, useRef } from 'react';

interface ArticleContentProps {
  className: string;
  html: string;
}

const MIN_COLUMN_WEIGHT = 10;
const MAX_COLUMN_WEIGHT = 80;

export default function ArticleContent({ className, html }: ArticleContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    contentRef.current?.querySelectorAll<HTMLTableElement>('table').forEach((table) => {
      const rows = Array.from(table.rows);
      const columnCount = rows.reduce(
        (largest, row) => Math.max(largest, Array.from(row.cells).reduce((total, cell) => total + cell.colSpan, 0)),
        0,
      );
      if (columnCount === 0) return;

      const weights = Array.from({ length: columnCount }, () => MIN_COLUMN_WEIGHT);
      rows.forEach((row) => {
        let columnIndex = 0;
        Array.from(row.cells).forEach((cell) => {
          const contentLength = (cell.textContent || '').replace(/\s+/g, ' ').trim().length;
          const weightPerColumn = Math.max(MIN_COLUMN_WEIGHT, contentLength / cell.colSpan);
          for (let offset = 0; offset < cell.colSpan; offset += 1) {
            weights[columnIndex + offset] = Math.min(
              MAX_COLUMN_WEIGHT,
              Math.max(weights[columnIndex + offset] || MIN_COLUMN_WEIGHT, weightPerColumn),
            );
          }
          columnIndex += cell.colSpan;
        });
      });

      const totalWeight = weights.reduce((total, weight) => total + weight, 0);
      rows.forEach((row) => {
        let columnIndex = 0;
        Array.from(row.cells).forEach((cell) => {
          const cellWeight = weights
            .slice(columnIndex, columnIndex + cell.colSpan)
            .reduce((total, weight) => total + weight, 0);
          cell.style.width = `${(cellWeight / totalWeight) * 100}%`;
          columnIndex += cell.colSpan;
        });
      });
    });
  }, [html]);

  return <div ref={contentRef} className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
