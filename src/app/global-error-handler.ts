import { Injectable, ErrorHandler } from "@angular/core";
import { ApiLogger } from "./shared/api-logger";

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
    constructor(
        private _logger: ApiLogger
    ) {}

    handleError(error: any) {
        this._logger.error("global-error-handler.ts->handleError()", error);
    }
}