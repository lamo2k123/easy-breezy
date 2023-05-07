import { dirname, join } from 'path';
import { statSync } from 'fs';

import { simpleGit, StatusResult } from 'simple-git';
import { IPluginProps } from '@easy-breezy/core';

import ru from './locales/ru.json' assert { type: "json" };
import en from './locales/en.json' assert { type: "json" };
import enquirer from 'enquirer';

export default async ({ i18n, config, fs, output, colors, args }: IPluginProps) => {
    i18n.addResource('ru', ru);
    i18n.addResource('en', en);

    const operations = fs.getOperations();
    const options = config.get();

    if(options.add && operations.created.length) {
        let yes = true;

        if(options.add === 'manual') {
            const { confirm } = await enquirer.prompt<{ confirm: boolean }>([{
                type   : 'confirm',
                name   : 'confirm',
                initial: yes,
                message: i18n.t('add', {
                    count: operations.created.length
                })
            }]);

            yes = confirm;
        }

        if(yes) {
            try {
                const git = simpleGit();
                const status = await git.status() as StatusResult;

                const list = operations.created.filter((file) => status.not_added.includes(file));

                await git.add(list);

                output.success(i18n.t('added', {
                    count: operations.created.length
                }));
            } catch(error) {
                output.warn(i18n.t('git-not-found'));
            }
        }
    }
}
