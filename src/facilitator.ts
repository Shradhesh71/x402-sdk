import { X402PaymentRequirements, ExecResponse, SDKConfig } from './types';
import fetch from 'cross-fetch';


export class FacilitatorClient {
    baseUrl: string;
    network: SDKConfig['network'];


    constructor(baseUrl: string, network: SDKConfig['network']) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.network = network;
    }


    async submitPayment(paymentReq: X402PaymentRequirements): Promise<ExecResponse> {
        const url = `${this.baseUrl}/submit-payment`;

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ network: this.network, payment_requirements: paymentReq })
        });

        if (!res.ok) {
            const t = await res.text();
            throw new Error(`Facilitator error ${res.status}: ${t}`);
        }

        const json = await res.json();

        return { txSignature: json.txSignature || json.signature || json.tx?.signature, raw: json };
    }
}