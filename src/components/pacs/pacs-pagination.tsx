'use client';

import { TablePagination, type TablePaginationProps } from '@/components/ui/table-pagination';

export type PacsPaginationProps = TablePaginationProps;

export function PacsPagination(props: TablePaginationProps) {
  return <TablePagination {...props} itemName="studies" />;
}
