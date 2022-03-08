"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var index_1 = require("../src/index");
var algonaut = new index_1["default"]({
    BASE_SERVER: 'https://testnet-algorand.api.purestake.io/ps2',
    LEDGER: 'TestNet',
    PORT: '',
    API_TOKEN: { 'X-API-Key': process.env.PURESTAKE_API_TOKEN }
});
var testAccountMnemonic = process.env.ALGONAUT_TEST_MNEMONIC;
if (!testAccountMnemonic) {
    console.error('Please set ALGONAUT_TEST_MNEMONIC in your environment');
    process.exit(1);
}
(function () { return __awaiter(void 0, void 0, void 0, function () {
    var wallet, firstWallet, accountInfo, balance, payment, asset, newAsset, _a, _b, _c, _d, _e, _f, optedIn, response, _g, _h, ACCOUNT_APP, appState;
    return __generator(this, function (_j) {
        switch (_j.label) {
            case 0:
                console.log('Running Algonaut tests.');
                console.log('getConfig(): ');
                console.log(JSON.stringify(algonaut.getConfig(), null, 2));
                console.log('checkStatus():');
                console.log(algonaut.checkStatus());
                // ACCOUNT OPERATIONS
                // createWallet
                console.log('Create a wallet:');
                wallet = algonaut.createWallet();
                firstWallet = Object.assign({}, wallet);
                console.log('algonaut.account is now:');
                console.log(JSON.stringify(algonaut.account, null, 2));
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
                // TODO: put code here that runs the below tests with WalletConnect if you pass an option to the script
                // getAccountInfo
                console.log('Getting account info for: ' + algonaut.account.addr);
                return [4 /*yield*/, algonaut.getAccountInfo(algonaut.account.addr)];
            case 1:
                accountInfo = _j.sent();
                console.log(accountInfo);
                // getAlgoBalance
                console.log('getAlgoBalance(algonaut.account.addr): ');
                return [4 /*yield*/, algonaut.getAlgoBalance(algonaut.account.addr)];
            case 2:
                balance = _j.sent();
                console.log(balance);
                // sendAlgo
                console.log('Sending a little bit of ALGO to the first account we created:');
                return [4 /*yield*/, algonaut.sendAlgo({
                        to: firstWallet.address,
                        amount: 1000000
                    })];
            case 3:
                payment = _j.sent();
                console.log(payment);
                // ASSET OPERATIONS
                // createAsset
                console.log('Let\'s try creating an asset.');
                return [4 /*yield*/, algonaut.createAsset({
                        assetName: 'Presto Testo',
                        symbol: 'TEST',
                        metaBlock: 'This is a test of algonaut',
                        decimals: 3,
                        amount: 5
                    })];
            case 4:
                asset = _j.sent();
                console.log(asset); // this should be an ID
                newAsset = parseInt(asset);
                // getAssetInfo
                console.log('Getting info for our new asset: ' + newAsset);
                _b = (_a = console).log;
                return [4 /*yield*/, algonaut.getAssetInfo(newAsset)];
            case 5:
                _b.apply(_a, [_j.sent()]);
                // accountHasTokens
                console.log('Does our account have these tokens now?');
                _d = (_c = console).log;
                return [4 /*yield*/, algonaut.accountHasTokens(algonaut.account.addr, newAsset)];
            case 6:
                _d.apply(_c, [_j.sent()]);
                // getTokenBalance
                console.log('How many of this asset do we have?');
                _f = (_e = console).log;
                return [4 /*yield*/, algonaut.getTokenBalance(algonaut.account.addr, newAsset)];
            case 7:
                _f.apply(_e, [_j.sent()]);
                // optInAsset
                console.log('Going back to our first wallet!');
                algonaut.recoverAccount(firstWallet.mnemonic);
                console.log('Wallet is now: ' + algonaut.account.addr);
                console.log('Checking if account is opted into asset ' + newAsset);
                return [4 /*yield*/, algonaut.isOptedIntoAsset({
                        account: algonaut.account.addr,
                        assetId: newAsset
                    })];
            case 8:
                optedIn = _j.sent();
                console.log('Opted in? ' + optedIn);
                console.log('Opting into asset: ' + newAsset);
                return [4 /*yield*/, algonaut.optInAsset(newAsset)];
            case 9:
                response = _j.sent();
                console.log(response);
                console.log('Checking again if account is opted into asset ' + newAsset);
                return [4 /*yield*/, algonaut.isOptedIntoAsset({
                        account: algonaut.account.addr,
                        assetId: newAsset
                    })];
            case 10:
                optedIn = _j.sent();
                console.log('Opted in? ' + optedIn);
                // sendAsset
                console.log('Now we are going back to the account that created the asset, and we will send one to the account that just opted in.');
                algonaut.recoverAccount(testAccountMnemonic);
                console.log('Account is now: ' + algonaut.account.addr);
                return [4 /*yield*/, algonaut.sendAsset({
                        to: firstWallet.address,
                        amount: 1,
                        assetIndex: newAsset
                    })];
            case 11:
                response = _j.sent();
                console.log(response);
                console.log('Let us see if they got it? Checking token balance.');
                _h = (_g = console).log;
                return [4 /*yield*/, algonaut.getTokenBalance(firstWallet.address, newAsset)];
            case 12:
                _h.apply(_g, [_j.sent()]);
                // deleteAsset
                console.log("That was fun but I don't want to play with you anymore.");
                console.log('Deleting asset: ' + newAsset);
                return [4 /*yield*/, algonaut.deleteAsset(newAsset)];
            case 13:
                response = _j.sent();
                console.log(response);
                ACCOUNT_APP = 51066775;
                console.log('Opting into app ' + ACCOUNT_APP);
                return [4 /*yield*/, algonaut.optInApp({
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
                    })];
            case 14:
                response = _j.sent();
                console.log(response);
                // getAppGlobalState
                // getAppLocalState
                console.log('Get local state of app: ' + ACCOUNT_APP);
                return [4 /*yield*/, algonaut.getAppLocalState(ACCOUNT_APP)];
            case 15:
                appState = _j.sent();
                console.log(JSON.stringify(appState, null, 2));
                // callApp
                console.log('Calling app to update profile:');
                return [4 /*yield*/, algonaut.callApp({
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
                    })];
            case 16:
                response = _j.sent();
                console.log(response);
                console.log('Get local state of app again: ' + ACCOUNT_APP);
                return [4 /*yield*/, algonaut.getAppLocalState(ACCOUNT_APP)];
            case 17:
                appState = _j.sent();
                console.log(JSON.stringify(appState, null, 2));
                // closeOutApp
                console.log('Closing out of app: ' + ACCOUNT_APP);
                return [4 /*yield*/, algonaut.closeOutApp({
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
                    })];
            case 18:
                response = _j.sent();
                console.log(response);
                return [2 /*return*/];
        }
    });
}); });
