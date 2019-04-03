#!/usr/bin/env node
const cli = require("./cli.js");
const fs = require("fs");

cli(fs, process.argv);
