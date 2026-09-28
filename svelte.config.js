// Vercel directo, no `adapter-auto`: auto bajaba una version vieja del
// adaptador que solo conoce Node 16 y 18, y el build de Vercel ya corre en
// Node 22. Resultado: "Unsupported Node.js version: v22".
import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/kit/vite';
import preprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors	
	// preprocess: preprocess(),
	kit: {
		// El runtime va explicito: sin esto el adaptador lo adivina del Node
		// que corre el build, y si Vercel lo cambia el deploy se cae solo.
		adapter: adapter({ runtime: 'nodejs22.x' }),
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
