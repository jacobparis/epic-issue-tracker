export async function getTableSchema() {
	return {
		priorities: ['low', 'medium', 'high', 'urgent'],
		statuses: ['todo', 'in-progress', 'testing', 'done'],
	} as const
}
