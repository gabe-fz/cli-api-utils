#!/usr/bin/env zx
import {
    HISTORY_DIR, getActiveEnvMetaData, renderTemplate, readFileToObj, writeObjToFile, groupBy, union
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
let sourceFile = `${process.env.PWD}/${args.s}`;
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
    const requests = resources.filter(isRequest).slice(0, 10);
    const convertedRequests = requests.map(request => convertRequest(request, foldersById));
    console.log(convertedRequests);

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

    // if (request.body && !request.body.mimeType)
    //     console.log(request);

    const folderName = foldersById.get(request.parentId).name;
    const fileName = `${folderName}/${request.name}.json`
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