import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
	{
		path: '',
		component: TabsPage,
		children: [
			{
				path: 'start',
				children: [
					{
						path: '',
						loadChildren: () =>
							import('../start/start-tab.module').then(m => m.StartPageModule)
					}
				]
			},
			{
				path: 'expenses',
				children: [
					{
						path: '',
						loadChildren: () =>
							import('../expenses/expenses.module').then(m => m.ExpensesPageModule)
					}
				]
			},  
			{
				path: 'receipts',
				children: [
					{
						path: '',
						loadChildren: () =>
							import('../receipts/receipts.module').then(m => m.ReceiptsPageModule)
					}
				]
			}, 
			{
				path: 'more',
				children: [
					{
						path: '',
						loadChildren: () =>
							import('../more/more.module').then(m => m.MorePageModule)
					}
				]
			},     
			{
				path: '',
				redirectTo: '/start',
				pathMatch: 'full'
			}
		]
	},
	{
		path: '',
		redirectTo: '/start',
		pathMatch: 'full'
	}
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule]
})
export class TabsPageRoutingModule {}
