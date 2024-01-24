// http://localhost:3000/issues/EIT-1

import {
	getFormProps,
	getInputProps,
	getSelectProps,
	useForm,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import {
	type MetaFunction,
	type ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import {
	Form,
	Link,
	useActionData,
	useLoaderData,
	useLocation,
	useNavigate,
	useParams,
} from '@remix-run/react'
import { z } from 'zod'
import { ErrorList, SelectField } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon'
import { Input } from '#app/components/ui/input'
import { SelectGroup, SelectItem } from '#app/components/ui/select'
import { Textarea } from '#app/components/ui/textarea'
import { prisma } from '#app/utils/db.server.ts'
import { wait } from '#app/utils/misc'
import { createToastHeaders, redirectWithToast } from '#app/utils/toast.server'
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

export async function action({ request, params }: ActionFunctionArgs) {
	const formData = await request.formData()
	const submission = parseWithZod(formData, {
		schema: z.discriminatedUnion('intent', [
			EditIssueSchema,
			DeleteIssueSchema,
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

		return json({ result: submission.reply() })
	}

	if (submission.value.intent === 'delete-issue') {
		await wait(3000)

		const { project, number } = parseProjectAndNumber(params.tag)

		try {
			await prisma.issue.delete({
				where: {
					project_number: {
						project,
						number,
					},
				},
			})
		} catch (error) {
			console.error(error)
			return json(
				{ result: submission.reply() },
				{
					headers: await createToastHeaders({
						type: 'error',
						description: 'Issue could not be deleted',
					}),
				},
			)
		}

		return redirectWithToast('/issues', {
			type: 'success',
			description: 'Issue deleted',
		})
	}

	throw new Response('Invalid intent', { status: 400 })
}

export async function loader({ params }: LoaderFunctionArgs) {
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
		constraint: getZodConstraint(EditIssueSchema),
		// Tells conform about any errors we've had
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: EditIssueSchema })
		},
		defaultValue: {
			title: issue.title,
			description: issue.description ?? '',
			status: issue.status ?? undefined,
			priority: issue.priority ?? undefined,
		},
	})

	const navigate = useNavigate()

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
							{...getFormProps(form)}
						>
							<input type="hidden" name="intent" value="edit-issue" />

							<div className="-mb-8 flex w-full gap-x-4">
								<SelectField
									className="max-w-[20ch] grow"
									labelProps={{ children: 'Status' }}
									inputProps={{
										...getSelectProps(fields.status),
										defaultValue: issue.status ?? undefined,
									}}
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
									inputProps={{
										...getSelectProps(fields.priority),
										defaultValue: issue.priority ?? undefined,
									}}
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
									className="border-none bg-transparent text-lg font-medium placeholder:text-gray-400"
									placeholder="Issue title"
									{...getInputProps(fields.title, { type: 'text' })}
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
									{...getInputProps(fields.description, {
										type: 'text',
									})}
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
					<Form
						method="POST"
						className="flex justify-end"
						navigate={false}
						fetcherKey={`delete-issue@${issue.project}-${issue.number}`}
						onSubmit={() => {
							navigate(`/issues`, {
								replace: true,
							})
						}}
					>
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

export function ErrorBoundary() {
	const location = useLocation()
	const { tag } = useParams()
	return (
		<div className="flex flex-col gap-6">
			{tag ? (
				<div className="border-b bg-background py-2">
					<div className="mx-auto max-w-6xl">
						<IssueBreadcrumbs current={tag.padStart(3, '0')} />
					</div>
				</div>
			) : null}
			<div className="container flex items-center justify-center p-20 text-h2">
				<div className="flex flex-col gap-6">
					<div className="flex flex-col gap-3">
						<h1>We can't find this page:</h1>
						<pre className="whitespace-pre-wrap break-all text-body-lg">
							{location.pathname}
						</pre>
					</div>
					<Link to="/" className="text-body-md underline">
						<Icon name="arrow-left">Back to home</Icon>
					</Link>
				</div>
			</div>
		</div>
	)
}
