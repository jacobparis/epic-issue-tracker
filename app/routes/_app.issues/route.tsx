// http://localhost:3000/issues

import { parse } from '@conform-to/zod'
import { invariant } from '@epic-web/invariant'
import { type MetaFunction, type DataFunctionArgs, json } from '@remix-run/node'
import { Form, useLoaderData } from '@remix-run/react'
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

const CreateFormSchema = z.object({
	title: z.string().min(1),
	description: z.string().optional(),
})

export async function action({ request }: DataFunctionArgs) {
	const formData = await request.formData()
	const submission = parse(formData, {
		schema: CreateFormSchema,
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
		submission,
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

	return (
		<div className="mx-auto max-w-4xl p-4">
			<IssuesTable issues={issues} />

			<div className="mt-8">
				<Form method="POST">
					<Field
						labelProps={{ children: 'Title' }}
						inputProps={{
							type: 'text',
							name: 'title',
							required: true,
						}}
					/>

					<Field
						labelProps={{ children: 'Description' }}
						inputProps={{
							type: 'text',
							name: 'description',
						}}
					/>

					<Button type="submit">Submit</Button>
				</Form>
			</div>
		</div>
	)
}
