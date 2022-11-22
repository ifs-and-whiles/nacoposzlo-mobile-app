import { NgModule, Injectable, APP_INITIALIZER, ErrorHandler } from '@angular/core';
import { BrowserModule, HammerModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { IonicModule, IonicRouteStrategy, Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { Vibration } from '@ionic-native/vibration/ngx';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Camera } from '@ionic-native/Camera/ngx';

import { DatabaseService } from './shared/database/database.injectable';
import { ExpensesApi } from './shared/api/expenses.api';
import { ReceiptsApi } from './shared/api/receipts.api';
import { AccessTokenInterceptor } from './shared/api/access-token.interceptor';
import { NotLoggedInGuard } from './shared/not-logged-in.guard';

import { HammerGestureConfig, HAMMER_GESTURE_CONFIG} from '@angular/platform-browser';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { SocialSharing } from '@ionic-native/social-sharing/ngx';

import * as Hammer from 'hammerjs';
import { ReceiptsManager } from './shared/managers/receipts.manager';
import { ExpensesManager } from './shared/managers/expenses.manager';
import { TagsManager } from './shared/managers/tags/tags.manager';
import { UsersApi } from './shared/api/users.api';
import { UsersManager } from './shared/managers/users.manager';
import { TrackWidthService } from './tabs/track-width/track-width.service';
import { File } from '@ionic-native/file/ngx';
import { NetworkService } from './shared/utils/network.service';
import { Network } from '@ionic-native/network/ngx';
import { KeyboardManager } from './shared/managers/keyboard.manager';
import { SharedModule } from './shared/shared.module';
import { Bus } from './shared/bus';
import { OpenReceiptModalConsumer } from './consumers/openReceiptModal.consumer';
import { BackButtonManager } from './shared/managers/back-button.manager';
import { CameraManager } from './shared/managers/camera.manager';
import { ExcelManager } from './shared/managers/excel.manager';
import { GlobalActionsManager } from './shared/managers/global-actions.manager';
import { LoggedInGuard } from './shared/logged-in.guard';
import { SocialSharingManager } from './shared/managers/social-sharing.manager';
import { NameSuggestionsManager } from './shared/managers/names/name-suggestions.manager';
import { ApiLogger } from './shared/api-logger';
import { Device } from '@ionic-native/device/ngx';
import { GlobalErrorHandler } from './global-error-handler';
import { Clipboard } from '@ionic-native/clipboard/ngx';

function initializeDatabaseFactory(platform: Platform, database: DatabaseService, logger: ApiLogger) {
    return async () => {
        await platform.ready();

        try {
            await database.initializeDatabaseStructure();                 
        } catch (error) {
            logger.error("app.module.ts->initializeDatabaseFactory()", error);
            console.error("something went wrong during db initialization", error);
        }
    }
}


@Injectable()
export class CustomHammerConfig extends HammerGestureConfig {
  overrides = {
    pan: { 
        enable: true,
        direction: Hammer.DIRECTION_HORIZONTAL ,
        threshold: 5
    },
    press : {
        enable: false
    },
    pinch: { 
        enable: false 
    },
    rotate: { 
        enable: false 
    },
    swipe: { 
        enable: false
    },
    tap: { 
        enable: false 
    }
  }
}

@NgModule({
  declarations: [
    AppComponent
  ],
  entryComponents: [],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FontAwesomeModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    SharedModule,
    HammerModule
  ],
  providers: [
    SplashScreen,
    DatabaseService,
    { provide: APP_INITIALIZER, useFactory: initializeDatabaseFactory, deps: [Platform, DatabaseService, ApiLogger], multi: true },
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }, 
    { provide: HTTP_INTERCEPTORS, useClass: AccessTokenInterceptor, multi: true },
    { provide: HAMMER_GESTURE_CONFIG, useClass: CustomHammerConfig },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    Camera,
    ExpensesApi,
    ReceiptsApi,
    UsersApi,
    NotLoggedInGuard,
    LoggedInGuard,
    File,
    Keyboard,
    AndroidPermissions,
    ReceiptsManager,
    ExpensesManager,
    CameraManager,
    TagsManager,
    UsersManager,
    NameSuggestionsManager,
    TrackWidthService,
    Network,
    NetworkService,
    KeyboardManager,
    BackButtonManager,
    ExcelManager,
    SocialSharingManager,
    GlobalActionsManager,
    Bus,
    OpenReceiptModalConsumer,
    Vibration,
    SocialSharing,
    ApiLogger,
    Device,
    Clipboard
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
  // Services are not used, just to make sure they're instantiated
  constructor(
    openReceiptModalConsumer: OpenReceiptModalConsumer) { }
}
