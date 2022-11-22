export interface UserConsentsEntity {
    email: string;
    wasTermsAndPrivacyPolicyAccepted: boolean;
    acceptedAtUnixTimestamp: number;
}