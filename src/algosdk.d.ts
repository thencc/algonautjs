declare module 'algosdk/dist/browser/algosdk.min' {
	import algosdkTypeRef from 'algosdk';
	const algosdk: typeof algosdkTypeRef;
	export default algosdk;
}

declare module '@walletconnect/client/dist/umd/index.min';