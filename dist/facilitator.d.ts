import { X402PaymentRequirements, ExecResponse, SDKConfig } from './types';
export declare class FacilitatorClient {
    baseUrl: string;
    network: SDKConfig['network'];
    constructor(baseUrl: string, network: SDKConfig['network']);
    submitPayment(paymentReq: X402PaymentRequirements): Promise<ExecResponse>;
}
