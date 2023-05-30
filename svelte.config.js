import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/kit/vite';
import preprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors	
	// preprocess: preprocess(),
	kit: {
		adapter: adapter(),
		alias: {
			$root: 'src'
		}
	},
	preprocess: vitePreprocess(),	
	compilerOptions: {
		enableSourcemap: true,
	}
};

export default config;

// import adapter from '@sveltejs/adapter-auto';
// import preprocess from 'svelte-preprocess';

// /** @type {import('@sveltejs/kit').Config} */
// const config = {
// 	// Consult https://github.com/sveltejs/svelte-preprocess
// 	// for more information about preprocessors
// 	preprocess: preprocess(),

// 	kit: {
// 		adapter: adapter(),
// 		alias: {
// 			$root: 'src'
// 		}
// 	}
// };

// export default config;
