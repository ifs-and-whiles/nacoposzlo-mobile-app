import { Month } from './month';

export const OneDayMilliseconds = 24 * 60 * 60 * 1000;

export class DateParser {   
    public static formatIso8061(unixTimestamp: number){
        return new Date(unixTimestamp).toISOString();
    }

    public static formatIso8061Date(unixTimestamp: number){
        const date = new Date(unixTimestamp);
        const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        return dateOnly.toISOString();
    }

    //this function should be use for ion-datepicker as these are working in local timezone
    public static formatLocalIso8061Date(unixTimestamp: number) {
        var tzoffset = (new Date(unixTimestamp)).getTimezoneOffset() * 60000; //offset in milliseconds
        var localISOTime = (new Date(unixTimestamp - tzoffset)).toISOString().slice(0, -1);

        return localISOTime;
    }

    public static Iso8061ToDateUnixTimestamp(iso8061: string) {
        const date = new Date(Date.parse(iso8061));
        return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    }

    public static todayUnixTimestamp() {
        const date = new Date();
        return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    }

    public static nowUnixTimestamp() {
        return new Date().getTime();
    }

    public static formatDate(unixTimestamp: number) {
        const date = new Date(unixTimestamp);
        return `${this.padStart(date.getDate(), 2)}.${this.padStart(date.getMonth() + 1, 2)}.${date.getFullYear()}`;
    }

    public static formatLongDate(unixTimestamp: number) {
        const date = new Date(unixTimestamp);
        return `${this.padStart(date.getDate(), 2)} ${Month.fullNameForLongDate(date.getMonth())} ${date.getFullYear()}`;
    }

    public static formatMonthYear(unixTimestamp: number) {
        const date = new Date(unixTimestamp);
        return `${Month.fullName(date.getMonth())} ${date.getFullYear()}`;
    }

    public static formatDateTime(unixTimestamp: number) {
        const date = new Date(unixTimestamp);
        return `${this.formatDate(unixTimestamp)} ${this.padStart(date.getHours(), 2)}:${this.padStart(date.getMinutes(), 2)}`;
    }

    public static formatDateTimeExact(unixTimestamp: number) {
        const date = new Date(unixTimestamp);
        return `${this.formatDate(unixTimestamp)} ${this.padStart(date.getHours(), 2)}:${this.padStart(date.getMinutes(), 2)}:${this.padStart(date.getSeconds(), 2)}`;
    }

    private static padStart(value: number, places: number) {
        var s = value+"";
        while (s.length < places) s = "0" + s;
        return s;
    }
}