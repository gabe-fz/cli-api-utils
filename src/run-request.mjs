#!/usr/bin/env zx
import {HOME, GENERATED_DIR, CURRENT_ENV_FILE, COLLECTIONS_DIR, renderTemplate, recursiveResolveTemplating,
     readFileToString, readFileToObj, writeObjToFile, groupBy} from './modules/common.mjs';
const path = require("path");

$.verbose = false;

//  input
const requestFilePath = path.resolve(process.argv[3]);

// extract collection id from file path

const collections = ((await $`ls ${COLLECTIONS_DIR}`).stdout.trim()).split("\n");
const collection = requestFilePath.replace(COLLECTIONS_DIR, '').split('/')[1];
if (!collection || !collections.includes(collection))
    throw 'Could not determine collection from file'

// read current env for collection
let currentEnvs = await readFileToObj(CURRENT_ENV_FILE, {});
let env = {};
if (currentEnvs[collection])
    env = await readFileToObj(currentEnvs[collection].generatedEnvFilePath, {});

// read & render request using environment
const requestFileObj = renderTemplate(requestFilePath, env);
if (requestFileObj.body)
    requestFileObj.body = JSON.stringify(requestFileObj.body);

// send request

const response = await fetch(requestFileObj.url, requestFileObj);
const data = await response.json();
console.log(response.ok);
console.log(response.status);
console.log(response.statusText);
console.log(response.headers.raw());
console.log(JSON.stringify(data, null, 2));