import { type SelectProps } from '@radix-ui/react-select'
import { Form } from '@remix-run/react'
import { ExistingSearchParams } from 'remix-utils/existing-search-params'
import { Button } from '#app/components/ui/button.js'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select'
export function PaginationLimitSelect(
	inputProps: React.SelectHTMLAttributes<HTMLSelectElement> & SelectProps,
) {
	return (
		<Form
			preventScrollReset
			method="GET"
			className="flex grow gap-x-2"
			onChange={event => {
				if (event.target instanceof HTMLSelectElement) {
					event.target.form?.requestSubmit()
				}
			}}
		>
			<ExistingSearchParams exclude={['take']} />

			<Select {...inputProps} name="take">
				<SelectTrigger
					aria-label="Priority"
					className="-mb-4 ml-auto w-[200px]"
				>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						<SelectItem value="10">Show 10 issues</SelectItem>
						<SelectItem value="50">Show 50 issues</SelectItem>
						<SelectItem value="100">Show 100 issues</SelectItem>
						<SelectItem value="0">Show all issues</SelectItem>
					</SelectGroup>
				</SelectContent>
			</Select>

			<Button type="submit" className="sr-only">
				Update
			</Button>
		</Form>
	)
}
