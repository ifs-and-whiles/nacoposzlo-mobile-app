import { Guid } from "guid-typescript";
import { ExpensesManager, ExpenseToCreate } from "src/app/shared/managers/expenses.manager";
import { Month } from "src/app/shared/month";
import * as _ from "lodash";
import { getRandomDecimal, getRandomInt } from "src/app/shared/utils/random";
import { TagsManager } from "src/app/shared/managers/tags/tags.manager";
import { getRandomColor } from "src/app/shared/utils/colors";

export interface IExpenseFactoryRequest {
    months: Month[];
    minimumExpensesCountPerMonth: number;
    maximumExpensesCountPerMont: number;    
}

export class ExpenseFactory{
    constructor(
        private _expenseManager: ExpensesManager,
        private _tagsManager: TagsManager) {

    }

    public async createTags() {
        const keys = Object.keys(someRandomTagsWithIds);

        for (let index = 0; index < keys.length; index++) {
            const key = keys[index];

            await this._tagsManager.addNewTagManually({
                id: key,
                name: someRandomTagsWithIds[key],
                chain: [key],
                color: getRandomColor()
            });
        }
    }

    public async createRandomExpenses(request: IExpenseFactoryRequest) {
        const nameTagsMap = {};
        const expenses: ExpenseToCreate[] = [];

        for (let index = 0; index < request.months.length; index++) {
            const month = request.months[index];

            const expensesCount = getRandomInt(
                request.minimumExpensesCountPerMonth, 
                request.maximumExpensesCountPerMont);

            for (let index = 0; index < expensesCount; index++) {
                const expense = getRandomExpense(month, nameTagsMap);
                expenses.push(expense);
            }
        }

        const chunks = _.chunk(expenses, 30);

        for (let index = 0; index < chunks.length; index++) {
            const chunk = chunks[index];
            
            await this._expenseManager.bulkCreate(
                chunk,
                null,
                null,
                null,
                false);
        }
    }
}

function getRandomExpense(month: Month, nameTagsMap: any): ExpenseToCreate {
    const name = getRandomName();

    if(!nameTagsMap[name]) {
        nameTagsMap[name] = getRandomTags();
    }

    const tags = nameTagsMap[name];
    const amount = getRandomDecimal(0, 100);
    const quantity = getRandomDecimal(0, 20);
    const unitPrice = Number((amount / quantity).toFixed(2));

    var item = {
        itemId: Guid.create().toString(),
        amount: amount,
        name: name,
        tags: tags,
        unitPrice: unitPrice,
        quantity: quantity, 
        dateUnixTimestamp: getRandomUnixTimestamp(month),
        orderInReceipt: null
    };

    return item;
}

function getRandomUnixTimestamp(month: Month) {
    const start = month.startUnixTimestamp();
    const end = month.next().startUnixTimestamp();

    var randomTimestamp = getRandomInt(start, end);

    const date = new Date(randomTimestamp);
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    return dateOnly.getTime();
}


function getRandomName(): string {
    return "___Wydatek " + getRandomInt(0, 1000);
}

function getRandomTags(): string[]{
    const tags: string[] = [];
    let possibleTags = someRandomTags;
    let keys = Object.keys(possibleTags);

    while(keys.length) {
        const index = getRandomInt(0, keys.length);
        const key = keys[index];

        tags.push(key);
        
        possibleTags = possibleTags[key];
        keys = Object.keys(possibleTags);
    }

    return tags;
}

const someRandomTagsWithIds  = {
    "1":"jedzenie",
    "2":"mięso",
    "3":"nabiał",
    "4":"słodycze",
    "5":"pieczywo",
    "6":"alkohol",
    "7":"na mieście",
    "8":"samochód",
    "9":"paliwo",
    "10":"części",
    "11":"mechanik",
    "12":"dom",
    "13":"opłaty",
    "14":"remonty",
    "15":"meble",
    "16":"czynsz",
    "17":"inne",
    "18":"rozrywka",
    "19":"kino",
    "20":"teatr",
    "21":"basen",
    "22":"leki",
    "23":"higiena",
    "24":"dzieci",
    "25":"zabawki",
    "26":"klocki",
    "27":"puzzle",
    "28":"badziewie",  
    "29":"higiena",
    "30":"edukacja"    
}

const someRandomTags = {
    "1": {
        "2": {},
        "3": {},
        "4": {},
        "5": {},
        "6": {},
        "7": {},
    },
    "8":{
        "9": {},
        "10": {},
        "11": {},
    },
    "12":{
        "13": {},
        "14": {},
        "15": {},
        "16": {},
    },
    "17": {
        "18": {
            "19": {},
            "20": {},
            "21": {},
        },
        "22": {},
        "23": {},
        "24": {
            "25": {
                "26": {},
                "27": {},
                "28": {}              
            },
            "29": {},
            "30": {},
        },
    }
};
  