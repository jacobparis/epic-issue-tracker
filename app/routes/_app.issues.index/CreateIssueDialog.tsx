import {
	getFormProps,
	getInputProps,
	getSelectProps,
	useForm,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Form, useNavigate, useSubmit } from '@remix-run/react'
import { useState } from 'react'
import { z } from 'zod'
import { ErrorList, SelectField } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import {
	Dialog,
	DialogTrigger,
	DialogContent,
	DialogTitle,
} from '#app/components/ui/dialog'
import { Input } from '#app/components/ui/input'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select'
import { Textarea } from '#app/components/ui/textarea'
import { useAppData } from '../_app'

export const CreateIssueSchema = z.object({
	intent: z.literal('create-issue'),
	title: z.string({ required_error: 'An issue must have a title' }).min(1),
	description: z.string().optional(),
	status: z.string().optional(),
	priority: z.string().optional(),
	redirectPolicy: z.enum(['none', 'index', 'issue']).optional(),
})

export function CreateIssueDialog() {
	const submit = useSubmit()
	const [open, setOpen] = useState(false)
	const { tableSchema } = useAppData()
	const navigate = useNavigate()

	const [form, fields] = useForm({
		id: 'create-issue',

		// Adds required, min, etc props to the fields based on the schema
		constraint: getZodConstraint(CreateIssueSchema),
		// Tells conform about any errors we've had
		lastResult: undefined,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: CreateIssueSchema })
		},
		defaultValue: {
			title: '',
			description: '',
			status: undefined,
			priority: undefined,
		},
		onSubmit(event) {
			event.preventDefault()
			const form = event.currentTarget as HTMLFormElement

			submit(form, {
				navigate: false,
				unstable_flushSync: true,
			})

			const redirectPolicy = form['redirectPolicy'].value
			if (redirectPolicy === 'none') {
				// reset title input
				const titleInput = form['title'] as unknown as HTMLInputElement
				titleInput.value = ''
			}

			if (redirectPolicy === 'index') {
				setOpen(false)
				navigate(`/issues`, {
					preventScrollReset: true,
				})
				return
			}
		},
	})

	return (
		<Dialog open={open} onOpenChange={setOpen} modal>
			<DialogTrigger asChild>
				<Button type="button" variant={'outline'}>
					{' '}
					New issue{' '}
				</Button>
			</DialogTrigger>

			<DialogContent>
				<DialogTitle> Create an issue </DialogTitle>

				<div>
					<div className="inline-flex w-full flex-col  gap-8 text-left">
						<div>
							<Form method="POST" action="/issues" {...getFormProps(form)}>
								<input type="hidden" name="intent" value={form.id} />

								<div className="-mb-8 flex w-full gap-x-4">
									<SelectField
										className="max-w-[20ch] grow"
										labelProps={{ children: 'Status' }}
										inputProps={{
											...getSelectProps(fields.status),
											defaultValue: tableSchema.statuses[0],
										}}
									>
										<SelectGroup>
											{tableSchema.statuses.map(value => (
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
											defaultValue: tableSchema.priorities[1],
										}}
									>
										<SelectGroup>
											{tableSchema.priorities.map(value => (
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

								<div className="mt-6 flex justify-between">
									<Select
										{...getSelectProps(fields.redirectPolicy)}
										defaultValue="none"
									>
										<SelectTrigger aria-label="Redirect">
											<SelectValue />
										</SelectTrigger>

										<SelectContent>
											<SelectGroup>
												<SelectItem value="none">Keep form open</SelectItem>
												<SelectItem value="index">Redirect to index</SelectItem>
												<SelectItem value="item">Redirect to issue</SelectItem>
											</SelectGroup>
										</SelectContent>
									</Select>

									<Button type="submit"> Save </Button>
								</div>
							</Form>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
