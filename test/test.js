const { default: Algonaut } = require('../dist/cjs/index');
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

(async () => {
    console.log('Running Algonaut tests.');

    console.log('getConfig(): ')
    console.log(JSON.stringify(algonaut.getConfig(), null, 2));

    console.log('checkStatus():');
    await algonaut.checkStatus();

    // ACCOUNT OPERATIONS

    // createWallet
    console.log('Create a wallet:');
    let wallet = algonaut.createWallet();
    let firstWallet = Object.assign({}, wallet); // so we can use this later
    console.log('algonaut.account is now:')
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

    // TODO: put code here that runs the below tests with WalletConnect if you pass an option to the script

    // getAccountInfo
    console.log('Getting account info for: ' + algonaut.account.addr);
    let accountInfo = await algonaut.getAccountInfo(algonaut.account.addr);
    console.log(accountInfo);

    // getAlgoBalance
    console.log('getAlgoBalance(algonaut.account.addr): ')
    let balance = await algonaut.getAlgoBalance(algonaut.account.addr);
    console.log(balance);
    
    // sendAlgo
    console.log('Sending a little bit of ALGO to the first account we created:')
    let payment = await algonaut.sendAlgo({
        to: firstWallet.address,
        amount: 1000000
    });
    console.log(payment);

    // ASSET OPERATIONS

    // createAsset
    try {
        console.log('Let\'s try creating an asset.')
        let asset = await algonaut.createAsset({
            assetName: 'Presto Testo',
            symbol: 'TEST',
            metaBlock: 'This is a test of algonaut',
            decimals: 3,
            amount: 5,
        })
        console.log(asset); // this should be an ID
        let newAsset = parseInt(asset);

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
        console.log('Going back to our first wallet!')
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
        console.log("That was fun but I don't want to play with you anymore.");
        console.log('Deleting asset: ' + newAsset);
        response = await algonaut.deleteAsset(newAsset);
        console.log(response);
    } catch (error) {
        console.error('Error testing asset code.');
        console.error(error);
    }

    // APP OPERATIONS

    // optInApp
    const ACCOUNT_APP = 51066775; // the account app from arts-council
    console.log('Opting into app ' + ACCOUNT_APP)
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
    // getAppGlobalState
    // getAppLocalState
    console.log('Get local state of app: ' + ACCOUNT_APP);
    let appState = await algonaut.getAppLocalState(ACCOUNT_APP);
    console.log(JSON.stringify(appState, null, 2));

    // callApp
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

    // closeOutApp
    console.log('Closing out of app: ' + ACCOUNT_APP)
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

    // deployFromTeal
    // getAppEscrowAccount
    // getAppInfo
    // deleteApplication
})();