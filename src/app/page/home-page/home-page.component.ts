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
  balance     = '';
  attestation = '';
  signature   = '';

  transferForm = this.fb.group({
    to:       ['sandboxspace'],
    quantity: ['1.0000 EOS'],
    memo:     ['WebAuthn!'],
  });

  signForm = this.fb.group({
    challenge: ['poyoyo'],
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

  createAttestation(): void
  {
    this.webauthnService.createCredential().subscribe(
      credential => {
        this.eosService.extractAttestationFromCredential(credential).subscribe(
          attestation => {
            this.attestation = attestation;
            this.notificationService.progress('attestation created');
          },
          err => this.notificationService.error(err.message),
        );
      },
      err => this.notificationService.error(err.message),
    );
  }

  copyAttestationToClipboard(): void
  {
    this.clipboard.copy(this.attestation);
    this.notificationService.progress('copied');
  }

  sign(): void
  {
    const value = this.signForm.value;
    this.eosService.createChallengeHash(value.challenge).subscribe(
      challengeHash => {
        this.webauthnService.createAssertion(challengeHash).subscribe(
          assertion => {
            this.eosService.extractSignatureFromAssertion(assertion).subscribe(
              signature => {
                this.signature = signature;
                this.notificationService.progress('signature created');
              },
              err => this.notificationService.error(err.message),
            );
          },
          err => this.notificationService.error(err.message),
        );
      },
      err => this.notificationService.error(err.message),
    );
  }

  copySignatureToClipboard(): void
  {
    this.clipboard.copy(this.signature);
    this.notificationService.progress('copied');
  }
}
