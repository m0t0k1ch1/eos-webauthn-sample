import { Injectable } from '@angular/core';

import { Serialize } from 'eosjs';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class WebauthnService
{
  constructor() {}

  createCredential(): Observable<string>
  {
    return new Observable(subscriber => {
      navigator.credentials.create({
        publicKey: {
          rp: {
            id: environment.rpid,
            name: 'eos-webauthn-sample',
          },
          user: {
            id: new Uint8Array(16),
            name: 'm0t0k1ch1.310@gmail.com',
            displayName: 'm0t0k1ch1',
          },
          pubKeyCredParams: [{
            type: 'public-key',
            alg: -7,
          }],
          attestation: 'none',
          timeout: 60000,
          challenge: new Uint8Array([
            0x8C, 0x0A, 0x26, 0xFF, 0x22, 0x91, 0xC1, 0xE9, 0xB9, 0x4E, 0x2E, 0x17, 0x1A, 0x98, 0x6A, 0x73,
            0x71, 0x9D, 0x43, 0x48, 0xD5, 0xA7, 0x6A, 0x15, 0x7E, 0x38, 0x94, 0x52, 0x77, 0x97, 0x0F, 0xEF,
          ]).buffer,
        }
      })
      .then((credential: any) => {
        subscriber.next(Serialize.arrayToHex(new Uint8Array(credential.response.attestationObject)));
        subscriber.complete();
      })
      .catch(err => {
        subscriber.error(new Error(err.message || JSON.stringify(err)));
      });
    });
  }
}
