# Algonaut.js

[Examples](https://thencc.github.io/algonautjs/examples/) | [API Docs](https://thencc.github.io/algonautjs/docs/classes/Algonaut.html)

Algonaut.js is designed to be a front end developer friendly and browser friendly library to facilitate intuitive transactions on the Algorand network.  Algorand is incredibly fast, powerful and secure, but it's early days and the tooling is still a little intense.

After working with the existing frameworks for a couple months, we decided to just create what we felt was missing!  Get in here and help!

THE GOAL OF THIS LIBRARY IS SIMPLICITY AND EASE OF USE for the front end crew.  This library aims to bring you closer to key concepts behind the mature transactional fiesta that is Algorand though ease of use.  If you need a robust contract creation and debugging environment, please take the wonderful Algo Builder for a spin!

We package, expose and depend on the [JavaScript Algosdk](https://github.com/algorand/js-algorand-sdk). It's there if you need it, but that API is pretty intense for day-to-day use.  With Algonaut.js, you can run one-off transactions with a vastly simplified API as compared to transacting with the Algosdk directly.  We're trying to solve for the 90% cases and ask you to dive into the hard stuff only if you actually need to use it.


## Usage

Install:

```bash
# npm
npm install @thencc/algonautjs
# or, pnpm
pnpm add @thencc/algonautjs
# or, install the beta release
pnpm add @thencc/algonautjs@beta
```

Basic usage:

```js
// 1. import lib
import { Algonaut } from '@thencc/algonautjs';

// 2. create lib instance
const algonaut = new Algonaut(); // uses algonaut testnet by default

// 3. authenticate (ex: using inkey microwallet)
const accounts = await algonaut.connect({
  inkey: true
});

// 4. contruct a txn + submit it to the network (uses suggested network params)
const txnStatus = await algonaut.sendAlgo({
  to: 'DXS4S2WZMFAFA2WDSIRNCZGVSQQ72XEKVED63NA7KWVLKWBWZ6AABQYMTY',
  amount: 1000, // micro algos
  optionalFields: { note: 'a note for the transaction' }
});
console.log(txnStatus);
```


## Authenticating / Connecting a Wallet

algonaut supports most all Algorand wallets such as... 
- ✅ Pera
- ✅ Inkey
- ✅ MyAlgo
- ✅ AlgoSigner 
- ✅ Exodus 
- ✅ Defly
- ✅ Mnemonic (not secure client-side)

...by using [`any-wallet`](https://github.com/thencc/any-wallet) under the hood. 

`any-wallet` uses localstorage to remember which wallet(s) a user has connected to the dapp previously and the entire `any-wallet` reactive state is made available at `algonaut.walletState` for convenience. see the [`any-wallet` documentation](https://github.com/thencc/any-wallet) for more info.

<details>
<summary><h3>🔌 ex: simple connect ↕</h3></summary>
  
At it's simplest, algonaut can connect a user's wallet by awaiting the `.connect()` method, which takes an object with exactly ONE entry where the `WALLET_ID` of the desired provider is the key and the value is `true`. this loads the wallet's sdk on demand and prompts the user to signin to it. for example:
```ts
// inkey microwallet
let accts = await algonaut.connect({
  inkey: true
});

// or, pera wallet
let accts = await algonaut.connect({
  pera: true
});

// now algonaut uses the first returned acct as the active account on the class instance
algonaut.account == accts[0];
```
</details>


<details>
<summary><h3>🧮 ex: complex connect ↕</h3></summary>
  
```ts
import { WALLET_ID } from '@thencc/algonautjs';

/** --- 1. ENABLE some wallets [dev] --- */

const algonaut = new Algonaut({
  initWallets: {
    [WALLET_ID.INKEY]: {
      config: {
        align: 'right', // use custom config or true for defaults
      }
    },
    [WALLET_ID.PERA]: true,
    [WALLET_ID.MYALGO]: true,
    [WALLET_ID.ALGOSIGNER]: true,
    [WALLET_ID.EXODUS]: true,
    [WALLET_ID.DEFLY]: true,
    [WALLET_ID.MNEMONIC]: '25 word phrase',
  }
});



/** --- 2. CONNECT a wallet [user] --- */

// connect a specific wallet directly
const accts = await algonaut.walletState.enabledWallets.pera.connect();

// or, iterate through enabledWallets in the ui and connect the one the user selected
const connectWallet = async (walletId: string) => {
  try {
    if (
      algonaut.walletState.enabledWallets &&
      walletId in algonaut.walletState.enabledWallets
    ) {
        let accts = await algonaut.walletState.enabledWallets[walletId].connect();
        return accts;
    } else {
      throw new Error('wallet not enabled:', walletId);
    }
  } catch(e) {
    console.warn(e);
  }
};

// for example, on a button click do:
let accts = await connectWallet('pera');
```
</details>


<details>
<summary><h3>📝 ex: mnemonic wallet ↕</h3></summary>

> **note**: NOT SECURE for client-side use but can be useful for rapid local development.

```ts
// enable + connect on instantiation 
const algonaut = new Algonaut({
  initWallets: {
    mnemonic: '25 word phrase'
  }
});

// or, connect later on
const algonaut = new Algonaut();
...
let accts = await algonaut.connect({
  mnemonic: '25 word phrase'
});
```
</details>


<details>
<summary><h3>🐙 ex: complex inkey microwallet ↕</h3></summary>

algonaut is optimized for inkey! on the top level of algonaut there are useful methods such as: 
- `algonaut.inkeyLoaded`
- `algonaut.inkeyLoading`
- `algonaut.inkeyShow()`
- `algonaut.inkeyHide()`
- `algonaut.getInkeyClientSdk()`
  - which returns the `inkey-client-js` instance

</details>


<details>
<summary><h3>🔋 ex: reconnect ↕</h3></summary>

if your dapp wants to recall previously connected accounts from localstorage, it is recommended to call this on page load:
```ts
algonaut.reconnect();
```
</details>


<details>
<summary><h3>👀 ex: watch account changes ↕</h3></summary>

You can subscribe to account changes like so:
```ts
import { subscribeToAccountChanges } from '@thencc/algonautjs';

const unsubscribe = subscribeToAccountChanges(
  (acct) => {
    if (acct) {
      // authenticated
      console.log(acct.address);
    } else {
      // un-authenticated
    }
  }
);

// + can unsubscribe
unsubscribe();
```
</details>



## Submitting Transactions

Submitting/sending transactions is common practice on a dapp and algonautjs makes it simple! `algonaut.sendTransaction()` signs and submits the incoming single txn or array of txns (atomic txn). A powerful feature of the Algorand chain is the ability to group transactions together and run them as one [atomic transactions](https://developer.algorand.org/docs/get-details/atomic_transfers/).

single txn send:
```js
// construct txn
const txn = await algonaut.atomicSendAlgo({
  amount: 1000, // micro-algos
  to: receiverAddr,
  from: senderAddr // .from needed IF algonaut isnt authenticated and doesnt have this.account populated
});
console.log('txn', txn);

// sign + submit txn
let txnRes = await algonaut.sendTransaction(txn);
console.log('txnRes', txnRes);
```


atomic txn example:
```js
// the logic in the 2nd txn's smart contract requires that the first txn in this atomic transaction is a payment txn to a specific address in order for the second txn to succeed.
// - to interact w app/smart contracts you must include the app id in the optionalFields.applications array.
// - similarly, to interact w any asset, the asset id must by included in the optionalFields.assets array.
const txnStatus = await algonaut.sendTransaction([
  await algonaut.atomicSendAlgo({ to: appAddress, amount: 250000 }),
  await algonaut.atomicCallApp({
    appIndex: appIndex,
    appArgs: ['get_bananas'],
    optionalFields: { applications: [ bananaPriceTicker ] , assets: [ bananaAsaIndex ]
  })
]);
// .sendTransaction will return the await once the txn is confirmed (successfully committed to algo chain state)

// CALLBACKS: you can also get more specific callbacks by passing a 2nd arg to .sendTxn() like so:
algonaut.sendTransaction( txnArr , {
  onSign: (e) => {
    //
  },
  onSend: (e) => {
    //
  },
  onConfirm: (e) => {
    //
  }
})
```

## Sign Transactions (without submitting)

```ts
// make some txn(s)
const txn1 = await algonaut.atomicSendAlgo({
  amount: 1000,
  to: 'ADWTH6AP6EVAS3PD4JZCYRG26ZLZLC5CSK5QIXD4OHPDKVZE5AEDOIKBBU'
});
const txn2 = await algonaut.atomicOptInAsset(10458941);

// prompts user for txn approval in wallet ui
const signedTxns = await algonaut.signTransactions([
  txn1,
  txn2,
]);
// NOTE: signedTxns is an array of Uint8Array's (raw algo txn bytes)

// you can then submit these raw txns like so:
const txnGroup = await algonaut.algodClient.sendRawTransaction(signedTxns).do();
console.log('tx id: ', txnGroup.txId);
```


## Set Algorand Node

algonaut ships w a default testnet node pre-configured and enabled but feel free to change it. here's how:

```ts
// testnet
const algonaut = new Algonaut();
algonaut.setNodeConfig('testnet');

// mainnet
const algonaut = new Algonaut();
algonaut.setNodeConfig('mainnet');

// custom node (on init)
const algonaut = new Algonaut({
  nodeConfig: {
    BASE_SERVER: 'https://testnet-algorand.api.purestake.io/ps2',
    // key is header, value is token
    API_TOKEN: { 'X-API-Key': 'INSERT_KEY_HERE' }, 
    LEDGER: 'TestNet',
    PORT: ''
  }
});

// custom node (after init)
algonaut.setNodeConfig({
  BASE_SERVER: 'https://mainnet-algorand.api.purestake.io/ps2',
  API_TOKEN: { 'X-API-Key': 'INSERT_KEY_HERE' },
  LEDGER: 'MainNet',
  PORT: ''
});
```

## Deploying Smart Contracts

In case you want to, Algonaut can deploy a smart contract to the current network using TEAL approval + clear code.
Use the `createApp` method to do this like so:

```js
const createAppArgs = {
  tealApprovalCode: `#pragma 5 ...`,
  tealClearCode: `...`,
  appArgs: [],
  schema: {
    localInts: 4,
    localBytes: 12,
    globalInts: 1, // numbers
    globalBytes: 1, // strings
  }
};

const res = await algonaut.createApp(createAppArgs);
const appId = res.createdIndex; // now you can lookup this appId on any algo chain explorer (be sure to look on the matching net, testnet or mainnet)
```



## Interacting with Smart Contracts

Algorand smart contracts are fast, light, and super clean.  Trying to communicate their APIs across our team has been really hard.  For that reason, Algonaut.js supports a simple TypeScript descriptor for both Stateful and Stateless Smart contracts.  The goal is to be able to load this TypeScript descriptor into your dev envirnment and get a sense of what you can and can't do with a contract's API.

Even the concept of Stateless contracts will be a curve climb for a lot of front end people.  Our goal with this descriptor approach is to communicate a baseline of information about what transactions are permitted, expected, etc, without the front-end developer needing to go into the TEAL or PyTeal directly to figure this stuff out.

Here again we are trying to account for the 90% use case, not every possible case.  The goal is simplicity and ease of use, understanding that there will always be those complex cases where you have to go down to the metal.

FYI: the first app arg is often the method name, or required to be the method selector when interfacing w an ABI compliant smart contract.

```js
const response = await algonaut.callApp({
  appIndex: 123456789,
  appArgs: ['set_name', 'New Name']
});
 ```


## Testing

Unit tests are in `tests/algonaut.test.ts` and implemented with Jest.

1. Copy the .env.sample file and replace the values with your node configuration, and a test account mnemonic that is funded with ALGO.
2. Run `npm run test`

Integration tests are also available. Please make sure all tests pass before submitting a pull request! See [./tests/README.md](./tests/README.md) for more details.


## Contributing

### To generate docs:

```npm run docs```

[Typedoc options](https://typedoc.org/guides/options/) are set in `typedoc.json`.

---
### Publishing to NPM:

[ *latest/release* ]
stable releases have the default npm tag of `latest` (installable via `npm i @thencc/algonautjs` or `npm i @thencc/algonautjs@latest`) and are automatically published from the repo's `release` branch via a Github Action. so simply pull request the `main` branch (or feature specific branch) into `release` to publish to npm.

[ *beta/main* ]
similarly, pushing commits or merging pull requests to the repo's `main` branch will automatically publish to the npm `beta` release installable via `npm i @thencc/algonautjs@beta`.

> note: to update either the `latest` or `beta` releases, the version in `package.json` must be higher than the previous release.


---

TBD:

- setting up a dev env
- ESLint and code style
- building and testing with Vite and Node
