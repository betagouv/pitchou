import { error } from '@sveltejs/kit'

export async function load({ params }) {
	try {
		console.log('+page.js', params.slug)
		const post = await import(`../${params.slug}.md`)

		return {
			content: post.default,
			meta: post.metadata
		}
	} catch (e) {
		error(404, `Could not find ${params.slug}`)
	}
}
