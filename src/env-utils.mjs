#!/usr/bin/env zx

import {
    getEnvsDir, ROOT, OUTPUT_DIR, ACTIVE_ENV_FILE, getActiveEnvMetaData, recursiveResolveTemplating, readFileToString, readFileToObj,
    writeObjToFile, groupBy
} from './modules/common.mjs';

$.verbose = false;

// arguments
const args = require('yargs/yargs')(process.argv.slice(3))
    .option('environment', {
        alias: 'e',
        demandOption: false,
        description: 'Environment to set',
        type: 'string'
    })
    .option('task', {
        alias: 't',
        description: 'Which task to perform',
        default: 'list',
        type: 'string',
        choices: ['list', 'get', 'set', 'refresh']
    })
    .help()
    .alias('help', 'h').argv;
let environmentId = args.e;
const task = args.t;
console.log(chalk.magenta(`input: `)+chalk.cyan(`environment: ${environmentId} | task : ${task}`));

export const ENVS_DIR = await getEnvsDir();
export const ENV_MASTER_FILE = `${ENVS_DIR}/env-master.json`;

switch (task) {
    case 'list':
        await listEnvs();
        break;
    case 'get':
        console.log((await getActiveEnvMetaData()).active);
        break;
    case 'set':
        await setEnv();
        break;
    case 'refresh':
        await refreshActiveEnv();
        break;
}

async function listEnvs() {
    console.log(getAllEnvIds(await getAllEnvMetaDataById()));
}

async function getAllEnvMetaDataById() {
    const envs = await readFileToObj(ENV_MASTER_FILE, {});
    return groupBy(envs, x => x.id);
}

function getAllEnvIds(envMetaDataById) {
    return Array.from(envMetaDataById.keys());
}

async function setEnv() {

    const renderedEnvDir = `${OUTPUT_DIR}/rendered-env`;
    await $`mkdir -p ${renderedEnvDir}`;

    const allEnvMetaDataById = await getAllEnvMetaDataById();

    // validate input
    const allEnvIds = getAllEnvIds(allEnvMetaDataById);
    if (!environmentId) {
        console.log(chalk.red(`must pass in an environment to set it`));
        return;
    }
    if (!allEnvIds.includes(environmentId)) {
        console.log(chalk.red(`passed in environment [${environmentId}] is not valid`));
        console.log(chalk.yellow(`please use below as reference for valid input`));
        console.log(allEnvIds);
        return;
    }

    // get environment and run script if there is one

    const environment = allEnvMetaDataById.get(environmentId);
    const selectedEnvFilePath = `${ENVS_DIR}/${environment.file}`;

    if (environment.script) {
        const scriptFilePath = `${ENVS_DIR}/${environment.script}`;
        const scriptCall = `${scriptFilePath} ${environment["script-input"].join(" ")} ${selectedEnvFilePath}`
        await $`${ROOT}/src/zx-call.sh ${scriptCall}`
    }

    // write environment contents to disk
    const env = JSON.parse(recursiveResolveTemplating(await readFileToString(selectedEnvFilePath, "")));
    const generatedEnvFilePath = `${renderedEnvDir}/${environmentId}.json`;
    await writeObjToFile(generatedEnvFilePath, env);

    // write active env to disk
    const activeEnv = await getActiveEnvMetaData();
    (activeEnv ??= {}).active = environment.id;
    activeEnv.generatedEnvFilePath = generatedEnvFilePath;
    await writeObjToFile(ACTIVE_ENV_FILE, activeEnv);

    console.log(chalk.green(`active env: `)+chalk.yellow(environmentId));
    console.log(chalk.green(`file rendered: `)+chalk.yellow(generatedEnvFilePath));

}

async function refreshActiveEnv() {
    const activeEnvId = (await getActiveEnvMetaData()).active;

    if (!activeEnvId) {
        console.log(chalk.red(`there is no currently active environment to refresh\nuse 'set' instead`));
        return;
    }
        
    environmentId = activeEnvId;
    await setEnv();
}