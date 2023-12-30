// http://localhost:3000/issues/EIT-1

import { type MetaFunction, type DataFunctionArgs, json } from '@remix-run/node'
import { Form, useLoaderData } from '@remix-run/react'
import { Field, SelectField } from '#app/components/forms.tsx'
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

export async function loader({ params }: DataFunctionArgs) {
	const { project, number } = parseProjectAndNumber(params.tag)

	const issue = await prisma.issue.findFirst({
		where: {
			project,
			number: Number(number),
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

	return (
		<div>
			<div className="border-b bg-background py-2">
				<div className="mx-auto max-w-4xl">
					<IssueBreadcrumbs
						current={`${issue.project}-${String(issue.number).padStart(
							3,
							'0',
						)}`}
					/>
				</div>
			</div>
			<div className="mx-auto max-w-4xl p-4">
				<div className="mt-8">
					<Form method="POST" key={`${issue.project}-${issue.number}`}>
						<div className="-mb-8 flex w-full gap-x-4">
							<SelectField
								className="max-w-[20ch] grow"
								labelProps={{ children: 'Status' }}
								inputProps={{
									name: 'status',
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
									name: 'priority',
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
								type="text"
								className="border-none bg-transparent text-lg font-medium placeholder:text-gray-400"
								placeholder="Issue title"
								name="title"
								required
								defaultValue={issue.title}
							/>

							<Textarea
								name="description"
								aria-label="Description"
								placeholder="Add a description…"
								className="mt-2 border-none bg-transparent placeholder:text-gray-400"
								defaultValue={issue.description ?? ''}
							/>
						</div>

						<div className="mt-2 flex justify-end">
							<Button type="submit"> Save </Button>
						</div>
					</Form>
				</div>
			</div>
		</div>
	)
}
