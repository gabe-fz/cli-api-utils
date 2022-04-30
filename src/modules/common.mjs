#!/usr/bin/env zx

const nunjucks = require('nunjucks');

export const ROOT = __dirname.split("/").slice(0, -1).join("/");
export const OUTPUT_DIR_NAME = `output`;
export const OUTPUT_DIR = `${ROOT}/${OUTPUT_DIR_NAME}`;
export const ACTIVE_ENV_FILE = `${OUTPUT_DIR}/active-env.json`;
export const HISTORY_DIR = `${OUTPUT_DIR}/history`

// functional

export async function getEnvsDir() {
    const config = await getConfig();
    console.log(config);
    if (path.isAbsolute(config.envsDir))
        return path.resolve(config.envsDir);
    else
        return `${ROOT}/${config.envsDir}`
}

export async function getConfig() {
    return readFileToObj(`${ROOT}/config.json`, {});
}

export async function getActiveEnvMetaData() {
    return await readFileToObj(ACTIVE_ENV_FILE, {});
}

// templating

export async function renderTemplate(filePath, contextObj) {
    const fileString = await readFileToString(filePath, "{}");
    return JSON.parse(nunjucks.renderString(fileString, contextObj));
}

// nunchuk wrapper that allows to use the template itself as context
// TODO: make this more robust to support nontrivial templating (or find built in way)
export function recursiveResolveTemplating(s) {
    console.log
    if (!s.includes("{{"))
        return s;
    else
        return recursiveResolveTemplating(nunjucks.renderString(s, JSON.parse(s)));
}

// files

export async function readFileToString(filePath, defaultStr) {
    if (fs.existsSync(filePath))
        return (await fs.readFile(filePath)).toString();
    else
        return defaultStr;
}

export async function readFileToObj(filePath, defaultObj) {
    if (fs.existsSync(filePath))
        return JSON.parse((await fs.readFile(filePath)).toString());
    else
        return defaultObj;
}

export async function writeObjToFile(filePath, obj) {
    await fs.writeFile(filePath, JSON.stringify(obj, null, 4),
    err => {
        if (err) {
            console.error(chalk.red(`Error writing file: ${err}`));
            throw err;
        }
    });
}

// utils

export function groupBy(list, keyGetter) {
    const map = new Map();
    list.forEach(i => {
        const key = keyGetter(i);
        map.set(key, i);
    });
    return map;
}

export function union(a, b) {
    return { ...a, ...b };
  }