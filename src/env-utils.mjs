#!/usr/bin/env zx

import {HOME, recursiveResolveTemplating, readFileToString, readFileToObj,
    writeObjToFile, groupBy} from './modules/common.mjs';

$.verbose = false;
let selectedCollection = process.argv[3];
let selectedEnvId = process.argv[4];

const COLLECTIONS_DIR = `${HOME}/collections`

// let user pick collection
let collections = ((await $`ls ${COLLECTIONS_DIR}`).stdout.trim()).split("\n");
if (!selectedCollection) {
    console.log(collections);
    selectedCollection = await question(chalk.blue('Choose collection (tab completion on): '), {
        choices: collections
    });
}

if (!collections.includes(selectedCollection)) {
    throw 'Picked collection does not exist';
}

const ENV_MASTER_FILE = 'env-master.json';
const ENV_DIR = `${HOME}/collections/${selectedCollection}/envs`;
const GENERATED_DIR = `${HOME}/src/generated`;
const RENDERED_ENV_DIR = `${GENERATED_DIR}/rendered-env/${selectedCollection}`;
await $`mkdir -p ${RENDERED_ENV_DIR}`;

// let user pick env from master list
const envs = await readFileToObj(`${ENV_DIR}/${ENV_MASTER_FILE}`, {})
const envsById = groupBy(envs, x => x.id);
const allIds = Array.from(envsById.keys());
if (!selectedEnvId) {
    console.log(allIds);
    selectedEnvId = await question(chalk.blue('Choose env (tab completion on): '), {
        choices: allIds
    });
}

if (!allIds.includes(selectedEnvId)) {
    throw 'Picked environment does not exist';
}
const selectedEnv = envsById.get(selectedEnvId);
const selectedEnvFilePath = `${ENV_DIR}/${selectedEnv.file}`;

if (selectedEnv.script) {
    const scriptFilePath = `${ENV_DIR}/${selectedEnv.script}`;
    const scriptCall = `${scriptFilePath} ${selectedEnv["script-input"].join(" ")} ${selectedEnvFilePath}`
    await $`${HOME}/src/zx-call.sh ${scriptCall}`
}

// write environment contents to disk
const env = JSON.parse(recursiveResolveTemplating(await readFileToString(selectedEnvFilePath, "")));
const generatedEnvFilePath = `${RENDERED_ENV_DIR}/${selectedEnvId}.json`;
await writeObjToFile(generatedEnvFilePath, env);

// write current env to disk
const CURRENT_ENV_FILE = `${GENERATED_DIR}/current-envs.json`;
const currentEnv = await readFileToObj(CURRENT_ENV_FILE, {});
(currentEnv[selectedCollection] ??= {}).selectedEnv = selectedEnv.id;
currentEnv[selectedCollection].generatedEnvFilePath = generatedEnvFilePath;
await writeObjToFile(CURRENT_ENV_FILE, currentEnv);

console.log(chalk.green(`selected collection: `)+chalk.yellow(selectedCollection));
console.log(chalk.green(`selected env: `)+chalk.yellow(selectedEnvId));
console.log(chalk.green(`rendered file: `)+chalk.yellow(generatedEnvFilePath));