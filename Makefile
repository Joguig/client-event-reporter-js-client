.PHONY: clean setup build test serve dist

all: build

DIST_DIR=dist

SRC_DIR=src
DIST_DIR=dist
JSHINT=./node_modules/.bin/jshint
BABEL=./node_modules/.bin/babel src --plugins transform-es2015-modules-amd --presets es2015 --out-dir tmp
TESTEM=./node_modules/.bin/testem
BROCCOLI=./node_modules/.bin/broccoli

clean:
	@rm -rf $(DIST_DIR)

setup:
	npm install
	npm install -g phantomjs

build: clean jshint test
	$(BROCCOLI) build ${DIST_DIR}

dist:
	$(BROCCOLI) build ${DIST_DIR}

jshint:
	$(JSHINT) ${SRC_DIR}

babel:
	$(BABEL)

test:
	$(TESTEM) ci -p 7359

# Run these both to continuously execute tests while editing src files
watch-test:
	$(TESTEM)

watch-babel:
	$(BABEL) --watch
