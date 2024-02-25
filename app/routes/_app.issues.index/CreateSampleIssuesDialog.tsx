import { getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Form } from '@remix-run/react'
import { useState } from 'react'
import { z } from 'zod'
import { Button } from '#app/components/ui/button.tsx'
import {
	Dialog,
	DialogTrigger,
	DialogContent,
	DialogTitle,
} from '#app/components/ui/dialog'

export const CreateSampleIssueSchema = z.object({
	intent: z.literal('create-sample-issues'),
})

export function CreateSampleIssuesDialog() {
	const [open, setOpen] = useState(false)

	const [form] = useForm({
		id: 'create-sample-issues',
		// Adds required, min, etc props to the fields based on the schema
		constraint: getZodConstraint(CreateSampleIssueSchema),
		// Tells conform about any errors we've had
		lastResult: undefined,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: CreateSampleIssueSchema })
		},
		onSubmit(event) {
			setOpen(false)
		},
	})

	return (
		<Dialog open={open} onOpenChange={setOpen} modal>
			<DialogTrigger asChild>
				<Button type="button" variant="outline">
					Generate sample issues for development
				</Button>
			</DialogTrigger>

			<DialogContent>
				<DialogTitle> Create sample issues </DialogTitle>

				<div>
					<div className="inline-flex w-full flex-col  gap-8 text-left">
						<div>
							<Form method="POST" action="/issues" {...getFormProps(form)}>
								<input type="hidden" name="intent" value={form.id} />

								<p>
									This will create 10 sample issues for development purposes.{' '}
								</p>

								<div className="mt-6 flex justify-between">
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

export function getRandomStoryName() {
	const prefix = 'As'
	const agents = [
		'a user',
		'the idea guy',
		'a developer',
		'an admin',
		'a manager',
		'a customer',
		'a tester',
		'a designer',
		'a product owner',
		'an intern',
		'a barista',
	]
	const actions = [
		'I want to',
		'I need to',
		'I would like to',
		'I should',
		'I must',
		'I would love to',
	]
	const verbs = [
		'create',
		'read',
		'update',
		'delete',
		'edit',
		'view',
		'delete',
		'add',
		'remove',
		'change',
		'modify',
		'assign',
		'unassign',
		'filter',
		'sort',
		'search',
	]
	const nouns = [
		'the issues',
		'the projects',
		'the users',
		'the comments',
		'the tasks',
		'the labels',
		'the milestones',
		'the epics',
		'the groups',
		'the boards',
		'the sprints',
		'the releases',
		'the candidates',
		'the content',
	]
	const reasons = [
		'so that I can save time',
		'so that I can save money',
		"so that it's better for the environment",
		'so that we make more sales',
		'to make sure everything is correct',
		'so that someone will finally love me',
		'so that I know what to do',
		'so that I can be more organized',
		'so that I can see the state of the project',
		'so that I can find what I want',
		'in order to download them',
		'in order to delete them',
		'in order to test them',
	]

	return [
		prefix,
		getRandomValue(agents),
		getRandomValue(actions),
		getRandomValue(verbs),
		getRandomValue(nouns),
		getRandomValue(reasons),
	].join(' ')
}
export function getRandomValue<T>(array: ReadonlyArray<T>) {
	return array[Math.floor(Math.random() * array.length)]
}
export function getRandomDate(start: Date = new Date(2020, 0, 1)) {
	const end = new Date()

	return new Date(
		start.getTime() + Math.random() * (end.getTime() - start.getTime()),
	).toISOString()
}
