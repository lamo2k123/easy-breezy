import { dirname } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs';

import output from './../output/index.js';
import i18n from './../i18n/index.js';

export class FS {

    private operations: Record<'created' | 'changed' | 'removed' | 'read' | 'exists', Array<string>> = {
        exists : [],
        read   : [],
        created: [],
        changed: [],
        removed: []
    };

    public getOperations = () => {
        return this.operations;
    };

    public createDir = (path: string) => {
        const dir = dirname(path);

        if(!this.exists(dir)) {
            mkdirSync(dir, {
                recursive: true
            });

            this.operations.created.push(dir);

            output.info(i18n.t('core.fs.create.dir', { path: dir }));
        }
    }

    public createFile = (path: string, data: string) => {
        const existsFile = this.exists(path);

        if(!existsFile) {
            this.createDir(path);

            writeFileSync(path, data, {
                encoding: 'utf8'
            });

            this.operations.created.push(path);

            output.info(i18n.t('core.fs.create.file', { path }));
        }

        return existsFile;
    }

    public updateFile = (path: string, data: string) => {
        if(this.createFile(path, data)) {
            const file = this.readFile(path);

            if(file !== data) {
                writeFileSync(path, data, {
                    encoding: 'utf8'
                });

                this.operations.changed.push(path);

                output.info(i18n.t('core.fs.create.update', { path }));
            }
        }
    }

    public readFile = (path: string) => {
        this.operations.read.push(path);

        return readFileSync(path, {
            encoding: 'utf8'
        });
    }

    public exists = (path: string) => {
        this.operations.exists.push(path);

        return existsSync(path);
    }

    public remove = (path: string) => {
        rmSync(path, {
            force    : true,
            recursive: true
        });

        this.operations.removed.push(path);
    }
}

export default new FS();
