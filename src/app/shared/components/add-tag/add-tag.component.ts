import { Component, Input } from "@angular/core";

@Component({
	selector: 'app-add-tag',
	templateUrl: './add-tag.component.html',
	styleUrls: ['./add-tag.component.scss']
})
export class AddTagComponent{
    public _tag;

    @Input() set tag (value: string) {
        this._tag = value.toLowerCase();
    }
    
    public _small = false;
    @Input() set small(value: boolean){
        this._small = value;
    }
}