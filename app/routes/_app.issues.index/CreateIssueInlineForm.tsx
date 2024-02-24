import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Form, useActionData, useSubmit } from '@remix-run/react'
import { z } from 'zod'
import { Field } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { type action } from './route'

export const CreateIssueInlineSchema = z.object({
	intent: z.literal('create-issue-inline'),
	title: z.string({ required_error: 'An issue must have a title' }).min(1),
})

export function CreateIssueInlineForm() {
	const actionData = useActionData<typeof action>()
	const submit = useSubmit()

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
	)
}
