#!/usr/bin/env zx

import { getCollectionsAndEnvs, getCollectionsAndEnvIds } from './modules/args-collector.mjs';

$.verbose = false;

console.log(getCollectionsAndEnvIds(await getCollectionsAndEnvs()));