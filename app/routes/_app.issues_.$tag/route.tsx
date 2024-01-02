// http://localhost:3000/issues/EIT-1

import { conform, useForm } from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import {
	type MetaFunction,
	type DataFunctionArgs,
	json,
	redirect,
} from '@remix-run/node'
import { Form, useActionData, useLoaderData } from '@remix-run/react'
import { z } from 'zod'
import { ErrorList, SelectField } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Input } from '#app/components/ui/input'
import { SelectGroup, SelectItem } from '#app/components/ui/select'
import { Textarea } from '#app/components/ui/textarea'
import { prisma } from '#app/utils/db.server.ts'
import { IssueBreadcrumbs } from './IssueBreadcrumbs'
import { parseProjectAndNumber } from './parseProjectAndNumber'

export const meta: MetaFunction = ({ params }) => [
	{
		title: `${params.tag} Issue`,
	},
]

const EditIssueSchema = z.object({
	intent: z.literal('edit-issue'),
	status: z.string().optional(),
	priority: z.string().optional(),
	title: z.string({ required_error: 'An issue must have a title' }),
	description: z.string().optional(),
})

const DeleteIssueSchema = z.object({
	intent: z.literal('delete-issue'),
})

export async function action({ request, params }: DataFunctionArgs) {
	const formData = await request.formData()
	const submission = parse(formData, {
		schema: z.discriminatedUnion('intent', [
			EditIssueSchema,
			DeleteIssueSchema,
		]),
	})

	if (!submission.value) {
		return json({ status: 'error', submission } as const, { status: 400 })
	}

	if (submission.value.intent === 'edit-issue') {
		const { project, number } = parseProjectAndNumber(params.tag)

		await prisma.issue.update({
			where: {
				project_number: {
					project,
					number,
				},
			},
			data: {
				title: submission.value.title,
				description: submission.value.description,
				status: submission.value.status,
				priority: submission.value.priority,
			},
		})

		return json({
			status: 'success',
			submission,
		})
	}

	if (submission.value.intent === 'delete-issue') {
		const { project, number } = parseProjectAndNumber(params.tag)

		await prisma.issue.delete({
			where: {
				project_number: {
					project,
					number,
				},
			},
		})

		return redirect('/issues')
	}

	throw new Response('Invalid intent', { status: 400 })
}

export async function loader({ params }: DataFunctionArgs) {
	const { project, number } = parseProjectAndNumber(params.tag)

	const issue = await prisma.issue.findFirst({
		where: {
			project,
			number,
		},
		select: {
			id: true,
			project: true,
			number: true,
			title: true,
			description: true,
			status: true,
			priority: true,
			createdAt: true,
		},
	})

	if (!issue) {
		throw new Response('Not found', { status: 404 })
	}

	return json({
		issue,
	})
}

export default function Issues() {
	const { issue } = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()

	const [form, fields] = useForm({
		id: 'edit-issue-form',
		// Adds required, min, etc props to the fields based on the schema
		constraint: getFieldsetConstraint(EditIssueSchema),
		// Tells conform about any errors we've had
		lastSubmission: actionData?.submission,
		onValidate({ formData }) {
			return parse(formData, { schema: EditIssueSchema })
		},
		defaultValue: {
			title: issue.title,
			description: issue.description ?? '',
			status: issue.status ?? undefined,
			priority: issue.priority ?? undefined,
		},
	})

	return (
		<div>
			<div className="border-b bg-background py-2">
				<div className="mx-auto max-w-6xl">
					<IssueBreadcrumbs
						current={`${issue.project}-${String(issue.number).padStart(
							3,
							'0',
						)}`}
					/>
				</div>
			</div>
			<div className="mx-auto flex max-w-6xl flex-wrap">
				<div className="max-w-4xl grow basis-[40rem] p-4">
					<div className="mt-8">
						<Form
							method="POST"
							key={`${issue.project}-${issue.number}`}
							{...form.props}
						>
							<input type="hidden" name="intent" value="edit-issue" />

							<div className="-mb-8 flex w-full gap-x-4">
								<SelectField
									className="max-w-[20ch] grow"
									labelProps={{ children: 'Status' }}
									inputProps={conform.input(fields.status)}
								>
									<SelectGroup>
										{['todo', 'in-progress', 'done'].map(value => (
											<SelectItem key={value} value={value}>
												{value}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectField>

								<SelectField
									className="max-w-[20ch] grow"
									labelProps={{ children: 'Priority' }}
									inputProps={conform.input(fields.priority)}
								>
									<SelectGroup>
										{['low', 'medium', 'high'].map(value => (
											<SelectItem key={value} value={value}>
												{value}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectField>
							</div>

							<div className="mt-2 rounded-xl border bg-background px-2 py-2 shadow-sm">
								<Input
									aria-label="Title"
									type="text"
									className="border-none bg-transparent text-lg font-medium placeholder:text-gray-400"
									placeholder="Issue title"
									{...conform.input(fields.title)}
								/>
								<div className="px-3">
									<ErrorList
										errors={fields.title.errors}
										id={fields.title.errorId}
									/>
								</div>

								<Textarea
									aria-label="Description"
									placeholder="Add a description…"
									className="mt-2 border-none bg-transparent placeholder:text-gray-400"
									{...conform.input(fields.description)}
								/>
								<div className="px-3">
									<ErrorList
										errors={fields.description.errors}
										id={fields.description.errorId}
									/>
								</div>
							</div>

							<div className="mt-2 flex justify-end">
								<Button type="submit"> Save </Button>
							</div>
						</Form>
					</div>
				</div>
				<div className="flex-shrink-0 grow-0 basis-20 p-4">
					<Form method="POST" className="flex justify-end">
						<input type="hidden" name="intent" value="delete-issue" />
						<Button
							type="submit"
							className="mt-2 whitespace-nowrap"
							variant="outline"
						>
							Delete issue
						</Button>
					</Form>
				</div>
			</div>
		</div>
	)
}
