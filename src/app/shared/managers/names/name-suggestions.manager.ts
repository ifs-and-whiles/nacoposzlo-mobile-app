import { Injectable } from "@angular/core";
import { DatabaseService } from "../../database/database.injectable";

export interface NamesUsage {
    items: NameUsage[];
}

export interface NameUsage {
    name: string;
    count: number;
}

export interface NameSuggestion {
    name: string;
    count: number;
}

@Injectable({
	providedIn: 'root'
})
export class NameSuggestionsManager {

    constructor(private _database: DatabaseService) {

    }

    public async incrementNamesSuggestions(oldNamesUsage: NamesUsage, newNamesUsage: NamesUsage) {
        const updates = {};

        oldNamesUsage.items.forEach(item => {
            updates[item.name] = item.count * -1;
        });

        newNamesUsage.items.forEach(item => {
            if(updates[item.name]) {
                updates[item.name] += item.count;
            } else {
                updates[item.name] = item.count;
            }
        });

        const allNames = Object.keys(updates);

        for (let index = 0; index < allNames.length; index++) {
            const name = allNames[index];
            const countDiff = updates[name];

            await this._database.updateNameSuggestions(
                name,
                countDiff);
        }
    }

    public decrementNameSuggestions(namesUsage: NamesUsage) {
        return this.incrementNamesSuggestions(
            namesUsage,
            { items: [] });
    }

    public async getSuggestions(phrase: string): Promise<NameSuggestion[]> {
        const entities = await this._database.getNamesSuggestions(phrase);

        return entities;
    }
}