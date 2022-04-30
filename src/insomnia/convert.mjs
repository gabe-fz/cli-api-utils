#!/usr/bin/env zx
import {
    OUTPUT_DIR_NAME, readFileToObj, writeObjToFile, groupBy, union
} from '../modules/common.mjs';

$.verbose = false;

// arguments
const args = require('yargs/yargs')(process.argv.slice(3))
    .option('source', {
        alias: 's',
        demandOption: true,
        description: 'Source file to convert',
        type: 'string'
    })
    .help()
    .alias('help', 'h').argv;
let sourceFile = path.resolve(args.s);
const INSOMNIA_OUTPUT_DIR = `${__dirname.split("/").slice(0, -2).join("/")}/${OUTPUT_DIR_NAME}/insomnia`
console.log(chalk.magenta(`input: `) + chalk.cyan(`sourceFile: ${sourceFile}`));

await runConversion();

async function runConversion() {


    const sourceObj = await readFileToObj(sourceFile, {});
    const resources = sourceObj.resources;
    const requestGroups = resources.filter(isRequestGroup);
    const requestGroupsById = groupBy(requestGroups, requestGroup => requestGroup._id);
    const folderNames = requestGroups
        .map(requestGroup => requestGroupToFolderName(requestGroup, requestGroupsById));
    const foldersById = groupBy(folderNames, folder => folder.id);
    const requests = resources.filter(isRequest);
    const convertedRequests = requests.map(request => convertRequest(request, foldersById));
    const result = await Promise.all(convertedRequests.map(writeConvertedRequest));
    console.log(result);
}

function requestGroupToFolderName(requestGroup, requestGroupsById) {
    const id = requestGroup._id;
    const parentId = requestGroup.parentId;
    let name = requestGroup.name.replace("/", "-").replace(/\s+/g, '');
    if (parentId.includes('fld')) {
        const parent = requestGroupsById.get(parentId);
        name = `${parent.name.replace("/", "-").replace(/\s+/g, '')}/${name}`
    }
    return { id, name };
}

function isRequestGroup(resource) {
    return resource._type === 'request_group'
}

function isRequest(resource) {
    return resource._type === 'request'
}

function convertRequest(request, foldersById) {

    const folderName = foldersById.get(request.parentId).name;
    const requestName = request.name.replaceAll("/", "-").replaceAll(">>", "-");
    const fileName = `${folderName}/${requestName}.json`
    const url = request.url.replace(/\s+/g, '');
    const headers = request.headers && request.headers.length != 0 ?
        request.headers
            .map(convertHeader)
            .reduce(union)
        : {};
    const body = request.body && Object.keys(request.body).length != 0 ?
        request.body.mimeType.includes('json') ?
            request.body.text ?
                JSON.parse(request.body.text)
                : {}
            : request.body.text
        : {};
    const parameters = request.parameters && request.parameters.length != 0 ?
        request.parameters
            .map(convertParameter)
            .reduce(union)
        : {};

    return {
        fileName,
        url,
        headers,
        parameters,
        body
    }
}

function convertParameter(insomniaParameter) {
    const name = insomniaParameter.name;
    const value = insomniaParameter.value
    return { name, value };
}

function convertHeader(insomniaHeader) {
    return {
        [insomniaHeader.name]: insomniaHeader.value
    };
}

async function writeConvertedRequest(request) {
    const filePath = `${INSOMNIA_OUTPUT_DIR}/${request.fileName}`
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    delete request.fileName;
    await writeObjToFile(filePath, request);
    return filePath;
}