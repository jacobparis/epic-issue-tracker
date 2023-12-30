// http://localhost:3000/issues

import { conform, useForm } from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import { invariant } from '@epic-web/invariant'
import { type MetaFunction, type DataFunctionArgs, json } from '@remix-run/node'
import { Form, useActionData, useLoaderData } from '@remix-run/react'
import { z } from 'zod'
import { Field } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { prisma } from '#app/utils/db.server.ts'
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

		await tx.issue.create({
			data: {
				project: 'EIT',
				number: highestId ? highestId.number + 1 : 1,
				title: submission.value.title,
				description: submission.value.description,
				status: 'todo',
				priority: 'medium',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		})
	})

	return json({
		success: true,
		submission: {
			...submission,
			payload: null,
		},
	})
}

export async function loader({ request }: DataFunctionArgs) {
	const issues = await prisma.issue.findMany({
		orderBy: {
			createdAt: 'desc',
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

	const [form, fields] = useForm({
		id: 'create-issue-form',
		// Adds required, min, etc props to the fields based on the schema
		constraint: getFieldsetConstraint(CreateIssueSchema),
		// Tells conform about any errors we've had
		lastSubmission: actionData?.submission,
		onValidate({ formData }) {
			return parse(formData, { schema: CreateIssueSchema })
		},
	})

	return (
		<div className="mx-auto max-w-4xl p-4">
			<IssuesTable issues={issues} />

			<div className="mt-8">
				<Form method="POST" {...form.props}>
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
