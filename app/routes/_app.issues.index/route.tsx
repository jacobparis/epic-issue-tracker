// http://localhost:3000/issues

import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { invariant } from '@epic-web/invariant'
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
import { CreateIssueSchema } from './CreateIssueDialog'
import { IssuesTable } from './IssuesTable'
import { PaginationBar, IssuePaginationSchema } from './PaginationBar'
import { BulkDeleteIssuesSchema } from './useBulkDeleteIssues'
import { BulkEditIssuesSchema } from './useBulkEditIssues'

export const meta: MetaFunction = () => [
	{
		title: 'Issues',
	},
]

const CreateIssueInlineSchema = z.object({
	intent: z.literal('create-issue-inline'),
	title: z.string({ required_error: 'An issue must have a title' }).min(1),
})

export async function action({ request }: ActionFunctionArgs) {
	const submission = await parseRequest(request, {
		schema: z.discriminatedUnion('intent', [
			CreateIssueSchema,
			CreateIssueInlineSchema,
			BulkDeleteIssuesSchema,
			BulkEditIssuesSchema,
		]),
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{
				status: submission.status === 'error' ? 400 : 200,
			},
		)
	}

	await wait(3000)

	if (submission.value.intent === 'delete-issues') {
		await deleteIssues(submission.value)

		return json({ result: submission.reply() })
	}

	if (submission.value.intent === 'edit-issues') {
		await editIssues(submission.value)

		return json({ result: submission.reply() })
	}

	if (
		submission.value.intent === 'create-issue-inline' ||
		submission.value.intent === 'create-issue'
	) {
		let newIssueId = await createIssue(submission.value)

		return json(
			{
				result: submission.reply({ resetForm: true }),
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

async function editIssues({
	issueIds,
	changeset,
}: {
	issueIds: Array<string>
	changeset: { status?: string; priority?: string }
}) {
	await prisma.issue.updateMany({
		where: {
			id: {
				in: issueIds,
			},
		},
		data: changeset,
	})
}

async function createIssue(
	issue: Omit<z.infer<typeof CreateIssueSchema>, 'intent'>,
) {
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
				status: issue.status ?? 'todo',
				priority: issue.priority ?? 'medium',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		})
	})
	return newIssueId
}

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)

	const submission = parseWithZod(url.searchParams, {
		schema: IssuePaginationSchema.partial(),
	})

	invariant(submission.status === 'success', 'Invalid query params')

	const { skip = 0, take = 10 } = submission.value

	const whenTotalIssues = prisma.issue.count()
	const whenIssues = prisma.issue.findMany({
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
		skip,
		take,
	})

	return json({
		issues: await whenIssues,
		totalIssues: await whenTotalIssues,
	})
}

export default function Issues() {
	const { issues, totalIssues } = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()

	const submit = useSubmit()
	const fetchers = useFetchers()
	const pendingIssueFetchers = fetchers.filter(
		fetcher =>
			fetcher.formData?.get('intent') === 'create-issue-inline' ||
			fetcher.formData?.get('intent') === 'create-issue',
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
					status: String(fetcher.formData?.get('status')) ?? 'todo',
					priority: String(fetcher.formData?.get('priority')) ?? 'medium',
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
		id: 'create-issue-inline',
		// Adds required, min, etc props to the fields based on the schema
		constraint: getZodConstraint(CreateIssueInlineSchema),
		// Tells conform about any errors we've had
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: CreateIssueInlineSchema })
		},
		onSubmit(event) {
			event.preventDefault()
			const form = event.currentTarget as HTMLFormElement

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
			<PaginationBar total={totalIssues} className="mt-2" />
			<div className="mt-8">
				<Form method="POST" {...getFormProps(form)}>
					<input type="hidden" name="intent" value={form.id} />

					<div className="flex items-end gap-x-2">
						<Field
							labelProps={{ children: 'New issue' }}
							inputProps={getInputProps(fields.title, { type: 'text' })}
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
