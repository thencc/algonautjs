// as any
// declare module '@walletconnect/client/dist/umd/index.min.js';

// as specific type
declare module '@walletconnect/client/dist/umd/index.min.js' {
	// just the type
	// import type wcType from '@walletconnect/client';
	// const c: typeof wcType;
	// export default c;

	// the whole class/export
	import wcType from '@walletconnect/client';
	export default wcType;
}
