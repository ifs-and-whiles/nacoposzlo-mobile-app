export class StringUtils {
    public static lettersOf(str: string): string[] {
        const letters = [];

        for (let index = 0; index < str.length; index++) {
            letters.push(str[index]);            
        }

        return letters;
    }

    public static parseNumber(str: string | null): number {
        if(str == null) return null;
        const string = str.toString();

        return Number(parseFloat(string.replace(',','.')));
    }

    public static tryParseNumber(str: string): number | string {
        const parsed = this.parseNumber(str);

        if(isNaN(parsed)) return str;
        return parsed;
    }

    public static asNumber(str: string): null | number {
        const parsed = this.parseNumber(str);
        
        if(isNaN(parsed)) return null;
        return parsed;
    }

    public static areArraysEqual(first: string[], second: string[]) {
        if(!first && !second) return true;
        if(!first || !second) return false;
        if(first.length != second.length) return false;

        for (let index = 0; index < first.length; index++) {
            if(first[index] != second[index]) {
                return false;
            }
        }

        return true;
    }

    private static _canvas = document.createElement("canvas");

    public static getTextWidth(text: string, font) {
        var context = this._canvas.getContext("2d");
        context.font = font;
        var metrics = context.measureText(text);
        return metrics.width;
    }
}