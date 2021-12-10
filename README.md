# Algonaut.js

Algonaut.js is designed to be a front end developer friendly and browser friendly library to fascilitate intuitive transactions on the Algorand network.  Algorand is incredibly fast, powerful and secure, but it's early days and the tooling is still a little intense.

After working with the existing frameworks for a couple months, we decided to just create what we felt was missing!  Get in here and help!

THE GOAL OF THIS LIBRARY IS SIMPLICITY AND EASE OF USE for the front end crew.  This library aims to bring you closer to key concepts behind the mature transactional fiesta that is Algorand though ease of use.  If you need a robust contract creation and debugging environment, please take the wonderful Algo Builder for a spin!

## API Approach

We package, expose and depend on the JavaScript Algosdk.  It's there if you need it, but that API is pretty intense for day-to-day use.  With Algonaut.js, you can run one-off transactions with a vastly simplified API as compared to transacting with the Algosdk directly.  We're trying to solve for the 90% cases and ask you to dive into the hard stuff only if you actually need to use it.

To create an instance with a node and get ready to transact:

```
import AlgonautJS from 'algonautjs';

const algonaut = new AlgonautJS({
  BASE_SERVER: 'https://testnet-algorand.api.purestake.io/ps2',
  LEDGER: 'TestNet',
  PORT: '',
  API_TOKEN: { 'X-API-Key': 'MY_KEY_HERE' }
});

algonaut.recoverAccount(a_mnemonic_phrase);

```

## Atomic Transactions

One of the most powerful aspects of the Algorand chain is the ability to group transactions together and run them as one.  The API for this is, again, pretty hard to folow for your average FED.  With Algonaut.js, the aim is to make using this incredibly powerful API simple and intuitive:

```
// this transaction must pay and and then make a request to an Algorand Smart Contract in one transaction.
// It must also include the asset index in the "assets" arg and an app index in the applications arg
const status = await algonaut.sendAtomicTransaction([
  await algonaut.atomicPayment(appAddress, 250000),
  await algonaut.atomicCallApp(appIndex, ['get_bananas'], { applications: [ bananaPriceTicker ] , assets: [ bananaAsaIndex ] })
])

```

## Interacting with Smart Contracts

Algorand smart contracts are fast, light, and super clean.  Trying to communicate their APIs across our team has been really hard.  For that reason, Algonaut.js supports a simple TypeScript descriptor for both Stateful and Stateless Smart contracts.  The goal is to be able to load this TypeScript descriptor into your dev envirnment and get a sense of what you can and can't do with a contract's API.

Even the concept of Stateless contracts will be a curve climb for a lot of front end people.  Our goal with this descriptor approach is to communicate a baseline of information about what transactions are permitted, expected, etc, without the front-end developer needing to go into the TEAL or PyTeal directly to figure this stuff out.

Here again we are trying to account for the 90% use case, not every possible case.  The goal is simplicity and ease of use, understanding that there will always be those complex cases where you have to go down to the metal.

``` i'm a Stateful and Stateless contract descriptor example ```

## Installation

To install from NPM do

```npm install algonaut.js --save```

You can then

Algonaut.js also supports use in a Node runtime (e.g. you can use it with the algob script to emulate what browser APIs might look like).  To do this, requore the CJS package like this

```const { default: AlgonautJS } = require('algonaut.js/dist/cjs');```

and then use the librarys APIs the same way you do on the front end.




## Contributing

TBD:

- setting up a dev env
- ESLint and code style
- building and testing with Vite and Node