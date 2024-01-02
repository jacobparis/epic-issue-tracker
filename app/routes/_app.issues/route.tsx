// http://localhost:3000/issues

import { conform, useForm } from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import { invariant } from '@epic-web/invariant'
import { type MetaFunction, type DataFunctionArgs, json } from '@remix-run/node'
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
import { wait } from '#app/utils/misc'
import { createToastHeaders } from '#app/utils/toast.server'
import { IssuesTable } from './IssuesTable'

export const meta: MetaFunction = () => [
	{
		title: 'Issues',
	},
]

const CreateIssueSchema = z.object({
	title: z.string({ required_error: 'An issue must have a title' }).min(1),
	description: z.string().optional(),
})

export async function action({ request }: DataFunctionArgs) {
	const formData = await request.formData()
	const submission = parse(formData, {
		schema: CreateIssueSchema,
	})

	if (!submission.value) {
		return json({ status: 'error', submission } as const, { status: 400 })
	}

	await wait(3000)

	let newIssueId = 0
	await prisma.$transaction(async tx => {
		invariant(submission.value, 'submission.value should be defined')

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
				title: submission.value.title,
				description: submission.value.description,
				status: 'todo',
				priority: 'medium',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		})
	})

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

export async function loader({ request }: DataFunctionArgs) {
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

	const memoizedIssues = useMemo(() => {
		return issues.concat(
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
	}, [issues, pendingIssueFetchers])

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
