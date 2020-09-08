import { Injectable } from '@angular/core';

import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class NotificationService
{
  constructor(
    private snackBar: MatSnackBar,
  ) {}

  progress(message: string): void
  {
    this.snackBar.open(message, 'OK', {
      duration: 3000,
      verticalPosition: 'top',
    });
  }

  error(message: string): void
  {
    this.snackBar.open(message, 'OK', {
      duration: 3000,
      verticalPosition: 'bottom',
    })
  }
}
