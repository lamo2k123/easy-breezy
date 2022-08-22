#!/usr/bin/env node
import { join } from 'path';

import enquirer from 'enquirer';

import config from './modules/config/index.mjs';

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

const main = async () => {
    if(!config.exists) {
        await config.create();
    }

    const { generator } = await enquirer
        .prompt({
            type   : 'select',
            name   : 'generator',
            message: 'Что будем генерировать?',
            choices: [{
                name   : 'api',
                message: `API - Адаптер к API`
            }]
        })

    const { default: module } = await import(`./modules/${generator}/index.mjs`);

    await module.run();

    await config.save();
};

void main();
/*

const context = {
    args      : argv,
    answers   : {},
    actions   : {},
    config    : null,
    configPath: join(process.cwd(), argv.config || './.easy-breezy/config.json')
};

const main = async () => {


    const { generator } = await inquirer
        .prompt({
        type   : 'list',
        name   : 'generator',
        message: 'List of generators (@TODO: Correct message)',
        choices: plop.getGeneratorList().map((item) => ({
            name : `${item.name} - ${item.description}`,
            value: item.name
        }))
    });

    context.generator = plop.getGenerator(generator);
    context.answers = await context.generator.runPrompts();
    context.actions = await context.generator.runActions(context.answers);

    console.log(context);
};


*/
/*


const main = async () => {
    const plop = await nodePlop();

    if(!argv.config) {
        context.generator = (await import('./init/index.js')).default(plop, context);
    } else {
        (await import('./api/index.js')).default(plop);

        const { generator } = await inquirer
            .prompt<{ generator: string }>({
                type   : 'list',
                name   : 'generator',
                message: 'List of generators (@TODO: Correct message)',
                choices: plop.getGeneratorList().map((item) => ({
                    name : `${item.name} - ${item.description}`,
                    value: item.name
                }))
            });

        context.generator = plop.getGenerator(generator);
    }

    const currentAnswers = await context.generator.runPrompts();
    const t = await context.generator.runActions(currentAnswers);
    console.log(t);
    console.log(plop.renderString('psst {{type}}, change-me.txt already exists', t.failures[0]))
}

void main();
*/
