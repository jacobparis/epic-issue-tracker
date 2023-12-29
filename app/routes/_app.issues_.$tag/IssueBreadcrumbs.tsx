import { Link, useNavigate } from '@remix-run/react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon'

export function IssueBreadcrumbs({ current }: { current: string }) {
	const navigate = useNavigate()

	useHotkeys('j', () => {
		navigate('prev')
	})

	useHotkeys('k', () => {
		navigate('next')
	})

	return (
		<div className="flex items-center justify-between border-b py-2">
			<div className="flex items-center gap-x-2 text-sm text-muted-foreground">
				<Button variant="ghost" asChild size="sm" className="-mx-3">
					<Link to="/issues" prefetch="intent">
						All issues
					</Link>
				</Button>
				<Icon name="caret-right" className="h-6 w-6" />
				<span className="font-medium">{current}</span>
			</div>

			<div className="flex items-center gap-x-2 text-sm text-muted-foreground">
				<Button variant="outline" asChild size="icon">
					<Link to="prev" prefetch="intent">
						<span className="sr-only"> Previous </span>
						<Icon name="caret-up" className="h-6 w-6" />
					</Link>
				</Button>

				<Button variant="outline" asChild size="icon">
					<Link to="next" prefetch="intent">
						<span className="sr-only"> Next </span>
						<Icon name="caret-down" className="h-6 w-6" />
					</Link>
				</Button>
			</div>
		</div>
	)
}
