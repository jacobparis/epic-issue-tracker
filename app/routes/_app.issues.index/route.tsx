// http://localhost:3000/issues

import { parseWithZod } from '@conform-to/zod'
import { invariant } from '@epic-web/invariant'
import {
	type MetaFunction,
	type ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
	redirect,
} from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { z } from 'zod'
import { getTableSchema } from '#app/schema.server.js'
import { prisma } from '#app/utils/db.server.ts'
import { wait, parseRequest } from '#app/utils/misc'
import { createToastHeaders } from '#app/utils/toast.server'
import { CreateIssueSchema } from './CreateIssueDialog'
import {
	CreateIssueInlineSchema,
	CreateIssueInlineForm,
} from './CreateIssueInlineForm'
import {
	CreateSampleIssueSchema,
	getRandomDate,
	getRandomStoryName,
	getRandomValue,
} from './CreateSampleIssuesDialog'
import { IssuesTable } from './IssuesTable'
import { PaginationBar, IssuePaginationSchema } from './PaginationBar'
import { BulkDeleteIssuesSchema } from './useBulkDeleteIssues'
import { BulkEditIssuesSchema } from './useBulkEditIssues'

export const meta: MetaFunction = () => [
	{
		title: 'Issues',
	},
]

export async function action({ request }: ActionFunctionArgs) {
	const submission = await parseRequest(request, {
		schema: z.discriminatedUnion('intent', [
			CreateIssueSchema,
			CreateIssueInlineSchema,
			CreateSampleIssueSchema,
			BulkDeleteIssuesSchema,
			BulkEditIssuesSchema,
		]),
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{
				status: submission.status === 'error' ? 400 : 200,
			},
		)
	}

	await wait(3000)

	if (submission.value.intent === 'delete-issues') {
		await deleteIssues(submission.value)

		return json(
			{ result: submission.reply() },
			{
				headers: await createToastHeaders({
					description: `Deleted ${submission.value.issueIds.length} issues`,
					type: 'success',
				}),
			},
		)
	}

	if (submission.value.intent === 'edit-issues') {
		await editIssues(submission.value)

		return json({ result: submission.reply() })
	}

	if (
		submission.value.intent === 'create-issue-inline' ||
		submission.value.intent === 'create-issue'
	) {
		let newIssueId = await createIssue(submission.value)

		return json(
			{
				result: submission.reply({ resetForm: true }),
			},
			{
				headers: await createToastHeaders({
					description: `Created issue EIT-${String(newIssueId).padStart(
						3,
						'0',
					)} `,
					type: 'success',
				}),
			},
		)
	}

	if (submission.value.intent === 'create-sample-issues') {
		const count = 500
		await createSampleIssues({ count })

		return redirect('/issues', {
			headers: await createToastHeaders({
				description: `Created ${count} sample issues`,
				type: 'success',
			}),
		})
	}
}

async function deleteIssues({ issueIds }: { issueIds: Array<string> }) {
	// TODO: gracefully delete relations to issues
	await prisma.issue.deleteMany({
		where: {
			id: {
				in: issueIds,
			},
		},
	})
}

async function editIssues({
	issueIds,
	changeset,
}: {
	issueIds: Array<string>
	changeset: { status?: string; priority?: string }
}) {
	await prisma.issue.updateMany({
		where: {
			id: {
				in: issueIds,
			},
		},
		data: changeset,
	})
}

async function createIssue(
	issue: Omit<z.infer<typeof CreateIssueSchema>, 'intent'>,
) {
	let newIssueId = 0
	await prisma.$transaction(async tx => {
		const highestId = await tx.issue.findFirst({
			where: {
				project: 'EIT',
			},
			orderBy: {
				number: 'desc',
			},
			select: {
				number: true,
			},
		})

		newIssueId = highestId ? highestId.number + 1 : 1

		await tx.issue.create({
			data: {
				project: 'EIT',
				number: newIssueId,
				title: issue.title,
				description: issue.description,
				status: issue.status ?? 'todo',
				priority: issue.priority ?? 'medium',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		})
	})
	return newIssueId
}

export async function createSampleIssues({ count }: { count: number }) {
	const schema = await getTableSchema()

	const issues = Array.from({ length: count }, (_, i) => {
		const createdAt = getRandomDate()
		const updatedAt = getRandomDate(new Date(createdAt))

		return {
			project: 'EIT',
			number: null,
			title: getRandomStoryName(),
			description: 'This is a sample issue for development purposes',
			status: getRandomValue(schema.statuses),
			priority: getRandomValue(schema.priorities),
			createdAt,
			updatedAt,
		}
	}).toSorted(
		(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
	)

	await prisma.$transaction(async tx => {
		const highestId = await tx.issue.findFirst({
			where: {
				project: 'EIT',
			},
			orderBy: {
				number: 'desc',
			},
			select: {
				number: true,
			},
		})

		const baseNumber = highestId ? highestId.number + 1 : 1

		return Promise.all(
			issues.map((issue, i) => {
				return tx.issue.create({
					data: {
						...issue,
						number: baseNumber + i,
					},
				})
			}),
		)
	})
}

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)

	const submission = parseWithZod(url.searchParams, {
		schema: IssuePaginationSchema.partial(),
	})

	invariant(submission.status === 'success', 'Invalid query params')

	const { skip = 0, take = 10 } = submission.value

	const whenIssueIds = prisma.issue
		.findMany({
			orderBy: {
				createdAt: 'asc',
			},
			select: {
				id: true,
			},
		})
		.then(issues => issues.map(issue => issue.id))

	const whenIssues = prisma.issue.findMany({
		orderBy: {
			createdAt: 'asc',
		},
		select: {
			id: true,
			project: true,
			number: true,
			title: true,
			status: true,
			priority: true,
			createdAt: true,
		},
		skip,
		take: take * 2,
	})

	return json({
		pageSize: take,
		issues: await whenIssues,
		issueIds: await whenIssueIds,
	})
}

export default function Issues() {
	const { issues, issueIds, pageSize } = useLoaderData<typeof loader>()

	return (
		<div className="mx-auto max-w-4xl p-4">
			<IssuesTable issues={issues} issueIds={issueIds} pageSize={pageSize} />
			<PaginationBar total={issueIds.length} className="mt-2" />
			<div className="mt-8">
				<CreateIssueInlineForm />
			</div>
		</div>
	)
}
