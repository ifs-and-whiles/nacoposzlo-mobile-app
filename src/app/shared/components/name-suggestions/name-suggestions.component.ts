import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from "@angular/core";
import { Subscription } from "rxjs";
import { KeyboardManager } from "../../managers/keyboard.manager";
import { NameSuggestion, NameSuggestionsManager } from "../../managers/names/name-suggestions.manager";

@Component({
	selector: 'app-name-suggestions',
	templateUrl: 'name-suggestions.component.html',
	styleUrls: ['name-suggestions.component.scss']
})
export class NameSuggestionsComponent implements OnInit, OnDestroy{

    public phrase: string;

    @Input() set namePhrase (value: string) {
        this.phrase = value;
        
        this._nameSuggestionsManager
            .getSuggestions(value)
            .then(suggestions => this.suggestions = suggestions);
    }

    @Input() isVisible: boolean;

    @Output() suggestionSelect = new EventEmitter<string>();

    public isKeyboardVisible: boolean;
    public suggestions: NameSuggestion[] = [];

    private _keyboardSubscription: Subscription;

    constructor(
        private _nameSuggestionsManager: NameSuggestionsManager,
        private _keyboardManager: KeyboardManager) {
    }

    ngOnInit(): void {
        this._keyboardSubscription = this
            ._keyboardManager
            .onKeyboardStateChange()
            .subscribe({
                next: state => this.isKeyboardVisible = state.isVisible
            });
    }

    ngOnDestroy(): void {
        this._keyboardSubscription.unsubscribe();
    }

    public onMouseDown(suggestion: NameSuggestion) {
        this.suggestionSelect.emit(suggestion.name);
    }
}