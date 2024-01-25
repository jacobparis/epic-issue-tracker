import { useFetchers, useSubmit } from '@remix-run/react'
import { z } from 'zod'
import { useShallowArrayMemo } from '#app/utils/misc'

export const BulkDeleteIssuesSchema = z.object({
	intent: z.literal('delete-issues'),
	issueIds: z.array(z.string()),
})

type BulkDeletePayload = z.infer<typeof BulkDeleteIssuesSchema>

export function useBulkDeleteIssues() {
	type BaseFetcher = ReturnType<typeof useFetchers>[number]
	const submit = useSubmit()

	const fetchers = useFetchers() as Array<
		Omit<BaseFetcher, 'json'> & {
			json?: {
				intent: string
			}
		}
	>

	const deletedIssueIds = fetchers
		.filter(fetcher => fetcher.json?.intent === 'delete-issues')
		.flatMap(fetcher => BulkDeleteIssuesSchema.parse(fetcher.json).issueIds)
		.filter(Boolean)

	return [
		useShallowArrayMemo(deletedIssueIds),
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
