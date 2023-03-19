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
}

export default new Output();
