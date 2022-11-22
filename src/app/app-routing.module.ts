import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { LoggedInGuard } from './shared/logged-in.guard';
import { NotLoggedInGuard } from './shared/not-logged-in.guard';

const routes: Routes = [{ 
	path: 'tabs', 
	loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule),
	canActivate: [LoggedInGuard] 
}, {
	path: 'login', 
	loadChildren: () => import('./login/login.module').then(m => m.LoginPageModule),
	canActivate: [NotLoggedInGuard] 
}, { 
	path: 'forgot-password', 
	loadChildren: () => import('./forgot-password/forgot-password.module').then(m => m.ForgotPasswordPageModule),
	canActivate: [NotLoggedInGuard] 
}, { 
	path: 'intro', 
	loadChildren: () => import('./intro/intro.module').then(m => m.IntroPageModule)
}, {
	path: '',
	redirectTo: '/login',
	pathMatch: 'full'
}]  
;

@NgModule({
	imports: [
		RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules})
	],
	exports: [RouterModule]
})
export class AppRoutingModule {}
