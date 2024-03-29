import colors from './../colors/index.js';

export class Output {

    public log = console.log;

    public info = (message: string, ...params: any) => {
        console.log(colors.paint(message, 'blue'), ...params);
    }

    public success = (message: string, ...params: any) => {
        console.log(colors.paint(message, 'green'), ...params);
    }

    public warn = (message: string, ...params: any) => {
        console.log(colors.paint(message, 'yellow'), ...params);
    }

    public error = (message: string, ...params: any) => {
        console.log(colors.paint(message, 'red'), ...params);
    }

    public bind = (ns?: string) => {
        const methods = ['info', 'success', 'warn', 'error'];

        return methods.reduce((accumulator, method) => {

            accumulator[method] = (message: string, ...params: any) => {
                if(ns) {
                    this[method as keyof Output](`[${ns}]: ${message}`, ...params);
                } else {
                    this[method as keyof Output](message, ...params);
                }
            };

            return accumulator;
        }, {} as Record<string, any>);
    }
}

export default new Output();
