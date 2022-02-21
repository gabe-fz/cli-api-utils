#!/usr/bin/env zx

const nunjucks = require('nunjucks');


export const HOME = __dirname.split("/").slice(0, -1).join("/");
export const GENERATED_DIR = `${HOME}/src/generated`;
export const CURRENT_ENV_FILE = `${GENERATED_DIR}/current-envs.json`;
export const COLLECTIONS_DIR = `${HOME}/collections`;

nunjucks.configure(HOME);

// templating

export function renderTemplate(filePath, contextObj) {
    return JSON.parse(nunjucks.render(filePath, contextObj));
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