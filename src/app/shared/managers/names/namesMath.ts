import { NamesUsage, NameUsage } from "./name-suggestions.manager";

export class NamesMath {
    public static calculateUsage<T>(items: T[], getName: (item: T) => string): NamesUsage {
        const names = items.map(item => getName(item));

        const usage = {};

        for (let index = 0; index < names.length; index++) {
            const name = names[index];
            
            if(!usage[name]) {
                usage[name] = 0;
            }

            usage[name]++;
        }

        const emptyResult: NamesUsage = {
            items: []
        };

        return Object
            .keys(usage)
            .reduce((result, name) => {
                const nameUsage: NameUsage = {
                    name: name,
                    count: usage[name]
                };

                result.items.push(nameUsage);

                return result;
            }, emptyResult);
    }
}