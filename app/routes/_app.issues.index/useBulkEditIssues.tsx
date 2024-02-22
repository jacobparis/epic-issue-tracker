import { useFetchers, useSubmit } from '@remix-run/react'
import { useMemo } from 'react'
import { z } from 'zod'

export const BulkEditIssuesSchema = z.object({
	intent: z.literal('edit-issues'),
	issueIds: z.array(z.string()),
	changeset: z.object({
		status: z.string().optional(),
		priority: z.string().optional(),
	}),
})

type BulkEditPayload = z.infer<typeof BulkEditIssuesSchema>

export function useBulkEditIssues() {
	type BaseFetcher = ReturnType<typeof useFetchers>[number]
	const submit = useSubmit()

	const fetchers = useFetchers() as Array<
		Omit<BaseFetcher, 'json'> & {
			json?: {
				intent: string
			}
		}
	>

	const editedIssues = useMemo(() => {
		return fetchers
			.filter(fetcher => fetcher.json?.intent === 'edit-issues')
			.flatMap(fetcher => BulkEditIssuesSchema.parse(fetcher.json))
			.filter(Boolean)
	}, [fetchers])

	return [
		editedIssues,
		({ issueIds, changeset }: Omit<BulkEditPayload, 'intent'>) =>
			submit(
				{
					intent: 'edit-issues',
					issueIds,
					changeset,
				} satisfies BulkEditPayload,
				{
					method: 'POST',
					action: '/issues',
					encType: 'application/json',
					navigate: false,
					fetcherKey: 'edit-issues',
				},
			),
	] as const
}
