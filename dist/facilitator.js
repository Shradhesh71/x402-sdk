"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FacilitatorClient = void 0;
const cross_fetch_1 = __importDefault(require("cross-fetch"));
class FacilitatorClient {
    constructor(baseUrl, network) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.network = network;
    }
    async submitPayment(paymentReq) {
        const url = `${this.baseUrl}/submit-payment`;
        const res = await (0, cross_fetch_1.default)(url, {
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
exports.FacilitatorClient = FacilitatorClient;
