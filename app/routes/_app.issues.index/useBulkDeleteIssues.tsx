import { useFetchers, useSubmit } from '@remix-run/react'
import { z } from 'zod'
import { parseFetcher } from '#app/utils/misc.js'

export const BulkDeleteIssuesSchema = z.object({
	intent: z.literal('delete-issues'),
	issueIds: z.array(z.string()),
})

type BulkDeletePayload = z.infer<typeof BulkDeleteIssuesSchema>

export function useBulkDeleteIssues() {
	const submit = useSubmit()
	const fetchers = useFetchers()

	const deletedIssueIds = fetchers.flatMap(fetcher => {
		if (!fetcher) return []
		const result = parseFetcher(fetcher, {
			schema: BulkDeleteIssuesSchema,
		})

		if (result.status !== 'success') return []
		if (!result.value) return []

		return result.value.issueIds
	})

	return [
		deletedIssueIds,
		({ issueIds }: Omit<BulkDeletePayload, 'intent'>) =>
			submit(
				{
					intent: 'delete-issues',
					issueIds,
				} satisfies BulkDeletePayload,
				{
					method: 'POST',
					action: '/issues',
					encType: 'application/json',
					navigate: false,
				},
			),
	] as const
}
