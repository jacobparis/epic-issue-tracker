import { json, type LoaderFunctionArgs } from '@remix-run/node'
import {
	NavLink,
	Outlet,
	useRouteLoaderData,
	type ShouldRevalidateFunction,
} from '@remix-run/react'
import clsx from 'clsx'
import { getTableSchema } from '../schema.server'
import { CreateIssueDialog } from './_app.issues.index/CreateIssueDialog'

export async function loader({ request }: LoaderFunctionArgs) {
	return json({
		tableSchema: await getTableSchema(),
	})
}

export function useAppData() {
	const data = useRouteLoaderData<typeof loader>('routes/_app')

	if (data === undefined) {
		throw new Error('useAppData must be used within the _app route')
	}

	return data
}

export const shouldRevalidate: ShouldRevalidateFunction = () => false

export default function App() {
	return (
		<div className="flex">
			<div className="flex min-h-screen min-w-[20ch] flex-col gap-y-1  border-r border-neutral-100 bg-white p-2">
				<CreateIssueDialog />
				<NavItem to="/">Home</NavItem>
				<NavItem to="/issues">Issues</NavItem>
			</div>
			<div className="grow">
				<Outlet />
			</div>
		</div>
	)
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
	return (
		<NavLink
			to={to}
			end
			className={({ isActive }) =>
				clsx(
					'block rounded-sm px-4 py-1 text-sm font-medium',
					isActive
						? 'bg-muted text-neutral-900'
						: 'text-neutral-600 hover:bg-muted hover:text-neutral-900',
				)
			}
		>
			{children}
		</NavLink>
	)
}
