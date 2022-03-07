#!/usr/bin/env zx

import {
    ROOT, COLLECTIONS_DIR, OUTPUT_DIR, recursiveResolveTemplating, readFileToString, readFileToObj,
    writeObjToFile
} from './modules/common.mjs';
import { getCollectionsAndEnvs, getCollectionsAndEnvIds } from './modules/args-collector.mjs';

$.verbose = false;

// arguments
const args = require('yargs/yargs')(process.argv.slice(3))
    .option('collection', {
        alias: 'c',
        demandOption: true,
        description: 'Collection of requests',
        type: 'string'
    })
    .option('environment', {
        alias: 'e',
        demandOption: true,
        description: 'Environment your requests should point to',
        type: 'string'
    })
    .option('task', {
        alias: 't',
        description: 'Which task to perform',
        default: 'set-env',
        type: 'string',
        choices: ['set-env']
    })
    .help()
    .alias('help', 'h').argv;

const collection = args.c;
const environmentId = args.e;
const task = args.t;
console.log(chalk.cyan(`collection: ${collection} | environment: ${environmentId} | task : ${task}`));

await setEnv();

async function setEnv() {

    const envDir = `${COLLECTIONS_DIR}/${collection}/envs`;
    const renderedEnvDir = `${OUTPUT_DIR}/rendered-env/${collection}`;
    await $`mkdir -p ${renderedEnvDir}`;

    const collectionsAndEnvs = await getCollectionsAndEnvs();

    // validate input
    const collectionsAndEnvIds = getCollectionsAndEnvIds(collectionsAndEnvs);
    const invalidArgs = [];
    if (!Object.keys(collectionsAndEnvIds).includes(collection))
        invalidArgs.push(`collection: ${collection}`)
    if (!collectionsAndEnvIds[collection] || !collectionsAndEnvIds[collection].includes(environmentId))
        invalidArgs.push(`environment: ${environmentId}`)
    if (invalidArgs.length > 0) {
        console.log(chalk.red(`following input is not valid`));
        console.log(invalidArgs);
        console.log(chalk.yellow(`please use below as reference for valid input`));
        console.log(collectionsAndEnvIds);
        return;
    }

    // get environment and run script if there is one

    console.log(collectionsAndEnvs);
    const environment = collectionsAndEnvs[collection].get(environmentId);
    const selectedEnvFilePath = `${envDir}/${environment.file}`;

    if (environment.script) {
        const scriptFilePath = `${envDir}/${environment.script}`;
        const scriptCall = `${scriptFilePath} ${environment["script-input"].join(" ")} ${selectedEnvFilePath}`
        await $`${ROOT}/src/zx-call.sh ${scriptCall}`
    }

    // write environment contents to disk

    const env = JSON.parse(recursiveResolveTemplating(await readFileToString(selectedEnvFilePath, "")));
    const generatedEnvFilePath = `${renderedEnvDir}/${environmentId}.json`;
    await writeObjToFile(generatedEnvFilePath, env);

    // write current env to disk
    const CURRENT_ENV_FILE = `${OUTPUT_DIR}/current-envs.json`;
    const currentEnv = await readFileToObj(CURRENT_ENV_FILE, {});
    (currentEnv[collection] ??= {}).selectedEnv = environment.id;
    currentEnv[collection].generatedEnvFilePath = generatedEnvFilePath;
    await writeObjToFile(CURRENT_ENV_FILE, currentEnv);

    console.log(chalk.green(`selected collection: `)+chalk.yellow(collection));
    console.log(chalk.green(`selected env: `)+chalk.yellow(environmentId));
    console.log(chalk.green(`rendered file: `)+chalk.yellow(generatedEnvFilePath));


}

