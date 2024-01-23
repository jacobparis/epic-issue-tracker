// http://localhost:3000/issues

import { conform, useForm } from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import {
	type MetaFunction,
	type ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import {
	Form,
	useActionData,
	useFetchers,
	useLoaderData,
	useSubmit,
} from '@remix-run/react'
import { useMemo } from 'react'
import { z } from 'zod'
import { Field } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { wait, parseRequest } from '#app/utils/misc'
import { createToastHeaders } from '#app/utils/toast.server'
import { parseProjectAndNumber } from '../_app.issues.$tag/parseProjectAndNumber'
import { IssuesTable } from './IssuesTable'

export const meta: MetaFunction = () => [
	{
		title: 'Issues',
	},
]

const CreateIssueSchema = z.object({
	intent: z.literal('create-issue'),
	title: z.string({ required_error: 'An issue must have a title' }).min(1),
	description: z.string().optional(),
})

const BulkDeleteIssueSchema = z.object({
	intent: z.literal('delete-issues'),
	issueIds: z.array(z.string()),
})

export async function action({ request }: ActionFunctionArgs) {
	const submission = await parseRequest(request, {
		schema: z.discriminatedUnion('intent', [
			CreateIssueSchema,
			BulkDeleteIssueSchema,
		]),
	})

	if (!submission.value) {
		return json({ status: 'error', submission } as const, { status: 400 })
	}

	await wait(3000)

	if (submission.value.intent === 'delete-issues') {
		await deleteIssues(submission.value)

		return json({ success: true, submission })
	}

	if (submission.value.intent === 'create-issue') {
		let newIssueId = await createIssue(submission.value)

		return json(
			{
				success: true,
				submission: {
					...submission,
					payload: null,
				},
			},
			{
				headers: await createToastHeaders({
					description: `Created issue EIT-${String(newIssueId).padStart(
						3,
						'0',
					)} `,
					type: 'success',
				}),
			},
		)
	}
}

async function deleteIssues({ issueIds }: { issueIds: Array<string> }) {
	// TODO: gracefully delete relations to issues
	await prisma.issue.deleteMany({
		where: {
			id: {
				in: issueIds,
			},
		},
	})
}

async function createIssue(issue: {
	title: string
	description?: string | undefined
}) {
	let newIssueId = 0
	await prisma.$transaction(async tx => {
		const highestId = await tx.issue.findFirst({
			where: {
				project: 'EIT',
			},
			orderBy: {
				number: 'desc',
			},
			select: {
				number: true,
			},
		})

		newIssueId = highestId ? highestId.number + 1 : 1

		await tx.issue.create({
			data: {
				project: 'EIT',
				number: newIssueId,
				title: issue.title,
				description: issue.description,
				status: 'todo',
				priority: 'medium',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		})
	})
	return newIssueId
}

export async function loader({ request }: LoaderFunctionArgs) {
	const issues = await prisma.issue.findMany({
		orderBy: {
			createdAt: 'asc',
		},
		select: {
			id: true,
			project: true,
			number: true,
			title: true,
			status: true,
			priority: true,
			createdAt: true,
		},
	})

	return json({
		issues,
	})
}

export default function Issues() {
	const { issues } = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()

	const submit = useSubmit()
	const fetchers = useFetchers()
	const pendingIssueFetchers = fetchers.filter(
		fetcher => fetcher.formData?.get('intent') === 'create-issue-form',
	)

	const deletedIssueTags = fetchers
		.filter(fetcher => fetcher.data?.status !== 'error')
		.map(fetcher => {
			const [intent, key] = fetcher.key.split('@')
			return { intent, key }
		})
		.filter(({ intent }) => intent === 'delete-issue')
		.map(({ key }) => parseProjectAndNumber(key))

	const memoizedIssues = useMemo(() => {
		return issues
			.concat(
				...pendingIssueFetchers.map(fetcher => ({
					id: fetcher.key,
					project: 'EIT',
					number: 0,
					title: String(fetcher.formData?.get('title')),
					status: 'todo',
					priority: 'medium',
					createdAt: new Date().toString(),
				})),
			)
			.filter(issue => {
				return !deletedIssueTags.some(
					({ project, number }) =>
						issue.project === project && issue.number === number,
				)
			})
	}, [issues, pendingIssueFetchers, deletedIssueTags])

	const [form, fields] = useForm({
		id: 'create-issue-form',
		// Adds required, min, etc props to the fields based on the schema
		constraint: getFieldsetConstraint(CreateIssueSchema),
		// Tells conform about any errors we've had
		lastSubmission: actionData?.submission,
		onValidate({ formData }) {
			return parse(formData, { schema: CreateIssueSchema })
		},
		onSubmit(event) {
			event.preventDefault()
			const form = event.currentTarget

			submit(form, {
				navigate: false,
				unstable_flushSync: true,
			})

			// scroll to bottom of page
			window.scrollTo(0, document.body.scrollHeight)

			// reset title input
			const titleInput = form['title'] as unknown as HTMLInputElement
			titleInput.value = ''
		},
	})

	return (
		<div className="mx-auto max-w-4xl p-4">
			<IssuesTable issues={memoizedIssues} />

			<div className="mt-8">
				<Form method="POST" {...form.props}>
					<input type="hidden" name="intent" value={form.id} />

					<div className="flex items-end gap-x-2">
						<input type="hidden" name="intent" value="create-issue" />

						<Field
							labelProps={{ children: 'New issue' }}
							inputProps={conform.input(fields.title)}
							errors={fields.title.errors}
							className="grow"
						/>

						<Button type="submit" className="mb-8">
							Create
						</Button>
					</div>
				</Form>
			</div>
		</div>
	)
}
