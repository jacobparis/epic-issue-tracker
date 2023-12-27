import { type MetaFunction } from '@remix-run/node'

export const meta: MetaFunction = () => [
	{
		title: 'Issues',
	},
]
export default function Issues() {
	return (
		<div className="grid h-full place-items-center py-20">
			<h1 className="text-5xl font-bold">Issues</h1>
		</div>
	)
}
