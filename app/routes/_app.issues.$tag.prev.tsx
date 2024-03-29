import { redirect, type LoaderFunctionArgs } from '@remix-run/node'
import { prisma } from '#app/utils/db.server.ts'
import { parseProjectAndNumber } from './_app.issues.$tag/parseProjectAndNumber.server'

export async function loader({ params }: LoaderFunctionArgs) {
	const { project, number } = parseProjectAndNumber(params.tag)

	const issue = await prisma.issue.findMany({
		where: {
			project,
		},
		select: {
			id: true,
			number: true,
		},
		orderBy: {
			number: 'asc',
		},
	})

	const issueIndex = issue.findIndex(issue => issue.number === Number(number))
	const prevIssue = issue[issueIndex - 1]

	if (!prevIssue) {
		// If there is no issue, redirect to the first issue
		return redirect(`/issues/${project}-${issue[issue.length - 1].number}`)
	}

	return redirect(`/issues/${project}-${prevIssue.number}`)
}
