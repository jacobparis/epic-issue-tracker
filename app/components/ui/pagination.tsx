import { Link } from '@remix-run/react'
import { type RemixLinkProps } from '@remix-run/react/dist/components'
import * as React from 'react'

import { type ButtonProps, buttonVariants } from '#app/components/ui/button'
import { cn } from '#app/utils/misc.tsx'
import { Icon } from './icon'

const Pagination = ({ className, ...props }: React.ComponentProps<'nav'>) => (
	<nav
		role="navigation"
		aria-label="pagination"
		className={cn('mx-auto flex w-full', className)}
		{...props}
	/>
)
Pagination.displayName = 'Pagination'

const PaginationContent = React.forwardRef<
	HTMLUListElement,
	React.ComponentProps<'ul'>
>(({ className, ...props }, ref) => (
	<ul
		ref={ref}
		className={cn('flex flex-row items-center gap-1', className)}
		{...props}
	/>
))
PaginationContent.displayName = 'PaginationContent'

const PaginationItem = React.forwardRef<
	HTMLLIElement,
	React.ComponentProps<'li'>
>(({ className, ...props }, ref) => (
	<li ref={ref} className={cn('', className)} {...props} />
))
PaginationItem.displayName = 'PaginationItem'

type PaginationLinkProps = {
	isActive?: boolean
	disabled?: boolean
} & Pick<ButtonProps, 'size'> &
	RemixLinkProps

const PaginationLink = ({
	className,
	isActive,
	size = 'icon',
	disabled = false,
	...props
}: PaginationLinkProps) => {
	if (disabled) {
		return (
			<button
				disabled
				aria-disabled
				className={cn(
					buttonVariants({
						variant: 'ghost',
						size,
					}),
					className,
				)}
			>
				{props.children}
			</button>
		)
	}

	return (
		<Link
			prefetch="intent"
			aria-current={isActive ? 'page' : undefined}
			className={cn(
				buttonVariants({
					variant: isActive ? 'outline' : 'ghost',
					size,
				}),
				className,
			)}
			{...props}
		/>
	)
}

PaginationLink.displayName = 'PaginationLink'

const PaginationFirst = ({
	className,
	...props
}: React.ComponentProps<typeof PaginationLink>) => (
	<PaginationLink
		aria-label="Go to first page"
		size="default"
		className={cn('gap-1 px-2.5', className)}
		prefetch="render"
		{...props}
	>
		<Icon name="double-arrow-left" className="h-4 w-4" />
	</PaginationLink>
)
PaginationFirst.displayName = 'PaginationFirst'

const PaginationPrevious = ({
	className,
	...props
}: React.ComponentProps<typeof PaginationLink>) => (
	<PaginationLink
		aria-label="Go to previous page"
		size="default"
		className={cn('gap-1 pl-2.5', className)}
		prefetch="render"
		{...props}
	>
		<Icon name="arrow-left" className="h-4 w-4" />
	</PaginationLink>
)
PaginationPrevious.displayName = 'PaginationPrevious'

const PaginationNext = ({
	className,
	...props
}: React.ComponentProps<typeof PaginationLink>) => (
	<PaginationLink
		aria-label="Go to next page"
		size="default"
		className={cn('gap-1 pr-2.5', className)}
		prefetch="render"
		{...props}
	>
		<Icon name="arrow-right" className="h-4 w-4" />
	</PaginationLink>
)
PaginationNext.displayName = 'PaginationNext'

const PaginationLast = ({
	className,
	...props
}: React.ComponentProps<typeof PaginationLink>) => (
	<PaginationLink
		aria-label="Go to last page"
		size="default"
		className={cn('gap-1 px-2.5', className)}
		prefetch="render"
		{...props}
	>
		<Icon name="double-arrow-right" className="h-4 w-4" />
	</PaginationLink>
)
PaginationLast.displayName = 'PaginationLast'

const PaginationEllipsis = ({
	className,
	...props
}: React.ComponentProps<'span'>) => (
	<span
		aria-hidden
		className={cn('flex h-9 w-9 items-center justify-center', className)}
		{...props}
	>
		<Icon name="dots-horizontal" className="h-4 w-4" />
		<span className="sr-only">More pages</span>
	</span>
)
PaginationEllipsis.displayName = 'PaginationEllipsis'

export {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
	PaginationFirst,
	PaginationLast,
}
