export class VLabError extends Error {
    type: string
    errMsg: string
    constructor(type: string, errMsg: string) {
        super(`${type}: ${errMsg}`);
        this.type = type;
        this.errMsg = errMsg;
        this.name = VLabError.name;
    }
}

export function getErrorMessage(error: unknown) {
    if (error instanceof VLabError) return error.errMsg;
    if (error instanceof Error) return error.message;
    return String(error)
}