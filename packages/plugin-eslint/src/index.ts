import { dirname, join } from 'path';
import { statSync } from 'fs';

import { ESLint } from 'eslint';
import { IPluginProps } from '@easy-breezy/core';

import ru from './locales/ru.json' assert { type: "json" };
import en from './locales/en.json' assert { type: "json" };

export default async ({ i18n, config, fs, output, colors, args }: IPluginProps) => {
    i18n.addResource('ru', ru);
    i18n.addResource('en', en);

    const operations = fs.getOperations();
    const options = config.get();
    const patterns = Object.keys(options);

    const paths = new Set([...operations.created, ...operations.changed]);
    const files = [...paths].filter((path) => statSync(path).isFile());

    if(patterns.length) {
        for(const pattern of patterns) {
            const eslint = new ESLint(options[pattern]);

            output.info(i18n.t('progress', { count: files.length }));

            const results = await eslint.lintFiles(files.map((file) => join(dirname(file), pattern)));

            for(const result of results) {
                if(result.output && result.filePath) {
                    fs.updateFile(result.filePath, result.output);
                }
            }

            output.success(i18n.t('done'));
        }
    }
}
