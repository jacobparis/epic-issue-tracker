import { type Issue } from '@prisma/client'
import { type SerializeFrom } from '@remix-run/node'

import { Link, useNavigate } from '@remix-run/react'
import {
	useReactTable,
	type ColumnDef,
	getCoreRowModel,
	flexRender,
} from '@tanstack/react-table'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table.tsx'

type IssueRow = Pick<
	SerializeFrom<Issue>,
	'id' | 'number' | 'project' | 'title' | 'status' | 'priority' | 'createdAt'
>

export const columns: ColumnDef<IssueRow>[] = [
	{
		accessorKey: 'number',
		header: '#',
		cell({ row }) {
			if (!row.original.number)
				return (
					<span className="min-w-[4rem]">
						<span className="sr-only">Creating…</span>
					</span>
				)

			const idString = String(row.original.number).padStart(3, '0')

			return (
				<Link
					to={`/issues/${row.original.project}-${row.original.number}`}
					className="min-w-[4rem] text-muted-foreground"
				>
					{idString}
				</Link>
			)
		},
	},
	{
		header: 'Title',
		accessorKey: 'title',
		cell({ row }) {
			return <span className="font-medium">{row.getValue('title')}</span>
		},
	},
	{
		accessorKey: 'priority',
		header: 'Priority',
	},
	{
		accessorKey: 'status',
		header: 'Status',
	},
	{
		accessorKey: 'createdAt',
		header: 'Created',
		accessorFn(row) {
			return new Date(row.createdAt).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
			})
		},
		cell({ row }) {
			return (
				<span className="whitespace-nowrap">{row.getValue('createdAt')}</span>
			)
		},
	},
]

export function IssuesTable({ issues }: { issues: Array<IssueRow> }) {
	const navigate = useNavigate()

	const table = useReactTable({
		data: issues,
		columns,
		getCoreRowModel: getCoreRowModel(),
	})

	return (
		<div>
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map(headerGroup => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map(header => {
								return (
									<TableHead key={header.id}>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
											  )}
									</TableHead>
								)
							})}
						</TableRow>
					))}
				</TableHeader>

				<colgroup>
					{/* Make the title column take up the rest of available space */}
					{table.getAllColumns().map(column => (
						<col
							key={column.id}
							className={column.id === 'title' ? 'w-full' : 'w-0'}
						/>
					))}
				</colgroup>

				<TableBody>
					{table.getRowModel().rows?.length ? (
						table.getRowModel().rows.map(row => (
							<TableRow
								key={row.id}
								data-state={row.getIsSelected() && 'selected'}
								className="cursor-pointer hover:bg-background/50 data-[state=selected]:bg-background"
							>
								{row.getVisibleCells().map(cell => (
									<TableCell
										key={cell.id}
										onClick={event => {
											// Don't navigate on pending issues
											if (!row.original.number) return

											navigate(
												`/issues/${row.original.project}-${row.original.number}`,
											)
										}}
									>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell colSpan={columns.length} className="h-24 text-center">
								No results.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	)
}
