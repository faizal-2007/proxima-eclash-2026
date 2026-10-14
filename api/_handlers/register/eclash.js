// Keep the former route for clients that haven't upgraded yet, but require the
// same payment proof and server-side validation as POST /api/register.
export { default } from './manualPayment.js';
