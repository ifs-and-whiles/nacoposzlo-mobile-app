import { Component, AfterViewInit, Input, Output, OnInit, EventEmitter } from '@angular/core';
import { Vibration } from '@ionic-native/vibration/ngx';
import { colorsPalette } from '../../utils/colors';
interface ColorItem {
    hex: string;
}

@Component({
    selector: 'app-color-palette',
    templateUrl: './color-palette.component.html',
    styleUrls: ['./color-palette.component.scss']
  })
  export class ColorPaletteComponent implements OnInit {
    public colorItems: ColorItem[];

    @Input() hexColor: string;

    @Output() colorChange = new EventEmitter<string>();

    constructor(private _vibration: Vibration) {
        
    }

    ngOnInit(): void {
        var items : ColorItem[] =  colorsPalette
            .map(color => ({
                hex: color
            }));

        this.colorItems = items;     
    }
      
    public onColorClick(item: ColorItem) {
        this._vibration.vibrate(50);
        this.hexColor = item.hex;
        this.colorChange.emit(item.hex);
    }
}

  

