import { Injectable } from '@angular/core';

import { ec } from 'elliptic';
import { Api, JsonRpc, Numeric, RpcError, Serialize } from 'eosjs';
import { WebAuthnSignatureProvider } from 'eosjs/dist/eosjs-webauthn-sig';
import { defer, Observable } from 'rxjs';

import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EosService
{
  private actor        = environment.actor;
  private credentialID = environment.credentialID;
  private pubkey       = environment.pubkey;

  private api: Api;

  constructor()
  {
    const signatureProvider = new WebAuthnSignatureProvider();
    signatureProvider.keys.set(this.pubkey, this.credentialID);

    this.api = new Api({
      rpc: new JsonRpc('https://jungle3.cryptolions.io'),
      signatureProvider: signatureProvider,
      textDecoder: new TextDecoder(),
      textEncoder: new TextEncoder(),
    });
  }

  createChallengeHash(preimage: string): Observable<any>
  {
    return defer(async () => {
      const challengeBuf = new Serialize.SerialBuffer();
      challengeBuf.pushString(preimage);

      return new Uint8Array(await crypto.subtle.digest('SHA-256', challengeBuf.asUint8Array().slice().buffer));
    });
  }

  extractAttestationFromCredential(credential: any): Observable<any>
  {
    return new Observable(subscriber => {
      subscriber.next(Serialize.arrayToHex(new Uint8Array(credential.attestationObject)));
      subscriber.complete();
    });
  }

  extractSignatureFromAssertion(assertion: any): Observable<any>
  {
    return defer(async () => {
      try {
        const p256 = new ec('p256');
        const pubkey = p256.keyFromPublic(Numeric.stringToPublicKey(this.pubkey).data.subarray(0, 33)).getPublic();

        const fixup = (b: Uint8Array) => {
          const a = Array.from(b);
          while (a.length < 32) {
            a.unshift(0);
          }
          while (a.length > 32) {
            if (a.shift() !== 0) {
              throw new Error('signature has an r or s that is too big');
            }
          }
          return new Uint8Array(a);
        };

        const sigBuf = new Serialize.SerialBuffer({ array: new Uint8Array(assertion.signature) });
        if (sigBuf.get() !== 0x30) {
          throw new Error('signature missing DER prefix');
        }
        if (sigBuf.get() !== sigBuf.array.length - 2) {
          throw new Error('signature has bad length');
        }
        if (sigBuf.get() !== 0x02) {
          throw new Error('signature has bad r marker');
        }
        const r = fixup(sigBuf.getUint8Array(sigBuf.get()));
        if (sigBuf.get() !== 0x02) {
          throw new Error('signature has bad s marker');
        }
        const s = fixup(sigBuf.getUint8Array(sigBuf.get()));

        const signedBuf = new Serialize.SerialBuffer();
        signedBuf.pushArray(new Uint8Array(assertion.authenticatorData));
        signedBuf.pushArray(new Uint8Array(await crypto.subtle.digest('SHA-256', assertion.clientDataJSON)));

        const recid = p256.getKeyRecoveryParam(
          new Uint8Array(await crypto.subtle.digest('SHA-256', signedBuf.asUint8Array().slice())),
          new Uint8Array(assertion.signature),
          pubkey,
        );

        const eosSigBuf = new Serialize.SerialBuffer();
        eosSigBuf.push(recid + 27 + 4);
        eosSigBuf.pushArray(r);
        eosSigBuf.pushArray(s);
        eosSigBuf.pushBytes(new Uint8Array(assertion.authenticatorData));
        eosSigBuf.pushBytes(new Uint8Array(assertion.clientDataJSON));

        return Numeric.signatureToString({
          type: Numeric.KeyType.wa,
          data: eosSigBuf.asUint8Array().slice(),
        });
      }
      catch (e) {
        throw new Error(e.message || JSON.stringify(e));
      }
    });
  }

  getBalance(): Observable<string>
  {
    return new Observable(subscriber => {
      this.api.rpc.get_currency_balance(
        'eosio.token',
        this.actor,
        'EOS',
      )
      .then(result => {
        subscriber.next(result[0]);
        subscriber.complete();
      })
      .catch(err => {
        subscriber.error(this.error(err));
      });
    });
  }

  transfer(to: string, quantity: string, memo: string): Observable<any>
  {
    return new Observable(subscriber => {
      this.api.transact({
        actions: [{
          account: 'eosio.token',
          name: 'transfer',
          authorization: [{
            actor: this.actor,
            permission: 'active',
          }],
          data: {
            from: this.actor,
            to: to,
            quantity: quantity,
            memo: memo,
          }
        }],
      }, {
        blocksBehind: 3,
        expireSeconds: 30,
      })
      .then(result => {
        subscriber.next(result);
        subscriber.complete();
      })
      .catch(err => {
        subscriber.error(this.error(err));
      });
    });
  }

  private error(err: any): Error
  {
    if (err instanceof RpcError) {
      if (err.json.error.details.length > 0) {
        return new Error(err.json.error.details[0].message);
      }
      return new Error(err.json.error.what);
    }
    return new Error(err.message || JSON.stringify(err));
  }
}
