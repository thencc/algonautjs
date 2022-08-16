# Testing AlgonautJS


## setup
- install [`taskfile`](https://taskfile.dev/installation/)
	- `brew install go-task/tap/go-task`
- install `dotenv` globally
	- `npm i -g dotenv`
- configure `.env`
	- set BASE_SERVER, API_TOKEN, etc


## run tests
1. `task prepare-tests`
	- installs test dir deps + links local instance of `@thencc/algonautjs`
2. `task tests`
	- FYI, there are many logs... but no errors in the console is a win


## import/require tests
`algonautjs` should work in all js/ts contexts. but to be sure, we automate the various types of initializations such as:
- node
	- javascript
		- `package.json` > type > `commonjs`
			- `./init-node-js-cjs`
		- `package.json` > type > `module`
			- `./init-node-js-esm`
	- typescript
		- `package.json` > type > `commonjs`
			- `./init-node-ts-cjs`
		- `package.json` > type > `module`
			- `./init-node-ts-esm`
- browser
	- js cdn (vanilla)
		- TODO
	- vue-js
		- TODO
	- vue-ts
		- TODO
	- react-ts
		- TODO
- skypack
	- typescript
		- TODO


## unit tests (TODO)
tests for algonautjs features include:
- `account-recover.js`
- `algo-bal.js`
- `algo-xfr.js`
- `asset-xfr.js`
- `asset-create.js`
- `app-call.js`
- `app-create.js`
- ...

TBD: use jest/mocha/chai for this


## notes
- ...
