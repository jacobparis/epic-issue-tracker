import { type Issue } from '@prisma/client'
import { type SerializeFrom } from '@remix-run/node'

type IssueRow = Pick<
	SerializeFrom<Issue>,
	'id' | 'number' | 'title' | 'status' | 'priority'
>
export function IssuesTable({ issues }: { issues: Array<IssueRow> }) {
	return (
		<div>
			{issues.map(issue => (
				<div key={issue.id} className="flex border-b">
					<div className="px-4 py-2 align-middle">{issue.number}</div>
					<div className="w-full px-4 py-2 align-middle">{issue.title}</div>
					<div className="px-4 py-2 align-middle">{issue.status}</div>
					<div className="px-4 py-2 align-middle">{issue.priority}</div>
				</div>
			))}
		</div>
	)
}
