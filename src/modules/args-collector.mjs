#!/usr/bin/env zx

import {ROOT, ENV_MASTER_FILE, readFileToObj, groupBy} from './common.mjs';

$.verbose = false;

export function getCollectionsAndEnvIds(collectionsAndEnvs) {
    return Object.keys(collectionsAndEnvs)
      .map(collection => collectionToEnvIds(collection, collectionsAndEnvs))
      .reduce(union);
}

function collectionToEnvIds(collection, collectionsAndEnvs) {
  return {[collection] : Array.from(collectionsAndEnvs[collection].keys())};
}

export async function getCollectionsAndEnvs() {
  const COLLECTIONS_DIR = `${ROOT}/collections`
  let collections = ((await $`ls ${COLLECTIONS_DIR}`).stdout.trim()).split("\n");
  let output = await Promise.all(collections.map(getEnvs));
  return output.reduce(union);
}

async function getEnvs(collection) {

  const envDir = `${ROOT}/collections/${collection}/envs`;
      const envs = await readFileToObj(`${envDir}/${ENV_MASTER_FILE}`, {});
      const envsById = groupBy(envs, x => x.id);
      const allIds = Array.from(envsById.keys());
      return { [collection] : envsById};
}

function union(a, b) {
  return { ...a, ...b };
}