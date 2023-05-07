export const isObject = (value: unknown) => {
    return Object.prototype.toString.call(value) === '[object Object]';
}

export const isPlainObject = (value: any) => {
    if(!isObject(value)) {
        return false;
    }

    if(value.constructor === undefined) {
        return true;
    }

    if(
        !isObject(value.constructor.prototype) ||
        !value.constructor.prototype.hasOwnProperty('isPrototypeOf')
    ) {
        return false;
    }

    return true;
};