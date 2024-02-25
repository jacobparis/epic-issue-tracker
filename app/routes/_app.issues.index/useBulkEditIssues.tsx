import { useFetchers, useSubmit } from '@remix-run/react'
import { useMemo } from 'react'
import { z } from 'zod'
import { parseFetcher } from '#app/utils/misc.js'

export const BulkEditIssuesSchema = z.object({
	intent: z.literal('edit-issues'),
	issueIds: z.array(z.string()),
	changeset: z.object({
		status: z.string().optional(),
		priority: z.string().optional(),
		title: z.string().optional(),
		description: z.string().optional(),
	}),
})

type BulkEditPayload = z.infer<typeof BulkEditIssuesSchema>

export function useBulkEditIssues() {
	const submit = useSubmit()
	const fetchers = useFetchers()

	const editedIssues = useMemo(() => {
		return fetchers.flatMap(fetcher => {
			if (!fetcher) return []
			const result = parseFetcher(fetcher, {
				schema: BulkEditIssuesSchema,
			})

			if (result.status !== 'success') return []
			if (!result.value) return []

			return result.value
		})
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
