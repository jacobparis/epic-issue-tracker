import {
	getFormProps,
	getInputProps,
	getSelectProps,
	useForm,
} from '@conform-to/react'
import { getZodConstraint } from '@conform-to/zod'
import { Form, useSearchParams } from '@remix-run/react'
import { ExistingSearchParams } from 'remix-utils/existing-search-params'
import { z } from 'zod'
import { Field, SelectField } from '#app/components/forms.js'
import { Button } from '#app/components/ui/button.js'
import { SelectGroup, SelectItem } from '#app/components/ui/select.js'
import { useAppData } from '../_app'

export const IssueFilterSchema = z.object({
	title: z.string().optional(),
	status: z.string().optional(),
	priority: z.string().optional(),
})

export function IssueFilterBar() {
	const { tableSchema } = useAppData()
	const [searchParams] = useSearchParams()

	const [form, fields] = useForm({
		id: `issues-filter-${searchParams.toString()}`,
		constraint: getZodConstraint(IssueFilterSchema),
		defaultValue: {
			title: searchParams.get('title') ?? '',
			status: searchParams.get('status') ?? 'any',
			priority: searchParams.get('priority') ?? 'any',
		},
	})

	return (
		<div className="flex gap-x-2 px-0 py-2">
			<Form {...getFormProps(form)}>
				<ExistingSearchParams
					exclude={['title', 'priority', 'status', 'skip', '__state__']}
				/>

				<div className="flex items-end gap-x-2">
					<Field
						className="-mb-8"
						labelProps={{ children: 'Search by title' }}
						inputProps={getInputProps(fields.title, { type: 'text' })}
					/>

					<SelectField
						className="-mb-8 w-[200px]"
						labelProps={{
							children: 'Status',
						}}
						inputProps={{
							...getSelectProps(fields.status),
							defaultValue: form.initialValue?.status,
						}}
					>
						<SelectGroup>
							<SelectItem value="any">Any</SelectItem>
							{tableSchema.statuses.map(value => (
								<SelectItem key={value} value={value}>
									{value}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectField>

					<SelectField
						className="-mb-8 w-[200px]"
						labelProps={{
							children: 'Priority',
						}}
						inputProps={{
							...getInputProps(fields.priority, { type: 'text' }),
							defaultValue: form.initialValue?.priority,
						}}
					>
						<SelectGroup>
							<SelectItem value="any">Any</SelectItem>

							{tableSchema.priorities.map(value => (
								<SelectItem key={value} value={value}>
									{value}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectField>

					<Button type="submit">Filter</Button>
				</div>
			</Form>

			<Form className="flex items-end gap-x-2">
				<ExistingSearchParams
					exclude={['title', 'priority', 'status', 'skip']}
				/>

				<Button type="submit" variant="ghost">
					Clear
				</Button>
			</Form>
		</div>
	)
}
