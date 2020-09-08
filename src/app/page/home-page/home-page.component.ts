import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';

import { Clipboard } from '@angular/cdk/clipboard';

import { of } from 'rxjs';
import { delay } from 'rxjs/operators';

import { EosService } from 'src/app/service/eos.service';
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
  balance = '';

  transferForm = this.fb.group({
    to: ['sandboxspace'],
    quantity: ['1.0000 EOS'],
    memo: ['WebAuthn!'],
  });

  constructor(
    private fb: FormBuilder,
    private clipboard: Clipboard,
    private eosService: EosService,
    private notificationService: NotificationService,
    private webauthnService: WebauthnService,
  ) {}

  ngOnInit(): void
  {
    this.initBalance();
  }

  initBalance(): void
  {
    this.eosService.getBalance().subscribe(
      balance => this.balance = balance,
      err     => this.notificationService.error(err.message),
    );
  }

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

  transfer(): void
  {
    const value = this.transferForm.value;
    this.eosService.transfer(value.to, value.quantity, value.memo).subscribe(
      result => {
        this.clipboard.copy(result.transaction_id);
        this.notificationService.progress('success');
        of(null).pipe(delay(5000)).subscribe(() => this.initBalance());
      },
      err => this.notificationService.error(err.message),
    );
  }
}
