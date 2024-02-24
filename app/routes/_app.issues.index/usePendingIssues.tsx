import { parseWithZod } from '@conform-to/zod'
import { useFetchers } from '@remix-run/react'
import { z } from 'zod'
import { CreateIssueSchema } from './CreateIssueDialog'
import { CreateIssueInlineSchema } from './CreateIssueInlineForm'

export function usePendingIssues() {
	const fetchers = useFetchers()

	return fetchers.flatMap(fetcher => {
		if (!fetcher.formData) return []

		const submission = parseWithZod(fetcher.formData, {
			schema: z.discriminatedUnion('intent', [
				CreateIssueSchema,
				CreateIssueInlineSchema,
			]),
		})

		if (submission.status !== 'success') return []

		const defaultData =
			submission.value.intent === 'create-issue'
				? {
						title: submission.value.title,
						status: submission.value.status || 'todo',
						priority: submission.value.priority || 'medium',
				  }
				: {
						title: submission.value.title,
						status: 'todo',
						priority: 'medium',
				  }

		return {
			id: fetcher.key,
			project: 'EIT',
			number: 0,
			title: defaultData.title,
			status: defaultData.status,
			priority: defaultData.priority,
			createdAt: new Date().toString(),
		}
	})
}
