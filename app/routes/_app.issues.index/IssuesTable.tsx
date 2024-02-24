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
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table.tsx'
import { useAppData } from '../_app'
import { useBulkDeleteIssues } from './useBulkDeleteIssues'
import { useBulkEditIssues } from './useBulkEditIssues'

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
		id: 'number',
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
		id: 'title',
		header: 'Title',
		accessorKey: 'title',
		cell({ row }) {
			return <span className="font-medium">{row.getValue('title')}</span>
		},
	},
	{
		id: 'priority',
		accessorKey: 'priority',
		header: 'Priority',
	},
	{
		id: 'status',
		accessorKey: 'status',
		header: 'Status',
	},
	{
		id: 'createdAt',
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

export function IssuesTable({
	issues,
	issueIds,
	pageSize,
}: {
	issues: Array<IssueRow>
	issueIds: Array<string>
	pageSize: number
}) {
	const navigate = useNavigate()
	const [rowSelection, setRowSelection] = useState({})

	const [deletedIssueIds, deleteIssues] = useBulkDeleteIssues()
	const [editedIssues, editIssues] = useBulkEditIssues()

	const memoizedIssues = useMemo(() => {
		return issues
			.slice(0, pageSize + deletedIssueIds.length)
			.filter(issue => !deletedIssueIds.includes(issue.id))
			.map(issue => {
				const editedIssue = editedIssues.findLast(editedIssue =>
					editedIssue.issueIds.includes(issue.id),
				)

				if (editedIssue) {
					return {
						...issue,
						...editedIssue.changeset,
					}
				}

				return issue
			})
	}, [deletedIssueIds, editedIssues, issues, pageSize])

	const extraRows = Array(Math.max(0, pageSize - memoizedIssues.length)).fill(
		undefined,
	)

	const table = useReactTable({
		data: memoizedIssues,
		manualPagination: true,
		columns,
		state: {
			rowSelection,
		},
		enableRowSelection: true,
		onRowSelectionChange: setRowSelection,
		getCoreRowModel: getCoreRowModel(),
		getRowId: row => row.id,
	})

	const selectedIds = Object.keys(rowSelection)
	const isCurrentPageSelected = memoizedIssues.every(
		row => row.id in rowSelection,
	)
	const isAllSelected = issueIds.every(issueId => issueId in rowSelection)

	const selectAll = () => {
		table.setRowSelection(existingSelection => {
			const selection = { ...existingSelection }

			for (const issueId of issueIds) {
				selection[issueId] = true
			}

			return selection
		})
	}

	const selectPage = () => {
		table.setRowSelection(existingSelection => {
			const selection = { ...existingSelection }
			const pageIssues = issues.slice(0, pageSize)
			for (const issue of pageIssues) {
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

	const { tableSchema } = useAppData()

	return (
		<div>
			<div
				className="flex items-center gap-x-2 p-2"
				key={selectedIds.join(',')}
			>
				<span className="inline-flex h-8 items-center justify-center gap-x-2 text-sm tabular-nums text-gray-600">
					<Checkbox
						checked={isCurrentPageSelected}
						onCheckedChange={() => {
							if (isCurrentPageSelected) {
								table.resetRowSelection()
								return
							}

							selectPage()
						}}
						className="mr-2"
					/>
					{`${selectedIds.length} / ${issueIds.length}`}
				</span>

				{isAllSelected ? (
					<Button variant="link" onClick={() => table.resetRowSelection()}>
						Deselect
					</Button>
				) : (
					<Button variant="link" onClick={selectAll}>
						Select all
					</Button>
				)}

				{selectedIds.length > 0 ? (
					<>
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								deleteIssues({
									issueIds: selectedIds,
								})

								table.resetRowSelection()
							}}
						>
							Delete
						</Button>

						<Select
							onValueChange={value => {
								editIssues({
									issueIds: selectedIds,
									changeset: { priority: value },
								})
							}}
						>
							<SelectTrigger aria-label="Priority">
								<SelectValue placeholder="Priority" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									{tableSchema.priorities.map(value => (
										<SelectItem key={value} value={value}>
											{value}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</>
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
						<>
							{table.getRowModel().rows.map(row => (
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
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))}

							{extraRows.map((row, i) => (
								<TableRow
									className="p-2"
									key={`extra-${i}`}
									data-key={`extra-${i}`}
								>
									{columns.map(column => (
										<TableCell key={column.id} data-key={column.id}>
											<div className="h-5" />
										</TableCell>
									))}
								</TableRow>
							))}
						</>
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
