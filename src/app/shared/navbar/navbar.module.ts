import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  MdButtonModule,
  MdToolbarModule,
  MdMenuModule,
} from '@angular/material';
import { AngularFireAuth } from 'angularfire2/auth';
import { ResponsiveModule } from 'ng2-responsive';

import { CastModule } from '../cast';
import { NavbarComponent } from './navbar.component';
import { SigninComponent } from './signin.component';
import { SidenavService } from '../sidenav/sidenav.service';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    MdButtonModule,
    MdToolbarModule,
    MdMenuModule,
    ResponsiveModule,
    CastModule,
  ],
  exports: [NavbarComponent],
  declarations: [
    NavbarComponent,
    SigninComponent,
  ],
  entryComponents: [
    SigninComponent,
  ],
  providers: [
    AngularFireAuth,
    SidenavService, // This is an exceptional case because they mutually include each other.
  ],
})
export class NavbarModule { }
