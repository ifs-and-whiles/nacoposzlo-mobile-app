import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { PrivacyPolicyModal } from './privacy-policy/privacy-policy.modal';
import { TermsModal } from './terms/terms.modal';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild([
        { path: 'privacy-policy-modal', component: PrivacyPolicyModal },
        { path: 'terms-modal', component: TermsModal },
    ]),
  ], 
  declarations: [
    PrivacyPolicyModal,
    TermsModal
  ],
  exports: [
    PrivacyPolicyModal,
    TermsModal
  ]
})
export class LegalModule {}
