"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getErrorMessage = exports.VLabError = void 0;
class VLabError extends Error {
    constructor(type, errMsg) {
        super(`${type}: ${errMsg}`);
        this.type = type;
        this.errMsg = errMsg;
        this.name = VLabError.name;
    }
}
exports.VLabError = VLabError;
function getErrorMessage(error) {
    if (error instanceof VLabError)
        return error.errMsg;
    if (error instanceof Error)
        return error.message;
    return String(error);
}
exports.getErrorMessage = getErrorMessage;
