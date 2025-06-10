import { createTransport } from 'nodemailer';
import { envConfig } from '../configuration/environmentConfig.js';
import { renderFile } from 'pug';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class Email {
  constructor(user, url, reason = '', document = {}, admin, property = {}, clientDetail = {}) {
    this.to = user.email;
    this.fullname = user.fullname?.split(' ')?.[0];
    this.names = user?.fullname;
    this.url = url;
    this.from = `Inspectra Support <${envConfig.EMAIL_FROM}>`;
    this.otp = user?.otp;
    this.reason = reason;
    this.document = document;
    this.admin = admin;
    this.property = property;
    this.createdAt = user?.createdAt;
    this.updatedAt = user?.updatedAt;
    this.role = user?.role;
    this.clientDetail = clientDetail;
  }

  newTransport() {
    return createTransport({
      host: envConfig.EMAIL_HOST,
      port: envConfig.EMAIL_PORT,
      secure: true,
      auth: { pass: envConfig.EMAIL_PASSWORD, user: envConfig.EMAIL_USERNAME },
    });
  }

  async send(template, subject) {
    const html = renderFile(`${__dirname}/../views/${template}.pug`, {
      fullname: this.fullname,
      url: this.url,
      subject,
      otp: this.otp,
      reason: this.reason,
      type: this.document.type?.replace(/-/g, ' '),
      propertyTitle: this.property.title,
      reviewStatus: this.property.reviewStatus,
      listingDate: this.property.createdAt,
      names: this.names,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      to: this.to,
      role: this.role,
      expiresIn: envConfig.JWT_TOKENSECRET_EXPIRES,
      clientDetail: this.clientDetail,
    });

    const mailOptions = {
      from: this.from,
      to: this.admin ? this.admin : this.to,
      subject,
      html,
    };

    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('otpConfirm', 'Verify Your OTP for Inspectra Account Activation');
  }

  async sendVerify() {
    await this.send('emailConfirm', 'Verify Your Email for Inspectra Account Activation');
  }

  async sendPasswordReset() {
    await this.send('passwordReset', 'Your password reset token (Valid for only 10 minutes)');
  }

  async sendRejectionNotice() {
    await this.send(
      'rejectionNotice',
      `Your submission ${this.document?.type.replace(/-/g, ' ').toUpperCase()} has been rejected`
    );
  }

  async sendVerificationNotice() {
    await this.send('verifyDocsNotice', `Your document has been verified`);
  }

  async sendUploadNotice() {
    await this.send(
      'uploadNotice',
      `${this.document.type?.replace(/-/g, ' ').toUpperCase()} was uploaded`
    );
  }

  async sendListingReviewStatus() {
    await this.send(
      'propertyStatusNotice',
      `Your property listing has been ${this.property.reviewStatus}`
    );
  }

  async sendAdminListingNotice() {
    await this.send(
      'adminListingNotice',
      `${this.reason === 'updated' ? 'An Update on Listing' : 'New Property Listing'}: ${
        this.property.title
      }`
    );
  }

  async sendAdminNewUser() {
    await this.send('notifyNewRegistered', `Newly Registered ${this.reason}: ${this.names}`);
  }

  async sendDeactivationNotice() {
    await this.send('deactivatedNotice', `Account Deactivated ☠️: ${this.fullname.toUpperCase()}`);
  }

  async sendAdminDeactivationNotice() {
    await this.send('adminDeactivationNotice', `${this.names}, Account was Deactivated ☠️`);
  }

  async sendActivationNotice() {
    await this.send('activatedNotice', `Account Activated 👍: ${this.fullname.toUpperCase()}`);
  }

  async sendInquiryNotification() {
    await this.send('inquiryNotification', `Inquiry for ${this.property.title}`);
  }

  async sendInspectionNotification() {
    await this.send('inspectionNotification', `Inspection Schedule for ${this.property.title}`);
  }

  async sendGuestChatLink() {
    await this.send('guestChatLink', `Initiate Chat Session for ${this.property.title}`);
  }

  async sendSubscriptionExpiredNotification() {
    await this.send('subExpiredNotification', `Your subscription has expired`);
  }
}
