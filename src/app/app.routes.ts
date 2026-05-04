import { Routes } from '@angular/router';

export const routes: Routes = [
  { 
    path: '', 
    loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent) 
  },
  { 
    path: 'about', 
    loadComponent: () => import('./components/about/about.component').then(m => m.AboutComponent) 
  },
  { 
    path: 'products', 
    loadComponent: () => import('./components/products/products.component').then(m => m.ProductsComponent) 
  },
  { 
    path: 'contact', 
    loadComponent: () => import('./components/contact/contact.component').then(m => m.ContactComponent) 
  },
  { 
    path: 'flavors', 
    loadComponent: () => import('./components/flavor/flavor.component').then(m => m.FlavorComponent) 
  },
  { 
    path: 'seasonings', 
    loadComponent: () => import('./components/seasoning/seasoning.component').then(m => m.SeasoningComponent) 
  },
  { 
    path: '**', 
    redirectTo: '' 
  }
];