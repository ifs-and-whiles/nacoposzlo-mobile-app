import { UserLimitsDetailsEntity } from './user-limits-details-entity';

export interface UserDetailsEntity {
	wasRegisterMeCalled: boolean;
	limits: UserLimitsDetailsEntity;

	wasHowToScanInstructionShown: boolean;
} 