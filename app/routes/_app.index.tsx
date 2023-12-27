import { type MetaFunction } from '@remix-run/node'

export const meta: MetaFunction = () => [
	{
		title: 'Epic Issues',
	},
]

export default function App() {
	return (
		<div className="grid h-full place-items-center py-20">
			<h1 className="text-5xl font-bold">Epic Issue Tracker</h1>
		</div>
	)
}
