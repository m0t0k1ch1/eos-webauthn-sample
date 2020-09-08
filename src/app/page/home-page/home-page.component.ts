import { Component, OnInit } from '@angular/core';

import { Clipboard } from '@angular/cdk/clipboard';

import { NotificationService } from 'src/app/service/notification.service';
import { WebauthnService } from 'src/app/service/webauthn.service';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: [
    './home-page.component.scss',
  ],
})
export class HomePageComponent implements OnInit
{
  attestation = '';

  constructor(
    private clipboard: Clipboard,
    private notificationService: NotificationService,
    private webauthnService: WebauthnService,
  ) {}

  ngOnInit(): void {}

  createCredential(): void
  {
    this.webauthnService.createCredential().subscribe(
      attestation => {
        this.attestation = attestation;
        this.notificationService.progress('credential created');
      },
      err => this.notificationService.error(err.message),
    )
  }

  copyAttestationToClipboard(): void
  {
    this.clipboard.copy(this.attestation);
    this.notificationService.progress('copied');
  }
}
