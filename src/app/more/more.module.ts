import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { SharedModule } from '../shared/shared.module';
import { MorePage } from './more.page';
import { ReportBugModal } from './items/report-bug-modal/report-bug.modal';
import { ChangePasswordModal } from './items/change-password-modal/change-password.modal';
import { NetworkGuard } from '../shared/utils/network.guard';
import { LegalModule } from '../legal/legal.module';
import { QRCodeModule } from 'angular2-qrcode';
import { MfaModal } from './items/mfa/mfa.modal';
import { QrCodeModal } from './items/qr-code-modal/qr-code.modal';

@NgModule({
  imports: [
    FontAwesomeModule,
    IonicModule,
    CommonModule,
    FormsModule,
    RouterModule.forChild([
        { path: '', component: MorePage },      
        { path: 'report-bug-modal', component: ReportBugModal },
        { path: 'change-password-modal', component: ChangePasswordModal },
        { path: 'mfa-modal', component: MfaModal},
        { path: 'qr-code-modal', component: QrCodeModal}
    ]),
    SharedModule,
    LegalModule,
    QRCodeModule
  ],
  providers: [    
    NetworkGuard
  ],
  declarations: [
    MorePage,
    ReportBugModal,
    ChangePasswordModal,
    MfaModal,
    QrCodeModal
  ],
})
export class MorePageModule {}