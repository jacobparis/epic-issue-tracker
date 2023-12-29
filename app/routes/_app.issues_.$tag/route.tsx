// http://localhost:3000/issues/EIT-1

import { type MetaFunction, type DataFunctionArgs, json } from '@remix-run/node'
import { Form, useLoaderData } from '@remix-run/react'
import { Field, SelectField } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { SelectGroup, SelectItem } from '#app/components/ui/select'
import { prisma } from '#app/utils/db.server.ts'
import { IssueBreadcrumbs } from './IssueBreadcrumbs'
import { parseProjectAndNumber } from './parseProjectAndNumber'

export const meta: MetaFunction = () => [
	{
		title: 'Issues',
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
		<div className="mx-auto max-w-4xl p-4">
			<IssueBreadcrumbs
				current={`${issue.project}-${String(issue.number).padStart(3, '0')}`}
			/>
			<div className="mt-8">
				<Form method="POST" key={`${issue.project}-${issue.number}`}>
					<div className="flex w-full gap-x-4">
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
					<Field
						labelProps={{ children: 'Title' }}
						inputProps={{
							type: 'text',
							name: 'title',
							required: true,
							defaultValue: issue.title,
						}}
					/>

					<Field
						labelProps={{ children: 'Description' }}
						inputProps={{
							type: 'text',
							name: 'description',
							defaultValue: issue.description ?? '',
						}}
					/>

					<Button type="submit">Submit</Button>
				</Form>
			</div>
		</div>
	)
}
