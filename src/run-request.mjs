#!/usr/bin/env zx
import {
    ROOT, OUTPUT_DIR, CURRENT_ENV_FILE, COLLECTIONS_DIR, renderTemplate, recursiveResolveTemplating,
    readFileToString, readFileToObj, writeObjToFile, groupBy
} from './modules/common.mjs';
const path = require("path");

$.verbose = false;

await runRequest();

async function runRequest() {

    //  input
    const requestFilePath = path.resolve(process.argv[3]);

    // extract collection id from file path
    const collection = await getCollectionNameFromFile(requestFilePath);
    if (!collection)
        return;
    
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

}

async function getCollectionNameFromFile(requestFilePath) {
    const collections = ((await $`ls ${COLLECTIONS_DIR}`).stdout.trim()).split("\n");
    const pathArray = requestFilePath.replace(COLLECTIONS_DIR, '').split('/');

    for(var i = 0; i < pathArray.length; i++){
        if (pathArray[i] === "collections" && i + 1 <= pathArray.length) {
            collection = pathArray[i+1];
            break;
        }
    }

    if (!collection || !collections.includes(collection))
        console.log(chalk.red(`could not determine collection from file path`));

    return collection;

}