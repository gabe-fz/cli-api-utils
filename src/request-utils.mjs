#!/usr/bin/env zx
import {
    HISTORY_DIR , getActiveEnvMetaData, renderTemplate, recursiveResolveTemplating,
    readFileToString, readFileToObj, writeObjToFile, groupBy
} from './modules/common.mjs';
const path = require("path");

$.verbose = false;

// arguments
const args = require('yargs/yargs')(process.argv.slice(3))
    .option('request', {
        alias: 'r',
        demandOption: true,
        description: 'Request file to run',
        type: 'string'
    })
    .option('task', {
        alias: 't',
        description: 'Which task to perform',
        default: 'run',
        type: 'string',
        choices: ['run']
    })
    .help()
    .alias('help', 'h').argv;
let requestFile = args.r;
const task = args.t;
// console.log(chalk.magenta(`input: `)+chalk.cyan(`requestFile: ${requestFile} | task : ${task}`));

switch (task) {
    case 'run':
        runRequest();
        break;
}

async function runRequest() {

    // read active environment for templating
    let env = {};
    const activeEnvMetaData = await getActiveEnvMetaData();
    if (activeEnvMetaData && activeEnvMetaData.generatedEnvFilePath) {
        env = await readFileToObj(activeEnvMetaData.generatedEnvFilePath, {});
    }

    // read & render request using environment
    const requestFileObj = renderTemplate(requestFile, env);
    if (requestFileObj.body)
        requestFileObj.body = JSON.stringify(requestFileObj.body);

    // send request

    const response = await fetch(requestFileObj.url, requestFileObj);
    const data = await response.json();
    const compositeResponse = {
        "status" : `${response.status} ${response.statusText}`,
        "headers" : response.headers.raw(),
        "body" : data
    }

    const writtenHistoryFilePath = await saveResponseToHistory(compositeResponse);
    console.log(JSON.stringify(compositeResponse, null, 2));

}

async function saveResponseToHistory(response) {
    const responseHistoryPath = path.resolve(requestFile)
    .replace(".json","")
    .replaceAll("/", ".")
    .substring(1);
    const responseHistoryDir = `${HISTORY_DIR}/${responseHistoryPath}`
    await $`mkdir -p ${responseHistoryDir}`
    const responseHistoryFileName = + new Date();
    const responseHistoryFilePath = `${responseHistoryDir}/${responseHistoryFileName}.json`
    await writeObjToFile(responseHistoryFilePath, response);
    return responseHistoryFilePath;
}