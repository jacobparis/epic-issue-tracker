import { useSubmit } from '@remix-run/react'
import { z } from 'zod'

export const BulkDeleteIssuesSchema = z.object({
	intent: z.literal('delete-issues'),
	issueIds: z.array(z.string()),
})

type BulkDeletePayload = z.infer<typeof BulkDeleteIssuesSchema>

export function useBulkDeleteIssues() {
	const submit = useSubmit()

	return ({ issueIds }: Omit<BulkDeletePayload, 'intent'>) =>
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
		)
}
