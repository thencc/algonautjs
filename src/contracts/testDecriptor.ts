/*

  Hey, what if our API descriptor was just in TS and not JSON?

  here is whaat stubs might look like, i kind of like this!

  in the real world, we might want index.ts to export the base
  contracts which people could extend in user space?

*/

import StatefulContract from './StatefulContract';

export class TestContract extends StatefulContract {


	// in this case, setSomeValue is arg0, all args are the REST of the args
	// this hangs a lot on the convention of contract branching on arg0 but
	// we have to have some kind of port in the storm, right?
	setSomeValue(_valueToSet: string) {

	}



}