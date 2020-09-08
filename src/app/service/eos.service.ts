import { Injectable } from '@angular/core';

import { Api, JsonRpc, RpcError } from 'eosjs';
import { WebAuthnSignatureProvider } from 'eosjs/dist/eosjs-webauthn-sig';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EosService
{
  private actor        = 'motokichieos';
  private credentialID = '0141A647E7133ADFF1626EF63A438C9D0A9EEC54C3D5521924B4A1CE9D5F3646CED0E5DF393B5AD23A566C4EDC36D832F5846153CB302312AAF476881E1D162196';
  private pubkey       = 'PUB_WA_3U8NmdbM2NcwasN3kECsHb65AZZxXDAKnJEjw2hUjaSPd1754d6bLQvqNL68WLas9SRtmyFzFf53yUVs9qE4yzDuZFAv2mSPsb';

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
