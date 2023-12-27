import { type MetaFunction, type DataFunctionArgs, json } from '@remix-run/node'
import { Form } from '@remix-run/react'
import { Field } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'

export const meta: MetaFunction = () => [
	{
		title: 'Issues',
	},
]

export async function action({ request }: DataFunctionArgs) {
	return json({})
}

export default function Issues() {
	return (
		<div className="mx-auto max-w-4xl p-4">
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
