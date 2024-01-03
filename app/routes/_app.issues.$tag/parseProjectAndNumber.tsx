import { redirect } from '@remix-run/node'

export function parseProjectAndNumber(tag?: string) {
	const [project, number] = tag?.split('-') ?? []
	const validNumber = Number(number)
	if (!validNumber || Number.isNaN(validNumber)) {
		throw new Response('Invalid issue', { status: 400 })
	}

	if (number.startsWith('0')) {
		throw redirect(`/issues/${project}-${validNumber}`)
	}

	if (project !== 'EIT' || !number) {
		throw new Response('Not found', { status: 404 })
	}

	return { project, number: validNumber }
}
