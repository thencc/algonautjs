
var fs = require('fs');
var buildFile = 'dist/cjs/index.js';
fs.readFile(buildFile, 'utf8', function (err, data) {
	if (err) {
		return console.log(err);
	}
	var result = data.replace(/algosdk\/dist\/browser\/algosdk.min/g, 'algosdk');

	fs.writeFile(buildFile, result, 'utf8', function (err) {
		if (err) return console.log(err);
	});
});