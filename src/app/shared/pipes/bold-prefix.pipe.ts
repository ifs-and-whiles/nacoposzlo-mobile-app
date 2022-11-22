import {Injectable, PipeTransform, Pipe} from '@angular/core';
import { ApiLogger } from '../api-logger';

@Pipe({
  name: 'boldprefix'
})
@Injectable()
export class BoldPrefixPipe implements PipeTransform {

    constructor(private _logger: ApiLogger) {

    }

  transform(value:string, keyword:string):any {
    if (!keyword) {
      return value;
    }
    
    var escaped_keyword = this.escapeKeyword(keyword);

    try {
        return value.replace(
            new RegExp(escaped_keyword, 'i'), 

            function(str) { 
              return str.bold(); 
            }
        );
    } catch (error) {
        this._logger.error("bold-prefix.pipe.ts->transform()", error);        
        return value;
    }    
  }

  private escapeKeyword(keyword: string) {
    var specials = [
        // order matters for these
        "-"
        , "["
        , "]"
        // order doesn't matter for any of these
        , "/"
        , "{"
        , "}"
        , "("
        , ")"
        , "*"
        , "+"
        , "?"
        , "."
        , "\\"
        , "^"
        , "$"
        , "|"
    ];
    
    var regex = RegExp('[' + specials.join('\\') + ']', 'g');

    return keyword.replace(regex, "\\$&");
  }
}