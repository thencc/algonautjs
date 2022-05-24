const { default: Algonaut } = require('../dist/index');
const approvalProgram = require('./contract');
const clearProgram = require('./contract-clear');
const accountv1 = require('./accountv1');
const accountv2 = require('./accountv2');
const accountClear = require('./account-clear');
const dotenv = require('dotenv');
dotenv.config();

const algonaut = new Algonaut({
	BASE_SERVER: 'https://testnet-algorand.api.purestake.io/ps2',
	LEDGER: 'TestNet',
	PORT: '',
	API_TOKEN: { 'X-API-Key': process.env.PURESTAKE_API_TOKEN }
});

const testAccountMnemonic = process.env.ALGONAUT_TEST_MNEMONIC;
if (!testAccountMnemonic) {
	console.error('Please set ALGONAUT_TEST_MNEMONIC in your environment');
	process.exit(1);
}

// change these to include/exclude certain test blocks
const testPayment = true;
const testAsset = true;
const testApp = true;

let response;
let appState;
let appId;

// add function to this on error
var errors = [];

(async () => {
	console.log('Running Algonaut tests.');

	console.log('getConfig(): ');
	console.log(JSON.stringify(algonaut.getConfig(), null, 2));

	console.log('checkStatus():');
	await algonaut.checkStatus();

	// ACCOUNT OPERATIONS

	// createWallet
	console.log('Create a wallet:');
	let wallet = algonaut.createWallet();
	let firstWallet = Object.assign({}, wallet); // so we can use this later
	console.log('algonaut.account is now:');
	console.log(JSON.stringify(algonaut.account.addr, null, 2));

	// recoverAccount
	console.log('For the rest of the tests we will use ALGONAUT_TEST_MNEMONIC from env');
	console.log('I hope this account has a lil bit of Algo in it!');
	console.log('Recovering that now...');
	algonaut.recoverAccount(testAccountMnemonic);

	if (!algonaut.account) {
		console.error('That mnemonic did not work.');
		process.exit(1);
	}

	console.log('The account is now: ');
	console.log(algonaut.account.addr);

	// getAccountInfo
	console.log('Getting account info for: ' + algonaut.account.addr);
	let accountInfo = await algonaut.getAccountInfo(algonaut.account.addr);
	console.log(accountInfo);

	// getAlgoBalance
	console.log('getAlgoBalance(algonaut.account.addr): ');
	let balance = await algonaut.getAlgoBalance(algonaut.account.addr);
	console.log(balance);

	// sendAlgo
	if (testPayment) {
		console.log('Sending a little bit of ALGO to the first account we created:');
		try {
			let payment = await algonaut.sendAlgo({
				to: firstWallet.address,
				amount: 1000000
			});
			console.log(payment);
		} catch (e) {
			console.error('Error sending payment');
			errors.push('sendAlgo');
			console.error(e);
		}
	} else {
		console.log('Skipping payment test');
	}

	// ASSET OPERATIONS
	// createAsset
	if (testAsset) {
		try {
			console.log('Let\'s try creating an asset.');
			const assetArgs = {
				assetName: 'Presto Testo',
				symbol: 'TEST',
				metaBlock: 'This is a test of algonaut',
				decimals: 3,
				amount: 5,
			};
			console.log(assetArgs);
			let asset = await algonaut.createAsset(assetArgs);
			console.log('Created asset:');
			console.log(asset); // this should be an ID
			let newAsset = parseInt(asset.createdIndex);

			// getAssetInfo
			console.log('Getting info for our new asset: ' + newAsset);
			console.log(await algonaut.getAssetInfo(newAsset));

			// accountHasTokens
			console.log('Does our account have these tokens now?');
			console.log(await algonaut.accountHasTokens(algonaut.account.addr, newAsset));

			// getTokenBalance
			console.log('How many of this asset do we have?');
			console.log(await algonaut.getTokenBalance(algonaut.account.addr, newAsset));

			// optInAsset
			console.log('Going back to our first wallet!');
			algonaut.recoverAccount(firstWallet.mnemonic);
			console.log('Wallet is now: ' + algonaut.account.addr);

			console.log('Checking if account is opted into asset ' + newAsset);
			let optedIn = await algonaut.isOptedIntoAsset({
				account: algonaut.account.addr,
				assetId: newAsset
			});
			console.log('Opted in? ' + optedIn);

			console.log('Opting into asset: ' + newAsset);
			let response = await algonaut.optInAsset(newAsset);
			console.log(response);

			console.log('Checking again if account is opted into asset ' + newAsset);
			optedIn = await algonaut.isOptedIntoAsset({
				account: algonaut.account.addr,
				assetId: newAsset
			});
			console.log('Opted in? ' + optedIn);

			// sendAsset
			console.log('Now we are going back to the account that created the asset, and we will send one to the account that just opted in.');
			algonaut.recoverAccount(testAccountMnemonic);
			console.log('Account is now: ' + algonaut.account.addr);

			response = await algonaut.sendAsset({
				to: firstWallet.address,
				amount: 1,
				assetIndex: newAsset
			});
			console.log(response);

			console.log('Let us see if they got it? Checking token balance.');
			console.log(await algonaut.getTokenBalance(firstWallet.address, newAsset));

			// deleteAsset
			console.log('Now we are going to test deletion. Time to make a new asset!');
			const asset2Args = {
				assetName: 'Presto Deleto',
				symbol: 'DEL',
				metaBlock: 'Everything is temporary!',
				decimals: 3,
				amount: 1
			};
			let asset2 = await algonaut.createAsset(asset2Args);
			console.log('Created asset: ', asset2.createdIndex);
			console.log('Deleting asset: ' + asset2.createdIndex);
			response = await algonaut.deleteAsset(asset2.createdIndex);
			console.log(response);
		} catch (error) {
			errors.push('asset');
			console.error('Error testing asset code.');
			console.error(error);
		}
	} else {
		console.log('Skipping asset tests');
	}

	// APP OPERATIONS
	if (testApp) {
		const ACCOUNT_APP = 51066775; // the account app from arts-council

		// optInApp
		try {
			console.log('Opting into app ' + ACCOUNT_APP);
			response = await algonaut.optInApp({
				appIndex: ACCOUNT_APP,
				appArgs: [
					'set_all',
					'Name',
					'Description of me',
					'',
					'https://example.com',
					'',
					'example@example.com'
				]
			});
			console.log(response);
		} catch (e) {
			errors.push('optInApp');
			console.error('Error opting into app');
			console.error(e);
		}

		// getAppLocalState
		try {
			console.log('Get local state of app: ' + ACCOUNT_APP);
			appState = await algonaut.getAppLocalState(ACCOUNT_APP);
			console.log(JSON.stringify(appState, null, 2));
		} catch (e) {
			errors.push('getAppLocalState');
			console.error('Error getting state');
		}

		// callApp
		try {
			console.log('Calling app to update profile:');
			response = await algonaut.callApp({
				appIndex: ACCOUNT_APP,
				appArgs: [
					'set_all',
					'New Name',
					'Updated bio',
					'New avatar',
					'New link',
					'',
					'newemail@email.com'
				]
			});
			console.log(response);
			console.log('Get local state of app again: ' + ACCOUNT_APP);
			appState = await algonaut.getAppLocalState(ACCOUNT_APP);
			console.log(JSON.stringify(appState, null, 2));
		} catch (e) {
			errors.push('callApp');
			console.error('Error calling app');
			console.error(e);
		}

		// closeOutApp
		try {
			console.log('Closing out of app: ' + ACCOUNT_APP);
			response = await algonaut.closeOutApp({
				appIndex: ACCOUNT_APP,
				appArgs: [
					'set_all',
					'',
					'',
					'',
					'',
					'',
					''
				]
			});
			console.log(response);
		} catch (e) {
			errors.push('closeOutApp');
			console.error('Error closing out of app');
			console.error(e);
		}

		try {
			// createApp
			console.log('Deploying a contract from TEAL');
			const deployResult = await algonaut.createApp({
				tealApprovalCode: accountv1,
				tealClearCode: accountClear,
				appArgs: [],
				schema: {
					localInts: 4,
					localBytes: 12,
					globalInts: 1,
					globalBytes: 1
				}
			});
			console.log(deployResult);
			console.log('App ID is: ' + deployResult.createdIndex);
			appId = deployResult.createdIndex;
			if (!appId) errors.push('createApp');

			// getAppGlobalState
			try {
				console.log('Getting app global state');
				let state = await algonaut.getAppGlobalState(appId, algonaut.account.addr);
				console.log(state);
			} catch (e) {
				errors.push('getAppGlobalState');
				console.error(e);
			}

			// getAppEscrowAccount
			try {
				console.log('get escrow account of new app');
				console.log(algonaut.getAppEscrowAccount(appId));
			} catch (e) {
				errors.push('getAppEscrowAccount');
				console.error(e);
			}

			// getAppInfo
			try {
				console.log('Get app info:');
				console.log(await algonaut.getAppInfo(appId));
			} catch (e) {
				errors.push('getAppInfo');
				console.error(e);
			}

			// updateApp
			console.log('the following call should fail:')
			try {
				let optIn = await algonaut.optInApp({ 
					appIndex: appId,
					appArgs: [
						'set_all',
						'Name',
						'Description of me',
						'',
						'https://example.com',
						'',
						'example@example.com'
					]
				});
				console.log(optIn);
				let res = await algonaut.callApp({
					appIndex: appId,
					appArgs: ['version_test']
				});
			} catch (e) {
				console.log(e);
			}
			
			try {
				console.log('updating the app now...');
				const updateResult = await algonaut.updateApp({
					appIndex: appId,
					tealApprovalCode: accountv2,
					tealClearCode: accountClear,
					appArgs: []
				});
				console.log('updated app');
				console.log(updateResult);
			} catch (e) {
				errors.push('updateApp');
				console.error(e);
			}

			console.log('trying the call again on v2 contract');
			try {
				let res = await algonaut.callApp({
					appIndex: appId,
					appArgs: ['version_test']
				});
				console.log(res);
			} catch (e) {
				errors.push('updateApp_callApp');
				console.error(e);
			}

			// getAppInfo
			try {
				console.log('Get app info:');
				console.log(await algonaut.getAppInfo(appId));
			} catch (e) {
				errors.push('getAppInfo');
				console.error(e);
			}

			// deleteApplication
			try {
				console.log('Delete application:');
				let deleteAppResponse = await algonaut.deleteApplication(appId);
				console.log(deleteAppResponse);
			} catch (e) {
				errors.push('deleteApplication');
				console.error(e);
			}
		} catch (e) {
			console.error('Error with our new contract');
			console.log(e);
		}
	} else {
		console.log('Skipping app tests');
	}

	if (errors.length > 0) {
		console.log('There were errors, check these:');
		console.log(errors);
	} else {
		console.log('All tests passed');
	}
})();