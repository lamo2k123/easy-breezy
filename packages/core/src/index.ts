#!/usr/bin/env node --no-warnings

import i18n from './modules/i18n/index.js';
import config from './modules/config/index.js';
import generator from './modules/generator/index.js';
import plugin from './modules/plugin/index.js';

export type { IGeneratorProps } from './modules/generator/index.js';
export type { IPluginProps } from './modules/plugin/index.js';

await i18n.run();
await config.run();
await generator.run();
await plugin.run();

await config.save();
