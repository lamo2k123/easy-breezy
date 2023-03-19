import { dirname, join } from 'path';
import { statSync } from 'fs';

import { ESLint } from 'eslint';
import { IPluginProps } from '@easy-breezy/core';

export default async ({ i18n, config, fs, output, colors, args }: IPluginProps) => {
    const operations = fs.getOperations();
    const options = config.get();
    const patterns = Object.keys(options);

    const paths = new Set([...operations.created, ...operations.changed]);
    const files = [...paths].filter((path) => statSync(path).isFile());

    if(patterns.length) {
        for(const pattern of patterns) {
            const eslint = new ESLint(options[pattern]);

            const results = await eslint.lintFiles(files.map((file) => join(dirname(file), pattern)));
            // console.log(123, results.map(({ messages }) => messages))
        }
    }
}
