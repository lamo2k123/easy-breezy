import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';

import handlebars from 'handlebars';

import output from '../output/index.mjs';

class FileSystem {

    static __filename = fileURLToPath(import.meta.url);
    static __dirname = dirname(FileSystem.__filename);

    #headerTemplate(payload) {
        const path = join(FileSystem.__dirname, 'templates/signature.hbs');
        const file = readFileSync(path, {
            encoding: 'utf8'
        });

        return handlebars.compile(file)(payload);
    }

    #createSignature(data) {
        if(data) {
            const hash = createHash('sha256').update(data, 'utf8');

            return hash.digest('hex');
        }
    }

    #getSignature(data) {
        const result = /Signature: ([a-z\d]+)$/gm.exec(data);

        return result?.[1];
    }

    createDir(path) {
        const dir = dirname(path);

        if(!existsSync(dir)) {
            mkdirSync(dir, {
                recursive: true
            });

            output.info(`Создана директория: ${dir}`);
        }
    }

    writeFile(path, data) {
        writeFileSync(path, data, {
            encoding: 'utf8'
        });
    }

    createFile(path, data) {
        const existsFile = existsSync(path);

        if(!existsFile) {
            this.createDir(path);
            this.writeFile(path, data);

            output.info(`Создан файл: ${path}`);
        }

        return existsFile;
    }

    createOrUpdate(path, data, options = {}) {
        const signature = this.#createSignature(data);

        if(options.signature) {
            data = this.#headerTemplate({
                signature,
                data
            });
        }

        if(this.createFile(path, data)) {
            const file = readFileSync(path, {
                encoding: 'utf8'
            });

            if(options.signature) {
                if(this.#getSignature(file) !== signature) {
                    this.writeFile(path, data);

                    output.info(`Обновлен файл: ${path}`);
                }
            } else {
                if(file !== data) {
                    this.writeFile(path, data);

                    output.info(`Обновлен файл: ${path}`);
                }
            }
        }
    }
}

export default new FileSystem();
