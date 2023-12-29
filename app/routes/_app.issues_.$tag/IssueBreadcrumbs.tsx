import { Link } from '@remix-run/react'
import { Button } from '#app/components/ui/button.tsx'

export function IssueBreadcrumbs({ current }: { current: string }) {
	return (
		<div className="flex items-center justify-between border-b py-2">
			<div className="flex items-center gap-x-2 text-sm text-muted-foreground">
				<Button variant="ghost" asChild size="sm" className="-mx-3">
					<Link to="/issues" prefetch="intent">
						All issues
					</Link>
				</Button>
				<span className="">/</span>
				<span className="font-medium">{current}</span>
			</div>

			<div className="flex items-center gap-x-2 text-sm text-muted-foreground">
				<Button variant="outline" asChild size="sm">
					<Link to="prev" prefetch="intent">
						Previous
					</Link>
				</Button>

				<Button variant="outline" asChild size="sm">
					<Link to="next" prefetch="intent">
						Next
					</Link>
				</Button>
			</div>
		</div>
	)
}
