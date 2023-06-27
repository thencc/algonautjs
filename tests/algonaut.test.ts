import {describe, expect, test, beforeAll, beforeEach, jest } from '@jest/globals';
import { Algonaut } from '../src/index';
import { accountAppID, bricksID, txnCallApp, txnCloseOutApp, txnCreateAsset, txnDeleteApp, txnOptInApp, txnOptInAsset, txnPayment, txnSendAsset } from './mocks/txns';
import { AlgonautConfig, AlgonautWallet, AlgonautAppState } from '../src/AlgonautTypes';
import accounttContractValid from './mocks/account-contract-valid';
import accountv2 from './mocks/accountv2';
import accountClear from './mocks/account-clear';
import getAppLocalStateResponse from './mocks/getAppLocalStateResponse';
import algosdk from 'algosdk';
import { mainnetConfig, testnetConfig } from '../src/algo-config';

import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, './.env') });
// console.log('process.env', process.env);

// if there is not a valid test mnemonic, we cannot proceed!
const testAccountMnemonic: string = process.env.ALGONAUT_TEST_MNEMONIC as string;

const validConfig: AlgonautConfig = {
	nodeConfig: {
		BASE_SERVER: process.env.NCC_BASE_SERVER as string,
		INDEX_SERVER: process.env.NCC_INDEX_SERVER,
		LEDGER: process.env.NCC_LEDGER as string,
		PORT: process.env.NCC_PORT as string,
		API_TOKEN: { [(process.env.NCC_API_TOKEN_HEADER as string)]: process.env.NCC_API_TOKEN }
	}
};

if (!testAccountMnemonic) console.error('You must set ALGONAUT_TEST_MNEMONIC in your environment. This account needs a little bit of ALGO to run the tests.');
try {

	const account = (new Algonaut()).recoverAccount(testAccountMnemonic);
	console.log(`Account set for tests: ${account.addr}`);
} catch (e) {
	console.error('ALGONAUT_TEST_MNEMONIC is not a valid Algorand account');
}

// this is a new wallet we use to test various things,
// created at the beginning of each test run but used throughout
let freshWallet: AlgonautWallet;

// describe('instantiate Algonaut without inkey', () => {
//     let algonaut: Algonaut;

//     beforeEach(() => {
//         algonaut = new Algonaut(validConfig);
//     });

//     test('valid config instantiates algonaut', () => {
//         expect(algonaut.nodeConfig).toBeDefined();
//         expect(algonaut.algodClient).toBeDefined();
//         expect(algonaut.isValidNodeConfig(validConfig.nodeConfig)).toBeTruthy();
//     })
// });

// describe('instantiate Algonaut with inkey', () => {
//     let algonaut: Algonaut;

//     beforeEach(() => {
//         algonaut = new Algonaut(validConfig); // inkey is the default
//     });
// })

// isValidNodeConfig
describe('isValidNodeConfig', () => {
	const invalidConfig = {
		BASE_SERVER: '',
		LEDGER: '',
		PORT: '',
		API_TOKEN: ''
	};
	test('require BASE_SERVER', () => {
		expect(new Algonaut(validConfig).isValidNodeConfig(invalidConfig)).toBeFalsy();
	});

	test('isValidNodeConfig returns true for a valid config', () => {
		expect(new Algonaut(validConfig).isValidNodeConfig(validConfig.nodeConfig)).toBe(true);
	});
});

describe('getNodeConfig', () => {
	test('getNodeConfig returns config object', () => {
		const algonaut = new Algonaut(validConfig);
		expect(algonaut.getNodeConfig()).toEqual(validConfig['nodeConfig']);
	});

	test('getNodeConfig returns false if Algonaut is not configured', () => {
		expect(Algonaut.prototype.getNodeConfig()).toBeFalsy();
	});
});

describe('setNodeConfig', () => {
	let a: Algonaut;
	beforeEach(() => {
		a = new Algonaut();
	});

	test('mainnet config string works', () => {
		a.setNodeConfig('mainnet');
		expect(a.nodeConfig.BASE_SERVER).toEqual(mainnetConfig?.BASE_SERVER);
	});

	test('testnet config string works', () => {
		a.setNodeConfig('testnet');
		expect(a.nodeConfig.BASE_SERVER).toEqual(testnetConfig?.BASE_SERVER);
	});

	test('should throw error with any other string', () => {
		// @ts-expect-error 123
		expect(() => a.setNodeConfig('bababa')).toThrow();
	});
});

describe('Algonaut methods', () => {
	// increase timeout here so we can wait for transactions to confirm
	jest.setTimeout(120000);

	let algonaut: Algonaut;

	beforeEach(async () => {
		algonaut = new Algonaut(validConfig);
	});

	// this test passes when it's the only one running, due to jest running things in parallel?
	// test.only('mnemonic connect should update active account', async () => {
	//     const account = algonaut.createWallet();
	//     await algonaut.disconnectAll();
	//     await algonaut.connect({ mnemonic: account.mnemonic });
	//     expect(algonaut.account?.address).toBe(account.address);
	//     await algonaut.disconnectAll();
	// })

	test('createWallet creates an account object with address and mnemonic parameters', () => {
		const wallet = algonaut.createWallet();
		expect(wallet).toBeDefined();
		expect(wallet.address).toBeDefined();
		expect(wallet.mnemonic).toBeDefined();
	});

	test('recoverAccount should throw error with incorrect mnemonic', () => {
		expect(() => algonaut.recoverAccount('INVALID')).toThrow();
	});

	test('recoverAccount works with a newly created wallet', () => {
		const account = algonaut.createWallet();
		const recoveredAccount = algonaut.recoverAccount(account.mnemonic);
		expect(recoveredAccount.addr).toBeDefined();
		expect(recoveredAccount.sk).toBeDefined();
	});

	test('b64StrToHumanStr decodes base64-encoded text', () => {
		expect(algonaut.b64StrToHumanStr('SGVsbG8gV29ybGQ=')).toBe('Hello World');
	});

	test('stateArrayToObject correctly transforms state array', () => {
		const obj = algonaut.stateArrayToObject(getAppLocalStateResponse.locals);
		expect(obj.name).toBe('Name');
		expect(obj.bio).toBe('Description of me');
	});

	// test('set account changes algonaut account', () => {
	//     const account1 = algosdk.generateAccount();
	//     algonaut.createWallet();
	//     expect(algonaut.account?.addr).not.toBe(account1.addr);
	//     algonaut.setAccount(account1);
	//     expect(algonaut.account?.addr).toBe(account1.addr);
	// })

	test('toUint8Array returns Uint8Array', () => {
		expect(algonaut.toUint8Array('test note')).toBeInstanceOf(Uint8Array);
	});

	describe('txnSummary', () => {
		test('txnSummary takes in a txn and returns a string', () => {
			const summary = algonaut.txnSummary(txnPayment);
			expect(typeof summary).toBe('string');
		});

		test('identifies payment txn', () => {
			const summary = algonaut.txnSummary(txnPayment);
			expect(summary.includes('Send')).toBe(true);
		});

		test('identifies opt in asset txn', () => {
			const summary = algonaut.txnSummary(txnOptInAsset);
			expect (summary.includes(`Opt-in to asset ID ${bricksID}`)).toBe(true);
		});

		test('identifies asset xfer', () => {
			const summary = algonaut.txnSummary(txnSendAsset);
			expect(summary.includes(`Transfer 1 of asset ID ${bricksID}`)).toBe(true);
		});

		test('identifies create asset', () => {
			const summary = algonaut.txnSummary(txnCreateAsset);
			expect(summary.includes('Create asset Test Asset, symbol TEST')).toBe(true);
		});

		test('identifies call app', () => {
			const summary = algonaut.txnSummary(txnCallApp);
			expect(summary.includes(`Call to application ID ${accountAppID}`)).toBe(true);
		});

		test('identifies opt in app', () => {
			const summary = algonaut.txnSummary(txnOptInApp);
			expect(summary.includes(`Opt-in to application ID ${accountAppID}`)).toBe(true);
		});

		test('identifies close out app', () => {
			const summary = algonaut.txnSummary(txnCloseOutApp);
			expect(summary.includes(`Close out application ID ${accountAppID}`)).toBe(true);
		});

		test('identifies delete app', () => {
			const summary = algonaut.txnSummary(txnDeleteApp);
			expect(summary.includes(`Delete application ID ${accountAppID}`)).toBe(true);
		});

		// test('identifies update app', () => {
		//     const summary = utils.txnSummary(txnUpdateApp);
		//     expect(summary.includes(`Update application ID ${accountAppID}`)).toBeTruthy();
		// })
	});

	test('getAppEscrowAccount returns app address', () => {
		const appAddress = algosdk.getApplicationAddress(accountAppID);
		expect(algonaut.getAppEscrowAccount(accountAppID)).toEqual(appAddress);
	});

	describe('compileProgram', () => {
		test('compileProgram successfully compiles a valid program', async () => {
			const compiled = await algonaut.compileProgram(accounttContractValid);
			expect(compiled).toBeDefined();
			expect(compiled).toBeInstanceOf(Uint8Array);
		});
	});

	describe('checkStatus', () => {
		test('check status returns network status', async () => {
			const status = await algonaut.checkStatus();
			expect(status['catchpoint']).toBeDefined();
			expect(status['catchpoint-acquired-blocks']).toBeDefined();
			expect(status['catchpoint-processed-accounts']).toBeDefined();
			expect(status['catchpoint-total-accounts']).toBeDefined();
			expect(status['catchpoint-verified-accounts']).toBeDefined();
			expect(status['catchup-time']).toBeDefined();
			expect(status['last-catchpoint']).toBeDefined();
			expect(status['last-round']).toBeDefined();
			expect(status['last-version']).toBeDefined();
			expect(status['next-version']).toBeDefined();
			expect(status['next-version-round']).toBeDefined();
			expect(status['next-version-supported']).toBeDefined();
			expect(status['stopped-at-unsupported-round']).toBeDefined();
			expect(status['time-since-last-round']).toBeDefined();
		});
	});

	describe('with mnemonic account', () => {
		beforeEach(async () => {
			await algonaut.connect('mnemonic', testAccountMnemonic);
			freshWallet = algonaut.createWallet();
		});

		describe('getAlgoBalance', () => {
			test('getAlgoBalance returns a number greater than zero', async () => {
				const balance = await algonaut.getAlgoBalance(algonaut.walletState.activeAddress);
				expect(balance).toBeGreaterThan(0);
			});
		});

		describe('getAccountInfo', () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			let info: any;
			beforeAll(async () => {
				info = await algonaut.getAccountInfo(algonaut.walletState.activeAddress);
			});

			test('getAccountInfo contains all account info properties', async () => {
				expect(info.address).toBeDefined();
				expect(info.amount).toBeGreaterThan(0);
				expect(info['apps-local-state']).toBeDefined();
				expect(info['assets']).toBeDefined();
				expect(info['pending-rewards']).toBeDefined();
				expect(info['round']).toBeDefined();
				expect(info['status']).toBeDefined();
				expect(info['total-apps-opted-in']).toBeDefined();
				expect(info['total-assets-opted-in']).toBeDefined();
				expect(info['total-created-apps']).toBeDefined();
				expect(info['total-created-assets']).toBeDefined();
			});
		});

		describe('sendAlgo / atomicPayment', () => {
			test('atomicPayment creates a transaction', async () => {
				const to = algosdk.generateAccount();
				const txn = await algonaut.atomicSendAlgo({ to: to.addr, amount: 10 });
				expect(txn.transaction instanceof algosdk.Transaction).toBeTruthy();
			});

			test('atomicSendAlgo creates a transaction', async () => {
				const to = algosdk.generateAccount();
				const txn = await algonaut.atomicSendAlgo({ to: to.addr, amount: 10 });
				expect(txn.transaction instanceof algosdk.Transaction).toBeTruthy();
			});

			test('sendAlgo sends ALGO successfully', async () => {
				// this test doubles as a way to fund the new wallet for opt-in tests later
				// so if it fails, it causes a bit of a domino effect
				await algonaut.sendAlgo({ to: freshWallet.address, amount: 500000 });
				const bal = await algonaut.getAlgoBalance(freshWallet.address);
				expect(bal).toBe(500000);
			});
		});

		describe('Asset method tests', () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			let asset: any;

			// might as well spam test net with some ads :)
			const assetArgs = {
				assetName: 'Algonaut.JS',
				symbol: 'NCCALGO',
				metaBlock: 'Algonaut.js is a library for developing Algorand dApps',
				decimals: 3,
				amount: 5,
				url: 'https://github.com/thencc/algonautjs'
			};

			test('atomicCreateAsset returns a transaction', async () => {
				const txn = await algonaut.atomicCreateAsset(assetArgs);
				expect(txn.transaction instanceof algosdk.Transaction).toBe(true);
			});

			test('createAsset returns createdIndex property', async () => {
				asset = await algonaut.createAsset(assetArgs);
				expect(asset.status).toBe('success');
				expect(asset.createdIndex).toBeDefined();
			});

			test('getAssetInfo returns asset info', async () => {
				const info = await algonaut.getAssetInfo(asset.createdIndex);
				// console.log('getAssetInfo response', info);
				expect(info).toBeDefined();
				// check all properties! in case the API changes, we will know immediately :)
				expect(info).toHaveProperty('index');
				expect(info).toHaveProperty('params');
				expect(info).toHaveProperty('params.name-b64');
				expect(info).toHaveProperty('params.unit-name-b64');
				expect(info).toHaveProperty('params.default-frozen');
				expect(info.params.clawback).toBe(algonaut.walletState.activeAddress);
				expect(info.params.freeze).toBe(algonaut.walletState.activeAddress);
				expect(info.params.manager).toBe(algonaut.walletState.activeAddress);
				expect(info.params.reserve).toBe(algonaut.walletState.activeAddress);
				expect(info.params.creator).toBe(algonaut.walletState.activeAddress);
				expect(info.params.decimals).toBe(assetArgs.decimals);
				expect(info.params.total).toBe(assetArgs.amount);
				expect(info.params['unit-name']).toBe(assetArgs.symbol);
				expect(info.params['name']).toBe(assetArgs.assetName);
			});

			test('getTokenBalance returns 5 (amount specified during createAsset)', async () => {
				const bal = await algonaut.getTokenBalance(algonaut.walletState.activeAddress, asset.createdIndex);
				expect(bal).toBe(5);
			});

			test('atomicOptInAsset returns a transaction', async () => {
				const txn = await algonaut.atomicOptInAsset(asset.createdIndex);
				expect(txn.transaction instanceof algosdk.Transaction).toBe(true);
			});

			test('isOptedIntoAsset returns false with a new account', async () => {
				await algonaut.mnemonicConnect(freshWallet.mnemonic);
				const optedIn = await algonaut.isOptedIntoAsset({
					account: algonaut.walletState.activeAddress,
					assetId: asset.createdIndex
				});
				// expect(optedIn).toBe(false);

				// FYI the creator acct is automatically opted-in + holds the reserve supply
				expect(optedIn).toBe(true);
			});

			test('optInAsset successfully opts in to newly created asset', async () => {
				algonaut.mnemonicConnect(freshWallet.mnemonic);
				const res = await algonaut.optInAsset(asset.createdIndex);
				expect(res.status).toBe('success');

				const optedIn = await algonaut.isOptedIntoAsset({
					account: algonaut.walletState.activeAddress,
					assetId: asset.createdIndex
				});
				expect(optedIn).toBe(true);
			});

			test('atomicSendAsset returns a transaction', async () => {
				const txn = await algonaut.atomicSendAsset({ to: freshWallet.address, amount: 1, assetIndex: asset.createdIndex });
				expect(txn.transaction instanceof algosdk.Transaction).toBe(true);
			});

			test('sendAsset successfully sends asset', async () => {
				// --- old ---
				// await algonaut.mnemonicConnect(testAccountMnemonic);
				// // to addr has to opt-in before being sent an asset (they might have 0 bal tho so send them a little algo first)
				// const res = await algonaut.sendAsset({ to: freshWallet.address, amount: 1, assetIndex: asset.createdIndex });
				// expect(res).toHaveProperty('txId');
				// expect(res.status).toBe('success');
				// expect(res.error).toBeUndefined();
				// // check balance
				// const bal = await algonaut.getTokenBalance(freshWallet.address, asset.createdIndex);
				// expect(bal).toBe(1);


				// --- new ---
				// FYI - to addr has to opt-in before being sent an asset (they might have 0 bal tho so send them a little algo first)

				// 1. fund
				await algonaut.mnemonicConnect(testAccountMnemonic);
				const fundTxn = await algonaut.sendAlgo({
					// from: testAcct.addr,
					to: freshWallet.address,
					amount: 220000, // above min bal
				});
				console.log('fundTxn', fundTxn);
				await algonaut.disconnectAll();

				// 2. opt-in
				// use the fresh acct/wallet as the active acct because opt-in txn uses this as the .from + .to
				await algonaut.connect('mnemonic', freshWallet.mnemonic);
				const optInTxn = await algonaut.optInAsset(
					asset.createdIndex
				);
				console.log('optInTxn', optInTxn);
				await algonaut.disconnectAll();

				// 3. send asset
				const testAcct = (new Algonaut()).recoverAccount(testAccountMnemonic);
				console.log('testAcct', testAcct);
				await algonaut.mnemonicConnect(testAccountMnemonic);
				// FYI cannot fund, opt-in and send asset in 1 atomic...
				const res = await algonaut.sendTransaction([
					// await algonaut.atomicSendAlgo({
					//     from: testAcct.addr,
					//     to: freshWallet.address,
					//     amount: 120000, // above min bal for holding 1 asset
					// }),

					// opt-in uses algonaut active account as to + from
					// await algonaut.atomicOptInAsset(
					//     asset.createdIndex
					// ),

					await algonaut.atomicSendAsset({
						from: testAcct.addr, // BJV...
						to: freshWallet.address,
						assetIndex: asset.createdIndex,
						amount: 1,
					})
				]);
				console.log('res', res);

				expect(res).toHaveProperty('txId');
				expect(res.status).toBe('success');
				expect(res.error).toBeUndefined();
				// check balance
				const bal = await algonaut.getTokenBalance(freshWallet.address, asset.createdIndex);
				expect(bal).toBe(1);
			});

			test('atomicDeleteAsset returns a transaction', async () => {
				const txn = await algonaut.atomicDeleteAsset(asset.createdIndex);
				expect(txn.transaction instanceof algosdk.Transaction).toBe(true);
			});

			test('deleteAsset successfully deletes asset', async () => {
				const asset2Args = {
					assetName: 'Presto Deleto',
					symbol: 'DEL',
					metaBlock: 'Everything is temporary!',
					decimals: 3,
					amount: 1
				};
				const asset2 = await algonaut.createAsset(asset2Args);
				if (!asset2.createdIndex) return console.error('Error creating temporary asset');
				const res = await algonaut.deleteAsset(asset2.createdIndex);
				expect(res.status).toBe('success');
				expect(res.error).toBeUndefined();
			});
		});

		describe('App tests', () => {
			const ACCOUNT_APP = 51066775; // the account app from arts-council
			const createAppArgs = {
				tealApprovalCode: accounttContractValid,
				tealClearCode: accountClear,
				appArgs: [],
				schema: {
					localInts: 4,
					localBytes: 12,
					globalInts: 1,
					globalBytes: 1
				}
			};

			const updateAppArgs = {
				appIndex: 123456789,
				tealApprovalCode: accountv2,
				tealClearCode: accountClear,
				appArgs: []
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			let createdApp: any;

			test('atomicOptInApp returns a transaction', async () => {
				const txn = await algonaut.atomicOptInApp({ appIndex: ACCOUNT_APP, appArgs: [] });
				expect(txn.transaction instanceof algosdk.Transaction).toBe(true);
			});

			test('optInApp successfully opts in', async () => {
				const res = await algonaut.optInApp({
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
				expect(res.status).toBe('success');
			});

			test('getAppLocalState returns local state using algonaut.account by default', async () => {
				const state: AlgonautAppState = await algonaut.getAppLocalState(ACCOUNT_APP) as AlgonautAppState;
				// console.log('getAppLocalState response: opted in', state);
				expect(state).toBeDefined();
				expect(state.hasState).toBe(true);
				expect(state.globals).toHaveLength(0);
				expect(state.locals.length).toBeDefined();
				expect(state.index).toBe(ACCOUNT_APP);

				const obj = algonaut.stateArrayToObject(state.locals);

				expect(obj.name).toBe('Name');
				expect(obj.bio).toBe('Description of me');
				expect(obj.contact).toBe('example@example.com');
				expect(obj.link).toBe('https://example.com');
			});

			test('getAppLocalState also works with foreign address', async () => {
				const state: AlgonautAppState = await algonaut.getAppLocalState(ACCOUNT_APP, freshWallet.address) as AlgonautAppState;
				// console.log('getAppLocalState response: not opted in', state);
				expect(state).toBeDefined();
				expect(state.hasState).toBe(false);
				expect(state.globals).toHaveLength(0);
				expect(state.locals).toHaveLength(0);
				expect(state.index).toBe(ACCOUNT_APP);
			});

			test('atomicCallApp returns a transaction', async () => {
				const txn = await algonaut.atomicCallApp({ appIndex: ACCOUNT_APP, appArgs: ['version_test'] });
				expect(txn.transaction instanceof algosdk.Transaction).toBe(true);
			});

			test('callApp successfully updates local state', async () => {
				const res = await algonaut.callApp({
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
				expect(res.status).toBe('success');
				const state = await algonaut.getAppLocalState(ACCOUNT_APP);
				expect(state).toBeDefined(); // TODO: check for updated new name
			});

			test('atomicCloseOutApp returns a transaction', async () => {
				const txn = await algonaut.atomicCloseOutApp({
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
				expect(txn.transaction instanceof algosdk.Transaction).toBe(true);
			});

			test('closeOutApp removes local state', async () => {
				const res = await algonaut.closeOutApp({
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
				expect(res.status).toBe('success');
			});

			test('atomicCreateApp returns a transaction', async () => {
				const txn = await algonaut.atomicCreateApp(createAppArgs);
				expect(txn.transaction instanceof algosdk.Transaction).toBe(true);
			});

			test('createApp successfully deploys an application and returns createdIndex', async () => {
				const res = await algonaut.createApp(createAppArgs);
				expect(res.status).toBe('success');
				expect(res.createdIndex).toBeDefined();
				expect(res.createdIndex).toBeGreaterThan(0);
				createdApp = res.createdIndex;
				updateAppArgs.appIndex = res.createdIndex as number;
			});

			test('getAppGlobalState returns global state for app', async () => {
				const state = await algonaut.getAppGlobalState(createdApp);
				console.log(state);
				expect(state).toBeDefined();
				expect(state.admin).toBeDefined();
			});

			test('valueAsAddr successfully decodes', async () => {
				const state = await algonaut.getAppGlobalState(ACCOUNT_APP);
				const addr = algonaut.valueAsAddr(state.admin);
				expect(addr).toBeDefined();
			});

			test('getAppInfo returns all app info', async () => {
				const info = await algonaut.getAppInfo(createdApp);
				console.log(info);
				expect(info).toBeDefined();
			});

			test('atomicUpdateApp returns a transaction', async () => {
				const txn = await algonaut.atomicUpdateApp(updateAppArgs);
				expect(txn.transaction instanceof algosdk.Transaction).toBe(true);
			});

			test('updateApp should update the application code', async () => {
				// first we need to opt in to the app we've created

				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const optIn = await algonaut.optInApp({
					appIndex: createdApp,
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

				// this call SHOULD fail, because version_test doesn't exist on v1
				try {
					const res = await algonaut.callApp({
						appIndex: createdApp,
						appArgs: ['version_test']
					});
					expect(res.status).toBe('fail');
				} catch (e) {
					expect(e).toBeDefined();
				}

				// now we update the application and test the call again
				const updateResult = await algonaut.updateApp({
					appIndex: createdApp,
					tealApprovalCode: accountv2,
					tealClearCode: accountClear,
					appArgs: []
				});
				expect(updateResult.status).toBe('success');

				// and the call should pass now
				const res = await algonaut.callApp({
					appIndex: createdApp,
					appArgs: ['version_test']
				});
				expect(res.status).toBe('success');
			});

			test('atomicDeleteApp returns a transaction', async () => {
				const txn = await algonaut.atomicDeleteApp(createdApp);
				expect(txn.transaction instanceof algosdk.Transaction).toBe(true);
			});

			test('deleteApp successfully deletes the application', async () => {
				const res = await algonaut.deleteApp(createdApp);
				expect(res.status).toBe('success');

				// get info of deleted app
				await expect(algonaut.getAppInfo(createdApp)).rejects.toThrow();
			});

			test('deleteApp successfully deletes the application', async () => {
				const newApp = await algonaut.createApp(createAppArgs);
				expect(newApp.status).toBe('success');

				const res = await algonaut.deleteApp(newApp.createdIndex as number);
				expect(res.status).toBe('success');

				// get info of deleted app
				await expect(algonaut.getAppInfo(createdApp)).rejects.toThrow();
			});
		});
	});


	// getAccounts
	// waitForConfirmation
	// sendAtomicTransaction
	// sendTransaction

	// ======= Logic Sig tests ======
	// atomicAssetTransferWithLSig
	// atomicPaymentWithLSig
	// atomicCallAppWithLSig
	// deployTealWithLSig
	// generateLogicSig
});
// */

// ========= inkey tests =========
// initInkey
// inkeyConnect
// inkeyDisconnect
// inkeyHide
// inkeyMessageAsync
// inkeySetApp
// inkeyShow
// inkeySignTxns
// setInkeyAccount
// usingInkeyWallet