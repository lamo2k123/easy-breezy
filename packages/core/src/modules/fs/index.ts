import { dirname } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync, statSync } from 'fs';
import { createHash } from 'crypto';

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

    private createSignature = (data: string) => {
        if(data) {
            const hash = createHash('sha256').update(data, 'utf8');

            return hash.digest('hex');
        }
    }

    private getSignature = (data: string) => {
        const result = /\/\/ Signature: ([a-z\d]+)$/gm.exec(data);

        return result?.[1];
    }

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

    private write = (path: string, data: string, sign = false) => {
        let payload = data;

        if(sign && !path.endsWith('.json')) {
            const signature = this.createSignature(data);

            payload = `// Signature: ${signature}\n${payload}`;
        }

        writeFileSync(path, payload, {
            encoding: 'utf8'
        });
    };

    public createFile = (path: string, data: string, sign?: boolean) => {
        const existsFile = this.exists(path);

        if(!existsFile) {
            this.createDir(path);

            this.write(path, data, sign);

            this.operations.created.push(path);

            output.info(i18n.t('core.fs.create.file', { path }));
        }

        return existsFile;
    }

    public updateFile = (path: string, data: string, sign?: boolean) => {
        if(this.createFile(path, data, sign)) {
            const file = this.readFile(path);

            if(file !== data) {
                if(sign) {
                    const signature = this.createSignature(data);

                    if(this.getSignature(file) === signature) {
                        return;
                    }
                }

                this.write(path, data, sign);

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

    public readdirSync = readdirSync;

    public statSync = statSync;
}

export default new FS();
