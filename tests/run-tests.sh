# library-less unit testing from the cmd line
# run:
# 	chmod +x run-test.sh
# 	./run-tests.sh

{ # try
    echo "starting..." &&
	echo "next thing" &&
	cd init-node-ts &&
	npm run test
    # save your output

} || { # catch
    # save log for exception
	echo "oops..."
}
