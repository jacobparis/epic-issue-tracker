import { type Issue } from '@prisma/client'
import { type SerializeFrom } from '@remix-run/node'

import { Link, useNavigate } from '@remix-run/react'
import {
	useReactTable,
	type ColumnDef,
	getCoreRowModel,
	flexRender,
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Button } from '#app/components/ui/button'
import { Checkbox } from '#app/components/ui/checkbox'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table.tsx'
import { useBulkDeleteIssues } from './useBulkDeleteIssues'

type IssueRow = Pick<
	SerializeFrom<Issue>,
	'id' | 'number' | 'project' | 'title' | 'status' | 'priority' | 'createdAt'
>

export const columns: ColumnDef<IssueRow>[] = [
	{
		id: 'select',
		cell: ({ row }) => (
			<div className="mr-2">
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={value => row.toggleSelected(Boolean(value))}
					aria-label="Select row"
					className="translate-y-[2px]"
				/>
			</div>
		),
	},
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
	const [rowSelection, setRowSelection] = useState({})

	const [deletedIssueIds, deleteIssues] = useBulkDeleteIssues()

	const memoizedIssues = useMemo(() => {
		return issues.filter(issue => !deletedIssueIds.includes(issue.id))
	}, [deletedIssueIds, issues])

	const table = useReactTable({
		data: memoizedIssues,
		columns,
		state: {
			rowSelection,
		},
		enableRowSelection: true,
		onRowSelectionChange: setRowSelection,
		getCoreRowModel: getCoreRowModel(),
		getRowId: row => row.id,
	})

	const isAllSelected = Object.keys(rowSelection).length === issues.length

	const selectAll = () => {
		table.setRowSelection(existingSelection => {
			const selection = { ...existingSelection }

			for (const issue of issues) {
				selection[issue.id] = true
			}

			return selection
		})
	}

	useHotkeys('meta+a', event => {
		event.preventDefault()

		selectAll()
	})

	useHotkeys('meta+shift+a', event => {
		event.preventDefault()

		table.resetRowSelection()
	})

	return (
		<div>
			<div className="flex items-center gap-x-4 p-2">
				<span className="inline-flex h-8 items-center justify-center gap-x-2 text-sm tabular-nums text-gray-600">
					<Checkbox
						checked={isAllSelected}
						onCheckedChange={() => {
							if (isAllSelected) {
								table.resetRowSelection()
								return
							}

							selectAll()
						}}
						className="mr-2"
					/>
					{`${Object.keys(rowSelection).length} selected`}
				</span>

				{Object.keys(rowSelection).length > 0 ? (
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							const issueIds = Object.keys(rowSelection)

							deleteIssues({ issueIds })

							table.resetRowSelection()
						}}
					>
						{`Delete ${Object.keys(rowSelection).length} items`}
					</Button>
				) : null}
			</div>
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map(headerGroup => (
						<TableRow key={headerGroup.id} className="sr-only">
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

											// Don't navigate if this is a checkbox
											if (cell.column.id === 'select') return

											if (event.metaKey) {
												row.toggleSelected()
												return
											}

											// Don't navigate if other checkboxes are clicked
											if (table.getIsSomeRowsSelected()) return

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
