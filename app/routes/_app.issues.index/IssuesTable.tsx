import { type Issue } from '@prisma/client'
import { type SerializeFrom } from '@remix-run/node'

import { Link, useNavigate } from '@remix-run/react'

import { type MouseEventHandler, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
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
import { useAppData } from '../_app'
import { CreateSampleIssuesDialog } from './CreateSampleIssuesDialog'
import { useBulkDeleteIssues } from './useBulkDeleteIssues'
import { useBulkEditIssues } from './useBulkEditIssues'
import { usePendingIssues } from './usePendingIssues'

type IssueRow = Pick<
	SerializeFrom<Issue>,
	'id' | 'number' | 'project' | 'title' | 'status' | 'priority' | 'createdAt'
>

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
	const [state, setState] = useState(1)
	const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
	console.log(rowSelection)
	const [deletedIssueIds, deleteIssues] = useBulkDeleteIssues()
	const [editedIssues, editIssues] = useBulkEditIssues()
	const pendingIssues = usePendingIssues()

	const memoizedIssues = useMemo(() => {
		return issues
			.slice(0, pageSize ? pageSize + deletedIssueIds.length : undefined)
			.filter(issue => !deletedIssueIds.includes(issue.id))
			.concat(pendingIssues)
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
	}, [deletedIssueIds, editedIssues, issues, pageSize, pendingIssues])

	const extraRows = Array(Math.max(0, pageSize - memoizedIssues.length)).fill(
		undefined,
	)

	const selectedIds = Object.keys(rowSelection)
	const isCurrentPageSelected = memoizedIssues.every(
		row => row.id in rowSelection,
	)
	const isAllSelected = issueIds.every(issueId => issueId in rowSelection)

	const selectAll = () => {
		setRowSelection(existingSelection => {
			const selection = { ...existingSelection }

			for (const issueId of issueIds) {
				selection[issueId] = true
			}

			return selection
		})
	}

	const selectPage = () => {
		setRowSelection(existingSelection => {
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

		setRowSelection({})
	})

	const { tableSchema } = useAppData()

	return (
		<div>
			{memoizedIssues.length > 0 ? (
				<div
					className="flex items-center gap-x-2 p-2"
					key={selectedIds.join(',')}
				>
					<span className="inline-flex h-8 items-center justify-center gap-x-2 text-sm tabular-nums text-gray-600">
						<Checkbox
							checked={isCurrentPageSelected}
							onCheckedChange={() => {
								if (isCurrentPageSelected) {
									setRowSelection({})
									return
								}

								selectPage()
							}}
							className="mr-2"
						/>
						{`${selectedIds.length} / ${
							issueIds.length - deletedIssueIds.length
						}`}
					</span>

					{isAllSelected ? (
						<Button variant="link" onClick={() => setRowSelection({})}>
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

									setRowSelection({})
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
			) : null}
			<div className="text-sm">
				<div className="grid grid-cols-[min-content_min-content_1fr_min-content_min-content_min-content]">
					{memoizedIssues.length > 0 ? (
						<>
							{memoizedIssues.map(issue => {
								const navigateToIssue: MouseEventHandler = event => {
									// Don't navigate on pending issues
									if (!issue.number) return

									if (event.metaKey) {
										setRowSelection(existingSelection => {
											const selection = { ...existingSelection }
											selection[issue.id] = !selection[issue.id]
											return selection
										})

										return
									}

									// Don't navigate if other checkboxes are clicked
									if (Object.values(rowSelection).some(Boolean)) return

									navigate(`/issues/${issue.project}-${issue.number}`)
								}

								return (
									<div
										key={issue.id}
										data-state={rowSelection[issue.id] && 'selected'}
										className="grid-cols-subgrid col-span-6 grid hover:bg-background/50 data-[state=selected]:bg-background"
									>
										<div className="p-2 align-middle">
											<Checkbox
												checked={rowSelection[issue.id] ?? false}
												onCheckedChange={value => {
													setRowSelection(existingSelection => {
														const selection = { ...existingSelection }
														if (!value) {
															delete selection[issue.id]
														} else {
															selection[issue.id] = true
														}

														return selection
													})
												}}
												aria-label="Select row"
												className="translate-y-[2px]"
											/>
										</div>

										<div className="p-2 align-middle">
											{!issue.number ? (
												<span className="min-w-[4rem]">
													<span className="sr-only">Creating…</span>
												</span>
											) : (
												<Link
													to={`/issues/${issue.project}-${issue.number}`}
													className="min-w-[4rem] text-muted-foreground"
												>
													{String(issue.number).padStart(3, '0')}
												</Link>
											)}
										</div>

										<div className="p-2 align-middle" onClick={navigateToIssue}>
											<span className="font-medium">{issue.title}</span>
										</div>

										<div className="p-2 align-middle" onClick={navigateToIssue}>
											<span>{issue.priority}</span>
										</div>

										<div className="p-2 align-middle" onClick={navigateToIssue}>
											<span>{issue.status}</span>
										</div>

										<div className="p-2 align-middle" onClick={navigateToIssue}>
											<span className="whitespace-nowrap">
												{issue.createdAt}
											</span>
										</div>
									</div>
								)
							})}

							{extraRows.map((row, i) => (
								<div className="p-2" key={`extra-${i}`} data-key={`extra-${i}`}>
									<div className="h-5" />
								</div>
							))}
						</>
					) : (
						<div className="h-24 text-center">
							No issues found.
							<br />
							<CreateSampleIssuesDialog />
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
