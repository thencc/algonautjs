# Testing AlgonautJS


## setup
- install [`taskfile`](https://taskfile.dev/installation/)
	- `brew install go-task/tap/go-task`
- install `dotenv` globally
	- `npm i -g dotenv`
- configure `.env`
	- set NCC_BASE_SERVER, NCC_API_TOKEN, etc
	- FYI env vars need to have prefix `NCC_` to work w vite server
- prepare `algonautjs` pkg for local use
	- from repo root dir
	1. build
		- `npm run build`
	2. link
		- `npm run link`


## run tests
1. `task prepare-tests`
	- installs test dir deps + links local instance of `@thencc/algonautjs`
2. `task tests`
	- runs task called "tests" which runs all tasks defined in yaml
	- FYI, there are many logs... but no errors in the console is a win
	- list all tasks: `task --list`
	- run 1 specific test: `task TASK_NAME`

## testing import/require
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
