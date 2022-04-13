export declare class VLabError extends Error {
    type: string;
    errMsg: string;
    constructor(type: string, errMsg: string);
}
export declare function getErrorMessage(error: unknown): string;
