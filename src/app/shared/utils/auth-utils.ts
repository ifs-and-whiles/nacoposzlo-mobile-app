import { Auth } from 'aws-amplify';

export const isUserSignedIn = async function() {
    try {
        const user = await Auth.currentAuthenticatedUser();
        if(user) return true;
        return false;
    } catch {
        // currentAuthenticatedUser throws an Error if not signed in
        return false;
    }
}

export const getUserId = async function() {
    try {
        const user = await Auth.currentAuthenticatedUser();
        if(user) return user.username;
        return null;
    } catch (error) {
        return null;
    }
}
